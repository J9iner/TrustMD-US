// TrustMD Error Handling Utility
// Standardized error handling patterns for consistent debugging and logging

class TrustMDErrorHandler {
    constructor() {
        this.errorTypes = {
            VALIDATION: 'VALIDATION_ERROR',
            INITIALIZATION: 'INITIALIZATION_ERROR',
            NETWORK: 'NETWORK_ERROR',
            DATABASE: 'DATABASE_ERROR',
            AUTHENTICATION: 'AUTHENTICATION_ERROR',
            AUTHORIZATION: 'AUTHORIZATION_ERROR',
            BUSINESS_LOGIC: 'BUSINESS_LOGIC_ERROR',
            SYSTEM: 'SYSTEM_ERROR'
        };
    }

    // Standardized error logging
    logError(errorType, message, context = {}, originalError = null) {
        const errorInfo = {
            type: errorType,
            message,
            context,
            timestamp: new Date().toISOString(),
            stack: originalError?.stack,
            originalError: originalError?.message
        };

        // Log to console with appropriate level
        switch (errorType) {
            case this.errorTypes.VALIDATION:
            case this.errorTypes.BUSINESS_LOGIC:
                console.warn(`⚠️ ${errorType}: ${message}`, errorInfo);
                break;
            case this.errorTypes.NETWORK:
            case this.errorTypes.DATABASE:
                console.error(`🔴 ${errorType}: ${message}`, errorInfo);
                break;
            case this.errorTypes.INITIALIZATION:
            case this.errorTypes.SYSTEM:
                console.error(`💥 ${errorType}: ${message}`, errorInfo);
                break;
            default:
                console.error(`❓ ${errorType}: ${message}`, errorInfo);
        }

        return errorInfo;
    }

    // Handle async function errors consistently
    async handleAsync(asyncFunction, errorType, context = {}) {
        try {
            return await asyncFunction();
        } catch (error) {
            this.logError(errorType, error.message, context, error);
            throw error; // Re-throw for caller to handle
        }
    }

    // Handle synchronous function errors consistently
    handleSync(syncFunction, errorType, context = {}) {
        try {
            return syncFunction();
        } catch (error) {
            this.logError(errorType, error.message, context, error);
            throw error; // Re-throw for caller to handle
        }
    }

    // Create standardized error object
    createError(errorType, message, context = {}) {
        const error = new Error(message);
        error.type = errorType;
        error.context = context;
        error.timestamp = new Date().toISOString();
        return error;
    }

    // Validation error helper
    validationError(message, field = null, value = null) {
        return this.createError(
            this.errorTypes.VALIDATION,
            message,
            { field, value }
        );
    }

    // Initialization error helper
    initializationError(message, component = null) {
        return this.createError(
            this.errorTypes.INITIALIZATION,
            message,
            { component }
        );
    }

    // Network error helper
    networkError(message, url = null, method = null) {
        return this.createError(
            this.errorTypes.NETWORK,
            message,
            { url, method }
        );
    }

    // Database error helper
    databaseError(message, operation = null, table = null) {
        return this.createError(
            this.errorTypes.DATABASE,
            message,
            { operation, table }
        );
    }

    // Authentication error helper
    authenticationError(message, userId = null) {
        return this.createError(
            this.errorTypes.AUTHENTICATION,
            message,
            { userId }
        );
    }

    // Authorization error helper
    authorizationError(message, userId = null, resource = null) {
        return this.createError(
            this.errorTypes.AUTHORIZATION,
            message,
            { userId, resource }
        );
    }

    // Business logic error helper
    businessLogicError(message, operation = null, data = null) {
        return this.createError(
            this.errorTypes.BUSINESS_LOGIC,
            message,
            { operation, data }
        );
    }

    // System error helper
    systemError(message, component = null) {
        return this.createError(
            this.errorTypes.SYSTEM,
            message,
            { component }
        );
    }
}

// Global error handler instance
const errorHandler = new TrustMDErrorHandler();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TrustMDErrorHandler, errorHandler };
} else {
    window.TrustMDErrorHandler = TrustMDErrorHandler;
    window.errorHandler = errorHandler;
}

// Helper function for wrapping async functions with error handling
function withErrorHandling(asyncFunction, errorType, context = {}) {
    return async (...args) => {
        return await errorHandler.handleAsync(
            () => asyncFunction(...args),
            errorType,
            context
        );
    };
}

// Helper function for wrapping sync functions with error handling
function withSyncErrorHandling(syncFunction, errorType, context = {}) {
    return (...args) => {
        return errorHandler.handleSync(
            () => syncFunction(...args),
            errorType,
            context
        );
    };
}
