// TrustMD API Integration
// Main entry point that ties together all API services and state management

// Import services
const { HTTPClient } = require('./http-client');
const { APIClient } = require('./api-client');
const { AuthService } = require('./auth-service');
const { ComplianceService } = require('./compliance-service');
const { ReportsService } = require('./reports-service');
const { AdminService } = require('./admin-service');
const { PaymentService } = require('./payment-service');

class TrustMDAPI {
    constructor(config = {}) {
        this.config = {
            baseURL: config.baseURL || null,
            timeout: config.timeout || 30000,
            persistence: config.persistence || (typeof window !== 'undefined' && window.localStorage),
            debug: config.debug || false,
            autoInit: config.autoInit !== false,
            ...config
        };
        
        // Core components
        this.httpClient = null;
        this.apiClient = null;
        this.authService = null;
        this.stateManager = null;
        this.stateIntegration = null;
        this.stateActions = null;
        
        // Services
        this.compliance = null;
        this.reports = null;
        this.admin = null;
        this.payment = null;
        
        // Status
        this.initialized = false;
        this.initializing = false;
        
        // Auto-initialize if enabled
        if (this.config.autoInit) {
            this.initialize();
        }
    }
    
    // Initialize the API integration
    async initialize() {
        if (this.initialized || this.initializing) {
            return;
        }
        
        this.initializing = true;
        
        try {
            console.log('Initializing TrustMD API Integration...');
            
            // Step 1: Initialize HTTP client
            this.httpClient = new TrustMDHttpClient({
                baseURL: this.config.baseURL,
                timeout: this.config.timeout,
                debug: this.config.debug
            });
            
            // Step 2: Initialize API client
            this.apiClient = new TrustMDAPIClient({
                baseURL: this.config.baseURL,
                timeout: this.config.timeout
            });
            
            // Step 3: Initialize authentication service
            this.authService = new AuthService(this.apiClient);
            
            // Step 4: Initialize state manager
            this.stateManager = new StateManager({
                persistence: this.config.persistence,
                debug: this.config.debug
            });
            
            // Step 5: Initialize state integration
            this.stateIntegration = new APIStateIntegration(
                this.stateManager,
                this.apiClient,
                this.authService
            );
            
            // Step 6: Initialize state actions
            this.stateActions = new StateActions(
                this.stateManager,
                this.apiClient,
                this.authService
            );
            
            // Step 7: Initialize specialized services
            this.compliance = new ComplianceService(this.apiClient);
            this.reports = new ReportsService(this.apiClient);
            this.admin = new AdminService(this.apiClient);
            this.payment = new PaymentService(this.apiClient);
            
            // Step 8: Setup global error handling
            this.setupGlobalErrorHandling();
            
            // Step 9: Setup event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            this.initializing = false;
            
            console.log('TrustMD API Integration initialized successfully');
            
            // Emit initialization event
            this.emit('initialized', {
                timestamp: new Date().toISOString(),
                config: this.config
            });
            
        } catch (error) {
            this.initializing = false;
            console.error('Failed to initialize TrustMD API Integration:', error);
            throw error;
        }
    }
    
    // Setup global error handling
    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', (event) => {
                console.error('Unhandled promise rejection:', event.reason);
                this.emit('error', {
                    type: 'UNHANDLED_PROMISE_REJECTION',
                    error: event.reason,
                    timestamp: new Date().toISOString()
                });
            });
            
            // Handle API notifications
            window.addEventListener('api-notification', (event) => {
                this.handleAPINotification(event.detail);
            });
        }
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Authentication events
        this.authService.addEventListener('login', (data) => {
            this.emit('auth:login', data);
        });
        
        this.authService.addEventListener('logout', () => {
            this.emit('auth:logout');
        });
        
        this.authService.addEventListener('session-expired', (error) => {
            this.emit('auth:session-expired', error);
        });
        
        // State changes
        this.stateManager.addListener('auth', (authState) => {
            this.emit('state:auth-changed', authState);
        });
        
        this.stateManager.addListener('ui', (uiState) => {
            this.emit('state:ui-changed', uiState);
        });
    }
    
    // Handle API notifications
    handleAPINotification(notification) {
        // Add to state notifications
        this.stateActions.addNotification(notification);
        
        // Emit notification event
        this.emit('notification', notification);
    }
    
    // Ensure initialization
    async ensureInitialized() {
        if (!this.initialized) {
            if (this.initializing) {
                // Wait for initialization to complete
                await new Promise((resolve, reject) => {
                    const checkInterval = setInterval(() => {
                        if (this.initialized) {
                            clearInterval(checkInterval);
                            resolve();
                        } else if (!this.initializing) {
                            clearInterval(checkInterval);
                            reject(new Error('Initialization failed'));
                        }
                    }, 100);
                });
            } else {
                await this.initialize();
            }
        }
    }
    
    // Authentication methods
    async login(credentials) {
        await this.ensureInitialized();
        return this.stateActions.login(credentials);
    }
    
    async logout() {
        await this.ensureInitialized();
        return this.stateActions.logout();
    }
    
    async register(userData) {
        await this.ensureInitialized();
        return this.authService.register(userData);
    }
    
    // State management methods
    getState(path = null) {
        return this.stateManager ? this.stateManager.getState(path) : null;
    }
    
    setState(path, value, action = null) {
        if (this.stateManager) {
            this.stateManager.setState(path, value, action);
        }
    }
    
    addStateListener(path, callback) {
        return this.stateManager ? this.stateManager.addListener(path, callback) : null;
    }
    
    // Service shortcuts
    async getComplianceTemplates(filters = {}) {
        await this.ensureInitialized();
        return this.stateActions.loadComplianceTemplates(filters);
    }
    
    async generateComplianceReport(templateId, parameters) {
        await this.ensureInitialized();
        return this.stateActions.generateComplianceReport(templateId, parameters);
    }
    
    async getUsers(filters = {}) {
        await this.ensureInitialized();
        return this.stateActions.loadUsers(filters);
    }
    
    async createUser(userData) {
        await this.ensureInitialized();
        return this.stateActions.createUser(userData);
    }
    
    // UI methods
    setSidebarOpen(open) {
        if (this.stateActions) {
            this.stateActions.setSidebarOpen(open);
        }
    }
    
    setTheme(theme) {
        if (this.stateActions) {
            this.stateActions.setTheme(theme);
        }
    }
    
    addNotification(notification) {
        if (this.stateActions) {
            this.stateActions.addNotification(notification);
        }
    }
    
    // Utility methods
    isAuthenticated() {
        return this.authService ? this.authService.isAuthenticated() : false;
    }
    
    getCurrentUser() {
        return this.authService ? this.authService.getCurrentUser() : null;
    }
    
    getCurrentTenant() {
        return this.authService ? this.authService.getCurrentTenant() : null;
    }
    
    hasPermission(permission) {
        return this.authService ? this.authService.hasPermission(permission) : false;
    }
    
    hasRole(role) {
        return this.authService ? this.authService.hasRole(role) : false;
    }
    
    isAdmin() {
        return this.authService ? this.authService.isAdmin() : false;
    }
    
    // Event handling
    emit(event, data) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(`trustmd:${event}`, {
                detail: data
            }));
        }
    }
    
    addEventListener(event, listener) {
        if (typeof window !== 'undefined') {
            window.addEventListener(`trustmd:${event}`, (event) => {
                listener(event.detail);
            });
        }
    }
    
    // Health check
    async healthCheck() {
        await this.ensureInitialized();
        try {
            const response = await this.apiClient.healthCheck();
            return {
                healthy: true,
                api: response.data,
                state: {
                    initialized: this.initialized,
                    authenticated: this.isAuthenticated(),
                    user: this.getCurrentUser(),
                    tenant: this.getCurrentTenant()
                }
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                state: {
                    initialized: this.initialized,
                    authenticated: this.isAuthenticated()
                }
            };
        }
    }
    
    // Get configuration
    getConfig() {
        return { ...this.config };
    }
    
    // Update configuration
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Reinitialize if necessary
        if (this.initialized && (newConfig.baseURL || newConfig.timeout)) {
            this.initialize();
        }
    }
    
    // Reset everything
    reset() {
        // Clear authentication
        if (this.authService) {
            this.authService.clearAuth();
        }
        
        // Reset state
        if (this.stateManager) {
            this.stateManager.resetState();
        }
        
        // Clear caches
        if (this.compliance) {
            this.compliance.clearCache();
        }
        if (this.reports) {
            this.reports.clearCache();
        }
        if (this.admin) {
            this.admin.clearCache();
        }
        
        this.emit('reset', {
            timestamp: new Date().toISOString()
        });
    }
    
    // Destroy API integration
    destroy() {
        this.reset();
        
        // Clear references
        this.httpClient = null;
        this.apiClient = null;
        this.authService = null;
        this.stateManager = null;
        this.stateIntegration = null;
        this.stateActions = null;
        this.compliance = null;
        this.reports = null;
        this.admin = null;
        
        this.initialized = false;
        
        this.emit('destroyed', {
            timestamp: new Date().toISOString()
        });
    }
    
    // Get status information
    getStatus() {
        return {
            initialized: this.initialized,
            initializing: this.initializing,
            authenticated: this.isAuthenticated(),
            config: this.config,
            components: {
                httpClient: !!this.httpClient,
                apiClient: !!this.apiClient,
                authService: !!this.authService,
                stateManager: !!this.stateManager,
                compliance: !!this.compliance,
                reports: !!this.reports,
                admin: !!this.admin,
                payment: !!this.payment
            },
            user: this.getCurrentUser(),
            tenant: this.getCurrentTenant()
        };
    }
}

// Create global instance
let globalAPI = null;

// Factory function
function createTrustMDAPI(config = {}) {
    if (!globalAPI) {
        globalAPI = new TrustMDAPI(config);
    }
    return globalAPI;
}

// Get global instance
function getTrustMDAPI() {
    return globalAPI;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TrustMDAPI,
        createTrustMDAPI,
        getTrustMDAPI
    };
} else {
    window.TrustMDAPI = TrustMDAPI;
    window.createTrustMDAPI = createTrustMDAPI;
    window.getTrustMDAPI = getTrustMDAPI;
    
    // Auto-create global instance
    globalAPI = createTrustMDAPI();
}
