// TrustMD API Error Handling and Response Utilities
// Centralized error handling, response processing, and utility functions

class APIErrorHandler {
    constructor() {
        this.errorHandlers = new Map();
        this.globalHandlers = [];
        this.setupDefaultHandlers();
    }
    
    // Setup default error handlers
    setupDefaultHandlers() {
        // Authentication errors
        this.registerHandler(401, (error) => {
            return {
                type: 'AUTHENTICATION_ERROR',
                message: 'Authentication required. Please log in again.',
                action: 'redirect_to_login',
                recoverable: false
            };
        });
        
        // Authorization errors
        this.registerHandler(403, (error) => {
            return {
                type: 'AUTHORIZATION_ERROR',
                message: 'You do not have permission to perform this action.',
                action: 'show_permission_denied',
                recoverable: false
            };
        });
        
        // Not found errors
        this.registerHandler(404, (error) => {
            return {
                type: 'NOT_FOUND_ERROR',
                message: 'The requested resource was not found.',
                action: 'show_not_found',
                recoverable: false
            };
        });
        
        // Validation errors
        this.registerHandler(422, (error) => {
            return {
                type: 'VALIDATION_ERROR',
                message: 'The provided data is invalid.',
                details: error.response?.data?.errors || [],
                action: 'show_validation_errors',
                recoverable: true
            };
        });
        
        // Rate limiting errors
        this.registerHandler(429, (error) => {
            const retryAfter = error.response?.headers?.get('Retry-After');
            return {
                type: 'RATE_LIMIT_ERROR',
                message: 'Too many requests. Please try again later.',
                retryAfter: retryAfter ? parseInt(retryAfter) * 1000 : 60000,
                action: 'show_rate_limit',
                recoverable: true
            };
        });
        
        // Server errors
        this.registerHandler(500, (error) => {
            return {
                type: 'SERVER_ERROR',
                message: 'An internal server error occurred. Please try again later.',
                action: 'show_server_error',
                recoverable: true
            };
        });
        
        // Service unavailable
        this.registerHandler(503, (error) => {
            return {
                type: 'SERVICE_UNAVAILABLE',
                message: 'The service is temporarily unavailable. Please try again later.',
                action: 'show_service_unavailable',
                recoverable: true
            };
        });
        
        // Network errors
        this.registerHandler('NETWORK_ERROR', (error) => {
            return {
                type: 'NETWORK_ERROR',
                message: 'Network connection error. Please check your internet connection.',
                action: 'show_network_error',
                recoverable: true
            };
        });
        
        // Timeout errors
        this.registerHandler('TIMEOUT_ERROR', (error) => {
            return {
                type: 'TIMEOUT_ERROR',
                message: 'Request timed out. Please try again.',
                action: 'show_timeout_error',
                recoverable: true
            };
        });
    }
    
    // Register error handler
    registerHandler(statusOrType, handler) {
        this.errorHandlers.set(statusOrType, handler);
    }
    
    // Add global error handler
    addGlobalHandler(handler) {
        this.globalHandlers.push(handler);
    }
    
    // Handle error
    handleError(error, context = {}) {
        let errorInfo;
        
        // Determine error type and get handler
        if (error.status) {
            // HTTP error
            const handler = this.errorHandlers.get(error.status);
            errorInfo = handler ? handler(error) : this.createDefaultError(error);
        } else if (error.name === 'TypeError' || error.message.includes('fetch')) {
            // Network error
            const handler = this.errorHandlers.get('NETWORK_ERROR');
            errorInfo = handler(error);
        } else if (error.name === 'AbortError') {
            // Timeout error
            const handler = this.errorHandlers.get('TIMEOUT_ERROR');
            errorInfo = handler(error);
        } else {
            // Unknown error
            errorInfo = this.createDefaultError(error);
        }
        
        // Add context
        errorInfo.context = context;
        errorInfo.originalError = error;
        errorInfo.timestamp = new Date().toISOString();
        
        // Call global handlers
        this.globalHandlers.forEach(handler => {
            try {
                handler(errorInfo);
            } catch (handlerError) {
                console.error('Global error handler failed:', handlerError);
            }
        });
        
        return errorInfo;
    }
    
    // Create default error
    createDefaultError(error) {
        return {
            type: 'UNKNOWN_ERROR',
            message: error.message || 'An unexpected error occurred.',
            action: 'show_generic_error',
            recoverable: true
        };
    }
}

class ResponseProcessor {
    constructor() {
        this.processors = new Map();
        this.setupDefaultProcessors();
    }
    
    // Setup default response processors
    setupDefaultProcessors() {
        // Success response processor
        this.registerProcessor('success', (response) => {
            return {
                success: true,
                data: response.data,
                status: response.status,
                message: response.data?.message || 'Operation successful',
                timestamp: new Date().toISOString()
            };
        });
        
        // Paginated response processor
        this.registerProcessor('paginated', (response) => {
            return {
                success: true,
                data: response.data?.data || response.data,
                pagination: {
                    page: response.data?.page || 1,
                    limit: response.data?.limit || 10,
                    total: response.data?.total || 0,
                    totalPages: response.data?.totalPages || 1,
                    hasNext: response.data?.hasNext || false,
                    hasPrev: response.data?.hasPrev || false
                },
                status: response.status,
                timestamp: new Date().toISOString()
            };
        });
        
        // File download processor
        this.registerProcessor('download', (response) => {
            const contentDisposition = response.headers?.get('Content-Disposition');
            const filename = this.extractFilename(contentDisposition);
            
            return {
                success: true,
                data: response.data,
                filename,
                contentType: response.headers?.get('Content-Type'),
                size: response.data?.size || 0,
                status: response.status,
                timestamp: new Date().toISOString()
            };
        });
    }
    
    // Register response processor
    registerProcessor(type, processor) {
        this.processors.set(type, processor);
    }
    
    // Process response
    processResponse(response, type = 'success') {
        const processor = this.processors.get(type);
        if (!processor) {
            throw new Error(`No processor found for type: ${type}`);
        }
        
        try {
            return processor(response);
        } catch (error) {
            throw new Error(`Response processing failed: ${error.message}`);
        }
    }
    
    // Extract filename from Content-Disposition header
    extractFilename(contentDisposition) {
        if (!contentDisposition) return null;
        
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
            return filenameMatch[1].replace(/['"]/g, '');
        }
        
        return null;
    }
}

class APIUtils {
    // Build query parameters
    static buildQueryParams(params) {
        const searchParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                if (Array.isArray(value)) {
                    value.forEach(item => searchParams.append(key, item));
                } else if (typeof value === 'object') {
                    searchParams.append(key, JSON.stringify(value));
                } else {
                    searchParams.append(key, value);
                }
            }
        });
        
        return searchParams.toString();
    }
    
    // Validate email
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Validate phone number
    static isValidPhone(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }
    
    // Format file size
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Format date
    static formatDate(date, format = 'ISO') {
        const d = new Date(date);
        
        switch (format) {
            case 'ISO':
                return d.toISOString();
            case 'short':
                return d.toLocaleDateString();
            case 'long':
                return d.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            case 'time':
                return d.toLocaleTimeString();
            case 'datetime':
                return d.toLocaleString();
            default:
                return d.toISOString();
        }
    }
    
    // Parse date range
    static parseDateRange(range) {
        const now = new Date();
        const ranges = {
            '1d': { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now },
            '7d': { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now },
            '30d': { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now },
            '90d': { start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), end: now },
            '1y': { start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), end: now }
        };
        
        return ranges[range] || null;
    }
    
    // Debounce function
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Throttle function
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Generate UUID
    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // Deep clone object
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
    }
    
    // Sanitize object for logging
    static sanitizeForLogging(obj) {
        const sanitized = this.deepClone(obj);
        const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
        
        const sanitizeValue = (value, key) => {
            if (typeof value === 'string' && sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                return '[REDACTED]';
            }
            if (typeof value === 'object' && value !== null) {
                return sanitizeObject(value);
            }
            return value;
        };
        
        const sanitizeObject = (obj) => {
            if (Array.isArray(obj)) {
                return obj.map((item, index) => sanitizeValue(item, index.toString()));
            }
            
            const sanitized = {};
            Object.keys(obj).forEach(key => {
                sanitized[key] = sanitizeValue(obj[key], key);
            });
            return sanitized;
        };
        
        return sanitizeObject(sanitized);
    }
    
    // Check if response is successful
    static isSuccessfulResponse(status) {
        return status >= 200 && status < 300;
    }
    
    // Get error message from response
    static getErrorMessage(response) {
        if (response.data?.message) {
            return response.data.message;
        }
        
        if (response.data?.error) {
            return response.data.error;
        }
        
        if (response.data?.errors?.length > 0) {
            return response.data.errors.map(err => err.message || err).join(', ');
        }
        
        return response.statusText || 'An error occurred';
    }
    
    // Create retry configuration
    static createRetryConfig(maxRetries = 3, baseDelay = 1000, maxDelay = 10000) {
        return {
            maxRetries,
            baseDelay,
            maxDelay,
            shouldRetry: (error) => {
                // Don't retry on authentication or validation errors
                if (error.status === 401 || error.status === 403 || error.status === 422) {
                    return false;
                }
                // Retry on network errors and server errors
                return !error.status || error.status >= 500;
            },
            getDelay: (attempt) => {
                // Exponential backoff with jitter
                const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
                return delay + Math.random() * 1000; // Add jitter
            }
        };
    }
    
    // Validate required fields
    static validateRequired(data, requiredFields) {
        const errors = [];
        
        requiredFields.forEach(field => {
            if (data[field] === null || data[field] === undefined || data[field] === '') {
                errors.push(`${field} is required`);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    // Transform snake_case to camelCase
    static snakeToCamel(str) {
        return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    }
    
    // Transform camelCase to snake_case
    static camelToSnake(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
    
    // Transform object keys
    static transformKeys(obj, transformer) {
        if (Array.isArray(obj)) {
            return obj.map(item => this.transformKeys(item, transformer));
        }
        
        if (obj && typeof obj === 'object') {
            const transformed = {};
            Object.keys(obj).forEach(key => {
                const transformedKey = transformer(key);
                transformed[transformedKey] = this.transformKeys(obj[key], transformer);
            });
            return transformed;
        }
        
        return obj;
    }
}

// Notification helper for API errors
class APINotificationHelper {
    constructor() {
        this.notificationQueue = [];
        this.isProcessing = false;
    }
    
    // Show error notification
    showError(errorInfo, options = {}) {
        const notification = {
            type: 'error',
            title: this.getErrorTitle(errorInfo.type),
            message: errorInfo.message,
            details: errorInfo.details,
            duration: options.duration || 5000,
            actions: this.getErrorActions(errorInfo),
            timestamp: new Date().toISOString()
        };
        
        this.addNotification(notification);
    }
    
    // Show success notification
    showSuccess(message, options = {}) {
        const notification = {
            type: 'success',
            title: 'Success',
            message,
            duration: options.duration || 3000,
            timestamp: new Date().toISOString()
        };
        
        this.addNotification(notification);
    }
    
    // Get error title
    getErrorTitle(errorType) {
        const titles = {
            'AUTHENTICATION_ERROR': 'Authentication Required',
            'AUTHORIZATION_ERROR': 'Access Denied',
            'NOT_FOUND_ERROR': 'Not Found',
            'VALIDATION_ERROR': 'Validation Error',
            'RATE_LIMIT_ERROR': 'Rate Limit Exceeded',
            'SERVER_ERROR': 'Server Error',
            'SERVICE_UNAVAILABLE': 'Service Unavailable',
            'NETWORK_ERROR': 'Network Error',
            'TIMEOUT_ERROR': 'Request Timeout',
            'UNKNOWN_ERROR': 'Error'
        };
        
        return titles[errorType] || 'Error';
    }
    
    // Get error actions
    getErrorActions(errorInfo) {
        const actions = [];
        
        if (errorInfo.recoverable) {
            actions.push({
                label: 'Retry',
                action: 'retry',
                primary: true
            });
        }
        
        if (errorInfo.type === 'AUTHENTICATION_ERROR') {
            actions.push({
                label: 'Login',
                action: 'login',
                primary: true
            });
        }
        
        actions.push({
            label: 'Dismiss',
            action: 'dismiss',
            primary: false
        });
        
        return actions;
    }
    
    // Add notification to queue
    addNotification(notification) {
        this.notificationQueue.push(notification);
        this.processQueue();
    }
    
    // Process notification queue
    async processQueue() {
        if (this.isProcessing || this.notificationQueue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        while (this.notificationQueue.length > 0) {
            const notification = this.notificationQueue.shift();
            this.displayNotification(notification);
            
            // Wait between notifications
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        this.isProcessing = false;
    }
    
    // Display notification (implementation depends on UI framework)
    displayNotification(notification) {
        // This would be implemented based on the UI framework being used
        // For now, just log to console
        console.log('Notification:', notification);
        
        // Emit custom event for UI components to handle
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('api-notification', {
                detail: notification
            }));
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        APIErrorHandler,
        ResponseProcessor,
        APIUtils,
        APINotificationHelper
    };
} else {
    window.APIErrorHandler = APIErrorHandler;
    window.ResponseProcessor = ResponseProcessor;
    window.APIUtils = APIUtils;
    window.APINotificationHelper = APINotificationHelper;
}
