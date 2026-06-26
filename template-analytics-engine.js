// TrustMD Template Analytics Engine
// Comprehensive analytics and usage tracking for compliance templates

class TemplateAnalyticsEngine {
    constructor(supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.analyticsConfig = null;
        this.eventQueue = [];
        this.aggregatedData = new Map();
        this.realtimeMetrics = new Map();
        this.currentUserId = null;
        this.currentTenantId = null;
        this.isInitialized = false;
    }

    // Initialize analytics engine
    async initialize() {
        try {
            // Load analytics configuration
            await this.loadConfiguration();
            
            // Initialize metrics collection
            await this.initializeMetrics();
            
            // Start background processing
            this.startEventProcessing();
            
            // Setup scheduled aggregations
            this.setupScheduledTasks();
            
            this.isInitialized = true;
            console.log('Template Analytics Engine initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing analytics engine:', error);
            return false;
        }
    }

    // Load analytics configuration
    async loadConfiguration() {
        try {
            const response = await fetch('/config/analytics-testing-config.json');
            if (response.ok) {
                this.analyticsConfig = await response.json();
                console.log('Analytics configuration loaded successfully');
            } else {
                console.warn('Failed to load analytics configuration, using defaults');
                this.analyticsConfig = this.getDefaultConfiguration();
            }
        } catch (error) {
            console.error('Error loading analytics configuration:', error);
            this.analyticsConfig = this.getDefaultConfiguration();
        }
    }

    // Get default configuration
    getDefaultConfiguration() {
        return {
            analytics: {
                enabled: true,
                tracking: {
                    templateUsage: { enabled: true },
                    userBehavior: { enabled: true },
                    systemMetrics: { enabled: true }
                },
                aggregation: {
                    levels: ["realtime", "hourly", "daily"],
                    retention: { realtime: 1, hourly: 24, daily: 90 }
                }
            }
        };
    }

    // Set user context for analytics
    setUserContext(userId, tenantId) {
        this.currentUserId = userId;
        this.currentTenantId = tenantId;
    }

    // Track template usage event
    async trackTemplateUsage(eventType, templateId, metadata = {}) {
        if (!this.isInitialized || !this.analyticsConfig.analytics.enabled) {
            return;
        }

        const event = {
            id: this.generateEventId(),
            type: 'template_usage',
            eventType,
            templateId,
            userId: this.currentUserId,
            tenantId: this.currentTenantId,
            timestamp: new Date().toISOString(),
            metadata: {
                ...metadata,
                userAgent: navigator.userAgent,
                sessionId: this.getSessionId(),
                referrer: document.referrer
            }
        };

        this.queueEvent(event);
        await this.updateRealtimeMetrics(event);
    }

    // Track user behavior event
    async trackUserBehavior(eventType, metadata = {}) {
        if (!this.isInitialized || !this.analyticsConfig.analytics.tracking.userBehavior.enabled) {
            return;
        }

        const event = {
            id: this.generateEventId(),
            type: 'user_behavior',
            eventType,
            userId: this.currentUserId,
            tenantId: this.currentTenantId,
            timestamp: new Date().toISOString(),
            metadata: {
                ...metadata,
                sessionId: this.getSessionId(),
                currentPath: window.location.pathname
            }
        };

        this.queueEvent(event);
    }

    // Track system metrics
    async trackSystemMetrics(metricType, value, metadata = {}) {
        if (!this.isInitialized || !this.analyticsConfig.analytics.tracking.systemMetrics.enabled) {
            return;
        }

        const event = {
            id: this.generateEventId(),
            type: 'system_metrics',
            metricType,
            value,
            tenantId: this.currentTenantId,
            timestamp: new Date().toISOString(),
            metadata
        };

        this.queueEvent(event);
    }

    // Track performance metrics
    async trackPerformance(operation, duration, metadata = {}) {
        await this.trackSystemMetrics('performance', duration, {
            operation,
            ...metadata
        });
    }

    // Track errors
    async trackError(error, context = {}) {
        await this.trackSystemMetrics('error', 1, {
            errorMessage: error.message,
            errorStack: error.stack,
            context,
            severity: error.severity || 'medium'
        });
    }

    // Queue event for processing
    queueEvent(event) {
        this.eventQueue.push(event);
        
        // Process queue if it reaches batch size
        const batchSize = this.analyticsConfig.analytics.aggregation.batchSize || 100;
        if (this.eventQueue.length >= batchSize) {
            this.processEventQueue();
        }
    }

    // Process event queue
    async processEventQueue() {
        if (this.eventQueue.length === 0) {
            return;
        }

        const events = [...this.eventQueue];
        this.eventQueue = [];

        try {
            // Store events in database
            await this.storeEvents(events);
            
            // Update aggregated metrics
            await this.updateAggregatedMetrics(events);
            
            // Trigger webhooks if configured
            await this.triggerWebhooks(events);
            
        } catch (error) {
            console.error('Error processing event queue:', error);
            // Re-queue events on failure
            this.eventQueue.unshift(...events);
        }
    }

    // Store events in database
    async storeEvents(events) {
        try {
            const { error } = await this.supabaseClient.supabase
                .from('analytics_events')
                .insert(events.map(event => ({
                    event_id: event.id,
                    event_type: event.type,
                    event_sub_type: event.eventType || event.metricType,
                    template_id: event.templateId,
                    user_id: event.userId,
                    tenant_id: event.tenantId,
                    timestamp: event.timestamp,
                    metadata: event.metadata,
                    value: event.value
                })));

            if (error) {
                throw new Error(`Failed to store events: ${error.message}`);
            }
        } catch (error) {
            console.error('Error storing events:', error);
            throw error;
        }
    }

    // Update aggregated metrics
    async updateAggregatedMetrics(events) {
        for (const event of events) {
            const key = this.getAggregationKey(event);
            const existing = this.aggregatedData.get(key) || {
                count: 0,
                sum: 0,
                min: Infinity,
                max: -Infinity,
                lastUpdated: new Date().toISOString()
            };

            existing.count++;
            if (event.value !== undefined) {
                existing.sum += event.value;
                existing.min = Math.min(existing.min, event.value);
                existing.max = Math.max(existing.max, event.value);
            }
            existing.lastUpdated = new Date().toISOString();

            this.aggregatedData.set(key, existing);
        }
    }

    // Get aggregation key for event
    getAggregationKey(event) {
        const date = new Date(event.timestamp);
        const hour = date.getHours();
        const day = date.toISOString().split('T')[0];
        
        return `${event.type}:${event.eventType || event.metricType}:${this.currentTenantId}:${day}:${hour}`;
    }

    // Update realtime metrics
    async updateRealtimeMetrics(event) {
        const key = `realtime:${event.type}:${event.eventType || event.metricType}`;
        const existing = this.realtimeMetrics.get(key) || {
            count: 0,
            lastUpdated: new Date().toISOString()
        };

        existing.count++;
        existing.lastUpdated = new Date().toISOString();

        // Keep only last hour of realtime data
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (new Date(existing.lastUpdated) < oneHourAgo) {
            this.realtimeMetrics.delete(key);
        } else {
            this.realtimeMetrics.set(key, existing);
        }
    }

    // Get analytics data for dashboards
    async getAnalyticsData(dashboardType, dateRange = {}) {
        try {
            const { startDate, endDate } = dateRange;
            
            switch (dashboardType) {
                case 'executive':
                    return await this.getExecutiveDashboardData(dateRange);
                case 'operational':
                    return await this.getOperationalDashboardData(dateRange);
                case 'compliance':
                    return await this.getComplianceDashboardData(dateRange);
                default:
                    throw new Error(`Unknown dashboard type: ${dashboardType}`);
            }
        } catch (error) {
            console.error('Error getting analytics data:', error);
            throw error;
        }
    }

    // Get executive dashboard data
    async getExecutiveDashboardData(dateRange) {
        const { startDate, endDate } = dateRange;
        
        // Get high-level metrics
        const [totalComplianceScore, templateAdoptionRate, userSatisfaction, systemHealth] = await Promise.all([
            this.getTotalComplianceScore(dateRange),
            this.getTemplateAdoptionRate(dateRange),
            this.getUserSatisfactionScore(dateRange),
            this.getSystemHealthScore(dateRange)
        ]);

        return {
            dashboardType: 'executive',
            dateRange,
            metrics: {
                totalComplianceScore,
                templateAdoptionRate,
                userSatisfaction,
                systemHealth,
                costSavings: await this.calculateCostSavings(dateRange)
            },
            trends: await this.getExecutiveTrends(dateRange),
            alerts: await this.getExecutiveAlerts()
        };
    }

    // Get operational dashboard data
    async getOperationalDashboardData(dateRange) {
        return {
            dashboardType: 'operational',
            dateRange,
            metrics: {
                templateUsageStats: await this.getTemplateUsageStats(dateRange),
                errorRates: await this.getErrorRates(dateRange),
                performanceMetrics: await this.getPerformanceMetrics(dateRange),
                userActivity: await this.getUserActivityStats(dateRange),
                systemAlerts: await this.getSystemAlerts(dateRange)
            },
            realtimeMetrics: this.getRealtimeMetrics()
        };
    }

    // Get compliance dashboard data
    async getComplianceDashboardData(dateRange) {
        return {
            dashboardType: 'compliance',
            dateRange,
            metrics: {
                complianceScores: await this.getComplianceScores(dateRange),
                gapAnalysis: await this.getGapAnalysis(dateRange),
                riskAssessment: await this.getRiskAssessment(dateRange),
                auditTrailSummary: await this.getAuditTrailSummary(dateRange),
                regulatoryChanges: await this.getRegulatoryChanges(dateRange)
            }
        };
    }

    // Get template usage statistics
    async getTemplateUsageStats(dateRange) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('analytics_events')
                .select('template_id, event_sub_type, metadata')
                .eq('event_type', 'template_usage')
                .gte('timestamp', dateRange.startDate || '1970-01-01')
                .lte('timestamp', dateRange.endDate || new Date().toISOString());

            if (error) {
                throw new Error(`Failed to get template usage stats: ${error.message}`);
            }

            const stats = {
                totalViews: 0,
                totalDownloads: 0,
                totalGenerations: 0,
                templateBreakdown: {},
                popularTemplates: [],
                averageSessionDuration: 0
            };

            data.forEach(event => {
                switch (event.event_sub_type) {
                    case 'template_view':
                        stats.totalViews++;
                        break;
                    case 'template_download':
                        stats.totalDownloads++;
                        break;
                    case 'report_generated':
                        stats.totalGenerations++;
                        break;
                }

                if (event.template_id) {
                    stats.templateBreakdown[event.template_id] = 
                        (stats.templateBreakdown[event.template_id] || 0) + 1;
                }
            });

            // Get popular templates
            stats.popularTemplates = Object.entries(stats.templateBreakdown)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([templateId, count]) => ({ templateId, count }));

            return stats;
        } catch (error) {
            console.error('Error getting template usage stats:', error);
            return null;
        }
    }

    // Get error rates
    async getErrorRates(dateRange) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('analytics_events')
                .select('timestamp, metadata')
                .eq('event_type', 'system_metrics')
                .eq('metric_type', 'error')
                .gte('timestamp', dateRange.startDate || '1970-01-01')
                .lte('timestamp', dateRange.endDate || new Date().toISOString());

            if (error) {
                throw new Error(`Failed to get error rates: ${error.message}`);
            }

            const totalEvents = data.length;
            const errorsBySeverity = {};
            const errorsOverTime = {};

            data.forEach(event => {
                const severity = event.metadata?.severity || 'medium';
                errorsBySeverity[severity] = (errorsBySeverity[severity] || 0) + 1;
                
                const hour = new Date(event.timestamp).toISOString().slice(0, 13);
                errorsOverTime[hour] = (errorsOverTime[hour] || 0) + 1;
            });

            return {
                totalErrors: totalEvents,
                errorRate: totalEvents > 0 ? (totalEvents / this.getTotalEvents(dateRange)) * 100 : 0,
                errorsBySeverity,
                errorsOverTime,
                topErrors: await this.getTopErrors(dateRange)
            };
        } catch (error) {
            console.error('Error getting error rates:', error);
            return null;
        }
    }

    // Get performance metrics
    async getPerformanceMetrics(dateRange) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('analytics_events')
                .select('metric_type, value, metadata')
                .eq('event_type', 'system_metrics')
                .eq('metric_type', 'performance')
                .gte('timestamp', dateRange.startDate || '1970-01-01')
                .lte('timestamp', dateRange.endDate || new Date().toISOString());

            if (error) {
                throw new Error(`Failed to get performance metrics: ${error.message}`);
            }

            const performanceByOperation = {};
            const responseTimes = [];

            data.forEach(event => {
                const operation = event.metadata?.operation || 'unknown';
                if (!performanceByOperation[operation]) {
                    performanceByOperation[operation] = [];
                }
                performanceByOperation[operation].push(event.value);
                responseTimes.push(event.value);
            });

            // Calculate statistics
            const stats = {};
            Object.entries(performanceByOperation).forEach(([operation, times]) => {
                stats[operation] = {
                    average: times.reduce((sum, time) => sum + time, 0) / times.length,
                    min: Math.min(...times),
                    max: Math.max(...times),
                    p95: this.calculatePercentile(times, 95),
                    count: times.length
                };
            });

            return {
                overall: {
                    averageResponseTime: responseTimes.length > 0 
                        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
                        : 0,
                    p95ResponseTime: this.calculatePercentile(responseTimes, 95),
                    totalRequests: responseTimes.length
                },
                byOperation: stats
            };
        } catch (error) {
            console.error('Error getting performance metrics:', error);
            return null;
        }
    }

    // Calculate percentile
    calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index];
    }

    // Get realtime metrics
    getRealtimeMetrics() {
        const metrics = {};
        this.realtimeMetrics.forEach((value, key) => {
            metrics[key] = value;
        });
        return metrics;
    }

    // Generate unique event ID
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get session ID
    getSessionId() {
        // In a real implementation, this would get from session storage or generate persistent ID
        return sessionStorage.getItem('analytics_session_id') || 
               this.generateSessionId();
    }

    // Generate session ID
    generateSessionId() {
        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('analytics_session_id', sessionId);
        return sessionId;
    }

    // Start event processing
    startEventProcessing() {
        // Process events every 5 minutes
        setInterval(() => {
            this.processEventQueue();
        }, 5 * 60 * 1000);

        // Cleanup old realtime data every hour
        setInterval(() => {
            this.cleanupRealtimeData();
        }, 60 * 60 * 1000);
    }

    // Cleanup old realtime data
    cleanupRealtimeData() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        for (const [key, value] of this.realtimeMetrics.entries()) {
            if (new Date(value.lastUpdated) < oneHourAgo) {
                this.realtimeMetrics.delete(key);
            }
        }
    }

    // Setup scheduled tasks
    setupScheduledTasks() {
        // Schedule hourly aggregations
        setInterval(() => {
            this.performHourlyAggregation();
        }, 60 * 60 * 1000);

        // Schedule daily aggregations
        setInterval(() => {
            this.performDailyAggregation();
        }, 24 * 60 * 60 * 1000);
    }

    // Perform hourly aggregation
    async performHourlyAggregation() {
        console.log('Performing hourly aggregation...');
        // Implementation for hourly data aggregation
    }

    // Perform daily aggregation
    async performDailyAggregation() {
        console.log('Performing daily aggregation...');
        // Implementation for daily data aggregation
    }

    // Placeholder methods for dashboard data
    async getTotalComplianceScore(dateRange) { return 85.5; }
    async getTemplateAdoptionRate(dateRange) { return 78.2; }
    async getUserSatisfactionScore(dateRange) { return 4.2; }
    async getSystemHealthScore(dateRange) { return 96.8; }
    async calculateCostSavings(dateRange) { return 125000; }
    async getExecutiveTrends(dateRange) { return {}; }
    async getExecutiveAlerts() { return []; }
    async getUserActivityStats(dateRange) { return {}; }
    async getSystemAlerts(dateRange) { return []; }
    async getComplianceScores(dateRange) { return {}; }
    async getGapAnalysis(dateRange) { return {}; }
    async getRiskAssessment(dateRange) { return {}; }
    async getAuditTrailSummary(dateRange) { return {}; }
    async getRegulatoryChanges(dateRange) { return []; }
    async getTopErrors(dateRange) { return []; }
    async getTotalEvents(dateRange) { return 1000; }
    async triggerWebhooks(events) { /* Implementation */ }
    async initializeMetrics() { /* Implementation */ }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateAnalyticsEngine;
}
