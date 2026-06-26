// Enhanced Session Management System for TrustMD
// Provides secure session handling with proper timeouts, security features, and management

class EnhancedSessionManager {
    constructor(supabaseClient, options = {}) {
        this.supabaseClient = supabaseClient;
        this.sessions = new Map(); // In-memory session store
        this.sessionTimeout = options.sessionTimeout || 30 * 60 * 1000; // 30 minutes default
        this.maxSessionAge = options.maxSessionAge || 24 * 60 * 60 * 1000; // 24 hours max
        this.maxConcurrentSessions = options.maxConcurrentSessions || 5;
        this.securityConfig = {
            requireReauth: options.requireReauth || false,
            ipValidation: options.ipValidation !== false,
            userAgentValidation: options.userAgentValidation !== false,
            suspiciousActivityThreshold: options.suspiciousActivityThreshold || 10,
            lockoutDuration: options.lockoutDuration || 15 * 60 * 1000, // 15 minutes
            ...options.securityConfig
        };
        this.failedAttempts = new Map(); // Track failed login attempts
        this.suspiciousActivity = new Map(); // Track suspicious activity
        this.sessionStats = {
            activeSessions: 0,
            totalSessions: 0,
            expiredSessions: 0,
            terminatedSessions: 0
        };
        
        // Start cleanup interval
        this.startCleanupInterval();
    }

    // Generate secure session token
    async generateSessionToken(user, req) {
        try {
            const sessionId = this.generateSecureId();
            const now = Date.now();
            
            // Check for existing sessions and enforce concurrent limit
            const userSessions = this.getUserSessions(user.id);
            if (userSessions.length >= this.maxConcurrentSessions) {
                // Terminate oldest session
                const oldestSession = userSessions[0];
                await this.terminateSession(oldestSession.sessionId, 'CONCURRENT_LIMIT');
            }

            // Create session object
            const session = {
                sessionId,
                userId: user.id,
                email: user.email,
                tenantId: user.tenant_id || 'default',
                roles: user.roles || [],
                permissions: user.permissions || [],
                createdAt: now,
                lastActivity: now,
                expiresAt: now + this.sessionTimeout,
                maxAge: now + this.maxSessionAge,
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                deviceFingerprint: this.generateDeviceFingerprint(req),
                securityLevel: this.calculateSecurityLevel(user, req),
                isActive: true,
                metadata: {
                    loginMethod: 'password',
                    mfaVerified: false,
                    riskScore: 0
                }
            };

            // Store session
            this.sessions.set(sessionId, session);
            this.sessionStats.activeSessions++;
            this.sessionStats.totalSessions++;

            // Log session creation
            await this.logSessionEvent('SESSION_CREATED', {
                sessionId,
                userId: user.id,
                ipAddress: session.ipAddress,
                userAgent: session.userAgent
            });

            return {
                sessionId,
                token: this.encodeSessionToken(session),
                expiresAt: session.expiresAt,
                maxAge: this.maxSessionAge,
                securityLevel: session.securityLevel
            };
        } catch (error) {
            console.error('Error generating session token:', error);
            throw new Error('Session generation failed');
        }
    }

    // Validate and refresh session
    async validateSession(token, req) {
        try {
            const session = this.decodeSessionToken(token);
            
            if (!session) {
                return { valid: false, reason: 'INVALID_TOKEN' };
            }

            // Check if session exists
            const storedSession = this.sessions.get(session.sessionId);
            if (!storedSession) {
                return { valid: false, reason: 'SESSION_NOT_FOUND' };
            }

            // Check if session is active
            if (!storedSession.isActive) {
                return { valid: false, reason: 'SESSION_INACTIVE' };
            }

            // Check session expiration
            const now = Date.now();
            if (now > storedSession.expiresAt) {
                await this.terminateSession(session.sessionId, 'TIMEOUT');
                return { valid: false, reason: 'SESSION_EXPIRED' };
            }

            // Check maximum age
            if (now > storedSession.maxAge) {
                await this.terminateSession(session.sessionId, 'MAX_AGE');
                return { valid: false, reason: 'SESSION_TOO_OLD' };
            }

            // IP validation
            if (this.securityConfig.ipValidation && 
                storedSession.ipAddress !== (req.ip || req.connection.remoteAddress)) {
                await this.handleSuspiciousActivity(session.sessionId, 'IP_MISMATCH', req);
                return { valid: false, reason: 'IP_MISMATCH' };
            }

            // User agent validation
            if (this.securityConfig.userAgentValidation && 
                storedSession.userAgent !== req.get('User-Agent')) {
                await this.handleSuspiciousActivity(session.sessionId, 'USER_AGENT_MISMATCH', req);
                return { valid: false, reason: 'USER_AGENT_MISMATCH' };
            }

            // Update last activity and extend timeout
            storedSession.lastActivity = now;
            storedSession.expiresAt = now + this.sessionTimeout;

            // Check for suspicious activity
            const suspiciousCheck = await this.checkSuspiciousActivity(session.sessionId, req);
            if (suspiciousCheck.isSuspicious) {
                await this.handleSuspiciousActivity(session.sessionId, suspiciousCheck.reason, req);
                return { valid: false, reason: 'SUSPICIOUS_ACTIVITY' };
            }

            return {
                valid: true,
                session: storedSession,
                refreshed: true
            };
        } catch (error) {
            console.error('Error validating session:', error);
            return { valid: false, reason: 'VALIDATION_ERROR' };
        }
    }

    // Terminate session
    async terminateSession(sessionId, reason = 'MANUAL') {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                return false;
            }

            // Mark as inactive
            session.isActive = false;
            session.terminatedAt = Date.now();
            session.terminationReason = reason;

            // Remove from active sessions
            this.sessions.delete(sessionId);
            this.sessionStats.activeSessions--;

            // Update stats
            if (reason === 'TIMEOUT' || reason === 'MAX_AGE') {
                this.sessionStats.expiredSessions++;
            } else {
                this.sessionStats.terminatedSessions++;
            }

            // Log session termination
            await this.logSessionEvent('SESSION_TERMINATED', {
                sessionId,
                userId: session.userId,
                reason,
                duration: Date.now() - session.createdAt
            });

            return true;
        } catch (error) {
            console.error('Error terminating session:', error);
            return false;
        }
    }

    // Terminate all user sessions
    async terminateAllUserSessions(userId, reason = 'ADMIN_ACTION') {
        try {
            const userSessions = this.getUserSessions(userId);
            const terminatedSessions = [];

            for (const session of userSessions) {
                const success = await this.terminateSession(session.sessionId, reason);
                if (success) {
                    terminatedSessions.push(session.sessionId);
                }
            }

            return terminatedSessions;
        } catch (error) {
            console.error('Error terminating all user sessions:', error);
            return [];
        }
    }

    // Handle failed login attempt
    async handleFailedLogin(identifier, req) {
        try {
            const now = Date.now();
            const key = `${identifier}:${req.ip || req.connection.remoteAddress}`;
            
            if (!this.failedAttempts.has(key)) {
                this.failedAttempts.set(key, {
                    count: 0,
                    firstAttempt: now,
                    lastAttempt: now,
                    lockedUntil: null
                });
            }

            const attempts = this.failedAttempts.get(key);
            attempts.count++;
            attempts.lastAttempt = now;

            // Check if account should be locked
            if (attempts.count >= this.securityConfig.suspiciousActivityThreshold) {
                attempts.lockedUntil = now + this.securityConfig.lockoutDuration;
                
                await this.logSecurityEvent('ACCOUNT_LOCKED', {
                    identifier,
                    ipAddress: req.ip,
                    attempts: attempts.count,
                    lockedUntil: attempts.lockedUntil
                });

                return {
                    locked: true,
                    lockedUntil: attempts.lockedUntil,
                    reason: 'TOO_MANY_ATTEMPTS'
                };
            }

            this.failedAttempts.set(key, attempts);
            return { locked: false };
        } catch (error) {
            console.error('Error handling failed login:', error);
            return { locked: false };
        }
    }

    // Clear failed login attempts on successful login
    clearFailedAttempts(identifier, req) {
        const key = `${identifier}:${req.ip || req.connection.remoteAddress}`;
        this.failedAttempts.delete(key);
    }

    // Handle suspicious activity
    async handleSuspiciousActivity(sessionId, reason, req) {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) return;

            const key = `${session.userId}:${req.ip}`;
            
            if (!this.suspiciousActivity.has(key)) {
                this.suspiciousActivity.set(key, {
                    count: 0,
                    events: [],
                    firstOccurrence: Date.now()
                });
            }

            const activity = this.suspiciousActivity.get(key);
            activity.count++;
            activity.events.push({
                timestamp: Date.now(),
                reason,
                sessionId,
                userAgent: req.get('User-Agent')
            });

            // Keep only recent events (last 24 hours)
            const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
            activity.events = activity.events.filter(event => event.timestamp > dayAgo);

            // Terminate session if too much suspicious activity
            if (activity.count >= 5) {
                await this.terminateSession(sessionId, 'SUSPICIOUS_ACTIVITY');
                await this.logSecurityEvent('SESSION_TERMINATED_SUSPICIOUS', {
                    userId: session.userId,
                    sessionId,
                    reason,
                    eventCount: activity.count
                });
            }

            this.suspiciousActivity.set(key, activity);
        } catch (error) {
            console.error('Error handling suspicious activity:', error);
        }
    }

    // Get user sessions
    getUserSessions(userId) {
        const sessions = [];
        for (const [sessionId, session] of this.sessions) {
            if (session.userId === userId && session.isActive) {
                sessions.push({ sessionId, ...session });
            }
        }
        return sessions.sort((a, b) => a.createdAt - b.createdAt);
    }

    // Get session statistics
    getSessionStats() {
        return {
            ...this.sessionStats,
            activeSessions: this.sessions.size,
            failedAttempts: this.failedAttempts.size,
            suspiciousActivities: this.suspiciousActivity.size
        };
    }

    // Cleanup expired sessions
    cleanupExpiredSessions() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [sessionId, session] of this.sessions) {
            if (now > session.expiresAt || now > session.maxAge) {
                this.terminateSession(sessionId, now > session.expiresAt ? 'TIMEOUT' : 'MAX_AGE');
                cleanedCount++;
            }
        }

        // Clean old failed attempts
        for (const [key, attempts] of this.failedAttempts) {
            if (attempts.lockedUntil && now > attempts.lockedUntil) {
                this.failedAttempts.delete(key);
            }
        }

        // Clean old suspicious activity records
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
        for (const [key, activity] of this.suspiciousActivity) {
            if (activity.firstOccurrence < weekAgo) {
                this.suspiciousActivity.delete(key);
            }
        }

        if (cleanedCount > 0) {
            console.log(`Cleaned up ${cleanedCount} expired sessions`);
        }
    }

    // Start cleanup interval
    startCleanupInterval() {
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 5 * 60 * 1000); // Run every 5 minutes
    }

    // Helper methods
    generateSecureId() {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 15);
        const cryptoPart = require('crypto').randomBytes(8).toString('hex');
        return `${timestamp}_${randomPart}_${cryptoPart}`;
    }

    generateDeviceFingerprint(req) {
        const userAgent = req.get('User-Agent') || '';
        const acceptLanguage = req.get('Accept-Language') || '';
        const acceptEncoding = req.get('Accept-Encoding') || '';
        
        // Simple fingerprint (in production, use more sophisticated methods)
        return require('crypto')
            .createHash('sha256')
            .update(`${userAgent}|${acceptLanguage}|${acceptEncoding}`)
            .digest('hex')
            .substring(0, 16);
    }

    calculateSecurityLevel(user, req) {
        let score = 0;
        
        // User role-based scoring
        if (user.roles && user.roles.includes('admin')) score += 30;
        if (user.roles && user.roles.includes('super_admin')) score += 50;
        
        // IP-based scoring (simplified)
        const ip = req.ip || req.connection.remoteAddress;
        if (ip && (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('127.'))) {
            score += 20; // Internal network
        }
        
        // Time-based scoring
        const hour = new Date().getHours();
        if (hour >= 9 && hour <= 17) score += 10; // Business hours
        
        return Math.min(score, 100);
    }

    encodeSessionToken(session) {
        const payload = {
            sessionId: session.sessionId,
            userId: session.userId,
            tenantId: session.tenantId,
            expiresAt: session.expiresAt,
            maxAge: session.maxAge,
            version: '1.0'
        };
        
        // In production, use proper JWT signing
        return Buffer.from(JSON.stringify(payload)).toString('base64');
    }

    decodeSessionToken(token) {
        try {
            const payload = JSON.parse(Buffer.from(token, 'base64').toString());
            
            // Basic validation
            if (!payload.sessionId || !payload.userId || !payload.expiresAt) {
                return null;
            }
            
            return payload;
        } catch (error) {
            return null;
        }
    }

    async checkSuspiciousActivity(sessionId, req) {
        const session = this.sessions.get(sessionId);
        if (!session) return { isSuspicious: false };

        // Check for rapid requests
        const timeSinceLastActivity = Date.now() - session.lastActivity;
        if (timeSinceLastActivity < 100) { // Less than 100ms
            return { isSuspicious: true, reason: 'RAPID_REQUESTS' };
        }

        // Check for unusual time patterns
        const hour = new Date().getHours();
        if (hour < 6 || hour > 22) {
            return { isSuspicious: true, reason: 'UNUSUAL_TIME' };
        }

        return { isSuspicious: false };
    }

    async logSessionEvent(eventType, data) {
        try {
            await this.supabaseClient.from('session_logs').insert({
                event_type: eventType,
                session_id: data.sessionId,
                user_id: data.userId,
                ip_address: data.ipAddress,
                user_agent: data.userAgent,
                timestamp: new Date().toISOString(),
                metadata: data
            });
        } catch (error) {
            console.error('Error logging session event:', error);
        }
    }

    async logSecurityEvent(eventType, data) {
        try {
            await this.supabaseClient.from('security_events').insert({
                event_type: eventType,
                user_id: data.userId || null,
                identifier: data.identifier,
                ip_address: data.ipAddress,
                user_agent: data.userAgent,
                timestamp: new Date().toISOString(),
                severity: this.getEventSeverity(eventType),
                metadata: data
            });
        } catch (error) {
            console.error('Error logging security event:', error);
        }
    }

    getEventSeverity(eventType) {
        const severityMap = {
            'ACCOUNT_LOCKED': 'HIGH',
            'SESSION_TERMINATED_SUSPICIOUS': 'HIGH',
            'IP_MISMATCH': 'MEDIUM',
            'USER_AGENT_MISMATCH': 'MEDIUM',
            'SUSPICIOUS_ACTIVITY': 'MEDIUM'
        };
        return severityMap[eventType] || 'LOW';
    }
}

// Export for use in both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedSessionManager;
} else {
    window.EnhancedSessionManager = EnhancedSessionManager;
}
