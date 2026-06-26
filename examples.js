// TrustMD API Integration - Usage Examples and Documentation
// This file demonstrates how to use the TrustMD API integration layer

// ==================== BASIC USAGE ====================

// Import the API (if using modules)
// import { createTrustMDAPI } from './api/index.js';

// Or access globally (if loaded via script tags)
const api = window.createTrustMDAPI({
    baseURL: 'http://localhost:3000', // Your API base URL
    debug: true, // Enable debug logging
    persistence: window.localStorage // Enable state persistence
});

// ==================== AUTHENTICATION EXAMPLES ====================

// Login user
async function loginUser() {
    try {
        await api.login({
            email: 'user@example.com',
            password: 'password123',
            rememberMe: true
        });
        
        console.log('Login successful!');
        console.log('Current user:', api.getCurrentUser());
        console.log('Is authenticated:', api.isAuthenticated());
        
    } catch (error) {
        console.error('Login failed:', error.message);
    }
}

// Register new user
async function registerUser() {
    try {
        const response = await api.register({
            email: 'newuser@example.com',
            password: 'password123',
            firstName: 'John',
            lastName: 'Doe'
        });
        
        console.log('Registration successful:', response.data);
        
    } catch (error) {
        console.error('Registration failed:', error.message);
    }
}

// Logout user
async function logoutUser() {
    try {
        await api.logout();
        console.log('Logout successful');
    } catch (error) {
        console.error('Logout failed:', error.message);
    }
}

// Check permissions
function checkPermissions() {
    console.log('Is admin:', api.isAdmin());
    console.log('Has compliance permission:', api.hasPermission('compliance:view'));
    console.log('Has admin role:', api.hasRole('admin'));
}

// ==================== STATE MANAGEMENT EXAMPLES ====================

// Get current state
function getCurrentState() {
    const authState = api.getState('auth');
    const uiState = api.getState('ui');
    const fullState = api.getState();
    
    console.log('Auth state:', authState);
    console.log('UI state:', uiState);
    console.log('Full state:', fullState);
}

// Listen to state changes
function setupStateListeners() {
    // Listen to authentication changes
    const unsubscribeAuth = api.addStateListener('auth', (authState) => {
        console.log('Auth state changed:', authState);
        
        if (authState.isAuthenticated) {
            console.log('User logged in:', authState.user);
        } else {
            console.log('User logged out');
        }
    });
    
    // Listen to UI changes
    const unsubscribeUI = api.addStateListener('ui', (uiState) => {
        console.log('UI state changed:', uiState);
    });
    
    // Stop listening when needed
    // unsubscribeAuth();
    // unsubscribeUI();
}

// Update UI state
function updateUIState() {
    // Toggle sidebar
    api.setState('ui.sidebarOpen', true, 'TOGGLE_SIDEBAR');
    
    // Change theme
    api.setState('ui.theme', 'dark', 'CHANGE_THEME');
    
    // Add notification
    api.addNotification({
        type: 'success',
        title: 'Success',
        message: 'Operation completed successfully'
    });
}

// ==================== COMPLIANCE EXAMPLES ====================

// Load compliance templates
async function loadComplianceTemplates() {
    try {
        const templates = await api.getComplianceTemplates({
            category: 'HIPAA',
            page: 1,
            limit: 10
        });
        
        console.log('Compliance templates:', templates.data);
        
    } catch (error) {
        console.error('Failed to load templates:', error.message);
    }
}

// Generate compliance report
async function generateComplianceReport() {
    try {
        const reportJob = await api.generateComplianceReport('hipaa_security_rule', {
            organizationId: 'org_123',
            includeEvidence: true,
            format: 'pdf'
        });
        
        console.log('Report generation started:', reportJob.data);
        
        // Poll for completion
        const report = await waitForReportCompletion(reportJob.data.id);
        console.log('Report completed:', report);
        
    } catch (error) {
        console.error('Failed to generate report:', error.message);
    }
}

// Wait for report completion
async function waitForReportCompletion(jobId, maxAttempts = 30) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const report = await api.reports.getReport(jobId);
            
            if (report.data.status === 'completed') {
                return report;
            } else if (report.data.status === 'failed') {
                throw new Error('Report generation failed');
            }
            
            // Wait 2 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            if (attempt === maxAttempts - 1) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    throw new Error('Report generation timed out');
}

// ==================== ADMIN EXAMPLES ====================

// Load users
async function loadUsers() {
    try {
        const users = await api.getUsers({
            page: 1,
            limit: 20,
            search: 'john',
            status: 'active'
        });
        
        console.log('Users:', users.data);
        console.log('Pagination:', users.pagination);
        
    } catch (error) {
        console.error('Failed to load users:', error.message);
    }
}

// Create new user
async function createNewUser() {
    try {
        const newUser = await api.createUser({
            email: 'newuser@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            roles: ['user'],
            tenantId: 'tenant_123'
        });
        
        console.log('User created:', newUser.data);
        
    } catch (error) {
        console.error('Failed to create user:', error.message);
    }
}

// ==================== EVENT HANDLING EXAMPLES ====================

// Setup event listeners
function setupEventListeners() {
    // Authentication events
    api.addEventListener('auth:login', (data) => {
        console.log('User logged in:', data.user);
        // Redirect to dashboard, show welcome message, etc.
    });
    
    api.addEventListener('auth:logout', () => {
        console.log('User logged out');
        // Redirect to login page, clear sensitive data, etc.
    });
    
    api.addEventListener('auth:session-expired', (error) => {
        console.log('Session expired:', error);
        // Show session expired modal, redirect to login, etc.
    });
    
    // State events
    api.addEventListener('state:auth-changed', (authState) => {
        console.log('Auth state changed:', authState);
        // Update UI based on auth state
    });
    
    // Error events
    api.addEventListener('error', (errorInfo) => {
        console.error('API error:', errorInfo);
        // Show error notification, log to error tracking, etc.
    });
    
    // Notification events
    api.addEventListener('notification', (notification) => {
        console.log('New notification:', notification);
        // Display notification in UI
    });
}

// ==================== ERROR HANDLING EXAMPLES ====================

// Handle API errors
async function handleAPIErrors() {
    try {
        await api.getComplianceTemplates();
    } catch (error) {
        // Error is automatically handled by the error handler
        // But you can add custom handling if needed
        
        if (error.status === 401) {
            // Redirect to login
            window.location.href = '/login';
        } else if (error.status === 403) {
            // Show access denied message
            api.addNotification({
                type: 'error',
                title: 'Access Denied',
                message: 'You do not have permission to perform this action'
            });
        } else if (error.status === 429) {
            // Show rate limit message
            api.addNotification({
                type: 'warning',
                title: 'Rate Limit Exceeded',
                message: 'Too many requests. Please try again later.'
            });
        }
    }
}

// ==================== ADVANCED USAGE ====================

// Custom HTTP client usage
async function customAPICall() {
    try {
        // Access the underlying HTTP client for custom calls
        const response = await api.apiClient.httpClient.get('/custom/endpoint', {
            headers: {
                'Custom-Header': 'value'
            }
        });
        
        console.log('Custom API response:', response.data);
        
    } catch (error) {
        console.error('Custom API call failed:', error);
    }
}

// Direct service usage
async function directServiceUsage() {
    try {
        // Use specialized services directly
        const templates = await api.compliance.getTemplates({
            category: 'OSHA'
        });
        
        const reports = await api.reports.getActiveReports();
        const users = await api.admin.getUsers({ limit: 5 });
        
        console.log('Templates from compliance service:', templates);
        console.log('Active reports:', reports);
        console.log('Users from admin service:', users);
        
    } catch (error) {
        console.error('Direct service usage failed:', error);
    }
}

// ==================== REACT INTEGRATION EXAMPLE ====================

// React Hook for TrustMD API
function useTrustMDAPI() {
    const [state, setState] = React.useState(() => api.getState());
    const [isAuthenticated, setIsAuthenticated] = React.useState(() => api.isAuthenticated());
    
    React.useEffect(() => {
        // Listen to state changes
        const unsubscribe = api.addStateListener('*', (newState) => {
            setState(newState);
            setIsAuthenticated(api.isAuthenticated());
        });
        
        return unsubscribe;
    }, []);
    
    const actions = {
        login: api.login.bind(api),
        logout: api.logout.bind(api),
        register: api.register.bind(api),
        getComplianceTemplates: api.getComplianceTemplates.bind(api),
        generateComplianceReport: api.generateComplianceReport.bind(api),
        getUsers: api.getUsers.bind(api),
        createUser: api.createUser.bind(api),
        addNotification: api.addNotification.bind(api),
        setState: api.setState.bind(api)
    };
    
    return {
        state,
        isAuthenticated,
        currentUser: api.getCurrentUser(),
        api,
        actions
    };
}

// React Component Example
function ComplianceDashboard() {
    const { state, actions, isAuthenticated } = useTrustMDAPI();
    
    React.useEffect(() => {
        if (isAuthenticated) {
            actions.getComplianceTemplates();
        }
    }, [isAuthenticated]);
    
    const handleGenerateReport = async (templateId) => {
        try {
            await actions.generateComplianceReport(templateId);
            actions.addNotification({
                type: 'success',
                title: 'Report Generation Started',
                message: 'Your report is being generated. You will be notified when it\'s ready.'
            });
        } catch (error) {
            actions.addNotification({
                type: 'error',
                title: 'Report Generation Failed',
                message: error.message
            });
        }
    };
    
    if (!isAuthenticated) {
        return <div>Please log in to view this dashboard.</div>;
    }
    
    return (
        <div>
            <h1>Compliance Dashboard</h1>
            
            {/* Notifications */}
            {state.ui.notifications.map(notification => (
                <div key={notification.id} className={`notification ${notification.type}`}>
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                </div>
            ))}
            
            {/* Templates */}
            <div className="templates">
                <h2>Compliance Templates</h2>
                {state.compliance.loading ? (
                    <div>Loading templates...</div>
                ) : (
                    <ul>
                        {state.compliance.templates.map(template => (
                            <li key={template.id}>
                                <h3>{template.name}</h3>
                                <p>{template.description}</p>
                                <button onClick={() => handleGenerateReport(template.id)}>
                                    Generate Report
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

// ==================== VUE INTEGRATION EXAMPLE ====================

// Vue Plugin for TrustMD API
const TrustMDPlugin = {
    install(app, options) {
        const api = createTrustMDAPI(options);
        
        app.config.globalProperties.$api = api;
        app.provide('api', api);
        
        // Reactive state
        const reactiveState = Vue.reactive(api.getState());
        
        // Update reactive state when actual state changes
        api.addStateListener('*', (newState) => {
            Object.assign(reactiveState, newState);
        });
        
        app.config.globalProperties.$state = reactiveState;
        app.provide('state', reactiveState);
    }
};

// Vue Component Example
// const app = createApp(App);
// app.use(TrustMDPlugin, { baseURL: 'http://localhost:3000' });

// ==================== INITIALIZATION ====================

// Initialize the API when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // The API is auto-initialized, but you can wait for it
        await api.initialize();
        
        console.log('TrustMD API initialized successfully');
        console.log('Status:', api.getStatus());
        
        // Setup event listeners
        setupEventListeners();
        setupStateListeners();
        
        // Check if user is already authenticated
        if (api.isAuthenticated()) {
            console.log('User is already authenticated:', api.getCurrentUser());
        }
        
    } catch (error) {
        console.error('Failed to initialize TrustMD API:', error);
    }
});

// ==================== HEALTH CHECK ====================

// Periodic health check
setInterval(async () => {
    try {
        const health = await api.healthCheck();
        console.log('API Health:', health);
        
        if (!health.healthy) {
            api.addNotification({
                type: 'warning',
                title: 'API Health Warning',
                message: 'API is experiencing issues. Some features may not work correctly.'
            });
        }
    } catch (error) {
        console.error('Health check failed:', error);
    }
}, 60000); // Check every minute

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loginUser,
        registerUser,
        logoutUser,
        loadComplianceTemplates,
        generateComplianceReport,
        loadUsers,
        createNewUser,
        setupEventListeners,
        useTrustMDAPI,
        TrustMDPlugin
    };
}
