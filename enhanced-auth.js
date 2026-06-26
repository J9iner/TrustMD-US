// TrustMD Enhanced Authentication - Multi-Tenant Auth System
// Provides secure authentication with RBAC context and tenant isolation

class EnhancedAuth {
    constructor(supabaseClient, rbacManager) {
        this.supabaseClient = supabaseClient;
        this.rbacManager = rbacManager;
        this.sessionCache = new Map();
        this.tokenBlacklist = new Set();
    }

    // Multi-tenant authentication
    async authenticateUser(credentials, tenantId = null) {
        try {
            const { email, password, subdomain } = credentials;

            // Determine tenant if not provided
            let targetTenantId = tenantId;
            if (!targetTenantId && subdomain) {
                const tenant = await this.getTenantBySubdomain(subdomain);
                if (tenant) {
                    targetTenantId = tenant.id;
                }
            }

            if (!targetTenantId) {
                throw new Error('Tenant identification required');
            }

            // Verify tenant is active
            const tenant = await this.getTenant(targetTenantId);
            if (!tenant || tenant.status !== 'active') {
                throw new Error('Tenant not found or inactive');
            }

            // Authenticate with Supabase
            const { data, error } = await this.supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                // Log failed authentication attempt
                await this.logAuthEvent('login_failed', {
                    email,
                    tenantId: targetTenantId,
                    reason: error.message,
                    ipAddress: this.getClientIP(),
                    userAgent: navigator.userAgent
                });
                throw new Error('Authentication failed');
            }

            // Verify user belongs to tenant
            const userProfile = await this.supabaseClient.from('user_profiles')
                .select(`
                    *,
                    tenant_id,
                    user_roles!inner(
                        role_id,
                        roles!inner(
                            id,
                            name,
                            description,
                            level,
                            permissions
                        )
                    )
                `)
                .eq('id', data.user.id)
                .eq('tenant_id', targetTenantId)
                .eq('status', 'active')
                .single();

            if (!userProfile.data) {
                // Log tenant mismatch
                await this.logAuthEvent('login_tenant_mismatch', {
                    userId: data.user.id,
                    email,
                    requestedTenantId: targetTenantId,
                    ipAddress: this.getClientIP(),
                    userAgent: navigator.userAgent
                });
                throw new Error('User not found in this tenant');
            }

            // Get user roles and permissions
            const userRoles = userProfile.data.user_roles || [];
            const userPermissions = await this.rbacManager.getUserPermissions(
                data.user.id, 
                targetTenantId
            );

            // Check for forced password reset
            if (userProfile.data.force_password_reset) {
                throw new Error('Password reset required');
            }

            // Generate enhanced JWT with role/permission context
            const token = await this.generateEnhancedToken({
                userId: data.user.id,
                tenantId: targetTenantId,
                roles: userRoles,
                permissions: userPermissions,
                profile: {
                    id: userProfile.data.id,
                    email: userProfile.data.email,
                    name: userProfile.data.name,
                    department: userProfile.data.department,
                    isTenantAdmin: userProfile.data.is_tenant_admin
                },
                tenant: {
                    id: tenant.id,
                    name: tenant.name,
                    subdomain: tenant.subdomain,
                    plan: tenant.plan
                }
            });

            // Cache session
            const sessionKey = `${data.user.id}-${targetTenantId}`;
            this.sessionCache.set(sessionKey, {
                user: data.user,
                profile: userProfile.data,
                roles: userRoles,
                permissions: userPermissions,
                tenant,
                token,
                loginTime: new Date().toISOString(),
                lastActivity: new Date().toISOString()
            });

            // Log successful authentication
            await this.logAuthEvent('login_success', {
                userId: data.user.id,
                tenantId: targetTenantId,
                email,
                ipAddress: this.getClientIP(),
                userAgent: navigator.userAgent
            });

            // Update last login
            await this.updateLastLogin(data.user.id, targetTenantId);

            return {
                success: true,
                user: data.user,
                profile: userProfile.data,
                roles: userRoles,
                permissions: userPermissions,
                tenant,
                token,
                expiresIn: 3600,
                sessionTimeout: this.getSessionTimeout(tenant.plan)
            };
        } catch (error) {
            console.error('Authentication error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Token validation with RBAC context
    async validateToken(token) {
        try {
            // Check if token is blacklisted
            if (this.tokenBlacklist.has(token)) {
                throw new Error('Token has been revoked');
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'trustmd-secret-key');
            
            // Verify token includes required context
            if (!decoded.userId || !decoded.tenantId || !decoded.roles) {
                throw new Error('Invalid token format');
            }

            // Verify session hasn't expired
            const sessionKey = `${decoded.userId}-${decoded.tenantId}`;
            const session = this.sessionCache.get(sessionKey);
            
            if (!session || session.token !== token) {
                throw new Error('Session not found or expired');
            }

            // Update last activity
            session.lastActivity = new Date().toISOString();
            this.sessionCache.set(sessionKey, session);

            return {
                valid: true,
                userId: decoded.userId,
                tenantId: decoded.tenantId,
                roles: decoded.roles,
                permissions: decoded.permissions,
                profile: decoded.profile,
                tenant: decoded.tenant
            };
        } catch (error) {
            console.error('Token validation error:', error);
            return {
                valid: false,
                error: error.message
            };
        }
    }

    // Refresh token
    async refreshToken(refreshToken, currentToken) {
        try {
            // Validate current token
            const currentValidation = await this.validateToken(currentToken);
            if (!currentValidation.valid) {
                throw new Error('Invalid current token');
            }

            // Get user session
            const sessionKey = `${currentValidation.userId}-${currentValidation.tenantId}`;
            const session = this.sessionCache.get(sessionKey);
            
            if (!session) {
                throw new Error('Session not found');
            }

            // Generate new token with updated context
            const newToken = await this.generateEnhancedToken({
                userId: currentValidation.userId,
                tenantId: currentValidation.tenantId,
                roles: currentValidation.roles,
                permissions: currentValidation.permissions,
                profile: currentValidation.profile,
                tenant: currentValidation.tenant
            });

            // Update session with new token
            session.token = newToken;
            session.lastActivity = new Date().toISOString();
            this.sessionCache.set(sessionKey, session);

            // Blacklist old token
            this.tokenBlacklist.add(currentToken);

            await this.logAuthEvent('token_refreshed', {
                userId: currentValidation.userId,
                tenantId: currentValidation.tenantId
            });

            return {
                success: true,
                token: newToken,
                expiresIn: 3600
            };
        } catch (error) {
            console.error('Token refresh error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Logout user
    async logoutUser(userId, tenantId, token = null) {
        try {
            // Clear session cache
            const sessionKey = `${userId}-${tenantId}`;
            this.sessionCache.delete(sessionKey);

            // Blacklist token if provided
            if (token) {
                this.tokenBlacklist.add(token);
            }

            // Log logout event
            await this.logAuthEvent('logout', {
                userId,
                tenantId,
                ipAddress: this.getClientIP(),
                userAgent: navigator.userAgent
            });

            // Call Supabase logout
            await this.supabaseClient.auth.signOut();

            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    // Password management
    async requestPasswordReset(email, tenantId) {
        try {
            // Verify tenant exists
            const tenant = await this.getTenant(tenantId);
            if (!tenant) {
                throw new Error('Tenant not found');
            }

            // Check user exists in tenant
            const user = await this.supabaseClient.from('user_profiles')
                .select('id, email, name')
                .eq('email', email)
                .eq('tenant_id', tenantId)
                .eq('status', 'active')
                .single();

            if (!user.data) {
                throw new Error('User not found in this tenant');
            }

            // Generate reset token
            const resetToken = this.generateSecureToken();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Store reset request
            const result = await this.supabaseClient.from('password_resets').insert({
                user_id: user.data.id,
                tenant_id: tenantId,
                email,
                token: resetToken,
                expires_at: expiresAt.toISOString(),
                created_at: new Date().toISOString()
            }).select().single();

            if (result.error) {
                throw new Error(`Failed to create reset request: ${result.error.message}`);
            }

            // Send reset email (implementation depends on email service)
            await this.sendPasswordResetEmail(email, resetToken, tenant.name);

            await this.logAuthEvent('password_reset_requested', {
                userId: user.data.id,
                tenantId,
                email,
                ipAddress: this.getClientIP()
            });

            return { success: true };
        } catch (error) {
            console.error('Password reset request error:', error);
            return { success: false, error: error.message };
        }
    }

    async resetPassword(token, newPassword) {
        try {
            // Validate reset token
            const resetRequest = await this.supabaseClient.from('password_resets')
                .select('*')
                .eq('token', token)
                .eq('used', false)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (!resetRequest.data) {
                throw new Error('Invalid or expired reset token');
            }

            // Update user password
            const { error } = await this.supabaseClient.auth.admin.updateUserById(
                resetRequest.data.user_id,
                { password: newPassword }
            );

            if (error) {
                throw new Error(`Failed to update password: ${error.message}`);
            }

            // Mark reset token as used
            await this.supabaseClient.from('password_resets')
                .update({
                    used: true,
                    used_at: new Date().toISOString()
                })
                .eq('id', resetRequest.data.id);

            // Clear force password reset flag
            await this.supabaseClient.from('user_profiles')
                .update({
                    force_password_reset: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', resetRequest.data.user_id);

            // Clear user sessions
            await this.clearUserSessions(resetRequest.data.user_id);

            await this.logAuthEvent('password_reset_completed', {
                userId: resetRequest.data.user_id,
                tenantId: resetRequest.data.tenant_id
            });

            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    }

    // Two-factor authentication
    async enableTwoFactor(userId, tenantId) {
        try {
            const secret = this.generateTOTPSecret();
            const backupCodes = this.generateBackupCodes();

            const result = await this.supabaseClient.from('user_profiles')
                .update({
                    two_factor_enabled: true,
                    two_factor_secret: secret,
                    two_factor_backup_codes: backupCodes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .eq('tenant_id', tenantId);

            if (result.error) {
                throw new Error(`Failed to enable 2FA: ${result.error.message}`);
            }

            await this.logAuthEvent('two_factor_enabled', {
                userId,
                tenantId
            });

            return { 
                success: true, 
                secret,
                backupCodes,
                qrCode: this.generateQRCode(secret)
            };
        } catch (error) {
            console.error('2FA enable error:', error);
            return { success: false, error: error.message };
        }
    }

    async verifyTwoFactor(userId, tenantId, code) {
        try {
            const user = await this.supabaseClient.from('user_profiles')
                .select('two_factor_secret, two_factor_backup_codes')
                .eq('id', userId)
                .eq('tenant_id', tenantId)
                .single();

            if (!user.data || !user.data.two_factor_enabled) {
                throw new Error('2FA not enabled for this user');
            }

            // Verify TOTP code
            const isValid = this.verifyTOTPCode(user.data.two_factor_secret, code);
            
            if (!isValid && !user.data.two_factor_backup_codes.includes(code)) {
                throw new Error('Invalid verification code');
            }

            // Clear backup codes if used
            if (user.data.two_factor_backup_codes.includes(code)) {
                const updatedBackupCodes = user.data.two_factor_backup_codes.filter(c => c !== code);
                await this.supabaseClient.from('user_profiles')
                    .update({
                        two_factor_backup_codes: updatedBackupCodes,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userId)
                    .eq('tenant_id', tenantId);
            }

            await this.logAuthEvent('two_factor_verified', {
                userId,
                tenantId,
                method: isValid ? 'totp' : 'backup_code'
            });

            return { success: true };
        } catch (error) {
            console.error('2FA verification error:', error);
            return { success: false, error: error.message };
        }
    }

    // Utility methods
    async generateEnhancedToken(payload) {
        const jwtPayload = {
            ...payload,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
            iss: 'trustmd',
            aud: 'trustmd-api'
        };

        return jwt.sign(jwtPayload, process.env.JWT_SECRET || 'trustmd-secret-key');
    }

    generateSecureToken() {
        return require('crypto').randomBytes(32).toString('hex');
    }

    generateTOTPSecret() {
        return require('speakeasy').generateSecret({
            name: 'TrustMD',
            issuer: 'TrustMD',
            length: 32
        }).base32;
    }

    generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            codes.push(Math.random().toString(6).padStart(6, '0'));
        }
        return codes;
    }

    verifyTOTPCode(secret, code) {
        return require('speakeasy').totp.verify({
            secret,
            encoding: 'base32',
            token: code,
            window: 2 // 30 second window
        });
    }

    generateQRCode(secret) {
        const otpauthUrl = `otpauth://totp/TrustMD?secret=${secret}&issuer=TrustMD`;
        return require('qrcode').toDataURL(otpauthUrl);
    }

    getSessionTimeout(plan) {
        const timeouts = {
            basic: 1800,      // 30 minutes
            professional: 3600,  // 1 hour
            enterprise: 7200     // 2 hours
        };
        return timeouts[plan] || timeouts.professional;
    }

    getClientIP() {
        // In production, this would come from request headers
        return '127.0.0.1'; // Placeholder
    }

    async getTenant(tenantId) {
        try {
            const tenant = await this.supabaseClient.from('tenants')
                .select('*')
                .eq('id', tenantId)
                .single();
            return tenant.data || null;
        } catch (error) {
            return null;
        }
    }

    async getTenantBySubdomain(subdomain) {
        try {
            const tenant = await this.supabaseClient.from('tenants')
                .select('*')
                .eq('subdomain', subdomain.toLowerCase())
                .single();
            return tenant.data || null;
        } catch (error) {
            return null;
        }
    }

    async updateLastLogin(userId, tenantId) {
        try {
            await this.supabaseClient.from('user_profiles')
                .update({
                    last_login: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .eq('tenant_id', tenantId);
        } catch (error) {
            console.error('Error updating last login:', error);
        }
    }

    async clearUserSessions(userId) {
        try {
            // Clear all sessions for user
            for (const [key, session] of this.sessionCache.entries()) {
                if (session.user.id === userId) {
                    this.sessionCache.delete(key);
                    this.tokenBlacklist.add(session.token);
                }
            }
        } catch (error) {
            console.error('Error clearing user sessions:', error);
        }
    }

    async sendPasswordResetEmail(email, token, tenantName) {
        // Implementation depends on email service provider
        console.log(`Password reset email sent to ${email} for tenant ${tenantName}`);
        // In production, integrate with SendGrid, AWS SES, or similar service
    }

    async logAuthEvent(action, eventData) {
        try {
            const auditLog = {
                user_id: eventData.userId || null,
                tenant_id: eventData.tenantId,
                action,
                resource: 'authentication',
                details: eventData,
                ip_address: this.getClientIP(),
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };

            await this.supabaseClient.from('audit_logs').insert(auditLog);
        } catch (error) {
            console.error('Error logging auth event:', error);
        }
    }

    // Session management
    async getActiveSessions(userId) {
        const sessions = [];
        for (const [key, session] of this.sessionCache.entries()) {
            if (session.user.id === userId) {
                sessions.push({
                    tenantId: session.tenant.id,
                    tenantName: session.tenant.name,
                    loginTime: session.loginTime,
                    lastActivity: session.lastActivity,
                    current: session.lastActivity === session.loginTime
                });
            }
        }
        return sessions;
    }

    async cleanupExpiredSessions() {
        const now = new Date();
        const expiredSessions = [];

        for (const [key, session] of this.sessionCache.entries()) {
            const lastActivity = new Date(session.lastActivity);
            const sessionAge = (now - lastActivity) / (1000 * 60); // minutes
            
            if (sessionAge > this.getSessionTimeout(session.tenant.plan)) {
                expiredSessions.push(key);
                this.tokenBlacklist.add(session.token);
            }
        }

        // Remove expired sessions
        expiredSessions.forEach(key => this.sessionCache.delete(key));

        return expiredSessions.length;
    }

    // Cache management
    clearCache() {
        this.sessionCache.clear();
        this.tokenBlacklist.clear();
    }

    // Security monitoring
    async detectSuspiciousActivity(userId, tenantId) {
        try {
            const recentLogins = await this.supabaseClient.from('audit_logs')
                .select('*')
                .eq('user_id', userId)
                .eq('tenant_id', tenantId)
                .eq('action', 'login_success')
                .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .order('timestamp', { ascending: false })
                .limit(10);

            if (!recentLogins.data || recentLogins.data.length < 3) {
                return false; // Not enough data
            }

            // Check for multiple locations
            const locations = new Set();
            const ipAddresses = new Set();
            
            recentLogins.data.forEach(login => {
                if (login.details?.ipAddress) {
                    ipAddresses.add(login.details.ipAddress);
                }
                if (login.details?.userAgent) {
                    locations.add(this.extractLocationFromUserAgent(login.details.userAgent));
                }
            });

            // Suspicious if multiple IPs or locations in short time
            const suspicious = ipAddresses.size > 2 || locations.size > 2;

            if (suspicious) {
                await this.logAuthEvent('suspicious_activity_detected', {
                    userId,
                    tenantId,
                    reason: 'multiple_locations_or_ips',
                    ipCount: ipAddresses.size,
                    locationCount: locations.size
                });
            }

            return suspicious;
        } catch (error) {
            console.error('Error detecting suspicious activity:', error);
            return false;
        }
    }

    extractLocationFromUserAgent(userAgent) {
        // Simple extraction - in production, use proper geolocation
        if (userAgent.includes('Mobile')) return 'Mobile';
        if (userAgent.includes('Tablet')) return 'Tablet';
        return 'Desktop';
    }
}

// Export for use in backend
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedAuth;
} else {
    window.EnhancedAuth = EnhancedAuth;
}
