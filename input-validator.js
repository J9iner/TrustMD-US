/**
 * Simple Input Validation Utilities
 * Basic validation helpers for API endpoints
 */

class InputValidator {
    // Validate email format
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Validate password strength
    static isValidPassword(password) {
        return password && password.length >= 8;
    }
    
    // Validate required fields
    static validateRequired(data, requiredFields) {
        const missing = [];
        
        for (const field of requiredFields) {
            if (!data[field] || data[field].toString().trim() === '') {
                missing.push(field);
            }
        }
        
        return {
            isValid: missing.length === 0,
            missing
        };
    }
    
    // Sanitize input string
    static sanitizeString(str) {
        if (typeof str !== 'string') return '';
        return str.trim().replace(/[<>]/g, '');
    }
    
    // Validate role
    static isValidRole(role) {
        const validRoles = ['admin', 'compliance_officer', 'healthcare_provider', 'staff'];
        return validRoles.includes(role);
    }
    
    // Validate state code (2 letters)
    static isValidState(state) {
        const stateRegex = /^[A-Z]{2}$/;
        return stateRegex.test(state.toUpperCase());
    }
}

module.exports = InputValidator;
