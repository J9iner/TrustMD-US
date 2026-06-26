# TrustMD Role-Based Access Control (RBAC) Documentation

## 🎯 **Role Hierarchy Overview**

TrustMD implements a **hierarchical role-based access control system** with **6 primary roles** plus **custom role templates** for flexible access management.

---

## 📊 **Role Summary**

| Role | Level | Primary Purpose | Permission Count |
|-------|--------|----------------|------------------|
| Super Admin | 100 | System-wide administration | All permissions |
| Tenant Admin | 80 | Organization management | 25+ permissions |
| Compliance Officer | 60 | Compliance oversight | 20+ permissions |
| Practice Manager | 40 | Practice management | 18+ permissions |
| Compliance User | 20 | Daily operations | 12+ permissions |
| Read Only | 10 | View-only access | 9+ permissions |

**Total Standard Roles**: **6**  
**Custom Templates**: **Unlimited** (database-driven)

---

## 🔴 **Super Admin (Level 100)**

### **Purpose**
System-wide administrator with complete control over the entire TrustMD platform.

### **Key Responsibilities**
- System configuration and maintenance
- Tenant management and creation
- Global user administration
- System monitoring and backups
- Platform-wide security oversight

### **Permissions**
```javascript
// Inherits ALL permissions from lower roles + additional system permissions
{
  // User Management
  'user:create', 'user:read', 'user:update', 'user:delete', 'user:assign_roles',
  
  // Compliance Management  
  'compliance:create', 'compliance:read', 'compliance:update', 'compliance:delete', 'compliance:approve',
  
  // Risk Management
  'risk:create', 'risk:read', 'risk:update', 'risk:delete',
  
  // Document Management
  'document:create', 'document:read', 'document:update', 'document:delete',
  
  // Role Management
  'role:create', 'role:read', 'role:update', 'role:delete', 'role:assign_permissions',
  
  // System Administration
  'system:config', 'system:audit', 'system:reports', 'system:backup', 'system:monitor',
  
  // PHI Management
  'phi:read', 'phi:write', 'phi:delete', 'phi:export', 'phi:quarantine',
  
  // Audit and Reporting
  'audit:read', 'audit:export', 'report:generate'
}
```

### **Access Scope**
- **All Tenants**: Full access to all organizations
- **All Data**: Complete access to all system data
- **All Functions**: Every system feature available

---

## 🟡 **Tenant Admin (Level 80)**

### **Purpose**
Organization-level administrator with comprehensive management capabilities within their tenant.

### **Key Responsibilities**
- User management within organization
- Role assignment and permission management
- Compliance oversight for organization
- Document and risk management
- Organization-level reporting

### **Permissions**
```javascript
// Inherits from Compliance Officer, Practice Manager, Compliance User, Read Only + additional
{
  // User Management (tenant-scoped)
  'user:create', 'user:read', 'user:update', 'user:delete', 'user:assign_roles',
  
  // Compliance Management (tenant-scoped)
  'compliance:create', 'compliance:read', 'compliance:update', 'compliance:delete',
  
  // Risk Management (tenant-scoped)
  'risk:create', 'risk:read', 'risk:update', 'risk:delete',
  
  // Document Management (tenant-scoped)
  'document:create', 'document:read', 'document:update', 'document:delete',
  
  // Role Management (tenant-scoped)
  'role:create', 'role:read', 'role:update',
  
  // System Administration (limited)
  'system:audit', 'system:reports'
}
```

### **Access Scope**
- **Single Tenant**: Full access to their organization only
- **Organization Data**: All data within their tenant
- **Management Functions**: All organizational management features

---

## 🟠 **Compliance Officer (Level 60)**

### **Purpose**
Compliance management professional with oversight responsibilities and approval authority.

### **Key Responsibilities**
- Compliance program management
- Risk assessment oversight
- Document compliance review
- Compliance reporting and analytics
- Training and policy management

### **Permissions**
```javascript
// Inherits from Practice Manager, Compliance User, Read Only + additional
{
  // User Management (read-only)
  'user:read',
  
  // Compliance Management (full)
  'compliance:create', 'compliance:read', 'compliance:update', 'compliance:delete', 'compliance:approve',
  
  // Risk Management (full)
  'risk:create', 'risk:read', 'risk:update', 'risk:delete',
  
  // Document Management (full)
  'document:create', 'document:read', 'document:update', 'document:delete',
  
  // Audit and Reporting
  'audit:read', 'audit:export', 'report:generate'
}
```

### **Access Scope**
- **Single Tenant**: Organization-wide compliance access
- **Compliance Data**: All compliance-related information
- **Oversight Functions**: Review, approve, and report capabilities

---

## 🟢 **Practice Manager (Level 40)**

### **Purpose**
Practice or department manager with oversight responsibilities for their area.

### **Key Responsibilities**
- Department user management
- Daily compliance operations
- Risk assessment and mitigation
- Document management for practice
- Performance reporting

### **Permissions**
```javascript
// Inherits from Compliance User, Read Only + additional
{
  // User Management (limited)
  'user:read', 'user:update',
  
  // Compliance Management (full)
  'compliance:create', 'compliance:read', 'compliance:update',
  
  // Risk Management (full)
  'risk:create', 'risk:read', 'risk:update',
  
  // Document Management (full)
  'document:create', 'document:read', 'document:update', 'document:delete',
  
  // Reporting
  'report:generate'
}
```

### **Access Scope**
- **Single Tenant**: Department or practice level access
- **Department Data**: Information within their area of responsibility
- **Management Functions**: Day-to-day operational management

---

## 🔵 **Compliance User (Level 20)**

### **Purpose**
Standard compliance user performing daily compliance operations.

### **Key Responsibilities**
- Daily compliance tasks
- Document creation and management
- Risk assessment participation
- Basic reporting functions
- Training completion tracking

### **Permissions**
```javascript
// Inherits from Read Only + additional
{
  // Compliance Management (operational)
  'compliance:create', 'compliance:read', 'compliance:update',
  
  // Risk Management (operational)
  'risk:create', 'risk:read', 'risk:update',
  
  // Document Management (operational)
  'document:create', 'document:read', 'document:update', 'document:delete'
}
```

### **Access Scope**
- **Single Tenant**: Individual user access within organization
- **Operational Data**: Information needed for daily tasks
- **Basic Functions**: Core compliance operations

---

## ⚪ **Read Only (Level 10)**

### **Purpose**
View-only access for auditors, contractors, or temporary users.

### **Key Responsibilities**
- Review compliance information
- Generate basic reports
- Monitor compliance status
- Temporary access for specific needs

### **Permissions**
```javascript
{
  // Read-only access to core areas
  'compliance:read',
  'risk:read', 
  'document:read'
}
```

### **Access Scope**
- **Single Tenant**: Limited to specific areas as assigned
- **View-Only Data**: No modification capabilities
- **Monitoring Functions**: Review and reporting only

---

## 🎨 **Custom Role Templates**

### **Template Categories**

#### **Compliance Templates**
- **Basic Compliance User**: Standard compliance operations
- **Auditor Template**: Read-only access with reporting
- **Compliance Manager**: Enhanced compliance oversight

#### **Management Templates**
- **Department Manager**: Department-level oversight
- **Team Lead**: Team management capabilities
- **Project Manager**: Project-specific access

#### **Temporary Templates**
- **Temporary Access**: Time-limited (24 hours default)
- **Contractor Access**: Limited scope for external users
- **Training Access**: Educational purposes only

#### **Specialized Templates**
- **IT Support**: Technical administration
- **HR Manager**: Human resources functions
- **Legal Counsel**: Legal compliance access

### **Template Features**
```javascript
// Example: Creating a role from template
const customRole = await roleTemplates.createRoleFromTemplate(templateId, tenantId, {
  name: 'Custom Department Manager',
  description: 'Manager for specific department with custom permissions',
  permissions: ['user:read', 'user:update', 'compliance:create', 'compliance:read'],
  expiresAt: '2024-12-31T23:59:59Z' // Optional expiration
});
```

---

## 🔄 **Permission Inheritance**

### **Hierarchy Flow**
```
Super Admin (100)
    ↓ Inherits all from below
Tenant Admin (80) 
    ↓ Inherits all from below
Compliance Officer (60)
    ↓ Inherits all from below  
Practice Manager (40)
    ↓ Inherits all from below
Compliance User (20)
    ↓ Inherits all from below
Read Only (10)
```

### **Inheritance Rules**
1. **Higher levels** inherit ALL permissions from lower levels
2. **Additional permissions** can be added at each level
3. **Permission groups** are inherited automatically
4. **Custom roles** can inherit from any standard role
5. **Template-based roles** follow inheritance rules

---

## ⏰ **Role Expiration**

### **Time-Based Access Control**
```javascript
// Assign role with expiration
await rbacManager.assignRole(userId, roleId, tenantId, assignedBy, {
  expiresAt: '2024-12-31T23:59:59Z' // 30 days from now
});

// Automatic cleanup runs daily
await rbacManager.cleanupExpiredRoles();
```

### **Expiration Features**
- **Automatic Deactivation**: Expired roles deactivated automatically
- **Grace Period**: Configurable warning before expiration
- **Renewal Process**: Easy role renewal with audit trail
- **Temporary Access**: Perfect for contractors and temporary staff

---

## 📊 **Permission Groups**

### **User Management Group**
- `user:create`, `user:read`, `user:update`, `user:delete`, `user:assign_roles`

### **Compliance Management Group**  
- `compliance:create`, `compliance:read`, `compliance:update`, `compliance:delete`, `compliance:approve`

### **Risk Management Group**
- `risk:create`, `risk:read`, `risk:update`, `risk:delete`

### **Document Management Group**
- `document:create`, `document:read`, `document:update`, `document:delete`

### **System Administration Group**
- `system:config`, `system:audit`, `system:reports`, `system:backup`, `system:monitor`

### **PHI Management Group**
- `phi:read`, `phi:write`, `phi:delete`, `phi:export`, `phi:quarantine`

### **Audit & Reporting Group**
- `audit:read`, `audit:export`, `report:generate`

---

## 🛡️ **Security Features**

### **Access Control**
- **Multi-tenant isolation** - Strict data separation
- **Role-based permissions** - Granular access control
- **Time-based expiration** - Automatic access revocation
- **Audit logging** - Complete access trail

### **Permission Validation**
- **Hierarchical inheritance** - Automatic permission resolution
- **Cross-tenant blocking** - Prevents data leakage
- **Real-time validation** - Immediate permission checks
- **Cache optimization** - High-performance validation

### **Compliance Features**
- **HIPAA compliance** - PHI protection and access controls
- **SOC2 compliance** - Audit trails and security monitoring
- **GDPR compliance** - Data protection and access logging
- **Industry standards** - Healthcare compliance best practices

---

## 🚀 **Implementation Summary**

### **Total Roles Available**
- **Standard Roles**: 6 (hierarchical)
- **Template Categories**: 4 (compliance, management, temporary, specialized)
- **Custom Templates**: Unlimited (database-driven)
- **Permission Groups**: 7 (categorized access)

### **Key Capabilities**
- **Hierarchical permissions** with automatic inheritance
- **Time-based access** with automatic expiration
- **Multi-tenant isolation** with strict boundaries
- **Template-driven provisioning** for rapid deployment
- **Comprehensive auditing** for all access changes
- **Performance optimization** with intelligent caching

**TrustMD RBAC provides enterprise-grade access control with flexibility, security, and compliance built-in.** 🎯
