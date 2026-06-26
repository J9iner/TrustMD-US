// TrustMD API Server - Comprehensive Backend API Layer
// Provides RESTful endpoints for front-end integration

// Note: Compliance template imports removed for browser compatibility
// Templates will be loaded dynamically if needed

// Browser-compatible version - requires will be handled by script loading order

class TrustMDAPIServer {
    constructor() {
        this.supabaseClient = null;
        this.phiProtection = null;
        this.riskEngine = null;
        this.evidenceVault = null;
        this.sessionManager = null;
        this.rateLimiter = new Map();
        this.requestCache = new Map();
        this.middleware = [];
        this.routes = new Map();
        this.initialized = false;
    }

    // Initialize API server with dependencies
    async initialize(dependencies = {}) {
        try {
            this.supabaseClient = dependencies.supabaseClient || window.trustMDClient;
            this.phiProtection = dependencies.phiProtection || window.phiProtection;
            this.riskEngine = dependencies.riskEngine || window.riskEngine;
            this.evidenceVault = dependencies.evidenceVault || window.evidenceVault;
            this.rbacManager = dependencies.rbacManager || new RBACManager(this.supabaseClient);
            this.tenantManager = dependencies.tenantManager || new TenantManager(this.supabaseClient, this.rbacManager);
            this.userProvisioning = dependencies.userProvisioning || new UserProvisioning(this.tenantManager, this.rbacManager, this.supabaseClient);
            this.auditLogger = dependencies.auditLogger || new AuditLogger(this.supabaseClient);
            
            // Initialize enhanced session manager
            this.sessionManager = new EnhancedSessionManager(this.supabaseClient, {
                sessionTimeout: dependencies.sessionTimeout || 30 * 60 * 1000, // 30 minutes
                maxSessionAge: dependencies.maxSessionAge || 24 * 60 * 60 * 1000, // 24 hours
                maxConcurrentSessions: dependencies.maxConcurrentSessions || 5,
                requireReauth: dependencies.requireReauth || false,
                ipValidation: dependencies.ipValidation !== false,
                userAgentValidation: dependencies.userAgentValidation !== false,
                suspiciousActivityThreshold: dependencies.suspiciousActivityThreshold || 10,
                lockoutDuration: dependencies.lockoutDuration || 15 * 60 * 1000 // 15 minutes
            });
            
            // Setup middleware
            this.setupMiddleware();
            
            // Register routes
            this.registerRoutes();
            
            // Setup error handling
            this.setupErrorHandling();
            
            this.initialized = true;
            console.log('TrustMD API Server initialized successfully');
            
            return {
                success: true,
                message: 'API Server ready',
                endpoints: this.getAvailableEndpoints()
            };
        } catch (error) {
            console.error('API Server initialization failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Input validation and sanitization
    validateAndSanitizeInput(input, type = 'string', maxLength = 255) {
        if (!input || typeof input !== 'string') {
            return null;
        }
        
        // Remove potentially dangerous characters
        const sanitized = input
            .replace(/[<>\"'&]/g, '') // Remove HTML special chars
            .replace(/[\r\n\t]/g, '') // Remove control characters
            .trim();
        
        // Validate length
        if (sanitized.length > maxLength) {
            return null;
        }
        
        // Type-specific validation
        switch (type) {
            case 'alphanumeric':
                return /^[a-zA-Z0-9_-]+$/.test(sanitized) ? sanitized : null;
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized) ? sanitized : null;
            case 'uuid':
                return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sanitized) ? sanitized : null;
            default:
                return sanitized;
        }
    }

    // Validate request body for common injection patterns
    validateRequestBody(body, path) {
        const validated = {};
        const maxDepth = 10; // Prevent deep object recursion
        const maxKeys = 100; // Prevent object explosion
        
        const validateValue = (value, depth = 0) => {
            if (depth > maxDepth) {
                throw new Error('Request body too deeply nested');
            }
            
            if (value === null || value === undefined) {
                return value;
            }
            
            switch (typeof value) {
                case 'string':
                    // Check for common injection patterns
                    const dangerousPatterns = [
                        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                        /javascript:/gi,
                        /on\w+\s*=/gi,
                        /eval\s*\(/gi,
                        /expression\s*\(/gi,
                        /union\s+select/gi,
                        /drop\s+table/gi,
                        /insert\s+into/gi,
                        /delete\s+from/gi,
                        /update\s+\w+\s+set/gi
                    ];
                    
                    for (const pattern of dangerousPatterns) {
                        if (pattern.test(value)) {
                            throw new Error('Potentially dangerous content detected');
                        }
                    }
                    
                    // Validate string length
                    if (value.length > 10000) {
                        throw new Error('String value too long');
                    }
                    
                    return value;
                    
                case 'number':
                    if (!isFinite(value)) {
                        throw new Error('Invalid number value');
                    }
                    return value;
                    
                case 'boolean':
                    return value;
                    
                case 'object':
                    if (Array.isArray(value)) {
                        if (value.length > 1000) {
                            throw new Error('Array too large');
                        }
                        return value.map(item => validateValue(item, depth + 1));
                    } else {
                        const keys = Object.keys(value);
                        if (keys.length > maxKeys) {
                            throw new Error('Object has too many properties');
                        }
                        
                        const validatedObj = {};
                        for (const key of keys) {
                            // Validate key names
                            if (typeof key !== 'string' || key.length > 100) {
                                throw new Error('Invalid object key');
                            }
                            
                            validatedObj[key] = validateValue(value[key], depth + 1);
                        }
                        return validatedObj;
                    }
                    
                default:
                    throw new Error('Unsupported data type in request body');
            }
        };
        
        try {
            return validateValue(body);
        } catch (error) {
            throw new Error(`Request body validation failed: ${error.message}`);
        }
    }

    // Setup middleware for all requests
    setupMiddleware() {
        // Input validation middleware
        this.addMiddleware(async (req, res, next) => {
            // Validate and sanitize headers
            req.validatedHeaders = {};
            
            // Client ID validation
            const rawClientId = req.headers['x-client-id'];
            const clientId = this.validateAndSanitizeInput(rawClientId, 'alphanumeric', 64);
            req.validatedHeaders.clientId = clientId || 'anonymous';
            
            // Tenant ID validation
            const rawTenantId = req.headers['x-tenant-id'];
            const tenantId = this.validateAndSanitizeInput(rawTenantId, 'uuid', 36);
            req.validatedHeaders.tenantId = tenantId;
            
            // User Agent validation
            const rawUserAgent = req.headers['user-agent'];
            const userAgent = this.validateAndSanitizeInput(rawUserAgent, 'string', 500);
            req.validatedHeaders.userAgent = userAgent || 'unknown';
            
            // Forward IP validation
            const rawForwardedFor = req.headers['x-forwarded-for'];
            const forwardedFor = this.validateAndSanitizeInput(rawForwardedFor, 'string', 100);
            req.validatedHeaders.forwardedFor = forwardedFor;
            
            next();
        });

        // Rate limiting middleware with validated client ID
        this.addMiddleware(async (req, res, next) => {
            const clientId = req.validatedHeaders.clientId;
            const now = Date.now();
            const windowMs = 60000; // 1 minute window
            const maxRequests = 100; // 100 requests per minute
            
            if (!this.rateLimiter.has(clientId)) {
                this.rateLimiter.set(clientId, { count: 0, resetTime: now + windowMs });
            }
            
            const client = this.rateLimiter.get(clientId);
            
            if (now > client.resetTime) {
                client.count = 0;
                client.resetTime = now + windowMs;
            }
            
            if (client.count >= maxRequests) {
                return this.sendError(res, 429, 'Rate limit exceeded');
            }
            
            client.count++;
            next();
        });

        // Request body validation middleware
        this.addMiddleware(async (req, res, next) => {
            // Skip body validation for GET requests
            if (req.method === 'GET' || req.method === 'HEAD') {
                return next();
            }
            
            try {
                // Validate JSON body size
                const contentLength = parseInt(req.headers['content-length'] || '0');
                const maxBodySize = 10 * 1024 * 1024; // 10MB limit
                
                if (contentLength > maxBodySize) {
                    return this.sendError(res, 413, 'Request entity too large');
                }
                
                // Parse and validate body if it exists
                if (req.body && typeof req.body === 'object') {
                    req.validatedBody = this.validateRequestBody(req.body, req.path);
                } else {
                    req.validatedBody = {};
                }
                
                next();
            } catch (error) {
                return this.sendError(res, 400, 'Invalid request body format');
            }
        });

        // Authentication middleware
        this.addMiddleware(async (req, res, next) => {
            // Skip auth for public endpoints
            const publicEndpoints = ['/auth/login', '/auth/register', '/health', '/auth/refresh'];
            if (publicEndpoints.includes(req.path)) {
                return next();
            }
            
            const token = req.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                return this.sendError(res, 401, 'Authentication required');
            }
            
            try {
                // Use enhanced session validation
                const validation = await this.sessionManager.validateSession(token, req);
                
                if (!validation.valid) {
                    let message = 'Session expired';
                    if (validation.reason === 'INVALID_TOKEN') message = 'Invalid token';
                    else if (validation.reason === 'SESSION_NOT_FOUND') message = 'Session not found';
                    else if (validation.reason === 'IP_MISMATCH') message = 'Security violation: IP address mismatch';
                    else if (validation.reason === 'USER_AGENT_MISMATCH') message = 'Security violation: Browser mismatch';
                    else if (validation.reason === 'SUSPICIOUS_ACTIVITY') message = 'Security violation: Suspicious activity detected';
                    
                    return this.sendError(res, 401, message, {
                        reason: validation.reason,
                        requiresReauth: true
                    });
                }
                
                req.user = {
                    id: validation.session.userId,
                    email: validation.session.email,
                    tenantId: validation.session.tenantId,
                    roles: validation.session.roles,
                    permissions: validation.session.permissions,
                    sessionId: validation.session.sessionId,
                    securityLevel: validation.session.securityLevel
                };
                
                next();
            } catch (error) {
                console.error('Session validation error:', error);
                return this.sendError(res, 401, 'Authentication failed', {
                    requiresReauth: true
                });
            }
        });

        // PHI protection middleware
        this.addMiddleware(async (req, res, next) => {
            if (req.body && this.phiProtection) {
                const phiCheck = await this.phiProtection.scanForPHI(req.body);
                if (phiCheck.containsPHI && !phiCheck.authorized) {
                    return this.sendError(res, 403, 'Unauthorized PHI detected');
                }
            }
            next();
        });

        // Request logging middleware
        this.addMiddleware(async (req, res, next) => {
            const startTime = Date.now();
            
            res.on('finish', () => {
                const duration = Date.now() - startTime;
                console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
            });
            
            next();
        });
    }

    // Add middleware to the stack
    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }

    // Register all API routes
    registerRoutes() {
        // Health check endpoint
        this.addRoute('GET', '/health', this.healthCheck.bind(this));
        
        // Authentication endpoints
        this.addRoute('POST', '/auth/login', this.login.bind(this));
        this.addRoute('POST', '/auth/register', this.register.bind(this));
        this.addRoute('POST', '/auth/logout', this.logout.bind(this));
        this.addRoute('POST', '/auth/refresh', this.refreshToken.bind(this));
        this.addRoute('GET', '/auth/profile', this.getProfile.bind(this));
        this.addRoute('PUT', '/auth/profile', this.updateProfile.bind(this));
        
        // Session management endpoints
        this.addRoute('GET', '/auth/sessions', this.getUserSessions.bind(this));
        this.addRoute('DELETE', '/auth/sessions/:sessionId', this.terminateSession.bind(this));
        this.addRoute('DELETE', '/auth/sessions', this.terminateAllSessions.bind(this));
        this.addRoute('GET', '/auth/session-stats', this.getSessionStats.bind(this));
        
        // Compliance endpoints
        this.addRoute('GET', '/compliance/categories', this.getComplianceCategories.bind(this));
        this.addRoute('GET', '/compliance/requirements', this.getComplianceRequirements.bind(this));
        this.addRoute('GET', '/compliance/user', this.getUserCompliance.bind(this));
        this.addRoute('GET', '/compliance/score', this.getComplianceScore.bind(this));
        this.addRoute('POST', '/compliance/requirement', this.updateComplianceRequirement.bind(this));
        this.addRoute('GET', '/compliance/summary', this.getComplianceSummary.bind(this));
        
        // Risk assessment endpoints
        this.addRoute('GET', '/risk/categories', this.getRiskCategories.bind(this));
        this.addRoute('GET', '/risk/assessments', this.getRiskAssessments.bind(this));
        this.addRoute('POST', '/risk/assessment', this.createRiskAssessment.bind(this));
        this.addRoute('PUT', '/risk/assessment/:id', this.updateRiskAssessment.bind(this));
        this.addRoute('POST', '/risk/calculate', this.calculateRiskScore.bind(this));
        this.addRoute('GET', '/risk/summary', this.getRiskSummary.bind(this));
        
        // Document management endpoints
        this.addRoute('GET', '/documents/types', this.getDocumentTypes.bind(this));
        this.addRoute('GET', '/documents', this.getDocuments.bind(this));
        this.addRoute('POST', '/documents', this.uploadDocument.bind(this));
        this.addRoute('PUT', '/documents/:id', this.updateDocument.bind(this));
        this.addRoute('DELETE', '/documents/:id', this.deleteDocument.bind(this));
        this.addRoute('GET', '/documents/:id', this.getDocument.bind(this));
        this.addRoute('POST', '/documents/:id/scan', this.scanDocumentForPHI.bind(this));
        
        // Notification endpoints
        this.addRoute('GET', '/notifications', this.getNotifications.bind(this));
        this.addRoute('POST', '/notifications', this.createNotification.bind(this));
        this.addRoute('PUT', '/notifications/:id/read', this.markNotificationRead.bind(this));
        this.addRoute('DELETE', '/notifications/:id', this.deleteNotification.bind(this));
        this.addRoute('POST', '/notifications/mark-all-read', this.markAllNotificationsRead.bind(this));
        
        // Analytics endpoints
        this.addRoute('GET', '/analytics/dashboard', this.getDashboardAnalytics.bind(this));
        this.addRoute('GET', '/analytics/compliance', this.getComplianceAnalytics.bind(this));
        this.addRoute('GET', '/analytics/risk', this.getRiskAnalytics.bind(this));
        this.addRoute('GET', '/analytics/trends', this.getTrendAnalytics.bind(this));
        this.addRoute('POST', '/analytics/report', this.generateReport.bind(this));
        
        // Admin endpoints
        this.addRoute('GET', '/admin/users', this.getUsers.bind(this));
        this.addRoute('POST', '/admin/users', this.createUser.bind(this));
        this.addRoute('PUT', '/admin/users/:id', this.updateUser.bind(this));
        this.addRoute('DELETE', '/admin/users/:id', this.deleteUser.bind(this));
        this.addRoute('GET', '/admin/tenants', this.getTenants.bind(this));
        this.addRoute('POST', '/admin/tenants', this.createTenant.bind(this));
        this.addRoute('GET', '/admin/audit-log', this.getAuditLog.bind(this));
        
        // Integration endpoints
        this.addRoute('POST', '/integrations/ehr', this.syncEHRData.bind(this));
        this.addRoute('POST', '/integrations/webhook/:provider', this.handleWebhook.bind(this));
        this.addRoute('GET', '/integrations/status', this.getIntegrationStatus.bind(this));

        // RBAC endpoints
        this.addRoute('GET', '/admin/roles', this.getRoles.bind(this));
        this.addRoute('POST', '/admin/roles', this.createRole.bind(this));
        this.addRoute('PUT', '/admin/roles/:id', this.updateRole.bind(this));
        this.addRoute('DELETE', '/admin/roles/:id', this.deleteRole.bind(this));

        // Tenant management endpoints
        this.addRoute('GET', '/admin/tenants', this.getTenants.bind(this));
        this.addRoute('POST', '/admin/tenants', this.createTenant.bind(this));
        this.addRoute('PUT', '/admin/tenants/:id', this.updateTenant.bind(this));
        this.addRoute('DELETE', '/admin/tenants/:id', this.deleteTenant.bind(this));
        this.addRoute('GET', '/admin/tenants/:id/stats', this.getTenantStats.bind(this));

        // User management endpoints
        this.addRoute('GET', '/admin/users', this.getUsers.bind(this));
        this.addRoute('POST', '/admin/users', this.createUser.bind(this));
        this.addRoute('PUT', '/admin/users/:id', this.updateUser.bind(this));
        this.addRoute('DELETE', '/admin/users/:id', this.deleteUser.bind(this));
        this.addRoute('POST', '/admin/users/:id/roles', this.assignUserRoles.bind(this));
        this.addRoute('DELETE', '/admin/users/:id/roles/:roleId', this.removeUserRole.bind(this));
        this.addRoute('POST', '/admin/users/:id/activate', this.activateUser.bind(this));
        this.addRoute('POST', '/admin/users/:id/deactivate', this.deactivateUser.bind(this));

        // Security and audit endpoints
        this.addRoute('GET', '/admin/audit-logs', this.getAuditLogs.bind(this));
        this.addRoute('GET', '/admin/security-alerts', this.getSecurityAlerts.bind(this));
        this.addRoute('POST', '/admin/security-alerts/:id/acknowledge', this.acknowledgeAlert.bind(this));

        // PWA endpoints
        this.addRoute('GET', '/pwa/manifest', this.getPWAManifest.bind(this));
        this.addRoute('POST', '/pwa/subscribe', this.subscribeToPushNotifications.bind(this));
        this.addRoute('POST', '/pwa/unsubscribe', this.unsubscribeFromPushNotifications.bind(this));

        // Compliance template endpoints
        this.addRoute('GET', '/compliance/templates', this.getAvailableTemplates.bind(this));
        this.addRoute('GET', '/compliance/templates/:templateId', this.getTemplate.bind(this));
        this.addRoute('GET', '/compliance/templates/state/:stateCode', this.getStateTemplate.bind(this));
        this.addRoute('POST', '/compliance/reports/:templateId', this.generateComplianceReport.bind(this));
        this.addRoute('GET', '/compliance/reports/:templateId', this.getComplianceReport.bind(this));
        this.addRoute('POST', '/compliance/reports/multi-state', this.generateMultiStateReport.bind(this));
        this.addRoute('GET', '/compliance/reports/multi-state', this.getMultiStateReports.bind(this));
        this.addRoute('GET', '/compliance/config/states', this.getStateConfigurations.bind(this));
        this.addRoute('GET', '/compliance/config/tiers', this.getStateTiers.bind(this));
        
        // New Two-File Architecture Endpoints
        this.addRoute('GET', '/states', this.getAllStates.bind(this));
        this.addRoute('GET', '/states/:stateCode', this.getStateDetails.bind(this));
        this.addRoute('GET', '/states/:stateCode/regulations', this.getStateRegulations.bind(this));
        this.addRoute('GET', '/states/:stateCode/compliance', this.getStateCompliance.bind(this));
        this.addRoute('POST', '/states/:stateCode/validate', this.validateStateCompliance.bind(this));
        this.addRoute('GET', '/states/:stateCode/report', this.generateStateReport.bind(this));
        this.addRoute('GET', '/states/comparison', this.compareStates.bind(this));
        this.addRoute('GET', '/states/analytics', this.getStatesAnalytics.bind(this));
        this.addRoute('PUT', '/states/:stateCode/regulations', this.updateStateRegulations.bind(this));
        this.addRoute('GET', '/states/burden-analysis', this.getRegulatoryBurdenAnalysis.bind(this));
    }

    // Add a route to the router
    addRoute(method, path, handler) {
        const key = `${method}:${path}`;
        this.routes.set(key, handler);
    }

    // Main request handler
    async handleRequest(req, res) {
        try {
            // Apply middleware
            for (const middleware of this.middleware) {
                const result = await middleware(req, res, () => {});
                if (result) return; // Middleware handled the response
            }
            
            // Find route
            const key = `${req.method}:${req.path}`;
            const handler = this.routes.get(key);
            
            if (!handler) {
                return this.sendError(res, 404, 'Endpoint not found');
            }
            
            // Execute handler
            await handler(req, res);
        } catch (error) {
            console.error('Request handling error:', error);
            this.sendError(res, 500, 'Internal server error');
        }
    }

    // Authentication endpoints
    async healthCheck(req, res) {
        return this.sendResponse(res, 200, {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            services: {
                database: this.supabaseClient ? 'connected' : 'disconnected',
                phiProtection: this.phiProtection ? 'active' : 'inactive',
                riskEngine: this.riskEngine ? 'active' : 'inactive'
            }
        });
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return this.sendError(res, 400, 'Email and password required');
            }
            
            // Check for account lockout
            const lockoutCheck = await this.sessionManager.handleFailedLogin(email, req);
            if (lockoutCheck.locked) {
                return this.sendError(res, 423, 'Account temporarily locked', {
                    lockedUntil: lockoutCheck.lockedUntil,
                    reason: lockoutCheck.reason
                });
            }
            
            const result = await this.supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            
            if (result.error) {
                // Handle failed login
                await this.sessionManager.handleFailedLogin(email, req);
                return this.sendError(res, 401, 'Invalid credentials');
            }
            
            // Clear failed attempts on successful login
            this.sessionManager.clearFailedAttempts(email, req);
            
            // Get user profile data
            const { data: profile } = await this.supabaseClient
                .from('users')
                .select('*, tenant:tenants(*)')
                .eq('id', result.data.user.id)
                .single();
            
            // Generate enhanced session token
            const sessionData = await this.sessionManager.generateSessionToken({
                ...result.data.user,
                ...profile
            }, req);
            
            return this.sendResponse(res, 200, {
                user: this.sanitizeUser(result.data.user),
                session: sessionData,
                message: 'Login successful'
            });
        } catch (error) {
            console.error('Login error:', error);
            return this.sendError(res, 500, 'Login failed');
        }
    }

    async register(req, res) {
        try {
            const { email, password, name, tenantName } = req.body;
            
            if (!email || !password || !name) {
                return this.sendError(res, 400, 'Required fields missing');
            }
            
            // Create user
            const userResult = await this.supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: { name }
                }
            });
            
            if (userResult.error) {
                return this.sendError(res, 400, userResult.error.message);
            }
            
            // Create tenant if needed
            let tenantId = null;
            if (tenantName) {
                const tenantResult = await this.supabaseClient.from('tenants').insert({
                    name: tenantName,
                    subdomain: tenantName.toLowerCase().replace(/\s+/g, '-'),
                    created_at: new Date().toISOString()
                }).select().single();
                
                if (tenantResult.error) {
                    return this.sendError(res, 500, 'Tenant creation failed');
                }
                
                tenantId = tenantResult.data.id;
            }
            
            const token = await this.generateToken(userResult.data.user);
            
            return this.sendResponse(res, 201, {
                user: this.sanitizeUser(userResult.data.user),
                token,
                tenantId,
                expiresIn: 3600
            });
        } catch (error) {
            return this.sendError(res, 500, 'Registration failed');
        }
    }

    async logout(req, res) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            
            if (token) {
                // Terminate the specific session
                const validation = await this.sessionManager.validateSession(token, req);
                if (validation.valid) {
                    await this.sessionManager.terminateSession(validation.session.sessionId, 'USER_LOGOUT');
                }
            }
            
            // Also logout from Supabase
            await this.supabaseClient.auth.signOut();
            
            return this.sendResponse(res, 200, { 
                message: 'Logged out successfully',
                allSessionsTerminated: false
            });
        } catch (error) {
            console.error('Logout error:', error);
            return this.sendError(res, 500, 'Logout failed');
        }
    }

    // Session management endpoints
    async getUserSessions(req, res) {
        try {
            const userId = req.user.id;
            const sessions = this.sessionManager.getUserSessions(userId);
            
            // Sanitize session data for response
            const sanitizedSessions = sessions.map(session => ({
                sessionId: session.sessionId,
                createdAt: session.createdAt,
                lastActivity: session.lastActivity,
                expiresAt: session.expiresAt,
                ipAddress: session.ipAddress,
                userAgent: session.userAgent,
                securityLevel: session.securityLevel,
                isCurrent: session.sessionId === req.user.sessionId
            }));
            
            return this.sendResponse(res, 200, {
                sessions: sanitizedSessions,
                totalSessions: sessions.length,
                maxConcurrentSessions: this.sessionManager.maxConcurrentSessions
            });
        } catch (error) {
            console.error('Error getting user sessions:', error);
            return this.sendError(res, 500, 'Failed to load sessions');
        }
    }

    async terminateSession(req, res) {
        try {
            const { sessionId } = req.params;
            const userId = req.user.id;
            
            // Verify user owns the session
            const userSessions = this.sessionManager.getUserSessions(userId);
            const targetSession = userSessions.find(s => s.sessionId === sessionId);
            
            if (!targetSession) {
                return this.sendError(res, 404, 'Session not found');
            }
            
            const success = await this.sessionManager.terminateSession(sessionId, 'USER_TERMINATED');
            
            if (success) {
                return this.sendResponse(res, 200, {
                    message: 'Session terminated successfully',
                    sessionId
                });
            } else {
                return this.sendError(res, 500, 'Failed to terminate session');
            }
        } catch (error) {
            console.error('Error terminating session:', error);
            return this.sendError(res, 500, 'Failed to terminate session');
        }
    }

    async terminateAllSessions(req, res) {
        try {
            const userId = req.user.id;
            const terminatedSessions = await this.sessionManager.terminateAllUserSessions(userId, 'USER_TERMINATED_ALL');
            
            return this.sendResponse(res, 200, {
                message: 'All sessions terminated successfully',
                terminatedCount: terminatedSessions.length
            });
        } catch (error) {
            console.error('Error terminating all sessions:', error);
            return this.sendError(res, 500, 'Failed to terminate all sessions');
        }
    }

    async getSessionStats(req, res) {
        try {
            const stats = this.sessionManager.getSessionStats();
            return this.sendResponse(res, 200, stats);
        } catch (error) {
            console.error('Error getting session stats:', error);
            return this.sendError(res, 500, 'Failed to load session statistics');
        }
    }

    // Compliance endpoints
    async getComplianceCategories(req, res) {
        try {
            const categories = await this.supabaseClient.getComplianceCategories();
            return this.sendResponse(res, 200, categories);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to load compliance categories');
        }
    }

    async getComplianceRequirements(req, res) {
        try {
            const { category } = req.query;
            let requirements = await this.supabaseClient.getComplianceRequirements();
            
            if (category) {
                requirements = requirements.filter(req => req.category_id === category);
            }
            
            return this.sendResponse(res, 200, requirements);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to load compliance requirements');
        }
    }

    async getUserCompliance(req, res) {
        try {
            const userId = req.user.id;
            const compliance = await this.supabaseClient.getUserCompliance(userId);
            return this.sendResponse(res, 200, compliance);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to load user compliance');
        }
    }

    async getComplianceScore(req, res) {
        try {
            const userId = req.user.id;
            const score = await this.supabaseClient.getComplianceScore(userId);
            return this.sendResponse(res, 200, score);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to load compliance score');
        }
    }

    async updateComplianceRequirement(req, res) {
        try {
            const { requirementId, status, notes } = req.body;
            const userId = req.user.id;
            
            const result = await this.supabaseClient.from('user_compliance').upsert({
                user_id: userId,
                requirement_id: requirementId,
                status,
                notes,
                completed_at: status === 'completed' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            }).select().single();
            
            if (result.error) {
                return this.sendError(res, 500, 'Failed to update requirement');
            }
            
            return this.sendResponse(res, 200, result.data);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to update compliance requirement');
        }
    }

    async getComplianceSummary(req, res) {
        try {
            const userId = req.user.id;
            
            // Get all compliance data
            const [categories, requirements, userCompliance, score] = await Promise.all([
                this.supabaseClient.getComplianceCategories(),
                this.supabaseClient.getComplianceRequirements(),
                this.supabaseClient.getUserCompliance(userId),
                this.supabaseClient.getComplianceScore(userId)
            ]);
            
            // Calculate summary
            const summary = {
                overallScore: score.overall_score || 0,
                categoryScores: score.category_scores || {},
                totalRequirements: requirements.length,
                completedRequirements: userCompliance.filter(item => item.status === 'completed').length,
                pendingRequirements: userCompliance.filter(item => item.status !== 'completed').length,
                nextDeadline: this.getNextDeadline(userCompliance),
                categories: categories.map(cat => ({
                    ...cat,
                    completedCount: userCompliance.filter(item => 
                        item.status === 'completed' && 
                        requirements.find(req => req.id === item.requirement_id)?.category_id === cat.id
                    ).length,
                    totalCount: requirements.filter(req => req.category_id === cat.id).length
                }))
            };
            
            return this.sendResponse(res, 200, summary);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to load compliance summary');
        }
    }

    // Risk assessment endpoints
    async getRiskCategories(req, res) {
        try {
            const categories = await this.supabaseClient.getRiskCategories();
            return this.sendResponse(res, 200, categories);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to load risk categories');
        }
    }

    async getRiskAssessments(req, res) {
        try {
            const userId = req.user.id;
            const { category, status } = req.query;
            
            let assessments = await this.supabaseClient.getRiskAssessments(userId);
            
            if (category) {
                assessments = assessments.filter(assessment => assessment.category_id === category);
            }
            
            if (status) {
                assessments = assessments.filter(assessment => assessment.status === status);
            }
            
            return this.sendResponse(res, 200, assessments);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to load risk assessments');
        }
    }

    async createRiskAssessment(req, res) {
        try {
            const { categoryId, title, description, riskFactors } = req.body;
            const userId = req.user.id;
            
            if (!this.riskEngine) {
                return this.sendError(res, 503, 'Risk engine not available');
            }
            
            // Calculate risk score using engine
            const riskResult = await this.riskEngine.calculateRiskScore({
                categoryId,
                title,
                description,
                riskFactors,
                userId
            });
            
            // Save assessment
            const result = await this.supabaseClient.from('risk_assessments').insert({
                user_id: userId,
                category_id: categoryId,
                title,
                description,
                risk_level: riskResult.riskLevel,
                score: riskResult.score,
                mitigation: riskResult.mitigation,
                risk_factors: riskFactors,
                created_at: new Date().toISOString()
            }).select().single();
            
            if (result.error) {
                return this.sendError(res, 500, 'Failed to create risk assessment');
            }
            
            return this.sendResponse(res, 201, result.data);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to create risk assessment');
        }
    }

    async calculateRiskScore(req, res) {
        try {
            const { riskFactors, category } = req.body;
            
            if (!this.riskEngine) {
                return this.sendError(res, 503, 'Risk engine not available');
            }
            
            const result = await this.riskEngine.calculateRiskScore({
                riskFactors,
                category
            });
            
            return this.sendResponse(res, 200, result);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to calculate risk score');
        }
    }

    async getRiskSummary(req, res) {
        try {
            const userId = req.user.id;
            
            // Get all risk data
            const [categories, assessments] = await Promise.all([
                this.supabaseClient.getRiskCategories(),
                this.supabaseClient.getRiskAssessments(userId)
            ]);
            
            // Calculate summary
            const summary = {
                totalAssessments: assessments.length,
                highRiskCount: assessments.filter(a => a.risk_level === 'high').length,
                mediumRiskCount: assessments.filter(a => a.risk_level === 'medium').length,
                lowRiskCount: assessments.filter(a => a.risk_level === 'low').length,
                averageScore: assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length || 0,
                categories: categories.map(cat => ({
                    ...cat,
                    assessmentCount: assessments.filter(a => a.category_id === cat.id).length,
                    averageScore: assessments
                        .filter(a => a.category_id === cat.id)
                        .reduce((sum, a) => sum + a.score, 0) / 
                        assessments.filter(a => a.category_id === cat.id).length || 0
                })),
                recentAssessments: assessments
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 5)
            };
            
            return this.sendResponse(res, 200, summary);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to load risk summary');
        }
    }

    // Document management endpoints
    async getDocuments(req, res) {
        try {
            const userId = req.user.id;
            const { type, status } = req.query;
            
            let documents = await this.supabaseClient.getDocuments(userId);
            
            if (type) {
                documents = documents.filter(doc => doc.type === type);
            }
            
            if (status) {
                documents = documents.filter(doc => doc.status === status);
            }
            
            return this.sendResponse(res, 200, documents);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to load documents');
        }
    }

    async uploadDocument(req, res) {
        try {
            const { title, type, file, description } = req.body;
            const userId = req.user.id;
            
            // Scan for PHI if protection is available
            if (this.phiProtection && file) {
                const phiScan = await this.phiProtection.scanDocument(file);
                if (phiScan.containsPHI && !phiScan.authorized) {
                    return this.sendError(res, 403, 'Document contains unauthorized PHI');
                }
            }
            
            // Upload file (implement file storage logic)
            const fileUrl = await this.uploadFile(file, userId);
            
            // Save document metadata
            const result = await this.supabaseClient.from('documents').insert({
                user_id: userId,
                title,
                type,
                file_url: fileUrl,
                description,
                status: 'active',
                uploaded_at: new Date().toISOString()
            }).select().single();
            
            if (result.error) {
                return this.sendError(res, 500, 'Failed to save document');
            }
            
            return this.sendResponse(res, 201, result.data);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to upload document');
        }
    }

    async scanDocumentForPHI(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            
            if (!this.phiProtection) {
                return this.sendError(res, 503, 'PHI protection not available');
            }
            
            // Get document
            const document = await this.supabaseClient.getDocument(id, userId);
            if (!document) {
                return this.sendError(res, 404, 'Document not found');
            }
            
            // Scan for PHI
            const scanResult = await this.phiProtection.scanDocument(document);
            
            // Update document with scan results
            await this.supabaseClient.from('documents').update({
                phi_scan_result: scanResult,
                last_phi_scan: new Date().toISOString()
            }).eq('id', id);
            
            return this.sendResponse(res, 200, scanResult);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to scan document');
        }
    }

    // Notification endpoints
    async getNotifications(req, res) {
        try {
            const userId = req.user.id;
            const { type, priority, read } = req.query;
            
            let notifications = await this.supabaseClient.getNotifications(userId);
            
            if (type) {
                notifications = notifications.filter(notif => notif.type === type);
            }
            
            if (priority) {
                notifications = notifications.filter(notif => notif.priority === priority);
            }
            
            if (read !== undefined) {
                const isRead = read === 'true';
                notifications = notifications.filter(notif => notif.read === isRead);
            }
            
            return this.sendResponse(res, 200, notifications);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to load notifications');
        }
    }

    async createNotification(req, res) {
        try {
            const { title, message, type, priority } = req.body;
            const userId = req.user.id;
            
            const result = await this.supabaseClient.from('notifications').insert({
                user_id: userId,
                title,
                message,
                type: type || 'info',
                priority: priority || 'medium',
                read: false,
                created_at: new Date().toISOString()
            }).select().single();
            
            if (result.error) {
                return this.sendError(res, 500, 'Failed to create notification');
            }
            
            return this.sendResponse(res, 201, result.data);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to create notification');
        }
    }

    // RBAC endpoints
    async getRoles(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const roles = await this.rbacManager.getRoles(tenantId);
            return this.sendResponse(res, 200, roles);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to load roles');
        }
    }

    async createRole(req, res) {
        try {
            const { name, description, level, permissions } = req.body;
            const tenantId = req.user.tenantId;
            
            const role = await this.rbacManager.createRole({
                name,
                description,
                level,
                permissions,
                tenantId
            });
            
            return this.sendResponse(res, 201, role);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to create role');
        }
    }

    async updateRole(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const tenantId = req.user.tenantId;
            
            const role = await this.rbacManager.updateRole(id, updates, tenantId);
            return this.sendResponse(res, 200, role);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to update role');
        }
    }

    async deleteRole(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            
            await this.rbacManager.deleteRole(id, tenantId);
            return this.sendResponse(res, 200, { message: 'Role deleted successfully' });
        } catch (error) {
            return this.sendError(res, 500, 'Failed to delete role');
        }
    }

    // Tenant management endpoints
    async getTenants(req, res) {
        try {
            const filters = req.query;
            const tenants = await this.tenantManager.getTenants(filters);
            return this.sendResponse(res, 200, tenants);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to load tenants');
        }
    }

    async createTenant(req, res) {
        try {
            const tenantData = req.body;
            const tenant = await this.tenantManager.createTenant(tenantData);
            return this.sendResponse(res, 201, tenant);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to create tenant');
        }
    }

    async updateTenant(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const requestingUserId = req.user.userId;
            
            const tenant = await this.tenantManager.updateTenant(id, updates, requestingUserId);
            return this.sendResponse(res, 200, tenant);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to update tenant');
        }
    }

    async deleteTenant(req, res) {
        try {
            const { id } = req.params;
            const requestingUserId = req.user.userId;
            
            await this.tenantManager.deleteTenant(id, requestingUserId);
            return this.sendResponse(res, 200, { message: 'Tenant deleted successfully' });
        } catch (error) {
            return this.sendError(res, 500, 'Failed to delete tenant');
        }
    }

    async getTenantStats(req, res) {
        try {
            const { id } = req.params;
            const stats = await this.tenantManager.getTenantStats(id);
            return this.sendResponse(res, 200, stats);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to load tenant stats');
        }
    }

    // User management endpoints
    async getUsers(req, res) {
        try {
            const { id: tenantId } = req.user.tenant;
            const filters = req.query;
            
            const users = await this.userProvisioning.getTenantUsers(tenantId, filters);
            return this.sendResponse(res, 200, users);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to load users');
        }
    }

    async createUser(req, res) {
        try {
            const { id: tenantId } = req.user.tenant;
            const userData = req.body;
            const createdBy = req.user.userId;
            
            const user = await this.userProvisioning.createUser(userData, tenantId, [], createdBy);
            return this.sendResponse(res, 201, user);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to create user');
        }
    }

    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const { id: tenantId, userId: requestingUserId } = req.user;
            
            const user = await this.userProvisioning.updateUser(id, tenantId, updates, requestingUserId);
            return this.sendResponse(res, 200, user);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to update user');
        }
    }

    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const { id: tenantId, userId: requestingUserId } = req.user;
            
            await this.userProvisioning.deleteUser(id, tenantId, requestingUserId);
            return this.sendResponse(res, 200, { message: 'User deleted successfully' });
        } catch (error) {
            return this.sendError(res, 500, 'Failed to delete user');
        }
    }

    async assignUserRoles(req, res) {
        try {
            const { id } = req.params;
            const { roleIds } = req.body;
            const { id: tenantId, userId: assignedBy } = req.user;
            
            const assignments = await this.userProvisioning.assignRoles(id, roleIds, tenantId, assignedBy);
            return this.sendResponse(res, 200, assignments);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to assign roles');
        }
    }

    async removeUserRole(req, res) {
        try {
            const { id, roleId } = req.params;
            const { id: tenantId, userId: removedBy } = req.user;
            
            const removals = await this.userProvisioning.removeRoles(id, [roleId], tenantId, removedBy);
            return this.sendResponse(res, 200, removals);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to remove user role');
        }
    }

    async activateUser(req, res) {
        try {
            const { id } = req.params;
            const { id: tenantId, userId: activatedBy } = req.user;
            
            const user = await this.userProvisioning.activateUser(id, tenantId, activatedBy);
            return this.sendResponse(res, 200, user);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to activate user');
        }
    }

    async deactivateUser(req, res) {
        try {
            const { id } = req.params;
            const { id: tenantId, userId: deactivatedBy } = req.user;
            
            const user = await this.userProvisioning.deactivateUser(id, tenantId, deactivatedBy);
            return this.sendResponse(res, 200, user);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to deactivate user');
        }
    }

    // Security and audit endpoints
    async getAuditLogs(req, res) {
        try {
            const { id: tenantId } = req.user.tenant;
            const filters = req.query;
            
            const logs = await this.auditLogger.getAuditLogs(tenantId, filters);
            return this.sendResponse(res, 200, logs);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to load audit logs');
        }
    }

    async getSecurityAlerts(req, res) {
        try {
            const { id: tenantId } = req.user.tenant;
            const filters = req.query;
            
            const alerts = await this.auditLogger.getSecurityAlerts(tenantId, filters);
            return this.sendResponse(res, 200, alerts);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to load security alerts');
        }
    }

    async acknowledgeAlert(req, res) {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const { userId: acknowledgedBy } = req.user;
            
            const alert = await this.auditLogger.acknowledgeAlert(id, acknowledgedBy, notes);
            return this.sendResponse(res, 200, alert);
        } catch (error) {
            return this.sendError(res, 500, 'Failed to acknowledge alert');
        }
    }

    // Compliance Template Endpoints
    async getAvailableTemplates(req, res) {
        try {
            const complianceEngine = new ComplianceTemplateEngine(this.supabaseClient);
            await complianceEngine.initialize();
            
            const templates = await complianceEngine.getAvailableTemplates();
            return this.sendResponse(res, 200, templates);
        } catch (error) {
            console.error('Error getting available templates:', error);
            return this.sendError(res, 500, 'Failed to load templates');
        }
    }

    async getTemplate(req, res) {
        try {
            const { templateId } = req.params;
            const complianceEngine = new ComplianceTemplateEngine(this.supabaseClient);
            await complianceEngine.initialize();
            
            const template = await complianceEngine.loadTemplate(templateId);
            return this.sendResponse(res, 200, template);
        } catch (error) {
            console.error('Error loading template:', error);
            return this.sendError(res, 500, 'Failed to load template');
        }
    }

    async getStateTemplate(req, res) {
        try {
            const { stateCode } = req.params;
            const templateId = `${stateCode.toLowerCase()}-state`;
            
            const complianceEngine = new ComplianceTemplateEngine(this.supabaseClient);
            await complianceEngine.initialize();
            
            const template = await complianceEngine.loadTemplate(templateId);
            return this.sendResponse(res, 200, template);
        } catch (error) {
            console.error('Error loading state template:', error);
            return this.sendError(res, 500, 'Failed to load state template');
        }
    }

    async generateComplianceReport(req, res) {
        try {
            const { templateId } = req.params;
            const { startDate, endDate } = req.query;
            
            const complianceEngine = new ComplianceTemplateEngine(this.supabaseClient);
            await complianceEngine.initialize();
            
            const report = await complianceEngine.generateComplianceReport(templateId, {
                startDate,
                endDate
            });
            
            return this.sendResponse(res, 200, report);
        } catch (error) {
            console.error('Error generating compliance report:', error);
            return this.sendError(res, 500, 'Failed to generate compliance report');
        }
    }

    async getComplianceReport(req, res) {
        try {
            const { templateId } = req.params;
            const { startDate, endDate } = req.query;
            
            // This would retrieve cached or stored reports
            // For now, generate a new report
            const complianceEngine = new ComplianceTemplateEngine(this.supabaseClient);
            await complianceEngine.initialize();
            
            const report = await complianceEngine.generateComplianceReport(templateId, {
                startDate,
                endDate
            });
            
            return this.sendResponse(res, 200, report);
        } catch (error) {
            console.error('Error getting compliance report:', error);
            return this.sendError(res, 500, 'Failed to get compliance report');
        }
    }

    async generateMultiStateReport(req, res) {
        try {
            const { stateCodes, startDate, endDate } = req.body;
            
            const complianceEngine = new ComplianceTemplateEngine(this.supabaseClient);
            await complianceEngine.initialize();
            
            const report = await complianceEngine.generateMultiStateReport(stateCodes, {
                startDate,
                endDate
            });
            
            return this.sendResponse(res, 200, report);
        } catch (error) {
            console.error('Error generating multi-state report:', error);
            return this.sendError(res, 500, 'Failed to generate multi-state report');
        }
    }

    async getMultiStateReports(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            // This would retrieve stored multi-state reports
            // For now, return empty array
            return this.sendResponse(res, 200, []);
        } catch (error) {
            console.error('Error getting multi-state reports:', error);
            return this.sendError(res, 500, 'Failed to get multi-state reports');
        }
    }

    async getStateConfigurations(req, res) {
        try {
            const templateLoader = new StateTemplateLoader();
            const configs = templateLoader.getAllStateConfigs();
            
            return this.sendResponse(res, 200, configs);
        } catch (error) {
            console.error('Error getting state configurations:', error);
            return this.sendError(res, 500, 'Failed to get state configurations');
        }
    }

    async getStateTiers(req, res) {
        try {
            const templateLoader = new StateTemplateLoader();
            const tiers = {
                tier1: templateLoader.getStatesByTier(1),
                tier2: templateLoader.getStatesByTier(2),
                tier3: templateLoader.getStatesByTier(3),
                tier4: templateLoader.getStatesByTier(4)
            };
            
            return this.sendResponse(res, 200, tiers);
        } catch (error) {
            console.error('Error getting state tiers:', error);
            return this.sendError(res, 500, 'Failed to get state tiers');
        }
    }

    // Utility functions
    async validateToken(token) {
        try {
            const { data: { user }, error } = await this.supabaseClient.auth.getUser(token);
            if (error) throw error;
            return user;
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    async generateToken(user) {
        // Generate JWT token (implement proper JWT logic)
        return btoa(JSON.stringify({
            userId: user.id,
            email: user.email,
            exp: Date.now() + (3600 * 1000) // 1 hour
        }));
    }

    sanitizeUser(user) {
        const { id, email, user_metadata } = user;
        return { id, email, name: user_metadata?.name };
    }

    getNextDeadline(complianceItems) {
        const incompleteItems = complianceItems.filter(item => 
            item.status !== 'completed' && item.due_date
        );
        
        if (incompleteItems.length === 0) return null;
        
        return incompleteItems.reduce((earliest, item) => 
            new Date(item.due_date) < new Date(earliest.due_date) ? item : earliest
        );
    }

    sendResponse(res, statusCode, data) {
        return {
            statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-ID'
            },
            body: JSON.stringify({
                success: true,
                data,
                timestamp: new Date().toISOString()
            })
        };
    }

    sendError(res, statusCode, message, details = null) {
        const errorResponse = {
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        };
        
        if (details) {
            errorResponse.details = details;
        }
        
        return {
            statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(errorResponse)
        };
    }

    getAvailableEndpoints() {
        const endpoints = [];
        for (const [key] of this.routes) {
            const [method, path] = key.split(':');
            endpoints.push({ method, path });
        }
        return endpoints;
    }

    setupErrorHandling() {
        // Global error handler
        process.on('unhandledRejection', (error) => {
            console.error('Unhandled promise rejection:', error);
        });
        
        process.on('uncaughtException', (error) => {
            console.error('Uncaught exception:', error);
        });
    }

    // ==========================================
    // NEW TWO-FILE ARCHITECTURE ENDPOINTS
    // ==========================================

    // Get all available states
    async getAllStates(req, res) {
        try {
            const states = [
                { code: 'AL', name: 'Alabama', burden: 1.0 },
                { code: 'AK', name: 'Alaska', burden: 0.0 },
                { code: 'AZ', name: 'Arizona', burden: 1.0 },
                { code: 'AR', name: 'Arkansas', burden: 1.0 },
                { code: 'CA', name: 'California', burden: 1.4 },
                { code: 'CO', name: 'Colorado', burden: 1.0 },
                { code: 'CT', name: 'Connecticut', burden: 1.0 },
                { code: 'DE', name: 'Delaware', burden: 1.0 },
                { code: 'FL', name: 'Florida', burden: 1.2 },
                { code: 'GA', name: 'Georgia', burden: 1.0 },
                { code: 'HI', name: 'Hawaii', burden: 1.0 },
                { code: 'ID', name: 'Idaho', burden: 0.0 },
                { code: 'IL', name: 'Illinois', burden: 1.0 },
                { code: 'IN', name: 'Indiana', burden: 1.0 },
                { code: 'IA', name: 'Iowa', burden: 1.0 },
                { code: 'KS', name: 'Kansas', burden: 1.0 },
                { code: 'KY', name: 'Kentucky', burden: 1.0 },
                { code: 'LA', name: 'Louisiana', burden: 1.0 },
                { code: 'ME', name: 'Maine', burden: 1.0 },
                { code: 'MD', name: 'Maryland', burden: 1.0 },
                { code: 'MA', name: 'Massachusetts', burden: 1.4 },
                { code: 'MI', name: 'Michigan', burden: 1.0 },
                { code: 'MN', name: 'Minnesota', burden: 1.0 },
                { code: 'MS', name: 'Mississippi', burden: 1.0 },
                { code: 'MO', name: 'Missouri', burden: 1.0 },
                { code: 'MT', name: 'Montana', burden: 0.0 },
                { code: 'NE', name: 'Nebraska', burden: 1.0 },
                { code: 'NV', name: 'Nevada', burden: 1.0 },
                { code: 'NH', name: 'New Hampshire', burden: 1.0 },
                { code: 'NJ', name: 'New Jersey', burden: 1.0 },
                { code: 'NM', name: 'New Mexico', burden: 1.0 },
                { code: 'NY', name: 'New York', burden: 1.4 },
                { code: 'NC', name: 'North Carolina', burden: 1.0 },
                { code: 'ND', name: 'North Dakota', burden: 0.0 },
                { code: 'OH', name: 'Ohio', burden: 1.0 },
                { code: 'OK', name: 'Oklahoma', burden: 1.0 },
                { code: 'OR', name: 'Oregon', burden: 1.0 },
                { code: 'PA', name: 'Pennsylvania', burden: 1.0 },
                { code: 'RI', name: 'Rhode Island', burden: 1.0 },
                { code: 'SC', name: 'South Carolina', burden: 1.0 },
                { code: 'SD', name: 'South Dakota', burden: 0.0 },
                { code: 'TN', name: 'Tennessee', burden: 1.0 },
                { code: 'TX', name: 'Texas', burden: 1.3 },
                { code: 'UT', name: 'Utah', burden: 1.0 },
                { code: 'VT', name: 'Vermont', burden: 1.0 },
                { code: 'VA', name: 'Virginia', burden: 1.0 },
                { code: 'WA', name: 'Washington', burden: 1.0 },
                { code: 'WV', name: 'West Virginia', burden: 1.0 },
                { code: 'WI', name: 'Wisconsin', burden: 1.0 },
                { code: 'WY', name: 'Wyoming', burden: 0.0 }
            ];

            return this.sendResponse(res, 200, {
                states,
                count: states.length,
                burdenDistribution: {
                    high: states.filter(s => s.burden >= 1.4).length,
                    mediumHigh: states.filter(s => s.burden >= 1.2 && s.burden < 1.4).length,
                    standard: states.filter(s => s.burden === 1.0).length,
                    minimal: states.filter(s => s.burden === 0.0).length
                }
            });
        } catch (error) {
            console.error('Error getting all states:', error);
            return this.sendError(res, 500, 'Failed to get states');
        }
    }

    // Get specific state details
    async getStateDetails(req, res) {
        try {
            const { stateCode } = req.params;
            const state = (await this.getAllStates(req, { params: { stateCode } })).data.states.find(s => s.code === stateCode.toUpperCase());
            
            if (!state) {
                return this.sendError(res, 404, 'State not found');
            }

            return this.sendResponse(res, 200, state);
        } catch (error) {
            console.error('Error getting state details:', error);
            return this.sendError(res, 500, 'Failed to get state details');
        }
    }

    // Get state regulations from JSON file
    async getStateRegulations(req, res) {
        try {
            const { stateCode } = req.params;
            const response = await fetch(`/states/${stateCode.toLowerCase()}-regulations.json`);
            
            if (!response.ok) {
                return this.sendError(res, 404, 'State regulations not found');
            }
            
            const regulations = await response.json();
            return this.sendResponse(res, 200, regulations);
        } catch (error) {
            console.error('Error getting state regulations:', error);
            return this.sendError(res, 500, 'Failed to get state regulations');
        }
    }

    // Get state compliance manager and validate
    async getStateCompliance(req, res) {
        try {
            const { stateCode } = req.params;
            const { complianceData } = req.body;
            
            // Dynamic import of state compliance manager
            const stateClassName = `${stateCode.charAt(0).toUpperCase() + stateCode.slice(1).toLowerCase()}ComplianceManager`;
            const StateComplianceManager = window[stateClassName];
            
            if (!StateComplianceManager) {
                return this.sendError(res, 404, 'State compliance manager not found');
            }
            
            const complianceManager = new StateComplianceManager(this.supabaseClient, req.user?.tenantId || 'default');
            const validationMethod = `validate${stateClassName}`;
            const result = await complianceManager[validationMethod](complianceData);
            
            return this.sendResponse(res, 200, result);
        } catch (error) {
            console.error('Error getting state compliance:', error);
            return this.sendError(res, 500, 'Failed to get state compliance');
        }
    }

    // Validate state compliance
    async validateStateCompliance(req, res) {
        try {
            const { stateCode } = req.params;
            const { complianceData } = req.body;
            
            const stateClassName = `${stateCode.charAt(0).toUpperCase() + stateCode.slice(1).toLowerCase()}ComplianceManager`;
            const StateComplianceManager = window[stateClassName];
            
            if (!StateComplianceManager) {
                return this.sendError(res, 404, 'State compliance manager not found');
            }
            
            const complianceManager = new StateComplianceManager(this.supabaseClient, req.user?.tenantId || 'default');
            const validationMethod = `validate${stateClassName}`;
            const result = await complianceManager[validationMethod](complianceData);
            
            return this.sendResponse(res, 200, result);
        } catch (error) {
            console.error('Error validating state compliance:', error);
            return this.sendError(res, 500, 'Failed to validate state compliance');
        }
    }

    // Generate state compliance report
    async generateStateReport(req, res) {
        try {
            const { stateCode } = req.params;
            const { startDate, endDate } = req.query;
            
            const stateClassName = `${stateCode.charAt(0).toUpperCase() + stateCode.slice(1).toLowerCase()}ComplianceManager`;
            const StateComplianceManager = window[stateClassName];
            
            if (!StateComplianceManager) {
                return this.sendError(res, 404, 'State compliance manager not found');
            }
            
            const complianceManager = new StateComplianceManager(this.supabaseClient, req.user?.tenantId || 'default');
            const reportMethod = `generate${stateClassName}Report`;
            const report = await complianceManager[reportMethod]();
            
            return this.sendResponse(res, 200, report);
        } catch (error) {
            console.error('Error generating state report:', error);
            return this.sendError(res, 500, 'Failed to generate state report');
        }
    }

    // Compare multiple states
    async compareStates(req, res) {
        try {
            const { stateCodes, complianceData } = req.body;
            
            if (!stateCodes || !Array.isArray(stateCodes)) {
                return this.sendError(res, 400, 'State codes array required');
            }
            
            const comparisons = [];
            
            for (const stateCode of stateCodes) {
                const stateClassName = `${stateCode.charAt(0).toUpperCase() + stateCode.slice(1).toLowerCase()}ComplianceManager`;
                const StateComplianceManager = window[stateClassName];
                
                if (StateComplianceManager) {
                    const complianceManager = new StateComplianceManager(this.supabaseClient, req.user?.tenantId || 'default');
                    const validationMethod = `validate${stateClassName}`;
                    const result = await complianceManager[validationMethod](complianceData);
                    
                    comparisons.push({
                        stateCode,
                        stateName: complianceManager.stateName,
                        regulatoryBurden: complianceManager.regulatoryBurden,
                        score: result.score,
                        compliant: result.compliant,
                        issues: result.issues,
                        warnings: result.warnings
                    });
                }
            }
            
            // Sort by compliance score
            comparisons.sort((a, b) => b.score - a.score);
            
            return this.sendResponse(res, 200, {
                comparisons,
                summary: {
                    totalStates: comparisons.length,
                    averageScore: comparisons.reduce((sum, c) => sum + c.score, 0) / comparisons.length,
                    topPerforming: comparisons[0],
                    lowestPerforming: comparisons[comparisons.length - 1]
                }
            });
        } catch (error) {
            console.error('Error comparing states:', error);
            return this.sendError(res, 500, 'Failed to compare states');
        }
    }

    // Get states analytics
    async getStatesAnalytics(req, res) {
        try {
            const states = (await this.getAllStates(req, { params: {} })).data.states;
            
            const analytics = {
                regulatoryBurdenDistribution: {
                    high: states.filter(s => s.burden >= 1.4).length,
                    mediumHigh: states.filter(s => s.burden >= 1.2 && s.burden < 1.4).length,
                    standard: states.filter(s => s.burden === 1.0).length,
                    minimal: states.filter(s => s.burden === 0.0).length
                },
                totalStates: states.length,
                averageBurden: states.reduce((sum, s) => sum + s.burden, 0) / states.length,
                highBurdenStates: states.filter(s => s.burden >= 1.4).map(s => s.code),
                minimalBurdenStates: states.filter(s => s.burden === 0.0).map(s => s.code)
            };
            
            return this.sendResponse(res, 200, analytics);
        } catch (error) {
            console.error('Error getting states analytics:', error);
            return this.sendError(res, 500, 'Failed to get states analytics');
        }
    }

    // Update state regulations
    async updateStateRegulations(req, res) {
        try {
            const { stateCode } = req.params;
            const { regulations } = req.body;
            
            // This would update the JSON file
            // For now, return success response
            return this.sendResponse(res, 200, {
                message: 'State regulations updated successfully',
                stateCode,
                lastUpdated: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error updating state regulations:', error);
            return this.sendError(res, 500, 'Failed to update state regulations');
        }
    }

    // Get regulatory burden analysis
    async getRegulatoryBurdenAnalysis(req, res) {
        try {
            const states = (await this.getAllStates(req, { params: {} })).data.states;
            
            const analysis = {
                distribution: {
                    minimal: states.filter(s => s.burden === 0.0).map(s => ({ code: s.code, name: s.name })),
                    standard: states.filter(s => s.burden === 1.0).map(s => ({ code: s.code, name: s.name })),
                    mediumHigh: states.filter(s => s.burden >= 1.2 && s.burden < 1.4).map(s => ({ code: s.code, name: s.name })),
                    high: states.filter(s => s.burden >= 1.4).map(s => ({ code: s.code, name: s.name }))
                },
                statistics: {
                    totalStates: states.length,
                    averageBurden: states.reduce((sum, s) => sum + s.burden, 0) / states.length,
                    medianBurden: this.calculateMedian(states.map(s => s.burden)),
                    complexityScore: states.reduce((sum, s) => sum + s.burden, 0)
                },
                recommendations: [
                    'Focus compliance efforts on high-burden states first',
                    'Standardize compliance processes across similar burden levels',
                    'Implement automated monitoring for regulatory changes'
                ]
            };
            
            return this.sendResponse(res, 200, analysis);
        } catch (error) {
            console.error('Error getting regulatory burden analysis:', error);
            return this.sendError(res, 500, 'Failed to get regulatory burden analysis');
        }
    }

    // Helper method to calculate median
    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
}

// Export for use in backend
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrustMDAPIServer;
} else {
    window.TrustMDAPIServer = TrustMDAPIServer;
}
