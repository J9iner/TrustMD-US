/**
 * TrustMD Backend Initialization Script
 * Initializes all backend components
 */

// Global namespace for TrustMD backend
window.TrustMDBackend = {
    initialized: false,
    version: '2.0.0',
    components: {}
};

// Initialize backend components
async function initializeBackend() {
    console.log('Initializing TrustMD Backend...');
    
    try {
        // Initialize core components
        if (window.RBACManager) {
            window.TrustMDBackend.components.rbac = new window.RBACManager();
            console.log('✅ RBAC Manager initialized');
        }
        
        if (window.TenantManager) {
            window.TrustMDBackend.components.tenant = new window.TenantManager();
            console.log('✅ Tenant Manager initialized');
        }
        
        if (window.UserProvisioning) {
            window.TrustMDBackend.components.userProvisioning = new window.UserProvisioning();
            console.log('✅ User Provisioning initialized');
        }
        
        if (window.AuditLogger) {
            window.TrustMDBackend.components.auditLogger = new window.AuditLogger();
            console.log('✅ Audit Logger initialized');
        }
        
        if (window.EnhancedAuth) {
            window.TrustMDBackend.components.auth = new window.EnhancedAuth();
            console.log('✅ Enhanced Auth initialized');
        }
        
        if (window.TrustMDRiskEngine) {
            window.TrustMDBackend.components.riskEngine = new window.TrustMDRiskEngine();
            console.log('✅ Risk Engine initialized');
        }
        
        if (window.TrustMDEvidenceVault) {
            window.TrustMDBackend.components.evidenceVault = new window.TrustMDEvidenceVault();
            console.log('✅ Evidence Vault initialized');
        }
        
        if (window.RealTimeSyncManager) {
            window.TrustMDBackend.components.syncManager = new window.RealTimeSyncManager();
            console.log('✅ Real-time Sync Manager initialized');
        }
        
        // Mark as initialized
        window.TrustMDBackend.initialized = true;
        console.log('🎉 TrustMD Backend initialization complete!');
        
        return true;
    } catch (error) {
        console.error('❌ Backend initialization failed:', error);
        return false;
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBackend);
} else {
    initializeBackend();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initializeBackend };
}
