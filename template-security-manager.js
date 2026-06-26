// TrustMD Template Security Manager
// Comprehensive template encryption, access control, and validation

class TemplateSecurityManager {
    constructor(supabaseClient, securityConfig) {
        this.supabaseClient = supabaseClient;
        this.securityConfig = securityConfig;
        this.isInitialized = false;
        this.templateSecurity = null;
        this.encryptionKey = null;
        this.accessControlCache = new Map();
    }

    // Initialize template security system
    async initialize() {
        try {
            // Load template security configuration
            await this.loadTemplateSecurityConfiguration();
            
            // Setup template encryption
            await this.setupTemplateEncryption();
            
            // Setup access control
            await this.setupAccessControl();
            
            // Create template validation functions
            await this.createTemplateValidationFunctions();
            
            // Create template security policies
            await this.createTemplateSecurityPolicies();
            
            this.isInitialized = true;
            console.log('Template Security Manager initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Template Security Manager:', error);
            throw error;
        }
    }

    // Load template security configuration
    async loadTemplateSecurityConfiguration() {
        try {
            this.templateSecurity = this.securityConfig.templateSecurity;
            
            // Load encryption key
            this.encryptionKey = process.env.TEMPLATE_ENCRYPTION_KEY || process.env.DB_ENCRYPTION_KEY;
            
            if (!this.encryptionKey) {
                throw new Error('Template encryption key not found');
            }
            
            console.log('Template security configuration loaded successfully');
        } catch (error) {
            console.error('Failed to load template security configuration:', error);
            throw error;
        }
    }

    // Setup template encryption
    async setupTemplateEncryption() {
        try {
            if (!this.templateSecurity.encryption.enabled) {
                console.log('Template encryption disabled');
                return;
            }

            // Create template encryption functions
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION encrypt_template_content(content JSONB, key TEXT)
                RETURNS BYTEA AS $$
                BEGIN
                    RETURN pgp_sym_encrypt(content::text, key);
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION decrypt_template_content(encrypted_content BYTEA, key TEXT)
                RETURNS JSONB AS $$
                BEGIN
                    RETURN pgp_sym_decrypt(encrypted_content, key)::jsonb;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            // Add encrypted columns if they don't exist
            for (const column of this.templateSecurity.encryption.encryptedColumns) {
                await this.supabaseClient.supabase.sql`
                    ALTER TABLE compliance_templates 
                    ADD COLUMN IF NOT EXISTS ${this.supabaseClient.supabase.raw(column + '_encrypted')} BYTEA;
                `;
            }

            console.log('Template encryption setup completed');
        } catch (error) {
            console.error('Failed to setup template encryption:', error);
            throw error;
        }
    }

    // Setup access control
    async setupAccessControl() {
        try {
            if (!this.templateSecurity.accessControl.enabled) {
                console.log('Template access control disabled');
                return;
            }

            // Create access control functions
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION check_template_access(
                    user_id UUID, 
                    template_id UUID, 
                    required_permission TEXT DEFAULT 'read'
                ) RETURNS BOOLEAN AS $$
                DECLARE
                    template_tenant_id UUID;
                    user_tenant_id UUID;
                    user_role_level INTEGER;
                    required_level INTEGER;
                BEGIN
                    -- Get template tenant
                    SELECT tenant_id INTO template_tenant_id
                    FROM compliance_templates
                    WHERE id = check_template_access.template_id;
                    
                    -- Get user tenant
                    SELECT tenant_id INTO user_tenant_id
                    FROM users
                    WHERE id = check_template_access.user_id;
                    
                    -- Check tenant match
                    IF template_tenant_id != user_tenant_id THEN
                        RETURN FALSE;
                    END IF;
                    
                    -- Get user's maximum role level
                    SELECT MAX(r.level) INTO user_role_level
                    FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = check_template_access.user_id
                    AND ur.tenant_id = user_tenant_id
                    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
                    
                    -- Determine required level based on permission
                    required_level := CASE check_template_access.required_permission
                        WHEN 'delete' THEN 80
                        WHEN 'write' THEN 60
                        WHEN 'share' THEN 40
                        WHEN 'read' THEN 20
                        ELSE 20
                    END;
                    
                    RETURN COALESCE(user_role_level, 0) >= required_level;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            // Create template permission cache
            await this.supabaseClient.supabase.sql`
                CREATE TABLE IF NOT EXISTS template_permission_cache (
                    cache_key TEXT PRIMARY KEY,
                    user_id UUID NOT NULL,
                    template_id UUID NOT NULL,
                    permissions JSONB NOT NULL,
                    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `;

            console.log('Template access control setup completed');
        } catch (error) {
            console.error('Failed to setup template access control:', error);
            throw error;
        }
    }

    // Create template validation functions
    async createTemplateValidationFunctions() {
        try {
            if (!this.templateSecurity.validation.enabled) {
                console.log('Template validation disabled');
                return;
            }

            // Create template content validation
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION validate_template_content(template_content JSONB)
                RETURNS BOOLEAN AS $$
                DECLARE
                    required_keys TEXT[] := ARRAY['name', 'description', 'sections'];
                    key TEXT;
                BEGIN
                    -- Check for required keys
                    FOREACH key IN ARRAY required_keys LOOP
                        IF NOT (template_content ? key) THEN
                            RETURN FALSE;
                        END IF;
                    END LOOP;
                    
                    -- Validate sections structure
                    IF jsonb_typeof(template_content->'sections') != 'array' THEN
                        RETURN FALSE;
                    END IF;
                    
                    -- Validate each section
                    FOR i IN 0..jsonb_array_length(template_content->'sections') - 1 LOOP
                        IF NOT (
                            (template_content->'sections'->i ? 'title') AND
                            (template_content->'sections'->i ? 'requirements')
                        ) THEN
                            RETURN FALSE;
                        END IF;
                    END LOOP;
                    
                    RETURN TRUE;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            // Create template integrity check
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION calculate_template_checksum(template_content JSONB)
                RETURNS TEXT AS $$
                BEGIN
                    RETURN encode(sha256(template_content::text::bytea), 'hex');
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            // Create template version validation
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION validate_template_version(template_id UUID, new_version TEXT)
                RETURNS BOOLEAN AS $$
                DECLARE
                    latest_version TEXT;
                BEGIN
                    -- Get latest version
                    SELECT version INTO latest_version
                    FROM template_versions
                    WHERE template_id = validate_template_version.template_id
                    ORDER BY created_at DESC
                    LIMIT 1;
                    
                    -- Validate version format (semantic versioning)
                    IF new_version !~ '^\d+\.\d+\.\d+$' THEN
                        RETURN FALSE;
                    END IF;
                    
                    -- Check if version is newer than latest
                    IF latest_version IS NOT NULL THEN
                        -- Simple version comparison (could be enhanced)
                        IF new_version <= latest_version THEN
                            RETURN FALSE;
                        END IF;
                    END IF;
                    
                    RETURN TRUE;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            console.log('Template validation functions created successfully');
        } catch (error) {
            console.error('Failed to create template validation functions:', error);
            throw error;
        }
    }

    // Create template security policies
    async createTemplateSecurityPolicies() {
        try {
            // Enable RLS on compliance_templates
            await this.supabaseClient.supabase.sql`
                ALTER TABLE compliance_templates ENABLE ROW LEVEL SECURITY;
            `;

            // Create template access policy
            await this.supabaseClient.supabase.sql`
                CREATE POLICY "template_access_policy" ON compliance_templates
                FOR ALL USING (
                    check_template_access(auth.uid(), id, CASE 
                        WHEN current_setting('request.method', true) = 'GET' THEN 'read'
                        WHEN current_setting('request.method', true) = 'POST' THEN 'write'
                        WHEN current_setting('request.method', true) = 'PUT' THEN 'write'
                        WHEN current_setting('request.method', true) = 'DELETE' THEN 'delete'
                        ELSE 'read'
                    END)
                );
            `;

            // Create template owner policy
            await this.supabaseClient.supabase.sql`
                CREATE POLICY "template_owner_policy" ON compliance_templates
                FOR ALL USING (
                    created_by = auth.uid()
                );
            `;

            console.log('Template security policies created successfully');
        } catch (error) {
            console.error('Failed to create template security policies:', error);
            throw error;
        }
    }

    // Encrypt template content
    async encryptTemplateContent(templateData) {
        try {
            if (!this.templateSecurity.encryption.enabled) {
                return templateData;
            }

            const encryptedData = { ...templateData };

            for (const column of this.templateSecurity.encryption.encryptedColumns) {
                if (templateData[column]) {
                    const { data, error } = await this.supabaseClient.supabase
                        .rpc('encrypt_template_content', {
                            content: templateData[column],
                            key: this.encryptionKey
                        });

                    if (error) {
                        throw new Error(`Failed to encrypt ${column}: ${error.message}`);
                    }

                    encryptedData[`${column}_encrypted`] = data;
                    delete encryptedData[column];
                }
            }

            return encryptedData;
        } catch (error) {
            console.error('Failed to encrypt template content:', error);
            throw error;
        }
    }

    // Decrypt template content
    async decryptTemplateContent(templateData) {
        try {
            if (!this.templateSecurity.encryption.enabled) {
                return templateData;
            }

            const decryptedData = { ...templateData };

            for (const column of this.templateSecurity.encryption.encryptedColumns) {
                const encryptedColumn = `${column}_encrypted`;
                if (templateData[encryptedColumn]) {
                    const { data, error } = await this.supabaseClient.supabase
                        .rpc('decrypt_template_content', {
                            encrypted_content: templateData[encryptedColumn],
                            key: this.encryptionKey
                        });

                    if (error) {
                        throw new Error(`Failed to decrypt ${column}: ${error.message}`);
                    }

                    decryptedData[column] = data;
                    delete decryptedData[encryptedColumn];
                }
            }

            return decryptedData;
        } catch (error) {
            console.error('Failed to decrypt template content:', error);
            throw error;
        }
    }

    // Create template with security
    async createTemplate(templateData, userId, tenantId) {
        try {
            // Validate template content
            if (this.templateSecurity.validation.enabled) {
                const { data, error } = await this.supabaseClient.supabase
                    .rpc('validate_template_content', {
                        template_content: templateData.content
                    });

                if (error || !data) {
                    throw new Error('Template content validation failed');
                }
            }

            // Calculate checksum
            const checksum = await this.calculateTemplateChecksum(templateData.content);

            // Encrypt sensitive content
            const encryptedData = await this.encryptTemplateContent(templateData);

            // Create template record
            const templateRecord = {
                ...encryptedData,
                tenant_id: tenantId,
                created_by: userId,
                checksum: checksum,
                status: 'active',
                version: '1.0.0'
            };

            const { data, error } = await this.supabaseClient.supabase
                .from('compliance_templates')
                .insert(templateRecord)
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to create template: ${error.message}`);
            }

            // Clear access control cache
            await this.clearTemplateAccessCache(data.id);

            console.log(`Template created successfully: ${data.id}`);
            return data;
        } catch (error) {
            console.error('Failed to create template:', error);
            throw error;
        }
    }

    // Get template with security
    async getTemplate(templateId, userId, permission = 'read') {
        try {
            // Check access permission
            const hasAccess = await this.checkTemplateAccess(userId, templateId, permission);
            if (!hasAccess) {
                throw new Error('Access denied: insufficient permissions');
            }

            // Get template
            const { data, error } = await this.supabaseClient.supabase
                .from('compliance_templates')
                .select('*')
                .eq('id', templateId)
                .single();

            if (error) {
                throw new Error(`Failed to get template: ${error.message}`);
            }

            // Decrypt content
            const decryptedData = await this.decryptTemplateContent(data);

            return decryptedData;
        } catch (error) {
            console.error('Failed to get template:', error);
            throw error;
        }
    }

    // Update template with security
    async updateTemplate(templateId, updateData, userId) {
        try {
            // Check write permission
            const hasAccess = await this.checkTemplateAccess(userId, templateId, 'write');
            if (!hasAccess) {
                throw new Error('Access denied: insufficient permissions');
            }

            // Validate new content if provided
            if (updateData.content && this.templateSecurity.validation.enabled) {
                const { data, error } = await this.supabaseClient.supabase
                    .rpc('validate_template_content', {
                        template_content: updateData.content
                    });

                if (error || !data) {
                    throw new Error('Template content validation failed');
                }
            }

            // Calculate new checksum if content updated
            if (updateData.content) {
                updateData.checksum = await this.calculateTemplateChecksum(updateData.content);
            }

            // Encrypt sensitive updates
            const encryptedUpdates = await this.encryptTemplateContent(updateData);

            // Update template
            const { data, error } = await this.supabaseClient.supabase
                .from('compliance_templates')
                .update({
                    ...encryptedUpdates,
                    updated_at: new Date().toISOString(),
                    updated_by: userId
                })
                .eq('id', templateId)
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to update template: ${error.message}`);
            }

            // Clear access control cache
            await this.clearTemplateAccessCache(templateId);

            console.log(`Template updated successfully: ${templateId}`);
            return data;
        } catch (error) {
            console.error('Failed to update template:', error);
            throw error;
        }
    }

    // Delete template with security
    async deleteTemplate(templateId, userId) {
        try {
            // Check delete permission
            const hasAccess = await this.checkTemplateAccess(userId, templateId, 'delete');
            if (!hasAccess) {
                throw new Error('Access denied: insufficient permissions');
            }

            // Soft delete template
            const { data, error } = await this.supabaseClient.supabase
                .from('compliance_templates')
                .update({
                    status: 'deleted',
                    deleted_at: new Date().toISOString(),
                    deleted_by: userId
                })
                .eq('id', templateId)
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to delete template: ${error.message}`);
            }

            // Clear access control cache
            await this.clearTemplateAccessCache(templateId);

            console.log(`Template deleted successfully: ${templateId}`);
            return data;
        } catch (error) {
            console.error('Failed to delete template:', error);
            throw error;
        }
    }

    // Check template access
    async checkTemplateAccess(userId, templateId, permission = 'read') {
        try {
            const cacheKey = `${userId}_${templateId}_${permission}`;
            
            // Check cache first
            if (this.accessControlCache.has(cacheKey)) {
                return this.accessControlCache.get(cacheKey);
            }

            // Check database
            const { data, error } = await this.supabaseClient.supabase
                .rpc('check_template_access', {
                    user_id: userId,
                    template_id: templateId,
                    required_permission: permission
                });

            if (error) {
                throw new Error(`Access check failed: ${error.message}`);
            }

            // Cache result
            this.accessControlCache.set(cacheKey, data);
            
            // Set cache expiration
            setTimeout(() => {
                this.accessControlCache.delete(cacheKey);
            }, 300000); // 5 minutes

            return data;
        } catch (error) {
            console.error('Failed to check template access:', error);
            return false;
        }
    }

    // Calculate template checksum
    async calculateTemplateChecksum(content) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .rpc('calculate_template_checksum', {
                    template_content: content
                });

            if (error) {
                throw new Error(`Checksum calculation failed: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Failed to calculate checksum:', error);
            throw error;
        }
    }

    // Validate template integrity
    async validateTemplateIntegrity(templateId) {
        try {
            // Get template
            const { data, error } = await this.supabaseClient.supabase
                .from('compliance_templates')
                .select('content, checksum')
                .eq('id', templateId)
                .single();

            if (error) {
                throw new Error(`Failed to get template for integrity check: ${error.message}`);
            }

            // Calculate current checksum
            const currentChecksum = await this.calculateTemplateChecksum(data.content);

            // Compare checksums
            const isValid = currentChecksum === data.checksum;

            // Log integrity check
            await this.supabaseClient.supabase
                .from('template_integrity_logs')
                .insert({
                    template_id: templateId,
                    expected_checksum: data.checksum,
                    actual_checksum: currentChecksum,
                    is_valid: isValid,
                    checked_at: new Date().toISOString()
                });

            return {
                templateId,
                isValid,
                expectedChecksum: data.checksum,
                actualChecksum: currentChecksum
            };
        } catch (error) {
            console.error('Failed to validate template integrity:', error);
            throw error;
        }
    }

    // Clear template access cache
    async clearTemplateAccessCache(templateId) {
        try {
            // Clear in-memory cache
            for (const [key] of this.accessControlCache) {
                if (key.includes(templateId)) {
                    this.accessControlCache.delete(key);
                }
            }

            // Clear database cache
            await this.supabaseClient.supabase
                .from('template_permission_cache')
                .delete()
                .eq('template_id', templateId);

            console.log(`Template access cache cleared for template: ${templateId}`);
        } catch (error) {
            console.error('Failed to clear template access cache:', error);
        }
    }

    // Get template security statistics
    async getTemplateSecurityStats(tenantId = null) {
        try {
            let query = this.supabaseClient.supabase
                .from('compliance_templates')
                .select('id, tenant_id, status, checksum, created_at');

            if (tenantId) {
                query = query.eq('tenant_id', tenantId);
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(`Failed to get template security stats: ${error.message}`);
            }

            const stats = {
                totalTemplates: data?.length || 0,
                activeTemplates: 0,
                deletedTemplates: 0,
                encryptedTemplates: 0,
                templatesWithChecksum: 0,
                cacheSize: this.accessControlCache.size
            };

            if (data) {
                for (const template of data) {
                    if (template.status === 'active') {
                        stats.activeTemplates++;
                    } else if (template.status === 'deleted') {
                        stats.deletedTemplates++;
                    }

                    if (template.checksum) {
                        stats.templatesWithChecksum++;
                    }

                    // Check if template has encrypted content
                    if (template.content_encrypted) {
                        stats.encryptedTemplates++;
                    }
                }
            }

            return stats;
        } catch (error) {
            console.error('Failed to get template security stats:', error);
            throw error;
        }
    }

    // Get system status
    getStatus() {
        return {
            initialized: this.isInitialized,
            encryptionEnabled: this.templateSecurity?.encryption?.enabled || false,
            accessControlEnabled: this.templateSecurity?.accessControl?.enabled || false,
            validationEnabled: this.templateSecurity?.validation?.enabled || false,
            cacheSize: this.accessControlCache.size,
            encryptedColumns: this.templateSecurity?.encryption?.encryptedColumns?.length || 0
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateSecurityManager;
}
