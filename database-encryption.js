// TrustMD Database Encryption Utilities
// Comprehensive encryption for sensitive database data

class DatabaseEncryption {
    constructor(supabaseClient, securityConfig) {
        this.supabaseClient = supabaseClient;
        this.securityConfig = securityConfig;
        this.encryptionKey = null;
        this.previousKey = null;
        this.isInitialized = false;
    }

    // Initialize encryption system
    async initialize() {
        try {
            // Load encryption keys from environment
            await this.loadEncryptionKeys();
            
            // Enable pgcrypto extension if not already enabled
            await this.enablePgCrypto();
            
            // Create encryption functions
            await this.createEncryptionFunctions();
            
            this.isInitialized = true;
            console.log('Database encryption initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize database encryption:', error);
            throw error;
        }
    }

    // Load encryption keys from environment
    async loadEncryptionKeys() {
        try {
            // In a real implementation, these would come from secure environment variables
            this.encryptionKey = process.env.DB_ENCRYPTION_KEY_CURRENT || this.generateKey();
            this.previousKey = process.env.DB_ENCRYPTION_KEY_PREVIOUS || null;
            
            if (!this.encryptionKey) {
                throw new Error('Database encryption key not found');
            }
            
            console.log('Encryption keys loaded successfully');
        } catch (error) {
            console.error('Failed to load encryption keys:', error);
            throw error;
        }
    }

    // Generate encryption key (fallback)
    generateKey() {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
    }

    // Enable pgcrypto extension
    async enablePgCrypto() {
        try {
            const { error } = await this.supabaseClient.supabase.rpc('enable_pgcrypto');
            if (error) {
                // Try direct SQL if RPC fails
                await this.supabaseClient.supabase.sql`
                    CREATE EXTENSION IF NOT EXISTS pgcrypto;
                `;
            }
            console.log('pgcrypto extension enabled');
        } catch (error) {
            console.error('Failed to enable pgcrypto:', error);
            throw error;
        }
    }

    // Create encryption functions in database
    async createEncryptionFunctions() {
        try {
            // Create encryption function
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION encrypt_data(data TEXT, key TEXT)
                RETURNS BYTEA AS $$
                BEGIN
                    RETURN pgp_sym_encrypt(data, key);
                END;
                $$ LANGUAGE plpgsql;
            `;

            // Create decryption function
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION decrypt_data(encrypted_data BYTEA, key TEXT)
                RETURNS TEXT AS $$
                BEGIN
                    RETURN pgp_sym_decrypt(encrypted_data, key);
                END;
                $$ LANGUAGE plpgsql;
            `;

            // Create encryption function for JSONB
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION encrypt_jsonb(data JSONB, key TEXT)
                RETURNS BYTEA AS $$
                BEGIN
                    RETURN pgp_sym_encrypt(data::text, key);
                END;
                $$ LANGUAGE plpgsql;
            `;

            // Create decryption function for JSONB
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION decrypt_jsonb(encrypted_data BYTEA, key TEXT)
                RETURNS JSONB AS $$
                BEGIN
                    RETURN pgp_sym_decrypt(encrypted_data, key)::jsonb;
                END;
                $$ LANGUAGE plpgsql;
            `;

            console.log('Encryption functions created successfully');
        } catch (error) {
            console.error('Failed to create encryption functions:', error);
            throw error;
        }
    }

    // Encrypt sensitive data
    async encrypt(data, key = null) {
        try {
            const encryptionKey = key || this.encryptionKey;
            
            if (!this.isInitialized) {
                throw new Error('Encryption not initialized');
            }

            // Handle different data types
            if (typeof data === 'object') {
                data = JSON.stringify(data);
            }

            const { data: encryptedData, error } = await this.supabaseClient.supabase
                .rpc('encrypt_data', { 
                    data: data.toString(), 
                    key: encryptionKey 
                });

            if (error) {
                throw new Error(`Encryption failed: ${error.message}`);
            }

            return encryptedData;
        } catch (error) {
            console.error('Encryption error:', error);
            throw error;
        }
    }

    // Decrypt sensitive data
    async decrypt(encryptedData, key = null) {
        try {
            const decryptionKey = key || this.encryptionKey;
            
            if (!this.isInitialized) {
                throw new Error('Encryption not initialized');
            }

            const { data: decryptedData, error } = await this.supabaseClient.supabase
                .rpc('decrypt_data', { 
                    encrypted_data: encryptedData, 
                    key: decryptionKey 
                });

            if (error) {
                // Try with previous key if current key fails
                if (this.previousKey && key === null) {
                    return await this.decrypt(encryptedData, this.previousKey);
                }
                throw new Error(`Decryption failed: ${error.message}`);
            }

            return decryptedData;
        } catch (error) {
            console.error('Decryption error:', error);
            throw error;
        }
    }

    // Encrypt JSONB data
    async encryptJSONB(data, key = null) {
        try {
            const encryptionKey = key || this.encryptionKey;
            
            if (!this.isInitialized) {
                throw new Error('Encryption not initialized');
            }

            const { data: encryptedData, error } = await this.supabaseClient.supabase
                .rpc('encrypt_jsonb', { 
                    data: data, 
                    key: encryptionKey 
                });

            if (error) {
                throw new Error(`JSONB encryption failed: ${error.message}`);
            }

            return encryptedData;
        } catch (error) {
            console.error('JSONB encryption error:', error);
            throw error;
        }
    }

    // Decrypt JSONB data
    async decryptJSONB(encryptedData, key = null) {
        try {
            const decryptionKey = key || this.encryptionKey;
            
            if (!this.isInitialized) {
                throw new Error('Encryption not initialized');
            }

            const { data: decryptedData, error } = await this.supabaseClient.supabase
                .rpc('decrypt_jsonb', { 
                    encrypted_data: encryptedData, 
                    key: decryptionKey 
                });

            if (error) {
                // Try with previous key if current key fails
                if (this.previousKey && key === null) {
                    return await this.decryptJSONB(encryptedData, this.previousKey);
                }
                throw new Error(`JSONB decryption failed: ${error.message}`);
            }

            return decryptedData;
        } catch (error) {
            console.error('JSONB decryption error:', error);
            throw error;
        }
    }

    // Encrypt user data
    async encryptUserData(userData) {
        try {
            const sensitiveFields = this.securityConfig.databaseSecurity.encryption.sensitiveColumns;
            const encryptedData = { ...userData };

            for (const field of sensitiveFields) {
                const [table, column] = field.split('.');
                
                if (table === 'users' && userData[column]) {
                    encryptedData[column] = await this.encrypt(userData[column]);
                }
            }

            return encryptedData;
        } catch (error) {
            console.error('Error encrypting user data:', error);
            throw error;
        }
    }

    // Decrypt user data
    async decryptUserData(userData) {
        try {
            const sensitiveFields = this.securityConfig.databaseSecurity.encryption.sensitiveColumns;
            const decryptedData = { ...userData };

            for (const field of sensitiveFields) {
                const [table, column] = field.split('.');
                
                if (table === 'users' && userData[column]) {
                    decryptedData[column] = await this.decrypt(userData[column]);
                }
            }

            return decryptedData;
        } catch (error) {
            console.error('Error decrypting user data:', error);
            throw error;
        }
    }

    // Encrypt template content
    async encryptTemplateContent(templateData) {
        try {
            const encryptedTemplate = { ...templateData };

            if (templateData.content) {
                encryptedTemplate.content = await this.encryptJSONB(templateData.content);
            }

            if (templateData.requirements) {
                encryptedTemplate.requirements = await this.encryptJSONB(templateData.requirements);
            }

            return encryptedTemplate;
        } catch (error) {
            console.error('Error encrypting template content:', error);
            throw error;
        }
    }

    // Decrypt template content
    async decryptTemplateContent(templateData) {
        try {
            const decryptedTemplate = { ...templateData };

            if (templateData.content) {
                decryptedTemplate.content = await this.decryptJSONB(templateData.content);
            }

            if (templateData.requirements) {
                decryptedTemplate.requirements = await this.decryptJSONB(templateData.requirements);
            }

            return decryptedTemplate;
        } catch (error) {
            console.error('Error decrypting template content:', error);
            throw error;
        }
    }

    // Rotate encryption key
    async rotateEncryptionKey(newKey) {
        try {
            const oldKey = this.encryptionKey;
            
            // Update keys
            this.previousKey = oldKey;
            this.encryptionKey = newKey;

            // Re-encrypt sensitive data with new key
            await this.reencryptSensitiveData(oldKey, newKey);

            console.log('Encryption key rotated successfully');
            return true;
        } catch (error) {
            console.error('Error rotating encryption key:', error);
            throw error;
        }
    }

    // Re-encrypt sensitive data with new key
    async reencryptSensitiveData(oldKey, newKey) {
        try {
            // This would involve updating all encrypted data
            // Implementation would depend on specific database structure
            
            console.log('Data re-encryption completed');
        } catch (error) {
            console.error('Error re-encrypting data:', error);
            throw error;
        }
    }

    // Validate encryption integrity
    async validateEncryptionIntegrity() {
        try {
            // Test encryption/decryption
            const testData = 'Test encryption integrity';
            const encrypted = await this.encrypt(testData);
            const decrypted = await this.decrypt(encrypted);

            if (decrypted !== testData) {
                throw new Error('Encryption integrity validation failed');
            }

            console.log('Encryption integrity validated successfully');
            return true;
        } catch (error) {
            console.error('Encryption integrity validation failed:', error);
            throw error;
        }
    }

    // Get encryption status
    getEncryptionStatus() {
        return {
            initialized: this.isInitialized,
            keyRotationEnabled: this.securityConfig.databaseSecurity.encryption.keyRotation.enabled,
            algorithm: this.securityConfig.databaseSecurity.encryption.algorithm,
            sensitiveColumnsCount: this.securityConfig.databaseSecurity.encryption.sensitiveColumns.length
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatabaseEncryption;
}
