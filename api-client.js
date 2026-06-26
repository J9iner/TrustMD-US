// TrustMD API Client
// Main API client service with all backend endpoints

class TrustMDAPIClient {
    constructor(config = {}) {
        this.httpClient = new TrustMDHttpClient(config);
        this.loadStoredAuth();
        
        // Setup automatic error handling
        this.setupErrorHandling();
        
        // Service instances
        this.auth = null;
        this.compliance = null;
        this.reports = null;
        this.admin = null;
        this.analytics = null;
        this.documents = null;
        this.notifications = null;
        this.integrations = null;
    }
    
    // Load stored authentication
    loadStoredAuth() {
        this.httpClient.loadStoredAuth();
    }
    
    // Setup error handling
    setupErrorHandling() {
        this.httpClient.addEventListener('error', (error) => {
            console.error('API Error:', error);
            
            // Handle authentication errors
            if (error.status === 401) {
                this.handleAuthError(error);
            }
            
            // Handle rate limiting
            if (error.status === 429) {
                this.handleRateLimitError(error);
            }
        });
        
        this.httpClient.addEventListener('auth:expired', () => {
            this.clearAuth();
            // Redirect to login or emit event
            this.emit('auth:expired');
        });
    }
    
    // Handle authentication errors
    handleAuthError(error) {
        console.warn('Authentication error:', error);
        // Token refresh is handled automatically by HTTP client
    }
    
    // Handle rate limiting errors
    handleRateLimitError(error) {
        console.warn('Rate limit exceeded:', error);
        if (error.retryAfter) {
            console.log(`Will retry after ${error.retryAfter}ms`);
        }
    }
    
    // Emit events
    emit(event, data) {
        this.httpClient.emit(event, data);
    }
    
    // Add event listener
    addEventListener(event, listener) {
        this.httpClient.addEventListener(event, listener);
    }
    
    // Authentication methods
    async login(credentials) {
        const response = await this.httpClient.post('/auth/login', credentials, { skipAuth: true });
        
        if (response.data && response.data.accessToken) {
            this.httpClient.setAuthTokens(response.data.accessToken, response.data.refreshToken);
            if (response.data.tenantId) {
                this.httpClient.setTenantId(response.data.tenantId);
            }
        }
        
        return response;
    }
    
    async register(userData) {
        return this.httpClient.post('/auth/register', userData, { skipAuth: true });
    }
    
    async logout() {
        try {
            await this.httpClient.post('/auth/logout');
        } finally {
            this.clearAuth();
        }
    }
    
    async refreshTokens() {
        const response = await this.httpClient.post('/auth/refresh', {
            refreshToken: this.httpClient.refreshToken
        }, { skipAuth: true });
        
        if (response.data && response.data.accessToken) {
            this.httpClient.setAuthTokens(response.data.accessToken, response.data.refreshToken);
        }
        
        return response;
    }
    
    clearAuth() {
        this.httpClient.clearAuth();
    }
    
    // User management
    async getCurrentUser() {
        return this.httpClient.get('/auth/me');
    }
    
    async updateProfile(userData) {
        return this.httpClient.put('/auth/profile', userData);
    }
    
    async changePassword(passwordData) {
        return this.httpClient.post('/auth/change-password', passwordData);
    }
    
    // Compliance endpoints
    async getComplianceTemplates(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/compliance/templates${params ? '?' + params : ''}`);
    }
    
    async getComplianceTemplate(templateId) {
        return this.httpClient.get(`/compliance/templates/${templateId}`);
    }
    
    async getStateTemplate(stateCode) {
        return this.httpClient.get(`/compliance/templates/state/${stateCode}`);
    }
    
    async generateComplianceReport(templateId, parameters = {}) {
        return this.httpClient.post(`/compliance/reports/${templateId}`, parameters);
    }
    
    async getComplianceReport(templateId, reportId) {
        return this.httpClient.get(`/compliance/reports/${templateId}/${reportId}`);
    }
    
    async generateMultiStateReport(parameters) {
        return this.httpClient.post('/compliance/reports/multi-state', parameters);
    }
    
    async getMultiStateReports(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/compliance/reports/multi-state${params ? '?' + params : ''}`);
    }
    
    async getStateConfigurations() {
        return this.httpClient.get('/compliance/config/states');
    }
    
    async getStateTiers() {
        return this.httpClient.get('/compliance/config/tiers');
    }
    
    // Risk management endpoints
    async getRiskAssessments(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/risk/assessments${params ? '?' + params : ''}`);
    }
    
    async createRiskAssessment(riskData) {
        return this.httpClient.post('/risk/assessments', riskData);
    }
    
    async getRiskAssessment(assessmentId) {
        return this.httpClient.get(`/risk/assessments/${assessmentId}`);
    }
    
    async updateRiskAssessment(assessmentId, riskData) {
        return this.httpClient.put(`/risk/assessments/${assessmentId}`, riskData);
    }
    
    async deleteRiskAssessment(assessmentId) {
        return this.httpClient.delete(`/risk/assessments/${assessmentId}`);
    }
    
    async calculateRiskScore(parameters) {
        return this.httpClient.post('/risk/calculate-score', parameters);
    }
    
    async getRiskFactors() {
        return this.httpClient.get('/risk/factors');
    }
    
    async getRiskMitigationPlans(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/risk/mitigation${params ? '?' + params : ''}`);
    }
    
    // Document management endpoints
    async getDocuments(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/documents${params ? '?' + params : ''}`);
    }
    
    async uploadDocument(file, metadata = {}) {
        return this.httpClient.upload('/documents/upload', file, {
            fields: metadata
        });
    }
    
    async getDocument(documentId) {
        return this.httpClient.get(`/documents/${documentId}`);
    }
    
    async updateDocument(documentId, metadata) {
        return this.httpClient.put(`/documents/${documentId}`, metadata);
    }
    
    async deleteDocument(documentId) {
        return this.httpClient.delete(`/documents/${documentId}`);
    }
    
    async validateDocument(documentId) {
        return this.httpClient.post(`/documents/${documentId}/validate`);
    }
    
    async downloadDocument(documentId, filename = null) {
        return this.httpClient.download(`/documents/${documentId}/download`, filename);
    }
    
    // Audit and logging endpoints
    async getAuditLogs(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/audit/logs${params ? '?' + params : ''}`);
    }
    
    async getAuditLog(logId) {
        return this.httpClient.get(`/audit/logs/${logId}`);
    }
    
    async createAuditLog(logData) {
        return this.httpClient.post('/audit/logs', logData);
    }
    
    async getSecurityEvents(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/audit/security-events${params ? '?' + params : ''}`);
    }
    
    // Analytics endpoints
    async getDashboardAnalytics(timeRange = '30d') {
        return this.httpClient.get(`/analytics/dashboard?timeRange=${timeRange}`);
    }
    
    async getComplianceAnalytics(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/analytics/compliance${params ? '?' + params : ''}`);
    }
    
    async getRiskAnalytics(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/analytics/risk${params ? '?' + params : ''}`);
    }
    
    async getTrendAnalytics(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/analytics/trends${params ? '?' + params : ''}`);
    }
    
    async generateReport(reportType, parameters = {}) {
        return this.httpClient.post('/analytics/report', {
            type: reportType,
            ...parameters
        });
    }
    
    // Notification endpoints
    async getNotifications(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/notifications${params ? '?' + params : ''}`);
    }
    
    async createNotification(notificationData) {
        return this.httpClient.post('/notifications', notificationData);
    }
    
    async markNotificationRead(notificationId) {
        return this.httpClient.put(`/notifications/${notificationId}/read`);
    }
    
    async deleteNotification(notificationId) {
        return this.httpClient.delete(`/notifications/${notificationId}`);
    }
    
    async markAllNotificationsRead() {
        return this.httpClient.post('/notifications/mark-all-read');
    }
    
    // Admin endpoints
    async getUsers(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/admin/users${params ? '?' + params : ''}`);
    }
    
    async createUser(userData) {
        return this.httpClient.post('/admin/users', userData);
    }
    
    async getUser(userId) {
        return this.httpClient.get(`/admin/users/${userId}`);
    }
    
    async updateUser(userId, userData) {
        return this.httpClient.put(`/admin/users/${userId}`, userData);
    }
    
    async deleteUser(userId) {
        return this.httpClient.delete(`/admin/users/${userId}`);
    }
    
    async activateUser(userId) {
        return this.httpClient.post(`/admin/users/${userId}/activate`);
    }
    
    async deactivateUser(userId) {
        return this.httpClient.post(`/admin/users/${userId}/deactivate`);
    }
    
    async assignUserRoles(userId, roleIds) {
        return this.httpClient.post(`/admin/users/${userId}/roles`, { roleIds });
    }
    
    async removeUserRole(userId, roleId) {
        return this.httpClient.delete(`/admin/users/${userId}/roles/${roleId}`);
    }
    
    // Tenant management endpoints
    async getTenants(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/admin/tenants${params ? '?' + params : ''}`);
    }
    
    async createTenant(tenantData) {
        return this.httpClient.post('/admin/tenants', tenantData);
    }
    
    async getTenant(tenantId) {
        return this.httpClient.get(`/admin/tenants/${tenantId}`);
    }
    
    async updateTenant(tenantId, tenantData) {
        return this.httpClient.put(`/admin/tenants/${tenantId}`, tenantData);
    }
    
    async deleteTenant(tenantId) {
        return this.httpClient.delete(`/admin/tenants/${tenantId}`);
    }
    
    async getTenantStats(tenantId) {
        return this.httpClient.get(`/admin/tenants/${tenantId}/stats`);
    }
    
    // Role management endpoints
    async getRoles(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/admin/roles${params ? '?' + params : ''}`);
    }
    
    async createRole(roleData) {
        return this.httpClient.post('/admin/roles', roleData);
    }
    
    async getRole(roleId) {
        return this.httpClient.get(`/admin/roles/${roleId}`);
    }
    
    async updateRole(roleId, roleData) {
        return this.httpClient.put(`/admin/roles/${roleId}`, roleData);
    }
    
    async deleteRole(roleId) {
        return this.httpClient.delete(`/admin/roles/${roleId}`);
    }
    
    // Security endpoints
    async getAuditLogs(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/admin/audit-logs${params ? '?' + params : ''}`);
    }
    
    async getSecurityAlerts(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/admin/security-alerts${params ? '?' + params : ''}`);
    }
    
    async acknowledgeAlert(alertId) {
        return this.httpClient.post(`/admin/security-alerts/${alertId}/acknowledge`);
    }
    
    // Integration endpoints
    async syncEHRData(syncData) {
        return this.httpClient.post('/integrations/ehr', syncData);
    }
    
    async handleWebhook(provider, webhookData) {
        return this.httpClient.post(`/integrations/webhook/${provider}`, webhookData);
    }
    
    async getIntegrationStatus() {
        return this.httpClient.get('/integrations/status');
    }
    
    // PWA endpoints
    async getPWAManifest() {
        return this.httpClient.get('/pwa/manifest');
    }
    
    async subscribeToPushNotifications(subscriptionData) {
        return this.httpClient.post('/pwa/subscribe', subscriptionData);
    }
    
    async unsubscribeFromPushNotifications(subscriptionData) {
        return this.httpClient.post('/pwa/unsubscribe', subscriptionData);
    }
    
    // State-specific endpoints
    async getAllStates() {
        return this.httpClient.get('/states');
    }
    
    async getStateDetails(stateCode) {
        return this.httpClient.get(`/states/${stateCode}`);
    }
    
    async getStateRegulations(stateCode) {
        return this.httpClient.get(`/states/${stateCode}/regulations`);
    }
    
    async getStateCompliance(stateCode) {
        return this.httpClient.get(`/states/${stateCode}/compliance`);
    }
    
    async validateStateCompliance(stateCode, validationData) {
        return this.httpClient.post(`/states/${stateCode}/validate`, validationData);
    }
    
    async generateStateReport(stateCode, parameters = {}) {
        const params = new URLSearchParams(parameters).toString();
        return this.httpClient.get(`/states/${stateCode}/report${params ? '?' + params : ''}`);
    }
    
    async compareStates(stateCodes, parameters = {}) {
        const params = new URLSearchParams({ states: stateCodes.join(','), ...parameters }).toString();
        return this.httpClient.get(`/states/comparison?${params}`);
    }
    
    async getStatesAnalytics(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/states/analytics${params ? '?' + params : ''}`);
    }
    
    async updateStateRegulations(stateCode, regulationData) {
        return this.httpClient.put(`/states/${stateCode}/regulations`, regulationData);
    }
    
    async getRegulatoryBurdenAnalysis(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.httpClient.get(`/states/burden-analysis${params ? '?' + params : ''}`);
    }
    
    // Utility methods
    async healthCheck() {
        return this.httpClient.get('/health', { skipAuth: true });
    }
    
    async getServerInfo() {
        return this.httpClient.get('/info', { skipAuth: true });
    }
    
    // Get authentication status
    isAuthenticated() {
        return this.httpClient.isAuthenticated();
    }
    
    // Get current user
    getCurrentUser() {
        return this.httpClient.getCurrentUser();
    }
    
    // Get current tenant
    getCurrentTenant() {
        return this.httpClient.tenantId;
    }
    
    // Set tenant context
    setTenant(tenantId) {
        this.httpClient.setTenantId(tenantId);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TrustMDAPIClient };
} else {
    window.TrustMDAPIClient = TrustMDAPIClient;
}
