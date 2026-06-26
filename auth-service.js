// TrustMD Authentication Service
// Enhanced authentication service with token management, session handling, and OAuth support

class AuthService {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.currentUser = null;
        this.tenantContext = null;
        this.sessionTimeout = null;
        this.refreshTimer = null;
        this.oauthProviders = [];
        
        // Event listeners
        this.eventListeners = {
            'login': [],
            'logout': [],
            'token-refreshed': [],
            'session-expired': [],
            'user-updated': [],
            'tenant-changed': [],
            'oauth-login': [],
            'oauth-error': []
        };
        
        // Initialize
        this.initializeAuth();
        this.loadOAuthProviders();
    }
    
    // Initialize authentication from stored tokens
    async initializeAuth() {
        try {
            if (this.apiClient.isAuthenticated()) {
                // Validate stored token
                const user = await this.validateToken();
                if (user) {
                    this.currentUser = user;
                    this.setupSessionManagement();
                    this.emit('login', { user });
                } else {
                    // Token invalid, clear it
                    this.clearAuth();
                }
            }
        } catch (error) {
            console.error('Auth initialization failed:', error);
            this.clearAuth();
        }
    }
    
    // Login with credentials
    async login(credentials) {
        try {
            // Validate credentials
            if (!credentials.email || !credentials.password) {
                throw new Error('Email and password are required');
            }
            
            // Add tenant context if available
            if (this.tenantContext) {
                credentials.tenantId = this.tenantContext.id;
            }
            
            // Make login request
            const response = await this.apiClient.login(credentials);
            
            if (response.data && response.data.user) {
                this.currentUser = response.data.user;
                
                // Set tenant context if provided
                if (response.data.tenantId) {
                    this.setTenantContext(response.data.tenantId);
                }
                
                // Setup session management
                this.setupSessionManagement();
                
                // Emit login event
                this.emit('login', {
                    user: this.currentUser,
                    tenant: this.tenantContext
                });
                
                return response;
            } else {
                throw new Error('Invalid login response');
            }
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }
    
    // Register new user
    async register(userData) {
        try {
            // Validate user data
            this.validateUserData(userData);
            
            // Add tenant context if available
            if (this.tenantContext) {
                userData.tenantId = this.tenantContext.id;
            }
            
            const response = await this.apiClient.register(userData);
            
            if (response.data && response.data.user) {
                // Auto-login after registration
                if (response.data.accessToken) {
                    this.currentUser = response.data.user;
                    this.setupSessionManagement();
                    this.emit('login', { user: this.currentUser });
                }
            }
            
            return response;
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    }
    
    // Logout user
    async logout() {
        try {
            // Call server logout
            await this.apiClient.logout();
        } catch (error) {
            console.warn('Server logout failed:', error);
        } finally {
            // Always clear local auth
            this.clearAuth();
            this.emit('logout', { user: this.currentUser });
        }
    }
    
    // Validate current token
    async validateToken() {
        try {
            const response = await this.apiClient.getCurrentUser();
            return response.data;
        } catch (error) {
            if (error.status === 401) {
                return null;
            }
            throw error;
        }
    }
    
    // Refresh tokens
    async refreshTokens() {
        try {
            const response = await this.apiClient.refreshTokens();
            
            if (response.data && response.data.accessToken) {
                // Update current user if provided
                if (response.data.user) {
                    this.currentUser = response.data.user;
                }
                
                this.emit('token-refreshed', response.data);
                return response.data;
            } else {
                throw new Error('Invalid refresh response');
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearAuth();
            this.emit('session-expired', error);
            throw error;
        }
    }
    
    // Update user profile
    async updateProfile(profileData) {
        try {
            const response = await this.apiClient.updateProfile(profileData);
            
            if (response.data) {
                this.currentUser = { ...this.currentUser, ...response.data };
                this.emit('user-updated', this.currentUser);
            }
            
            return response;
        } catch (error) {
            console.error('Profile update failed:', error);
            throw error;
        }
    }
    
    // Change password
    async changePassword(passwordData) {
        try {
            if (!passwordData.currentPassword || !passwordData.newPassword) {
                throw new Error('Current password and new password are required');
            }
            
            if (passwordData.newPassword.length < 8) {
                throw new Error('New password must be at least 8 characters');
            }
            
            const response = await this.apiClient.changePassword(passwordData);
            return response;
        } catch (error) {
            console.error('Password change failed:', error);
            throw error;
        }
    }
    
    // Setup session management
    setupSessionManagement() {
        // Clear existing timers
        this.clearSessionTimers();
        
        // Setup token refresh timer (refresh every 50 minutes)
        this.refreshTimer = setInterval(() => {
            this.refreshTokens().catch(error => {
                console.error('Auto token refresh failed:', error);
            });
        }, 50 * 60 * 1000); // 50 minutes
        
        // Setup session timeout (if user data includes timeout)
        if (this.currentUser && this.currentUser.sessionTimeout) {
            this.sessionTimeout = setTimeout(() => {
                console.log('Session expired due to inactivity');
                this.clearAuth();
                this.emit('session-expired', { reason: 'inactivity' });
            }, this.currentUser.sessionTimeout);
        }
        
        // Setup activity tracking
        this.setupActivityTracking();
    }
    
    // Setup activity tracking
    setupActivityTracking() {
        if (typeof window !== 'undefined') {
            const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
            
            const activityHandler = () => {
                // Reset session timeout
                if (this.sessionTimeout) {
                    clearTimeout(this.sessionTimeout);
                    
                    if (this.currentUser && this.currentUser.sessionTimeout) {
                        this.sessionTimeout = setTimeout(() => {
                            this.clearAuth();
                            this.emit('session-expired', { reason: 'inactivity' });
                        }, this.currentUser.sessionTimeout);
                    }
                }
            };
            
            events.forEach(event => {
                document.addEventListener(event, activityHandler, true);
            });
        }
    }
    
    // Clear session timers
    clearSessionTimers() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
            this.sessionTimeout = null;
        }
    }
    
    // Set tenant context
    setTenantContext(tenantId) {
        this.tenantContext = { id: tenantId };
        this.apiClient.setTenant(tenantId);
        this.emit('tenant-changed', { tenantId });
    }
    
    // Clear authentication
    clearAuth() {
        this.currentUser = null;
        this.tenantContext = null;
        this.clearSessionTimers();
        this.apiClient.clearAuth();
    }
    
    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }
    
    // Get current tenant
    getCurrentTenant() {
        return this.tenantContext;
    }
    
    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser && this.apiClient.isAuthenticated();
    }
    
    // Check user permissions
    hasPermission(permission) {
        if (!this.currentUser || !this.currentUser.permissions) {
            return false;
        }
        
        return this.currentUser.permissions.includes(permission);
    }
    
    // Check user role
    hasRole(role) {
        if (!this.currentUser || !this.currentUser.roles) {
            return false;
        }
        
        return this.currentUser.roles.some(userRole => 
            userRole.name === role || userRole.id === role
        );
    }
    
    // Check if user is admin
    isAdmin() {
        return this.hasRole('admin') || this.hasRole('super_admin');
    }
    
    // Validate user data
    validateUserData(userData) {
        const errors = [];
        
        if (!userData.email) {
            errors.push('Email is required');
        } else if (!this.isValidEmail(userData.email)) {
            errors.push('Invalid email format');
        }
        
        if (!userData.password) {
            errors.push('Password is required');
        } else if (userData.password.length < 8) {
            errors.push('Password must be at least 8 characters');
        }
        
        if (!userData.firstName) {
            errors.push('First name is required');
        }
        
        if (!userData.lastName) {
            errors.push('Last name is required');
        }
        
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }
    }
    
    // Validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Add event listener
    addEventListener(event, listener) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(listener);
        }
    }
    
    // Remove event listener
    removeEventListener(event, listener) {
        if (this.eventListeners[event]) {
            const index = this.eventListeners[event].indexOf(listener);
            if (index > -1) {
                this.eventListeners[event].splice(index, 1);
            }
        }
    }
    
    // Emit event
    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`Auth event listener error for ${event}:`, error);
                }
            });
        }
    }
    
    // Get authentication state
    getAuthState() {
        return {
            isAuthenticated: this.isAuthenticated(),
            user: this.currentUser,
            tenant: this.tenantContext,
            permissions: this.currentUser?.permissions || [],
            roles: this.currentUser?.roles || []
        };
    }
    
    // Force token refresh
    async forceTokenRefresh() {
        return this.refreshTokens();
    }
    
    // Extend session
    extendSession() {
        this.setupSessionManagement();
    }
    
    // Check if session is about to expire
    isSessionExpiringSoon(thresholdMinutes = 5) {
        if (!this.currentUser || !this.currentUser.sessionTimeout) {
            return false;
        }
        
        const sessionAge = Date.now() - this.currentUser.loginTime;
        const sessionDuration = this.currentUser.sessionTimeout;
        const timeRemaining = sessionDuration - sessionAge;
        
        return timeRemaining < (thresholdMinutes * 60 * 1000);
    }
    
    // ==================== OAUTH METHODS ====================
    
    // Load available OAuth providers
    async loadOAuthProviders() {
        try {
            const response = await this.apiClient.get('/auth/oauth/providers');
            if (response.data && response.data.success) {
                this.oauthProviders = response.data.data.providers || [];
            }
        } catch (error) {
            console.error('Failed to load OAuth providers:', error);
            this.oauthProviders = [];
        }
    }
    
    // Get available OAuth providers
    getOAuthProviders() {
        return this.oauthProviders;
    }
    
    // Check if OAuth is available
    isOAuthAvailable() {
        return this.oauthProviders.length > 0;
    }
    
    // Initiate OAuth login
    initiateOAuthLogin(provider) {
        try {
            const providerConfig = this.oauthProviders.find(p => p.name === provider);
            if (!providerConfig) {
                throw new Error(`OAuth provider '${provider}' not available`);
            }
            
            // Open OAuth login in popup or redirect
            const oauthUrl = `${this.apiClient.baseURL}${providerConfig.authUrl}`;
            
            if (typeof window !== 'undefined') {
                // Store OAuth state for callback verification
                const state = this.generateOAuthState(provider);
                sessionStorage.setItem('oauth_state', JSON.stringify(state));
                
                // Open in popup for better UX
                const popup = window.open(
                    `${oauthUrl}?state=${state.token}`,
                    'oauth_login',
                    'width=500,height=600,scrollbars=yes,resizable=yes'
                );
                
                // Monitor popup for completion
                this.monitorOAuthPopup(popup, state);
            } else {
                // Fallback to redirect for non-browser environments
                window.location.href = oauthUrl;
            }
            
        } catch (error) {
            console.error('OAuth login initiation failed:', error);
            this.emit('oauth-error', { provider, error: error.message });
            throw error;
        }
    }
    
    // Generate OAuth state for security
    generateOAuthState(provider) {
        return {
            token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            provider,
            timestamp: Date.now()
        };
    }
    
    // Monitor OAuth popup for completion
    monitorOAuthPopup(popup, state) {
        const checkInterval = setInterval(() => {
            try {
                // Check if popup is closed
                if (popup.closed) {
                    clearInterval(checkInterval);
                    this.emit('oauth-error', { 
                        provider: state.provider, 
                        error: 'OAuth login cancelled by user' 
                    });
                    return;
                }
                
                // Check if popup has been redirected to our callback URL
                const popupUrl = popup.location.href;
                if (popupUrl.includes('token=') || popupUrl.includes('error=')) {
                    clearInterval(checkInterval);
                    
                    // Parse the callback URL
                    const urlParams = new URLSearchParams(popup.location.search);
                    const token = urlParams.get('token');
                    const sessionId = urlParams.get('sessionId');
                    const provider = urlParams.get('provider');
                    const error = urlParams.get('error');
                    
                    popup.close();
                    
                    if (error) {
                        this.emit('oauth-error', { provider, error });
                        return;
                    }
                    
                    if (token && sessionId) {
                        this.handleOAuthCallback(token, sessionId, provider);
                    } else {
                        this.emit('oauth-error', { 
                            provider: state.provider, 
                            error: 'Invalid OAuth callback parameters' 
                        });
                    }
                }
            } catch (error) {
                // Cross-origin errors are expected until callback
                if (error.name !== 'SecurityError') {
                    console.error('OAuth popup monitoring error:', error);
                }
            }
        }, 1000);
        
        // Timeout after 10 minutes
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!popup.closed) {
                popup.close();
                this.emit('oauth-error', { 
                    provider: state.provider, 
                    error: 'OAuth login timed out' 
                });
            }
        }, 10 * 60 * 1000);
    }
    
    // Handle OAuth callback
    async handleOAuthCallback(token, sessionId, provider) {
        try {
            // Verify OAuth token with backend
            const response = await this.apiClient.post('/auth/oauth/verify', {
                token,
                sessionId
            });
            
            if (response.data && response.data.success) {
                const { user, tenant } = response.data.data;
                
                // Set current user and tenant
                this.currentUser = user;
                this.tenantContext = tenant;
                
                // Store tokens
                this.apiClient.setAuthTokens(token);
                
                // Setup session management
                this.setupSessionManagement();
                
                // Clear OAuth state
                sessionStorage.removeItem('oauth_state');
                
                // Emit OAuth login event
                this.emit('oauth-login', { user, tenant, provider });
                this.emit('login', { user, tenant });
                
                return response;
            } else {
                throw new Error('OAuth verification failed');
            }
        } catch (error) {
            console.error('OAuth callback handling failed:', error);
            this.emit('oauth-error', { provider, error: error.message });
            throw error;
        }
    }
    
    // Handle OAuth callback from URL parameters (for redirect flow)
    async handleOAuthRedirect() {
        if (typeof window === 'undefined') return;
        
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const sessionId = urlParams.get('sessionId');
        const provider = urlParams.get('provider');
        const error = urlParams.get('error');
        
        if (error) {
            this.emit('oauth-error', { provider, error });
            return;
        }
        
        if (token && sessionId && provider) {
            try {
                await this.handleOAuthCallback(token, sessionId, provider);
                
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
                console.error('OAuth redirect handling failed:', error);
            }
        }
    }
    
    // Link OAuth account to existing user
    async linkOAuthAccount(provider, token) {
        try {
            const response = await this.apiClient.post('/auth/oauth/link', {
                provider,
                token
            });
            
            if (response.data && response.data.success) {
                // Update current user with OAuth info
                this.currentUser = { ...this.currentUser, ...response.data.data.user };
                this.emit('user-updated', this.currentUser);
            }
            
            return response;
        } catch (error) {
            console.error('OAuth account linking failed:', error);
            throw error;
        }
    }
    
    // Unlink OAuth account
    async unlinkOAuthAccount(provider) {
        try {
            const response = await this.apiClient.post('/auth/oauth/unlink', {
                provider
            });
            
            if (response.data && response.data.success) {
                // Update current user
                this.currentUser = { ...this.currentUser, ...response.data.data.user };
                this.emit('user-updated', this.currentUser);
            }
            
            return response;
        } catch (error) {
            console.error('OAuth account unlinking failed:', error);
            throw error;
        }
    }
    
    // Check if current user has OAuth linked
    hasOAuthLinked(provider) {
        return this.currentUser && this.currentUser.oauthProvider === provider;
    }
    
    // Get OAuth provider info for current user
    getUserOAuthInfo() {
        if (!this.currentUser || !this.currentUser.oauthProvider) {
            return null;
        }
        
        return {
            provider: this.currentUser.oauthProvider,
            providerId: this.currentUser.oauthId,
            linkedAt: this.currentUser.oauthLinkedAt
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthService };
} else {
    window.AuthService = AuthService;
}
