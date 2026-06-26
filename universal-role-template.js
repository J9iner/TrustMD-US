// TrustMD Universal Role Template
// Single customizable template for any role type

class UniversalRoleTemplate {
    constructor(rbacManager) {
        this.rbacManager = rbacManager;
    }
    
    // Create any role type with full customization
    async createCustomRole(roleConfig, tenantId) {
        try {
            const {
                name,
                description,
                roleType, // 'super_admin', 'tenant_admin', 'compliance_officer', 'practice_manager', 'compliance_user', 'read_only', or 'custom'
                customPermissions = [], // Override default permissions
                additionalPermissions = [], // Add to default permissions
                removePermissions = [], // Remove from default permissions
                expirationDays = null, // Auto-expiration
                restrictions = {} // Additional restrictions
            } = roleConfig;
            
            // Get base permissions for role type
            const basePermissions = this.getBasePermissions(roleType);
            
            // Apply customizations
            let finalPermissions = [...basePermissions];
            
            // Remove specified permissions
            if (removePermissions.length > 0) {
                finalPermissions = finalPermissions.filter(perm => !removePermissions.includes(perm));
            }
            
            // Add additional permissions
            if (additionalPermissions.length > 0) {
                finalPermissions.push(...additionalPermissions);
            }
            
            // Use custom permissions if provided (complete override)
            if (customPermissions.length > 0) {
                finalPermissions = [...customPermissions];
            }
            
            // Remove duplicates
            finalPermissions = [...new Set(finalPermissions)];
            
            // Calculate role level
            const roleLevel = this.getRoleLevel(roleType);
            
            // Create role data
            const roleData = {
                name,
                description,
                level: roleLevel,
                permissions: finalPermissions,
                role_type: roleType,
                is_custom: true,
                restrictions,
                created_from_template: 'universal_custom'
            };
            
            // Create role using RBAC manager
            const role = await this.rbacManager.createRole(roleData, tenantId);
            
            // Set expiration if specified
            if (expirationDays && roleType !== 'super_admin') {
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + expirationDays);
                
                await this.rbacManager.assignRole(
                    this.rbacManager.currentUserId, 
                    role.id, 
                    tenantId, 
                    'system', 
                    expiresAt.toISOString()
                );
            }
            
            // Log role creation
            await this.rbacManager.logRoleChange('create_custom', role.id, tenantId, {
                roleType,
                permissionsCount: finalPermissions.length,
                customizations: {
                    customPermissions: customPermissions.length,
                    additionalPermissions: additionalPermissions.length,
                    removedPermissions: removePermissions.length,
                    expirationDays
                },
                action: 'custom_role_created'
            });
            
            console.log(`Custom role "${name}" created with ${finalPermissions.length} permissions`);
            return { role, permissions: finalPermissions };
        } catch (error) {
            console.error('Error creating custom role:', error);
            throw error;
        }
    }
    
    // Get base permissions for role type
    getBasePermissions(roleType) {
        const permissionMaps = {
            super_admin: [
                // All permissions - complete system access
                ...Object.values(this.rbacManager.PERMISSIONS)
            ],
            
            tenant_admin: [
                // Organization management
                this.rbacManager.PERMISSIONS.USER_CREATE,
                this.rbacManager.PERMISSIONS.USER_READ,
                this.rbacManager.PERMISSIONS.USER_UPDATE,
                this.rbacManager.PERMISSIONS.USER_DELETE,
                this.rbacManager.PERMISSIONS.USER_ASSIGN_ROLES,
                this.rbacManager.PERMISSIONS.COMPLIANCE_CREATE,
                this.rbacManager.PERMISSIONS.COMPLIANCE_READ,
                this.rbacManager.PERMISSIONS.COMPLIANCE_UPDATE,
                this.rbacManager.PERMISSIONS.COMPLIANCE_DELETE,
                this.rbacManager.PERMISSIONS.RISK_CREATE,
                this.rbacManager.PERMISSIONS.RISK_READ,
                this.rbacManager.PERMISSIONS.RISK_UPDATE,
                this.rbacManager.PERMISSIONS.RISK_DELETE,
                this.rbacManager.PERMISSIONS.DOCUMENT_CREATE,
                this.rbacManager.PERMISSIONS.DOCUMENT_READ,
                this.rbacManager.PERMISSIONS.DOCUMENT_UPDATE,
                this.rbacManager.PERMISSIONS.DOCUMENT_DELETE,
                this.rbacManager.PERMISSIONS.ROLE_CREATE,
                this.rbacManager.PERMISSIONS.ROLE_READ,
                this.rbacManager.PERMISSIONS.ROLE_UPDATE,
                this.rbacManager.PERMISSIONS.SYSTEM_AUDIT,
                this.rbacManager.PERMISSIONS.SYSTEM_REPORTS
            ],
            
            compliance_officer: [
                // Compliance oversight
                this.rbacManager.PERMISSIONS.USER_READ,
                this.rbacManager.PERMISSIONS.COMPLIANCE_CREATE,
                this.rbacManager.PERMISSIONS.COMPLIANCE_READ,
                this.rbacManager.PERMISSIONS.COMPLIANCE_UPDATE,
                this.rbacManager.PERMISSIONS.COMPLIANCE_DELETE,
                this.rbacManager.PERMISSIONS.COMPLIANCE_APPROVE,
                this.rbacManager.PERMISSIONS.RISK_CREATE,
                this.rbacManager.PERMISSIONS.RISK_READ,
                this.rbacManager.PERMISSIONS.RISK_UPDATE,
                this.rbacManager.PERMISSIONS.RISK_DELETE,
                this.rbacManager.PERMISSIONS.DOCUMENT_CREATE,
                this.rbacManager.PERMISSIONS.DOCUMENT_READ,
                this.rbacManager.PERMISSIONS.DOCUMENT_UPDATE,
                this.rbacManager.PERMISSIONS.DOCUMENT_DELETE,
                this.rbacManager.PERMISSIONS.AUDIT_READ,
                this.rbacManager.PERMISSIONS.REPORT_GENERATE
            ],
            
            practice_manager: [
                // Department management
                this.rbacManager.PERMISSIONS.USER_READ,
                this.rbacManager.PERMISSIONS.USER_UPDATE,
                this.rbacManager.PERMISSIONS.COMPLIANCE_CREATE,
                this.rbacManager.PERMISSIONS.COMPLIANCE_READ,
                this.rbacManager.PERMISSIONS.COMPLIANCE_UPDATE,
                this.rbacManager.PERMISSIONS.RISK_CREATE,
                this.rbacManager.PERMISSIONS.RISK_READ,
                this.rbacManager.PERMISSIONS.RISK_UPDATE,
                this.rbacManager.PERMISSIONS.DOCUMENT_CREATE,
                this.rbacManager.PERMISSIONS.DOCUMENT_READ,
                this.rbacManager.PERMISSIONS.DOCUMENT_UPDATE,
                this.rbacManager.PERMISSIONS.REPORT_GENERATE
            ],
            
            compliance_user: [
                // Daily operations
                this.rbacManager.PERMISSIONS.COMPLIANCE_READ,
                this.rbacManager.PERMISSIONS.RISK_READ,
                this.rbacManager.PERMISSIONS.DOCUMENT_CREATE,
                this.rbacManager.PERMISSIONS.DOCUMENT_READ,
                this.rbacManager.PERMISSIONS.DOCUMENT_UPDATE
            ],
            
            read_only: [
                // View-only access
                this.rbacManager.PERMISSIONS.COMPLIANCE_READ,
                this.rbacManager.PERMISSIONS.RISK_READ,
                this.rbacManager.PERMISSIONS.DOCUMENT_READ
            ],
            
            custom: [] // Start with blank slate for completely custom roles
        };
        
        return permissionMaps[roleType] || [];
    }
    
    // Get role level for role type
    getRoleLevel(roleType) {
        const levelMap = {
            super_admin: this.rbacManager.ROLE_HIERARCHY.SUPER_ADMIN,
            tenant_admin: this.rbacManager.ROLE_HIERARCHY.TENANT_ADMIN,
            compliance_officer: this.rbacManager.ROLE_HIERARCHY.COMPLIANCE_OFFICER,
            practice_manager: this.rbacManager.ROLE_HIERARCHY.PRACTICE_MANAGER,
            compliance_user: this.rbacManager.ROLE_HIERARCHY.COMPLIANCE_USER,
            read_only: this.rbacManager.ROLE_HIERARCHY.READ_ONLY,
            custom: this.rbacManager.ROLE_HIERARCHY.COMPLIANCE_USER // Default to compliance user level
        };
        
        return levelMap[roleType] || this.rbacManager.ROLE_HIERARCHY.COMPLIANCE_USER;
    }
    
    // Get available role types
    getAvailableRoleTypes() {
        return [
            {
                type: 'super_admin',
                name: 'Super Admin',
                description: 'System-wide administrator with all permissions',
                level: this.rbacManager.ROLE_HIERARCHY.SUPER_ADMIN
            },
            {
                type: 'tenant_admin',
                name: 'Tenant Admin',
                description: 'Organization administrator with tenant-wide permissions',
                level: this.rbacManager.ROLE_HIERARCHY.TENANT_ADMIN
            },
            {
                type: 'compliance_officer',
                name: 'Compliance Officer',
                description: 'Compliance management with oversight permissions',
                level: this.rbacManager.ROLE_HIERARCHY.COMPLIANCE_OFFICER
            },
            {
                type: 'practice_manager',
                name: 'Practice Manager',
                description: 'Practice oversight with management permissions',
                level: this.rbacManager.ROLE_HIERARCHY.PRACTICE_MANAGER
            },
            {
                type: 'compliance_user',
                name: 'Compliance User',
                description: 'Basic compliance access for daily operations',
                level: this.rbacManager.ROLE_HIERARCHY.COMPLIANCE_USER
            },
            {
                type: 'read_only',
                name: 'Read Only',
                description: 'View-only access to compliance data',
                level: this.rbacManager.ROLE_HIERARCHY.READ_ONLY
            },
            {
                type: 'custom',
                name: 'Custom Role',
                description: 'Completely custom role configuration',
                level: this.rbacManager.ROLE_HIERARCHY.COMPLIANCE_USER
            }
        ];
    }
    
    // Get all available permissions for selection
    getAvailablePermissions() {
        return {
            user_management: [
                { key: 'user:create', name: 'Create Users', description: 'Create new user accounts' },
                { key: 'user:read', name: 'Read Users', description: 'View user information' },
                { key: 'user:update', name: 'Update Users', description: 'Modify user accounts' },
                { key: 'user:delete', name: 'Delete Users', description: 'Remove user accounts' },
                { key: 'user:assign_roles', name: 'Assign Roles', description: 'Assign roles to users' }
            ],
            compliance_management: [
                { key: 'compliance:create', name: 'Create Compliance', description: 'Create compliance records' },
                { key: 'compliance:read', name: 'Read Compliance', description: 'View compliance data' },
                { key: 'compliance:update', name: 'Update Compliance', description: 'Modify compliance records' },
                { key: 'compliance:delete', name: 'Delete Compliance', description: 'Remove compliance records' },
                { key: 'compliance:approve', name: 'Approve Compliance', description: 'Approve compliance actions' }
            ],
            risk_management: [
                { key: 'risk:create', name: 'Create Risks', description: 'Create risk assessments' },
                { key: 'risk:read', name: 'Read Risks', description: 'View risk data' },
                { key: 'risk:update', name: 'Update Risks', description: 'Modify risk assessments' },
                { key: 'risk:delete', name: 'Delete Risks', description: 'Remove risk records' }
            ],
            document_management: [
                { key: 'document:create', name: 'Create Documents', description: 'Create new documents' },
                { key: 'document:read', name: 'Read Documents', description: 'View documents' },
                { key: 'document:update', name: 'Update Documents', description: 'Modify documents' },
                { key: 'document:delete', name: 'Delete Documents', description: 'Remove documents' }
            ],
            system_administration: [
                { key: 'system:config', name: 'System Config', description: 'Configure system settings' },
                { key: 'system:audit', name: 'System Audit', description: 'View system audit logs' },
                { key: 'system:reports', name: 'System Reports', description: 'Generate system reports' },
                { key: 'system:backup', name: 'System Backup', description: 'Perform system backups' },
                { key: 'system:monitor', name: 'System Monitor', description: 'Monitor system performance' }
            ],
            audit_reporting: [
                { key: 'audit:read', name: 'Read Audit', description: 'View audit logs' },
                { key: 'audit:export', name: 'Export Audit', description: 'Export audit data' },
                { key: 'report:generate', name: 'Generate Reports', description: 'Generate compliance reports' }
            ]
        };
    }
    
    // Validate role configuration
    validateRoleConfig(roleConfig) {
        const errors = [];
        
        if (!roleConfig.name || roleConfig.name.trim() === '') {
            errors.push('Role name is required');
        }
        
        if (!roleConfig.roleType) {
            errors.push('Role type is required');
        }
        
        const validTypes = this.getAvailableRoleTypes().map(t => t.type);
        if (!validTypes.includes(roleConfig.roleType)) {
            errors.push(`Invalid role type. Must be one of: ${validTypes.join(', ')}`);
        }
        
        if (roleConfig.expirationDays && roleConfig.expirationDays < 1) {
            errors.push('Expiration days must be at least 1');
        }
        
        if (roleConfig.roleType === 'super_admin' && roleConfig.expirationDays) {
            errors.push('Super Admin roles cannot have expiration');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Export for use in backend
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalRoleTemplate;
} else {
    window.UniversalRoleTemplate = UniversalRoleTemplate;
}
