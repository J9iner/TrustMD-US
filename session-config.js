// Session Management Configuration for TrustMD
// Defines security policies, timeout settings, and session behavior

const SESSION_CONFIG = {
    // Core session settings
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes of inactivity
    MAX_SESSION_AGE: 24 * 60 * 60 * 1000, // 24 hours maximum session lifetime
    MAX_CONCURRENT_SESSIONS: 5, // Maximum sessions per user
    CLEANUP_INTERVAL: 5 * 60 * 1000, // Run cleanup every 5 minutes
    
    // Security settings
    SECURITY: {
        // Account lockout settings
        FAILED_ATTEMPT_THRESHOLD: 5, // Lock account after 5 failed attempts
        LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes lockout
        FAILED_ATTEMPT_WINDOW: 15 * 60 * 1000, // Consider attempts within 15 minutes
        
        // IP and device validation
        IP_VALIDATION: true, // Validate IP address consistency
        USER_AGENT_VALIDATION: true, // Validate browser consistency
        DEVICE_FINGERPRINTING: true, // Use device fingerprinting
        
        // Suspicious activity detection
        SUSPICIOUS_ACTIVITY_THRESHOLD: 3, // Flag activity after 3 suspicious events
        RAPID_REQUEST_THRESHOLD: 100, // Requests per minute threshold
        UNUSUAL_TIME_HOURS: {
            START: 22, // Flag activity before 10 PM
            END: 6    // Flag activity after 6 AM
        },
        
        // Session security levels
        SECURITY_LEVELS: {
            LOW: 0-30,
            MEDIUM: 31-70,
            HIGH: 71-100
        }
    },
    
    // Session persistence settings
    PERSISTENCE: {
        REMEMBER_ME_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days for "remember me"
        PERSISTENT_COOKIE_SECURE: true, // Use secure cookies
        PERSISTENT_COOKIE_HTTP_ONLY: true, // HttpOnly cookies
        PERSISTENT_COOKIE_SAME_SITE: 'Strict' // SameSite policy
    },
    
    // Compliance and audit settings
    AUDIT: {
        LOG_ALL_SESSION_EVENTS: true,
        LOG_SECURITY_EVENTS: true,
        LOG_FAILED_LOGINS: true,
        LOG_SESSION_TERMINATION: true,
        RETENTION_DAYS: 90, // Keep logs for 90 days
        LOG_SENSITIVE_DATA: false // Don't log PHI/PII in session logs
    },
    
    // Performance settings
    PERFORMANCE: {
        MAX_MEMORY_SESSIONS: 10000, // Maximum sessions in memory
        SESSION_COMPRESSION: true, // Compress session data
        LAZY_LOADING: true, // Load session data on demand
        CACHE_STRATEGY: 'LRU' // Least Recently Used cache eviction
    },
    
    // Environment-specific settings
    ENVIRONMENTS: {
        development: {
            SESSION_TIMEOUT: 60 * 60 * 1000, // 1 hour for development
            MAX_SESSION_AGE: 8 * 60 * 60 * 1000, // 8 hours max
            SECURITY_LEVEL: 'LOW',
            DEBUG_SESSIONS: true,
            LOG_LEVEL: 'DEBUG'
        },
        
        staging: {
            SESSION_TIMEOUT: 45 * 60 * 1000, // 45 minutes for staging
            MAX_SESSION_AGE: 12 * 60 * 60 * 1000, // 12 hours max
            SECURITY_LEVEL: 'MEDIUM',
            DEBUG_SESSIONS: false,
            LOG_LEVEL: 'INFO'
        },
        
        production: {
            SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes for production
            MAX_SESSION_AGE: 8 * 60 * 60 * 1000, // 8 hours max
            SECURITY_LEVEL: 'HIGH',
            DEBUG_SESSIONS: false,
            LOG_LEVEL: 'WARN'
        }
    },
    
    // Role-based session settings
    ROLE_BASED_SETTINGS: {
        super_admin: {
            MAX_CONCURRENT_SESSIONS: 3, // More restrictive for admins
            SESSION_TIMEOUT: 15 * 60 * 1000, // Shorter timeout
            REQUIRE_MFA: true,
            SECURITY_LEVEL: 'HIGH'
        },
        
        admin: {
            MAX_CONCURRENT_SESSIONS: 4,
            SESSION_TIMEOUT: 20 * 60 * 1000,
            REQUIRE_MFA: false,
            SECURITY_LEVEL: 'MEDIUM'
        },
        
        provider: {
            MAX_CONCURRENT_SESSIONS: 5,
            SESSION_TIMEOUT: 30 * 60 * 1000,
            REQUIRE_MFA: false,
            SECURITY_LEVEL: 'MEDIUM'
        },
        
        patient: {
            MAX_CONCURRENT_SESSIONS: 3,
            SESSION_TIMEOUT: 45 * 60 * 1000, // Longer for patients
            REQUIRE_MFA: false,
            SECURITY_LEVEL: 'LOW'
        }
    },
    
    // Geographic and time-based settings
    GEOGRAPHIC_RESTRICTIONS: {
        ENABLED: false, // Disable by default
        ALLOWED_COUNTRIES: ['US', 'CA'], // Allowed countries
        BLOCKED_COUNTRIES: [], // Explicitly blocked countries
        TIME_ZONE_VALIDATION: true, // Validate timezone consistency
        UNUSUAL_LOCATION_THRESHOLD: 500 // km from usual location
    },
    
    // Session data encryption
    ENCRYPTION: {
        ENABLED: true,
        ALGORITHM: 'AES-256-GCM',
        KEY_ROTATION_INTERVAL: 7 * 24 * 60 * 60 * 1000, // Rotate keys weekly
        SESSION_DATA_ENCRYPTION: true, // Encrypt sensitive session data
        COOKIE_ENCRYPTION: true // Encrypt session cookies
    }
};

// Get environment-specific configuration
function getSessionConfig(environment = 'production') {
    const baseConfig = { ...SESSION_CONFIG };
    const envConfig = SESSION_CONFIG.ENVIRONMENTS[environment] || SESSION_CONFIG.ENVIRONMENTS.production;
    
    return {
        ...baseConfig,
        ...envConfig,
        CURRENT_ENVIRONMENT: environment
    };
}

// Get role-based session configuration
function getRoleBasedConfig(role) {
    return SESSION_CONFIG.ROLE_BASED_SETTINGS[role] || SESSION_CONFIG.ROLE_BASED_SETTINGS.patient;
}

// Validate session configuration
function validateSessionConfig(config) {
    const errors = [];
    
    if (config.SESSION_TIMEOUT < 5 * 60 * 1000) {
        errors.push('Session timeout must be at least 5 minutes');
    }
    
    if (config.MAX_SESSION_AGE < config.SESSION_TIMEOUT) {
        errors.push('Max session age must be greater than session timeout');
    }
    
    if (config.MAX_CONCURRENT_SESSIONS < 1) {
        errors.push('Max concurrent sessions must be at least 1');
    }
    
    if (config.SECURITY.FAILED_ATTEMPT_THRESHOLD < 3) {
        errors.push('Failed attempt threshold should be at least 3');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

// Export configuration and helper functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SESSION_CONFIG,
        getSessionConfig,
        getRoleBasedConfig,
        validateSessionConfig
    };
} else {
    window.SessionConfig = {
        SESSION_CONFIG,
        getSessionConfig,
        getRoleBasedConfig,
        validateSessionConfig
    };
}
