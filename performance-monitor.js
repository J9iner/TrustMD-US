// TrustMD Performance Monitoring System
// Comprehensive system performance tracking, alerting, and optimization

class PerformanceMonitor {
    constructor(supabaseClient, securityConfig) {
        this.supabaseClient = supabaseClient;
        this.securityConfig = securityConfig;
        this.isInitialized = false;
        this.performanceConfig = null;
        this.metrics = new Map();
        this.alerts = [];
        this.monitoringInterval = null;
        this.thresholds = {};
    }

    // Initialize performance monitoring
    async initialize() {
        try {
            // Load performance configuration
            await this.loadPerformanceConfiguration();
            
            // Setup monitoring tables
            await this.setupMonitoringTables();
            
            // Setup metrics collection
            await this.setupMetricsCollection();
            
            // Setup alerting system
            await this.setupAlertingSystem();
            
            // Start monitoring
            await this.startMonitoring();
            
            this.isInitialized = true;
            console.log('Performance Monitor initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Performance Monitor:', error);
            throw error;
        }
    }

    // Load performance configuration
    async loadPerformanceConfiguration() {
        try {
            this.performanceConfig = this.securityConfig.performance;
            this.thresholds = this.performanceConfig.thresholds;
            
            console.log('Performance configuration loaded successfully');
        } catch (error) {
            console.error('Failed to load performance configuration:', error);
            throw error;
        }
    }

    // Setup monitoring tables
    async setupMonitoringTables() {
        try {
            // Create performance metrics table
            await this.supabaseClient.supabase.sql`
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    metric_name TEXT NOT NULL,
                    metric_value NUMERIC NOT NULL,
                    metric_unit TEXT,
                    tags JSONB,
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    tenant_id UUID REFERENCES tenants(id),
                    source TEXT DEFAULT 'system'
                );
            `;

            // Create performance alerts table
            await this.supabaseClient.supabase.sql`
                CREATE TABLE IF NOT EXISTS performance_alerts (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    alert_type TEXT NOT NULL,
                    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
                    message TEXT NOT NULL,
                    metric_name TEXT NOT NULL,
                    current_value NUMERIC,
                    threshold_value NUMERIC,
                    tags JSONB,
                    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    acknowledged_at TIMESTAMP WITH TIME ZONE,
                    resolved_at TIMESTAMP WITH TIME ZONE,
                    acknowledged_by UUID REFERENCES users(id),
                    resolved_by UUID REFERENCES users(id),
                    tenant_id UUID REFERENCES tenants(id)
                );
            `;

            // Create performance summary table
            await this.supabaseClient.supabase.sql`
                CREATE TABLE IF NOT EXISTS performance_summary (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    summary_period TEXT NOT NULL CHECK (summary_period IN ('hourly', 'daily', 'weekly', 'monthly')),
                    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
                    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
                    metrics_summary JSONB NOT NULL,
                    alerts_count INTEGER DEFAULT 0,
                    tenant_id UUID REFERENCES tenants(id),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `;

            // Create indexes for performance
            await this.supabaseClient.supabase.sql`
                CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp 
                ON performance_metrics(timestamp DESC);
                
                CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_timestamp 
                ON performance_metrics(metric_name, timestamp DESC);
                
                CREATE INDEX IF NOT EXISTS idx_performance_alerts_status 
                ON performance_alerts(status, created_at DESC);
                
                CREATE INDEX IF NOT EXISTS idx_performance_summary_period 
                ON performance_summary(summary_period, period_start DESC);
            `;

            console.log('Monitoring tables created successfully');
        } catch (error) {
            console.error('Failed to setup monitoring tables:', error);
            throw error;
        }
    }

    // Setup metrics collection
    async setupMetricsCollection() {
        try {
            // Create metrics collection functions
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION collect_metric(
                    metric_name TEXT,
                    metric_value NUMERIC,
                    metric_unit TEXT DEFAULT NULL,
                    tags JSONB DEFAULT NULL,
                    tenant_id UUID DEFAULT NULL
                ) RETURNS UUID AS $$
                DECLARE
                    metric_id UUID;
                BEGIN
                    INSERT INTO performance_metrics (
                        metric_name, metric_value, metric_unit, tags, tenant_id
                    ) VALUES (
                        collect_metric.metric_name,
                        collect_metric.metric_value,
                        collect_metric.metric_unit,
                        collect_metric.tags,
                        collect_metric.tenant_id
                    ) RETURNING id INTO metric_id;
                    
                    RETURN metric_id;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            // Create batch metrics collection
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION collect_metrics_batch(
                    metrics JSONB
                ) RETURNS INTEGER AS $$
                DECLARE
                    metric_count INTEGER := 0;
                    metric_record JSONB;
                BEGIN
                    FOR metric_record IN SELECT * FROM jsonb_array_elements(metrics)
                    LOOP
                        INSERT INTO performance_metrics (
                            metric_name, metric_value, metric_unit, tags, tenant_id
                        ) VALUES (
                            metric_record->>'metric_name',
                            (metric_record->>'metric_value')::NUMERIC,
                            metric_record->>'metric_unit',
                            metric_record->'tags',
                            (metric_record->>'tenant_id')::UUID
                        );
                        
                        metric_count := metric_count + 1;
                    END LOOP;
                    
                    RETURN metric_count;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            console.log('Metrics collection setup completed');
        } catch (error) {
            console.error('Failed to setup metrics collection:', error);
            throw error;
        }
    }

    // Setup alerting system
    async setupAlertingSystem() {
        try {
            // Create alert function
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION create_performance_alert(
                    alert_type TEXT,
                    severity TEXT,
                    message TEXT,
                    metric_name TEXT,
                    current_value NUMERIC,
                    threshold_value NUMERIC,
                    tags JSONB DEFAULT NULL,
                    tenant_id UUID DEFAULT NULL
                ) RETURNS UUID AS $$
                DECLARE
                    alert_id UUID;
                BEGIN
                    INSERT INTO performance_alerts (
                        alert_type, severity, message, metric_name, 
                        current_value, threshold_value, tags, tenant_id
                    ) VALUES (
                        create_performance_alert.alert_type,
                        create_performance_alert.severity,
                        create_performance_alert.message,
                        create_performance_alert.metric_name,
                        create_performance_alert.current_value,
                        create_performance_alert.threshold_value,
                        create_performance_alert.tags,
                        create_performance_alert.tenant_id
                    ) RETURNING id INTO alert_id;
                    
                    RETURN alert_id;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            // Create alert checking function
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION check_performance_thresholds()
                RETURNS INTEGER AS $$
                DECLARE
                    alert_count INTEGER := 0;
                    current_value NUMERIC;
                    threshold_value NUMERIC;
                    alert_message TEXT;
                BEGIN
                    -- Check query time threshold
                    SELECT AVG(metric_value::NUMERIC) INTO current_value
                    FROM performance_metrics
                    WHERE metric_name = 'query_time'
                    AND timestamp > NOW() - INTERVAL '5 minutes';
                    
                    IF current_value > ${this.thresholds.queryTime} THEN
                        alert_message := 'Average query time (' || current_value || 'ms) exceeds threshold (' || ${this.thresholds.queryTime} || 'ms)';
                        
                        INSERT INTO performance_alerts (
                            alert_type, severity, message, metric_name, 
                            current_value, threshold_value
                        ) VALUES (
                            'threshold_exceeded', 'high', alert_message,
                            'query_time', current_value, ${this.thresholds.queryTime}
                        );
                        
                        alert_count := alert_count + 1;
                    END IF;
                    
                    -- Check connection pool threshold
                    SELECT AVG(metric_value::NUMERIC) INTO current_value
                    FROM performance_metrics
                    WHERE metric_name = 'connection_pool_utilization'
                    AND timestamp > NOW() - INTERVAL '5 minutes';
                    
                    IF current_value > ${this.thresholds.connectionPool} THEN
                        alert_message := 'Connection pool utilization (' || current_value || '%) exceeds threshold (' || ${this.thresholds.connectionPool} || '%)';
                        
                        INSERT INTO performance_alerts (
                            alert_type, severity, message, metric_name, 
                            current_value, threshold_value
                        ) VALUES (
                            'threshold_exceeded', 'medium', alert_message,
                            'connection_pool_utilization', current_value, ${this.thresholds.connectionPool}
                        );
                        
                        alert_count := alert_count + 1;
                    END IF;
                    
                    RETURN alert_count;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            console.log('Alerting system setup completed');
        } catch (error) {
            console.error('Failed to setup alerting system:', error);
            throw error;
        }
    }

    // Start monitoring
    async startMonitoring() {
        try {
            if (!this.performanceConfig.monitoring.enabled) {
                console.log('Performance monitoring disabled');
                return;
            }

            const interval = this.performanceConfig.monitoring.metricsInterval || 30000;
            
            this.monitoringInterval = setInterval(async () => {
                await this.collectSystemMetrics();
                await this.checkThresholds();
            }, interval);

            console.log(`Performance monitoring started with ${interval}ms interval`);
        } catch (error) {
            console.error('Failed to start monitoring:', error);
            throw error;
        }
    }

    // Collect system metrics
    async collectSystemMetrics() {
        try {
            const metrics = [];
            const timestamp = new Date().toISOString();

            // Database query time
            const queryTime = await this.measureQueryTime();
            metrics.push({
                metric_name: 'query_time',
                metric_value: queryTime,
                metric_unit: 'ms',
                timestamp,
                source: 'database'
            });

            // Connection pool utilization
            const poolUtilization = await this.getConnectionPoolUtilization();
            metrics.push({
                metric_name: 'connection_pool_utilization',
                metric_value: poolUtilization,
                metric_unit: '%',
                timestamp,
                source: 'database'
            });

            // Cache hit rate
            const cacheHitRate = await this.getCacheHitRate();
            metrics.push({
                metric_name: 'cache_hit_rate',
                metric_value: cacheHitRate,
                metric_unit: '%',
                timestamp,
                source: 'cache'
            });

            // Memory usage
            const memoryUsage = await this.getMemoryUsage();
            metrics.push({
                metric_name: 'memory_usage',
                metric_value: memoryUsage,
                metric_unit: '%',
                timestamp,
                source: 'system'
            });

            // CPU usage
            const cpuUsage = await this.getCPUUsage();
            metrics.push({
                metric_name: 'cpu_usage',
                metric_value: cpuUsage,
                metric_unit: '%',
                timestamp,
                source: 'system'
            });

            // Store metrics
            await this.storeMetrics(metrics);

            // Cache metrics locally
            for (const metric of metrics) {
                this.metrics.set(`${metric.metric_name}_${Date.now()}`, metric);
            }

            // Keep only last 1000 metrics in memory
            if (this.metrics.size > 1000) {
                const entries = Array.from(this.metrics.entries());
                this.metrics.clear();
                entries.slice(-1000).forEach(([key, value]) => {
                    this.metrics.set(key, value);
                });
            }

        } catch (error) {
            console.error('Failed to collect system metrics:', error);
        }
    }

    // Measure query time
    async measureQueryTime() {
        try {
            const startTime = Date.now();
            
            await this.supabaseClient.supabase
                .from('information_schema.tables')
                .select('table_name')
                .limit(1);
            
            return Date.now() - startTime;
        } catch (error) {
            console.error('Failed to measure query time:', error);
            return 0;
        }
    }

    // Get connection pool utilization
    async getConnectionPoolUtilization() {
        try {
            // This would integrate with the connection pool manager
            // For now, return a mock value
            return Math.random() * 100;
        } catch (error) {
            console.error('Failed to get connection pool utilization:', error);
            return 0;
        }
    }

    // Get cache hit rate
    async getCacheHitRate() {
        try {
            // This would integrate with cache systems
            // For now, return a mock value
            return 85 + Math.random() * 15; // 85-100%
        } catch (error) {
            console.error('Failed to get cache hit rate:', error);
            return 0;
        }
    }

    // Get memory usage
    async getMemoryUsage() {
        try {
            if (typeof process !== 'undefined' && process.memoryUsage) {
                const usage = process.memoryUsage();
                return (usage.heapUsed / usage.heapTotal) * 100;
            }
            return Math.random() * 100;
        } catch (error) {
            console.error('Failed to get memory usage:', error);
            return 0;
        }
    }

    // Get CPU usage
    async getCPUUsage() {
        try {
            // This would use system monitoring libraries
            // For now, return a mock value
            return Math.random() * 100;
        } catch (error) {
            console.error('Failed to get CPU usage:', error);
            return 0;
        }
    }

    // Store metrics
    async storeMetrics(metrics) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .rpc('collect_metrics_batch', {
                    metrics: metrics
                });

            if (error) {
                console.error('Failed to store metrics:', error);
            }

            return data;
        } catch (error) {
            console.error('Failed to store metrics:', error);
        }
    }

    // Check thresholds
    async checkThresholds() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .rpc('check_performance_thresholds');

            if (error) {
                console.error('Failed to check thresholds:', error);
            }

            if (data > 0) {
                console.log(`${data} performance alerts generated`);
            }

            return data;
        } catch (error) {
            console.error('Failed to check thresholds:', error);
        }
    }

    // Record custom metric
    async recordMetric(name, value, unit = null, tags = {}, tenantId = null) {
        try {
            const metric = {
                metric_name: name,
                metric_value: value,
                metric_unit: unit,
                tags: tags,
                timestamp: new Date().toISOString(),
                source: 'custom'
            };

            await this.storeMetrics([metric]);
            
            // Cache locally
            this.metrics.set(`${name}_${Date.now()}`, metric);

            // Check if threshold exceeded
            if (this.thresholds[name] && value > this.thresholds[name]) {
                await this.createAlert(
                    'threshold_exceeded',
                    'medium',
                    `Metric ${name} (${value}) exceeds threshold (${this.thresholds[name]})`,
                    name,
                    value,
                    this.thresholds[name],
                    tags,
                    tenantId
                );
            }

            return metric;
        } catch (error) {
            console.error('Failed to record metric:', error);
            throw error;
        }
    }

    // Create alert
    async createAlert(type, severity, message, metricName, currentValue, thresholdValue, tags = {}, tenantId = null) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .rpc('create_performance_alert', {
                    alert_type: type,
                    severity: severity,
                    message: message,
                    metric_name: metricName,
                    current_value: currentValue,
                    threshold_value: thresholdValue,
                    tags: tags,
                    tenant_id: tenantId
                });

            if (error) {
                console.error('Failed to create alert:', error);
            }

            const alert = {
                id: data,
                type,
                severity,
                message,
                metricName,
                currentValue,
                thresholdValue,
                tags,
                tenantId,
                createdAt: new Date().toISOString(),
                status: 'active'
            };

            this.alerts.push(alert);

            // Log alert
            console.warn(`Performance Alert [${severity.toUpperCase()}]: ${message}`);

            return alert;
        } catch (error) {
            console.error('Failed to create alert:', error);
            throw error;
        }
    }

    // Get metrics history
    async getMetricsHistory(metricName, hours = 24, tenantId = null) {
        try {
            const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
            
            let query = this.supabaseClient.supabase
                .from('performance_metrics')
                .select('*')
                .eq('metric_name', metricName)
                .gte('timestamp', startTime)
                .order('timestamp', { ascending: true });

            if (tenantId) {
                query = query.eq('tenant_id', tenantId);
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(`Failed to get metrics history: ${error.message}`);
            }

            return data || [];
        } catch (error) {
            console.error('Failed to get metrics history:', error);
            throw error;
        }
    }

    // Get active alerts
    async getActiveAlerts(tenantId = null) {
        try {
            let query = this.supabaseClient.supabase
                .from('performance_alerts')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (tenantId) {
                query = query.eq('tenant_id', tenantId);
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(`Failed to get active alerts: ${error.message}`);
            }

            return data || [];
        } catch (error) {
            console.error('Failed to get active alerts:', error);
            throw error;
        }
    }

    // Acknowledge alert
    async acknowledgeAlert(alertId, userId) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('performance_alerts')
                .update({
                    status: 'acknowledged',
                    acknowledged_at: new Date().toISOString(),
                    acknowledged_by: userId
                })
                .eq('id', alertId)
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to acknowledge alert: ${error.message}`);
            }

            // Update local cache
            const alertIndex = this.alerts.findIndex(a => a.id === alertId);
            if (alertIndex !== -1) {
                this.alerts[alertIndex] = { ...this.alerts[alertIndex], ...data };
            }

            console.log(`Alert acknowledged: ${alertId}`);
            return data;
        } catch (error) {
            console.error('Failed to acknowledge alert:', error);
            throw error;
        }
    }

    // Resolve alert
    async resolveAlert(alertId, userId) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('performance_alerts')
                .update({
                    status: 'resolved',
                    resolved_at: new Date().toISOString(),
                    resolved_by: userId
                })
                .eq('id', alertId)
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to resolve alert: ${error.message}`);
            }

            // Update local cache
            const alertIndex = this.alerts.findIndex(a => a.id === alertId);
            if (alertIndex !== -1) {
                this.alerts[alertIndex] = { ...this.alerts[alertIndex], ...data };
            }

            console.log(`Alert resolved: ${alertId}`);
            return data;
        } catch (error) {
            console.error('Failed to resolve alert:', error);
            throw error;
        }
    }

    // Generate performance report
    async generatePerformanceReport(period = 'daily', tenantId = null) {
        try {
            const endTime = new Date();
            let startTime;

            switch (period) {
                case 'hourly':
                    startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
                    break;
                case 'daily':
                    startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case 'weekly':
                    startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'monthly':
                    startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
            }

            // Get metrics for the period
            const { data: metrics, error: metricsError } = await this.supabaseClient.supabase
                .from('performance_metrics')
                .select('*')
                .gte('timestamp', startTime.toISOString())
                .lte('timestamp', endTime.toISOString());

            if (metricsError) {
                throw new Error(`Failed to get metrics for report: ${metricsError.message}`);
            }

            // Get alerts for the period
            const { data: alerts, error: alertsError } = await this.supabaseClient.supabase
                .from('performance_alerts')
                .select('*')
                .gte('created_at', startTime.toISOString())
                .lte('created_at', endTime.toISOString());

            if (alertsError) {
                throw new Error(`Failed to get alerts for report: ${alertsError.message}`);
            }

            // Process metrics
            const metricsSummary = {};
            if (metrics) {
                for (const metric of metrics) {
                    if (!metricsSummary[metric.metric_name]) {
                        metricsSummary[metric.metric_name] = {
                            count: 0,
                            sum: 0,
                            min: Infinity,
                            max: -Infinity,
                            avg: 0
                        };
                    }

                    const summary = metricsSummary[metric.metric_name];
                    summary.count++;
                    summary.sum += metric.metric_value;
                    summary.min = Math.min(summary.min, metric.metric_value);
                    summary.max = Math.max(summary.max, metric.metric_value);
                    summary.avg = summary.sum / summary.count;
                }
            }

            // Process alerts
            const alertsSummary = {
                total: alerts?.length || 0,
                bySeverity: {
                    low: 0,
                    medium: 0,
                    high: 0,
                    critical: 0
                },
                byType: {}
            };

            if (alerts) {
                for (const alert of alerts) {
                    alertsSummary.bySeverity[alert.severity]++;
                    
                    if (!alertsSummary.byType[alert.alert_type]) {
                        alertsSummary.byType[alert.alert_type] = 0;
                    }
                    alertsSummary.byType[alert.alert_type]++;
                }
            }

            const report = {
                period,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                metricsSummary,
                alertsSummary,
                generatedAt: new Date().toISOString()
            };

            // Store summary
            await this.supabaseClient.supabase
                .from('performance_summary')
                .insert({
                    summary_period: period,
                    period_start: startTime.toISOString(),
                    period_end: endTime.toISOString(),
                    metrics_summary: metricsSummary,
                    alerts_count: alertsSummary.total,
                    tenant_id: tenantId
                });

            return report;
        } catch (error) {
            console.error('Failed to generate performance report:', error);
            throw error;
        }
    }

    // Stop monitoring
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('Performance monitoring stopped');
        }
    }

    // Get system status
    getStatus() {
        return {
            initialized: this.isInitialized,
            monitoring: this.performanceConfig?.monitoring?.enabled || false,
            metricsCollected: this.metrics.size,
            activeAlerts: this.alerts.filter(a => a.status === 'active').length,
            thresholds: this.thresholds,
            monitoringInterval: this.monitoringInterval ? 'active' : 'inactive'
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
}
