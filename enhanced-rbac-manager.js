// TrustMD Enhanced RBAC Manager
// Advanced role-based access control with validation, caching, and security

class EnhancedRBACManager {
    constructor(supabaseClient, securityConfig) {
        this.supabaseClient = supabaseClient;
        this.securityConfig = securityConfig;
        this.isInitialized = false;
        this.permissionCache = new Map();
        this.roleCache = new Map();
        this.cacheConfig = null;
        this.roleValidation = null;
    }

    // Initialize enhanced RBAC system
    async initialize() {
        try {
            // Load RBAC configuration
            await this.loadRBACConfiguration();
            
            // Setup permission caching
            await this.setupPermissionCaching();
            
            // Setup role validation
            await this.setupRoleValidation();
            
            // Create RBAC security policies
            await this.createRBACSecurityPolicies();
            
            // Create role management functions
            await this.createRoleManagementFunctions();
            
            this.isInitialized = true;
            console.log('Enhanced RBAC Manager initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Enhanced RBAC Manager:', error);
            throw error;
        }
    }

    // Load RBAC configuration
    async loadRBACConfiguration() {
        try {
            this.cacheConfig = this.securityConfig.rbacSecurity.permissionCache;
            this.roleValidation = this.securityConfig.rbacSecurity.roleValidation;
            
            console.log('RBAC configuration loaded successfully');
        } catch (error) {
            console.error('Failed to load RBAC configuration:', error);
            throw error;
        }
    }

    // Setup permission caching
    async setupPermissionCaching() {
        try {
            if (!this.cacheConfig.enabled) {
                console.log('Permission caching disabled');
                return;
            }

            // Create cache management functions
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION get_cached_permissions(user_id UUID, tenant_id UUID)
                RETURNS JSONB AS $$
                DECLARE
                    cache_key TEXT;
                    cached_permissions JSONB;
                    permissions JSONB;
                BEGIN
                    cache_key := 'user_permissions_' || user_id::text || '_' || tenant_id::text;
                    
                    -- Try to get from cache
                    SELECT value INTO cached_permissions 
                    FROM permission_cache 
                    WHERE cache_key = cache_key 
                    AND expires_at > NOW();
                    
                    IF cached_permissions IS NOT NULL THEN
                        RETURN cached_permissions;
                    END IF;
                    
                    -- Get permissions from database
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'permission_id', p.id,
                            'permission_name', p.name,
                            'resource', p.resource,
                            'action', p.action,
                            'role_level', r.level
                        )
                    ) INTO permissions
                    FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    JOIN role_permissions rp ON r.id = rp.role_id
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE ur.user_id = get_cached_permissions.user_id
                    AND ur.tenant_id = get_cached_permissions.tenant_id
                    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
                    AND r.status = 'active';
                    
                    -- Cache the permissions
                    INSERT INTO permission_cache (cache_key, value, expires_at)
                    VALUES (cache_key, COALESCE(permissions, '[]'::jsonb), NOW() + INTERVAL '${this.cacheConfig.ttl} seconds')
                    ON CONFLICT (cache_key) DO UPDATE SET
                        value = EXCLUDED.value,
                        expires_at = EXCLUDED.expires_at;
                    
                    RETURN COALESCE(permissions, '[]'::jsonb);
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            // Create cache cleanup function
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION cleanup_permission_cache()
                RETURNS INTEGER AS $$
                DECLARE
                    deleted_count INTEGER;
                BEGIN
                    DELETE FROM permission_cache WHERE expires_at <= NOW();
                    GET DIAGNOSTICS deleted_count = ROW_COUNT;
                    RETURN deleted_count;
                END;
                $$ LANGUAGE plpgsql;
            `;

            console.log('Permission caching setup completed');
        } catch (error) {
            console.error('Failed to setup permission caching:', error);
            throw error;
        }
    }

    // Setup role validation
    async setupRoleValidation() {
        try {
            // Create role validation function
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION validate_role_assignment(
                    user_id UUID, 
                    role_id UUID, 
                    tenant_id UUID
                ) RETURNS BOOLEAN AS $$
                DECLARE
                    user_tenant_id UUID;
                    role_tenant_id UUID;
                    role_level INTEGER;
                    current_roles_count INTEGER;
                    role_exists BOOLEAN;
                BEGIN
                    -- Validate user belongs to tenant
                    SELECT tenant_id INTO user_tenant_id
                    FROM users
                    WHERE id = validate_role_assignment.user_id;
                    
                    IF user_tenant_id != validate_role_assignment.tenant_id THEN
                        RAISE EXCEPTION 'User does not belong to specified tenant';
                    END IF;
                    
                    -- Validate role exists in tenant
                    SELECT id, level INTO role_tenant_id, role_level
                    FROM roles
                    WHERE id = validate_role_assignment.role_id 
                    AND tenant_id = validate_role_assignment.tenant_id;
                    
                    IF role_tenant_id IS NULL THEN
                        RAISE EXCEPTION 'Role does not exist in specified tenant';
                    END IF;
                    
                    -- Check role assignment limits
                    SELECT COUNT(*) INTO current_roles_count
                    FROM user_roles
                    WHERE user_id = validate_role_assignment.user_id
                    AND tenant_id = validate_role_assignment.tenant_id
                    AND (expires_at IS NULL OR expires_at > NOW());
                    
                    IF current_roles_count >= ${this.roleValidation.maxRolesPerUser} THEN
                        RAISE EXCEPTION 'User has reached maximum role limit';
                    END IF;
                    
                    -- Validate role hierarchy
                    IF role_level < 10 OR role_level > 100 THEN
                        RAISE EXCEPTION 'Invalid role level';
                    END IF;
                    
                    RETURN TRUE;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            // Create role expiration management
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION setup_role_expiration(
                    user_role_id UUID,
                    duration_days INTEGER DEFAULT ${this.roleValidation.defaultDuration}
                ) RETURNS TIMESTAMP WITH TIME ZONE AS $$
                DECLARE
                    expires_at TIMESTAMP WITH TIME ZONE;
                BEGIN
                    expires_at := NOW() + (duration_days || ' days')::INTERVAL;
                    
                    UPDATE user_roles
                    SET expires_at = expires_at
                    WHERE id = setup_role_expiration.user_role_id;
                    
                    RETURN expires_at;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            console.log('Role validation setup completed');
        } catch (error) {
            console.error('Failed to setup role validation:', error);
            throw error;
        }
    }

    // Create RBAC security policies
    async createRBACSecurityPolicies() {
        try {
            // Enable RLS on RBAC tables
            await this.supabaseClient.supabase.sql`
                ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
                ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
                ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
                ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
            `;

            // Create tenant role access policy
            await this.supabaseClient.supabase.sql`
                CREATE POLICY "tenant_role_access" ON roles
                FOR ALL USING (
                    tenant_id IN (
                        SELECT id FROM tenants 
                        WHERE subdomain = current_setting('app.current_tenant', true)
                    )
                );
            `;

            // Create user role policy
            await this.supabaseClient.supabase.sql`
                CREATE POLICY "tenant_user_role_access" ON user_roles
                FOR ALL USING (
                    tenant_id IN (
                        SELECT id FROM tenants 
                        WHERE subdomain = current_setting('app.current_tenant', true)
                    )
                );
            `;

            // Create permission policy
            await this.supabaseClient.supabase.sql`
                CREATE POLICY "tenant_permission_access" ON permissions
                FOR ALL USING (
                    tenant_id IN (
                        SELECT id FROM tenants 
                        WHERE subdomain = current_setting('app.current_tenant', true)
                    )
                );
            `;

            console.log('RBAC security policies created successfully');
        } catch (error) {
            console.error('Failed to create RBAC security policies:', error);
            throw error;
        }
    }

    // Create role management functions
    async createRoleManagementFunctions() {
        try {
            // Create dynamic role level function
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION get_role_levels()
                RETURNS JSONB AS $$
                BEGIN
                    RETURN jsonb_build_object(
                        'super_admin', 100,
                        'admin', 80,
                        'manager', 60,
                        'supervisor', 40,
                        'user', 20,
                        'viewer', 10
                    );
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            // Create role hierarchy validation
            await this.supabaseClient.supabase.sql`
                CREATE OR REPLACE FUNCTION validate_role_hierarchy(user_id UUID, required_level INTEGER)
                RETURNS BOOLEAN AS $$
                DECLARE
                    user_max_level INTEGER;
                BEGIN
                    SELECT MAX(r.level) INTO user_max_level
                    FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = validate_role_hierarchy.user_id
                    AND ur.tenant_id = get_current_tenant_id()
                    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
                    
                    RETURN COALESCE(user_max_level, 0) >= required_level;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            console.log('Role management functions created successfully');
        } catch (error) {
            console.error('Failed to create role management functions:', error);
            throw error;
        }
    }

    // Assign role to user with validation
    async assignRole(userId, roleId, tenantId, options = {}) {
        try {
            // Validate role assignment
            const { data, error } = await this.supabaseClient.supabase
                .rpc('validate_role_assignment', {
                    user_id: userId,
                    role_id: roleId,
                    tenant_id: tenantId
                });

            if (error) {
                throw new Error(`Role validation failed: ${error.message}`);
            }

            // Assign role
            const roleData = {
                user_id: userId,
                role_id: roleId,
                tenant_id: tenantId,
                created_by: options.createdBy,
                expires_at: options.expiresAt
            };

            const { data: assignment, error: assignmentError } = await this.supabaseClient.supabase
                .from('user_roles')
                .insert(roleData)
                .select()
                .single();

            if (assignmentError) {
                throw new Error(`Role assignment failed: ${assignmentError.message}`);
            }

            // Setup expiration if specified
            if (options.durationDays) {
                await this.supabaseClient.supabase
                    .rpc('setup_role_expiration', {
                        user_role_id: assignment.id,
                        duration_days: options.durationDays
                    });
            }

            // Clear cache for user
            await this.clearUserPermissionCache(userId, tenantId);

            console.log(`Role assigned successfully: user ${userId}, role ${roleId}, tenant ${tenantId}`);
            return assignment;
        } catch (error) {
            console.error('Failed to assign role:', error);
            throw error;
        }
    }

    // Remove role from user
    async removeRole(userId, roleId, tenantId) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('user_roles')
                .delete()
                .eq('user_id', userId)
                .eq('role_id', roleId)
                .eq('tenant_id', tenantId)
                .select()
                .single();

            if (error) {
                throw new Error(`Role removal failed: ${error.message}`);
            }

            // Clear cache for user
            await this.clearUserPermissionCache(userId, tenantId);

            console.log(`Role removed successfully: user ${userId}, role ${roleId}, tenant ${tenantId}`);
            return data;
        } catch (error) {
            console.error('Failed to remove role:', error);
            throw error;
        }
    }

    // Check user permission with caching
    async hasPermission(userId, permission, resource, tenantId) {
        try {
            const cacheKey = this.getCacheKey(userId, tenantId);
            
            // Check cache first
            let permissions = this.permissionCache.get(cacheKey);
            
            if (!permissions) {
                // Get from database
                const { data, error } = await this.supabaseClient.supabase
                    .rpc('get_cached_permissions', {
                        user_id: userId,
                        tenant_id: tenantId
                    });

                if (error) {
                    throw new Error(`Failed to get permissions: ${error.message}`);
                }

                permissions = data || [];
                
                // Cache the permissions
                this.permissionCache.set(cacheKey, permissions);
                
                // Set cache expiration
                setTimeout(() => {
                    this.permissionCache.delete(cacheKey);
                }, this.cacheConfig.ttl * 1000);
            }

            // Check if user has the specific permission
            const hasPermission = permissions.some(p => 
                p.permission_name === permission && 
                p.resource === resource
            );

            return hasPermission;
        } catch (error) {
            console.error('Failed to check permission:', error);
            return false;
        }
    }

    // Get user roles with caching
    async getUserRoles(userId, tenantId) {
        try {
            const cacheKey = `user_roles_${userId}_${tenantId}`;
            
            // Check cache first
            let roles = this.roleCache.get(cacheKey);
            
            if (!roles) {
                const { data, error } = await this.supabaseClient.supabase
                    .from('user_roles')
                    .select(`
                        id,
                        role_id,
                        expires_at,
                        created_at,
                        roles (
                            id,
                            name,
                            level,
                            description,
                            status
                        )
                    `)
                    .eq('user_id', userId)
                    .eq('tenant_id', tenantId)
                    .or('expires_at.is.null,expires_at.gt.now()');

                if (error) {
                    throw new Error(`Failed to get user roles: ${error.message}`);
                }

                roles = data || [];
                
                // Cache the roles
                this.roleCache.set(cacheKey, roles);
                
                // Set cache expiration
                setTimeout(() => {
                    this.roleCache.delete(cacheKey);
                }, this.cacheConfig.ttl * 1000);
            }

            return roles;
        } catch (error) {
            console.error('Failed to get user roles:', error);
            throw error;
        }
    }

    // Check role hierarchy
    async checkRoleHierarchy(userId, requiredLevel, tenantId) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .rpc('validate_role_hierarchy', {
                    user_id: userId,
                    required_level: requiredLevel
                });

            if (error) {
                throw new Error(`Hierarchy check failed: ${error.message}`);
            }

            return data || false;
        } catch (error) {
            console.error('Failed to check role hierarchy:', error);
            return false;
        }
    }

    // Get cache key
    getCacheKey(userId, tenantId) {
        return `user_permissions_${userId}_${tenantId}`;
    }

    // Clear user permission cache
    async clearUserPermissionCache(userId, tenantId) {
        try {
            const cacheKey = this.getCacheKey(userId, tenantId);
            
            // Clear in-memory cache
            this.permissionCache.delete(cacheKey);
            this.roleCache.delete(`user_roles_${userId}_${tenantId}`);
            
            // Clear database cache
            await this.supabaseClient.supabase
                .from('permission_cache')
                .delete()
                .eq('cache_key', cacheKey);

            console.log(`Permission cache cleared for user ${userId} in tenant ${tenantId}`);
        } catch (error) {
            console.error('Failed to clear permission cache:', error);
        }
    }

    // Cleanup expired permissions and cache
    async cleanupExpiredPermissions() {
        try {
            // Remove expired user roles
            const { data: expiredRoles } = await this.supabaseClient.supabase
                .from('user_roles')
                .delete()
                .lt('expires_at', new Date().toISOString())
                .select('user_id, tenant_id');

            // Clear cache for expired roles
            if (expiredRoles) {
                for (const role of expiredRoles) {
                    await this.clearUserPermissionCache(role.user_id, role.tenantId);
                }
            }

            // Cleanup permission cache
            const { data: cleanupResult } = await this.supabaseClient.supabase
                .rpc('cleanup_permission_cache');

            console.log(`Cleanup completed: ${expiredRoles?.length || 0} expired roles removed, ${cleanupResult || 0} cache entries cleared`);
            
            return {
                expiredRolesRemoved: expiredRoles?.length || 0,
                cacheEntriesCleared: cleanupResult || 0
            };
        } catch (error) {
            console.error('Failed to cleanup expired permissions:', error);
            throw error;
        }
    }

    // Get RBAC statistics
    async getRBACStats(tenantId = null) {
        try {
            let query = this.supabaseClient.supabase
                .from('user_roles')
                .select('user_id, tenant_id, role_id, expires_at');

            if (tenantId) {
                query = query.eq('tenant_id', tenantId);
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(`Failed to get RBAC stats: ${error.message}`);
            }

            const now = new Date();
            const stats = {
                totalRoleAssignments: data?.length || 0,
                activeRoleAssignments: 0,
                expiredRoleAssignments: 0,
                cacheSize: this.permissionCache.size,
                roleCacheSize: this.roleCache.size
            };

            if (data) {
                for (const role of data) {
                    if (role.expires_at && new Date(role.expires_at) < now) {
                        stats.expiredRoleAssignments++;
                    } else {
                        stats.activeRoleAssignments++;
                    }
                }
            }

            return stats;
        } catch (error) {
            console.error('Failed to get RBAC stats:', error);
            throw error;
        }
    }

    // Get system status
    getStatus() {
        return {
            initialized: this.isInitialized,
            cacheEnabled: this.cacheConfig.enabled,
            cacheSize: this.permissionCache.size,
            roleCacheSize: this.roleCache.size,
            cacheTTL: this.cacheConfig.ttl,
            maxRolesPerUser: this.roleValidation.maxRolesPerUser,
            roleValidationEnabled: !!this.roleValidation
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedRBACManager;
}
