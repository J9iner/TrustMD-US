// TrustMD State Management Integration
// Connects API services with state management (works with any state management library)

class StateManager {
    constructor(config = {}) {
        this.state = {};
        this.listeners = new Map();
        this.middlewares = [];
        this.persistence = config.persistence || null;
        this.debug = config.debug || false;
        
        // Initialize state
        this.initializeState();
        
        // Setup persistence
        if (this.persistence) {
            this.setupPersistence();
        }
    }
    
    // Initialize default state structure
    initializeState() {
        this.state = {
            // Authentication state
            auth: {
                isAuthenticated: false,
                user: null,
                tenant: null,
                loading: false,
                error: null
            },
            
            // Compliance state
            compliance: {
                templates: [],
                reports: [],
                alerts: [],
                requirements: [],
                evidence: [],
                loading: false,
                error: null
            },
            
            // Reports state
            reports: {
                activeReports: [],
                completedReports: [],
                scheduledReports: [],
                templates: [],
                loading: false,
                error: null
            },
            
            // Admin state
            admin: {
                users: [],
                tenants: [],
                roles: [],
                auditLogs: [],
                securityAlerts: [],
                systemStatus: null,
                loading: false,
                error: null
            },
            
            // UI state
            ui: {
                sidebarOpen: true,
                theme: 'light',
                notifications: [],
                modals: [],
                loading: {},
                errors: {}
            },
            
            // Cache state
            cache: {
                templates: new Map(),
                reports: new Map(),
                users: new Map(),
                metadata: {
                    lastUpdated: null,
                    version: '1.0.0'
                }
            }
        };
    }
    
    // Setup persistence
    setupPersistence() {
        // Load from persistence
        if (this.persistence && typeof this.persistence.getItem === 'function') {
            try {
                const persistedState = this.persistence.getItem('trustmd_state');
                if (persistedState) {
                    this.state = { ...this.state, ...JSON.parse(persistedState) };
                }
            } catch (error) {
                console.warn('Failed to load persisted state:', error);
            }
        }
        
        // Auto-save state changes
        this.addMiddleware((state, action) => {
            if (this.persistence && typeof this.persistence.setItem === 'function') {
                try {
                    this.persistence.setItem('trustmd_state', JSON.stringify(state));
                } catch (error) {
                    console.warn('Failed to persist state:', error);
                }
            }
            return state;
        });
    }
    
    // Get state
    getState(path = null) {
        if (!path) {
            return this.state;
        }
        
        return this.getNestedValue(this.state, path);
    }
    
    // Get nested value from state
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
        }, obj);
    }
    
    // Set state
    setState(path, value, action = null) {
        const newState = { ...this.state };
        this.setNestedValue(newState, path, value);
        
        const actionData = {
            type: action || 'SET_STATE',
            payload: { path, value },
            timestamp: new Date().toISOString()
        };
        
        // Apply middlewares
        let finalState = newState;
        for (const middleware of this.middlewares) {
            finalState = middleware(finalState, actionData) || finalState;
        }
        
        const prevState = this.state;
        this.state = finalState;
        
        // Notify listeners
        this.notifyListeners(path, value, prevState, actionData);
        
        if (this.debug) {
            console.log('State updated:', { path, value, action: actionData.type });
        }
    }
    
    // Set nested value in state
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        
        target[lastKey] = value;
    }
    
    // Update state (merge for objects)
    updateState(path, updates, action = null) {
        const current = this.getState(path) || {};
        const updated = typeof current === 'object' ? 
            { ...current, ...updates } : updates;
        
        this.setState(path, updated, action);
    }
    
    // Add state listener
    addListener(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Set());
        }
        
        this.listeners.get(path).add(callback);
        
        // Return unsubscribe function
        return () => {
            this.listeners.get(path).delete(callback);
            if (this.listeners.get(path).size === 0) {
                this.listeners.delete(path);
            }
        };
    }
    
    // Notify listeners
    notifyListeners(path, value, prevState, action) {
        // Notify exact path listeners
        if (this.listeners.has(path)) {
            this.listeners.get(path).forEach(callback => {
                try {
                    callback(value, prevState, action);
                } catch (error) {
                    console.error('State listener error:', error);
                }
            });
        }
        
        // Notify parent path listeners
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            if (this.listeners.has(parentPath)) {
                this.listeners.get(parentPath).forEach(callback => {
                    try {
                        callback(this.getState(parentPath), prevState, action);
                    } catch (error) {
                        console.error('State listener error:', error);
                    }
                });
            }
        }
    }
    
    // Add middleware
    addMiddleware(middleware) {
        this.middlewares.push(middleware);
    }
    
    // Reset state
    resetState(path = null) {
        if (path) {
            const defaultState = this.getNestedValue(this.createDefaultState(), path);
            this.setState(path, defaultState, 'RESET_STATE');
        } else {
            this.initializeState();
            this.notifyListeners('*', this.state, null, { type: 'RESET_ALL_STATE' });
        }
    }
    
    // Create default state (for reset)
    createDefaultState() {
        const tempManager = new StateManager({ debug: false });
        return tempManager.state;
    }
}

class APIStateIntegration {
    constructor(stateManager, apiClient, authService) {
        this.stateManager = stateManager;
        this.apiClient = apiClient;
        this.authService = authService;
        
        this.setupIntegration();
    }
    
    // Setup integration between API and state
    setupIntegration() {
        // Authentication integration
        this.setupAuthIntegration();
        
        // API error handling
        this.setupErrorHandling();
        
        // Loading state management
        this.setupLoadingStates();
        
        // Cache integration
        this.setupCacheIntegration();
    }
    
    // Setup authentication integration
    setupAuthIntegration() {
        // Listen to auth service events
        this.authService.addEventListener('login', (data) => {
            this.stateManager.setState('auth', {
                isAuthenticated: true,
                user: data.user,
                tenant: data.tenant || null,
                loading: false,
                error: null
            }, 'AUTH_LOGIN');
        });
        
        this.authService.addEventListener('logout', () => {
            this.stateManager.setState('auth', {
                isAuthenticated: false,
                user: null,
                tenant: null,
                loading: false,
                error: null
            }, 'AUTH_LOGOUT');
        });
        
        this.authService.addEventListener('session-expired', () => {
            this.stateManager.updateState('auth', {
                isAuthenticated: false,
                error: 'Session expired. Please log in again.'
            }, 'AUTH_SESSION_EXPIRED');
        });
        
        this.authService.addEventListener('user-updated', (user) => {
            this.stateManager.updateState('auth', { user }, 'AUTH_USER_UPDATED');
        });
    }
    
    // Setup error handling
    setupErrorHandling() {
        // Global API error handler
        this.apiClient.addEventListener('error', (error) => {
            const errorKey = `api_${Date.now()}`;
            this.stateManager.setNestedValue(this.stateManager.state, `ui.errors.${errorKey}`, {
                error,
                timestamp: new Date().toISOString()
            });
            
            // Clean up old errors (keep only last 10)
            const errors = this.stateManager.getState('ui.errors') || {};
            const errorKeys = Object.keys(errors);
            if (errorKeys.length > 10) {
                const keysToRemove = errorKeys.slice(0, errorKeys.length - 10);
                keysToRemove.forEach(key => {
                    delete errors[key];
                });
                this.stateManager.setState('ui.errors', errors);
            }
        });
    }
    
    // Setup loading states
    setupLoadingStates() {
        // HTTP client interceptors for loading states
        this.apiClient.httpClient.addRequestInterceptor((request) => {
            const loadingKey = this.getLoadingKey(request.url, request.method);
            this.stateManager.setNestedValue(
                this.stateManager.state, 
                `ui.loading.${loadingKey}`, 
                true
            );
            return request;
        });
        
        this.apiClient.httpClient.addResponseInterceptor((response) => {
            const loadingKey = this.getLoadingKey(response.url, 'GET'); // Approximate
            this.stateManager.setNestedValue(
                this.stateManager.state, 
                `ui.loading.${loadingKey}`, 
                false
            );
            return response;
        });
    }
    
    // Get loading key for request
    getLoadingKey(url, method) {
        // Extract a meaningful key from URL
        const pathParts = url.split('/').filter(part => part && !part.includes('http'));
        const key = pathParts.join('_') || 'api';
        return `${method.toLowerCase()}_${key}`;
    }
    
    // Setup cache integration
    setupCacheIntegration() {
        // Sync API cache with state cache
        this.apiClient.addEventListener('response', (response) => {
            // Cache certain responses in state
            if (response.config?.cache !== false) {
                const cacheKey = this.getCacheKey(response.config?.url || '');
                if (cacheKey) {
                    this.stateManager.setNestedValue(
                        this.stateManager.state,
                        `cache.${cacheKey}`,
                        {
                            data: response.data,
                            timestamp: Date.now(),
                            url: response.config?.url
                        }
                    );
                }
            }
        });
    }
    
    // Get cache key for URL
    getCacheKey(url) {
        if (url.includes('/templates')) return 'templates';
        if (url.includes('/reports')) return 'reports';
        if (url.includes('/users')) return 'users';
        if (url.includes('/tenants')) return 'tenants';
        if (url.includes('/roles')) return 'roles';
        return null;
    }
}

class StateActions {
    constructor(stateManager, apiClient, authService) {
        this.stateManager = stateManager;
        this.apiClient = apiClient;
        this.authService = authService;
    }
    
    // Authentication actions
    async login(credentials) {
        this.stateManager.updateState('auth', { loading: true, error: null }, 'LOGIN_START');
        
        try {
            await this.authService.login(credentials);
        } catch (error) {
            this.stateManager.updateState('auth', { 
                loading: false, 
                error: error.message 
            }, 'LOGIN_ERROR');
            throw error;
        }
    }
    
    async logout() {
        this.stateManager.updateState('auth', { loading: true }, 'LOGOUT_START');
        
        try {
            await this.authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
            // Still clear local state even if server logout fails
            this.authService.clearAuth();
        }
    }
    
    // Compliance actions
    async loadComplianceTemplates(filters = {}) {
        this.stateManager.updateState('compliance', { loading: true, error: null }, 'LOAD_TEMPLATES_START');
        
        try {
            const response = await this.apiClient.getComplianceTemplates(filters);
            this.stateManager.updateState('compliance', {
                templates: response.data,
                loading: false
            }, 'LOAD_TEMPLATES_SUCCESS');
            return response;
        } catch (error) {
            this.stateManager.updateState('compliance', {
                loading: false,
                error: error.message
            }, 'LOAD_TEMPLATES_ERROR');
            throw error;
        }
    }
    
    async generateComplianceReport(templateId, parameters) {
        this.stateManager.updateState('compliance', { loading: true, error: null }, 'GENERATE_REPORT_START');
        
        try {
            const response = await this.apiClient.generateComplianceReport(templateId, parameters);
            
            // Add to active reports
            const activeReports = this.stateManager.getState('compliance.reports') || [];
            this.stateManager.setState('compliance.reports', [
                ...activeReports,
                response.data
            ], 'ADD_ACTIVE_REPORT');
            
            this.stateManager.updateState('compliance', { loading: false }, 'GENERATE_REPORT_SUCCESS');
            return response;
        } catch (error) {
            this.stateManager.updateState('compliance', {
                loading: false,
                error: error.message
            }, 'GENERATE_REPORT_ERROR');
            throw error;
        }
    }
    
    // Admin actions
    async loadUsers(filters = {}) {
        this.stateManager.updateState('admin', { loading: true, error: null }, 'LOAD_USERS_START');
        
        try {
            const response = await this.apiClient.getUsers(filters);
            this.stateManager.updateState('admin', {
                users: response.data,
                loading: false
            }, 'LOAD_USERS_SUCCESS');
            return response;
        } catch (error) {
            this.stateManager.updateState('admin', {
                loading: false,
                error: error.message
            }, 'LOAD_USERS_ERROR');
            throw error;
        }
    }
    
    async createUser(userData) {
        this.stateManager.updateState('admin', { loading: true, error: null }, 'CREATE_USER_START');
        
        try {
            const response = await this.apiClient.createUser(userData);
            
            // Add to users list
            const users = this.stateManager.getState('admin.users') || [];
            this.stateManager.setState('admin.users', [...users, response.data], 'ADD_USER');
            
            this.stateManager.updateState('admin', { loading: false }, 'CREATE_USER_SUCCESS');
            return response;
        } catch (error) {
            this.stateManager.updateState('admin', {
                loading: false,
                error: error.message
            }, 'CREATE_USER_ERROR');
            throw error;
        }
    }
    
    // UI actions
    setSidebarOpen(open) {
        this.stateManager.setState('ui.sidebarOpen', open, 'SET_SIDEBAR_OPEN');
    }
    
    setTheme(theme) {
        this.stateManager.setState('ui.theme', theme, 'SET_THEME');
    }
    
    addNotification(notification) {
        const notifications = this.stateManager.getState('ui.notifications') || [];
        this.stateManager.setState('ui.notifications', [
            ...notifications,
            { ...notification, id: Date.now().toString() }
        ], 'ADD_NOTIFICATION');
    }
    
    removeNotification(notificationId) {
        const notifications = this.stateManager.getState('ui.notifications') || [];
        this.stateManager.setState('ui.notifications', 
            notifications.filter(n => n.id !== notificationId),
            'REMOVE_NOTIFICATION'
        );
    }
    
    clearError(errorKey) {
        const errors = this.stateManager.getState('ui.errors') || {};
        delete errors[errorKey];
        this.stateManager.setState('ui.errors', errors, 'CLEAR_ERROR');
    }
    
    clearAllErrors() {
        this.stateManager.setState('ui.errors', {}, 'CLEAR_ALL_ERRORS');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StateManager,
        APIStateIntegration,
        StateActions
    };
} else {
    window.StateManager = StateManager;
    window.APIStateIntegration = APIStateIntegration;
    window.StateActions = StateActions;
}
