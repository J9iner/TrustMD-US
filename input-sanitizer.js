// TrustMD Input Sanitization Utility
// Prevents XSS attacks by sanitizing user input

class InputSanitizer {
    constructor() {
        this.allowedTags = new Set([
            'p', 'br', 'strong', 'em', 'u', 'i', 'b',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'div', 'span',
            'button', 'a'
        ]);
        
        this.allowedAttributes = new Set([
            'class', 'id', 'href', 'target', 'rel',
            'aria-label', 'role', 'tabindex', 'disabled'
        ]);
    }
    
    // Sanitize HTML string to prevent XSS
    sanitizeHTML(html) {
        if (typeof html !== 'string') {
            return '';
        }
        
        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.textContent = html; // This escapes HTML entities
        
        // For cases where we need to preserve some HTML tags
        return this.sanitizeWithAllowedHTML(html);
    }
    
    // Sanitize text content (no HTML allowed)
    sanitizeText(text) {
        if (typeof text !== 'string') {
            return '';
        }
        
        const tempDiv = document.createElement('div');
        tempDiv.textContent = text;
        return tempDiv.innerHTML;
    }
    
    // Sanitize with allowed HTML tags
    sanitizeWithAllowedHTML(html) {
        if (typeof html !== 'string') {
            return '';
        }
        
        // Create a DOM parser
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Process each node
        this.sanitizeNode(doc.body);
        
        return doc.body.innerHTML;
    }
    
    // Recursively sanitize DOM nodes
    sanitizeNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return; // Text nodes are safe
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            
            // Remove script tags and dangerous elements
            if (this.isDangerousTag(tagName)) {
                node.parentNode.removeChild(node);
                return;
            }
            
            // Remove dangerous attributes
            const attributes = Array.from(node.attributes);
            for (const attr of attributes) {
                if (this.isDangerousAttribute(attr.name)) {
                    node.removeAttribute(attr.name);
                } else if (attr.name === 'href' && attr.value) {
                    // Sanitize URLs
                    node.setAttribute(attr.name, this.sanitizeURL(attr.value));
                }
            }
            
            // Remove event handlers
            const eventHandlers = Array.from(node.attributes)
                .filter(attr => attr.name.startsWith('on'));
            for (const handler of eventHandlers) {
                node.removeAttribute(handler.name);
            }
        }
        
        // Recursively process child nodes
        const children = Array.from(node.childNodes);
        for (const child of children) {
            this.sanitizeNode(child);
        }
    }
    
    // Check if tag is dangerous
    isDangerousTag(tagName) {
        const dangerousTags = new Set([
            'script', 'iframe', 'object', 'embed', 'form',
            'input', 'textarea', 'select', 'option',
            'link', 'meta', 'style', 'base'
        ]);
        
        return dangerousTags.has(tagName.toLowerCase());
    }
    
    // Check if attribute is dangerous
    isDangerousAttribute(attrName) {
        const dangerousAttrs = new Set([
            'onclick', 'onload', 'onerror', 'onmouseover',
            'onmouseout', 'onfocus', 'onblur', 'onchange',
            'onsubmit', 'onreset', 'onkeydown', 'onkeyup',
            'onkeypress', 'onmousedown', 'onmouseup',
            'javascript:', 'vbscript:', 'data:'
        ]);
        
        return dangerousAttrs.has(attrName.toLowerCase()) ||
               attrName.toLowerCase().startsWith('on');
    }
    
    // Sanitize URLs
    sanitizeURL(url) {
        if (typeof url !== 'string') {
            return '';
        }
        
        // Remove javascript: and data: protocols
        url = url.replace(/^(javascript|data|vbscript):/i, '');
        
        // Allow only http, https, mailto, tel protocols
        const allowedProtocols = /^(https?|mailto|tel|#)/i;
        if (!allowedProtocols.test(url.trim())) {
            return '#';
        }
        
        return url;
    }
    
    // Sanitize user input for display
    sanitizeUserInput(input) {
        if (typeof input !== 'string') {
            return '';
        }
        
        return input
            .replace(/[<>]/g, '') // Remove basic HTML brackets
            .replace(/javascript:/gi, '') // Remove javascript protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .trim();
    }
    
    // Escape HTML entities for safe display
    escapeHTML(text) {
        if (typeof text !== 'string') {
            return '';
        }
        
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }
    
    // Create safe HTML element
    createElement(tagName, attributes = {}, textContent = '') {
        const element = document.createElement(tagName);
        
        // Set safe attributes only
        for (const [attr, value] of Object.entries(attributes)) {
            if (this.allowedAttributes.has(attr.toLowerCase())) {
                element.setAttribute(attr, this.sanitizeUserInput(value));
            }
        }
        
        // Set text content safely
        if (textContent) {
            element.textContent = textContent;
        }
        
        return element;
    }
    
    // Sanitize file name
    sanitizeFileName(fileName) {
        if (typeof fileName !== 'string') {
            return 'untitled';
        }
        
        return fileName
            .replace(/[<>:"/\\|?*]/g, '_') // Replace dangerous characters
            .replace(/\.\./g, '') // Remove directory traversal
            .substring(0, 255); // Limit length
    }
}

// Global instance
const inputSanitizer = new InputSanitizer();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InputSanitizer, inputSanitizer };
} else {
    window.InputSanitizer = InputSanitizer;
    window.inputSanitizer = inputSanitizer;
}
