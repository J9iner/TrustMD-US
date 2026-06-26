-- TrustMD RBAC & Multi-Tenant Database Schema
-- Adds tables for role-based access control, tenant management, and audit logging

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_templates ENABLE ROW LEVEL SECURITY;

-- Create RBAC tables
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    level INTEGER NOT NULL CHECK (level >= 0 AND level <= 100),
    permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tenant_id, role_id)
);

-- Create tenant management table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'professional' CHECK (plan IN ('basic', 'professional', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create audit logging table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource TEXT,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'authentication', 'authorization', 'compliance', 'security', 'system')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create security alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Create password resets table
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create account locks table
CREATE TABLE IF NOT EXISTS account_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    reason TEXT NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_unlock BOOLEAN DEFAULT TRUE,
    unlocked_at TIMESTAMP WITH TIME ZONE
);

-- Create compliance templates table
CREATE TABLE IF NOT EXISTS compliance_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    requirements TEXT[] DEFAULT '{}',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update user_profiles table with new fields
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_tenant_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS force_password_reset BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update user_profiles status constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_status_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_status_check 
    CHECK (status IN ('active', 'pending', 'inactive', 'deleted'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_tenant ON user_roles(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_timestamp ON audit_logs(tenant_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_alerts_tenant_status ON security_alerts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_account_locks_email ON account_locks(email);

-- Row Level Security Policies

-- Policy: Users can only access their own tenant's data
CREATE POLICY tenant_isolation ON user_profiles
    FOR ALL TO authenticated_users
    USING (tenant_id = current_setting('tenant_id'))
    WITH CHECK (auth.uid() = current_setting('user_id'));

-- Policy: Users can only access compliance data for their tenant
CREATE POLICY compliance_tenant_isolation ON user_compliance
    FOR ALL TO authenticated_users
    USING (tenant_id = current_setting('tenant_id'))
    WITH CHECK (auth.uid() = current_setting('user_id'));

-- Policy: Users can only access risk assessments for their tenant
CREATE POLICY risk_tenant_isolation ON risk_assessments
    FOR ALL TO authenticated_users
    USING (tenant_id = current_setting('tenant_id'))
    WITH CHECK (auth.uid() = current_setting('user_id'));

-- Policy: Users can only access documents for their tenant
CREATE POLICY document_tenant_isolation ON documents
    FOR ALL TO authenticated_users
    USING (tenant_id = current_setting('tenant_id'))
    WITH CHECK (auth.uid() = current_setting('user_id'));

-- Policy: Users can only access notifications for their tenant
CREATE POLICY notification_tenant_isolation ON notifications
    FOR ALL TO authenticated_users
    USING (tenant_id = current_setting('tenant_id'))
    WITH CHECK (auth.uid() = current_setting('user_id'));

-- Policy: Only tenant admins can manage roles
CREATE POLICY role_management ON roles
    FOR ALL TO authenticated_users
    USING (
        tenant_id = current_setting('tenant_id')
        AND EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.tenant_id = current_setting('tenant_id')
            AND r.level >= 80
        )
    );

-- Policy: Only tenant admins can manage tenant settings
CREATE POLICY tenant_management ON tenants
    FOR ALL TO authenticated_users
    USING (
        tenant_id = current_setting('tenant_id')
        AND EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.tenant_id = current_setting('tenant_id')
            AND r.level >= 80
        )
    );

-- Policy: Only tenant admins can delete tenants
CREATE POLICY tenant_deletion ON tenants
    FOR DELETE
    TO authenticated_users
    USING (
        tenant_id = current_setting('tenant_id')
        AND EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.tenant_id = current_setting('tenant_id')
            AND r.level >= 80
        )
    );

-- Policy: Users can only read audit logs for their tenant
CREATE POLICY audit_log_access ON audit_logs
    FOR SELECT
    TO authenticated_users
    USING (tenant_id = current_setting('tenant_id'))
    WITH CHECK (auth.uid() = current_setting('user_id'));

-- Policy: Only tenant admins can access security alerts
CREATE POLICY security_alert_access ON security_alerts
    FOR ALL TO authenticated_users
    USING (
        tenant_id = current_setting('tenant_id')
        AND EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.tenant_id = current_setting('tenant_id')
            AND r.level >= 80
        )
    );

-- Function to get current tenant setting
CREATE OR REPLACE FUNCTION current_setting(setting_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN current_setting(setting_name);
END;
$$;

-- Set session context for RLS
-- This would typically be set by middleware during request processing
-- Example: SET current_setting('tenant_id', 'tenant-uuid-here');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated_users;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated_users;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated_users;

-- Create views for common queries
CREATE OR REPLACE VIEW user_roles_details AS
SELECT 
    ur.id,
    ur.user_id,
    ur.tenant_id,
    ur.role_id,
    ur.assigned_at,
    r.name as role_name,
    r.description as role_description,
    r.level as role_level,
    r.permissions as role_permissions,
    ua.email as assigned_by_email,
    ua.name as assigned_by_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN auth.users ua ON ur.assigned_by = ua.id;

CREATE OR REPLACE VIEW tenant_users_summary AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.subdomain,
    t.plan,
    t.status,
    COUNT(up.id) as total_users,
    COUNT(CASE WHEN up.status = 'active' THEN 1 END) as active_users,
    COUNT(CASE WHEN up.status = 'pending' THEN 1 END) as pending_users,
    COUNT(CASE WHEN up.is_tenant_admin = TRUE THEN 1 END) as admin_users,
    MAX(up.created_at) as last_user_created
FROM tenants t
LEFT JOIN user_profiles up ON t.id = up.tenant_id
WHERE t.status != 'deleted'
GROUP BY t.id, t.name, t.subdomain, t.plan, t.status;

-- Insert default roles for new tenants
INSERT INTO roles (tenant_id, name, description, level, permissions) VALUES
    ('00000000-0000-0000-0000-000000000000', 'Super Admin', 'System-wide administrator with all permissions', 100, ARRAY['user:create', 'user:read', 'user:update', 'user:delete', 'user:assign_roles', 'compliance:create', 'compliance:read', 'compliance:update', 'compliance:delete', 'compliance:approve', 'risk:create', 'risk:read', 'risk:update', 'risk:delete', 'risk:assess', 'document:create', 'document:read', 'document:update', 'document:delete', 'document:approve', 'tenant:create', 'tenant:read', 'tenant:update', 'tenant:configure', 'role:create', 'role:read', 'role:update', 'role:delete', 'role:assign_permissions', 'system:config', 'system:audit', 'system:reports', 'system:backup', 'system:monitor']),
    ('00000000-0000-0000-0000-000000000000', 'Tenant Admin', 'Organization administrator with tenant-wide permissions', 80, ARRAY['user:create', 'user:read', 'user:update', 'user:assign_roles', 'compliance:create', 'compliance:read', 'compliance:update', 'compliance:delete', 'compliance:approve', 'risk:create', 'risk:read', 'risk:update', 'risk:delete', 'risk:assess', 'document:create', 'document:read', 'document:update', 'document:delete', 'document:approve', 'role:create', 'role:read', 'role:update', 'system:audit', 'system:reports']),
    ('00000000-0000-0000-0000-000000000000', 'Compliance Officer', 'Compliance management with oversight permissions', 60, ARRAY['user:read', 'compliance:create', 'compliance:read', 'compliance:update', 'compliance:approve', 'risk:create', 'risk:read', 'risk:update', 'risk:assess', 'document:create', 'document:read', 'document:update', 'document:approve']),
    ('00000000-0000-0000-0000-000000000000', 'Practice Manager', 'Practice oversight with management permissions', 40, ARRAY['user:read', 'compliance:read', 'compliance:update', 'risk:read', 'risk:update', 'document:read', 'document:update']),
    ('00000000-0000-0000-0000-000000000000', 'Compliance User', 'Basic compliance access with view/edit permissions', 20, ARRAY['compliance:read', 'compliance:update', 'risk:read', 'document:read', 'document:update']),
    ('00000000-0000-0000-0000-000000000000', 'Read Only', 'View-only access to compliance data', 10, ARRAY['compliance:read', 'risk:read', 'document:read'])
ON CONFLICT DO NOTHING;
