// TrustMD Configuration
// Environment-based configuration management with security validation

// Helper function to get environment variable (works in both Node.js and browser)
function getEnv(key, defaultValue = null, required = false) {
    let value;
    
    if (typeof process !== 'undefined' && process.env) {
        value = process.env[key];
    } else {
        // Browser environment - check window.env or use default
        value = (typeof window !== 'undefined' && window.env && window.env[key]);
    }
    
    // Handle required environment variables
    if (required && !value) {
        throw new Error(`Required environment variable ${key} is not set`);
    }
    
    // Return value or default
    return value || defaultValue;
}

// Security validation for production
function validateProductionConfig() {
    const isProduction = getEnv('NODE_ENV') === 'production';
    
    if (isProduction) {
        // Required production environment variables
        const requiredVars = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_ROLE_KEY'
        ];
        
        for (const varName of requiredVars) {
            if (!getEnv(varName)) {
                throw new Error(`Production environment requires ${varName} to be set`);
            }
        }
        
        // Check for default values in production
        if (getEnv('SUPABASE_URL')?.includes('your-project-id')) {
            throw new Error('Production environment cannot use default Supabase configuration');
        }
    }
}

const TIER_CONFIG = {
    professional: {
        name: getEnv('TIER_NAME', 'Professional Compliance'),
        price: parseFloat(getEnv('TIER_PRICE', '249')),
        features: {
            maxUsers: parseInt(getEnv('TIER_MAX_USERS', '-1')), // unlimited
            storageGB: parseInt(getEnv('TIER_STORAGE_GB', '-1')), // unlimited
            phiStorage: getEnv('TIER_PHI_STORAGE', 'false') === 'true',
            ehrIntegration: getEnv('TIER_EHR_INTEGRATION', 'false') === 'true',
            hipaaBackend: getEnv('TIER_HIPAA_BACKEND', 'false') === 'true',
            support: getEnv('TIER_SUPPORT', '24/7')
        },
        backendConfig: {
            database: getEnv('BACKEND_DATABASE', 'compliance_db'),
            encryption: getEnv('BACKEND_ENCRYPTION', 'standard'),
            auditLevel: getEnv('BACKEND_AUDIT_LEVEL', 'comprehensive'),
            dataIsolation: getEnv('BACKEND_DATA_ISOLATION', 'tenant_level')
        }
    },
    basic: {
        name: getEnv('TIER_BASIC_NAME', 'Basic Compliance'),
        price: parseFloat(getEnv('TIER_BASIC_PRICE', '99')),
        features: {
            maxUsers: parseInt(getEnv('TIER_BASIC_MAX_USERS', '5')),
            storageGB: parseInt(getEnv('TIER_BASIC_STORAGE_GB', '10')),
            phiStorage: false,
            ehrIntegration: false,
            hipaaBackend: false,
            support: 'business hours'
        },
        backendConfig: {
            database: getEnv('BACKEND_DATABASE', 'compliance_db'),
            encryption: 'standard',
            auditLevel: 'basic',
            dataIsolation: 'tenant_level'
        }
    },
    enterprise: {
        name: getEnv('TIER_ENTERPRISE_NAME', 'Enterprise Compliance'),
        price: parseFloat(getEnv('TIER_ENTERPRISE_PRICE', '999')),
        features: {
            maxUsers: parseInt(getEnv('TIER_ENTERPRISE_MAX_USERS', '-1')), // unlimited
            storageGB: parseInt(getEnv('TIER_ENTERPRISE_STORAGE_GB', '-1')), // unlimited
            phiStorage: getEnv('TIER_ENTERPRISE_PHI_STORAGE', 'true') === 'true',
            ehrIntegration: getEnv('TIER_ENTERPRISE_EHR_INTEGRATION', 'true') === 'true',
            hipaaBackend: getEnv('TIER_ENTERPRISE_HIPAA_BACKEND', 'true') === 'true',
            support: '24/7 dedicated'
        },
        backendConfig: {
            database: getEnv('BACKEND_DATABASE', 'compliance_db'),
            encryption: 'advanced',
            auditLevel: 'comprehensive',
            dataIsolation: 'tenant_level'
        }
    }
};

// Supabase configuration - Secure with required validation
const SUPABASE_CONFIG = {
    url: getEnv('SUPABASE_URL', null, true),
    anonKey: getEnv('SUPABASE_ANON_KEY', null, true),
    serviceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY', null, true),
    multiTenant: {
        enabled: getEnv('MULTI_TENANT_ENABLED', 'true') === 'true',
        tenantDetection: getEnv('TENANT_DETECTION', 'subdomain'), // 'subdomain', 'header', or 'manual'
        defaultSubdomain: getEnv('DEFAULT_SUBDOMAIN', 'app'),
        tenantHeader: getEnv('TENANT_HEADER', 'X-Tenant-ID')
    }
};

// Backend configuration
const BACKEND_CONFIG = {
    port: parseInt(getEnv('BACKEND_PORT', '3000')),
    environment: getEnv('NODE_ENV', 'development'),
    logLevel: getEnv('LOG_LEVEL', 'info'),
    enableDemoMode: getEnv('ENABLE_DEMO_MODE', 'true') === 'true',
    enableRealTimeSync: getEnv('ENABLE_REAL_TIME_SYNC', 'true') === 'true',
    enablePHIProtection: getEnv('ENABLE_PHI_PROTECTION', 'true') === 'true',
    enableRiskEngine: getEnv('ENABLE_RISK_ENGINE', 'true') === 'true'
};

// Security configuration
const SECURITY_CONFIG = {
    sessionTimeout: parseInt(getEnv('SESSION_TIMEOUT', '3600000')), // 1 hour
    maxLoginAttempts: parseInt(getEnv('MAX_LOGIN_ATTEMPTS', '5')),
    lockoutDuration: parseInt(getEnv('LOCKOUT_DURATION', '900000')), // 15 minutes
    passwordMinLength: parseInt(getEnv('PASSWORD_MIN_LENGTH', '8')),
    requireSpecialChars: getEnv('REQUIRE_SPECIAL_CHARS', 'true') === 'true',
    enable2FA: getEnv('ENABLE_2FA', 'false') === 'true'
};

// Validate configuration before export
try {
    validateProductionConfig();
} catch (error) {
    console.error('Configuration validation failed:', error.message);
    if (getEnv('NODE_ENV') === 'production') {
        throw error;
    }
}

// Secure export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TIER_CONFIG,
        SUPABASE_CONFIG,
        BACKEND_CONFIG,
        SECURITY_CONFIG,
        validateProductionConfig
    };
} else {
    // Browser environment with security warning
    if (getEnv('NODE_ENV') === 'production' && 
        (SUPABASE_CONFIG.url?.includes('your-project-id') || 
         SUPABASE_CONFIG.anonKey === 'your-anon-key-here')) {
        console.warn('⚠️ WARNING: Using default Supabase configuration in production!');
    }
    
    window.TIER_CONFIG = TIER_CONFIG;
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
    window.BACKEND_CONFIG = BACKEND_CONFIG;
    window.SECURITY_CONFIG = SECURITY_CONFIG;
}
