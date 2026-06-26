-- Cross-Reference Checking Tables (NEW)
CREATE TABLE cross_reference_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    source_document_type VARCHAR(100) NOT NULL,
    target_document_type VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
        'timeline_consistency', 'policy_alignment', 'documentation_completeness', 
        'regulatory_hierarchy', 'dependency_validation'
    )),
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    validation_logic JSONB NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT cross_reference_rules_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(tenant_id, source_document_type, target_document_type, rule_type)
);

CREATE TABLE document_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    source_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    target_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN (
        'depends_on', 'conflicts_with', 'supersedes', 'complements', 'requires'
    )),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT document_relationships_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(source_document_id, target_document_id, relationship_type)
);

CREATE TABLE consistency_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    check_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    issues_found INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,
    high_issues INTEGER DEFAULT 0,
    medium_issues INTEGER DEFAULT 0,
    low_issues INTEGER DEFAULT 0,
    documents_checked INTEGER DEFAULT 0,
    relationships_validated INTEGER DEFAULT 0,
    check_duration_ms INTEGER,
    recommendations JSONB,
    detailed_results JSONB,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    
    CONSTRAINT consistency_checks_tenant_check CHECK (tenant_id IS NOT NULL)
);

CREATE TABLE consistency_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    check_id UUID REFERENCES consistency_checks(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES cross_reference_rules(id) ON DELETE CASCADE,
    source_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    target_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN (
        'contradiction', 'missing_dependency', 'timeline_conflict', 
        'policy_misalignment', 'incomplete_documentation', 'regulatory_violation'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT,
    estimated_risk_score INTEGER CHECK (estimated_risk_score >= 0 AND estimated_risk_score <= 100),
    estimated_penalty_amount DECIMAL(10,2),
    resolution_status VARCHAR(20) DEFAULT 'open' CHECK (resolution_status IN ('open', 'in_progress', 'resolved', 'deferred')),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT consistency_issues_tenant_check CHECK (tenant_id IS NOT NULL)
);

CREATE TABLE validation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    check_id UUID REFERENCES consistency_checks(id) ON DELETE CASCADE,
    validation_type VARCHAR(50) NOT NULL,
    result VARCHAR(20) NOT NULL CHECK (result IN ('passed', 'failed', 'warning', 'skipped')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    issues_detected INTEGER DEFAULT 0,
    validation_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT validation_history_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Indexes for Cross-Reference Checking Performance
CREATE INDEX idx_cross_reference_rules_tenant_type ON cross_reference_rules(tenant_id, rule_type);
CREATE INDEX idx_document_relationships_source ON document_relationships(source_document_id);
CREATE INDEX idx_document_relationships_target ON document_relationships(target_document_id);
CREATE INDEX idx_consistency_checks_tenant_date ON consistency_checks(tenant_id, check_date DESC);
CREATE INDEX idx_consistency_issues_severity ON consistency_issues(tenant_id, severity, resolution_status);
CREATE INDEX idx_validation_history_document ON validation_history(document_id, created_at DESC);

-- Row Level Security for Cross-Reference Tables
ALTER TABLE cross_reference_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE consistency_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE consistency_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Cross-Reference Tables
CREATE POLICY "Users can view their tenant's cross-reference rules" ON cross_reference_rules
    FOR SELECT USING (auth.uid() IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "Admins can manage cross-reference rules" ON cross_reference_rules
    FOR ALL USING (
        auth.uid() IS NOT NULL AND 
        tenant_id = current_setting('app.current_tenant_id')::UUID AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND tenant_id = current_setting('app.current_tenant_id')::UUID
            AND role IN ('admin', 'compliance_officer')
        )
    );

CREATE POLICY "Users can view their tenant's document relationships" ON document_relationships
    FOR SELECT USING (auth.uid() IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "Admins can manage document relationships" ON document_relationships
    FOR ALL USING (
        auth.uid() IS NOT NULL AND 
        tenant_id = current_setting('app.current_tenant_id')::UUID AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND tenant_id = current_setting('app.current_tenant_id')::UUID
            AND role IN ('admin', 'compliance_officer')
        )
    );

CREATE POLICY "Users can view their tenant's consistency checks" ON consistency_checks
    FOR SELECT USING (auth.uid() IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "Admins can manage consistency checks" ON consistency_checks
    FOR ALL USING (
        auth.uid() IS NOT NULL AND 
        tenant_id = current_setting('app.current_tenant_id')::UUID AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND tenant_id = current_setting('app.current_tenant_id')::UUID
            AND role IN ('admin', 'compliance_officer')
        )
    );

CREATE POLICY "Users can view their tenant's consistency issues" ON consistency_issues
    FOR SELECT USING (auth.uid() IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "Admins can manage consistency issues" ON consistency_issues
    FOR ALL USING (
        auth.uid() IS NOT NULL AND 
        tenant_id = current_setting('app.current_tenant_id')::UUID AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND tenant_id = current_setting('app.current_tenant_id')::UUID
            AND role IN ('admin', 'compliance_officer')
        )
    );

CREATE POLICY "Users can view their tenant's validation history" ON validation_history
    FOR SELECT USING (auth.uid() IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "System can manage validation history" ON validation_history
    FOR ALL USING (auth.uid() IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Functions for Cross-Reference Checking
CREATE OR REPLACE FUNCTION trigger_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for timestamp updates
CREATE TRIGGER update_cross_reference_rules_timestamp
    BEFORE UPDATE ON cross_reference_rules
    FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();

CREATE TRIGGER update_document_relationships_timestamp
    BEFORE UPDATE ON document_relationships
    FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();

-- Function to calculate consistency score
CREATE OR REPLACE FUNCTION calculate_consistency_score(
    p_tenant_id UUID,
    p_check_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    total_issues INTEGER;
    critical_weight INTEGER := 40;
    high_weight INTEGER := 25;
    medium_weight INTEGER := 20;
    low_weight INTEGER := 15;
    weighted_sum INTEGER := 0;
    max_possible_score INTEGER := 100;
BEGIN
    -- Count issues by severity for this check or latest check
    SELECT 
        COALESCE(SUM(CASE WHEN severity = 'critical' THEN critical_weight
                    WHEN severity = 'high' THEN high_weight
                    WHEN severity = 'medium' THEN medium_weight
                    WHEN severity = 'low' THEN low_weight
                    ELSE 0 END), 0)
    INTO weighted_sum
    FROM consistency_issues 
    WHERE tenant_id = p_tenant_id 
    AND (p_check_id IS NULL OR check_id = p_check_id)
    AND resolution_status != 'resolved';
    
    -- Calculate score (100 - weighted penalty)
    RETURN GREATEST(0, max_possible_score - weighted_sum);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get consistency summary
CREATE OR REPLACE FUNCTION get_consistency_summary(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    summary JSONB;
    latest_check UUID;
BEGIN
    -- Get the most recent consistency check
    SELECT id INTO latest_check
    FROM consistency_checks 
    WHERE tenant_id = p_tenant_id 
    ORDER BY check_date DESC 
    LIMIT 1;
    
    -- Build summary
    SELECT jsonb_build_object(
        'latest_check_id', latest_check,
        'overall_score', COALESCE(consistency_checks.overall_score, 0),
        'issues_found', COALESCE(consistency_checks.issues_found, 0),
        'critical_issues', COALESCE(consistency_checks.critical_issues, 0),
        'check_date', COALESCE(consistency_checks.check_date, NOW()),
        'trend', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'date', check_date,
                    'score', overall_score,
                    'issues', issues_found
                ) ORDER BY check_date
            ) FROM consistency_checks 
            WHERE tenant_id = p_tenant_id 
            AND check_date >= NOW() - INTERVAL '90 days'
        )
    ) INTO summary
    FROM consistency_checks 
    WHERE id = latest_check;
    
    RETURN COALESCE(summary, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON cross_reference_rules TO authenticated;
GRANT ALL ON document_relationships TO authenticated;
GRANT ALL ON consistency_checks TO authenticated;
GRANT ALL ON consistency_issues TO authenticated;
GRANT ALL ON validation_history TO authenticated;

GRANT EXECUTE ON FUNCTION calculate_consistency_score TO authenticated;
GRANT EXECUTE ON FUNCTION get_consistency_summary TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_update_timestamp TO authenticated;

-- TrustMD Risk Compliance Schema for Supabase
-- Multi-tenant ready - supports multiple medical practices

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tenants table (NEW - for multi-tenant support)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    practice_name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    subscription_plan VARCHAR(50) DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'professional', 'enterprise')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Users table (UPDATED - added tenant_id)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NEW: Tenant reference
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'compliance_officer', 'healthcare_provider', 'staff')),
    practice_name VARCHAR(255),
    practice_type VARCHAR(100),
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    -- Ensure user belongs to a tenant
    CONSTRAINT users_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(tenant_id, email) -- Email uniqueness per tenant
);

-- Compliance categories (UPDATED - added tenant_id)
CREATE TABLE compliance_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NEW: Tenant reference
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- hex color
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure category belongs to a tenant
    CONSTRAINT categories_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(tenant_id, name) -- Name uniqueness per tenant
);

-- Compliance requirements (UPDATED - added tenant_id)
CREATE TABLE compliance_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NEW: Tenant reference
    category_id UUID REFERENCES compliance_categories(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirement_type VARCHAR(50) CHECK (requirement_type IN ('checklist', 'document', 'training', 'audit', 'policy')),
    frequency VARCHAR(50) CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually', 'onetime')),
    due_frequency INTEGER DEFAULT 1, -- number of days/weeks/months
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    penalty_amount DECIMAL(10,2), -- potential penalty for non-compliance
    regulatory_reference VARCHAR(255), -- e.g., "HIPAA 164.308(a)(1)"
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure requirement belongs to a tenant
    CONSTRAINT requirements_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- User compliance tracking
CREATE TABLE user_compliance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES compliance_requirements(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'exempt')) DEFAULT 'pending',
    completion_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    next_due_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    evidence_count INTEGER DEFAULT 0, -- number of supporting documents
    completed_by UUID REFERENCES users(id), -- who completed it (if not the user)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, requirement_id)
);

-- Risk categories (UPDATED - added tenant_id)
CREATE TABLE risk_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NEW: Tenant reference
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure category belongs to a tenant
    CONSTRAINT risk_categories_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(tenant_id, name) -- Name uniqueness per tenant
);

-- Risk assessment templates (UPDATED - added tenant_id)
CREATE TABLE risk_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NEW: Tenant reference
    category_id UUID REFERENCES risk_categories(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    risk_factors JSONB, -- array of risk factors with descriptions
    mitigation_strategies JSONB, -- array of mitigation strategies
    default_severity VARCHAR(20) CHECK (default_severity IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure template belongs to a tenant
    CONSTRAINT templates_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Risk assessments (UPDATED - added tenant_id)
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NEW: Tenant reference
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES risk_templates(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
    likelihood INTEGER CHECK (likelihood BETWEEN 1 AND 5),
    impact INTEGER CHECK (impact BETWEEN 1 AND 5),
    financial_exposure DECIMAL(10,2),
    risk_factors JSONB,
    mitigation_plan TEXT,
    mitigation_status VARCHAR(50) DEFAULT 'not_started',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure assessment belongs to a tenant
    CONSTRAINT assessments_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Document types (metadata only, no actual files stored)
CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NEW: Tenant reference
    name VARCHAR(255) NOT NULL,
    description TEXT,
    required_fields JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure document type belongs to a tenant
    CONSTRAINT document_types_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(tenant_id, name) -- Name uniqueness per tenant
);

-- Document metadata (UPDATED - added tenant_id)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NEW: Tenant reference
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type_id UUID REFERENCES document_types(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0',
    file_path TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    upload_date DATE,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'archived', 'deleted')),
    compliance_score INTEGER DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('minimal', 'low', 'medium', 'high', 'critical')),
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure document belongs to a tenant
    CONSTRAINT documents_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Training modules (UPDATED - added tenant_id)
CREATE TABLE training_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NEW: Tenant reference
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    duration INTEGER, -- in minutes
    required BOOLEAN DEFAULT false,
    expiry_months INTEGER DEFAULT 12,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure module belongs to a tenant
    CONSTRAINT training_modules_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- User training progress (UPDATED - added tenant_id)
CREATE TABLE user_training (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NEW: Tenant reference
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('not_started', 'in_progress', 'completed', 'expired')) DEFAULT 'not_started',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    start_date TIMESTAMP WITH TIME ZONE,
    completion_date TIMESTAMP WITH TIME ZONE,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    certificate_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, module_id),
    
    -- Ensure training belongs to a tenant
    CONSTRAINT user_training_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Audit templates (UPDATED - added tenant_id)
CREATE TABLE audit_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NEW: Tenant reference
    name VARCHAR(255) NOT NULL,
    description TEXT,
    audit_type VARCHAR(50) CHECK (audit_type IN ('internal', 'external', 'self_assessment')),
    frequency VARCHAR(50) CHECK (frequency IN ('monthly', 'quarterly', 'semi_annually', 'annually')),
    checklist JSONB, -- audit checklist items
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure template belongs to a tenant
    CONSTRAINT audit_templates_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(tenant_id, name) -- Name uniqueness per tenant
);

-- Audits (UPDATED - added tenant_id)
CREATE TABLE audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NEW: Tenant reference
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES audit_templates(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) CHECK (status IN ('scheduled', 'in_progress', 'completed', 'failed')) DEFAULT 'scheduled',
    auditor_id UUID REFERENCES users(id),
    findings JSONB, -- audit findings
    recommendations JSONB, -- audit recommendations
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure audit belongs to a tenant
    CONSTRAINT audits_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Notifications (UPDATED - added tenant_id)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NEW: Tenant reference
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success', 'deadline', 'audit', 'compliance')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    action_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure notification belongs to a tenant
    CONSTRAINT notifications_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Activity log (UPDATED - added tenant_id)
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NEW: Tenant reference
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure activity belongs to a tenant
    CONSTRAINT activity_log_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Compliance scores (UPDATED - added tenant_id)
CREATE TABLE compliance_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NEW: Tenant reference
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    max_score INTEGER DEFAULT 100,
    category VARCHAR(100),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    factors JSONB,
    
    -- Ensure score belongs to a tenant
    CONSTRAINT compliance_scores_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- OSHA Compliance Tables
CREATE TABLE osha_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    program_type VARCHAR(100) NOT NULL CHECK (program_type IN (
        'safety_health_plan', 'hazard_communication', 'bloodborne_pathogens', 
        'emergency_action', 'fire_protection', 'medical_equipment', 
        'workplace_violence', 'ergonomics', 'respiratory_protection'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    implementation_date DATE,
    last_review_date DATE,
    next_review_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_review', 'expired')),
    responsible_person VARCHAR(255),
    document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT osha_programs_tenant_check CHECK (tenant_id IS NOT NULL)
);

CREATE TABLE osha_training_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    training_type VARCHAR(100) NOT NULL CHECK (training_type IN (
        'bloodborne_pathogens', 'hazard_communication', 'emergency_action',
        'fire_safety', 'workplace_violence', 'ergonomics', 'respiratory_protection',
        'medical_equipment_safety', 'general_safety', 'supervisor_safety'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(50) CHECK (frequency IN ('initial', 'annual', 'biennial', 'as_needed')),
    required_for_roles TEXT[], -- Array of roles that require this training
    training_duration_minutes INTEGER,
    certification_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT osha_training_tenant_check CHECK (tenant_id IS NOT NULL)
);

CREATE TABLE osha_training_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    training_requirement_id UUID REFERENCES osha_training_requirements(id) ON DELETE CASCADE,
    completion_date DATE NOT NULL,
    expiration_date DATE,
    trainer_name VARCHAR(255),
    training_method VARCHAR(50) CHECK (training_method IN ('classroom', 'online', 'on_the_job', 'video')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    certificate_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT osha_training_records_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(user_id, training_requirement_id, completion_date)
);

CREATE TABLE osha_injury_illness_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    log_year INTEGER NOT NULL CHECK (log_year >= 2020 AND log_year <= 2100),
    case_number VARCHAR(20) NOT NULL,
    employee_name VARCHAR(255), -- Encrypted or masked for privacy
    job_title VARCHAR(255),
    department VARCHAR(255),
    injury_date DATE NOT NULL,
    injury_type VARCHAR(100) CHECK (injury_type IN (
        'injury', 'illness', 'skin_disease', 'respiratory_condition', 
        'poisoning', 'hearing_loss', 'other'
    )),
    injury_category VARCHAR(100) CHECK (injury_category IN (
        'strain', 'fracture', 'cut', 'burn', 'amputation', 'concussion',
        'respiratory', 'poisoning', 'infection', 'other'
    )),
    body_part VARCHAR(255),
    event_type VARCHAR(100) CHECK (event_type IN (
        'caught_in', 'struck_by', 'fall_to_lower', 'fall_to_same_level',
        'bodily_reaction', 'overexertion', 'exposure', 'other'
    )),
    location VARCHAR(255),
    days_away_from_work INTEGER DEFAULT 0,
    days_job_transfer INTEGER DEFAULT 0,
    days_restricted INTEGER DEFAULT 0,
    treatment_type VARCHAR(50) CHECK (treatment_type IN (
        'first_aid', 'medical_treatment', 'restricted_work', 'days_away', 'fatality'
    )),
    case_status VARCHAR(20) DEFAULT 'open' CHECK (case_status IN ('open', 'closed', 'investigating')),
    description TEXT,
    corrective_actions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT osha_log_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(tenant_id, log_year, case_number)
);

CREATE TABLE osha_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    inspection_type VARCHAR(50) CHECK (inspection_type IN (
        'routine', 'follow_up', 'complaint', 'accident_related', 'management_requested'
    )),
    inspection_date DATE NOT NULL,
    inspector_name VARCHAR(255),
    inspector_type VARCHAR(50) CHECK (inspector_type IN ('internal', 'osha_external', 'third_party')),
    areas_inspected TEXT[],
    findings JSONB, -- Array of inspection findings
    violations JSONB, -- Array of identified violations
    corrective_actions_required JSONB,
    follow_up_date DATE,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'corrective_action_needed')),
    report_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT osha_inspections_tenant_check CHECK (tenant_id IS NOT NULL)
);

CREATE TABLE osha_safety_committee (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    committee_name VARCHAR(255) NOT NULL,
    formation_date DATE,
    meeting_frequency VARCHAR(50) CHECK (meeting_frequency IN ('monthly', 'quarterly', 'bi_annually', 'as_needed')),
    next_meeting_date DATE,
    member_count INTEGER DEFAULT 0,
    management_representative BOOLEAN DEFAULT false,
    employee_representative BOOLEAN DEFAULT false,
    charter_document_url TEXT,
    meeting_minutes_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT osha_committee_tenant_check CHECK (tenant_id IS NOT NULL)
);

CREATE TABLE osha_hazardous_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    chemical_name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    product_identifier VARCHAR(255),
    location VARCHAR(255),
    quantity VARCHAR(100),
    units VARCHAR(50),
    sds_url TEXT, -- Safety Data Sheet
    hazard_classifications TEXT[], -- GHS hazard classifications
    storage_requirements TEXT,
    handling_precautions TEXT,
    emergency_procedures TEXT,
    last_inventory_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT osha_materials_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- State-Specific Regulatory Compliance Tables
CREATE TABLE state_regulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_code VARCHAR(2) NOT NULL UNIQUE,
    state_name VARCHAR(100) NOT NULL,
    regulatory_burden DECIMAL(2,1) DEFAULT 1.0, -- Multiplier for risk calculation
    medical_board_requirements JSONB, -- State medical board specific requirements
    privacy_laws JSONB, -- State privacy laws (like CCPA, etc.)
    reporting_requirements JSONB, -- State-specific reporting requirements
    license_requirements JSONB, -- State licensing requirements
    inspection_requirements JSONB, -- State inspection requirements
    continuing_education JSONB, -- State CME requirements
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE state_medical_licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    state_code VARCHAR(2) NOT NULL REFERENCES state_regulations(state_code),
    license_number VARCHAR(100) NOT NULL,
    license_type VARCHAR(50) NOT NULL, -- MD, DO, PA, NP, RN, etc.
    issue_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'revoked', 'pending')),
    license_document_url TEXT,
    renewal_document_url TEXT,
    continuing_education_hours INTEGER DEFAULT 0,
    required_ce_hours INTEGER DEFAULT 0,
    last_renewal_date DATE,
    next_renewal_date DATE,
    disciplinary_actions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT state_licenses_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(user_id, state_code, license_number)
);

CREATE TABLE state_privacy_compliance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    state_code VARCHAR(2) NOT NULL REFERENCES state_regulations(state_code),
    compliance_type VARCHAR(100) NOT NULL, -- 'data_breach_notification', 'patient_privacy', 'marketing_consent'
    policy_title VARCHAR(255) NOT NULL,
    policy_description TEXT,
    implementation_date DATE,
    last_review_date DATE,
    next_review_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_review', 'expired')),
    responsible_person VARCHAR(255),
    policy_document_url TEXT,
    compliance_requirements JSONB, -- Specific state requirements
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT state_privacy_tenant_check CHECK (tenant_id IS NOT NULL)
);

CREATE TABLE state_reporting_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    state_code VARCHAR(2) NOT NULL REFERENCES state_regulations(state_code),
    reporting_type VARCHAR(100) NOT NULL, -- 'infectious_disease', 'adverse_events', 'data_breaches', 'quality_metrics'
    report_title VARCHAR(255) NOT NULL,
    reporting_frequency VARCHAR(50) CHECK (reporting_frequency IN ('immediate', 'daily', 'weekly', 'monthly', 'quarterly', 'annually', 'as_needed')),
    reporting_deadline VARCHAR(100), -- e.g., "Within 24 hours", "By 15th of month"
    reporting_agency VARCHAR(255), -- State agency name
    reporting_method VARCHAR(50) CHECK (reporting_method IN ('electronic', 'paper', 'phone', 'fax', 'online_portal')),
    last_report_date DATE,
    next_report_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'overdue', 'exempt')),
    report_template_url TEXT,
    contact_information TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT state_reporting_tenant_check CHECK (tenant_id IS NOT NULL)
);

CREATE TABLE state_inspection_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    state_code VARCHAR(2) NOT NULL REFERENCES state_regulations(state_code),
    inspection_type VARCHAR(100) NOT NULL, -- 'medical_board', 'health_department', 'pharmacy_board', 'radiation_safety'
    inspection_date DATE NOT NULL,
    inspector_name VARCHAR(255),
    inspector_agency VARCHAR(255),
    inspection_id VARCHAR(100), -- Official inspection ID number
    areas_inspected TEXT[],
    findings JSONB, -- Array of inspection findings
    violations JSONB, -- Array of identified violations
    compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
    corrective_actions_required JSONB,
    follow_up_date DATE,
    compliance_status VARCHAR(20) DEFAULT 'pending' CHECK (compliance_status IN ('compliant', 'non_compliant', 'conditional', 'pending_correction')),
    report_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT state_inspections_tenant_check CHECK (tenant_id IS NOT NULL)
);

CREATE TABLE state_continuing_education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    state_code VARCHAR(2) NOT NULL REFERENCES state_regulations(state_code),
    license_type VARCHAR(50) NOT NULL,
    reporting_period_start DATE NOT NULL,
    reporting_period_end DATE NOT NULL,
    required_hours INTEGER NOT NULL,
    completed_hours INTEGER DEFAULT 0,
    specialty_hours INTEGER DEFAULT 0, -- Specialty-specific requirements
    ethics_hours INTEGER DEFAULT 0, -- Ethics/CME requirements
    pain_management_hours INTEGER DEFAULT 0, -- Pain management CME (some states)
    controlled_substances_hours INTEGER DEFAULT 0, -- Controlled substances training
    completion_date DATE,
    certificate_urls TEXT[], -- Array of certificate URLs
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'submitted', 'approved', 'rejected')),
    submission_date DATE,
    approval_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT state_ce_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(user_id, state_code, license_type, reporting_period_start)
);

CREATE TABLE state_specific_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    state_code VARCHAR(2) NOT NULL REFERENCES state_regulations(state_code),
    requirement_type VARCHAR(100) NOT NULL, -- 'controlled_substances', 'prescription_monitoring', 'telemedicine', 'opioid_training'
    requirement_title VARCHAR(255) NOT NULL,
    requirement_description TEXT,
    compliance_deadline DATE,
    completion_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'exempt', 'overdue')),
    responsible_person VARCHAR(255),
    documentation_url TEXT,
    verification_method VARCHAR(50), -- How compliance is verified
    next_due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT state_requirements_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Insert default data
INSERT INTO compliance_categories (name, description, icon, color, sort_order) VALUES
('HIPAA Compliance', 'Health Insurance Portability and Accountability Act requirements', 'shield-alt', '#2c5aa0', 1),
('OSHA Compliance', 'Occupational Safety and Health Administration requirements', 'hard-hat', '#ff6b35', 2),
('State Regulations', 'State-specific medical board and privacy requirements', 'state-flag', '#9b59b6', 3),
('Documentation', 'Document management and retention policies', 'file-medical', '#27ae60', 4),
('Training', 'Staff training and certification requirements', 'graduation-cap', '#f39c12', 5),
('Risk Management', 'Risk assessment and mitigation', 'exclamation-triangle', '#e74c3c', 6),
('Audits', 'Internal and external audit preparation', 'clipboard-check', '#4a90e2', 7);

INSERT INTO risk_categories (name, description, icon, color, sort_order) VALUES
('Data Security', 'Risks related to data breaches and unauthorized access', 'lock', '#e74c3c', 1),
('Compliance', 'Regulatory compliance risks', 'gavel', '#f39c12', 2),
('Operational', 'Day-to-day operational risks', 'cogs', '#4a90e2', 3),
('Documentation', 'Documentation and record-keeping risks', 'file-alt', '#27ae60', 4);

INSERT INTO document_types (name, description, file_extensions, max_file_size, retention_period) VALUES
('Policy Document', 'Internal policies and procedures', ARRAY['.pdf', '.doc', '.docx'], 10, 60),
('OSHA Safety Plan', 'OSHA-required safety and health plans', ARRAY['.pdf', '.doc', '.docx'], 15, 180),
('OSHA Training Record', 'OSHA-mandated training completion records', ARRAY['.pdf', '.jpg', '.png'], 5, 36),
('OSHA 300 Log', 'OSHA 300 workplace injury and illness log', ARRAY['.pdf', '.xlsx', '.csv'], 10, 180),
('OSHA 300A Summary', 'Annual OSHA 300A summary form', ARRAY['.pdf', '.xlsx'], 5, 180),
('State Medical License', 'State medical professional licenses', ARRAY['.pdf', '.jpg', '.png'], 5, 12),
('State Privacy Policy', 'State-specific privacy and data protection policies', ARRAY['.pdf', '.doc', '.docx'], 10, 60),
('State Consent Form', 'State-specific patient consent forms', ARRAY['.pdf', '.doc', '.docx'], 5, 84),
('State Reporting Form', 'State-mandated incident and disease reporting forms', ARRAY['.pdf', '.xlsx', '.docx'], 8, 36),
('State Inspection Report', 'State health department inspection reports', ARRAY['.pdf', '.doc', '.docx'], 15, 36),
('Safety Inspection Report', 'Workplace safety inspection reports', ARRAY['.pdf', '.doc', '.docx'], 8, 36),
('Hazard Communication', 'Hazard communication program documentation', ARRAY['.pdf', '.doc', '.docx'], 10, 60),
('Bloodborne Pathogens', 'Bloodborne pathogens exposure control plan', ARRAY['.pdf', '.doc', '.docx'], 8, 60),
('Training Certificate', 'Training completion certificates', ARRAY['.pdf', '.jpg', '.png'], 5, 36),
('Consent Form', 'General consent forms (non-PHI)', ARRAY['.pdf', '.doc', '.docx'], 5, 84),
('Audit Report', 'Internal and external audit reports', ARRAY['.pdf', '.doc', '.docx'], 20, 84),
('Risk Assessment', 'Risk assessment documentation', ARRAY['.pdf', '.xlsx', '.docx'], 10, 36);

-- Create indexes for performance
CREATE INDEX idx_user_compliance_user_id ON user_compliance(user_id);
CREATE INDEX idx_user_compliance_requirement_id ON user_compliance(requirement_id);
CREATE INDEX idx_user_compliance_status ON user_compliance(status);
CREATE INDEX idx_user_compliance_due_date ON user_compliance(due_date);

CREATE INDEX idx_risk_assessments_user_id ON risk_assessments(user_id);
CREATE INDEX idx_risk_assessments_severity ON risk_assessments(severity);
CREATE INDEX idx_risk_assessments_status ON risk_assessments(status);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_type_id ON documents(type_id);
CREATE INDEX idx_documents_status ON documents(status);

CREATE INDEX idx_user_training_user_id ON user_training(user_id);
CREATE INDEX idx_user_training_module_id ON user_training(module_id);
CREATE INDEX idx_user_training_status ON user_training(status);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_priority ON notifications(priority);

CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);

-- OSHA-specific indexes for performance
CREATE INDEX idx_osha_programs_tenant ON osha_programs(tenant_id);
CREATE INDEX idx_osha_programs_type ON osha_programs(program_type);
CREATE INDEX idx_osha_programs_status ON osha_programs(status);
CREATE INDEX idx_osha_training_tenant ON osha_training_requirements(tenant_id);
CREATE INDEX idx_osha_training_type ON osha_training_requirements(training_type);
CREATE INDEX idx_osha_training_records_tenant ON osha_training_records(tenant_id);
CREATE INDEX idx_osha_training_records_user ON osha_training_records(user_id);
CREATE INDEX idx_osha_training_records_requirement ON osha_training_records(training_requirement_id);
CREATE INDEX idx_osha_training_records_completion ON osha_training_records(completion_date);
CREATE INDEX idx_osha_injury_log_tenant ON osha_injury_illness_log(tenant_id);
CREATE INDEX idx_osha_injury_log_year ON osha_injury_illness_log(log_year);
CREATE INDEX idx_osha_injury_log_date ON osha_injury_illness_log(injury_date);
CREATE INDEX idx_osha_injury_log_status ON osha_injury_illness_log(case_status);
CREATE INDEX idx_osha_inspections_tenant ON osha_inspections(tenant_id);
CREATE INDEX idx_osha_inspections_date ON osha_inspections(inspection_date);
CREATE INDEX idx_osha_inspections_type ON osha_inspections(inspection_type);
CREATE INDEX idx_osha_inspections_status ON osha_inspections(status);
CREATE INDEX idx_osha_committee_tenant ON osha_safety_committee(tenant_id);
CREATE INDEX idx_osha_materials_tenant ON osha_hazardous_materials(tenant_id);
CREATE INDEX idx_osha_materials_chemical ON osha_hazardous_materials(chemical_name);

-- State-specific indexes for performance
CREATE INDEX idx_state_regulations_code ON state_regulations(state_code);
CREATE INDEX idx_state_medical_licenses_tenant ON state_medical_licenses(tenant_id);
CREATE INDEX idx_state_medical_licenses_user ON state_medical_licenses(user_id);
CREATE INDEX idx_state_medical_licenses_state ON state_medical_licenses(state_code);
CREATE INDEX idx_state_medical_licenses_expiration ON state_medical_licenses(expiration_date);
CREATE INDEX idx_state_medical_licenses_status ON state_medical_licenses(status);
CREATE INDEX idx_state_privacy_tenant ON state_privacy_compliance(tenant_id);
CREATE INDEX idx_state_privacy_state ON state_privacy_compliance(state_code);
CREATE INDEX idx_state_privacy_type ON state_privacy_compliance(compliance_type);
CREATE INDEX idx_state_reporting_tenant ON state_reporting_requirements(tenant_id);
CREATE INDEX idx_state_reporting_state ON state_reporting_requirements(state_code);
CREATE INDEX idx_state_reporting_type ON state_reporting_requirements(reporting_type);
CREATE INDEX idx_state_reporting_next_date ON state_reporting_requirements(next_report_date);
CREATE INDEX idx_state_inspections_tenant ON state_inspection_records(tenant_id);
CREATE INDEX idx_state_inspections_state ON state_inspection_records(state_code);
CREATE INDEX idx_state_inspections_date ON state_inspection_records(inspection_date);
CREATE INDEX idx_state_inspections_type ON state_inspection_records(inspection_type);
CREATE INDEX idx_state_ce_tenant ON state_continuing_education(tenant_id);
CREATE INDEX idx_state_ce_user ON state_continuing_education(user_id);
CREATE INDEX idx_state_ce_state ON state_continuing_education(state_code);
CREATE INDEX idx_state_ce_period_end ON state_continuing_education(reporting_period_end);
CREATE INDEX idx_state_ce_status ON state_continuing_education(status);
CREATE INDEX idx_state_requirements_tenant ON state_specific_requirements(tenant_id);
CREATE INDEX idx_state_requirements_state ON state_specific_requirements(state_code);
CREATE INDEX idx_state_requirements_type ON state_specific_requirements(requirement_type);
CREATE INDEX idx_state_requirements_next_due ON state_specific_requirements(next_due_date);

-- Create indexes for performance (UPDATED - include tenant_id)
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email_tenant ON users(email, tenant_id);
CREATE INDEX idx_compliance_categories_tenant ON compliance_categories(tenant_id);
CREATE INDEX idx_compliance_requirements_tenant ON compliance_requirements(tenant_id);
CREATE INDEX idx_user_compliance_tenant ON user_compliance(tenant_id);
CREATE INDEX idx_risk_categories_tenant ON risk_categories(tenant_id);
CREATE INDEX idx_risk_assessments_tenant ON risk_assessments(tenant_id);
CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX idx_training_modules_tenant ON training_modules(tenant_id);
CREATE INDEX idx_user_training_tenant ON user_training(tenant_id);
CREATE INDEX idx_notifications_tenant_user ON notifications(tenant_id, user_id);
CREATE INDEX idx_audits_tenant ON audits(tenant_id);
CREATE INDEX idx_activity_log_tenant ON activity_log(tenant_id);
CREATE INDEX idx_compliance_scores_tenant ON compliance_scores(tenant_id);

-- Row Level Security (RLS) for multi-tenant isolation
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_scores ENABLE ROW LEVEL SECURITY;

-- OSHA tables RLS
ALTER TABLE osha_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE osha_training_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE osha_training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE osha_injury_illness_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE osha_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE osha_safety_committee ENABLE ROW LEVEL SECURITY;
ALTER TABLE osha_hazardous_materials ENABLE ROW LEVEL SECURITY;

-- Multi-tenant RLS Policies
-- Users can only access data from their own tenant
CREATE POLICY "Users can view own tenant data" ON users
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant compliance categories" ON compliance_categories
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant compliance requirements" ON compliance_requirements
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant user compliance" ON user_compliance
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant risk categories" ON risk_categories
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant risk templates" ON risk_templates
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant risk assessments" ON risk_assessments
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant document types" ON document_types
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant documents" ON documents
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant training modules" ON training_modules
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant user training" ON user_training
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant audit templates" ON audit_templates
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant audits" ON audits
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant notifications" ON notifications
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant activity log" ON activity_log
    FOR SELECT USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can insert own tenant activity log" ON activity_log
    FOR INSERT WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant compliance scores" ON compliance_scores
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

-- OSHA RLS Policies
CREATE POLICY "Users can view own tenant OSHA programs" ON osha_programs
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant OSHA training requirements" ON osha_training_requirements
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant OSHA training records" ON osha_training_records
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant OSHA injury log" ON osha_injury_illness_log
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant OSHA inspections" ON osha_inspections
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant OSHA safety committee" ON osha_safety_committee
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant OSHA hazardous materials" ON osha_hazardous_materials
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

-- State-specific RLS Policies
CREATE POLICY "Users can view own tenant state medical licenses" ON state_medical_licenses
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant state privacy compliance" ON state_privacy_compliance
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant state reporting requirements" ON state_reporting_requirements
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant state inspection records" ON state_inspection_records
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant state continuing education" ON state_continuing_education
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Users can view own tenant state specific requirements" ON state_specific_requirements
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth.uid()::text = id::text
    ));
-- Multi-tenant helper functions
-- Function to get current user's tenant ID
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT tenant_id FROM users 
        WHERE auth.uid()::text = id::text
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically set tenant_id on insert
CREATE OR REPLACE FUNCTION set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := get_current_tenant_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically set tenant_id
CREATE TRIGGER set_user_tenant_id
    BEFORE INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_compliance_categories_tenant_id
    BEFORE INSERT ON compliance_categories
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_compliance_requirements_tenant_id
    BEFORE INSERT ON compliance_requirements
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_user_compliance_tenant_id
    BEFORE INSERT ON user_compliance
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_risk_categories_tenant_id
    BEFORE INSERT ON risk_categories
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_risk_templates_tenant_id
    BEFORE INSERT ON risk_templates
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_risk_assessments_tenant_id
    BEFORE INSERT ON risk_assessments
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_document_types_tenant_id
    BEFORE INSERT ON document_types
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_documents_tenant_id
    BEFORE INSERT ON documents
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_training_modules_tenant_id
    BEFORE INSERT ON training_modules
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_user_training_tenant_id
    BEFORE INSERT ON user_training
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_audit_templates_tenant_id
    BEFORE INSERT ON audit_templates
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_audits_tenant_id
    BEFORE INSERT ON audits
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_notifications_tenant_id
    BEFORE INSERT ON notifications
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_activity_log_tenant_id
    BEFORE INSERT ON activity_log
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_compliance_scores_tenant_id
    BEFORE INSERT ON compliance_scores
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own compliance scores" ON compliance_scores FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can manage own compliance scores" ON compliance_scores FOR ALL USING (auth.uid()::text = user_id::text);

-- Public read access for reference data
CREATE POLICY "Public read access for compliance categories" ON compliance_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access for compliance requirements" ON compliance_requirements FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access for risk categories" ON risk_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access for risk templates" ON risk_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access for document types" ON document_types FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access for training modules" ON training_modules FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access for audit templates" ON audit_templates FOR SELECT USING (is_active = true);

-- Functions for automatic calculations
CREATE OR REPLACE FUNCTION calculate_compliance_score(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    total_requirements INTEGER;
    completed_requirements INTEGER;
    score INTEGER;
BEGIN
    -- Count total active requirements
    SELECT COUNT(*) INTO total_requirements
    FROM compliance_requirements cr
    WHERE cr.is_active = true;
    
    -- Count completed requirements for user
    SELECT COUNT(*) INTO completed_requirements
    FROM user_compliance uc
    JOIN compliance_requirements cr ON uc.requirement_id = cr.id
    WHERE uc.user_id = user_uuid 
    AND uc.status = 'completed'
    AND cr.is_active = true;
    
    -- Calculate percentage
    IF total_requirements > 0 THEN
        score := ROUND((completed_requirements::FLOAT / total_requirements::FLOAT) * 100);
    ELSE
        score := 0;
    END IF;
    
    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Function to update compliance score cache
CREATE OR REPLACE FUNCTION update_compliance_score_cache()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO compliance_scores (user_id, overall_score, last_calculated)
    VALUES (NEW.user_id, calculate_compliance_score(NEW.user_id), NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        overall_score = EXCLUDED.overall_score,
        last_calculated = EXCLUDED.last_calculated;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update compliance score
CREATE TRIGGER update_compliance_score_trigger
    AFTER INSERT OR UPDATE ON user_compliance
    FOR EACH ROW EXECUTE FUNCTION update_compliance_score_cache();

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_log (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Activity logging triggers
CREATE TRIGGER log_user_compliance_activity
    AFTER INSERT OR UPDATE OR DELETE ON user_compliance
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_risk_assessments_activity
    AFTER INSERT OR UPDATE OR DELETE ON risk_assessments
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_documents_activity
    AFTER INSERT OR UPDATE OR DELETE ON documents
    FOR EACH ROW EXECUTE FUNCTION log_activity();

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_compliance_updated_at BEFORE UPDATE ON user_compliance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_requirements_updated_at BEFORE UPDATE ON compliance_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risk_assessments_updated_at BEFORE UPDATE ON risk_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_training_updated_at BEFORE UPDATE ON user_training FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audits_updated_at BEFORE UPDATE ON audits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- OSHA sample data (will be populated per tenant during setup)
-- These are templates that can be copied for each tenant

-- Sample OSHA training requirements
INSERT INTO osha_training_requirements (tenant_id, training_type, title, description, frequency, required_for_roles, training_duration_minutes, certification_required) VALUES
-- These will be created per tenant during setup
SELECT 
    t.id,
    'bloodborne_pathogens',
    'Bloodborne Pathogens Training',
    'OSHA-required training for employees with occupational exposure to blood or other potentially infectious materials',
    'annual',
    ARRAY['healthcare_provider', 'lab_technician', 'housekeeping', 'physician', 'nurse'],
    60,
    true
FROM tenants t WHERE t.is_active = true;

INSERT INTO osha_training_requirements (tenant_id, training_type, title, description, frequency, required_for_roles, training_duration_minutes, certification_required) VALUES
SELECT 
    t.id,
    'hazard_communication',
    'Hazard Communication Standard',
    'Training on chemical hazards, labeling, safety data sheets, and protective measures',
    'initial',
    ARRAY['all_staff'],
    45,
    false
FROM tenants t WHERE t.is_active = true;

INSERT INTO osha_training_requirements (tenant_id, training_type, title, description, frequency, required_for_roles, training_duration_minutes, certification_required) VALUES
SELECT 
    t.id,
    'emergency_action',
    'Emergency Action Plan Training',
    'Training on emergency procedures, evacuation routes, and response protocols',
    'annual',
    ARRAY['all_staff'],
    30,
    false
FROM tenants t WHERE t.is_active = true;

-- Sample OSHA programs
INSERT INTO osha_programs (tenant_id, program_type, title, description, implementation_date, last_review_date, next_review_date, status, responsible_person) VALUES
SELECT 
    t.id,
    'safety_health_plan',
    'Workplace Safety and Health Program',
    'Comprehensive safety and health program covering all aspects of workplace safety',
    CURRENT_DATE - INTERVAL '1 year',
    CURRENT_DATE - INTERVAL '3 months',
    CURRENT_DATE + INTERVAL '9 months',
    'active',
    'Safety Officer'
FROM tenants t WHERE t.is_active = true;

INSERT INTO osha_programs (tenant_id, program_type, title, description, implementation_date, last_review_date, next_review_date, status, responsible_person) VALUES
SELECT 
    t.id,
    'hazard_communication',
    'Hazard Communication Program',
    'Program for identifying, evaluating, and controlling chemical hazards in the workplace',
    CURRENT_DATE - INTERVAL '1 year',
    CURRENT_DATE - INTERVAL '3 months',
    CURRENT_DATE + INTERVAL '9 months',
    'active',
    'Safety Officer'
FROM tenants t WHERE t.is_active = true;

-- Sample safety committee
INSERT INTO osha_safety_committee (tenant_id, committee_name, formation_date, meeting_frequency, next_meeting_date, member_count, management_representative, employee_representative) VALUES
SELECT 
    t.id,
    'Workplace Safety Committee',
    CURRENT_DATE - INTERVAL '2 years',
    'monthly',
    CURRENT_DATE + INTERVAL '1 month',
    5,
    true,
    true
FROM tenants t WHERE t.is_active = true;

-- State regulations data
INSERT INTO state_regulations (state_code, state_name, regulatory_burden, medical_board_requirements, privacy_laws, reporting_requirements, license_requirements, inspection_requirements, continuing_education) VALUES
('CA', 'California', 1.4, '{
    "license_renewal": "biennial",
    "continuing_education": 50,
    "pain_management_ce": 12,
    "controlled_substances_ce": 8,
    "telemedicine_requirements": true,
    "prescription_monitoring": "mandatory",
    "opioid_prescribing_limits": true
}', '{
    "data_breach_notification": "within 15 days",
    "patient_privacy_act": "CMIA",
    "marketing_consent": "required",
    "data_retention": "7 years"
}', '{
    "infectious_diseases": "immediate",
    "adverse_events": "within 24 hours",
    "data_breaches": "within 15 days",
    "quality_metrics": "quarterly"
}', '{
    "medical_license_renewal": "biennial",
    "facility_license": "annual",
    "special_certifications": "varies"
}', '{
    "frequency": "annual",
    "unannounced": true,
    "scope": "comprehensive"
}', '{
    "total_hours": 50,
    "ethics_required": true,
    "pain_management_required": true,
    "controlled_substances_required": true,
    "reporting_period": "2 years"
}'),

('NY', 'New York', 1.3, '{
    "license_renewal": "biennial",
    "continuing_education": 54,
    "pain_management_ce": 8,
    "infection_control_ce": 4,
    "prescription_monitoring": "mandatory",
    "opioid_prescribing_limits": true
}', '{
    "data_breach_notification": "within 10 days",
    "patient_privacy_act": "SHIELD",
    "marketing_consent": "required",
    "data_retention": "6 years"
}', '{
    "infectious_diseases": "immediate",
    "adverse_events": "within 24 hours",
    "data_breaches": "within 10 days",
    "quality_metrics": "quarterly"
}', '{
    "medical_license_renewal": "biennial",
    "facility_license": "biennial",
    "special_certifications": "varies"
}', '{
    "frequency": "biennial",
    "unannounced": false,
    "scope": "comprehensive"
}', '{
    "total_hours": 54,
    "ethics_required": true,
    "pain_management_required": true,
    "infection_control_required": true,
    "reporting_period": "2 years"
}'),

('TX', 'Texas', 1.2, '{
    "license_renewal": "biennial",
    "continuing_education": 48,
    "pain_management_ce": 8,
    "ethics_ce": 4,
    "prescription_monitoring": "mandatory"
}', '{
    "data_breach_notification": "within 60 days",
    "patient_privacy_act": "Texas Medical Records Privacy Act",
    "marketing_consent": "required",
    "data_retention": "7 years"
}', '{
    "infectious_diseases": "immediate",
    "adverse_events": "within 24 hours",
    "data_breaches": "within 60 days",
    "quality_metrics": "annual"
}', '{
    "medical_license_renewal": "biennial",
    "facility_license": "biennial",
    "special_certifications": "varies"
}', '{
    "frequency": "biennial",
    "unannounced": false,
    "scope": "comprehensive"
}', '{
    "total_hours": 48,
    "ethics_required": true,
    "pain_management_required": true,
    "reporting_period": "2 years"
}'),

('FL', 'Florida', 1.25, '{
    "license_renewal": "biennial",
    "continuing_education": 40,
    "pain_management_ce": 8,
    "domestic_violence_ce": 2,
    "prescription_monitoring": "mandatory",
    "opioid_prescribing_limits": true
}', '{
    "data_breach_notification": "within 30 days",
    "patient_privacy_act": "Florida Information Protection Act",
    "marketing_consent": "required",
    "data_retention": "7 years"
}', '{
    "infectious_diseases": "immediate",
    "adverse_events": "within 24 hours",
    "data_breaches": "within 30 days",
    "quality_metrics": "quarterly"
}', '{
    "medical_license_renewal": "biennial",
    "facility_license": "annual",
    "special_certifications": "varies"
}', '{
    "frequency": "annual",
    "unannounced": true,
    "scope": "comprehensive"
}', '{
    "total_hours": 40,
    "domestic_violence_required": true,
    "pain_management_required": true,
    "reporting_period": "2 years"
}'),

('IL', 'Illinois', 1.15, '{
    "license_renewal": "triennial",
    "continuing_education": 75,
    "pain_management_ce": 8,
    "ethics_ce": 8,
    "prescription_monitoring": "mandatory"
}', '{
    "data_breach_notification": "within 30 days",
    "patient_privacy_act": "Illinois Personal Information Protection Act",
    "marketing_consent": "required",
    "data_retention": "10 years"
}', '{
    "infectious_diseases": "immediate",
    "adverse_events": "within 24 hours",
    "data_breaches": "within 30 days",
    "quality_metrics": "quarterly"
}', '{
    "medical_license_renewal": "triennial",
    "facility_license": "annual",
    "special_certifications": "varies"
}', '{
    "frequency": "annual",
    "unannounced": false,
    "scope": "comprehensive"
}', '{
    "total_hours": 75,
    "ethics_required": true,
    "pain_management_required": true,
    "reporting_period": "3 years"
}');

-- Add updated_at triggers for OSHA tables
CREATE TRIGGER update_osha_programs_updated_at BEFORE UPDATE ON osha_programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_osha_training_records_updated_at BEFORE UPDATE ON osha_training_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_osha_injury_illness_log_updated_at BEFORE UPDATE ON osha_injury_illness_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_osha_inspections_updated_at BEFORE UPDATE ON osha_inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_osha_safety_committee_updated_at BEFORE UPDATE ON osha_safety_committee FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_osha_hazardous_materials_updated_at BEFORE UPDATE ON osha_hazardous_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- OSHA activity logging triggers
CREATE TRIGGER log_osha_programs_activity
    AFTER INSERT OR UPDATE OR DELETE ON osha_programs
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_osha_training_records_activity
    AFTER INSERT OR UPDATE OR DELETE ON osha_training_records
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_osha_injury_illness_log_activity
    AFTER INSERT OR UPDATE OR DELETE ON osha_injury_illness_log
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_osha_inspections_activity
    AFTER INSERT OR UPDATE OR DELETE ON osha_inspections
    FOR EACH ROW EXECUTE FUNCTION log_activity();

-- OSHA compliance score calculation function
CREATE OR REPLACE FUNCTION calculate_osha_compliance_score(p_tenant_id UUID)
RETURNS TABLE (
    overall_score INTEGER,
    program_score DECIMAL,
    training_score DECIMAL,
    record_score DECIMAL,
    inspection_score DECIMAL,
    injury_score DECIMAL,
    calculated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH 
    -- Program compliance
    program_compliance AS (
        SELECT 
            COUNT(CASE WHEN program_type IN ('safety_health_plan', 'hazard_communication', 'bloodborne_pathogens', 'emergency_action') AND status = 'active' THEN 1 END) * 25.0 as score
        FROM osha_programs 
        WHERE tenant_id = p_tenant_id
    ),
    
    -- Training compliance
    training_compliance AS (
        SELECT 
            COALESCE(
                (COUNT(CASE WHEN tr.frequency != 'as_needed' THEN 1 END) - 
                 COUNT(CASE WHEN tr.frequency != 'as_needed' AND 
                    NOT EXISTS (
                        SELECT 1 FROM osha_training_records otr 
                        WHERE otr.training_requirement_id = tr.id 
                        AND otr.completion_date > CURRENT_DATE - INTERVAL '1 year'
                    ) THEN 1 END)) * 100.0 / 
                NULLIF(COUNT(CASE WHEN tr.frequency != 'as_needed' THEN 1 END), 0), 0
            ) as score
        FROM osha_training_requirements tr
        WHERE tr.tenant_id = p_tenant_id
    ),
    
    -- Record keeping compliance
    record_compliance AS (
        SELECT 
            100.0 - 
            (CASE WHEN NOT EXISTS (SELECT 1 FROM osha_injury_illness_log WHERE tenant_id = p_tenant_id AND log_year = EXTRACT(YEAR FROM CURRENT_DATE)) THEN 30 ELSE 0 END) -
            (CASE WHEN NOT EXISTS (SELECT 1 FROM osha_safety_committee WHERE tenant_id = p_tenant_id) THEN 20 ELSE 0 END) -
            (CASE WHEN NOT EXISTS (SELECT 1 FROM osha_hazardous_materials WHERE tenant_id = p_tenant_id AND last_inventory_date > CURRENT_DATE - INTERVAL '1 year') THEN 25 ELSE 0 END) as score
    ),
    
    -- Inspection compliance
    inspection_compliance AS (
        SELECT 
            CASE 
                WHEN COUNT(CASE WHEN inspection_date > CURRENT_DATE - INTERVAL '3 months' THEN 1 END) >= 2 THEN 100.0
                WHEN COUNT(CASE WHEN inspection_date > CURRENT_DATE - INTERVAL '3 months' THEN 1 END) >= 1 THEN 70.0
                ELSE 0.0
            END as score
        FROM osha_inspections 
        WHERE tenant_id = p_tenant_id
    ),
    
    -- Injury rate score
    injury_compliance AS (
        SELECT 
            CASE 
                WHEN COALESCE(trir, 0) <= 0.5 THEN 100.0
                WHEN COALESCE(trir, 0) <= 1.0 THEN 85.0
                WHEN COALESCE(trir, 0) <= 3.0 THEN 70.0
                WHEN COALESCE(trir, 0) <= 5.0 THEN 40.0
                ELSE 0.0
            END as score
        FROM (
            SELECT 
                (COUNT(CASE WHEN treatment_type != 'first_aid' THEN 1 END) * 200000.0 / NULLIF(200000, 0)) as trir
            FROM osha_injury_illness_log 
            WHERE tenant_id = p_tenant_id AND log_year = EXTRACT(YEAR FROM CURRENT_DATE)
        ) injury_data
    )
    
    SELECT 
        ROUND((pc.score * 0.3 + tc.score * 0.25 + rc.score * 0.2 + ic.score * 0.15 + ic2.score * 0.1)) as overall_score,
        pc.score as program_score,
        tc.score as training_score,
        rc.score as record_score,
        ic.score as inspection_score,
        ic2.score as injury_score,
        NOW() as calculated_at
    FROM program_compliance pc, training_compliance tc, record_compliance rc, inspection_compliance ic, injury_compliance ic2;
END;
$$ LANGUAGE plpgsql;

-- Function to update OSHA compliance score cache
CREATE OR REPLACE FUNCTION update_osha_compliance_score_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be called by triggers on OSHA-related tables
    -- Implementation would depend on where we want to store the cache
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers for state tables
CREATE TRIGGER update_state_medical_licenses_updated_at BEFORE UPDATE ON state_medical_licenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_state_privacy_compliance_updated_at BEFORE UPDATE ON state_privacy_compliance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_state_reporting_requirements_updated_at BEFORE UPDATE ON state_reporting_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_state_inspection_records_updated_at BEFORE UPDATE ON state_inspection_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_state_continuing_education_updated_at BEFORE UPDATE ON state_continuing_education FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_state_specific_requirements_updated_at BEFORE UPDATE ON state_specific_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- State-specific activity logging triggers
CREATE TRIGGER log_state_medical_licenses_activity
    AFTER INSERT OR UPDATE OR DELETE ON state_medical_licenses
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_state_privacy_compliance_activity
    AFTER INSERT OR UPDATE OR DELETE ON state_privacy_compliance
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_state_reporting_requirements_activity
    AFTER INSERT OR UPDATE OR DELETE ON state_reporting_requirements
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_state_inspection_records_activity
    AFTER INSERT OR UPDATE OR DELETE ON state_inspection_records
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_state_continuing_education_activity
    AFTER INSERT OR UPDATE OR DELETE ON state_continuing_education
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_state_specific_requirements_activity
    AFTER INSERT OR UPDATE OR DELETE ON state_specific_requirements
    FOR EACH ROW EXECUTE FUNCTION log_activity();

-- State compliance score calculation function
CREATE OR REPLACE FUNCTION calculate_state_compliance_score(p_tenant_id UUID, p_state_code VARCHAR(2))
RETURNS TABLE (
    overall_score INTEGER,
    license_score DECIMAL,
    privacy_score DECIMAL,
    reporting_score DECIMAL,
    inspection_score DECIMAL,
    ce_score DECIMAL,
    requirements_score DECIMAL,
    calculated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH 
    -- License compliance
    license_compliance AS (
        SELECT 
            CASE 
                WHEN COUNT(*) = 0 THEN 0.0
                ELSE (COUNT(CASE WHEN status = 'active' AND expiration_date > CURRENT_DATE THEN 1 END) * 100.0 / COUNT(*))
            END as score
        FROM state_medical_licenses 
        WHERE tenant_id = p_tenant_id AND state_code = p_state_code
    ),
    
    -- Privacy compliance
    privacy_compliance AS (
        SELECT 
            CASE 
                WHEN COUNT(*) = 0 THEN 100.0 -- No privacy requirements yet
                ELSE (COUNT(CASE WHEN status = 'active' AND next_review_date > CURRENT_DATE THEN 1 END) * 100.0 / COUNT(*))
            END as score
        FROM state_privacy_compliance 
        WHERE tenant_id = p_tenant_id AND state_code = p_state_code
    ),
    
    -- Reporting compliance
    reporting_compliance AS (
        SELECT 
            CASE 
                WHEN COUNT(*) = 0 THEN 100.0
                ELSE (COUNT(CASE WHEN status != 'overdue' THEN 1 END) * 100.0 / COUNT(*))
            END as score
        FROM state_reporting_requirements 
        WHERE tenant_id = p_tenant_id AND state_code = p_state_code
    ),
    
    -- Inspection compliance
    inspection_compliance AS (
        SELECT 
            CASE 
                WHEN COUNT(*) = 0 THEN 100.0
                ELSE (COUNT(CASE WHEN compliance_status = 'compliant' THEN 1 END) * 100.0 / COUNT(*))
            END as score
        FROM state_inspection_records 
        WHERE tenant_id = p_tenant_id AND state_code = p_state_code
            AND inspection_date > CURRENT_DATE - INTERVAL '2 years'
    ),
    
    -- Continuing education compliance
    ce_compliance AS (
        SELECT 
            CASE 
                WHEN COUNT(*) = 0 THEN 100.0
                ELSE (COUNT(CASE WHEN completed_hours >= required_hours AND status = 'completed' THEN 1 END) * 100.0 / COUNT(*))
            END as score
        FROM state_continuing_education 
        WHERE tenant_id = p_tenant_id AND state_code = p_state_code
            AND reporting_period_end > CURRENT_DATE - INTERVAL '1 year'
    ),
    
    -- Specific requirements compliance
    requirements_compliance AS (
        SELECT 
            CASE 
                WHEN COUNT(*) = 0 THEN 100.0
                ELSE (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*))
            END as score
        FROM state_specific_requirements 
        WHERE tenant_id = p_tenant_id AND state_code = p_state_code
    )
    
    SELECT 
        ROUND((lc.score * 0.25 + pc.score * 0.15 + rc.score * 0.20 + ic.score * 0.15 + cec.score * 0.15 + reqc.score * 0.10)) as overall_score,
        lc.score as license_score,
        pc.score as privacy_score,
        rc.score as reporting_score,
        ic.score as inspection_score,
        cec.score as ce_score,
        reqc.score as requirements_score,
        NOW() as calculated_at
    FROM license_compliance lc, privacy_compliance pc, reporting_compliance rc, inspection_compliance ic, ce_compliance cec, requirements_compliance reqc;
END;
$$ LANGUAGE plpgsql;

-- Function to get state regulatory burden multiplier
CREATE OR REPLACE FUNCTION get_state_regulatory_burden(p_state_code VARCHAR(2))
RETURNS DECIMAL(2,1) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT regulatory_burden FROM state_regulations WHERE state_code = p_state_code),
        1.0 -- Default multiplier if state not found
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check upcoming state requirements
CREATE OR REPLACE FUNCTION get_upcoming_state_requirements(p_tenant_id UUID, p_days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
    requirement_type VARCHAR(100),
    requirement_title VARCHAR(255),
    due_date DATE,
    days_until_due INTEGER,
    priority VARCHAR(20),
    responsible_person VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    -- Upcoming license renewals
    SELECT 
        'license_renewal'::VARCHAR(100),
        'Medical License Renewal'::VARCHAR(255),
        expiration_date::DATE,
        (expiration_date - CURRENT_DATE)::INTEGER,
        CASE 
            WHEN (expiration_date - CURRENT_DATE) <= 30 THEN 'high'::VARCHAR(20)
            WHEN (expiration_date - CURRENT_DATE) <= 90 THEN 'medium'::VARCHAR(20)
            ELSE 'low'::VARCHAR(20)
        END,
        'License Holder'::VARCHAR(255)
    FROM state_medical_licenses 
    WHERE tenant_id = p_tenant_id 
        AND expiration_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '1 day' * p_days_ahead)
        AND status = 'active'
    
    UNION ALL
    
    -- Upcoming reporting deadlines
    SELECT 
        'reporting_deadline'::VARCHAR(100),
        report_title::VARCHAR(255),
        next_report_date::DATE,
        (next_report_date - CURRENT_DATE)::INTEGER,
        CASE 
            WHEN (next_report_date - CURRENT_DATE) <= 7 THEN 'high'::VARCHAR(20)
            WHEN (next_report_date - CURRENT_DATE) <= 14 THEN 'medium'::VARCHAR(20)
            ELSE 'low'::VARCHAR(20)
        END,
        reporting_agency::VARCHAR(255)
    FROM state_reporting_requirements 
    WHERE tenant_id = p_tenant_id 
        AND next_report_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '1 day' * p_days_ahead)
        AND status != 'exempt'
    
    UNION ALL
    
    -- Upcoming CE deadlines
    SELECT 
        'continuing_education'::VARCHAR(100),
        'Continuing Education Deadline'::VARCHAR(255),
        reporting_period_end::DATE,
        (reporting_period_end - CURRENT_DATE)::INTEGER,
        CASE 
            WHEN (reporting_period_end - CURRENT_DATE) <= 30 THEN 'high'::VARCHAR(20)
            WHEN (reporting_period_end - CURRENT_DATE) <= 60 THEN 'medium'::VARCHAR(20)
            ELSE 'low'::VARCHAR(20)
        END,
        'License Holder'::VARCHAR(255)
    FROM state_continuing_education 
    WHERE tenant_id = p_tenant_id 
        AND reporting_period_end BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '1 day' * p_days_ahead)
        AND status != 'completed'
    
    ORDER BY days_until_due;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- DEA REGISTRATION AND COMPLIANCE MODULE
-- ========================================

-- DEA Registrations table
CREATE TABLE dea_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    dea_number VARCHAR(9) NOT NULL, -- DEA registration number (format: A1234567)
    business_activity VARCHAR(50) NOT NULL CHECK (business_activity IN (
        'practitioner', 'hospital', 'clinic', 'pharmacy', 'research', 'teaching', 'manufacturer'
    )),
    schedule_authorization TEXT[], -- Authorized schedules (e.g., '{II,III,IV,V}')
    registration_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'revoked', 'pending', 'cancelled')),
    registration_type VARCHAR(50) NOT NULL, -- 'individual', 'hospital', 'clinic', 'research'
    principal_place_of_business TEXT NOT NULL,
    dea_region VARCHAR(2), -- DEA region (1-10)
    last_renewal_date DATE,
    next_renewal_date DATE,
    registration_document_url TEXT,
    renewal_document_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT dea_registrations_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(dea_number, tenant_id)
);

-- DEA Training Requirements table
CREATE TABLE dea_training_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    training_type VARCHAR(100) NOT NULL CHECK (training_type IN (
        'dea_controlled_substances', 'opioid_management', 'diversion_prevention',
        'record_keeping', 'emergency_ordering', 'inventory_management', 'waste_disposal'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(50) CHECK (frequency IN ('initial', 'annual', 'biennial', 'as_needed')),
    required_for_roles TEXT[], -- Array of roles that require this training
    training_duration_minutes INTEGER,
    certification_required BOOLEAN DEFAULT false,
    dea_mandated BOOLEAN DEFAULT false, -- Whether specifically required by DEA
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT dea_training_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- DEA Training Records table
CREATE TABLE dea_training_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    training_requirement_id UUID REFERENCES dea_training_requirements(id) ON DELETE CASCADE,
    completion_date DATE NOT NULL,
    expiration_date DATE,
    trainer_name VARCHAR(255),
    training_method VARCHAR(50) CHECK (training_method IN ('classroom', 'online', 'on_the_job', 'video', 'webinar')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    certificate_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT dea_training_records_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(user_id, training_requirement_id, completion_date)
);

-- DEA Inspection Records table
CREATE TABLE dea_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    dea_registration_id UUID REFERENCES dea_registrations(id) ON DELETE CASCADE,
    inspection_date DATE NOT NULL,
    inspector_name VARCHAR(255),
    inspector_agency VARCHAR(255) DEFAULT 'DEA',
    inspection_id VARCHAR(100), -- Official inspection ID number
    inspection_type VARCHAR(50) CHECK (inspection_type IN (
        'routine', 'compliance', 'investigative', 'follow_up', 'registration_renewal'
    )),
    areas_inspected TEXT[], -- Array of inspected areas
    findings JSONB, -- Array of inspection findings
    violations JSONB, -- Array of identified violations
    compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
    corrective_actions_required JSONB,
    follow_up_date DATE,
    compliance_status VARCHAR(20) DEFAULT 'pending' CHECK (compliance_status IN (
        'compliant', 'non_compliant', 'conditional', 'pending_correction', 'under_investigation'
    )),
    report_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT dea_inspections_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- DEA Diversion Prevention Program table
CREATE TABLE dea_diversion_prevention (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    program_type VARCHAR(100) NOT NULL CHECK (program_type IN (
        'access_controls', 'surveillance', 'employee_screening', 'incident_reporting',
        'waste_disposal', 'record_keeping', 'inventory_management'
    )),
    program_title VARCHAR(255) NOT NULL,
    program_description TEXT,
    implementation_date DATE,
    last_review_date DATE,
    next_review_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_review', 'expired')),
    responsible_person VARCHAR(255),
    program_document_url TEXT,
    compliance_requirements JSONB, -- DEA-specific requirements
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT dea_diversion_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- DEA Compliance Alerts table
CREATE TABLE dea_compliance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL CHECK (alert_type IN (
        'expiration_warning', 'renewal_required', 'training_due', 'inspection_scheduled',
        'compliance_issue', 'documentation_missing', 'record_keeping_issue'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    due_date DATE,
    resolved_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed', 'escalated')),
    assigned_to UUID REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT dea_alerts_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- DEA Compliance Score table
CREATE TABLE dea_compliance_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    max_score INTEGER DEFAULT 100,
    category VARCHAR(100), -- 'registration', 'training', 'inspections', 'inventory', 'diversion_prevention'
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    factors JSONB, -- Detailed scoring factors
    trend_direction VARCHAR(10) CHECK (trend_direction IN ('improving', 'stable', 'declining')),
    
    CONSTRAINT dea_scores_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- ========================================
-- MEDICARE-MEDICAID ENROLLMENT AND COMPLIANCE MODULE
-- ========================================

-- Medicare Provider Enrollment table
CREATE TABLE medicare_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    npi_number VARCHAR(10) NOT NULL, -- National Provider Identifier
    ptan_number VARCHAR(12), -- Provider Transaction Access Number
    enrollment_type VARCHAR(50) NOT NULL CHECK (enrollment_type IN (
        'individual', 'group', 'organization', 'facility'
    )),
    provider_type VARCHAR(100) NOT NULL, -- e.g., 'Physician', 'Hospital', 'Clinic'
    specialty VARCHAR(100), -- Medical specialty
    enrollment_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'revoked', 'pending', 'under_review')),
    revalidation_date DATE,
    last_revalidation_date DATE,
    enrollment_document_url TEXT,
    pecos_status VARCHAR(20) DEFAULT 'not_enrolled', -- PECOS enrollment status
    medicare_participation_indicator BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT medicare_enrollments_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(npi_number, tenant_id)
);

-- Medicaid Provider Enrollment table
CREATE TABLE medicaid_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    npi_number VARCHAR(10) NOT NULL,
    state_code VARCHAR(2) NOT NULL, -- State-specific Medicaid program
    medicaid_provider_id VARCHAR(50), -- State-specific provider ID
    enrollment_type VARCHAR(50) NOT NULL CHECK (enrollment_type IN (
        'individual', 'group', 'organization', 'facility'
    )),
    provider_type VARCHAR(100) NOT NULL,
    specialty VARCHAR(100),
    enrollment_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'revoked', 'pending', 'under_review')),
    revalidation_date DATE,
    last_revalidation_date DATE,
    enrollment_document_url TEXT,
    managed_care_plans TEXT[], -- Enrolled managed care plans
    fee_schedule VARCHAR(100), -- State fee schedule
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT medicaid_enrollments_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(npi_number, state_code, tenant_id)
);

-- Billing Compliance Programs table
CREATE TABLE billing_compliance_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    program_type VARCHAR(100) NOT NULL CHECK (program_type IN (
        'coding_compliance', 'billing_audits', 'charge_capture', 'claim_submission',
        'fraud_detection', 'documentation_requirements', 'upcoding_prevention'
    )),
    program_title VARCHAR(255) NOT NULL,
    program_description TEXT,
    implementation_date DATE,
    last_review_date DATE,
    next_review_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_review', 'expired')),
    responsible_person VARCHAR(255),
    program_document_url TEXT,
    compliance_requirements JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT billing_programs_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Billing Audit Records table
CREATE TABLE billing_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    audit_date DATE NOT NULL,
    audit_type VARCHAR(50) CHECK (audit_type IN (
        'internal', 'external', 'payer', 'government', 'recovery_audit'
    )),
    audit_agency VARCHAR(255),
    audit_period_start DATE,
    audit_period_end DATE,
    claims_sampled INTEGER,
    claims_with_errors INTEGER,
    total_overpayment DECIMAL(12,2),
    findings JSONB, -- Array of audit findings
    compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
    corrective_actions_required JSONB,
    follow_up_date DATE,
    audit_status VARCHAR(20) DEFAULT 'pending' CHECK (audit_status IN (
        'in_progress', 'completed', 'appealed', 'resolved', 'pending_correction'
    )),
    audit_report_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT billing_audits_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Fraud Prevention Training table
CREATE TABLE fraud_prevention_training (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    training_type VARCHAR(100) NOT NULL CHECK (training_type IN (
        'fraud_waste_abuse', 'compliance_ethics', 'billing_integrity',
        'documentation_standards', 'coding_guidelines', 'reporting_obligations'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(50) CHECK (frequency IN ('initial', 'annual', 'biennial', 'as_needed')),
    required_for_roles TEXT[], -- Array of roles requiring this training
    training_duration_minutes INTEGER,
    certification_required BOOLEAN DEFAULT false,
    mandated_by VARCHAR(100), -- e.g., 'CMS', 'OIG', 'State Medicaid'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fraud_training_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Fraud Prevention Training Records table
CREATE TABLE fraud_prevention_training_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    training_requirement_id UUID REFERENCES fraud_prevention_training(id) ON DELETE CASCADE,
    completion_date DATE NOT NULL,
    expiration_date DATE,
    trainer_name VARCHAR(255),
    training_method VARCHAR(50) CHECK (training_method IN ('classroom', 'online', 'on_the_job', 'video', 'webinar')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    certificate_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fraud_training_records_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(user_id, training_requirement_id, completion_date)
);

-- Medicare-Medicaid Compliance Alerts table
CREATE TABLE medicare_medicaid_compliance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL CHECK (alert_type IN (
        'revalidation_due', 'enrollment_expiring', 'audit_scheduled', 'compliance_issue',
        'training_required', 'documentation_missing', 'billing_anomaly', 'deadline_reminder'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    due_date DATE,
    resolved_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed', 'escalated')),
    assigned_to UUID REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT mm_alerts_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Medicare-Medicaid Compliance Score table
CREATE TABLE medicare_medicaid_compliance_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    max_score INTEGER DEFAULT 100,
    category VARCHAR(100), -- 'enrollment', 'billing', 'audits', 'training', 'fraud_prevention'
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    factors JSONB, -- Detailed scoring factors
    trend_direction VARCHAR(10) CHECK (trend_direction IN ('improving', 'stable', 'declining')),
    
    CONSTRAINT mm_scores_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Provider Credentialing Documents table
CREATE TABLE provider_credentialing_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL CHECK (document_type IN (
        'license', 'dea_certificate', 'board_certification', 'malpractice_insurance',
        'diploma', 'transcripts', 'reference_letters', 'privileging_documents'
    )),
    document_title VARCHAR(255) NOT NULL,
    document_url TEXT,
    expiration_date DATE,
    issuing_authority VARCHAR(255),
    credential_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending', 'revoked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT credentialing_docs_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Compliance Monitoring Activities table
CREATE TABLE compliance_monitoring_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL CHECK (activity_type IN (
        'claim_review', 'documentation_audit', 'coding_validation', 'charge_capture_review',
        'compliance_assessment', 'risk_assessment', 'internal_audit'
    )),
    activity_title VARCHAR(255) NOT NULL,
    activity_description TEXT,
    activity_date DATE NOT NULL,
    reviewer_name VARCHAR(255),
    scope TEXT, -- Description of what was reviewed
    findings JSONB, -- Array of findings
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    corrective_actions JSONB,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    activity_document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT monitoring_activities_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- ========================================
-- ACCREDITATION COMPLIANCE MODULE
-- ========================================

-- Accreditation Bodies table
CREATE TABLE accreditation_bodies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    body_name VARCHAR(100) NOT NULL CHECK (body_name IN (
        'tjc', 'aaahc', 'carf', 'achc', 'dnv_gl', 'state_accreditation', 'other'
    )),
    body_display_name VARCHAR(255) NOT NULL,
    accreditation_type VARCHAR(50) CHECK (accreditation_type IN (
        'hospital', 'ambulatory', 'rehabilitation', 'home_health', 'laboratory', 'behavioral_health'
    )),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'withdrawn')),
    accreditation_number VARCHAR(100),
    initial_accreditation_date DATE,
    current_accreditation_date DATE,
    expiration_date DATE,
    survey_cycle_years INTEGER DEFAULT 3,
    deemed_status BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT accreditation_bodies_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Accreditation Surveys table
CREATE TABLE accreditation_surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    accreditation_body_id UUID REFERENCES accreditation_bodies(id) ON DELETE CASCADE,
    survey_type VARCHAR(50) CHECK (survey_type IN (
        'initial', 'triennial', 'random', 'for_cause', 'focused', 'reaccreditation'
    )),
    survey_date DATE NOT NULL,
    survey_end_date DATE,
    survey_status VARCHAR(20) DEFAULT 'scheduled' CHECK (survey_status IN (
        'scheduled', 'in_progress', 'completed', 'passed', 'failed', 'conditional', 'appealed'
    )),
    surveyors TEXT, -- Array of surveyor names
    survey_scope TEXT, -- Description of survey scope
    survey_duration_days INTEGER,
    preliminary_findings JSONB, -- Preliminary findings
    final_report_date DATE,
    accreditation_decision VARCHAR(50), -- e.g., 'Full Accreditation', 'Provisional', 'Denial'
    next_survey_date DATE,
    survey_report_url TEXT,
    preparation_start_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT accreditation_surveys_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Accreditation Standards table
CREATE TABLE accreditation_standards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    accreditation_body_id UUID REFERENCES accreditation_bodies(id) ON DELETE CASCADE,
    standard_category VARCHAR(100) NOT NULL, -- e.g., 'Patient Rights', 'Medication Management'
    standard_code VARCHAR(50) NOT NULL, -- e.g., 'PC.01.02.01'
    standard_title TEXT NOT NULL,
    standard_description TEXT,
    compliance_level VARCHAR(20) CHECK (compliance_level IN (
        'compliant', 'partial_compliance', 'non_compliant', 'not_assessed', 'not_applicable'
    )),
    last_assessment_date DATE,
    next_assessment_date DATE,
    evidence_documents TEXT[], -- Array of evidence document URLs
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT accreditation_standards_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Survey Findings table
CREATE TABLE accreditation_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    survey_id UUID REFERENCES accreditation_surveys(id) ON DELETE CASCADE,
    standard_id UUID REFERENCES accreditation_standards(id) ON DELETE CASCADE,
    finding_type VARCHAR(20) CHECK (finding_type IN (
        'deficiency', 'observation', 'recommendation', 'citation', 'opportunity_for_improvement'
    )),
    severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low', 'informational')),
    finding_title VARCHAR(255) NOT NULL,
    finding_description TEXT NOT NULL,
    evidence_cited TEXT, -- Evidence cited for finding
    compliance_requirement TEXT, -- What compliance requires
    corrective_action_required BOOLEAN DEFAULT true,
    due_date DATE, -- Due date for corrective action
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'verified', 'overdue')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT accreditation_findings_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Corrective Action Plans table
CREATE TABLE corrective_action_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    finding_id UUID REFERENCES accreditation_findings(id) ON DELETE CASCADE,
    action_description TEXT NOT NULL,
    responsible_person VARCHAR(255),
    completion_date DATE,
    actual_completion_date DATE,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN (
        'planned', 'in_progress', 'completed', 'verified', 'rejected', 'overdue'
    )),
    resources_required TEXT,
    barriers TEXT,
    verification_method TEXT,
    effectiveness_assessment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT corrective_action_plans_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Continuous Readiness Activities table
CREATE TABLE continuous_readiness_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    accreditation_body_id UUID REFERENCES accreditation_bodies(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) CHECK (activity_type IN (
        'mock_survey', 'tracers', 'document_review', 'staff_training', 'policy_update',
        'gap_analysis', 'performance_improvement', 'compliance_audit'
    )),
    activity_title VARCHAR(255) NOT NULL,
    activity_description TEXT,
    activity_date DATE NOT NULL,
    participants TEXT[], -- Array of participant names/roles
    scope TEXT, -- Description of activity scope
    findings JSONB, -- Array of findings
    readiness_score INTEGER CHECK (readiness_score >= 0 AND readiness_score <= 100),
    action_items JSONB, -- Array of action items
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    activity_document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT continuous_readiness_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Accreditation Compliance Alerts table
CREATE TABLE accreditation_compliance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL CHECK (alert_type IN (
        'survey_scheduled', 'survey_due', 'finding_deadline', 'corrective_action_due',
        'accreditation_expiring', 'readiness_gap', 'standard_update', 'documentation_missing'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    due_date DATE,
    resolved_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed', 'escalated')),
    assigned_to UUID REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT accreditation_alerts_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Accreditation Compliance Score table
CREATE TABLE accreditation_compliance_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    accreditation_body_id UUID REFERENCES accreditation_bodies(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    max_score INTEGER DEFAULT 100,
    category VARCHAR(100), -- 'standards_compliance', 'survey_readiness', 'corrective_actions', 'continuous_readiness'
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    factors JSONB, -- Detailed scoring factors
    trend_direction VARCHAR(10) CHECK (trend_direction IN ('improving', 'stable', 'declining')),
    
    CONSTRAINT accreditation_scores_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Performance Improvement Projects table
CREATE TABLE performance_improvement_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    project_title VARCHAR(255) NOT NULL,
    project_description TEXT,
    accreditation_standard_id UUID REFERENCES accreditation_standards(id) ON DELETE CASCADE,
    project_type VARCHAR(50) CHECK (project_type IN (
        'process_improvement', 'quality_improvement', 'safety_improvement', 'patient_experience'
    )),
    start_date DATE NOT NULL,
    target_completion_date DATE,
    actual_completion_date DATE,
    status VARCHAR(20) DEFAULT 'planning' CHECK (status IN (
        'planning', 'in_progress', 'completed', 'on_hold', 'cancelled'
    )),
    team_members TEXT[], -- Array of team members
    objectives TEXT, -- Project objectives
    measures TEXT, -- Success measures
    outcomes TEXT, -- Project outcomes
    sustainability_plan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT pi_projects_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- PHI Protection Tables (NEW)

-- PHI Audit Log for compliance tracking
CREATE TABLE phi_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'document_uploaded', 'document_created', 'upload_blocked', 
        'document_quarantined', 'phi_detected', 'phi_confirmed', 'phi_rejected'
    )),
    event_details JSONB NOT NULL,
    phi_risk_score DECIMAL(3,2) CHECK (phi_risk_score >= 0 AND phi_risk_score <= 1),
    phi_detections JSONB,
    blocked BOOLEAN DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT phi_audit_log_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Enhanced Documents table with PHI fields
ALTER TABLE documents ADD COLUMN IF NOT EXISTS phi_risk_score DECIMAL(3,2) CHECK (phi_risk_score >= 0 AND phi_risk_score <= 1);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS phi_confidence DECIMAL(3,2) CHECK (phi_confidence >= 0 AND phi_confidence <= 1);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS phi_detections JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS phi_validated BOOLEAN DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS phi_validation_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS quarantine_reason TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS quarantine_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS quarantine_notes TEXT;

-- PHI Detection Patterns (for admin configuration)
CREATE TABLE phi_detection_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    pattern_name VARCHAR(100) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN (
        'regex', 'keyword', 'contextual', 'ml_model'
    )),
    pattern_value TEXT NOT NULL,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1),
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT phi_detection_patterns_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(tenant_id, pattern_name)
);

-- PHI Statistics (for dashboard metrics)
CREATE TABLE phi_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    date_bucket DATE NOT NULL,
    total_uploads INTEGER DEFAULT 0,
    blocked_uploads INTEGER DEFAULT 0,
    high_risk_detections INTEGER DEFAULT 0,
    medium_risk_detections INTEGER DEFAULT 0,
    low_risk_detections INTEGER DEFAULT 0,
    average_risk_score DECIMAL(3,2) DEFAULT 0,
    false_positive_rate DECIMAL(3,2) DEFAULT 0,
    user_compliance_rate DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT phi_statistics_tenant_check CHECK (tenant_id IS NOT NULL),
    UNIQUE(tenant_id, date_bucket)
);

-- PHI User Education Tracking
CREATE TABLE phi_user_education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    education_type VARCHAR(50) NOT NULL CHECK (education_type IN (
        'phi_warning_dismissed', 'phi_modal_viewed', 'phi_confirmation_shown', 
        'phi_help_accessed', 'phi_training_completed'
    )),
    education_details JSONB,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT phi_user_education_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- Indexes for PHI tables
CREATE INDEX idx_phi_audit_log_tenant_timestamp ON phi_audit_log(tenant_id, timestamp DESC);
CREATE INDEX idx_phi_audit_log_user_timestamp ON phi_audit_log(user_id, timestamp DESC);
CREATE INDEX idx_phi_audit_log_event_type ON phi_audit_log(event_type);
CREATE INDEX idx_phi_audit_log_blocked ON phi_audit_log(blocked);

CREATE INDEX idx_documents_phi_risk_score ON documents(phi_risk_score) WHERE phi_risk_score IS NOT NULL;
CREATE INDEX idx_documents_quarantine_date ON documents(quarantine_date) WHERE quarantine_date IS NOT NULL;
CREATE INDEX idx_documents_phi_validated ON documents(phi_validated);

CREATE INDEX idx_phi_statistics_date_bucket ON phi_statistics(date_bucket DESC);
CREATE INDEX idx_phi_user_education_user_completed ON phi_user_education(user_id, completed_at DESC);

-- Row Level Security (RLS) for PHI tables
ALTER TABLE phi_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE phi_detection_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE phi_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE phi_user_education ENABLE ROW LEVEL SECURITY;

-- RLS Policies for PHI Audit Log
CREATE POLICY "Users can view own PHI audit logs" ON phi_audit_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all PHI audit logs in tenant" ON phi_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.tenant_id = phi_audit_log.tenant_id 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "System can insert PHI audit logs" ON phi_audit_log
    FOR INSERT WITH CHECK (true);

-- RLS Policies for PHI Detection Patterns
CREATE POLICY "Admins can manage PHI detection patterns" ON phi_detection_patterns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.tenant_id = phi_detection_patterns.tenant_id 
            AND users.role = 'admin'
        )
    );

-- RLS Policies for PHI Statistics
CREATE POLICY "Admins can view PHI statistics" ON phi_statistics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.tenant_id = phi_statistics.tenant_id 
            AND users.role = 'admin'
        )
    );

-- RLS Policies for PHI User Education
CREATE POLICY "Users can view own education records" ON phi_user_education
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert education records" ON phi_user_education
    FOR INSERT WITH CHECK (true);

-- Functions for PHI Statistics Aggregation
CREATE OR REPLACE FUNCTION update_phi_statistics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO phi_statistics (
        tenant_id,
        date_bucket,
        total_uploads,
        blocked_uploads,
        high_risk_detections,
        medium_risk_detections,
        low_risk_detections,
        average_risk_score
    )
    VALUES (
        NEW.tenant_id,
        CURRENT_DATE,
        CASE WHEN NEW.event_type = 'document_uploaded' THEN 1 ELSE 0 END,
        CASE WHEN NEW.blocked = true THEN 1 ELSE 0 END,
        CASE WHEN NEW.phi_risk_score > 0.7 THEN 1 ELSE 0 END,
        CASE WHEN NEW.phi_risk_score > 0.4 AND NEW.phi_risk_score <= 0.7 THEN 1 ELSE 0 END,
        CASE WHEN NEW.phi_risk_score > 0 AND NEW.phi_risk_score <= 0.4 THEN 1 ELSE 0 END,
        COALESCE(NEW.phi_risk_score, 0)
    )
    ON CONFLICT (tenant_id, date_bucket)
    DO UPDATE SET
        total_uploads = phi_statistics.total_uploads + 
            CASE WHEN NEW.event_type = 'document_uploaded' THEN 1 ELSE 0 END,
        blocked_uploads = phi_statistics.blocked_uploads + 
            CASE WHEN NEW.blocked = true THEN 1 ELSE 0 END,
        high_risk_detections = phi_statistics.high_risk_detections + 
            CASE WHEN NEW.phi_risk_score > 0.7 THEN 1 ELSE 0 END,
        medium_risk_detections = phi_statistics.medium_risk_detections + 
            CASE WHEN NEW.phi_risk_score > 0.4 AND NEW.phi_risk_score <= 0.7 THEN 1 ELSE 0 END,
        low_risk_detections = phi_statistics.low_risk_detections + 
            CASE WHEN NEW.phi_risk_score > 0 AND NEW.phi_risk_score <= 0.4 THEN 1 ELSE 0 END,
        average_risk_score = (phi_statistics.average_risk_score * phi_statistics.total_uploads + COALESCE(NEW.phi_risk_score, 0)) / 
            (phi_statistics.total_uploads + 1),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update PHI statistics
CREATE TRIGGER trigger_update_phi_statistics
    AFTER INSERT ON phi_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION update_phi_statistics();

-- Function to clean up old PHI audit logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_phi_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM phi_audit_log 
    WHERE timestamp < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Default PHI Detection Patterns
INSERT INTO phi_detection_patterns (tenant_id, pattern_name, pattern_type, pattern_value, confidence_threshold, description) VALUES
    ('00000000-0000-0000-0000-000000000000', 'ssn_pattern', 'regex', '\b\d{3}-\d{2}-\d{4}\b', 0.95, 'Social Security Number format'),
    ('00000000-0000-0000-0000-000000000000', 'mrn_pattern', 'regex', '\b(MRN|MR\s*#|Medical\s*Record\s*#?)\s*[:#]?\s*(\w{4,12})\b', 0.90, 'Medical Record Number pattern'),
    ('00000000-0000-0000-0000-000000000000', 'patient_name_context', 'contextual', 'patient name', 0.80, 'Patient name in context'),
    ('00000000-0000-0000-0000-000000000000', 'dob_pattern', 'regex', '\b(DOB|Date\s*of\s*Birth)\s*[:#]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b', 0.85, 'Date of Birth pattern'),
    ('00000000-0000-0000-0000-000000000000', 'icd10_pattern', 'regex', '\b[A-Z]\d{2}(?:\.\d{1,3})?\b', 0.80, 'ICD-10 Diagnosis Code pattern')
ON CONFLICT (tenant_id, pattern_name) DO NOTHING;
