// TrustMD Evidence Vault - Document Manager Module
// Handles document storage, retrieval, and basic operations

class DocumentManager {
    constructor(supabaseClient, encryptionService) {
        this.supabaseClient = supabaseClient;
        this.encryptionService = encryptionService;
        this.currentUserId = null;
        this.currentTenantId = null;
    }
    
    // Initialize document manager
    async initialize(userId, tenantId) {
        this.currentUserId = userId;
        this.currentTenantId = tenantId;
        console.log('Document Manager initialized');
    }
    
    // Store document metadata
    async storeDocument(documentData) {
        try {
            // Encrypt sensitive metadata
            const encryptedMetadata = await this.encryptDocumentMetadata(documentData.metadata);
            
            // Calculate checksum
            const checksum = this.calculateChecksum(documentData.content || documentData.metadata);
            
            // Prepare document record
            const documentRecord = {
                tenant_id: this.currentTenantId,
                user_id: this.currentUserId,
                title: encryptedMetadata.title || documentData.title,
                category: documentData.category,
                type: documentData.type,
                metadata: encryptedMetadata,
                checksum: checksum,
                file_path: documentData.filePath,
                file_size: documentData.fileSize,
                mime_type: documentData.mimeType,
                version_number: 1,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // Store in database
            const { data, error } = await this.supabaseClient
                .from('documents')
                .insert(documentRecord)
                .select()
                .single();
            
            if (error) {
                throw new Error(`Failed to store document: ${error.message}`);
            }
            
            console.log(`Document stored successfully: ${data.id}`);
            return data;
        } catch (error) {
            console.error('Document storage failed:', error);
            throw error;
        }
    }
    
    // Retrieve document metadata
    async getDocument(documentId) {
        try {
            const { data, error } = await this.supabaseClient
                .from('documents')
                .select('*')
                .eq('id', documentId)
                .eq('tenant_id', this.currentTenantId)
                .single();
            
            if (error) {
                throw new Error(`Failed to retrieve document: ${error.message}`);
            }
            
            if (!data) {
                throw new Error('Document not found');
            }
            
            // Decrypt metadata
            const decryptedMetadata = await this.decryptDocumentMetadata(data.metadata);
            data.metadata = decryptedMetadata;
            
            return data;
        } catch (error) {
            console.error('Document retrieval failed:', error);
            throw error;
        }
    }
    
    // Update document
    async updateDocument(documentId, updateData) {
        try {
            // Get current document
            const currentDoc = await this.getDocument(documentId);
            
            // Create version before updating
            await this.createDocumentVersion(documentId, updateData, 'Document update');
            
            // Prepare update data
            const updateRecord = {
                ...updateData,
                version_number: (currentDoc.version_number || 1) + 1,
                updated_at: new Date().toISOString()
            };
            
            // Encrypt metadata if provided
            if (updateData.metadata) {
                updateRecord.metadata = await this.encryptDocumentMetadata(updateData.metadata);
            }
            
            // Update document
            const { data, error } = await this.supabaseClient
                .from('documents')
                .update(updateRecord)
                .eq('id', documentId)
                .eq('tenant_id', this.currentTenantId)
                .select()
                .single();
            
            if (error) {
                throw new Error(`Failed to update document: ${error.message}`);
            }
            
            console.log(`Document updated successfully: ${documentId}`);
            return data;
        } catch (error) {
            console.error('Document update failed:', error);
            throw error;
        }
    }
    
    // Delete document
    async deleteDocument(documentId, reason = 'Document deletion') {
        try {
            // Soft delete - mark as inactive
            const { error } = await this.supabaseClient
                .from('documents')
                .update({
                    status: 'deleted',
                    deleted_at: new Date().toISOString(),
                    deletion_reason: reason,
                    deleted_by: this.currentUserId
                })
                .eq('id', documentId)
                .eq('tenant_id', this.currentTenantId);
            
            if (error) {
                throw new Error(`Failed to delete document: ${error.message}`);
            }
            
            console.log(`Document deleted successfully: ${documentId}`);
            return true;
        } catch (error) {
            console.error('Document deletion failed:', error);
            throw error;
        }
    }
    
    // List documents with filters
    async listDocuments(filters = {}) {
        try {
            let query = this.supabaseClient
                .from('documents')
                .select('*')
                .eq('tenant_id', this.currentTenantId)
                .eq('status', 'active');
            
            // Apply filters
            if (filters.category) {
                query = query.eq('category', filters.category);
            }
            
            if (filters.type) {
                query = query.eq('type', filters.type);
            }
            
            if (filters.userId) {
                query = query.eq('user_id', filters.userId);
            }
            
            if (filters.dateFrom) {
                query = query.gte('created_at', filters.dateFrom);
            }
            
            if (filters.dateTo) {
                query = query.lte('created_at', filters.dateTo);
            }
            
            // Apply sorting and pagination
            if (filters.orderBy) {
                query = query.order(filters.orderBy, { ascending: filters.ascending !== false });
            } else {
                query = query.order('created_at', { ascending: false });
            }
            
            if (filters.limit) {
                query = query.limit(filters.limit);
            }
            
            if (filters.offset) {
                query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
            }
            
            const { data, error } = await query;
            
            if (error) {
                throw new Error(`Failed to list documents: ${error.message}`);
            }
            
            // Decrypt metadata for each document
            const documents = await Promise.all(
                data.map(async (doc) => {
                    doc.metadata = await this.decryptDocumentMetadata(doc.metadata);
                    return doc;
                })
            );
            
            return documents;
        } catch (error) {
            console.error('Document listing failed:', error);
            throw error;
        }
    }
    
    // Search documents
    async searchDocuments(searchTerm, filters = {}) {
        try {
            let query = this.supabaseClient
                .from('documents')
                .select('*')
                .eq('tenant_id', this.currentTenantId)
                .eq('status', 'active');
            
            // Search in title and metadata
            if (searchTerm) {
                query = query.or(
                    `title.ilike.%${searchTerm}%,metadata->>'keywords'.ilike.%${searchTerm}%,metadata->>'description'.ilike.%${searchTerm}%`
                );
            }
            
            // Apply additional filters
            if (filters.category) {
                query = query.eq('category', filters.category);
            }
            
            query = query.order('created_at', { ascending: false });
            
            if (filters.limit) {
                query = query.limit(filters.limit);
            }
            
            const { data, error } = await query;
            
            if (error) {
                throw new Error(`Failed to search documents: ${error.message}`);
            }
            
            // Decrypt metadata for each document
            const documents = await Promise.all(
                data.map(async (doc) => {
                    doc.metadata = await this.decryptDocumentMetadata(doc.metadata);
                    return doc;
                })
            );
            
            return documents;
        } catch (error) {
            console.error('Document search failed:', error);
            throw error;
        }
    }
    
    // Create document version
    async createDocumentVersion(documentId, changes, reason) {
        try {
            // Get current document
            const currentDoc = await this.getDocument(documentId);
            
            // Create version record
            const versionData = {
                document_id: documentId,
                version_number: (currentDoc.version_number || 1) + 1,
                content: currentDoc.content || null,
                metadata: currentDoc.metadata,
                checksum: currentDoc.checksum,
                changes: changes,
                reason: reason,
                created_by: this.currentUserId,
                tenant_id: this.currentTenantId,
                created_at: new Date().toISOString()
            };
            
            const { data, error } = await this.supabaseClient
                .from('document_versions')
                .insert(versionData)
                .select()
                .single();
            
            if (error) {
                throw new Error(`Failed to create document version: ${error.message}`);
            }
            
            return data;
        } catch (error) {
            console.error('Document version creation failed:', error);
            throw error;
        }
    }
    
    // Get document versions
    async getDocumentVersions(documentId) {
        try {
            const { data, error } = await this.supabaseClient
                .from('document_versions')
                .select('*')
                .eq('document_id', documentId)
                .eq('tenant_id', this.currentTenantId)
                .order('created_at', { ascending: false });
            
            if (error) {
                throw new Error(`Failed to get document versions: ${error.message}`);
            }
            
            return data || [];
        } catch (error) {
            console.error('Document versions retrieval failed:', error);
            throw error;
        }
    }
    
    // Encrypt document metadata
    async encryptDocumentMetadata(metadata) {
        try {
            if (!this.encryptionService) {
                return metadata;
            }
            
            const sensitive = ['title', 'description', 'keywords', 'notes'];
            const encrypted = { ...metadata };
            
            for (const field of sensitive) {
                if (encrypted[field] && typeof encrypted[field] === 'string') {
                    encrypted[field] = await this.encryptionService.encrypt(encrypted[field]);
                }
            }
            
            encrypted.encrypted_fields = sensitive.filter(field => metadata[field]);
            encrypted.encryption_enabled = true;
            encrypted.encrypted_at = new Date().toISOString();
            
            return encrypted;
        } catch (error) {
            console.error('Metadata encryption failed:', error);
            return metadata;
        }
    }
    
    // Decrypt document metadata
    async decryptDocumentMetadata(encryptedMetadata) {
        try {
            if (!this.encryptionService || !encryptedMetadata.encryption_enabled) {
                return encryptedMetadata;
            }
            
            const decrypted = { ...encryptedMetadata };
            
            if (encryptedMetadata.encrypted_fields) {
                for (const field of encryptedMetadata.encrypted_fields) {
                    if (decrypted[field]) {
                        decrypted[field] = await this.encryptionService.decrypt(decrypted[field]);
                    }
                }
            }
            
            // Remove encryption metadata
            delete decrypted.encrypted_fields;
            delete decrypted.encryption_enabled;
            delete decrypted.encrypted_at;
            
            return decrypted;
        } catch (error) {
            console.error('Metadata decryption failed:', error);
            return encryptedMetadata;
        }
    }
    
    // Calculate checksum
    calculateChecksum(content) {
        try {
            const crypto = require('crypto');
            const contentString = typeof content === 'string' ? content : JSON.stringify(content);
            return crypto.createHash('sha256').update(contentString).digest('hex');
        } catch (error) {
            // Fallback for browser environment
            const contentString = typeof content === 'string' ? content : JSON.stringify(content);
            let hash = 0;
            for (let i = 0; i < contentString.length; i++) {
                const char = contentString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash.toString(16);
        }
    }
    
    // Validate document integrity
    validateDocumentIntegrity(document) {
        try {
            if (!document || !document.checksum) {
                return {
                    isValid: false,
                    error: 'Missing document checksum'
                };
            }
            
            // Calculate current checksum
            const currentChecksum = this.calculateChecksum(document.content || document.metadata);
            
            const isValid = currentChecksum === document.checksum;
            
            return {
                isValid,
                currentChecksum,
                storedChecksum: document.checksum,
                lastValidated: new Date().toISOString()
            };
        } catch (error) {
            return {
                isValid: false,
                error: `Integrity validation failed: ${error.message}`
            };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocumentManager;
} else {
    window.DocumentManager = DocumentManager;
}
