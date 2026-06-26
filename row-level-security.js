// TrustMD Row Level Security Manager
// Comprehensive RLS policy management for multi-tenant data isolation

class RowLevelSecurityManager {
    constructor(supabaseClient, securityConfig) {
        this.supabaseClient = supabaseClient;
        this.securityConfig = securityConfig;
        this.isInitialized = false;
        this.tenantContext = null;
    }

    // Initialize RLS system
    async initialize() {
        try {
            // Enable RLS on all required tables
            await this.enableRLSOnTables();
            
            // Create RLS policies
            await this.createRLSPolicies();
            
            // Create tenant context functions
            await this.createTenantContextFunctions();
            
            // Create helper functions
            await this.createHelperFunctions();
            
            this.isInitialized = true;
            console.log('Row Level Security initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize RLS:', error);
            throw error;
        }
    }

    // Enable RLS on all tenant-specific tables
    async enableRLSOnTables() {
        try {
            const tables = this.securityConfig.databaseSecurity.rowLevelSecurity.tenantIsolation.tables;
            
            for (const table of tables) {
                await this.supabaseClient.supabase.sql`
                    ALTER TABLE ${this.supabaseClient.supabase.raw(table)} ENABLE ROW LEVEL SECURITY;
                `;
                console.log(`RLS enabled on table: ${table}`);
            }
        } catch (error) {
            console.error('Failed to enable RLS on tables:', error);
            throw error;
        }
    }

    // Create comprehensive RLS policies
    async createRLSPolicies() {
        try {
            // Create tenant read policy
            await this.createTenantReadPolicy();
            
            // Create tenant write policy
            await this.createTenantWritePolicy();
            
            // Create admin override policy
            await this.createAdminOverridePolicy();
            
            // Create service account policy
            await this.createServiceAccountPolicy();
            
            console.log('RLS policies created successfully');
        } catch (error) {
            console.error('Failed to create RLS policies:', error);
            throw error;
        }
    }

    // Create tenant read policy
    async createTenantReadPolicy() {
        try {
            const tables = this.securityConfig.databaseSecurity.rowLevelSecurity.tenantIsolation.tables;
            
            for (const table of tables) {
                await this.supabaseClient.supabase.sql`
                    CREATE POLICY "tenant_read_policy" ON ${this.supabaseClient.supabase.raw(table)}
                    FOR SELECT USING (
                        tenant_id IN (
                            SELECT id FROM tenants 
                            WHERE subdomain = current_setting('app.current_tenant', true)
                        )
                    );
                `;
            }
        } catch (error) {
            console.error('Failed to create tenant read policy:', error);
            throw error;
        }
    }

    // Create tenant write policy
    async createTenantWritePolicy() {
        try {
            const tables = this.securityConfig.databaseSecurity.rowLevelSecurity.tenantIsolation.tables;
            
            for (const table of tables) {
                await this.supabaseClient.supabase.sql`
                    CREATE POLICY "tenant_write_policy" ON ${this.supabaseClient.supabase.raw(table)}
                    FOR INSERT WITH CHECK (
                        tenant_id IN (
                            SELECT id FROM tenants 
                            WHERE subdomain = current_setting('app.current_tenant', true)
                        )
                    );
                    
                    CREATE POLICY "tenant_update_policy" ON ${this.supabaseClient.supabase.raw(table)}
                    FOR UPDATE USING (
                        tenant_id IN (
                            SELECT id FROM tenants 
                            WHERE subdomain = current_setting('app.current_tenant', true)
                        )
                    );
                    
                    CREATE POLICY "tenant_delete_policy" ON ${this.supabaseClient.supabase.raw(table)}
                    FOR DELETE USING (
                        tenant_id IN (
                            SELECT id FROM tenants 
                            WHERE subdomain = current_setting('app.current_tenant', true)
                        )
                    );
                `;
            }
        } catch (error) {
            console.error('Failed to create tenant write policy:', error);
            throw error;
        }
    }

    // Create admin override policy
    async createAdminOverridePolicy() {
        try {
            const tables = this.securityConfig.databaseSecurity.rowLevelSecurity.tenantIsolation.tables;
            
            for (const table of tables) {
                await this.supabaseClient.supabase.sql`
                    CREATE POLICY "admin_override_policy" ON ${this.supabaseClient.supabase.raw(table)}
                    FOR ALL USING (
                        EXISTS (
                            SELECT 1 FROM user_roles ur
                            JOIN roles r ON ur.role_id = r.id
                            WHERE ur.user_id = auth.uid()
                            AND r.level >= 80
                            AND ur.tenant_id = current_setting('app.current_tenant', true)::uuid
                        )
                    );
                `;
            }
        } catch (error) {
            console.error('Failed to create admin override policy:', error);
            throw error;
        }
    }

    // Create service account policy
    async createServiceAccountPolicy() {
        try {
            const tables = this.securityConfig.databaseSecurity.rowLevelSecurity.tenantIsolation.tables;
            
            for (const table of tables) {
                await this.supabaseClient.supabase.sql`
                    CREATE POLICY "service_account_policy" ON ${this.supabaseClient.supabase.raw(table)}
                    FOR ALL USING (
                        EXISTS (
                            SELECT 1 FROM users u
                            WHERE u.id = auth.uid()
                            AND u.is_service_account = true
                        )
                    );
                `;
            }
        } catch (error) {
            console.error('Failed to create service account policy:', error);
            throw error;
        }
    }

    // Create tenant context functions
    async createTenantContextFunctions() {
        try {
            // Function to get current tenant ID
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION get_current_tenant_id()
                RETURNS UUID AS $$
                DECLARE
                    tenant_subdomain TEXT;
                    tenant_id UUID;
                BEGIN
                    tenant_subdomain := current_setting('app.current_tenant', true);
                    
                    SELECT id INTO tenant_id 
                    FROM tenants 
                    WHERE subdomain = tenant_subdomain AND status = 'active';
                    
                    RETURN tenant_id;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            // Function to check if user belongs to current tenant
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION user_belongs_to_current_tenant(user_id UUID)
                RETURNS BOOLEAN AS $$
                DECLARE
                    current_tenant_id UUID;
                    user_tenant_id UUID;
                BEGIN
                    current_tenant_id := get_current_tenant_id();
                    
                    SELECT tenant_id INTO user_tenant_id
                    FROM users
                    WHERE id = user_id;
                    
                    RETURN user_tenant_id = current_tenant_id;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            // Function to check user role level
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION get_user_role_level(user_id UUID)
                RETURNS INTEGER AS $$
                DECLARE
                    role_level INTEGER;
                BEGIN
                    SELECT MAX(r.level) INTO role_level
                    FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = user_id
                    AND ur.tenant_id = get_current_tenant_id();
                    
                    RETURN COALESCE(role_level, 0);
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            console.log('Tenant context functions created successfully');
        } catch (error) {
            console.error('Failed to create tenant context functions:', error);
            throw error;
        }
    }

    // Create helper functions
    async createHelperFunctions() {
        try {
            // Function to set tenant context
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION set_tenant_context(tenant_subdomain TEXT)
                RETURNS VOID AS $$
                BEGIN
                    PERFORM set_config('app.current_tenant', tenant_subdomain, true);
                END;
                $$ LANGUAGE plpgsql;
            `;

            // Function to clear tenant context
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION clear_tenant_context()
                RETURNS VOID AS $$
                BEGIN
                    PERFORM set_config('app.current_tenant', '', true);
                END;
                $$ LANGUAGE plpgsql;
            `;

            // Function to validate tenant access
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION validate_tenant_access(table_name TEXT, operation TEXT)
                RETURNS BOOLEAN AS $$
                DECLARE
                    current_tenant_id UUID;
                    user_role_level INTEGER;
                BEGIN
                    current_tenant_id := get_current_tenant_id();
                    user_role_level := get_user_role_level(auth.uid());
                    
                    -- Admin override
                    IF user_role_level >= 80 THEN
                        RETURN TRUE;
                    END IF;
                    
                    -- Service account override
                    IF EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.id = auth.uid() AND u.is_service_account = true
                    ) THEN
                        RETURN TRUE;
                    END IF;
                    
                    -- Regular user validation
                    RETURN user_belongs_to_current_tenant(auth.uid());
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            console.log('Helper functions created successfully');
        } catch (error) {
            console.error('Failed to create helper functions:', error);
            throw error;
        }
    }

    // Set tenant context for a session
    async setTenantContext(tenantSubdomain) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .rpc('set_tenant_context', { tenant_subdomain: tenantSubdomain });

            if (error) {
                throw new Error(`Failed to set tenant context: ${error.message}`);
            }

            this.tenantContext = tenantSubdomain;
            console.log(`Tenant context set to: ${tenantSubdomain}`);
            return data;
        } catch (error) {
            console.error('Error setting tenant context:', error);
            throw error;
        }
    }

    // Clear tenant context
    async clearTenantContext() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .rpc('clear_tenant_context');

            if (error) {
                throw new Error(`Failed to clear tenant context: ${error.message}`);
            }

            this.tenantContext = null;
            console.log('Tenant context cleared');
            return data;
        } catch (error) {
            console.error('Error clearing tenant context:', error);
            throw error;
        }
    }

    // Validate RLS policies
    async validateRLSPolicies() {
        try {
            const tables = this.securityConfig.databaseSecurity.rowLevelSecurity.tenantIsolation.tables;
            const validationResults = [];

            for (const table of tables) {
                // Check if RLS is enabled
                const { data: rlsStatus } = await this.supabaseClient.supabase
                    .from('information_schema.tables')
                    .select('rowsecurity')
                    .eq('table_name', table)
                    .single();

                // Check if policies exist
                const { data: policies } = await this.supabaseClient.supabase
                    .from('pg_policies')
                    .select('*')
                    .eq('tablename', table);

                validationResults.push({
                    table,
                    rlsEnabled: rlsStatus?.rowsecurity || false,
                    policyCount: policies?.length || 0,
                    isValid: (rlsStatus?.rowsecurity || false) && (policies?.length || 0) > 0
                });
            }

            const allValid = validationResults.every(result => result.isValid);
            
            if (allValid) {
                console.log('RLS policies validation passed');
            } else {
                console.warn('RLS policies validation failed:', validationResults);
            }

            return {
                isValid: allValid,
                results: validationResults
            };
        } catch (error) {
            console.error('Error validating RLS policies:', error);
            throw error;
        }
    }

    // Get RLS status
    getRLSStatus() {
        return {
            initialized: this.isInitialized,
            tenantContext: this.tenantContext,
            tablesCount: this.securityConfig.databaseSecurity.rowLevelSecurity.tenantIsolation.tables.length,
            policiesEnabled: this.securityConfig.databaseSecurity.rowLevelSecurity.enabled
        };
    }

    // Create custom RLS policy
    async createCustomPolicy(tableName, policyName, policyDefinition) {
        try {
            const { data, error } = await this.supabaseClient.supabase.sql`
                CREATE POLICY ${this.supabaseClient.supabase.raw(policyName)} ON ${this.supabaseClient.supabase.raw(tableName)}
                ${this.supabaseClient.supabase.raw(policyDefinition)}
            `;

            if (error) {
                throw new Error(`Failed to create custom policy: ${error.message}`);
            }

            console.log(`Custom policy created: ${policyName} on ${tableName}`);
            return data;
        } catch (error) {
            console.error('Error creating custom policy:', error);
            throw error;
        }
    }

    // Drop RLS policy
    async dropPolicy(tableName, policyName) {
        try {
            const { data, error } = await this.supabaseClient.supabase.sql`
                DROP POLICY IF EXISTS ${this.supabaseClient.supabase.raw(policyName)} ON ${this.supabaseClient.supabase.raw(tableName)}
            `;

            if (error) {
                throw new Error(`Failed to drop policy: ${error.message}`);
            }

            console.log(`Policy dropped: ${policyName} on ${tableName}`);
            return data;
        } catch (error) {
            console.error('Error dropping policy:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RowLevelSecurityManager;
}
