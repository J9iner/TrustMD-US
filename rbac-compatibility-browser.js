/**
 * RBAC Compatibility for Browser
 * Role-Based Access Control utilities for frontend
 */

class RBACManager {
    constructor() {
        this.roles = {
            admin: { level: 100, permissions: ['*'] },
            compliance_officer: { level: 80, permissions: ['compliance.*', 'audit.*', 'reports.*'] },
            healthcare_provider: { level: 60, permissions: ['compliance.view', 'training.*', 'documents.*'] },
            staff: { level: 40, permissions: ['compliance.view', 'training.view', 'documents.view'] }
        };
        
        this.currentUser = null;
        this.currentTenant = null;
    }
    
    // Initialize with user data
    initialize(userData, tenantData) {
        this.currentUser = userData;
        this.currentTenant = tenantData;
        console.log('RBAC Manager initialized for user:', userData?.email);
    }
    
    // Check if user has permission
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        const userRole = this.roles[this.currentUser.role];
        if (!userRole) return false;
        
        // Wildcard permission
        if (userRole.permissions.includes('*')) return true;
        
        // Exact match
        if (userRole.permissions.includes(permission)) return true;
        
        // Wildcard sub-permissions
        const wildcardPerms = userRole.permissions.filter(p => p.endsWith('.*'));
        for (const wildcard of wildcardPerms) {
            const prefix = wildcard.slice(0, -2);
            if (permission.startsWith(prefix)) return true;
        }
        
        return false;
    }
    
    // Check if user can access resource
    canAccess(resource, action = 'view') {
        const permission = `${resource}.${action}`;
        return this.hasPermission(permission);
    }
    
    // Get user role level
    getRoleLevel() {
        if (!this.currentUser) return 0;
        return this.roles[this.currentUser.role]?.level || 0;
    }
    
    // Check if user has minimum role level
    hasMinimumLevel(minLevel) {
        return this.getRoleLevel() >= minLevel;
    }
    
    // Get all user permissions
    getUserPermissions() {
        if (!this.currentUser) return [];
        
        const userRole = this.roles[this.currentUser.role];
        if (!userRole) return [];
        
        return userRole.permissions;
    }
    
    // Filter data based on permissions
    filterData(data, resource) {
        if (!this.canAccess(resource, 'view')) {
            return [];
        }
        
        if (this.canAccess(resource, 'edit')) {
            return data; // Full access
        }
        
        // Return filtered data for view-only access
        return data.map(item => ({
            ...item,
            sensitiveFields: undefined
        }));
    }
}

// Export for global use
window.RBACManager = RBACManager;

// Module export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RBACManager;
}
