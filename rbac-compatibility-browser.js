// TrustMD RBAC Compatibility Layer - Browser Compatible
// Ensures backward compatibility during RBAC migration

// Browser-compatible RBAC Manager for testing
class RBACManager {
    constructor(supabaseClient, options = {}) {
        this.supabaseClient = supabaseClient;
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

    // Initialize role hierarchy
    async initialize() {
        console.log('RBAC Manager initialized (browser mode)');
        return true;
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
        console.log(`RBAC: Assigning role ${roleId} to user ${userId} in tenant ${tenantId}`);
        return { success: true, userId, roleId, tenantId };
    }

    // Legacy method: Remove role from user
    async removeRole(userId, roleId, tenantId) {
        console.log(`RBAC: Removing role ${roleId} from user ${userId} in tenant ${tenantId}`);
        return { success: true, userId, roleId, tenantId };
    }

    // Legacy method: Check user permission
    async hasPermission(userId, permission, resource, tenantId) {
        console.log(`RBAC: Checking permission ${permission} for user ${userId} on ${resource}`);
        // For testing, return true for basic permissions
        return true;
    }

    // Legacy method: Get user roles
    async getUserRoles(userId, tenantId) {
        console.log(`RBAC: Getting roles for user ${userId} in tenant ${tenantId}`);
        return [
            {
                id: 'role-1',
                name: 'COMPLIANCE_USER',
                level: 20,
                tenant_id: tenantId,
                expires_at: null
            }
        ];
    }

    // Legacy method: Check role hierarchy
    async checkRoleHierarchy(userId, requiredLevel, tenantId) {
        console.log(`RBAC: Checking role hierarchy for user ${userId}, required level ${requiredLevel}`);
        return true;
    }

    // Legacy method: Get role permissions
    async getRolePermissions(roleId, tenantId) {
        console.log(`RBAC: Getting permissions for role ${roleId} in tenant ${tenantId}`);
        return {
            roleId,
            tenantId,
            permissions: Object.values(this.PERMISSIONS),
            hasAccess: true
        };
    }

    // Legacy method: Validate role assignment
    async validateRoleAssignment(userId, roleId, tenantId) {
        console.log(`RBAC: Validating role assignment for user ${userId}, role ${roleId}, tenant ${tenantId}`);
        return true;
    }

    // Legacy method: Clear cache
    async clearCache(userId, tenantId) {
        console.log(`RBAC: Clearing cache for user ${userId} in tenant ${tenantId}`);
        return true;
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
        console.log(`RBAC: Tenant context set to: ${tenantId}`);
    }

    // Legacy method: Get RBAC statistics
    async getRBACStats(tenantId = null) {
        console.log(`RBAC: Getting stats for tenant ${tenantId}`);
        return {
            totalRoleAssignments: 10,
            activeRoleAssignments: 8,
            expiredRoleAssignments: 2,
            cacheSize: 5,
            roleCacheSize: 3
        };
    }

    // Cleanup expired roles
    async cleanupExpiredRoles() {
        console.log('RBAC: Cleaning up expired roles');
        return { expiredRolesRemoved: 2, cacheEntriesCleared: 5 };
    }

    // Get system status
    getStatus() {
        return {
            legacyMode: true,
            browserCompatible: true,
            roleHierarchy: this.ROLE_HIERARCHY,
            permissionsCount: Object.keys(this.PERMISSIONS).length,
            initialized: true
        };
    }
}

// Export for browser use
window.RBACManager = RBACManager;
