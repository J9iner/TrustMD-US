// TrustMD Connection Pool Manager
// Advanced database connection pooling with monitoring and optimization

class ConnectionPoolManager {
    constructor(supabaseClient, securityConfig) {
        this.supabaseClient = supabaseClient;
        this.securityConfig = securityConfig;
        this.isInitialized = false;
        this.poolConfig = null;
        this.activeConnections = new Map();
        this.connectionMetrics = new Map();
        this.healthCheckInterval = null;
        this.poolStats = {
            totalConnections: 0,
            activeConnections: 0,
            idleConnections: 0,
            waitingRequests: 0,
            totalQueries: 0,
            averageQueryTime: 0,
            errorCount: 0
        };
    }

    // Initialize connection pool
    async initialize() {
        try {
            // Load pool configuration
            await this.loadPoolConfiguration();
            
            // Setup connection pool
            await this.setupConnectionPool();
            
            // Start health checks
            await this.startHealthChecks();
            
            // Setup monitoring
            await this.setupMonitoring();
            
            this.isInitialized = true;
            console.log('Connection Pool Manager initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Connection Pool Manager:', error);
            throw error;
        }
    }

    // Load pool configuration
    async loadPoolConfiguration() {
        try {
            this.poolConfig = this.securityConfig.databaseSecurity.connectionPool;
            
            // Validate configuration
            if (!this.poolConfig.enabled) {
                console.log('Connection pooling disabled');
                return;
            }

            if (this.poolConfig.maxConnections < this.poolConfig.minConnections) {
                throw new Error('Max connections cannot be less than min connections');
            }

            console.log('Pool configuration loaded successfully');
        } catch (error) {
            console.error('Failed to load pool configuration:', error);
            throw error;
        }
    }

    // Setup connection pool
    async setupConnectionPool() {
        try {
            if (!this.poolConfig.enabled) {
                console.log('Connection pooling disabled - skipping setup');
                return;
            }

            // Create connection pool configuration
            const poolSettings = {
                max: this.poolConfig.maxConnections,
                min: this.poolConfig.minConnections,
                idleTimeoutMillis: this.poolConfig.idleTimeout,
                acquireTimeoutMillis: this.poolConfig.connectionTimeout,
                createTimeoutMillis: this.poolConfig.connectionTimeout,
                destroyTimeoutMillis: 5000,
                reapIntervalMillis: 1000,
                createRetryIntervalMillis: 200
            };

            // Initialize connection pool
            this.connectionPool = {
                settings: poolSettings,
                connections: new Array(poolSettings.max).fill(null),
                available: new Set(),
                inUse: new Set(),
                waiting: []
            };

            // Create minimum connections
            for (let i = 0; i < poolSettings.min; i++) {
                await this.createConnection(i);
            }

            console.log(`Connection pool setup completed with ${poolSettings.min} initial connections`);
        } catch (error) {
            console.error('Failed to setup connection pool:', error);
            throw error;
        }
    }

    // Create a new connection
    async createConnection(index) {
        try {
            const connection = {
                id: `conn_${index}_${Date.now()}`,
                index: index,
                created: new Date(),
                lastUsed: new Date(),
                queryCount: 0,
                isHealthy: true,
                client: this.supabaseClient
            };

            // Test connection health
            await this.testConnectionHealth(connection);

            this.connectionPool.connections[index] = connection;
            this.connectionPool.available.add(connection.id);
            this.poolStats.totalConnections++;
            this.poolStats.idleConnections++;

            return connection;
        } catch (error) {
            console.error(`Failed to create connection ${index}:`, error);
            throw error;
        }
    }

    // Test connection health
    async testConnectionHealth(connection) {
        try {
            const startTime = Date.now();
            
            // Simple health check query
            const { data, error } = await connection.client
                .from('information_schema.tables')
                .select('table_name')
                .limit(1);

            const responseTime = Date.now() - startTime;

            if (error) {
                connection.isHealthy = false;
                throw new Error(`Connection health check failed: ${error.message}`);
            }

            connection.isHealthy = true;
            connection.lastHealthCheck = new Date();
            connection.responseTime = responseTime;

            return true;
        } catch (error) {
            connection.isHealthy = false;
            throw error;
        }
    }

    // Acquire connection from pool
    async acquireConnection(timeout = this.poolConfig?.connectionTimeout || 10000) {
        try {
            if (!this.poolConfig.enabled) {
                // Return direct client if pooling disabled
                return {
                    id: 'direct',
                    client: this.supabaseClient,
                    release: () => {}
                };
            }

            const startTime = Date.now();
            
            // Check for available connection
            const availableConnection = this.getAvailableConnection();
            
            if (availableConnection) {
                this.connectionPool.available.delete(availableConnection.id);
                this.connectionPool.inUse.add(availableConnection.id);
                this.poolStats.activeConnections++;
                this.poolStats.idleConnections--;
                
                availableConnection.lastUsed = new Date();
                availableConnection.queryCount++;
                
                return {
                    id: availableConnection.id,
                    client: availableConnection.client,
                    connection: availableConnection,
                    release: () => this.releaseConnection(availableConnection.id)
                };
            }

            // No available connections, create new one if under max
            if (this.poolStats.totalConnections < this.poolConfig.maxConnections) {
                const newConnection = await this.createConnection(this.poolStats.totalConnections);
                this.connectionPool.available.delete(newConnection.id);
                this.connectionPool.inUse.add(newConnection.id);
                this.poolStats.activeConnections++;
                
                return {
                    id: newConnection.id,
                    client: newConnection.client,
                    connection: newConnection,
                    release: () => this.releaseConnection(newConnection.id)
                };
            }

            // Pool full, wait for available connection
            return await this.waitForConnection(timeout, startTime);
        } catch (error) {
            console.error('Failed to acquire connection:', error);
            this.poolStats.errorCount++;
            throw error;
        }
    }

    // Get available connection
    getAvailableConnection() {
        for (const connectionId of this.connectionPool.available) {
            const index = parseInt(connectionId.split('_')[1]);
            const connection = this.connectionPool.connections[index];
            
            if (connection && connection.isHealthy) {
                return connection;
            } else if (connection && !connection.isHealthy) {
                // Remove unhealthy connection
                this.connectionPool.available.delete(connectionId);
                this.connectionPool.connections[index] = null;
                this.poolStats.totalConnections--;
                this.poolStats.idleConnections--;
            }
        }
        return null;
    }

    // Wait for available connection
    async waitForConnection(timeout, startTime) {
        return new Promise((resolve, reject) => {
            const waitRequest = {
                resolve,
                reject,
                startTime,
                timeout
            };

            this.connectionPool.waiting.push(waitRequest);
            this.poolStats.waitingRequests++;

            // Set timeout
            setTimeout(() => {
                const index = this.connectionPool.waiting.indexOf(waitRequest);
                if (index > -1) {
                    this.connectionPool.waiting.splice(index, 1);
                    this.poolStats.waitingRequests--;
                    reject(new Error('Connection acquisition timeout'));
                }
            }, timeout);
        });
    }

    // Release connection back to pool
    async releaseConnection(connectionId) {
        try {
            const index = parseInt(connectionId.split('_')[1]);
            const connection = this.connectionPool.connections[index];
            
            if (!connection) {
                console.warn(`Attempted to release non-existent connection: ${connectionId}`);
                return;
            }

            // Test connection health before returning to pool
            try {
                await this.testConnectionHealth(connection);
                
                this.connectionPool.inUse.delete(connectionId);
                this.connectionPool.available.add(connectionId);
                this.poolStats.activeConnections--;
                this.poolStats.idleConnections++;
                
                // Process waiting requests
                this.processWaitingRequests();
                
            } catch (error) {
                // Connection unhealthy, remove from pool
                console.warn(`Unhealthy connection removed: ${connectionId}`);
                this.connectionPool.connections[index] = null;
                this.poolStats.totalConnections--;
                this.poolStats.activeConnections--;
                
                // Try to create new connection to maintain minimum
                if (this.poolStats.totalConnections < this.poolConfig.minConnections) {
                    await this.createConnection(index);
                }
            }
        } catch (error) {
            console.error('Failed to release connection:', error);
            this.poolStats.errorCount++;
        }
    }

    // Process waiting requests
    processWaitingRequests() {
        if (this.connectionPool.waiting.length === 0) {
            return;
        }

        const availableConnection = this.getAvailableConnection();
        if (!availableConnection) {
            return;
        }

        const waitRequest = this.connectionPool.waiting.shift();
        if (waitRequest) {
            this.connectionPool.available.delete(availableConnection.id);
            this.connectionPool.inUse.add(availableConnection.id);
            this.poolStats.activeConnections++;
            this.poolStats.idleConnections--;
            this.poolStats.waitingRequests--;

            availableConnection.lastUsed = new Date();
            availableConnection.queryCount++;

            waitRequest.resolve({
                id: availableConnection.id,
                client: availableConnection.client,
                connection: availableConnection,
                release: () => this.releaseConnection(availableConnection.id)
            });
        }
    }

    // Start health checks
    async startHealthChecks() {
        if (!this.poolConfig.enabled || !this.poolConfig.healthCheck.enabled) {
            return;
        }

        const interval = this.poolConfig.healthCheck.interval || 30000;
        
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthChecks();
        }, interval);

        console.log(`Health checks started with ${interval}ms interval`);
    }

    // Perform health checks on all connections
    async performHealthChecks() {
        try {
            const healthCheckPromises = [];
            
            for (let i = 0; i < this.connectionPool.connections.length; i++) {
                const connection = this.connectionPool.connections[i];
                if (connection && this.connectionPool.available.has(connection.id)) {
                    healthCheckPromises.push(this.checkConnectionHealth(connection));
                }
            }

            await Promise.allSettled(healthCheckPromises);
        } catch (error) {
            console.error('Health check failed:', error);
        }
    }

    // Check individual connection health
    async checkConnectionHealth(connection) {
        try {
            await this.testConnectionHealth(connection);
        } catch (error) {
            console.warn(`Connection ${connection.id} failed health check:`, error.message);
            connection.isHealthy = false;
            
            // Remove unhealthy connection
            const index = parseInt(connection.id.split('_')[1]);
            this.connectionPool.available.delete(connection.id);
            this.connectionPool.connections[index] = null;
            this.poolStats.totalConnections--;
            this.poolStats.idleConnections--;
            
            // Create replacement connection
            if (this.poolStats.totalConnections < this.poolConfig.maxConnections) {
                await this.createConnection(index);
            }
        }
    }

    // Setup monitoring
    async setupMonitoring() {
        try {
            // Setup metrics collection
            setInterval(() => {
                this.collectMetrics();
            }, 60000); // Collect metrics every minute

            console.log('Connection pool monitoring setup completed');
        } catch (error) {
            console.error('Failed to setup monitoring:', error);
        }
    }

    // Collect pool metrics
    collectMetrics() {
        try {
            const metrics = {
                timestamp: new Date().toISOString(),
                totalConnections: this.poolStats.totalConnections,
                activeConnections: this.poolStats.activeConnections,
                idleConnections: this.poolStats.idleConnections,
                waitingRequests: this.poolStats.waitingRequests,
                totalQueries: this.poolStats.totalQueries,
                averageQueryTime: this.poolStats.averageQueryTime,
                errorCount: this.poolStats.errorCount,
                utilizationRate: (this.poolStats.activeConnections / this.poolConfig.maxConnections) * 100
            };

            this.connectionMetrics.set(Date.now(), metrics);

            // Keep only last 24 hours of metrics
            const cutoff = Date.now() - (24 * 60 * 60 * 1000);
            for (const [timestamp] of this.connectionMetrics) {
                if (timestamp < cutoff) {
                    this.connectionMetrics.delete(timestamp);
                }
            }

            // Log warnings for concerning metrics
            if (metrics.utilizationRate > 90) {
                console.warn(`High connection pool utilization: ${metrics.utilizationRate.toFixed(1)}%`);
            }

            if (metrics.errorCount > 10) {
                console.warn(`High error count: ${metrics.errorCount}`);
            }

        } catch (error) {
            console.error('Failed to collect metrics:', error);
        }
    }

    // Execute query with connection from pool
    async executeQuery(queryFunction, options = {}) {
        const startTime = Date.now();
        let connection = null;
        
        try {
            // Acquire connection
            connection = await this.acquireConnection(options.timeout);
            
            // Execute query function
            const result = await queryFunction(connection.client);
            
            // Update metrics
            const queryTime = Date.now() - startTime;
            this.updateQueryMetrics(queryTime);
            
            return result;
        } catch (error) {
            console.error('Query execution failed:', error);
            this.poolStats.errorCount++;
            throw error;
        } finally {
            // Release connection
            if (connection) {
                await connection.release();
            }
        }
    }

    // Update query metrics
    updateQueryMetrics(queryTime) {
        this.poolStats.totalQueries++;
        
        // Calculate rolling average
        const alpha = 0.1; // Smoothing factor
        this.poolStats.averageQueryTime = 
            (alpha * queryTime) + ((1 - alpha) * this.poolStats.averageQueryTime);
    }

    // Get pool statistics
    getPoolStats() {
        return {
            ...this.poolStats,
            config: this.poolConfig,
            utilizationRate: this.poolConfig.enabled 
                ? (this.poolStats.activeConnections / this.poolConfig.maxConnections) * 100 
                : 0,
            efficiencyRate: this.poolConfig.enabled 
                ? (this.poolStats.idleConnections / this.poolStats.totalConnections) * 100 
                : 0
        };
    }

    // Get connection metrics history
    getMetricsHistory(hours = 24) {
        try {
            const cutoff = Date.now() - (hours * 60 * 60 * 1000);
            const history = [];
            
            for (const [timestamp, metrics] of this.connectionMetrics) {
                if (timestamp >= cutoff) {
                    history.push(metrics);
                }
            }
            
            return history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        } catch (error) {
            console.error('Failed to get metrics history:', error);
            return [];
        }
    }

    // Optimize pool configuration
    async optimizePool() {
        try {
            if (!this.poolConfig.enabled) {
                return { optimized: false, reason: 'Pool disabled' };
            }

            const stats = this.getPoolStats();
            const recommendations = [];

            // Analyze utilization
            if (stats.utilizationRate > 90) {
                recommendations.push({
                    type: 'increase_max_connections',
                    current: this.poolConfig.maxConnections,
                    suggested: Math.min(this.poolConfig.maxConnections + 10, 200),
                    reason: 'High utilization rate'
                });
            } else if (stats.utilizationRate < 20 && this.poolConfig.maxConnections > 20) {
                recommendations.push({
                    type: 'decrease_max_connections',
                    current: this.poolConfig.maxConnections,
                    suggested: Math.max(this.poolConfig.maxConnections - 5, this.poolConfig.minConnections),
                    reason: 'Low utilization rate'
                });
            }

            // Analyze efficiency
            if (stats.efficiencyRate > 80) {
                recommendations.push({
                    type: 'decrease_min_connections',
                    current: this.poolConfig.minConnections,
                    suggested: Math.max(this.poolConfig.minConnections - 2, 2),
                    reason: 'High idle connection rate'
                });
            }

            // Analyze error rate
            const errorRate = (stats.errorCount / Math.max(stats.totalQueries, 1)) * 100;
            if (errorRate > 5) {
                recommendations.push({
                    type: 'investigate_errors',
                    errorRate: errorRate.toFixed(2),
                    reason: 'High error rate detected'
                });
            }

            return {
                optimized: recommendations.length > 0,
                currentStats: stats,
                recommendations
            };
        } catch (error) {
            console.error('Failed to optimize pool:', error);
            return { optimized: false, error: error.message };
        }
    }

    // Close connection pool
    async close() {
        try {
            // Stop health checks
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
                this.healthCheckInterval = null;
            }

            // Close all connections
            if (this.connectionPool) {
                for (let i = 0; i < this.connectionPool.connections.length; i++) {
                    const connection = this.connectionPool.connections[i];
                    if (connection) {
                        // In a real implementation, would close the actual connection
                        console.log(`Closing connection: ${connection.id}`);
                    }
                }
            }

            console.log('Connection pool closed successfully');
        } catch (error) {
            console.error('Failed to close connection pool:', error);
            throw error;
        }
    }

    // Get system status
    getStatus() {
        return {
            initialized: this.isInitialized,
            enabled: this.poolConfig?.enabled || false,
            config: this.poolConfig,
            stats: this.getPoolStats()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConnectionPoolManager;
}
