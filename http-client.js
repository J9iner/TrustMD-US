// TrustMD HTTP Client
// Base HTTP client with authentication, error handling, and retry logic

class TrustMDHttpClient {
    constructor(config = {}) {
        this.baseURL = config.baseURL || this.getBaseURL();
        this.timeout = config.timeout || 30000;
        this.retries = config.retries || 3;
        this.retryDelay = config.retryDelay || 1000;
        this.authToken = null;
        this.refreshToken = null;
        this.tenantId = null;
        
        // Request/response interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        // Event listeners
        this.eventListeners = {
            'request': [],
            'response': [],
            'error': [],
            'auth:refresh': []
        };
        
        // Setup automatic token refresh
        this.setupTokenRefresh();
    }
    
    // Get base URL based on environment
    getBaseURL() {
        if (typeof window !== 'undefined') {
            // Browser environment
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return 'http://localhost:3000';
            }
            return window.location.origin;
        } else {
            // Node.js environment
            return process.env.API_BASE_URL || 'http://localhost:3000';
        }
    }
    
    // Set authentication tokens
    setAuthTokens(accessToken, refreshToken = null) {
        this.authToken = accessToken;
        this.refreshToken = refreshToken;
        
        // Store in localStorage for persistence
        if (typeof window !== 'undefined' && window.localStorage) {
            if (accessToken) {
                window.localStorage.setItem('trustmd_auth_token', accessToken);
            } else {
                window.localStorage.removeItem('trustmd_auth_token');
            }
            
            if (refreshToken) {
                window.localStorage.setItem('trustmd_refresh_token', refreshToken);
            } else {
                window.localStorage.removeItem('trustmd_refresh_token');
            }
        }
    }
    
    // Set tenant context
    setTenantId(tenantId) {
        this.tenantId = tenantId;
        
        if (typeof window !== 'undefined' && window.localStorage) {
            if (tenantId) {
                window.localStorage.setItem('trustmd_tenant_id', tenantId);
            } else {
                window.localStorage.removeItem('trustmd_tenant_id');
            }
        }
    }
    
    // Load stored authentication
    loadStoredAuth() {
        if (typeof window !== 'undefined' && window.localStorage) {
            this.authToken = window.localStorage.getItem('trustmd_auth_token');
            this.refreshToken = window.localStorage.getItem('trustmd_refresh_token');
            this.tenantId = window.localStorage.getItem('trustmd_tenant_id');
        }
    }
    
    // Clear authentication
    clearAuth() {
        this.authToken = null;
        this.refreshToken = null;
        this.tenantId = null;
        
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('trustmd_auth_token');
            window.localStorage.removeItem('trustmd_refresh_token');
            window.localStorage.removeItem('trustmd_tenant_id');
        }
    }
    
    // Setup automatic token refresh
    setupTokenRefresh() {
        this.addEventListener('auth:refresh', async () => {
            if (this.refreshToken) {
                try {
                    const response = await this.post('/auth/refresh', {
                        refreshToken: this.refreshToken
                    }, { skipAuth: true });
                    
                    if (response.data && response.data.accessToken) {
                        this.setAuthTokens(response.data.accessToken, response.data.refreshToken);
                        this.emit('auth:refreshed', response.data);
                    }
                } catch (error) {
                    console.error('Token refresh failed:', error);
                    this.clearAuth();
                    this.emit('auth:expired', error);
                }
            }
        });
    }
    
    // Add request interceptor
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }
    
    // Add response interceptor
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }
    
    // Add event listener
    addEventListener(event, listener) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(listener);
        }
    }
    
    // Emit event
    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`Event listener error for ${event}:`, error);
                }
            });
        }
    }
    
    // Build full URL
    buildURL(path) {
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${this.baseURL}/${cleanPath}`;
    }
    
    // Build headers
    buildHeaders(options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        };
        
        // Add authentication header
        if (!options.skipAuth && this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        // Add tenant header
        if (this.tenantId) {
            headers['X-Tenant-ID'] = this.tenantId;
        }
        
        // Add client ID for rate limiting
        if (typeof window !== 'undefined') {
            headers['X-Client-ID'] = this.generateClientId();
        }
        
        return headers;
    }
    
    // Generate client ID for rate limiting
    generateClientId() {
        if (typeof window !== 'undefined') {
            if (!window.trustmdClientId) {
                window.trustmdClientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            return window.trustmdClientId;
        }
        return `node_client_${Date.now()}`;
    }
    
    // Apply request interceptors
    async applyRequestInterceptors(request) {
        let modifiedRequest = { ...request };
        
        for (const interceptor of this.requestInterceptors) {
            try {
                const result = await interceptor(modifiedRequest);
                if (result) {
                    modifiedRequest = result;
                }
            } catch (error) {
                console.error('Request interceptor error:', error);
                throw error;
            }
        }
        
        return modifiedRequest;
    }
    
    // Apply response interceptors
    async applyResponseInterceptors(response) {
        let modifiedResponse = response;
        
        for (const interceptor of this.responseInterceptors) {
            try {
                const result = await interceptor(modifiedResponse);
                if (result) {
                    modifiedResponse = result;
                }
            } catch (error) {
                console.error('Response interceptor error:', error);
                throw error;
            }
        }
        
        return modifiedResponse;
    }
    
    // Handle HTTP errors
    async handleHTTPError(response, request) {
        const error = new APIError(response.status, response.statusText, request.url);
        error.response = response;
        error.request = request;
        
        // Handle specific error cases
        if (response.status === 401 && !request.options?.skipAuth) {
            // Token expired - try to refresh
            this.emit('auth:refresh');
            throw error;
        }
        
        if (response.status === 429) {
            // Rate limited - get retry delay from headers
            const retryAfter = response.headers?.get('Retry-After');
            if (retryAfter) {
                error.retryAfter = parseInt(retryAfter) * 1000;
            }
        }
        
        this.emit('error', error);
        throw error;
    }
    
    // Make HTTP request with retry logic
    async makeRequest(method, path, data = null, options = {}) {
        let lastError;
        
        for (let attempt = 0; attempt <= this.retries; attempt++) {
            try {
                const response = await this.singleRequest(method, path, data, options);
                return response;
            } catch (error) {
                lastError = error;
                
                // Don't retry on certain errors
                if (error.status === 401 || error.status === 403 || error.status === 404) {
                    throw error;
                }
                
                // Rate limited - wait before retry
                if (error.retryAfter) {
                    await this.delay(error.retryAfter);
                    continue;
                }
                
                // Don't retry on last attempt
                if (attempt === this.retries) {
                    throw error;
                }
                
                // Wait before retry
                await this.delay(this.retryDelay * Math.pow(2, attempt));
            }
        }
        
        throw lastError;
    }
    
    // Single HTTP request
    async singleRequest(method, path, data = null, options = {}) {
        const url = this.buildURL(path);
        const headers = this.buildHeaders(options);
        
        // Build request object
        const request = {
            method: method.toUpperCase(),
            url,
            headers,
            options
        };
        
        // Add body for POST/PUT/PATCH requests
        if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            if (data instanceof FormData) {
                request.body = data;
                delete headers['Content-Type']; // Let browser set it for FormData
            } else {
                request.body = JSON.stringify(data);
            }
        }
        
        // Apply request interceptors
        const finalRequest = await this.applyRequestInterceptors(request);
        
        // Emit request event
        this.emit('request', finalRequest);
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(url, {
                ...finalRequest,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // Handle HTTP errors
            if (!response.ok) {
                await this.handleHTTPError(response, finalRequest);
            }
            
            // Parse response
            let responseData;
            const contentType = response.headers.get('content-type');
            
            if (contentType?.includes('application/json')) {
                responseData = await response.json();
            } else if (contentType?.includes('text/')) {
                responseData = await response.text();
            } else {
                responseData = await response.blob();
            }
            
            const apiResponse = {
                data: responseData,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                url: response.url
            };
            
            // Apply response interceptors
            const finalResponse = await this.applyResponseInterceptors(apiResponse);
            
            // Emit response event
            this.emit('response', finalResponse);
            
            return finalResponse;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new APIError(408, 'Request Timeout', url);
            }
            
            throw error;
        }
    }
    
    // HTTP methods
    async get(path, options = {}) {
        return this.makeRequest('GET', path, null, options);
    }
    
    async post(path, data = null, options = {}) {
        return this.makeRequest('POST', path, data, options);
    }
    
    async put(path, data = null, options = {}) {
        return this.makeRequest('PUT', path, data, options);
    }
    
    async patch(path, data = null, options = {}) {
        return this.makeRequest('PATCH', path, data, options);
    }
    
    async delete(path, options = {}) {
        return this.makeRequest('DELETE', path, null, options);
    }
    
    // File upload
    async upload(path, file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Add additional fields
        if (options.fields) {
            Object.entries(options.fields).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }
        
        return this.post(path, formData, {
            ...options,
            headers: {
                // Don't set Content-Type for FormData
                ...options.headers
            }
        });
    }
    
    // Download file
    async download(path, filename = null, options = {}) {
        const response = await this.get(path, {
            ...options,
            headers: {
                'Accept': 'application/octet-stream',
                ...options.headers
            }
        });
        
        if (response.data instanceof Blob) {
            // Create download link
            const url = window.URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'download';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
        
        return response;
    }
    
    // Utility: Delay
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Utility: Check if authenticated
    isAuthenticated() {
        return !!this.authToken;
    }
    
    // Utility: Get current user info from token
    getCurrentUser() {
        if (!this.authToken) return null;
        
        try {
            const payload = this.authToken.split('.')[1];
            const decoded = JSON.parse(atob(payload));
            return decoded;
        } catch (error) {
            console.error('Failed to decode token:', error);
            return null;
        }
    }
}

// Custom API Error class
class APIError extends Error {
    constructor(status, message, url) {
        super(`${status} ${message} for ${url}`);
        this.name = 'APIError';
        this.status = status;
        this.message = message;
        this.url = url;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TrustMDHttpClient, APIError };
} else {
    window.TrustMDHttpClient = TrustMDHttpClient;
    window.APIError = APIError;
}
