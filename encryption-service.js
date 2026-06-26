// TrustMD Encryption Service
// AES-256 encryption for all compliance data with secure key management

class EncryptionService {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12; // 96 bits for GCM
        this.tagLength = 16; // 128 bits authentication tag
        this.saltLength = 32;
        this.keyDerivationIterations = 100000;
        
        // TrustMD is a compliance logbook - encrypt ALL uploaded data
        this.encryptAllData = true;
        
        this.encryptionKey = null;
        this.sessionKeys = new Map(); // Session-based key storage
        this.keyRotationInterval = 24 * 60 * 60 * 1000; // 24 hours
        this.maxKeyAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        this.isInitialized = false;
        this.currentSessionId = null;
    }
    
    // Initialize encryption service with key
    async initialize(encryptionKey = null) {
        try {
            if (encryptionKey) {
                this.encryptionKey = encryptionKey;
            } else {
                // Generate or load encryption key
                this.encryptionKey = await this.getOrCreateEncryptionKey();
            }
            
            this.isInitialized = true;
            console.log('Encryption service initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize encryption service:', error);
            throw error;
        }
    }
    
    // Generate secure session ID
    generateSessionId() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Get or create encryption key securely
    async getOrCreateEncryptionKey() {
        // Generate session ID if not exists
        if (!this.currentSessionId) {
            this.currentSessionId = this.generateSessionId();
        }

        // Try to get key from secure session storage
        let key = this.sessionKeys.get(this.currentSessionId);
        
        if (!key || this.isKeyExpired(key)) {
            // Generate new key
            key = await this.generateEncryptionKey();
            await this.storeKeySecurely(key);
        }
        
        return key.key;
    }
    
    // Check if key is expired
    isKeyExpired(keyData) {
        const now = Date.now();
        return (now - keyData.created) > this.maxKeyAge;
    }
    
    // Generate encryption key
    async generateEncryptionKey() {
        const key = await window.crypto.subtle.generateKey(
            {
                name: this.algorithm,
                length: this.keyLength
            },
            true, // extractable
            ['encrypt', 'decrypt']
        );
        
        return key;
    }
    
    // Store encryption key securely in memory only
    async storeKeySecurely(key) {
        try {
            // Store in memory session storage only - never persist to browser storage
            const keyData = {
                key: key,
                created: Date.now(),
                sessionId: this.currentSessionId,
                version: '2.0'
            };
            
            // Store in memory Map (cleared when page/tab is closed)
            this.sessionKeys.set(this.currentSessionId, keyData);
            
            // Set up automatic key cleanup
            this.scheduleKeyCleanup();
            
            console.log('Encryption key stored securely in memory session');
            return true;
        } catch (error) {
            console.error('Failed to store encryption key securely:', error);
            throw error;
        }
    }
    
    // Schedule key cleanup for expired keys
    scheduleKeyCleanup() {
        // Clear any existing timeout
        if (this.keyCleanupTimeout) {
            clearTimeout(this.keyCleanupTimeout);
        }
        
        // Schedule cleanup for key rotation interval
        this.keyCleanupTimeout = setTimeout(() => {
            this.cleanupExpiredKeys();
        }, this.keyRotationInterval);
    }
    
    // Clean up expired keys
    cleanupExpiredKeys() {
        const now = Date.now();
        for (const [sessionId, keyData] of this.sessionKeys.entries()) {
            if (this.isKeyExpired(keyData)) {
                this.sessionKeys.delete(sessionId);
                console.log(`Cleaned up expired key for session: ${sessionId}`);
            }
        }
        
        // Schedule next cleanup
        this.scheduleKeyCleanup();
    }
    
    // Clear all keys (call on logout)
    clearAllKeys() {
        this.sessionKeys.clear();
        this.currentSessionId = null;
        this.encryptionKey = null;
        if (this.keyCleanupTimeout) {
            clearTimeout(this.keyCleanupTimeout);
        }
        console.log('All encryption keys cleared from memory');
    }
    
    // Derive key from password using PBKDF2 (for user password-based encryption)
    async deriveKeyFromPassword(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );
        
        return window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.keyDerivationIterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            {
                name: this.algorithm,
                length: this.keyLength
            },
            true,
            ['encrypt', 'decrypt']
        );
    }
    
    // Encrypt data
    async encrypt(data, additionalData = null) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        try {
            // Convert data to string if it's an object
            const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
            
            // Generate random IV
            const iv = window.crypto.getRandomValues(new Uint8Array(this.ivLength));
            
            // Encode data
            const encoder = new TextEncoder();
            const encodedData = encoder.encode(dataStr);
            
            // Encrypt
            const encryptedData = await window.crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv,
                    additionalData: additionalData ? new TextEncoder().encode(additionalData) : undefined
                },
                this.encryptionKey,
                encodedData
            );
            
            // Combine IV + encrypted data + tag
            const encryptedArray = new Uint8Array(encryptedData);
            const result = new Uint8Array(iv.length + encryptedArray.length);
            result.set(iv, 0);
            result.set(encryptedArray, iv.length);
            
            // Return as base64 for storage/transmission
            return {
                encrypted: this.arrayBufferToBase64(result),
                iv: this.arrayBufferToBase64(iv),
                algorithm: this.algorithm,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }
    
    // Decrypt data
    async decrypt(encryptedData, additionalData = null) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        try {
            let encrypted;
            
            if (typeof encryptedData === 'string') {
                // Parse encrypted object if it's a JSON string
                try {
                    const parsed = JSON.parse(encryptedData);
                    encrypted = this.base64ToArrayBuffer(parsed.encrypted);
                } catch {
                    encrypted = this.base64ToArrayBuffer(encryptedData);
                }
            } else if (encryptedData.encrypted) {
                // Extract encrypted data from object
                encrypted = this.base64ToArrayBuffer(encryptedData.encrypted);
            } else {
                throw new Error('Invalid encrypted data format');
            }
            
            // Extract IV from beginning of encrypted data
            const iv = encrypted.slice(0, this.ivLength);
            const actualEncryptedData = encrypted.slice(this.ivLength);
            
            // Decrypt
            const decryptedData = await window.crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv,
                    additionalData: additionalData ? new TextEncoder().encode(additionalData) : undefined
                },
                this.encryptionKey,
                actualEncryptedData
            );
            
            // Decode result
            const decoder = new TextDecoder();
            const decryptedStr = decoder.decode(decryptedData);
            
            // Try to parse as JSON
            try {
                return JSON.parse(decryptedStr);
            } catch {
                return decryptedStr;
            }
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }
    
    // Encrypt all data in an object (TrustMD is a compliance logbook)
    async encryptAllFields(obj) {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }
        
        const encryptedObj = { ...obj };
        const encryptedFields = [];
        
        for (const [key, value] of Object.entries(obj)) {
            // Encrypt ALL data since TrustMD is a compliance logbook
            if (value !== null && value !== undefined) {
                try {
                    encryptedObj[key] = await this.encrypt(value, key); // Use field name as additional data
                    encryptedFields.push(key);
                } catch (error) {
                    console.error(`Failed to encrypt field ${key}:`, error);
                    // Keep original value if encryption fails
                }
            }
        }
        
        return {
            data: encryptedObj,
            encryptedFields,
            timestamp: new Date().toISOString()
        };
    }
    
    // Decrypt all encrypted fields in an object
    async decryptAllFields(encryptedObj, encryptedFields) {
        if (!encryptedObj || typeof encryptedObj !== 'object') {
            return encryptedObj;
        }
        
        const decryptedObj = { ...encryptedObj };
        
        for (const field of encryptedFields) {
            if (encryptedObj[field]) {
                try {
                    decryptedObj[field] = await this.decrypt(encryptedObj[field], field);
                } catch (error) {
                    console.error(`Failed to decrypt field ${field}:`, error);
                    // Keep encrypted value if decryption fails
                }
            }
        }
        
        return decryptedObj;
    }
    
    // Generate hash for data integrity
    async generateHash(data) {
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(typeof data === 'object' ? JSON.stringify(data) : data);
        
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', encodedData);
        return this.arrayBufferToBase64(new Uint8Array(hashBuffer));
    }
    
    // Verify data integrity
    async verifyHash(data, expectedHash) {
        const actualHash = await this.generateHash(data);
        return actualHash === expectedHash;
    }
    
    // Utility: Convert ArrayBuffer to Base64
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    // Utility: Convert Base64 to ArrayBuffer
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    // Generate secure random string
    generateSecureRandom(length = 32) {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return this.arrayBufferToBase64(array);
    }
    
    // Rotate encryption key
    async rotateKey() {
        try {
            // Generate new key
            const newKey = await this.generateEncryptionKey();
            
            // Store new key securely
            await this.storeKeySecurely(newKey);
            this.encryptionKey = newKey;
            
            console.log('Encryption key rotated successfully');
            return true;
        } catch (error) {
            console.error('Failed to rotate encryption key:', error);
            throw error;
        }
    }
    
    // Get encryption status
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            algorithm: this.algorithm,
            keyLength: this.keyLength,
            hasKey: !!this.encryptionKey,
            activeSessions: this.sessionKeys.size,
            currentSessionId: this.currentSessionId
        };
    }
    
    // Setup cleanup on page unload
    setupCleanupHandlers() {
        // Clear keys when page is unloaded
        const cleanup = () => {
            this.clearAllKeys();
        };
        
        // Listen for page unload events
        window.addEventListener('beforeunload', cleanup);
        window.addEventListener('pagehide', cleanup);
        
        // Also listen for visibility changes (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Optionally clear keys when tab becomes hidden
                // this.clearAllKeys();
            }
        });
    }
}

// Global instance with security initialization
const encryptionService = new EncryptionService();

// Initialize security features when loaded
if (typeof window !== 'undefined') {
    // Setup automatic cleanup
    encryptionService.setupCleanupHandlers();
    
    // Clear any remaining insecure storage
    try {
        sessionStorage.removeItem('trustmd_encryption_key');
        localStorage.removeItem('trustmd_encryption_key');
        console.log('Cleared any remaining insecure key storage');
    } catch (error) {
        console.warn('Failed to clear insecure storage:', error);
    }
    
    // Security warning in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🔐 Encryption Service initialized in secure mode');
        console.log('📋 Keys are stored in memory only and cleared on page unload');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EncryptionService, encryptionService };
} else {
    window.EncryptionService = EncryptionService;
    window.encryptionService = encryptionService;
}
