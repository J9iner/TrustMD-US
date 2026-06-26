// TrustMD Reports Service
// Specialized service for report generation and management

class ReportsService {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.cache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutes for reports
        this.activeReports = new Map(); // Track active report generation
    }
    
    // Get cache key
    getCacheKey(method, ...args) {
        return `reports:${method}:${JSON.stringify(args)}`;
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
    
    // Generate compliance report
    async generateComplianceReport(templateId, parameters = {}) {
        try {
            const response = await this.apiClient.generateComplianceReport(templateId, parameters);
            
            // Track active report if it's async
            if (response.data && response.data.jobId) {
                this.activeReports.set(response.data.jobId, {
                    type: 'compliance',
                    templateId,
                    parameters,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }
            
            return response;
        } catch (error) {
            console.error(`Failed to generate compliance report for template ${templateId}:`, error);
            throw error;
        }
    }
    
    // Generate multi-state report
    async generateMultiStateReport(parameters) {
        try {
            const response = await this.apiClient.generateMultiStateReport(parameters);
            
            // Track active report if it's async
            if (response.data && response.data.jobId) {
                this.activeReports.set(response.data.jobId, {
                    type: 'multi-state',
                    parameters,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }
            
            return response;
        } catch (error) {
            console.error('Failed to generate multi-state report:', error);
            throw error;
        }
    }
    
    // Generate risk assessment report
    async generateRiskAssessmentReport(parameters = {}) {
        try {
            const response = await this.apiClient.generateReport('risk_assessment', parameters);
            
            // Track active report if it's async
            if (response.data && response.data.jobId) {
                this.activeReports.set(response.data.jobId, {
                    type: 'risk_assessment',
                    parameters,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }
            
            return response;
        } catch (error) {
            console.error('Failed to generate risk assessment report:', error);
            throw error;
        }
    }
    
    // Generate audit trail report
    async generateAuditTrailReport(parameters = {}) {
        try {
            const response = await this.apiClient.generateReport('audit_trail', parameters);
            
            // Track active report if it's async
            if (response.data && response.data.jobId) {
                this.activeReports.set(response.data.jobId, {
                    type: 'audit_trail',
                    parameters,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }
            
            return response;
        } catch (error) {
            console.error('Failed to generate audit trail report:', error);
            throw error;
        }
    }
    
    // Generate document status report
    async generateDocumentStatusReport(parameters = {}) {
        try {
            const response = await this.apiClient.generateReport('document_status', parameters);
            
            // Track active report if it's async
            if (response.data && response.data.jobId) {
                this.activeReports.set(response.data.jobId, {
                    type: 'document_status',
                    parameters,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }
            
            return response;
        } catch (error) {
            console.error('Failed to generate document status report:', error);
            throw error;
        }
    }
    
    // Generate training completion report
    async generateTrainingCompletionReport(parameters = {}) {
        try {
            const response = await this.apiClient.generateReport('training_completion', parameters);
            
            // Track active report if it's async
            if (response.data && response.data.jobId) {
                this.activeReports.set(response.data.jobId, {
                    type: 'training_completion',
                    parameters,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }
            
            return response;
        } catch (error) {
            console.error('Failed to generate training completion report:', error);
            throw error;
        }
    }
    
    // Generate incident report
    async generateIncidentReport(parameters = {}) {
        try {
            const response = await this.apiClient.generateReport('incident_report', parameters);
            
            // Track active report if it's async
            if (response.data && response.data.jobId) {
                this.activeReports.set(response.data.jobId, {
                    type: 'incident_report',
                    parameters,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }
            
            return response;
        } catch (error) {
            console.error('Failed to generate incident report:', error);
            throw error;
        }
    }
    
    // Generate violation tracking report
    async generateViolationTrackingReport(parameters = {}) {
        try {
            const response = await this.apiClient.generateReport('violation_tracking', parameters);
            
            // Track active report if it's async
            if (response.data && response.data.jobId) {
                this.activeReports.set(response.data.jobId, {
                    type: 'violation_tracking',
                    parameters,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }
            
            return response;
        } catch (error) {
            console.error('Failed to generate violation tracking report:', error);
            throw error;
        }
    }
    
    // Generate remediation status report
    async generateRemediationStatusReport(parameters = {}) {
        try {
            const response = await this.apiClient.generateReport('remediation_status', parameters);
            
            // Track active report if it's async
            if (response.data && response.data.jobId) {
                this.activeReports.set(response.data.jobId, {
                    type: 'remediation_status',
                    parameters,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }
            
            return response;
        } catch (error) {
            console.error('Failed to generate remediation status report:', error);
            throw error;
        }
    }
    
    // Generate trend analysis report
    async generateTrendAnalysisReport(parameters = {}) {
        try {
            const response = await this.apiClient.generateReport('trend_analysis', parameters);
            
            // Track active report if it's async
            if (response.data && response.data.jobId) {
                this.activeReports.set(response.data.jobId, {
                    type: 'trend_analysis',
                    parameters,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }
            
            return response;
        } catch (error) {
            console.error('Failed to generate trend analysis report:', error);
            throw error;
        }
    }
    
    // Generate executive summary report
    async generateExecutiveSummaryReport(parameters = {}) {
        try {
            const response = await this.apiClient.generateReport('executive_summary', parameters);
            
            // Track active report if it's async
            if (response.data && response.data.jobId) {
                this.activeReports.set(response.data.jobId, {
                    type: 'executive_summary',
                    parameters,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }
            
            return response;
        } catch (error) {
            console.error('Failed to generate executive summary report:', error);
            throw error;
        }
    }
    
    // Get report status
    async getReportStatus(jobId) {
        try {
            const response = await this.apiClient.get(`/reports/status/${jobId}`);
            
            // Update active report tracking
            if (this.activeReports.has(jobId)) {
                const report = this.activeReports.get(jobId);
                report.status = response.data.status;
                report.updatedAt = new Date().toISOString();
                
                if (response.data.status === 'completed' || response.data.status === 'failed') {
                    // Remove from active tracking after completion/failure
                    setTimeout(() => {
                        this.activeReports.delete(jobId);
                    }, 5000); // Keep for 5 seconds for UI updates
                }
            }
            
            return response;
        } catch (error) {
            console.error(`Failed to get report status for job ${jobId}:`, error);
            throw error;
        }
    }
    
    // Get report data
    async getReport(reportId, format = 'json') {
        const cacheKey = this.getCacheKey('getReport', reportId, format);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.get(`/reports/${reportId}?format=${format}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error(`Failed to get report ${reportId}:`, error);
            throw error;
        }
    }
    
    // List reports
    async listReports(filters = {}) {
        const cacheKey = this.getCacheKey('listReports', filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const params = new URLSearchParams(filters).toString();
            const response = await this.apiClient.get(`/reports${params ? '?' + params : ''}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to list reports:', error);
            throw error;
        }
    }
    
    // Delete report
    async deleteReport(reportId) {
        try {
            const response = await this.apiClient.delete(`/reports/${reportId}`);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to delete report ${reportId}:`, error);
            throw error;
        }
    }
    
    // Download report
    async downloadReport(reportId, filename = null, format = 'pdf') {
        try {
            const response = await this.apiClient.download(`/reports/${reportId}/download?format=${format}`, filename);
            return response;
        } catch (error) {
            console.error(`Failed to download report ${reportId}:`, error);
            throw error;
        }
    }
    
    // Share report
    async shareReport(reportId, shareData) {
        try {
            const response = await this.apiClient.post(`/reports/${reportId}/share`, shareData);
            return response;
        } catch (error) {
            console.error(`Failed to share report ${reportId}:`, error);
            throw error;
        }
    }
    
    // Get shared report
    async getSharedReport(shareToken) {
        try {
            const response = await this.apiClient.get(`/reports/shared/${shareToken}`, { skipAuth: true });
            return response;
        } catch (error) {
            console.error(`Failed to get shared report with token ${shareToken}:`, error);
            throw error;
        }
    }
    
    // Schedule report generation
    async scheduleReport(scheduleData) {
        try {
            const response = await this.apiClient.post('/reports/schedule', scheduleData);
            return response;
        } catch (error) {
            console.error('Failed to schedule report:', error);
            throw error;
        }
    }
    
    // Get scheduled reports
    async getScheduledReports(filters = {}) {
        const cacheKey = this.getCacheKey('getScheduledReports', filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const params = new URLSearchParams(filters).toString();
            const response = await this.apiClient.get(`/reports/schedule${params ? '?' + params : ''}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get scheduled reports:', error);
            throw error;
        }
    }
    
    // Update scheduled report
    async updateScheduledReport(scheduleId, scheduleData) {
        try {
            const response = await this.apiClient.put(`/reports/schedule/${scheduleId}`, scheduleData);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to update scheduled report ${scheduleId}:`, error);
            throw error;
        }
    }
    
    // Delete scheduled report
    async deleteScheduledReport(scheduleId) {
        try {
            const response = await this.apiClient.delete(`/reports/schedule/${scheduleId}`);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error(`Failed to delete scheduled report ${scheduleId}:`, error);
            throw error;
        }
    }
    
    // Get report templates
    async getReportTemplates(filters = {}) {
        const cacheKey = this.getCacheKey('getReportTemplates', filters);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const params = new URLSearchParams(filters).toString();
            const response = await this.apiClient.get(`/reports/templates${params ? '?' + params : ''}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get report templates:', error);
            throw error;
        }
    }
    
    // Create custom report template
    async createReportTemplate(templateData) {
        try {
            const response = await this.apiClient.post('/reports/templates', templateData);
            
            // Clear cache
            this.clearCache();
            
            return response;
        } catch (error) {
            console.error('Failed to create report template:', error);
            throw error;
        }
    }
    
    // Get active reports
    getActiveReports() {
        return Array.from(this.activeReports.entries()).map(([jobId, report]) => ({
            jobId,
            ...report
        }));
    }
    
    // Cancel active report
    async cancelReport(jobId) {
        try {
            const response = await this.apiClient.post(`/reports/${jobId}/cancel`);
            
            // Remove from active tracking
            this.activeReports.delete(jobId);
            
            return response;
        } catch (error) {
            console.error(`Failed to cancel report ${jobId}:`, error);
            throw error;
        }
    }
    
    // Get report analytics
    async getReportAnalytics(timeRange = '30d') {
        const cacheKey = this.getCacheKey('getReportAnalytics', timeRange);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.apiClient.get(`/reports/analytics?timeRange=${timeRange}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Failed to get report analytics:', error);
            throw error;
        }
    }
    
    // Export multiple reports
    async exportMultipleReports(reportIds, format = 'zip') {
        try {
            const response = await this.apiClient.post('/reports/export', {
                reportIds,
                format
            });
            
            if (response.data && response.data.jobId) {
                // Track export job
                this.activeReports.set(response.data.jobId, {
                    type: 'export',
                    reportIds,
                    format,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }
            
            return response;
        } catch (error) {
            console.error('Failed to export multiple reports:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReportsService };
} else {
    window.ReportsService = ReportsService;
}
