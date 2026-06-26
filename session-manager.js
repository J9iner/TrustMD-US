/**
 * Session Manager Middleware
 * Handles user sessions and authentication
 */

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class SessionManager {
    constructor() {
        this.sessions = new Map(); // In production, use Redis
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
        this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    }

    // Session middleware
    middleware() {
        return async (req, res, next) => {
            try {
                const sessionId = req.headers['x-session-id'];
                const token = req.headers.authorization?.replace('Bearer ', '');

                if (!sessionId && !token) {
                    req.session = null;
                    return next();
                }

                // Try token-based auth first
                if (token) {
                    try {
                        const decoded = jwt.verify(token, this.jwtSecret);
                        req.session = {
                            userId: decoded.userId,
                            tenantId: decoded.tenantId,
                            email: decoded.email,
                            role: decoded.role,
                            sessionId: uuidv4()
                        };
                        return next();
                    } catch (jwtError) {
                        // Invalid token, continue to session check
                    }
                }

                // Try session-based auth
                if (sessionId) {
                    const session = this.sessions.get(sessionId);
                    if (session && session.expiresAt > Date.now()) {
                        req.session = session;
                        return next();
                    }
                }

                req.session = null;
                next();
            } catch (error) {
                console.error('Session middleware error:', error);
                req.session = null;
                next();
            }
        };
    }

    // Create new session
    async createSession(userId, tenantId, userData = {}) {
        const sessionId = uuidv4();
        const session = {
            sessionId,
            userId,
            tenantId,
            ...userData,
            createdAt: Date.now(),
            expiresAt: Date.now() + this.sessionTimeout,
            lastActivity: Date.now()
        };

        this.sessions.set(sessionId, session);
        return sessionId;
    }

    // Validate session
    async validateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session || session.expiresAt <= Date.now()) {
            if (session) {
                this.sessions.delete(sessionId);
            }
            return null;
        }

        // Update last activity
        session.lastActivity = Date.now();
        return session;
    }

    // Destroy session
    async destroySession(sessionId) {
        this.sessions.delete(sessionId);
        return true;
    }

    // Get session by user ID
    async getSessionsByUserId(userId) {
        const userSessions = [];
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.userId === userId && session.expiresAt > Date.now()) {
                userSessions.push(session);
            }
        }
        return userSessions;
    }

    // Destroy all sessions for a user
    async destroyUserSessions(userId) {
        const sessionsToDestroy = [];
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.userId === userId) {
                sessionsToDestroy.push(sessionId);
            }
        }
        
        sessionsToDestroy.forEach(sessionId => {
            this.sessions.delete(sessionId);
        });
        
        return sessionsToDestroy.length;
    }

    // Cleanup expired sessions
    cleanupExpiredSessions() {
        const now = Date.now();
        const expiredSessions = [];
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.expiresAt <= now) {
                expiredSessions.push(sessionId);
            }
        }
        
        expiredSessions.forEach(sessionId => {
            this.sessions.delete(sessionId);
        });
        
        return expiredSessions.length;
    }

    // Get session statistics
    getSessionStats() {
        const now = Date.now();
        let activeSessions = 0;
        let expiredSessions = 0;
        
        for (const session of this.sessions.values()) {
            if (session.expiresAt > now) {
                activeSessions++;
            } else {
                expiredSessions++;
            }
        }
        
        return {
            total: this.sessions.size,
            active: activeSessions,
            expired: expiredSessions
        };
    }

    // Extend session
    async extendSession(sessionId, duration = this.sessionTimeout) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return null;
        }
        
        session.expiresAt = Date.now() + duration;
        session.lastActivity = Date.now();
        
        return session;
    }

    // Check if session is valid
    isSessionValid(sessionId) {
        const session = this.sessions.get(sessionId);
        return session && session.expiresAt > Date.now();
    }

    // Generate JWT token
    generateToken(payload) {
        return jwt.sign(payload, this.jwtSecret, { expiresIn: '24h' });
    }

    // Verify JWT token
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            return null;
        }
    }
}

// Create singleton instance
const sessionManager = new SessionManager();

// Auto-cleanup expired sessions every hour
setInterval(() => {
    const cleaned = sessionManager.cleanupExpiredSessions();
    if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} expired sessions`);
    }
}, 60 * 60 * 1000);

module.exports = {
    sessionManager,
    createSession: sessionManager.createSession.bind(sessionManager),
    validateSession: sessionManager.validateSession.bind(sessionManager),
    destroySession: sessionManager.destroySession.bind(sessionManager),
    middleware: sessionManager.middleware.bind(sessionManager)
};
