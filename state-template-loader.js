// TrustMD State Template Loader
// Dynamic loading and caching of state-specific compliance templates

class StateTemplateLoader {
    constructor() {
        this.templateCache = new Map();
        this.stateMultipliers = new Map();
        this.stateTiers = new Map();
        this.stateConfig = null;
        this.currentUserId = null;
        this.currentTenantId = null;
        this.accessControl = new Map();
        this.auditLog = [];
        this.rateLimitTracker = new Map();
        
        // Initialize state tiers and multipliers
        this.initializeStateConfig();
    }

    // Initialize with external configuration
    async initializeStateConfig() {
        try {
            const response = await fetch('/config/state-tiers.json');
            if (response.ok) {
                this.stateConfig = await response.json();
                this.loadStateTiersFromConfig();
                console.log('State configuration loaded successfully from external config');
            } else {
                console.warn('Failed to load state configuration, using defaults');
                this.initializeDefaultStateConfig();
            }
        } catch (error) {
            console.error('Error loading state configuration:', error);
            this.initializeDefaultStateConfig();
        }
    }

    // Load state tiers from external configuration
    loadStateTiersFromConfig() {
        if (!this.stateConfig || !this.stateConfig.stateTiers) {
            this.initializeDefaultStateConfig();
            return;
        }

        // Clear existing data
        this.stateTiers.clear();
        this.stateMultipliers.clear();

        // Load from configuration
        Object.entries(this.stateConfig.stateTiers).forEach(([tierName, tierConfig]) => {
            const tierNumber = parseInt(tierName.replace('tier', ''));
            tierConfig.states.forEach(state => {
                this.stateTiers.set(state, tierNumber);
                this.stateMultipliers.set(state, tierConfig.multiplier);
            });
        });
    }

    // Initialize default state configuration (fallback)
    initializeDefaultStateConfig() {
        // Tier 1 - Highest Regulatory Burden (1.4x multiplier)
        const tier1States = ['CA', 'NY', 'FL', 'TX', 'IL'];
        tier1States.forEach(state => {
            this.stateTiers.set(state, 1);
            this.stateMultipliers.set(state, 1.4);
        });

        // Tier 2 - High Regulatory Burden (1.3x multiplier)
        const tier2States = ['PA', 'OH', 'GA', 'NC', 'MI', 'NJ', 'VA', 'WA', 'AZ', 'MA', 'TN', 'IN', 'MO', 'MD', 'WI'];
        tier2States.forEach(state => {
            this.stateTiers.set(state, 2);
            this.stateMultipliers.set(state, 1.3);
        });

        // Tier 3 - Moderate Regulatory Burden (1.2x multiplier)
        const tier3States = ['CO', 'MN', 'SC', 'AL', 'LA', 'KY', 'OK', 'OR', 'CT', 'UT', 'IA', 'NV', 'AR', 'MS', 'KS'];
        tier3States.forEach(state => {
            this.stateTiers.set(state, 3);
            this.stateMultipliers.set(state, 1.2);
        });

        // Tier 4 - Lower Regulatory Burden (1.0x multiplier)
        const tier4States = ['NM', 'NE', 'WV', 'ID', 'HI', 'NH', 'ME', 'MT', 'RI', 'DE', 'SD', 'ND', 'AK', 'VT', 'WY'];
        tier4States.forEach(state => {
            this.stateTiers.set(state, 4);
            this.stateMultipliers.set(state, 1.0);
        });
    }

    // Set user context for access control
    setUserContext(userId, tenantId) {
        this.currentUserId = userId;
        this.currentTenantId = tenantId;
    }

    // Enhanced state template loading with validation and security
    async loadStateTemplate(stateCode, version = 'latest') {
        // Check cache first
        const cacheKey = `${stateCode}:${version}`;
        if (this.templateCache.has(cacheKey)) {
            await this.logTemplateAccess(stateCode, 'cache_hit', version);
            return this.templateCache.get(cacheKey);
        }

        try {
            // Validate access
            const hasAccess = await this.validateTemplateAccess(stateCode, 'read');
            if (!hasAccess) {
                throw new Error(`Access denied to state template: ${stateCode}`);
            }

            // Rate limiting check
            this.checkRateLimit(stateCode);

            // Validate state code
            this.validateStateCode(stateCode);

            const tier = this.getStateTier(stateCode);
            const modulePath = `./state-templates/tier${tier}/${stateCode.toLowerCase()}-template.js`;
            
            // Validate file path and security
            await this.validateTemplateFile(modulePath, stateCode);
            
            // Dynamic import with security checks
            const templateModule = await this.importTemplateModule(modulePath, stateCode);
            
            // Validate template module structure
            this.validateTemplateModule(templateModule, stateCode);
            
            // Create and validate template instance
            const template = new templateModule.default();
            await this.validateTemplateInstance(template, stateCode);
            
            // Add metadata to template
            template.stateCode = stateCode;
            template.tier = tier;
            template.multiplier = this.stateMultipliers.get(stateCode);
            template.version = version;
            template.loadedAt = new Date().toISOString();
            template.loadedBy = this.currentUserId;

            // Cache the validated template
            this.templateCache.set(cacheKey, template);
            
            // Log successful loading
            await this.logTemplateAccess(stateCode, 'load_success', version);
            
            console.log(`Loaded state template: ${stateCode} (Tier ${tier}, Version ${version})`);
            return template;
        } catch (error) {
            console.error(`Error loading state template ${stateCode}:`, error);
            await this.logTemplateAccess(stateCode, 'load_error', version, error.message);
            throw new Error(`Failed to load template for state ${stateCode}: ${error.message}`);
        }
    }

    // Validate state code format and existence
    validateStateCode(stateCode) {
        if (!stateCode || typeof stateCode !== 'string') {
            throw new Error('State code must be a non-empty string');
        }

        if (!/^[A-Z]{2}$/i.test(stateCode)) {
            throw new Error('State code must be exactly 2 letters');
        }

        const normalizedCode = stateCode.toUpperCase();
        if (!this.stateTiers.has(normalizedCode)) {
            throw new Error(`Unknown state code: ${stateCode}`);
        }

        return normalizedCode;
    }

    // Validate template file before loading
    async validateTemplateFile(modulePath, stateCode) {
        try {
            // Check file extension
            if (!modulePath.endsWith('.js')) {
                throw new Error('Template files must be JavaScript files (.js)');
            }

            // Validate file path structure
            const expectedPathPattern = /^\.\/state-templates\/tier[1-4]\/[a-z]{2}-template\.js$/;
            if (!expectedPathPattern.test(modulePath)) {
                throw new Error('Invalid template file path structure');
            }

            // Additional security checks would go here in a real implementation
            // - File size validation
            // - Content scanning for malicious code
            // - Digital signature verification

            return true;
        } catch (error) {
            throw new Error(`Template file validation failed: ${error.message}`);
        }
    }

    // Secure template module import
    async importTemplateModule(modulePath, stateCode) {
        try {
            // In a real implementation, this would include:
            // - Sandboxed loading
            // - Content security checks
            // - Permission validation
            
            const templateModule = await import(modulePath);
            
            // Validate module structure
            if (!templateModule || !templateModule.default) {
                throw new Error('Template module must have a default export');
            }

            return templateModule;
        } catch (error) {
            throw new Error(`Failed to import template module: ${error.message}`);
        }
    }

    // Validate template module structure
    validateTemplateModule(templateModule, stateCode) {
        const errors = [];
        const requiredMethods = this.stateConfig?.validation?.requiredFields || [
            'id', 'name', 'requirements', 'getRequirements', 'validateCompliance', 'getMultiplier'
        ];

        // Check if default export is a function/class
        if (typeof templateModule.default !== 'function') {
            errors.push('Template default export must be a constructor function');
        }

        // Create instance to test methods
        try {
            const testInstance = new templateModule.default();
            
            // Check required methods
            for (const method of requiredMethods) {
                if (typeof testInstance[method] !== 'function') {
                    errors.push(`Template missing required method: ${method}`);
                }
            }

            // Validate basic properties
            if (!testInstance.id || typeof testInstance.id !== 'string') {
                errors.push('Template must have a valid id property');
            }

            if (!testInstance.name || typeof testInstance.name !== 'string') {
                errors.push('Template must have a valid name property');
            }

        } catch (error) {
            errors.push(`Failed to create template instance: ${error.message}`);
        }

        if (errors.length > 0) {
            throw new Error(`Template module validation failed: ${errors.join(', ')}`);
        }

        return true;
    }

    // Validate template instance
    async validateTemplateInstance(template, stateCode) {
        const errors = [];

        try {
            // Test getRequirements method
            const requirements = template.getRequirements();
            if (!Array.isArray(requirements)) {
                errors.push('getRequirements() must return an array');
            }

            // Test getMultiplier method
            const multiplier = template.getMultiplier();
            if (typeof multiplier !== 'number' || multiplier < 0) {
                errors.push('getMultiplier() must return a positive number');
            }

            // Test validateCompliance method
            if (typeof template.validateCompliance === 'function') {
                try {
                    await template.validateCompliance({});
                } catch (error) {
                    // Expected to fail with empty data, but should not throw structural errors
                    if (error.message.includes('structure') || error.message.includes('required')) {
                        // This is expected
                    } else {
                        errors.push(`validateCompliance() method error: ${error.message}`);
                    }
                }
            }

        } catch (error) {
            errors.push(`Template instance validation error: ${error.message}`);
        }

        if (errors.length > 0) {
            throw new Error(`Template instance validation failed: ${errors.join(', ')}`);
        }

        return true;
    }

    // Validate user access to template
    async validateTemplateAccess(stateCode, requiredPermission = 'read') {
        if (!this.currentUserId || !this.currentTenantId) {
            return true; // Allow access if no user context set
        }

        // In a real implementation, this would check database permissions
        // For now, we'll implement basic role-based access
        const userRole = await this.getUserRole();
        
        if (userRole === 'admin') {
            return true;
        }

        const statePermissions = this.accessControl.get(stateCode) || 'read';
        const permissionLevels = { 'none': 0, 'read': 1, 'write': 2, 'admin': 3 };
        
        return permissionLevels[statePermissions] >= permissionLevels[requiredPermission];
    }

    // Get user role (placeholder implementation)
    async getUserRole() {
        // In a real implementation, this would query the database
        return 'user';
    }

    // Rate limiting check
    checkRateLimit(stateCode) {
        if (!this.stateConfig?.security?.rateLimiting?.enabled) {
            return;
        }

        const now = Date.now();
        const windowStart = now - 60000; // 1 minute window
        const key = `${this.currentUserId || 'anonymous'}:${stateCode}`;
        
        let requests = this.rateLimitTracker.get(key) || [];
        requests = requests.filter(timestamp => timestamp > windowStart);
        
        const maxRequests = this.stateConfig.security.rateLimiting.maxRequestsPerMinute;
        if (requests.length >= maxRequests) {
            throw new Error(`Rate limit exceeded for ${stateCode}. Maximum ${maxRequests} requests per minute.`);
        }
        
        requests.push(now);
        this.rateLimitTracker.set(key, requests);
    }

    // Log template access for audit
    async logTemplateAccess(stateCode, action, version = 'latest', details = null) {
        const logEntry = {
            stateCode,
            action,
            version,
            details,
            userId: this.currentUserId,
            tenantId: this.currentTenantId,
            timestamp: new Date().toISOString(),
            ipAddress: null // Would be populated from request context
        };

        this.auditLog.push(logEntry);

        // Keep audit log within retention limits
        const retentionDays = this.stateConfig?.security?.auditLogging?.retentionDays || 2555;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        this.auditLog = this.auditLog.filter(entry => 
            new Date(entry.timestamp) > cutoffDate
        );

        // In a real implementation, this would also log to database
        console.log('Template access logged:', logEntry);
    }

    // Get audit log
    getAuditLog(filters = {}) {
        let filteredLog = [...this.auditLog];

        if (filters.stateCode) {
            filteredLog = filteredLog.filter(entry => entry.stateCode === filters.stateCode);
        }

        if (filters.action) {
            filteredLog = filteredLog.filter(entry => entry.action === filters.action);
        }

        if (filters.userId) {
            filteredLog = filteredLog.filter(entry => entry.userId === filters.userId);
        }

        return filteredLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Load multiple state templates concurrently
    async loadMultipleStateTemplates(stateCodes) {
        const loadPromises = stateCodes.map(stateCode => 
            this.loadStateTemplate(stateCode).catch(error => {
                console.error(`Failed to load template for ${stateCode}:`, error);
                return null;
            })
        );
        
        const templates = await Promise.all(loadPromises);
        const results = {};
        
        stateCodes.forEach((stateCode, index) => {
            if (templates[index]) {
                results[stateCode] = templates[index];
            }
        });
        
        return results;
    }

    // Get state tier
    getStateTier(stateCode) {
        const tier = this.stateTiers.get(stateCode.toUpperCase());
        if (!tier) {
            throw new Error(`Unknown state code: ${stateCode}`);
        }
        return tier;
    }

    // Get state multiplier
    getStateMultiplier(stateCode) {
        const multiplier = this.stateMultipliers.get(stateCode.toUpperCase());
        if (multiplier === undefined) {
            throw new Error(`Unknown state code: ${stateCode}`);
        }
        return multiplier;
    }

    // Get all states in a tier
    getStatesByTier(tier) {
        const states = [];
        for (const [stateCode, stateTier] of this.stateTiers) {
            if (stateTier === tier) {
                states.push(stateCode);
            }
        }
        return states;
    }

    // Clear cache for a specific state
    clearStateCache(stateCode) {
        this.templateCache.delete(stateCode.toUpperCase());
    }

    // Clear all cached templates
    clearAllCache() {
        this.templateCache.clear();
    }

    // Get cached template count
    getCachedTemplateCount() {
        return this.templateCache.size;
    }

    // Validate state code
    isValidStateCode(stateCode) {
        return this.stateTiers.has(stateCode.toUpperCase());
    }

    // Get state configuration
    getStateConfig(stateCode) {
        const upperStateCode = stateCode.toUpperCase();
        return {
            stateCode: upperStateCode,
            tier: this.stateTiers.get(upperStateCode),
            multiplier: this.stateMultipliers.get(upperStateCode),
            isValid: this.isValidStateCode(upperStateCode)
        };
    }

    // Get all state configurations
    getAllStateConfigs() {
        const configs = [];
        for (const stateCode of this.stateTiers.keys()) {
            configs.push(this.getStateConfig(stateCode));
        }
        return configs.sort((a, b) => a.stateCode.localeCompare(b.stateCode));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateTemplateLoader;
} else if (typeof window !== 'undefined') {
    window.StateTemplateLoader = StateTemplateLoader;
}
