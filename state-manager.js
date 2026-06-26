// TrustMD State Management
// Centralized state management with validation and error handling

class TrustMDState {
    constructor() {
        this.state = new Proxy({}, {
            set: (target, key, value) => {
                this.validate(key, value);
                target[key] = value;
                return true;
            },
            get: (target, key) => {
                return target[key];
            }
        });
        
        // Initialize with default values
        this.initializeDefaults();
    }
    
    initializeDefaults() {
        this.state.notifications = [];
        this.state.documents = [];
        this.state.complianceData = {
            score: 92,
            pendingTasks: 5,
            nextAudit: 45,
            auditRiskLevel: 'Medium',
            auditProbability: 32
        };
        this.state.currentUser = null;
        this.state.supabaseClient = null;
        this.state.currentTenantId = null;
        this.state.userTier = 'professional';
        this.state.riskEngine = null;
        this.state.evidenceVault = null;
        this.state.crossReferenceValidator = null;
        this.state.apiServer = null;
        this.state.realTimeSyncManager = null;
    }
    
    validate(key, value) {
        switch (key) {
            case 'notifications':
                this.validateNotifications(value);
                break;
            case 'documents':
                this.validateDocuments(value);
                break;
            case 'complianceData':
                this.validateComplianceData(value);
                break;
            case 'currentUser':
                this.validateCurrentUser(value);
                break;
            case 'currentTenantId':
                this.validateTenantId(value);
                break;
            case 'userTier':
                this.validateUserTier(value);
                break;
            default:
                // Allow other properties without validation for now
                break;
        }
    }
    
    validateNotifications(notifications) {
        if (!Array.isArray(notifications)) {
            throw new Error('Notifications must be an array');
        }
        
        notifications.forEach((notification, index) => {
            if (!notification || typeof notification !== 'object') {
                throw new Error(`Notification at index ${index} must be an object`);
            }
            
            if (!notification.id) {
                throw new Error(`Notification at index ${index} must have an id`);
            }
        });
    }
    
    validateDocuments(documents) {
        if (!Array.isArray(documents)) {
            throw new Error('Documents must be an array');
        }
        
        documents.forEach((document, index) => {
            if (!document || typeof document !== 'object') {
                throw new Error(`Document at index ${index} must be an object`);
            }
            
            if (!document.id) {
                throw new Error(`Document at index ${index} must have an id`);
            }
        });
    }
    
    validateComplianceData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Compliance data must be an object');
        }
        
        if (typeof data.score !== 'number' || data.score < 0 || data.score > 100) {
            throw new Error('Compliance score must be a number between 0 and 100');
        }
        
        if (typeof data.pendingTasks !== 'number' || data.pendingTasks < 0) {
            throw new Error('Pending tasks must be a non-negative number');
        }
        
        if (typeof data.nextAudit !== 'number' || data.nextAudit < 0) {
            throw new Error('Next audit must be a non-negative number');
        }
        
        if (!['Low', 'Medium', 'High'].includes(data.auditRiskLevel)) {
            throw new Error('Audit risk level must be Low, Medium, or High');
        }
        
        if (typeof data.auditProbability !== 'number' || data.auditProbability < 0 || data.auditProbability > 100) {
            throw new Error('Audit probability must be a number between 0 and 100');
        }
    }
    
    validateCurrentUser(user) {
        if (user !== null && (!user || typeof user !== 'object')) {
            throw new Error('Current user must be null or an object');
        }
        
        if (user && !user.id) {
            throw new Error('Current user must have an id');
        }
    }
    
    validateTenantId(tenantId) {
        if (tenantId !== null && (typeof tenantId !== 'string' || tenantId.trim() === '')) {
            throw new Error('Tenant ID must be null or a non-empty string');
        }
    }
    
    validateUserTier(tier) {
        if (!['professional', 'basic', 'enterprise'].includes(tier)) {
            throw new Error('User tier must be professional, basic, or enterprise');
        }
    }
    
    // Getter methods for backward compatibility
    get(key) {
        return this.state[key];
    }
    
    // Setter methods with validation (synchronous for backward compatibility)
    set(key, value) {
        this.validate(key, value);
        this.state[key] = value;
    }
    
    // Async setter methods with validation and error handling
    async setAsync(key, value) {
        try {
            // Validate before setting
            this.validate(key, value);
            
            // Simulate async operation (could be database save, API call, etc.)
            await new Promise(resolve => setTimeout(resolve, 0));
            
            this.state[key] = value;
            return { success: true, key, value };
        } catch (error) {
            return { success: false, error: error.message, key };
        }
    }
    
    // Batch async operations for better performance
    async setBatch(updates) {
        const results = [];
        
        for (const [key, value] of Object.entries(updates)) {
            const result = await this.setAsync(key, value);
            results.push(result);
            
            // If any operation fails, we can choose to continue or stop
            if (!result.success) {
                console.warn(`Failed to set ${key}:`, result.error);
            }
        }
        
        return results;
    }
    
    // Method to get entire state (for debugging)
    getState() {
        return { ...this.state };
    }
    
    // Method to reset state
    reset() {
        this.initializeDefaults();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrustMDState;
} else {
    window.TrustMDState = TrustMDState;
}
