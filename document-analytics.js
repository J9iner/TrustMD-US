// TrustMD Evidence Vault - Document Analytics Module
// Handles document usage analytics and business intelligence

class DocumentAnalytics {
    constructor(supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.currentUserId = null;
        this.currentTenantId = null;
        this.analyticsCache = new Map();
        this.cacheTTL = 300000; // 5 minutes
    }
    
    // Initialize analytics module
    async initialize(userId, tenantId) {
        this.currentUserId = userId;
        this.currentTenantId = tenantId;
        console.log('Document Analytics initialized');
    }
    
    // Track document access
    async trackDocumentAccess(documentId, accessType = 'view', metadata = {}) {
        try {
            const accessRecord = {
                document_id: documentId,
                user_id: this.currentUserId,
                tenant_id: this.currentTenantId,
                access_type: accessType,
                access_time: new Date().toISOString(),
                ip_address: metadata.ipAddress || null,
                user_agent: metadata.userAgent || null,
                session_id: metadata.sessionId || null,
                referrer: metadata.referrer || null,
                duration: metadata.duration || null
            };
            
            const { error } = await this.supabaseClient
                .from('document_access_logs')
                .insert(accessRecord);
            
            if (error) {
                console.error('Failed to track document access:', error);
            }
            
            // Clear relevant cache entries
            this.clearCacheForDocument(documentId);
        } catch (error) {
            console.error('Document access tracking failed:', error);
        }
    }
    
    // Track document search
    async trackDocumentSearch(searchTerm, filters = {}, results = []) {
        try {
            const searchRecord = {
                user_id: this.currentUserId,
                tenant_id: this.currentTenantId,
                search_term: searchTerm,
                filters: filters,
                result_count: results.length,
                search_time: new Date().toISOString(),
                session_id: filters.sessionId || null
            };
            
            const { error } = await this.supabaseClient
                .from('document_search_logs')
                .insert(searchRecord);
            
            if (error) {
                console.error('Failed to track document search:', error);
            }
        } catch (error) {
            console.error('Document search tracking failed:', error);
        }
    }
    
    // Get document usage statistics
    async getDocumentUsageStats(documentId, timeRange = '30d') {
        try {
            const cacheKey = `usage_${documentId}_${timeRange}`;
            const cached = this.getCachedResult(cacheKey);
            if (cached) {
                return cached;
            }
            
            // Calculate date range
            const endDate = new Date();
            const startDate = new Date();
            const days = parseInt(timeRange.replace('d', ''));
            startDate.setDate(endDate.getDate() - days);
            
            // Get access logs
            const { data: accessLogs, error } = await this.supabaseClient
                .from('document_access_logs')
                .select('*')
                .eq('document_id', documentId)
                .eq('tenant_id', this.currentTenantId)
                .gte('access_time', startDate.toISOString())
                .lte('access_time', endDate.toISOString());
            
            if (error) {
                throw new Error(`Failed to get usage stats: ${error.message}`);
            }
            
            // Calculate statistics
            const stats = this.calculateUsageStatistics(accessLogs || [], timeRange);
            
            // Cache result
            this.setCachedResult(cacheKey, stats);
            
            return stats;
        } catch (error) {
            console.error('Failed to get document usage stats:', error);
            return {
                totalViews: 0,
                uniqueUsers: 0,
                averageViewDuration: 0,
                accessPattern: 'no_data',
                error: error.message
            };
        }
    }
    
    // Calculate usage statistics
    calculateUsageStatistics(accessLogs, timeRange) {
        const totalViews = accessLogs.length;
        const uniqueUsers = new Set(accessLogs.map(log => log.user_id)).size;
        
        // Calculate average view duration
        const durations = accessLogs
            .filter(log => log.duration && log.duration > 0)
            .map(log => log.duration);
        const averageViewDuration = durations.length > 0 
            ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length 
            : 0;
        
        // Analyze access pattern
        const accessPattern = this.analyzeAccessPattern(accessLogs);
        
        // Get most active users
        const userAccessCounts = {};
        accessLogs.forEach(log => {
            userAccessCounts[log.user_id] = (userAccessCounts[log.user_id] || 0) + 1;
        });
        
        const mostActiveUsers = Object.entries(userAccessCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([userId, count]) => ({ userId, count }));
        
        return {
            totalViews,
            uniqueUsers,
            averageViewDuration: Math.round(averageViewDuration),
            accessPattern,
            mostActiveUsers,
            timeRange,
            calculatedAt: new Date().toISOString()
        };
    }
    
    // Analyze access pattern
    analyzeAccessPattern(accessLogs) {
        if (accessLogs.length === 0) {
            return 'no_data';
        }
        
        // Group by hour of day
        const hourlyAccess = new Array(24).fill(0);
        accessLogs.forEach(log => {
            const hour = new Date(log.access_time).getHours();
            hourlyAccess[hour]++;
        });
        
        // Find peak hours
        const maxAccess = Math.max(...hourlyAccess);
        const peakHours = hourlyAccess
            .map((count, hour) => ({ hour, count }))
            .filter(item => item.count === maxAccess)
            .map(item => item.hour);
        
        // Determine pattern
        if (peakHours.length >= 6 && peakHours.every(hour => hour >= 9 && hour <= 17)) {
            return 'business_hours';
        } else if (peakHours.some(hour => hour >= 18 && hour <= 23)) {
            return 'evening_heavy';
        } else if (peakHours.some(hour => hour >= 0 && hour <= 6)) {
            return 'after_hours';
        } else {
            return 'distributed';
        }
    }
    
    // Get overall analytics dashboard
    async getAnalyticsDashboard(timeRange = '30d') {
        try {
            const cacheKey = `dashboard_${timeRange}`;
            const cached = this.getCachedResult(cacheKey);
            if (cached) {
                return cached;
            }
            
            // Calculate date range
            const endDate = new Date();
            const startDate = new Date();
            const days = parseInt(timeRange.replace('d', ''));
            startDate.setDate(endDate.getDate() - days);
            
            // Get various analytics data
            const [
                documentStats,
                accessStats,
                searchStats,
                categoryStats,
                userStats
            ] = await Promise.all([
                this.getDocumentStatistics(startDate, endDate),
                this.getAccessStatistics(startDate, endDate),
                this.getSearchStatistics(startDate, endDate),
                this.getCategoryStatistics(startDate, endDate),
                this.getUserStatistics(startDate, endDate)
            ]);
            
            const dashboard = {
                summary: {
                    totalDocuments: documentStats.total,
                    activeDocuments: documentStats.active,
                    totalViews: accessStats.totalViews,
                    uniqueUsers: accessStats.uniqueUsers,
                    totalSearches: searchStats.totalSearches,
                    averageViewDuration: accessStats.averageViewDuration
                },
                trends: {
                    documentGrowth: documentStats.growthRate,
                    accessGrowth: accessStats.growthRate,
                    searchGrowth: searchStats.growthRate
                },
                topCategories: categoryStats.topCategories,
                topDocuments: accessStats.topDocuments,
                topSearchTerms: searchStats.topSearchTerms,
                userEngagement: userStats.engagement,
                timeRange,
                generatedAt: new Date().toISOString()
            };
            
            // Cache result
            this.setCachedResult(cacheKey, dashboard);
            
            return dashboard;
        } catch (error) {
            console.error('Failed to generate analytics dashboard:', error);
            return {
                error: error.message,
                generatedAt: new Date().toISOString()
            };
        }
    }
    
    // Get document statistics
    async getDocumentStatistics(startDate, endDate) {
        const { data: documents, error } = await this.supabaseClient
            .from('documents')
            .select('status, created_at, category')
            .eq('tenant_id', this.currentTenantId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
        
        if (error) throw error;
        
        const total = documents.length;
        const active = documents.filter(doc => doc.status === 'active').length;
        
        // Calculate growth rate (compare with previous period)
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(startDate.getDate() - (endDate.getDate() - startDate.getDate()));
        
        const { data: previousDocs } = await this.supabaseClient
            .from('documents')
            .select('id')
            .eq('tenant_id', this.currentTenantId)
            .gte('created_at', previousStartDate.toISOString())
            .lt('created_at', startDate.toISOString());
        
        const previousCount = previousDocs?.length || 0;
        const growthRate = previousCount > 0 ? ((total - previousCount) / previousCount * 100) : 0;
        
        return {
            total,
            active,
            growthRate: Math.round(growthRate * 100) / 100
        };
    }
    
    // Get access statistics
    async getAccessStatistics(startDate, endDate) {
        const { data: accessLogs, error } = await this.supabaseClient
            .from('document_access_logs')
            .select('document_id, user_id, access_time, duration')
            .eq('tenant_id', this.currentTenantId)
            .gte('access_time', startDate.toISOString())
            .lte('access_time', endDate.toISOString());
        
        if (error) throw error;
        
        const totalViews = accessLogs.length;
        const uniqueUsers = new Set(accessLogs.map(log => log.user_id)).size;
        
        // Calculate average duration
        const durations = accessLogs
            .filter(log => log.duration && log.duration > 0)
            .map(log => log.duration);
        const averageViewDuration = durations.length > 0 
            ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length 
            : 0;
        
        // Get top documents
        const documentCounts = {};
        accessLogs.forEach(log => {
            documentCounts[log.document_id] = (documentCounts[log.document_id] || 0) + 1;
        });
        
        const topDocuments = Object.entries(documentCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([documentId, count]) => ({ documentId, count }));
        
        // Calculate growth rate
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(startDate.getDate() - (endDate.getDate() - startDate.getDate()));
        
        const { data: previousAccess } = await this.supabaseClient
            .from('document_access_logs')
            .select('id')
            .eq('tenant_id', this.currentTenantId)
            .gte('access_time', previousStartDate.toISOString())
            .lt('access_time', startDate.toISOString());
        
        const previousCount = previousAccess?.length || 0;
        const growthRate = previousCount > 0 ? ((totalViews - previousCount) / previousCount * 100) : 0;
        
        return {
            totalViews,
            uniqueUsers,
            averageViewDuration: Math.round(averageViewDuration),
            topDocuments,
            growthRate: Math.round(growthRate * 100) / 100
        };
    }
    
    // Get search statistics
    async getSearchStatistics(startDate, endDate) {
        const { data: searchLogs, error } = await this.supabaseClient
            .from('document_search_logs')
            .select('search_term, result_count, search_time')
            .eq('tenant_id', this.currentTenantId)
            .gte('search_time', startDate.toISOString())
            .lte('search_time', endDate.toISOString());
        
        if (error) throw error;
        
        const totalSearches = searchLogs.length;
        
        // Get top search terms
        const termCounts = {};
        searchLogs.forEach(log => {
            termCounts[log.search_term] = (termCounts[log.search_term] || 0) + 1;
        });
        
        const topSearchTerms = Object.entries(termCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([term, count]) => ({ term, count }));
        
        // Calculate growth rate
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(startDate.getDate() - (endDate.getDate() - startDate.getDate()));
        
        const { data: previousSearches } = await this.supabaseClient
            .from('document_search_logs')
            .select('id')
            .eq('tenant_id', this.currentTenantId)
            .gte('search_time', previousStartDate.toISOString())
            .lt('search_time', startDate.toISOString());
        
        const previousCount = previousSearches?.length || 0;
        const growthRate = previousCount > 0 ? ((totalSearches - previousCount) / previousCount * 100) : 0;
        
        return {
            totalSearches,
            topSearchTerms,
            growthRate: Math.round(growthRate * 100) / 100
        };
    }
    
    // Get category statistics
    async getCategoryStatistics(startDate, endDate) {
        const { data: documents, error } = await this.supabaseClient
            .from('documents')
            .select('category')
            .eq('tenant_id', this.currentTenantId)
            .eq('status', 'active')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
        
        if (error) throw error;
        
        const categoryCounts = {};
        documents.forEach(doc => {
            categoryCounts[doc.category] = (categoryCounts[doc.category] || 0) + 1;
        });
        
        const topCategories = Object.entries(categoryCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([category, count]) => ({ category, count }));
        
        return {
            topCategories
        };
    }
    
    // Get user statistics
    async getUserStatistics(startDate, endDate) {
        const { data: accessLogs, error } = await this.supabaseClient
            .from('document_access_logs')
            .select('user_id, access_time, duration')
            .eq('tenant_id', this.currentTenantId)
            .gte('access_time', startDate.toISOString())
            .lte('access_time', endDate.toISOString());
        
        if (error) throw error;
        
        // Calculate engagement metrics
        const userEngagement = {};
        accessLogs.forEach(log => {
            if (!userEngagement[log.user_id]) {
                userEngagement[log.user_id] = {
                    viewCount: 0,
                    totalDuration: 0,
                    averageDuration: 0
                };
            }
            
            userEngagement[log.user_id].viewCount++;
            if (log.duration) {
                userEngagement[log.user_id].totalDuration += log.duration;
            }
        });
        
        // Calculate averages
        Object.values(userEngagement).forEach(user => {
            user.averageDuration = user.viewCount > 0 ? user.totalDuration / user.viewCount : 0;
        });
        
        return {
            engagement: userEngagement
        };
    }
    
    // Get cached result
    getCachedResult(key) {
        const cached = this.analyticsCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        return null;
    }
    
    // Set cached result
    setCachedResult(key, data) {
        this.analyticsCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    // Clear cache for specific document
    clearCacheForDocument(documentId) {
        for (const [key] of this.analyticsCache.entries()) {
            if (key.includes(documentId)) {
                this.analyticsCache.delete(key);
            }
        }
    }
    
    // Clear all cache
    clearCache() {
        this.analyticsCache.clear();
        console.log('Document analytics cache cleared');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocumentAnalytics;
} else {
    window.DocumentAnalytics = DocumentAnalytics;
}
