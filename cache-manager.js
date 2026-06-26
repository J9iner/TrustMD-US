// TrustMD Cache Manager
// Advanced caching system with validation, security, and performance optimization

class CacheManager {
    constructor(supabaseClient, securityConfig) {
        this.supabaseClient = supabaseClient;
        this.securityConfig = securityConfig;
        this.isInitialized = false;
        this.cacheConfig = null;
        this.memoryCache = new Map();
        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            errors: 0
        };
        this.validationRules = new Map();
        this.securityPolicies = new Map();
    }

    // Initialize cache manager
    async initialize() {
        try {
            // Load cache configuration
            await this.loadCacheConfiguration();
            
            // Setup cache infrastructure
            await this.setupCacheInfrastructure();
            
            // Setup validation rules
            await this.setupValidationRules();
            
            // Setup security policies
            await this.setupSecurityPolicies();
            
            // Start cache maintenance
            await this.startCacheMaintenance();
            
            this.isInitialized = true;
            console.log('Cache Manager initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Cache Manager:', error);
            throw error;
        }
    }

    // Load cache configuration
    async loadCacheConfiguration() {
        try {
            this.cacheConfig = this.securityConfig.performance.caching;
            
            console.log('Cache configuration loaded successfully');
        } catch (error) {
            console.error('Failed to load cache configuration:', error);
            throw error;
        }
    }

    // Setup cache infrastructure
    async setupCacheInfrastructure() {
        try {
            if (!this.cacheConfig.enabled) {
                console.log('Caching disabled');
                return;
            }

            // Create cache tables
            await this.supabaseClient.supabase.sql`
                CREATE TABLE IF NOT EXISTS cache_entries (
                    cache_key TEXT PRIMARY KEY,
                    cache_value BYTEA NOT NULL,
                    cache_metadata JSONB,
                    tenant_id UUID REFERENCES tenants(id),
                    user_id UUID REFERENCES users(id),
                    expires_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    access_count INTEGER DEFAULT 0,
                    checksum TEXT,
                    encrypted BOOLEAN DEFAULT false
                );
            `;

            // Create cache validation table
            await this.supabaseClient.supabase.sql`
                CREATE TABLE IF NOT EXISTS cache_validation_rules (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    rule_name TEXT NOT NULL UNIQUE,
                    cache_pattern TEXT NOT NULL,
                    validation_function TEXT NOT NULL,
                    enabled BOOLEAN DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `;

            // Create cache security policies table
            await this.supabaseClient.supabase.sql`
                CREATE TABLE IF NOT EXISTS cache_security_policies (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    policy_name TEXT NOT NULL UNIQUE,
                    cache_pattern TEXT NOT NULL,
                    access_rules JSONB NOT NULL,
                    encryption_required BOOLEAN DEFAULT false,
                    tenant_isolation BOOLEAN DEFAULT true,
                    enabled BOOLEAN DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `;

            // Create indexes
            await this.supabaseClient.supabase.sql`
                CREATE INDEX IF NOT EXISTS idx_cache_entries_expires_at 
                ON cache_entries(expires_at);
                
                CREATE INDEX IF NOT EXISTS idx_cache_entries_tenant 
                ON cache_entries(tenant_id, expires_at);
                
                CREATE INDEX IF NOT EXISTS idx_cache_entries_accessed_at 
                ON cache_entries(accessed_at DESC);
            `;

            // Enable RLS on cache tables
            await this.supabaseClient.supabase.sql`
                ALTER TABLE cache_entries ENABLE ROW LEVEL SECURITY;
                ALTER TABLE cache_validation_rules ENABLE ROW LEVEL SECURITY;
                ALTER TABLE cache_security_policies ENABLE ROW LEVEL SECURITY;
            `;

            // Create cache functions
            await this.createCacheFunctions();

            console.log('Cache infrastructure setup completed');
        } catch (error) {
            console.error('Failed to setup cache infrastructure:', error);
            throw error;
        }
    }

    // Create cache functions
    async createCacheFunctions() {
        try {
            // Cache get function
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION cache_get(cache_key TEXT, tenant_id UUID DEFAULT NULL)
                RETURNS BYTEA AS $$
                DECLARE
                    cache_value BYTEA;
                    cache_metadata JSONB;
                BEGIN
                    -- Get cache entry
                    SELECT value, metadata INTO cache_value, cache_metadata
                    FROM cache_entries
                    WHERE cache_entries.cache_key = cache_get.cache_key
                    AND (tenant_id IS NULL OR cache_entries.tenant_id = cache_get.tenant_id)
                    AND (expires_at IS NULL OR expires_at > NOW())
                    FOR UPDATE;
                    
                    -- Update access statistics
                    IF cache_value IS NOT NULL THEN
                        UPDATE cache_entries
                        SET accessed_at = NOW(),
                            access_count = access_count + 1
                        WHERE cache_key = cache_get.cache_key;
                    END IF;
                    
                    RETURN cache_value;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            // Cache set function
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION cache_set(
                    cache_key TEXT,
                    cache_value BYTEA,
                    cache_metadata JSONB DEFAULT NULL,
                    tenant_id UUID DEFAULT NULL,
                    ttl_seconds INTEGER DEFAULT NULL,
                    encrypted BOOLEAN DEFAULT false
                ) RETURNS BOOLEAN AS $$
                DECLARE
                    expires_at TIMESTAMP WITH TIME ZONE;
                    checksum TEXT;
                BEGIN
                    -- Calculate expiration
                    IF ttl_seconds IS NOT NULL THEN
                        expires_at := NOW() + (ttl_seconds || ' seconds')::INTERVAL;
                    END IF;
                    
                    -- Calculate checksum
                    checksum := encode(sha256(cache_value), 'hex');
                    
                    -- Upsert cache entry
                    INSERT INTO cache_entries (
                        cache_key, cache_value, cache_metadata, tenant_id, 
                        expires_at, checksum, encrypted
                    ) VALUES (
                        cache_set.cache_key, cache_set.cache_value, cache_set.cache_metadata,
                        cache_set.tenant_id, expires_at, checksum, cache_set.encrypted
                    )
                    ON CONFLICT (cache_key) DO UPDATE SET
                        cache_value = EXCLUDED.cache_value,
                        cache_metadata = EXCLUDED.cache_metadata,
                        expires_at = EXCLUDED.expires_at,
                        checksum = EXCLUDED.checksum,
                        encrypted = EXCLUDED.encrypted,
                        accessed_at = NOW(),
                        access_count = 0;
                    
                    RETURN TRUE;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            // Cache delete function
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION cache_delete(cache_key TEXT, tenant_id UUID DEFAULT NULL)
                RETURNS BOOLEAN AS $$
                DECLARE
                    deleted_count INTEGER;
                BEGIN
                    DELETE FROM cache_entries
                    WHERE cache_key = cache_delete.cache_key
                    AND (tenant_id IS NULL OR cache_entries.tenant_id = cache_delete.tenant_id);
                    
                    GET DIAGNOSTICS deleted_count = ROW_COUNT;
                    RETURN deleted_count > 0;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            // Cache cleanup function
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION cache_cleanup()
                RETURNS INTEGER AS $$
                DECLARE
                    deleted_count INTEGER;
                    max_size INTEGER := ${this.cacheConfig.maxSize};
                BEGIN
                    -- Delete expired entries
                    DELETE FROM cache_entries WHERE expires_at <= NOW();
                    
                    GET DIAGNOSTICS deleted_count = ROW_COUNT;
                    
                    -- If still over max size, delete least recently used
                    WHILE (SELECT COUNT(*) FROM cache_entries) > max_size LOOP
                        DELETE FROM cache_entries
                        WHERE ctid IN (
                            SELECT ctid FROM cache_entries
                            ORDER BY accessed_at ASC
                            LIMIT 100
                        );
                    END LOOP;
                    
                    RETURN deleted_count;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            console.log('Cache functions created successfully');
        } catch (error) {
            console.error('Failed to create cache functions:', error);
            throw error;
        }
    }

    // Setup validation rules
    async setupValidationRules() {
        try {
            // Default validation rules
            const defaultRules = [
                {
                    rule_name: 'json_structure_validation',
                    cache_pattern: 'json_*',
                    validation_function: 'validate_json_structure',
                    enabled: true
                },
                {
                    rule_name: 'user_permissions_validation',
                    cache_pattern: 'user_permissions_*',
                    validation_function: 'validate_user_permissions',
                    enabled: true
                },
                {
                    rule_name: 'template_content_validation',
                    cache_pattern: 'template_*',
                    validation_function: 'validate_template_content',
                    enabled: true
                },
                {
                    rule_name: 'session_data_validation',
                    cache_pattern: 'session_*',
                    validation_function: 'validate_session_data',
                    enabled: true
                }
            ];

            for (const rule of defaultRules) {
                await this.supabaseClient.supabase
                    .from('cache_validation_rules')
                    .upsert(rule, { onConflict: 'rule_name' });
            }

            // Load validation rules into memory
            const { data, error } = await this.supabaseClient.supabase
                .from('cache_validation_rules')
                .select('*')
                .eq('enabled', true);

            if (error) {
                throw new Error(`Failed to load validation rules: ${error.message}`);
            }

            for (const rule of data) {
                this.validationRules.set(rule.cache_pattern, rule);
            }

            console.log('Validation rules setup completed');
        } catch (error) {
            console.error('Failed to setup validation rules:', error);
            throw error;
        }
    }

    // Setup security policies
    async setupSecurityPolicies() {
        try {
            // Default security policies
            const defaultPolicies = [
                {
                    policy_name: 'user_data_isolation',
                    cache_pattern: 'user_*',
                    access_rules: { require_user_id: true, tenant_isolation: true },
                    encryption_required: true,
                    tenant_isolation: true,
                    enabled: true
                },
                {
                    policy_name: 'template_access_control',
                    cache_pattern: 'template_*',
                    access_rules: { require_permissions: ['read'], tenant_isolation: true },
                    encryption_required: true,
                    tenant_isolation: true,
                    enabled: true
                },
                {
                    policy_name: 'session_security',
                    cache_pattern: 'session_*',
                    access_rules: { require_user_id: true, tenant_isolation: false },
                    encryption_required: true,
                    tenant_isolation: false,
                    enabled: true
                },
                {
                    policy_name: 'system_cache_access',
                    cache_pattern: 'system_*',
                    access_rules: { require_admin: true },
                    encryption_required: false,
                    tenant_isolation: false,
                    enabled: true
                }
            ];

            for (const policy of defaultPolicies) {
                await this.supabaseClient.supabase
                    .from('cache_security_policies')
                    .upsert(policy, { onConflict: 'policy_name' });
            }

            // Load security policies into memory
            const { data, error } = await this.supabaseClient.supabase
                .from('cache_security_policies')
                .select('*')
                .eq('enabled', true);

            if (error) {
                throw new Error(`Failed to load security policies: ${error.message}`);
            }

            for (const policy of data) {
                this.securityPolicies.set(policy.cache_pattern, policy);
            }

            console.log('Security policies setup completed');
        } catch (error) {
            console.error('Failed to setup security policies:', error);
            throw error;
        }
    }

    // Start cache maintenance
    async startCacheMaintenance() {
        try {
            // Run cleanup every 5 minutes
            setInterval(async () => {
                await this.performCacheCleanup();
            }, 5 * 60 * 1000);

            // Run validation every hour
            setInterval(async () => {
                await this.performCacheValidation();
            }, 60 * 60 * 1000);

            console.log('Cache maintenance started');
        } catch (error) {
            console.error('Failed to start cache maintenance:', error);
        }
    }

    // Get cache entry
    async get(key, options = {}) {
        try {
            if (!this.cacheConfig.enabled) {
                return null;
            }

            const startTime = Date.now();
            
            // Check security policy
            await this.checkSecurityPolicy(key, 'read', options);
            
            // Check memory cache first
            let value = this.memoryCache.get(key);
            if (value !== undefined) {
                this.cacheStats.hits++;
                return value;
            }

            // Check database cache
            const { data, error } = await this.supabaseClient.supabase
                .rpc('cache_get', {
                    cache_key: key,
                    tenant_id: options.tenantId
                });

            if (error) {
                this.cacheStats.errors++;
                throw new Error(`Cache get failed: ${error.message}`);
            }

            if (data) {
                // Validate cached data
                await this.validateCachedData(key, data);
                
                // Decrypt if needed
                const decryptedValue = await this.decryptIfNeeded(key, data);
                
                // Parse value
                const parsedValue = JSON.parse(decryptedValue);
                
                // Store in memory cache
                this.memoryCache.set(key, parsedValue);
                
                this.cacheStats.hits++;
                
                // Log performance
                const duration = Date.now() - startTime;
                if (duration > 100) {
                    console.warn(`Slow cache get: ${key} took ${duration}ms`);
                }
                
                return parsedValue;
            }

            this.cacheStats.misses++;
            return null;
        } catch (error) {
            console.error('Failed to get from cache:', error);
            this.cacheStats.errors++;
            return null;
        }
    }

    // Set cache entry
    async set(key, value, options = {}) {
        try {
            if (!this.cacheConfig.enabled) {
                return false;
            }

            const startTime = Date.now();
            
            // Check security policy
            await this.checkSecurityPolicy(key, 'write', options);
            
            // Validate data
            await this.validateCacheData(key, value);
            
            // Serialize value
            const serializedValue = JSON.stringify(value);
            
            // Encrypt if needed
            const encryptedValue = await this.encryptIfNeeded(key, serializedValue);
            
            // Prepare metadata
            const metadata = {
                content_type: 'application/json',
                size: serializedValue.length,
                created_by: options.userId,
                validation_rules: this.getApplicableValidationRules(key)
            };

            // Set in database cache
            const { data, error } = await this.supabaseClient.supabase
                .rpc('cache_set', {
                    cache_key: key,
                    cache_value: Buffer.from(encryptedValue),
                    cache_metadata: metadata,
                    tenant_id: options.tenantId,
                    ttl_seconds: options.ttl || this.cacheConfig.ttl,
                    encrypted: this.requiresEncryption(key)
                });

            if (error) {
                this.cacheStats.errors++;
                throw new Error(`Cache set failed: ${error.message}`);
            }

            // Set in memory cache
            this.memoryCache.set(key, value);
            
            this.cacheStats.sets++;
            
            // Check cache size limit
            if (this.memoryCache.size > this.cacheConfig.maxSize) {
                await this.evictLRU();
            }
            
            // Log performance
            const duration = Date.now() - startTime;
            if (duration > 100) {
                console.warn(`Slow cache set: ${key} took ${duration}ms`);
            }
            
            return data;
        } catch (error) {
            console.error('Failed to set cache:', error);
            this.cacheStats.errors++;
            return false;
        }
    }

    // Delete cache entry
    async delete(key, options = {}) {
        try {
            if (!this.cacheConfig.enabled) {
                return false;
            }

            // Check security policy
            await this.checkSecurityPolicy(key, 'delete', options);
            
            // Delete from database cache
            const { data, error } = await this.supabaseClient.supabase
                .rpc('cache_delete', {
                    cache_key: key,
                    tenant_id: options.tenantId
                });

            if (error) {
                this.cacheStats.errors++;
                throw new Error(`Cache delete failed: ${error.message}`);
            }

            // Delete from memory cache
            this.memoryCache.delete(key);
            
            this.cacheStats.deletes++;
            
            return data;
        } catch (error) {
            console.error('Failed to delete cache:', error);
            this.cacheStats.errors++;
            return false;
        }
    }

    // Check security policy
    async checkSecurityPolicy(key, operation, options) {
        try {
            const policy = this.getApplicableSecurityPolicy(key);
            if (!policy) {
                return; // No policy applies
            }

            const rules = policy.access_rules;
            
            // Check user ID requirement
            if (rules.require_user_id && !options.userId) {
                throw new Error('User ID required for cache access');
            }

            // Check tenant isolation
            if (policy.tenant_isolation && !options.tenantId) {
                throw new Error('Tenant ID required for cache access');
            }

            // Check admin requirement
            if (rules.require_admin && !options.isAdmin) {
                throw new Error('Admin access required for cache operation');
            }

            // Check permissions
            if (rules.require_permissions) {
                // This would integrate with the RBAC system
                // For now, just log the requirement
                console.log(`Permission check required for ${operation} on ${key}`);
            }

        } catch (error) {
            console.error('Security policy check failed:', error);
            throw error;
        }
    }

    // Get applicable security policy
    getApplicableSecurityPolicy(key) {
        for (const [pattern, policy] of this.securityPolicies) {
            if (this.matchesPattern(key, pattern)) {
                return policy;
            }
        }
        return null;
    }

    // Get applicable validation rules
    getApplicableValidationRules(key) {
        const rules = [];
        for (const [pattern, rule] of this.validationRules) {
            if (this.matchesPattern(key, pattern)) {
                rules.push(rule.rule_name);
            }
        }
        return rules;
    }

    // Check if key matches pattern
    matchesPattern(key, pattern) {
        // Simple pattern matching (could be enhanced with regex)
        if (pattern.endsWith('*')) {
            return key.startsWith(pattern.slice(0, -1));
        }
        return key === pattern;
    }

    // Check if encryption is required
    requiresEncryption(key) {
        const policy = this.getApplicableSecurityPolicy(key);
        return policy ? policy.encryption_required : false;
    }

    // Encrypt if needed
    async encryptIfNeeded(key, data) {
        if (!this.requiresEncryption(key)) {
            return data;
        }

        try {
            // This would integrate with the encryption system
            // For now, return data as-is
            console.log(`Encryption required for key: ${key}`);
            return data;
        } catch (error) {
            console.error('Encryption failed:', error);
            throw error;
        }
    }

    // Decrypt if needed
    async decryptIfNeeded(key, encryptedData) {
        if (!this.requiresEncryption(key)) {
            return encryptedData.toString();
        }

        try {
            // This would integrate with the encryption system
            // For now, return data as-is
            console.log(`Decryption required for key: ${key}`);
            return encryptedData.toString();
        } catch (error) {
            console.error('Decryption failed:', error);
            throw error;
        }
    }

    // Validate cache data
    async validateCacheData(key, data) {
        try {
            const rules = this.getApplicableValidationRules(key);
            
            for (const ruleName of rules) {
                await this.applyValidationRule(ruleName, data);
            }
        } catch (error) {
            console.error('Cache data validation failed:', error);
            throw error;
        }
    }

    // Validate cached data
    async validateCachedData(key, data) {
        try {
            // Similar to validateCacheData but for retrieved data
            const rules = this.getApplicableValidationRules(key);
            
            for (const ruleName of rules) {
                await this.applyValidationRule(ruleName, data);
            }
        } catch (error) {
            console.error('Cached data validation failed:', error);
            throw error;
        }
    }

    // Apply validation rule
    async applyValidationRule(ruleName, data) {
        switch (ruleName) {
            case 'json_structure_validation':
                this.validateJSONStructure(data);
                break;
            case 'user_permissions_validation':
                this.validateUserPermissions(data);
                break;
            case 'template_content_validation':
                this.validateTemplateContent(data);
                break;
            case 'session_data_validation':
                this.validateSessionData(data);
                break;
            default:
                console.warn(`Unknown validation rule: ${ruleName}`);
        }
    }

    // Validation rule implementations
    validateJSONStructure(data) {
        try {
            const parsed = JSON.parse(data.toString());
            if (!parsed || typeof parsed !== 'object') {
                throw new Error('Invalid JSON structure');
            }
        } catch (error) {
            throw new Error(`JSON validation failed: ${error.message}`);
        }
    }

    validateUserPermissions(data) {
        try {
            const parsed = JSON.parse(data.toString());
            if (!Array.isArray(parsed)) {
                throw new Error('User permissions must be an array');
            }
        } catch (error) {
            throw new Error(`User permissions validation failed: ${error.message}`);
        }
    }

    validateTemplateContent(data) {
        try {
            const parsed = JSON.parse(data.toString());
            if (!parsed.name || !parsed.sections) {
                throw new Error('Template missing required fields');
            }
        } catch (error) {
            throw new Error(`Template content validation failed: ${error.message}`);
        }
    }

    validateSessionData(data) {
        try {
            const parsed = JSON.parse(data.toString());
            if (!parsed.userId || !parsed.sessionId) {
                throw new Error('Session data missing required fields');
            }
        } catch (error) {
            throw new Error(`Session data validation failed: ${error.message}`);
        }
    }

    // Evict LRU entries
    async evictLRU() {
        try {
            const entries = Array.from(this.memoryCache.entries());
            
            // Sort by access time (simple implementation)
            entries.sort((a, b) => {
                // In a real implementation, track access times
                return 0;
            });

            // Remove oldest entries
            const toRemove = entries.slice(0, entries.length - this.cacheConfig.maxSize);
            for (const [key] of toRemove) {
                this.memoryCache.delete(key);
                this.cacheStats.evictions++;
            }

            console.log(`Evicted ${toRemove.length} cache entries`);
        } catch (error) {
            console.error('Failed to evict LRU entries:', error);
        }
    }

    // Perform cache cleanup
    async performCacheCleanup() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .rpc('cache_cleanup');

            if (error) {
                console.error('Cache cleanup failed:', error);
            } else {
                console.log(`Cache cleanup completed: ${data} entries removed`);
            }
        } catch (error) {
            console.error('Failed to perform cache cleanup:', error);
        }
    }

    // Perform cache validation
    async performCacheValidation() {
        try {
            // Validate a sample of cache entries
            const { data, error } = await this.supabaseClient.supabase
                .from('cache_entries')
                .select('cache_key, cache_value, checksum')
                .limit(100);

            if (error) {
                console.error('Cache validation failed:', error);
                return;
            }

            let invalidCount = 0;
            for (const entry of data) {
                try {
                    const currentChecksum = this.calculateChecksum(entry.cache_value);
                    if (currentChecksum !== entry.checksum) {
                        console.warn(`Cache integrity issue detected for key: ${entry.cache_key}`);
                        invalidCount++;
                    }
                } catch (error) {
                    console.error(`Failed to validate cache entry ${entry.cache_key}:`, error);
                    invalidCount++;
                }
            }

            if (invalidCount > 0) {
                console.warn(`Found ${invalidCount} invalid cache entries`);
            }

        } catch (error) {
            console.error('Failed to perform cache validation:', error);
        }
    }

    // Calculate checksum
    calculateChecksum(data) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    // Get cache statistics
    getCacheStats() {
        const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0 
            ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100 
            : 0;

        return {
            ...this.cacheStats,
            hitRate: hitRate.toFixed(2) + '%',
            memorySize: this.memoryCache.size,
            maxSize: this.cacheConfig.maxSize,
            utilization: ((this.memoryCache.size / this.cacheConfig.maxSize) * 100).toFixed(2) + '%'
        };
    }

    // Clear cache
    async clear(pattern = null, tenantId = null) {
        try {
            if (pattern) {
                // Clear entries matching pattern
                for (const [key] of this.memoryCache) {
                    if (this.matchesPattern(key, pattern)) {
                        this.memoryCache.delete(key);
                    }
                }
            } else {
                // Clear all
                this.memoryCache.clear();
            }

            // Clear database cache
            let query = this.supabaseClient.supabase.from('cache_entries');
            
            if (pattern) {
                query = query.like('cache_key', pattern.replace('*', '%'));
            }
            
            if (tenantId) {
                query = query.eq('tenant_id', tenantId);
            }

            const { error } = await query.delete();
            
            if (error) {
                throw new Error(`Failed to clear database cache: ${error.message}`);
            }

            console.log(`Cache cleared: pattern=${pattern}, tenant=${tenantId}`);
        } catch (error) {
            console.error('Failed to clear cache:', error);
            throw error;
        }
    }

    // Get system status
    getStatus() {
        return {
            initialized: this.isInitialized,
            enabled: this.cacheConfig?.enabled || false,
            stats: this.getCacheStats(),
            config: this.cacheConfig,
            validationRules: this.validationRules.size,
            securityPolicies: this.securityPolicies.size
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CacheManager;
}
