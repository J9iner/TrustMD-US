// TrustMD Audit Logger - Comprehensive Security Audit System
// Provides detailed logging, monitoring, and security event detection

// Load dependencies
if (typeof require !== 'undefined') {
    const { errorHandler } = require('./error-handler.js');
    const { encryptionService } = require('./encryption-service.js');
    global.errorHandler = errorHandler;
    global.encryptionService = encryptionService;
} else {
    console.log('Loading dependencies for audit logger...');
}

class AuditLogger {
    constructor(supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.securityEventHandlers = new Map();
        this.alertQueue = [];
        this.batchSize = 100;
        this.batchTimeout = 5000; // 5 seconds
        this.pendingLogs = [];
        this.batchTimer = null;
        this.encryptionEnabled = true;
        this.logRetentionDays = 90; // 90 days retention
        this.maxLogSize = 10000; // Maximum logs before rotation
        
        this.initializeSecurityHandlers();
    }

    // Initialize security event handlers
    initializeSecurityHandlers() {
        this.securityEventHandlers.set('user:delete', this.handleUserDeletion.bind(this));
        this.securityEventHandlers.set('role:create', this.handleRoleCreation.bind(this));
        this.securityEventHandlers.set('permission:assign', this.handlePermissionAssignment.bind(this));
        this.securityEventHandlers.set('tenant:delete', this.handleTenantDeletion.bind(this));
        this.securityEventHandlers.set('system:config', this.handleSystemConfigChange.bind(this));
        this.securityEventHandlers.set('login_failed', this.handleFailedLogin.bind(this));
        this.securityEventHandlers.set('suspicious_activity', this.handleSuspiciousActivity.bind(this));
    }

    // Comprehensive audit logging with encryption
    async logAuditEvent(eventData) {
        try {
            const {
                userId,
                tenantId,
                action,
                resource,
                resourceId,
                details,
                ipAddress,
                userAgent,
                severity = 'info',
                category = 'general',
                timestamp = new Date().toISOString()
            } = eventData;

            // Validate required fields
            if (!action || !tenantId) {
                throw new Error('Action and tenantId are required');
            }

            // Encrypt ALL data (TrustMD is a compliance logbook)
            const encryptedDetails = this.encryptionEnabled 
                ? await encryptionService.encrypt(details)
                : details;

            const auditLog = {
                user_id: userId || null,
                tenant_id: tenantId,
                action,
                resource,
                resource_id: resourceId || null,
                details: encryptedDetails,
                ip_address: ipAddress || this.getClientIP(),
                user_agent: userAgent || navigator.userAgent,
                severity,
                category,
                timestamp,
                encrypted: this.encryptionEnabled
            };

            // Add to batch for performance
            this.pendingLogs.push(auditLog);

            // Process batch if full
            if (this.pendingLogs.length >= this.batchSize) {
                await this.processBatch();
            } else if (!this.batchTimer) {
                // Set timer to process batch
                this.batchTimer = setTimeout(() => {
                    this.processBatch();
                }, this.batchTimeout);
            }

            return auditLog;
        } catch (error) {
            errorHandler.logError(
                errorHandler.errorTypes.SYSTEM,
                'Audit logging failed',
                { action, tenantId, operation: 'log_audit_event' },
                error
            );
            throw error;
        }
    }
    
    // Process batch of logs
    async processBatch() {
        if (this.pendingLogs.length === 0) return;

        try {
            // Add integrity hash to each log
            const logsWithIntegrity = await Promise.all(
                this.pendingLogs.map(async (log) => ({
                    ...log,
                    integrity_hash: await encryptionService.generateHash(log)
                }))
            );

            // Insert batch
            const { data, error } = await this.supabaseClient
                .from('audit_logs')
                .insert(logsWithIntegrity);

            if (error) {
                errorHandler.logError(
                    errorHandler.errorTypes.DATABASE,
                    'Failed to insert audit log batch',
                    { 
                        batchSize: this.pendingLogs.length,
                        operation: 'batch_insert_logs',
                        error: error.message 
                    },
                    error
                );
            } else {
                console.log(`Processed audit log batch: ${this.pendingLogs.length} logs`);
            }

            // Clear batch
            this.pendingLogs = [];
            this.batchTimer = null;

        } catch (error) {
            errorHandler.logError(
                errorHandler.errorTypes.DATABASE,
                'Batch processing failed',
                { batchSize: this.pendingLogs.length, operation: 'process_batch' },
                error
            );
        }
    }
    
    // Log rotation to prevent unlimited growth
    async rotateLogs() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.logRetentionDays);

            // Get count of logs to be deleted
            const { count, error: countError } = await this.supabaseClient
                .from('audit_logs')
                .select('id', { count: 'exact' })
                .lt('created_at', cutoffDate.toISOString());

            if (countError) {
                errorHandler.logError(
                    errorHandler.errorTypes.DATABASE,
                    'Failed to count logs for rotation',
                    { operation: 'count_logs_for_rotation' },
                    countError
                );
                return;
            }

            // Delete old logs
            const { error: deleteError } = await this.supabaseClient
                .from('audit_logs')
                .delete()
                .lt('created_at', cutoffDate.toISOString());

            if (deleteError) {
                errorHandler.logError(
                    errorHandler.errorTypes.DATABASE,
                    'Failed to rotate audit logs',
                    { 
                        cutoffDate: cutoffDate.toISOString(),
                        deletedCount: count,
                        operation: 'rotate_logs' 
                    },
                    deleteError
                );
            } else {
                console.log(`Rotated audit logs: deleted ${count} logs older than ${this.logRetentionDays} days`);
            }

        } catch (error) {
            errorHandler.logError(
                errorHandler.errorTypes.SYSTEM,
                'Log rotation failed',
                { operation: 'rotate_logs', retentionDays: this.logRetentionDays },
                error
            );
        }
    }
    
    // Verify log integrity
    async verifyLogIntegrity(logId) {
        try {
            const { data, error } = await this.supabaseClient
                .from('audit_logs')
                .select('integrity_hash, details')
                .eq('id', logId)
                .single();

            if (error || !data) {
                return false;
            }

            // Verify hash matches
            const isValid = await encryptionService.verifyHash(data.details, data.integrity_hash);
            
            if (!isValid) {
                errorHandler.logError(
                    errorHandler.errorTypes.SYSTEM,
                    'Log integrity verification failed',
                    { logId, operation: 'verify_integrity' },
                    new Error('Log integrity check failed')
                );
            }

            return isValid;
        } catch (error) {
            errorHandler.logError(
                errorHandler.errorTypes.SYSTEM,
                'Log integrity verification error',
                { logId, operation: 'verify_integrity' },
                error
            );
            return false;
        }
    }

    // Get client IP address
    getClientIP() {
        // In a real implementation, this would get the actual client IP
        // For now, return a placeholder
        return 'client_ip_unknown';
    }

    // Sanitize sensitive details
    sanitizeDetails(details) {
        if (!details || typeof details !== 'object') {
            return details;
        }
        
        // Remove or mask sensitive information
        const sanitized = { ...details };
        const sensitiveFields = ['password', 'ssn', 'credit_card', 'api_key'];
        
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '***REDACTED***';
            }
        }
        
        return sanitized;
    }

    // Start automatic log rotation (run daily)
    startLogRotation() {
        // Run rotation every 24 hours
        setInterval(async () => {
            await this.rotateLogs();
        }, 24 * 60 * 60 * 1000);
        
        console.log('Automatic log rotation started');
    }

    // Initialize audit logger with security features
    async initialize() {
        try {
            // Start log rotation
            this.startLogRotation();
            
            // Process any pending logs
            if (this.pendingLogs.length > 0) {
                await this.processBatch();
            }
            
            console.log('Audit logger initialized with encryption and rotation');
            return true;
        } catch (error) {
            errorHandler.logError(
                errorHandler.errorTypes.SYSTEM,
                'Audit logger initialization failed',
                { operation: 'initialize_audit_logger' },
                error
            );
            throw error;
        }
    }

    // Batch processing for performance
    async processBatch() {
        if (this.pendingLogs.length === 0) return;

        try {
            const logsToProcess = [...this.pendingLogs];
            this.pendingLogs = [];

            const result = await this.supabaseClient.from('audit_logs')
                .insert(logsToProcess)
                .select();

            if (result.error) {
                console.error('Failed to insert audit batch:', result.error);
                // Re-add failed logs to pending
                this.pendingLogs.unshift(...logsToProcess);
            } else {
                console.log(`Audit batch processed: ${logsToProcess.length} logs`);
            }

            // Clear batch timer
            if (this.batchTimer) {
                clearTimeout(this.batchTimer);
                this.batchTimer = null;
            }
        } catch (error) {
            console.error('Error processing audit batch:', error);
        }
    }

    // Security event monitoring
    async checkSecurityEvents(auditLog) {
        try {
            const handler = this.securityEventHandlers.get(auditLog.action);
            if (handler) {
                await handler(auditLog);
            }

            // General security checks
            await this.performGeneralSecurityChecks(auditLog);
        } catch (error) {
            console.error('Error checking security events:', error);
        }
    }

    // Specific security event handlers
    async handleUserDeletion(auditLog) {
        try {
            // Check for mass user deletion
            const recentDeletions = await this.getRecentEvents(
                auditLog.tenant_id,
                'user:delete',
                60 // minutes
            );

            if (recentDeletions.length >= 5) {
                await this.triggerSecurityAlert({
                    type: 'mass_user_deletion',
                    severity: 'high',
                    tenantId: auditLog.tenant_id,
                    details: {
                        count: recentDeletions.length,
                        timeWindow: '60 minutes',
                        users: recentDeletions.map(d => d.details?.userId)
                    }
                });
            }

            // Check for self-deletion (if user deletes their own account)
            if (auditLog.user_id === auditLog.details?.deletedUserId) {
                await this.triggerSecurityAlert({
                    type: 'self_user_deletion',
                    severity: 'medium',
                    tenantId: auditLog.tenant_id,
                    userId: auditLog.user_id,
                    details: {
                        action: 'User deleted their own account',
                        recommendation: 'Review user access policies'
                    }
                });
            }
        } catch (error) {
            console.error('Error handling user deletion security check:', error);
        }
    }

    async handleRoleCreation(auditLog) {
        try {
            // Check for privileged role creation
            const privilegedRoles = ['super_admin', 'tenant_admin'];
            const createdRole = auditLog.details?.roleName?.toLowerCase();

            if (privilegedRoles.includes(createdRole)) {
                await this.triggerSecurityAlert({
                    type: 'privileged_role_creation',
                    severity: 'high',
                    tenantId: auditLog.tenant_id,
                    userId: auditLog.user_id,
                    details: {
                        role: createdRole,
                        action: 'Privileged role created',
                        recommendation: 'Verify authorization and necessity'
                    }
                });
            }

            // Check for role escalation
            const userRoles = await this.getUserRoles(auditLog.user_id, auditLog.tenant_id);
            const maxUserLevel = Math.max(...userRoles.map(r => r.level || 0));
            const newRoleLevel = auditLog.details?.roleLevel || 0;

            if (newRoleLevel > maxUserLevel) {
                await this.triggerSecurityAlert({
                    type: 'role_escalation',
                    severity: 'high',
                    tenantId: auditLog.tenant_id,
                    userId: auditLog.user_id,
                    details: {
                        fromLevel: maxUserLevel,
                        toLevel: newRoleLevel,
                        action: 'User created role with higher privilege than their own'
                    }
                });
            }
        } catch (error) {
            console.error('Error handling role creation security check:', error);
        }
    }

    async handlePermissionAssignment(auditLog) {
        try {
            // Check for sensitive permission assignment
            const sensitivePermissions = [
                'user:delete',
                'tenant:delete',
                'system:config',
                'role:delete',
                'system:backup'
            ];

            const assignedPermissions = auditLog.details?.permissions || [];
            const hasSensitivePermission = assignedPermissions.some(p => 
                sensitivePermissions.includes(p)
            );

            if (hasSensitivePermission) {
                await this.triggerSecurityAlert({
                    type: 'sensitive_permission_assignment',
                    severity: 'medium',
                    tenantId: auditLog.tenant_id,
                    userId: auditLog.user_id,
                    details: {
                        permissions: assignedPermissions.filter(p => sensitivePermissions.includes(p)),
                        action: 'Sensitive permissions assigned',
                        recommendation: 'Review assignment justification'
                    }
                });
            }
        } catch (error) {
            console.error('Error handling permission assignment security check:', error);
        }
    }

    async handleTenantDeletion(auditLog) {
        try {
            // Tenant deletion is always critical
            await this.triggerSecurityAlert({
                type: 'tenant_deletion',
                severity: 'critical',
                tenantId: auditLog.tenant_id,
                userId: auditLog.user_id,
                details: {
                    action: 'Tenant deleted',
                    impact: 'All tenant data and users affected',
                    recommendation: 'Verify deletion authorization and data backup'
                }
            });

            // Log for compliance review
            await this.logComplianceEvent({
                tenantId: auditLog.tenant_id,
                event: 'tenant_deletion',
                severity: 'critical',
                details: {
                    deletedBy: auditLog.user_id,
                    timestamp: auditLog.timestamp,
                    requiresReview: true
                }
            });
        } catch (error) {
            console.error('Error handling tenant deletion security check:', error);
        }
    }

    async handleSystemConfigChange(auditLog) {
        try {
            const sensitiveConfigs = [
                'jwt_secret',
                'database_url',
                'encryption_keys',
                'backup_settings',
                'audit_settings'
            ];

            const changedConfig = auditLog.details?.configKey;
            const isSensitive = sensitiveConfigs.includes(changedConfig);

            if (isSensitive) {
                await this.triggerSecurityAlert({
                    type: 'sensitive_config_change',
                    severity: 'high',
                    tenantId: auditLog.tenant_id,
                    userId: auditLog.user_id,
                    details: {
                        config: changedConfig,
                        action: 'Sensitive system configuration changed',
                        recommendation: 'Verify change necessity and authorization'
                    }
                });
            }
        } catch (error) {
            console.error('Error handling system config security check:', error);
        }
    }

    async handleFailedLogin(auditLog) {
        try {
            // Check for brute force attack
            const recentFailures = await this.getRecentEvents(
                auditLog.details?.email || auditLog.ip_address,
                'login_failed',
                15 // minutes
            );

            if (recentFailures.length >= 5) {
                await this.triggerSecurityAlert({
                    type: 'brute_force_attack',
                    severity: 'high',
                    tenantId: auditLog.tenant_id,
                    details: {
                        email: auditLog.details?.email,
                        ipAddress: auditLog.ip_address,
                        attempts: recentFailures.length,
                        timeWindow: '15 minutes',
                        action: 'Multiple failed login attempts detected'
                    }
                });

                // Suggest temporary account lock
                await this.suggestAccountLock(auditLog.details?.email, auditLog.tenant_id);
            }

            // Check for credential stuffing
            const uniqueIPs = new Set(recentFailures.map(f => f.ip_address));
            const uniqueEmails = new Set(recentFailures.map(f => f.details?.email));

            if (uniqueIPs.size >= 3 || uniqueEmails.size >= 3) {
                await this.triggerSecurityAlert({
                    type: 'credential_stuffing',
                    severity: 'high',
                    tenantId: auditLog.tenant_id,
                    details: {
                        uniqueIPs: uniqueIPs.size,
                        uniqueEmails: uniqueEmails.size,
                        action: 'Credential stuffing attack detected'
                    }
                });
            }
        } catch (error) {
            console.error('Error handling failed login security check:', error);
        }
    }

    async handleSuspiciousActivity(auditLog) {
        try {
            // Already handled by detection logic, just log severity
            await this.triggerSecurityAlert({
                type: 'suspicious_activity',
                severity: auditLog.details?.severity || 'medium',
                tenantId: auditLog.tenant_id,
                userId: auditLog.user_id,
                details: auditLog.details
            });
        } catch (error) {
            console.error('Error handling suspicious activity security check:', error);
        }
    }

    // General security checks
    async performGeneralSecurityChecks(auditLog) {
        try {
            // Check for unusual access patterns
            await this.checkUnusualAccessPatterns(auditLog);
            
            // Check for privilege escalation
            await this.checkPrivilegeEscalation(auditLog);
            
            // Check for data access anomalies
            await this.checkDataAccessAnomalies(auditLog);
        } catch (error) {
            console.error('Error in general security checks:', error);
        }
    }

    async checkUnusualAccessPatterns(auditLog) {
        try {
            // Get user's recent activity
            const recentActivity = await this.getRecentEvents(
                auditLog.user_id,
                null, // all actions
                24 * 60 // 24 hours
            );

            // Check for unusual time patterns
            const hour = new Date().getHours();
            const userHourlyActivity = this.analyzeTimePatterns(recentActivity);
            
            if (userHourlyActivity[hour] === 0 && hour >= 22 || hour <= 5) {
                await this.triggerSecurityAlert({
                    type: 'unusual_access_time',
                    severity: 'low',
                    tenantId: auditLog.tenant_id,
                    userId: auditLog.user_id,
                    details: {
                        hour,
                        usualActivity: userHourlyActivity,
                        action: 'Access during unusual hours'
                    }
                });
            }
        } catch (error) {
            console.error('Error checking unusual access patterns:', error);
        }
    }

    async checkPrivilegeEscalation(auditLog) {
        try {
            // Get user's current permissions
            const userPermissions = await this.getUserPermissions(
                auditLog.user_id,
                auditLog.tenant_id
            );

            // Check if action requires higher privileges
            const requiredPermissions = this.getRequiredPermissions(auditLog.action);
            const hasRequiredPermissions = requiredPermissions.every(p => 
                userPermissions.includes(p)
            );

            if (!hasRequiredPermissions && requiredPermissions.length > 0) {
                await this.triggerSecurityAlert({
                    type: 'privilege_escalation',
                    severity: 'high',
                    tenantId: auditLog.tenant_id,
                    userId: auditLog.user_id,
                    details: {
                        action: auditLog.action,
                        requiredPermissions,
                        userPermissions,
                        action: 'User performed action without required permissions'
                    }
                });
            }
        } catch (error) {
            console.error('Error checking privilege escalation:', error);
        }
    }

    async checkDataAccessAnomalies(auditLog) {
        try {
            // Check for unusual data access patterns
            const dataAccessEvents = await this.getRecentEvents(
                auditLog.user_id,
                null,
                24 * 60,
                ['compliance:read', 'risk:read', 'document:read']
            );

            // Analyze access patterns
            const accessPattern = this.analyzeDataAccessPatterns(dataAccessEvents);
            
            if (accessPattern.unusual) {
                await this.triggerSecurityAlert({
                    type: 'unusual_data_access',
                    severity: 'medium',
                    tenantId: auditLog.tenant_id,
                    userId: auditLog.user_id,
                    details: accessPattern
                });
            }
        } catch (error) {
            console.error('Error checking data access anomalies:', error);
        }
    }

    // Alert system
    async triggerSecurityAlert(alertData) {
        try {
            const alert = {
                ...alertData,
                id: this.generateAlertId(),
                status: 'active',
                created_at: new Date().toISOString(),
                acknowledged: false,
                acknowledged_by: null,
                acknowledged_at: null
            };

            // Add to alert queue
            this.alertQueue.push(alert);

            // Process alerts immediately for high severity
            if (alertData.severity === 'critical' || alertData.severity === 'high') {
                await this.processAlerts();
            } else {
                // Schedule batch processing for lower severity
                if (!this.batchTimer) {
                    this.batchTimer = setTimeout(() => {
                        this.processAlerts();
                    }, 1000);
                }
            }

            console.log(`Security alert triggered: ${alertData.type}`, alert);
        } catch (error) {
            console.error('Error triggering security alert:', error);
        }
    }

    async processAlerts() {
        if (this.alertQueue.length === 0) return;

        try {
            const alertsToProcess = [...this.alertQueue];
            this.alertQueue = [];

            const result = await this.supabaseClient.from('security_alerts')
                .insert(alertsToProcess)
                .select();

            if (result.error) {
                console.error('Failed to insert security alerts:', result.error);
                // Re-add failed alerts
                this.alertQueue.unshift(...alertsToProcess);
            } else {
                console.log(`Security alerts processed: ${alertsToProcess.length}`);
            }

            // Send notifications for critical alerts
            for (const alert of alertsToProcess) {
                if (alert.severity === 'critical' || alert.severity === 'high') {
                    await this.sendSecurityNotification(alert);
                }
            }
        } catch (error) {
            console.error('Error processing security alerts:', error);
        }
    }

    async sendSecurityNotification(alert) {
        try {
            // Create notification for security team
            const notification = {
                tenant_id: alert.tenantId,
                title: `Security Alert: ${alert.type}`,
                message: this.formatSecurityAlertMessage(alert),
                type: 'security_alert',
                priority: alert.severity,
                read: false,
                metadata: {
                    alertId: alert.id,
                    type: alert.type,
                    severity: alert.severity
                },
                created_at: new Date().toISOString()
            };

            await this.supabaseClient.from('notifications').insert(notification);
        } catch (error) {
            console.error('Error sending security notification:', error);
        }
    }

    formatSecurityAlertMessage(alert) {
        const messages = {
            mass_user_deletion: `Mass user deletion detected: ${alert.details.count} users deleted in ${alert.details.timeWindow}`,
            privileged_role_creation: `Privileged role created: ${alert.details.role}`,
            role_escalation: `Role escalation detected: User created role with higher privileges`,
            sensitive_permission_assignment: `Sensitive permissions assigned: ${alert.details.permissions.join(', ')}`,
            tenant_deletion: `Tenant deletion detected by ${alert.details.deletedBy}`,
            brute_force_attack: `Brute force attack detected: ${alert.details.attempts} failed attempts from ${alert.details.ipAddress}`,
            credential_stuffing: `Credential stuffing attack detected: ${alert.details.uniqueIPs} IPs, ${alert.details.uniqueEmails} emails`,
            suspicious_activity: `Suspicious activity detected: ${alert.details.reason}`,
            unusual_access_time: `Unusual access time: User accessed at ${alert.details.hour}:00`,
            privilege_escalation: `Privilege escalation detected: User performed ${alert.details.action} without required permissions`,
            unusual_data_access: `Unusual data access pattern detected`
        };

        return messages[alert.type] || `Security alert: ${alert.type}`;
    }

    // Utility methods
    async getRecentEvents(identifier, action, minutes, resourceTypes = null) {
        try {
            let query = this.supabaseClient.from('audit_logs')
                .select('*')
                .gte('timestamp', new Date(Date.now() - minutes * 60 * 1000).toISOString());

            if (typeof identifier === 'string' && identifier.includes('@')) {
                // Email identifier
                query = query.eq('details->>email', identifier);
            } else if (typeof identifier === 'string' && identifier.includes('.')) {
                // IP address identifier
                query = query.eq('ip_address', identifier);
            } else {
                // User ID identifier
                query = query.eq('user_id', identifier);
            }

            if (action) {
                query = query.eq('action', action);
            }

            if (resourceTypes) {
                query = query.in('action', resourceTypes);
            }

            const result = await query.order('timestamp', { ascending: false });
            return result.data || [];
        } catch (error) {
            console.error('Error getting recent events:', error);
            return [];
        }
    }

    async getUserRoles(userId, tenantId) {
        try {
            const userRoles = await this.supabaseClient.from('user_roles')
                .select(`
                    role_id,
                    roles!inner(
                        id,
                        name,
                        level,
                        permissions
                    )
                `)
                .eq('user_id', userId)
                .eq('tenant_id', tenantId);

            return userRoles.data || [];
        } catch (error) {
            console.error('Error getting user roles:', error);
            return [];
        }
    }

    async getUserPermissions(userId, tenantId) {
        try {
            const userRoles = await this.getUserRoles(userId, tenantId);
            const permissions = new Set();

            for (const userRole of userRoles) {
                if (userRole.roles && userRole.roles.permissions) {
                    userRole.roles.permissions.forEach(permission => {
                        permissions.add(permission);
                    });
                }
            }

            return Array.from(permissions);
        } catch (error) {
            console.error('Error getting user permissions:', error);
            return [];
        }
    }

    getRequiredPermissions(action) {
        const permissionMap = {
            'user:delete': ['user:delete'],
            'tenant:delete': ['tenant:delete'],
            'system:config': ['system:config'],
            'role:create': ['role:create'],
            'role:delete': ['role:delete'],
            'system:backup': ['system:backup']
        };

        return permissionMap[action] || [];
    }

    analyzeTimePatterns(events) {
        const hourlyActivity = new Array(24).fill(0);
        
        events.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            hourlyActivity[hour]++;
        });

        return hourlyActivity;
    }

    analyzeDataAccessPatterns(events) {
        if (events.length === 0) return { unusual: false };

        // Check for unusual volume
        const avgAccessPerHour = events.length / 24;
        const hourlyAccess = new Array(24).fill(0);
        
        events.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            hourlyAccess[hour]++;
        });

        // Find unusual spikes
        const maxHourlyAccess = Math.max(...hourlyAccess);
        const unusual = maxHourlyAccess > avgAccessPerHour * 3;

        return {
            unusual,
            hourlyAccess,
            avgAccessPerHour,
            maxHourlyAccess,
            spikeHours: hourlyAccess
                .map((count, hour) => ({ hour, count }))
                .filter(item => item.count > avgAccessPerHour * 3)
        };
    }

    async suggestAccountLock(email, tenantId) {
        try {
            // Create account lock suggestion
            await this.supabaseClient.from('account_locks').insert({
                tenant_id: tenantId,
                email,
                reason: 'brute_force_protection',
                locked_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
                auto_unlock: true
            });
        } catch (error) {
            console.error('Error suggesting account lock:', error);
        }
    }

    async logComplianceEvent(eventData) {
        try {
            const complianceLog = {
                ...eventData,
                category: 'compliance',
                timestamp: new Date().toISOString()
            };

            await this.supabaseClient.from('compliance_logs').insert(complianceLog);
        } catch (error) {
            console.error('Error logging compliance event:', error);
        }
    }

    sanitizeDetails(details) {
        if (!details) return null;

        // Remove sensitive information from logs
        const sanitized = { ...details };
        delete sanitized.password;
        delete sanitized.token;
        delete sanitized.secret;
        delete sanitized.personalInfo;

        return sanitized;
    }

    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getClientIP() {
        // In production, get from request headers
        return '127.0.0.1'; // Placeholder
    }

    // Query methods for audit logs
    async getAuditLogs(tenantId, filters = {}) {
        try {
            let query = this.supabaseClient.from('audit_logs')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('timestamp', { ascending: false });

            if (filters.userId) {
                query = query.eq('user_id', filters.userId);
            }
            if (filters.action) {
                query = query.eq('action', filters.action);
            }
            if (filters.resource) {
                query = query.eq('resource', filters.resource);
            }
            if (filters.startDate) {
                query = query.gte('timestamp', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('timestamp', filters.endDate);
            }
            if (filters.severity) {
                query = query.eq('severity', filters.severity);
            }
            if (filters.category) {
                query = query.eq('category', filters.category);
            }

            const result = await query;
            return result.data || [];
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            throw error;
        }
    }

    async getSecurityAlerts(tenantId, filters = {}) {
        try {
            let query = this.supabaseClient.from('security_alerts')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.severity) {
                query = query.eq('severity', filters.severity);
            }
            if (filters.type) {
                query = query.eq('type', filters.type);
            }
            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }

            const result = await query;
            return result.data || [];
        } catch (error) {
            console.error('Error fetching security alerts:', error);
            throw error;
        }
    }

    async acknowledgeAlert(alertId, acknowledgedBy, notes = '') {
        try {
            const result = await this.supabaseClient.from('security_alerts')
                .update({
                    status: 'acknowledged',
                    acknowledged_by: acknowledgedBy,
                    acknowledged_at: new Date().toISOString(),
                    notes
                })
                .eq('id', alertId);

            if (result.error) {
                throw new Error(`Failed to acknowledge alert: ${result.error.message}`);
            }

            return result.data;
        } catch (error) {
            console.error('Error acknowledging alert:', error);
            throw error;
        }
    }

    // Cleanup and maintenance
    async cleanupOldLogs(daysToKeep = 90) {
        try {
            const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

            const [auditResult, alertResult] = await Promise.all([
                this.supabaseClient.from('audit_logs')
                    .delete()
                    .lt('timestamp', cutoffDate.toISOString()),
                this.supabaseClient.from('security_alerts')
                    .delete()
                    .lt('created_at', cutoffDate.toISOString())
            ]);

            console.log(`Cleanup completed: Audit logs: ${auditResult.error ? 'failed' : 'success'}, Security alerts: ${alertResult.error ? 'failed' : 'success'}`);
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    // Force process any pending logs
    async flush() {
        await this.processBatch();
        await this.processAlerts();
    }

    // Statistics and reporting
    async getAuditStatistics(tenantId, startDate, endDate) {
        try {
            const [
                totalEvents,
                criticalEvents,
                securityAlerts,
                userActivity,
                systemChanges
            ] = await Promise.all([
                this.supabaseClient.from('audit_logs')
                    .select('count', { count: 'exact' })
                    .eq('tenant_id', tenantId)
                    .gte('timestamp', startDate)
                    .lte('timestamp', endDate),
                this.supabaseClient.from('audit_logs')
                    .select('count', { count: 'exact' })
                    .eq('tenant_id', tenantId)
                    .eq('severity', 'critical')
                    .gte('timestamp', startDate)
                    .lte('timestamp', endDate),
                this.supabaseClient.from('security_alerts')
                    .select('count', { count: 'exact' })
                    .eq('tenant_id', tenantId)
                    .gte('created_at', startDate)
                    .lte('created_at', endDate),
                this.supabaseClient.from('audit_logs')
                    .select('count', { count: 'exact' })
                    .eq('tenant_id', tenantId)
                    .in('action', ['login_success', 'login_failed', 'user_created', 'user_updated'])
                    .gte('timestamp', startDate)
                    .lte('timestamp', endDate),
                this.supabaseClient.from('audit_logs')
                    .select('count', { count: 'exact' })
                    .eq('tenant_id', tenantId)
                    .in('category', ['system'])
                    .gte('timestamp', startDate)
                    .lte('timestamp', endDate)
            ]);

            return {
                tenantId,
                period: { startDate, endDate },
                totalEvents: totalEvents.data?.[0]?.count || 0,
                criticalEvents: criticalEvents.data?.[0]?.count || 0,
                securityAlerts: securityAlerts.data?.[0]?.count || 0,
                userActivity: userActivity.data?.[0]?.count || 0,
                systemChanges: systemChanges.data?.[0]?.count || 0,
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error generating audit statistics:', error);
            throw error;
        }
    }
}

// Export for use in backend
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuditLogger;
} else {
    window.AuditLogger = AuditLogger;
}
