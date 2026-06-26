-- TrustMD Compliance Templates Database Schema
-- Schema for storing compliance templates and generated reports

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Compliance Templates Table
CREATE TABLE IF NOT EXISTS compliance_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    template_name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    state_code TEXT,
    tier INTEGER,
    multiplier DECIMAL(3,2) DEFAULT 1.0,
    version TEXT NOT NULL,
    description TEXT,
    regulatory_references TEXT[],
    template_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT compliance_templates_tenant_template UNIQUE (tenant_id, template_id)
);

-- Compliance Reports Table
CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    template_name TEXT NOT NULL,
    report_data JSONB NOT NULL,
    overall_score DECIMAL(5,2),
    grade TEXT,
    passed BOOLEAN,
    total_requirements INTEGER,
    completed_requirements INTEGER,
    critical_gaps INTEGER,
    high_priority_gaps INTEGER,
    date_range JSONB,
    state_multiplier DECIMAL(3,2) DEFAULT 1.0,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    INDEX idx_compliance_reports_tenant_template (tenant_id, template_id),
    INDEX idx_compliance_reports_generated_at (generated_at),
    INDEX idx_compliance_reports_score (overall_score)
);

-- Compliance Requirements Tracking Table
CREATE TABLE IF NOT EXISTS compliance_requirement_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    report_id UUID REFERENCES compliance_reports(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    requirement_id TEXT NOT NULL,
    requirement_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'not_started', 'in_progress', 'completed', 'overdue'
    completed BOOLEAN DEFAULT false,
    points INTEGER NOT NULL,
    risk_level TEXT,
    mandatory BOOLEAN DEFAULT false,
    evidence_required TEXT[],
    evidence_provided JSONB DEFAULT '[]'::jsonb,
    automated_checks JSONB DEFAULT '{}'::jsonb,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    INDEX idx_compliance_requirement_tenant_req (tenant_id, requirement_id),
    INDEX idx_compliance_requirement_status (status),
    INDEX idx_compliance_requirement_due_date (due_date)
);

-- Compliance Evidence Table
CREATE TABLE IF NOT EXISTS compliance_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    requirement_status_id UUID REFERENCES compliance_requirement_status(id) ON DELETE CASCADE,
    evidence_type TEXT NOT NULL,
    file_name TEXT,
    file_path TEXT,
    file_size BIGINT,
    mime_type TEXT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiration_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Indexes
    INDEX idx_compliance_evidence_tenant_type (tenant_id, evidence_type),
    INDEX idx_compliance_evidence_requirement (requirement_status_id),
    INDEX idx_compliance_evidence_upload_date (upload_date)
);

-- Automated Check Results Table
CREATE TABLE IF NOT EXISTS compliance_automated_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    requirement_id TEXT NOT NULL,
    check_type TEXT NOT NULL,
    check_result BOOLEAN NOT NULL,
    check_details JSONB DEFAULT '{}'::jsonb,
    last_run TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_run TIMESTAMP WITH TIME ZONE,
    frequency TEXT, -- 'daily', 'weekly', 'monthly'
    is_active BOOLEAN DEFAULT true,
    
    -- Indexes
    INDEX idx_compliance_checks_tenant_check (tenant_id, check_type),
    INDEX idx_compliance_checks_next_run (next_run),
    INDEX idx_compliance_checks_result (check_result)
);

-- State Configuration Table
CREATE TABLE IF NOT EXISTS state_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_code TEXT NOT NULL UNIQUE,
    state_name TEXT NOT NULL,
    tier INTEGER NOT NULL,
    multiplier DECIMAL(3,2) NOT NULL,
    regulatory_references TEXT[],
    specific_requirements JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template Usage Analytics Table
CREATE TABLE IF NOT EXISTS compliance_template_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    template_name TEXT NOT NULL,
    access_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL, -- 'view', 'generate_report', 'download'
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Indexes
    INDEX idx_compliance_usage_tenant_template (tenant_id, template_id),
    INDEX idx_compliance_usage_access_date (access_date),
    INDEX idx_compliance_usage_action (action)
);

-- Compliance Score History Table
CREATE TABLE IF NOT EXISTS compliance_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    grade TEXT,
    passed BOOLEAN,
    critical_requirements_met INTEGER,
    total_critical_requirements INTEGER,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_range_start TIMESTAMP WITH TIME ZONE,
    date_range_end TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    INDEX idx_compliance_score_tenant_template (tenant_id, template_id),
    INDEX idx_compliance_score_calculated_at (calculated_at),
    INDEX idx_compliance_score_score (score)
);

-- Create Row Level Security (RLS) Policies
ALTER TABLE compliance_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_requirement_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_automated_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_template_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_score_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy for compliance_templates
CREATE POLICY "compliance_templates_tenant_isolation" ON compliance_templates
    FOR ALL
    USING (tenant_id = auth.uid())
    WITH CHECK (tenant_id = auth.uid());

-- RLS Policy for compliance_reports
CREATE POLICY "compliance_reports_tenant_isolation" ON compliance_reports
    FOR ALL
    USING (tenant_id = auth.uid())
    WITH CHECK (tenant_id = auth.uid());

-- RLS Policy for compliance_requirement_status
CREATE POLICY "compliance_requirement_status_tenant_isolation" ON compliance_requirement_status
    FOR ALL
    USING (tenant_id = auth.uid())
    WITH CHECK (tenant_id = auth.uid());

-- RLS Policy for compliance_evidence
CREATE POLICY "compliance_evidence_tenant_isolation" ON compliance_evidence
    FOR ALL
    USING (tenant_id = auth.uid())
    WITH CHECK (tenant_id = auth.uid());

-- RLS Policy for compliance_automated_checks
CREATE POLICY "compliance_automated_checks_tenant_isolation" ON compliance_automated_checks
    FOR ALL
    USING (tenant_id = auth.uid())
    WITH CHECK (tenant_id = auth.uid());

-- RLS Policy for compliance_template_usage
CREATE POLICY "compliance_template_usage_tenant_isolation" ON compliance_template_usage
    FOR ALL
    USING (tenant_id = auth.uid())
    WITH CHECK (tenant_id = auth.uid());

-- RLS Policy for compliance_score_history
CREATE POLICY "compliance_score_history_tenant_isolation" ON compliance_score_history
    FOR ALL
    USING (tenant_id = auth.uid())
    WITH CHECK (tenant_id = auth.uid());

-- Create Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create Triggers for Updated At
CREATE TRIGGER update_compliance_templates_updated_at 
    BEFORE UPDATE ON compliance_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_state_configurations_updated_at 
    BEFORE UPDATE ON state_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert Default State Configurations
INSERT INTO state_configurations (state_code, state_name, tier, multiplier, regulatory_references) VALUES
-- Tier 1 States (1.4x multiplier)
('CA', 'California', 1, 1.4, ARRAY['California Business and Professions Code', 'California Health and Safety Code', 'CCPA/CPRA Privacy Laws']),
('NY', 'New York', 1, 1.4, ARRAY['New York Education Law', 'Public Health Law', 'NYSTOP Prescription Monitoring']),
('FL', 'Florida', 1, 1.4, ARRAY['Florida Statutes Chapter 456', 'Florida Administrative Code', 'E-FORCSE PDMP']),
('TX', 'Texas', 1, 1.4, ARRAY['Texas Occupations Code', 'Texas Administrative Code', 'TMB Regulations']),
('IL', 'Illinois', 1, 1.4, ARRAY['Illinois Medical Practice Act', 'Illinois Administrative Code', 'IL PDMP']),

-- Tier 2 States (1.3x multiplier)
('PA', 'Pennsylvania', 2, 1.3, ARRAY['Pennsylvania Medical Practice Act', 'Pennsylvania Administrative Code']),
('OH', 'Ohio', 2, 1.3, ARRAY['Ohio Medical Practice Act', 'Ohio Administrative Code']),
('GA', 'Georgia', 2, 1.3, ARRAY['Georgia Medical Practice Act', 'Georgia Administrative Code']),
('NC', 'North Carolina', 2, 1.3, ARRAY['North Carolina Medical Practice Act', 'North Carolina Administrative Code']),
('MI', 'Michigan', 2, 1.3, ARRAY['Michigan Medical Practice Act', 'Michigan Administrative Code']),
('NJ', 'New Jersey', 2, 1.3, ARRAY['New Jersey Medical Practice Act', 'New Jersey Administrative Code']),
('VA', 'Virginia', 2, 1.3, ARRAY['Virginia Medical Practice Act', 'Virginia Administrative Code']),
('WA', 'Washington', 2, 1.3, ARRAY['Washington Medical Practice Act', 'Washington Administrative Code']),
('AZ', 'Arizona', 2, 1.3, ARRAY['Arizona Medical Practice Act', 'Arizona Administrative Code']),
('MA', 'Massachusetts', 2, 1.3, ARRAY['Massachusetts Medical Practice Act', 'Massachusetts Administrative Code']),

-- Tier 3 States (1.2x multiplier)
('CO', 'Colorado', 3, 1.2, ARRAY['Colorado Medical Practice Act', 'Colorado Administrative Code']),
('MN', 'Minnesota', 3, 1.2, ARRAY['Minnesota Medical Practice Act', 'Minnesota Administrative Code']),
('SC', 'South Carolina', 3, 1.2, ARRAY['South Carolina Medical Practice Act', 'South Carolina Administrative Code']),
('AL', 'Alabama', 3, 1.2, ARRAY['Alabama Medical Practice Act', 'Alabama Administrative Code']),
('LA', 'Louisiana', 3, 1.2, ARRAY['Louisiana Medical Practice Act', 'Louisiana Administrative Code']),
('KY', 'Kentucky', 3, 1.2, ARRAY['Kentucky Medical Practice Act', 'Kentucky Administrative Code']),
('OK', 'Oklahoma', 3, 1.2, ARRAY['Oklahoma Medical Practice Act', 'Oklahoma Administrative Code']),
('OR', 'Oregon', 3, 1.2, ARRAY['Oregon Medical Practice Act', 'Oregon Administrative Code']),
('CT', 'Connecticut', 3, 1.2, ARRAY['Connecticut Medical Practice Act', 'Connecticut Administrative Code']),
('UT', 'Utah', 3, 1.2, ARRAY['Utah Medical Practice Act', 'Utah Administrative Code']),

-- Tier 4 States (1.0x multiplier)
('NM', 'New Mexico', 4, 1.0, ARRAY['New Mexico Medical Practice Act', 'New Mexico Administrative Code']),
('NE', 'Nebraska', 4, 1.0, ARRAY['Nebraska Medical Practice Act', 'Nebraska Administrative Code']),
('WV', 'West Virginia', 4, 1.0, ARRAY['West Virginia Medical Practice Act', 'West Virginia Administrative Code']),
('ID', 'Idaho', 4, 1.0, ARRAY['Idaho Medical Practice Act', 'Idaho Administrative Code']),
('HI', 'Hawaii', 4, 1.0, ARRAY['Hawaii Medical Practice Act', 'Hawaii Administrative Code']),
('NH', 'New Hampshire', 4, 1.0, ARRAY['New Hampshire Medical Practice Act', 'New Hampshire Administrative Code']),
('ME', 'Maine', 4, 1.0, ARRAY['Maine Medical Practice Act', 'Maine Administrative Code']),
('MT', 'Montana', 4, 1.0, ARRAY['Montana Medical Practice Act', 'Montana Administrative Code']),
('RI', 'Rhode Island', 4, 1.0, ARRAY['Rhode Island Medical Practice Act', 'Rhode Island Administrative Code']),
('DE', 'Delaware', 4, 1.0, ARRAY['Delaware Medical Practice Act', 'Delaware Administrative Code']),
('SD', 'South Dakota', 4, 1.0, ARRAY['South Dakota Medical Practice Act', 'South Dakota Administrative Code']),
('ND', 'North Dakota', 4, 1.0, ARRAY['North Dakota Medical Practice Act', 'North Dakota Administrative Code']),
('AK', 'Alaska', 4, 1.0, ARRAY['Alaska Medical Practice Act', 'Alaska Administrative Code']),
('VT', 'Vermont', 4, 1.0, ARRAY['Vermont Medical Practice Act', 'Vermont Administrative Code']),
('WY', 'Wyoming', 4, 1.0, ARRAY['Wyoming Medical Practice Act', 'Wyoming Administrative Code'])
ON CONFLICT (state_code) DO NOTHING;

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_compliance_templates_category ON compliance_templates(category);
CREATE INDEX IF NOT EXISTS idx_compliance_templates_state ON compliance_templates(state_code);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_tenant_score ON compliance_reports(tenant_id, overall_score);
CREATE INDEX IF NOT EXISTS idx_compliance_requirement_status_section ON compliance_requirement_status(section_id);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_type ON compliance_evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_compliance_automated_checks_frequency ON compliance_automated_checks(frequency);

-- Grant Permissions (adjust as needed for your setup)
-- GRANT ALL ON compliance_templates TO authenticated_users;
-- GRANT ALL ON compliance_reports TO authenticated_users;
-- GRANT ALL ON compliance_requirement_status TO authenticated_users;
-- GRANT ALL ON compliance_evidence TO authenticated_users;
-- GRANT ALL ON compliance_automated_checks TO authenticated_users;
-- GRANT ALL ON compliance_template_usage TO authenticated_users;
-- GRANT ALL ON compliance_score_history TO authenticated_users;
-- GRANT SELECT ON state_configurations TO authenticated_users;
