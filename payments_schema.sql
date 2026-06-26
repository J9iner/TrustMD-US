-- TrustMD Payment Database Schema
-- Add payment tracking tables to support Stripe integration

-- Add payment fields to existing tenants table
ALTER TABLE tenants 
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN subscription_plan TEXT DEFAULT 'single-practice-monthly',
ADD COLUMN subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN subscription_id TEXT,
ADD COLUMN subscription_tier TEXT DEFAULT 'single',
ADD COLUMN practice_type TEXT DEFAULT 'single',
ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN subscription_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN billing_email TEXT,
ADD COLUMN billing_address JSONB,
ADD COLUMN payment_method_id TEXT,
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create payments table for transaction tracking
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_charge_id TEXT,
    amount INTEGER NOT NULL, -- in cents
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL, -- succeeded, failed, pending, canceled
    payment_method_type TEXT, -- card, bank_transfer, etc.
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoices table for billing records
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stripe_invoice_id TEXT UNIQUE,
    stripe_subscription_id TEXT,
    amount INTEGER NOT NULL, -- in cents
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL, -- draft, open, paid, void, uncollectible
    due_date TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    hosted_invoice_url TEXT,
    invoice_pdf TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscription_plans table for plan management
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- in cents
    currency TEXT DEFAULT 'usd',
    interval TEXT NOT NULL DEFAULT 'month', -- month, year
    interval_count INTEGER DEFAULT 1,
    stripe_price_id TEXT UNIQUE,
    features JSONB,
    limits JSONB, -- usage limits
    trial_period_days INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_methods table for customer payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stripe_payment_method_id TEXT UNIQUE,
    type TEXT NOT NULL, -- card, bank_account, etc.
    brand TEXT, -- visa, mastercard, etc.
    last4 TEXT,
    expiry_month INTEGER,
    expiry_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_records table for tracking usage-based billing
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stripe_usage_record_id TEXT UNIQUE,
    quantity INTEGER NOT NULL,
    action TEXT NOT NULL, -- increment, set
    subscription_item_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create billing_events table for audit trail
CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- subscription.created, invoice.paid, etc.
    stripe_event_id TEXT UNIQUE,
    data JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create discounts table for promotional codes
CREATE TABLE IF NOT EXISTS discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL, -- percentage, fixed_amount
    discount_amount INTEGER NOT NULL, -- in cents or percentage
    currency TEXT DEFAULT 'usd',
    duration TEXT NOT NULL, -- once, repeating, forever
    duration_in_months INTEGER,
    max_redemptions INTEGER,
    times_redeemed INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customer_discounts table for applied discounts
CREATE TABLE IF NOT EXISTS customer_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    stripe_coupon_id TEXT,
    stripe_promotion_code_id TEXT,
    is_active BOOLEAN DEFAULT true,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, discount_id)
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, display_name, description, price, interval, stripe_price_id, features, limits, trial_period_days) VALUES
(
    'single-practice-monthly',
    'Single Practice - Monthly',
    'Complete compliance tracking for single practice location',
    29900, -- $299.00 in cents
    'month',
    'price_1OaBzZ2eZvKYlo2C7aBcX123',
    '["Single practice location", "Unlimited users", "Unlimited storage", "Full compliance tracking suite", "Priority support", "Real-time monitoring", "Custom reports", "API access", "Monthly billing"]',
    '{"users": -1, "storage_gb": -1, "reports_per_month": -1, "practices": 1}',
    14
),
(
    'single-practice-yearly',
    'Single Practice - Yearly',
    'Complete compliance tracking for single practice location with annual savings',
    299900, -- $2,999.00 in cents
    'year',
    'price_1OaBzZ2eZvKYlo2C7aBcX456',
    '["Single practice location", "Unlimited users", "Unlimited storage", "Full compliance tracking suite", "Priority support", "Real-time monitoring", "Custom reports", "API access", "Annual billing (Save $591)", "2 months free"]',
    '{"users": -1, "storage_gb": -1, "reports_per_month": -1, "practices": 1}',
    14
),
(
    'additional-practice-monthly',
    'Additional Practice - Monthly',
    'Complete compliance tracking for additional practice locations',
    24900, -- $249.00 in cents
    'month',
    'price_1OaBzZ2eZvKYlo2C7aBcX789',
    '["Additional practice location", "Unlimited users", "Unlimited storage", "Full compliance tracking suite", "Priority support", "Real-time monitoring", "Custom reports", "API access", "Monthly billing"]',
    '{"users": -1, "storage_gb": -1, "reports_per_month": -1, "practices": 1}',
    14
),
(
    'additional-practice-yearly',
    'Additional Practice - Yearly',
    'Complete compliance tracking for additional practice locations with annual savings',
    249900, -- $2,499.00 in cents
    'year',
    'price_1OaBzZ2eZvKYlo2C7aBcX012',
    '["Additional practice location", "Unlimited users", "Unlimited storage", "Full compliance tracking suite", "Priority support", "Real-time monitoring", "Custom reports", "API access", "Annual billing (Save $489)", "2 months free"]',
    '{"users": -1, "storage_gb": -1, "reports_per_month": -1, "practices": 1}',
    14
) ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant_id ON payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(is_default);
CREATE INDEX IF NOT EXISTS idx_billing_events_tenant_id ON billing_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_processed ON billing_events(processed);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_records_tenant_id ON usage_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_timestamp ON usage_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts(code);
CREATE INDEX IF NOT EXISTS idx_discounts_is_active ON discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_customer_discounts_tenant_id ON customer_discounts(tenant_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discounts_updated_at BEFORE UPDATE ON discounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_discounts_updated_at BEFORE UPDATE ON customer_discounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for subscription summary
CREATE OR REPLACE VIEW subscription_summary AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.stripe_customer_id,
    t.subscription_plan,
    t.subscription_status,
    t.subscription_id,
    t.trial_ends_at,
    t.subscription_ends_at,
    sp.display_name as plan_display_name,
    sp.price as plan_price,
    sp.currency as plan_currency,
    sp.features as plan_features,
    sp.limits as plan_limits,
    CASE 
        WHEN t.trial_ends_at > NOW() THEN 'trial'
        WHEN t.subscription_status = 'active' THEN 'active'
        WHEN t.subscription_status = 'past_due' THEN 'past_due'
        WHEN t.subscription_status = 'canceled' THEN 'canceled'
        ELSE 'inactive'
    END as effective_status,
    CASE 
        WHEN t.trial_ends_at > NOW() THEN t.trial_ends_at
        WHEN t.subscription_ends_at THEN t.subscription_ends_at
        ELSE NULL
    END as current_period_end
FROM tenants t
LEFT JOIN subscription_plans sp ON t.subscription_plan = sp.name;

-- Create view for billing summary
CREATE OR REPLACE VIEW billing_summary AS
SELECT 
    p.tenant_id,
    t.name as tenant_name,
    COUNT(p.id) as total_payments,
    COALESCE(SUM(p.amount), 0) as total_amount,
    COUNT(CASE WHEN p.status = 'succeeded' THEN 1 END) as successful_payments,
    COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END), 0) as successful_amount,
    COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_payments,
    MAX(p.created_at) as last_payment_date,
    t.subscription_plan,
    t.subscription_status
FROM payments p
JOIN tenants t ON p.tenant_id = t.id
GROUP BY p.tenant_id, t.name, t.subscription_plan, t.subscription_status;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO trustmd_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO trustmd_app;
