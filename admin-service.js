// TrustMD Admin Service
// Specialized service for administrative operations

class AdminService {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.cache = new Map();
        this.cacheTimeout = 2 * 60 * 1000; // 2 minutes for admin data
    }
    
    // Get cache key
    getCacheKey(method, ...args) {
        return `admin:${method}:${JSON.stringify(args)}`;
    }
    
    // Get from cache
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }
    
    // Set cache
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    // Clear cache
    clearCache() {
        this.cache.clear();
    }
    
    // ==================== USER MANAGEMENT ====================
    
    // Get users
    async getUsers(filters = {}) {
        const cacheKey = this.getCacheKey('getUsers', filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.getUsers(filters);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get users:', error);
            throw error;
        }
    }
    
    // Get user by ID
    async getUser(userId) {
        const cacheKey = this.getCacheKey('getUser', userId);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.getUser(userId);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error(`Failed to get user ${userId}:`, error);
            throw error;
        }
    }
    
    // Create user
    async createUser(userData) {
        try {
            const response = await this.apiClient.createUser(userData);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error('Failed to create user:', error);
            throw error;
        }
    }
    
    // Update user
    async updateUser(userId, userData) {
        try {
            const response = await this.apiClient.updateUser(userId, userData);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to update user ${userId}:`, error);
            throw error;
        }
    }
    
    // Delete user
    async deleteUser(userId) {
        try {
            const response = await this.apiClient.deleteUser(userId);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to delete user ${userId}:`, error);
            throw error;
        }
    }
    
    // Activate user
    async activateUser(userId) {
        try {
            const response = await this.apiClient.activateUser(userId);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to activate user ${userId}:`, error);
            throw error;
        }
    }
    
    // Deactivate user
    async deactivateUser(userId) {
        try {
            const response = await this.apiClient.deactivateUser(userId);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to deactivate user ${userId}:`, error);
            throw error;
        }
    }
    
    // Assign user roles
    async assignUserRoles(userId, roleIds) {
        try {
            const response = await this.apiClient.assignUserRoles(userId, roleIds);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to assign roles to user ${userId}:`, error);
            throw error;
        }
    }
    
    // Remove user role
    async removeUserRole(userId, roleId) {
        try {
            const response = await this.apiClient.removeUserRole(userId, roleId);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to remove role ${roleId} from user ${userId}:`, error);
            throw error;
        }
    }
    
    // Reset user password
    async resetUserPassword(userId, newPassword) {
        try {
            const response = await this.apiClient.post(`/admin/users/${userId}/reset-password`, {
                password: newPassword,
                requirePasswordChange: true
            });
            
            return response;
        } catch (error) {
            console.error(`Failed to reset password for user ${userId}:`, error);
            throw error;
        }
    }
    
    // Get user activity
    async getUserActivity(userId, filters = {}) {
        const cacheKey = this.getCacheKey('getUserActivity', userId, filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const params = new URLSearchParams(filters).toString();
            const response = await this.apiClient.get(`/admin/users/${userId}/activity${params ? '?' + params : ''}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error(`Failed to get activity for user ${userId}:`, error);
            throw error;
        }
    }
    
    // ==================== TENANT MANAGEMENT ====================
    
    // Get tenants
    async getTenants(filters = {}) {
        const cacheKey = this.getCacheKey('getTenants', filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.getTenants(filters);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get tenants:', error);
            throw error;
        }
    }
    
    // Get tenant by ID
    async getTenant(tenantId) {
        const cacheKey = this.getCacheKey('getTenant', tenantId);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.getTenant(tenantId);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error(`Failed to get tenant ${tenantId}:`, error);
            throw error;
        }
    }
    
    // Create tenant
    async createTenant(tenantData) {
        try {
            const response = await this.apiClient.createTenant(tenantData);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error('Failed to create tenant:', error);
            throw error;
        }
    }
    
    // Update tenant
    async updateTenant(tenantId, tenantData) {
        try {
            const response = await this.apiClient.updateTenant(tenantId, tenantData);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to update tenant ${tenantId}:`, error);
            throw error;
        }
    }
    
    // Delete tenant
    async deleteTenant(tenantId) {
        try {
            const response = await this.apiClient.deleteTenant(tenantId);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to delete tenant ${tenantId}:`, error);
            throw error;
        }
    }
    
    // Get tenant statistics
    async getTenantStats(tenantId) {
        const cacheKey = this.getCacheKey('getTenantStats', tenantId);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.getTenantStats(tenantId);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error(`Failed to get stats for tenant ${tenantId}:`, error);
            throw error;
        }
    }
    
    // ==================== ROLE MANAGEMENT ====================
    
    // Get roles
    async getRoles(filters = {}) {
        const cacheKey = this.getCacheKey('getRoles', filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.getRoles(filters);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get roles:', error);
            throw error;
        }
    }
    
    // Get role by ID
    async getRole(roleId) {
        const cacheKey = this.getCacheKey('getRole', roleId);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.getRole(roleId);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error(`Failed to get role ${roleId}:`, error);
            throw error;
        }
    }
    
    // Create role
    async createRole(roleData) {
        try {
            const response = await this.apiClient.createRole(roleData);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error('Failed to create role:', error);
            throw error;
        }
    }
    
    // Update role
    async updateRole(roleId, roleData) {
        try {
            const response = await this.apiClient.updateRole(roleId, roleData);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to update role ${roleId}:`, error);
            throw error;
        }
    }
    
    // Delete role
    async deleteRole(roleId) {
        try {
            const response = await this.apiClient.deleteRole(roleId);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to delete role ${roleId}:`, error);
            throw error;
        }
    }
    
    // ==================== SECURITY & AUDIT ====================
    
    // Get audit logs
    async getAuditLogs(filters = {}) {
        const cacheKey = this.getCacheKey('getAuditLogs', filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.getAuditLogs(filters);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get audit logs:', error);
            throw error;
        }
    }
    
    // Get security alerts
    async getSecurityAlerts(filters = {}) {
        const cacheKey = this.getCacheKey('getSecurityAlerts', filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.getSecurityAlerts(filters);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get security alerts:', error);
            throw error;
        }
    }
    
    // Acknowledge security alert
    async acknowledgeAlert(alertId, notes = '') {
        try {
            const response = await this.apiClient.acknowledgeAlert(alertId);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to acknowledge alert ${alertId}:`, error);
            throw error;
        }
    }
    
    // Get login attempts
    async getLoginAttempts(filters = {}) {
        const cacheKey = this.getCacheKey('getLoginAttempts', filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const params = new URLSearchParams(filters).toString();
            const response = await this.apiClient.get(`/admin/login-attempts${params ? '?' + params : ''}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get login attempts:', error);
            throw error;
        }
    }
    
    // ==================== SYSTEM ADMINISTRATION ====================
    
    // Get system status
    async getSystemStatus() {
        const cacheKey = this.getCacheKey('getSystemStatus');
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.get('/admin/system/status');
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get system status:', error);
            throw error;
        }
    }
    
    // Get system metrics
    async getSystemMetrics(timeRange = '1h') {
        const cacheKey = this.getCacheKey('getSystemMetrics', timeRange);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.get(`/admin/system/metrics?timeRange=${timeRange}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get system metrics:', error);
            throw error;
        }
    }
    
    // Get system configuration
    async getSystemConfiguration() {
        const cacheKey = this.getCacheKey('getSystemConfiguration');
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.get('/admin/system/config');
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get system configuration:', error);
            throw error;
        }
    }
    
    // Update system configuration
    async updateSystemConfiguration(configData) {
        try {
            const response = await this.apiClient.put('/admin/system/config', configData);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error('Failed to update system configuration:', error);
            throw error;
        }
    }
    
    // ==================== BACKUP & MAINTENANCE ====================
    
    // Create backup
    async createBackup(backupOptions = {}) {
        try {
            const response = await this.apiClient.post('/admin/backup', backupOptions);
            return response;
        } catch (error) {
            console.error('Failed to create backup:', error);
            throw error;
        }
    }
    
    // Get backups
    async getBackups(filters = {}) {
        const cacheKey = this.getCacheKey('getBackups', filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const params = new URLSearchParams(filters).toString();
            const response = await this.apiClient.get(`/admin/backup${params ? '?' + params : ''}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get backups:', error);
            throw error;
        }
    }
    
    // Restore backup
    async restoreBackup(backupId) {
        try {
            const response = await this.apiClient.post(`/admin/backup/${backupId}/restore`);
            return response;
        } catch (error) {
            console.error(`Failed to restore backup ${backupId}:`, error);
            throw error;
        }
    }
    
    // ==================== NOTIFICATIONS ====================
    
    // Send system notification
    async sendSystemNotification(notificationData) {
        try {
            const response = await this.apiClient.post('/admin/notifications/system', notificationData);
            return response;
        } catch (error) {
            console.error('Failed to send system notification:', error);
            throw error;
        }
    }
    
    // Get notification templates
    async getNotificationTemplates() {
        const cacheKey = this.getCacheKey('getNotificationTemplates');
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.get('/admin/notifications/templates');
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get notification templates:', error);
            throw error;
        }
    }
    
    // ==================== DASHBOARD ====================
    
    // Get admin dashboard data
    async getDashboardData(timeRange = '7d') {
        const cacheKey = this.getCacheKey('getDashboardData', timeRange);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.get(`/admin/dashboard?timeRange=${timeRange}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get admin dashboard data:', error);
            throw error;
        }
    }
    
    // Get quick stats
    async getQuickStats() {
        const cacheKey = this.getCacheKey('getQuickStats');
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.get('/admin/dashboard/quick-stats');
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get quick stats:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdminService };
} else {
    window.AdminService = AdminService;
}
