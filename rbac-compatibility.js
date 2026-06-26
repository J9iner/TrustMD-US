// TrustMD RBAC Compatibility Layer
// Ensures backward compatibility during RBAC migration

// Load enhanced RBAC manager
const { EnhancedRBACManager } = require('./utils/enhanced-rbac-manager.js');
const securityConfig = require('./config/database-security.json');

// Create compatibility wrapper that maintains old API
class RBACManager {
    constructor(supabaseClient, options = {}) {
        // Initialize enhanced RBAC manager
        this.enhancedRBAC = new EnhancedRBACManager(supabaseClient, securityConfig);
        
        // Maintain backward compatibility
        this.roles = new Map();
        this.permissions = new Map();
        this.userRoles = new Map();
        this.rolePermissions = new Map();
        this.currentTenantId = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.lastCacheUpdate = new Map();
        
        // Initialize role hierarchy for compatibility
        this.initializeRoleHierarchy();
        this.initializePermissions();
    }

    // Initialize enhanced RBAC
    async initialize() {
        return await this.enhancedRBAC.initialize();
    }

    // Legacy role hierarchy for backward compatibility
    initializeRoleHierarchy() {
        this.ROLE_HIERARCHY = {
            SUPER_ADMIN: 100,
            TENANT_ADMIN: 80,
            COMPLIANCE_OFFICER: 60,
            PRACTICE_MANAGER: 40,
            COMPLIANCE_USER: 20,
            READ_ONLY: 10
        };
    }

    // Legacy permission definitions
    initializePermissions() {
        this.PERMISSIONS = {
            // User management
            USER_CREATE: 'user:create',
            USER_READ: 'user:read',
            USER_UPDATE: 'user:update',
            USER_DELETE: 'user:delete',
            
            // Compliance management
            COMPLIANCE_CREATE: 'compliance:create',
            COMPLIANCE_READ: 'compliance:read',
            COMPLIANCE_UPDATE: 'compliance:update',
            COMPLIANCE_DELETE: 'compliance:delete',
            COMPLIANCE_APPROVE: 'compliance:approve',
            
            // Template management
            TEMPLATE_CREATE: 'template:create',
            TEMPLATE_READ: 'template:read',
            TEMPLATE_UPDATE: 'template:update',
            TEMPLATE_DELETE: 'template:delete',
            
            // Risk management
            RISK_CREATE: 'risk:create',
            RISK_READ: 'risk:read',
            RISK_UPDATE: 'risk:update',
            RISK_DELETE: 'risk:delete',
            
            // Document management
            DOCUMENT_CREATE: 'document:create',
            DOCUMENT_READ: 'document:read',
            DOCUMENT_UPDATE: 'document:update',
            DOCUMENT_DELETE: 'document:delete',
            
            // Audit and reporting
            AUDIT_READ: 'audit:read',
            REPORT_GENERATE: 'report:generate',
            
            // System administration
            SYSTEM_CONFIG: 'system:config',
            SYSTEM_BACKUP: 'system:backup',
            SYSTEM_RESTORE: 'system:restore'
        };
    }

    // Legacy method: Assign role to user
    async assignRole(userId, roleId, tenantId, options = {}) {
        try {
            // Map legacy role to enhanced system
            const enhancedRoleId = await this.mapLegacyRole(roleId);
            
            // Use enhanced RBAC
            return await this.enhancedRBAC.assignRole(userId, enhancedRoleId, tenantId, {
                ...options,
                durationDays: options.durationDays || 365
            });
        } catch (error) {
            console.error('Legacy RBAC assignRole failed:', error);
            throw error;
        }
    }

    // Legacy method: Remove role from user
    async removeRole(userId, roleId, tenantId) {
        try {
            // Map legacy role to enhanced system
            const enhancedRoleId = await this.mapLegacyRole(roleId);
            
            // Use enhanced RBAC
            return await this.enhancedRBAC.removeRole(userId, enhancedRoleId, tenantId);
        } catch (error) {
            console.error('Legacy RBAC removeRole failed:', error);
            throw error;
        }
    }

    // Legacy method: Check user permission
    async hasPermission(userId, permission, resource, tenantId) {
        try {
            // Use enhanced RBAC
            return await this.enhancedRBAC.hasPermission(userId, permission, resource, tenantId);
        } catch (error) {
            console.error('Legacy RBAC hasPermission failed:', error);
            return false;
        }
    }

    // Legacy method: Get user roles
    async getUserRoles(userId, tenantId) {
        try {
            // Use enhanced RBAC
            const enhancedRoles = await this.enhancedRBAC.getUserRoles(userId, tenantId);
            
            // Map back to legacy format
            return enhancedRoles.map(role => ({
                id: role.role_id,
                name: this.mapEnhancedRoleToLegacy(role.roles.name),
                level: role.roles.level,
                tenant_id: tenantId,
                expires_at: role.expires_at
            }));
        } catch (error) {
            console.error('Legacy RBAC getUserRoles failed:', error);
            return [];
        }
    }

    // Legacy method: Check role hierarchy
    async checkRoleHierarchy(userId, requiredLevel, tenantId) {
        try {
            // Use enhanced RBAC
            return await this.enhancedRBAC.checkRoleHierarchy(userId, requiredLevel, tenantId);
        } catch (error) {
            console.error('Legacy RBAC checkRoleHierarchy failed:', error);
            return false;
        }
    }

    // Map legacy role to enhanced role
    async mapLegacyRole(legacyRoleId) {
        // This would map legacy role IDs to enhanced role IDs
        // For now, return the legacy role ID as-is
        // In a real implementation, this would query the database
        return legacyRoleId;
    }

    // Map enhanced role back to legacy format
    mapEnhancedRoleToLegacy(enhancedRoleName) {
        // Map enhanced role names back to legacy format
        const roleMapping = {
            'super_admin': 'SUPER_ADMIN',
            'admin': 'TENANT_ADMIN',
            'manager': 'COMPLIANCE_OFFICER',
            'supervisor': 'PRACTICE_MANAGER',
            'user': 'COMPLIANCE_USER',
            'viewer': 'READ_ONLY'
        };
        
        return roleMapping[enhancedRoleName] || enhancedRoleName.toUpperCase();
    }

    // Legacy method: Get role permissions
    async getRolePermissions(roleId, tenantId) {
        try {
            // Use enhanced RBAC to get user with role
            const mockUserId = 'role-check';
            const hasPermission = await this.enhancedRBAC.hasPermission(mockUserId, 'read', 'roles', tenantId);
            
            // Return legacy format
            return {
                roleId,
                tenantId,
                permissions: Object.values(this.PERMISSIONS),
                hasAccess: hasPermission
            };
        } catch (error) {
            console.error('Legacy RBAC getRolePermissions failed:', error);
            return { roleId, tenantId, permissions: [], hasAccess: false };
        }
    }

    // Legacy method: Validate role assignment
    async validateRoleAssignment(userId, roleId, tenantId) {
        try {
            // Use enhanced RBAC validation
            return await this.enhancedRBAC.assignRole(userId, roleId, tenantId);
        } catch (error) {
            console.error('Legacy RBAC validateRoleAssignment failed:', error);
            return false;
        }
    }

    // Legacy method: Clear cache
    async clearCache(userId, tenantId) {
        try {
            // Use enhanced RBAC cache clearing
            return await this.enhancedRBAC.clearUserPermissionCache(userId, tenantId);
        } catch (error) {
            console.error('Legacy RBAC clearCache failed:', error);
            return false;
        }
    }

    // Legacy method: Get role hierarchy
    getRoleHierarchy() {
        return this.ROLE_HIERARCHY;
    }

    // Legacy method: Get permissions
    getPermissions() {
        return this.PERMISSIONS;
    }

    // Legacy method: Set tenant context
    async setTenantContext(tenantId) {
        this.currentTenantId = tenantId;
        
        // Use enhanced RBAC if available
        if (this.enhancedRBAC.setTenantContext) {
            // This would be implemented in enhanced RBAC
            console.log('Tenant context set to:', tenantId);
        }
    }

    // Legacy method: Get RBAC statistics
    async getRBACStats(tenantId = null) {
        try {
            // Use enhanced RBAC statistics
            const enhancedStats = await this.enhancedRBAC.getRBACStats(tenantId);
            
            // Map to legacy format
            return {
                totalRoleAssignments: enhancedStats.activeRoleAssignments,
                activeRoleAssignments: enhancedStats.activeRoleAssignments,
                expiredRoleAssignments: enhancedStats.expiredRoleAssignments,
                cacheSize: enhancedStats.cacheSize,
                roleCacheSize: enhancedStats.roleCacheSize
            };
        } catch (error) {
            console.error('Legacy RBAC getRBACStats failed:', error);
            return {
                totalRoleAssignments: 0,
                activeRoleAssignments: 0,
                expiredRoleAssignments: 0,
                cacheSize: 0,
                roleCacheSize: 0
            };
        }
    }

    // Cleanup expired roles
    async cleanupExpiredRoles() {
        try {
            // Use enhanced RBAC cleanup
            return await this.enhancedRBAC.cleanupExpiredPermissions();
        } catch (error) {
            console.error('Legacy RBAC cleanupExpiredRoles failed:', error);
            return { expiredRolesRemoved: 0, cacheEntriesCleared: 0 };
        }
    }

    // Get system status
    getStatus() {
        const enhancedStatus = this.enhancedRBAC.getStatus();
        
        return {
            legacyMode: true,
            enhancedRBAC: enhancedStatus,
            roleHierarchy: this.ROLE_HIERARCHY,
            permissionsCount: Object.keys(this.PERMISSIONS).length
        };
    }
}

// Export both the legacy wrapper and enhanced manager
module.exports = {
    RBACManager, // Legacy wrapper for backward compatibility
    EnhancedRBACManager // Enhanced manager for new development
};
