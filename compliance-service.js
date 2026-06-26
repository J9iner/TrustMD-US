// TrustMD Compliance Service
// Specialized service for compliance-related API operations

class ComplianceService {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }
    
    // Get cache key
    getCacheKey(method, ...args) {
        return `${method}:${JSON.stringify(args)}`;
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
    
    // Get compliance templates
    async getTemplates(filters = {}) {
        const cacheKey = this.getCacheKey('getTemplates', filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.getComplianceTemplates(filters);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get compliance templates:', error);
            throw error;
        }
    }
    
    // Get specific compliance template
    async getTemplate(templateId) {
        const cacheKey = this.getCacheKey('getTemplate', templateId);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.getComplianceTemplate(templateId);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error(`Failed to get template ${templateId}:`, error);
            throw error;
        }
    }
    
    // Get state-specific template
    async getStateTemplate(stateCode) {
        const cacheKey = this.getCacheKey('getStateTemplate', stateCode);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.getStateTemplate(stateCode);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error(`Failed to get state template for ${stateCode}:`, error);
            throw error;
        }
    }
    
    // Generate compliance report
    async generateReport(templateId, parameters = {}) {
        try {
            // Clear cache for this template's reports
            this.clearCache();
            
            const response = await this.apiClient.generateComplianceReport(templateId, parameters);
            
            // Start polling for report completion if it's async
            if (response.data && response.data.jobId) {
                return this.pollReportCompletion(response.data.jobId);
            }
            
            return response;
        } catch (error) {
            console.error(`Failed to generate report for template ${templateId}:`, error);
            throw error;
        }
    }
    
    // Get compliance report
    async getReport(templateId, reportId) {
        const cacheKey = this.getCacheKey('getReport', templateId, reportId);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.getComplianceReport(templateId, reportId);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error(`Failed to get report ${reportId}:`, error);
            throw error;
        }
    }
    
    // Generate multi-state compliance report
    async generateMultiStateReport(parameters) {
        try {
            this.clearCache();
            
            const response = await this.apiClient.generateMultiStateReport(parameters);
            
            // Start polling for report completion if it's async
            if (response.data && response.data.jobId) {
                return this.pollReportCompletion(response.data.jobId);
            }
            
            return response;
        } catch (error) {
            console.error('Failed to generate multi-state report:', error);
            throw error;
        }
    }
    
    // Get multi-state reports
    async getMultiStateReports(filters = {}) {
        const cacheKey = this.getCacheKey('getMultiStateReports', filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.getMultiStateReports(filters);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get multi-state reports:', error);
            throw error;
        }
    }
    
    // Poll for report completion
    async pollReportCompletion(jobId, maxAttempts = 30, interval = 2000) {
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                const response = await this.apiClient.get(`/reports/job/${jobId}`);
                
                if (response.data.status === 'completed') {
                    return response;
                } else if (response.data.status === 'failed') {
                    throw new Error(`Report generation failed: ${response.data.error}`);
                }
                
                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, interval));
                attempts++;
            } catch (error) {
                if (attempts === maxAttempts - 1) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, interval));
                attempts++;
            }
        }
        
        throw new Error('Report generation timed out');
    }
    
    // Get state configurations
    async getStateConfigurations() {
        const cacheKey = this.getCacheKey('getStateConfigurations');
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.getStateConfigurations();
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get state configurations:', error);
            throw error;
        }
    }
    
    // Get state tiers
    async getStateTiers() {
        const cacheKey = this.getCacheKey('getStateTiers');
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.getStateTiers();
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get state tiers:', error);
            throw error;
        }
    }
    
    // Validate compliance for a specific state
    async validateStateCompliance(stateCode, validationData) {
        try {
            const response = await this.apiClient.validateStateCompliance(stateCode, validationData);
            return response;
        } catch (error) {
            console.error(`Failed to validate compliance for ${stateCode}:`, error);
            throw error;
        }
    }
    
    // Get compliance score for an entity
    async getComplianceScore(entityId, entityType = 'organization') {
        const cacheKey = this.getCacheKey('getComplianceScore', entityId, entityType);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.get(`/compliance/score/${entityType}/${entityId}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error(`Failed to get compliance score for ${entityId}:`, error);
            throw error;
        }
    }
    
    // Get compliance history
    async getComplianceHistory(entityId, entityType = 'organization', filters = {}) {
        const cacheKey = this.getCacheKey('getComplianceHistory', entityId, entityType, filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const params = new URLSearchParams(filters).toString();
            const response = await this.apiClient.get(`/compliance/history/${entityType}/${entityId}${params ? '?' + params : ''}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error(`Failed to get compliance history for ${entityId}:`, error);
            throw error;
        }
    }
    
    // Get compliance requirements
    async getComplianceRequirements(templateId, filters = {}) {
        const cacheKey = this.getCacheKey('getComplianceRequirements', templateId, filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const params = new URLSearchParams(filters).toString();
            const response = await this.apiClient.get(`/compliance/requirements/${templateId}${params ? '?' + params : ''}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error(`Failed to get compliance requirements for ${templateId}:`, error);
            throw error;
        }
    }
    
    // Update compliance requirement status
    async updateRequirementStatus(requirementId, status, notes = '') {
        try {
            const response = await this.apiClient.put(`/compliance/requirements/${requirementId}`, {
                status,
                notes,
                updatedAt: new Date().toISOString()
            });
            
            // Clear relevant cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to update requirement status for ${requirementId}:`, error);
            throw error;
        }
    }
    
    // Upload compliance evidence
    async uploadEvidence(requirementId, file, metadata = {}) {
        try {
            const response = await this.apiClient.upload(`/compliance/evidence/${requirementId}`, file, {
                ...metadata,
                uploadedAt: new Date().toISOString()
            });
            
            // Clear relevant cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to upload evidence for requirement ${requirementId}:`, error);
            throw error;
        }
    }
    
    // Get compliance evidence
    async getEvidence(requirementId, filters = {}) {
        const cacheKey = this.getCacheKey('getEvidence', requirementId, filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const params = new URLSearchParams(filters).toString();
            const response = await this.apiClient.get(`/compliance/evidence/${requirementId}${params ? '?' + params : ''}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error(`Failed to get evidence for requirement ${requirementId}:`, error);
            throw error;
        }
    }
    
    // Delete compliance evidence
    async deleteEvidence(evidenceId) {
        try {
            const response = await this.apiClient.delete(`/compliance/evidence/${evidenceId}`);
            
            // Clear relevant cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to delete evidence ${evidenceId}:`, error);
            throw error;
        }
    }
    
    // Get compliance alerts
    async getComplianceAlerts(filters = {}) {
        const cacheKey = this.getCacheKey('getComplianceAlerts', filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const params = new URLSearchParams(filters).toString();
            const response = await this.apiClient.get(`/compliance/alerts${params ? '?' + params : ''}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get compliance alerts:', error);
            throw error;
        }
    }
    
    // Acknowledge compliance alert
    async acknowledgeAlert(alertId, notes = '') {
        try {
            const response = await this.apiClient.put(`/compliance/alerts/${alertId}/acknowledge`, {
                acknowledged: true,
                acknowledgedAt: new Date().toISOString(),
                notes
            });
            
            // Clear relevant cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to acknowledge alert ${alertId}:`, error);
            throw error;
        }
    }
    
    // Get compliance dashboard data
    async getDashboardData(timeRange = '30d') {
        const cacheKey = this.getCacheKey('getDashboardData', timeRange);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.get(`/compliance/dashboard?timeRange=${timeRange}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get compliance dashboard data:', error);
            throw error;
        }
    }
    
    // Export compliance data
    async exportComplianceData(format = 'json', filters = {}) {
        try {
            const params = new URLSearchParams({ format, ...filters }).toString();
            const response = await this.apiClient.get(`/compliance/export?${params}`);
            
            if (format === 'csv' || format === 'excel') {
                // Handle file download
                const blob = new Blob([response.data], { 
                    type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `compliance-export.${format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }
            
            return response;
        } catch (error) {
            console.error('Failed to export compliance data:', error);
            throw error;
        }
    }
    
    // Get compliance statistics
    async getStatistics(filters = {}) {
        const cacheKey = this.getCacheKey('getStatistics', filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const params = new URLSearchParams(filters).toString();
            const response = await this.apiClient.get(`/compliance/statistics${params ? '?' + params : ''}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get compliance statistics:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ComplianceService };
} else {
    window.ComplianceService = ComplianceService;
}
