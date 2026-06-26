/**
 * Payment API Routes
 * Handles Stripe payment processing, subscriptions, and billing
 */

const express = require('express');
const Joi = require('joi');
const router = express.Router();
const { supabase } = require('../services/supabase-client');
const { validateSession } = require('../middleware/session-manager');
const StripeConfig = require('../utils/stripe-config');
const EmailService = require('../utils/email-service');

// Initialize Stripe
const stripeConfig = new StripeConfig();

// Validation schemas
const createSubscriptionSchema = Joi.object({
    planName: Joi.string().valid(
        'single-practice-monthly', 
        'single-practice-yearly',
        'additional-practice-monthly', 
        'additional-practice-yearly'
    ).required(),
    successUrl: Joi.string().uri().required(),
    cancelUrl: Joi.string().uri().required()
});

const updateSubscriptionSchema = Joi.object({
    planName: Joi.string().valid(
        'single-practice-monthly', 
        'single-practice-yearly',
        'additional-practice-monthly', 
        'additional-practice-yearly'
    ).required()
});

const createPaymentIntentSchema = Joi.object({
    amount: Joi.number().positive().required(),
    currency: Joi.string().default('usd'),
    description: Joi.string().optional()
});

/**
 * GET /api/payments/plans
 * Get available subscription plans
 */
router.get('/plans', async (req, res) => {
    try {
        if (!stripeConfig.isReady()) {
            return res.status(503).json({
                success: false,
                error: 'Payment service not available'
            });
        }

        const plans = stripeConfig.getPlans();
        
        res.json({
            success: true,
            data: {
                plans,
                publishableKey: stripeConfig.getPublishableKey()
            }
        });
    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get plans'
        });
    }
});

/**
 * POST /api/payments/create-customer
 * Create Stripe customer for tenant
 */
router.post('/create-customer', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        const session = await validateSession(sessionId);
        
        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        // Get tenant and user info
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', session.tenantId)
            .single();

        if (tenantError || !tenant) {
            return res.status(404).json({
                success: false,
                error: 'Tenant not found'
            });
        }

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if customer already exists
        if (tenant.stripe_customer_id) {
            return res.json({
                success: true,
                data: {
                    customerId: tenant.stripe_customer_id,
                    existing: true
                }
            });
        }

        // Create Stripe customer
        const customer = await stripeConfig.createCustomer(tenant, user);

        // Update tenant with Stripe customer ID
        const { error: updateError } = await supabase
            .from('tenants')
            .update({
                stripe_customer_id: customer.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', tenant.id);

        if (updateError) {
            throw updateError;
        }

        res.json({
            success: true,
            data: {
                customerId: customer.id,
                existing: false
            }
        });
    } catch (error) {
        console.error('Create customer error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create customer'
        });
    }
});

/**
 * POST /api/payments/create-checkout-session
 * Create Stripe checkout session for subscription
 */
router.post('/create-checkout-session', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        const session = await validateSession(sessionId);
        
        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        // Validate request
        const { error, value } = createSubscriptionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.details
            });
        }

        const { planName, successUrl, cancelUrl } = value;

        // Get tenant info
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', session.tenantId)
            .single();

        if (tenantError || !tenant) {
            return res.status(404).json({
                success: false,
                error: 'Tenant not found'
            });
        }

        let customerId = tenant.stripe_customer_id;

        // Create customer if doesn't exist
        if (!customerId) {
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.userId)
                .single();

            if (userError || !user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const customer = await stripeConfig.createCustomer(tenant, user);
            customerId = customer.id;

            // Update tenant with customer ID
            await supabase
                .from('tenants')
                .update({
                    stripe_customer_id: customerId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', tenant.id);
        }

        // Create checkout session
        const checkoutSession = await stripeConfig.createCheckoutSession(
            customerId,
            planName,
            successUrl,
            cancelUrl
        );

        res.json({
            success: true,
            data: {
                sessionId: checkoutSession.id,
                url: checkoutSession.url
            }
        });
    } catch (error) {
        console.error('Create checkout session error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create checkout session'
        });
    }
});

/**
 * POST /api/payments/create-portal-session
 * Create Stripe billing portal session
 */
router.post('/create-portal-session', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        const session = await validateSession(sessionId);
        
        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        const { returnUrl } = req.body;

        if (!returnUrl) {
            return res.status(400).json({
                success: false,
                error: 'Return URL is required'
            });
        }

        // Get tenant info
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', session.tenantId)
            .single();

        if (tenantError || !tenant || !tenant.stripe_customer_id) {
            return res.status(404).json({
                success: false,
                error: 'Stripe customer not found'
            });
        }

        // Create portal session
        const portalSession = await stripeConfig.createPortalSession(
            tenant.stripe_customer_id,
            returnUrl
        );

        res.json({
            success: true,
            data: {
                url: portalSession.url
            }
        });
    } catch (error) {
        console.error('Create portal session error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create portal session'
        });
    }
});

/**
 * GET /api/payments/subscription
 * Get current subscription details
 */
router.get('/subscription', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        const session = await validateSession(sessionId);
        
        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        // Get tenant info
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', session.tenantId)
            .single();

        if (tenantError || !tenant) {
            return res.status(404).json({
                success: false,
                error: 'Tenant not found'
            });
        }

        if (!tenant.stripe_customer_id) {
            return res.json({
                success: true,
                data: {
                    subscription: null,
                    status: 'no_subscription'
                }
            });
        }

        // Get customer subscriptions
        const subscriptions = await stripeConfig.getCustomerSubscriptions(tenant.stripe_customer_id);
        
        // Get active subscription
        const activeSubscription = subscriptions.data.find(sub => 
            sub.status === 'active' || sub.status === 'trialing'
        );

        res.json({
            success: true,
            data: {
                subscription: activeSubscription,
                status: activeSubscription ? activeSubscription.status : 'no_active_subscription',
                allSubscriptions: subscriptions.data
            }
        });
    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get subscription'
        });
    }
});

/**
 * POST /api/payments/update-subscription
 * Update subscription plan
 */
router.post('/update-subscription', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        const session = await validateSession(sessionId);
        
        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        // Validate request
        const { error, value } = updateSubscriptionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.details
            });
        }

        const { planName } = value;

        // Get tenant info
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', session.tenantId)
            .single();

        if (tenantError || !tenant || !tenant.stripe_customer_id) {
            return res.status(404).json({
                success: false,
                error: 'Stripe customer not found'
            });
        }

        // Get current subscription
        const subscriptions = await stripeConfig.getCustomerSubscriptions(tenant.stripe_customer_id);
        const activeSubscription = subscriptions.data.find(sub => 
            sub.status === 'active' || sub.status === 'trialing'
        );

        if (!activeSubscription) {
            return res.status(404).json({
                success: false,
                error: 'No active subscription found'
            });
        }

        // Get new plan
        const newPlan = stripeConfig.getPlan(planName);
        if (!newPlan || !newPlan.stripePriceId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid plan'
            });
        }

        // Update subscription
        const updatedSubscription = await stripeConfig.updateSubscription(
            activeSubscription.id,
            newPlan.stripePriceId
        );

        res.json({
            success: true,
            data: {
                subscription: updatedSubscription
            }
        });
    } catch (error) {
        console.error('Update subscription error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update subscription'
        });
    }
});

/**
 * POST /api/payments/cancel-subscription
 * Cancel subscription
 */
router.post('/cancel-subscription', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        const session = await validateSession(sessionId);
        
        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        const { immediate = false } = req.body;

        // Get tenant info
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', session.tenantId)
            .single();

        if (tenantError || !tenant || !tenant.stripe_customer_id) {
            return res.status(404).json({
                success: false,
                error: 'Stripe customer not found'
            });
        }

        // Get current subscription
        const subscriptions = await stripeConfig.getCustomerSubscriptions(tenant.stripe_customer_id);
        const activeSubscription = subscriptions.data.find(sub => 
            sub.status === 'active' || sub.status === 'trialing'
        );

        if (!activeSubscription) {
            return res.status(404).json({
                success: false,
                error: 'No active subscription found'
            });
        }

        // Cancel subscription
        const canceledSubscription = await stripeConfig.cancelSubscription(
            activeSubscription.id,
            immediate
        );

        res.json({
            success: true,
            data: {
                subscription: canceledSubscription,
                canceledImmediately: immediate
            }
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel subscription'
        });
    }
});

/**
 * POST /api/payments/create-payment-intent
 * Create payment intent for one-time payments
 */
router.post('/create-payment-intent', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        const session = await validateSession(sessionId);
        
        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        // Validate request
        const { error, value } = createPaymentIntentSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.details
            });
        }

        const { amount, currency, description } = value;

        // Get tenant info
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', session.tenantId)
            .single();

        if (tenantError || !tenant) {
            return res.status(404).json({
                success: false,
                error: 'Tenant not found'
            });
        }

        let customerId = tenant.stripe_customer_id;

        // Create customer if doesn't exist
        if (!customerId) {
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.userId)
                .single();

            if (userError || !user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const customer = await stripeConfig.createCustomer(tenant, user);
            customerId = customer.id;

            // Update tenant with customer ID
            await supabase
                .from('tenants')
                .update({
                    stripe_customer_id: customerId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', tenant.id);
        }

        // Create payment intent
        const paymentIntent = await stripeConfig.createPaymentIntent(
            customerId,
            amount,
            currency,
            {
                tenantId: tenant.id,
                userId: session.userId,
                description
            }
        );

        res.json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id
            }
        });
    } catch (error) {
        console.error('Create payment intent error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create payment intent'
        });
    }
});

/**
 * POST /api/payments/webhook
 * Handle Stripe webhooks
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        
        if (!sig) {
            return res.status(400).json({
                success: false,
                error: 'Stripe signature is required'
            });
        }

        // Process webhook event
        const event = await stripeConfig.processWebhookEvent(req.body, sig);
        
        // Handle the event with email notifications
        await handleWebhookEventWithEmails(event);

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({
            success: false,
            error: 'Webhook processing failed'
        });
    }
});

// Helper function to handle webhook events with email notifications
async function handleWebhookEventWithEmails(event) {
    try {
        const emailService = new EmailService();
        
        switch (event.type) {
            case 'customer.subscription.created':
                await handleSubscriptionCreated(event, emailService);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event, emailService);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event, emailService);
                break;
            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event, emailService);
                break;
            case 'invoice.payment_failed':
                await handlePaymentFailed(event, emailService);
                break;
            default:
                console.log(`Unhandled webhook event type: ${event.type}`);
        }
    } catch (error) {
        console.error('Error handling webhook event with emails:', error);
    }
}

async function handleSubscriptionCreated(event, emailService) {
    try {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Get tenant info
        const { data: tenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('stripe_customer_id', customerId)
            .single();
        
        if (!tenant) return;
        
        // Get user (admin) info
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('role', 'admin')
            .limit(1)
            .single();
        
        if (user) {
            await emailService.sendSubscriptionConfirmation(user, tenant, subscription);
        }
    } catch (error) {
        console.error('Error handling subscription created:', error);
    }
}

async function handleSubscriptionUpdated(event, emailService) {
    try {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Get tenant info
        const { data: tenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('stripe_customer_id', customerId)
            .single();
        
        if (!tenant) return;
        
        // Get user (admin) info
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('role', 'admin')
            .limit(1)
            .single();
        
        if (user && subscription.status === 'past_due') {
            await emailService.sendPaymentFailedEmail(user, tenant, {
                amount: subscription.items.data[0]?.price?.unit_amount || 0,
                date: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error handling subscription updated:', error);
    }
}

async function handleSubscriptionDeleted(event, emailService) {
    try {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Get tenant info
        const { data: tenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('stripe_customer_id', customerId)
            .single();
        
        if (!tenant) return;
        
        // Get user (admin) info
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('role', 'admin')
            .limit(1)
            .single();
        
        if (user) {
            await emailService.sendSubscriptionCancelledEmail(user, tenant, subscription);
        }
    } catch (error) {
        console.error('Error handling subscription deleted:', error);
    }
}

async function handlePaymentSucceeded(event, emailService) {
    try {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        // Get tenant info
        const { data: tenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('stripe_customer_id', customerId)
            .single();
        
        if (!tenant) return;
        
        // Update tenant subscription status
        await supabase
            .from('tenants')
            .update({
                subscription_status: 'active',
                updated_at: new Date().toISOString()
            })
            .eq('id', tenant.id);
    } catch (error) {
        console.error('Error handling payment succeeded:', error);
    }
}

async function handlePaymentFailed(event, emailService) {
    try {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        // Get tenant info
        const { data: tenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('stripe_customer_id', customerId)
            .single();
        
        if (!tenant) return;
        
        // Get user (admin) info
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('role', 'admin')
            .limit(1)
            .single();
        
        if (user) {
            await emailService.sendPaymentFailedEmail(user, tenant, {
                amount: invoice.amount_due,
                date: new Date().toISOString()
            });
        }
        
        // Update tenant subscription status
        await supabase
            .from('tenants')
            .update({
                subscription_status: 'past_due',
                updated_at: new Date().toISOString()
            })
            .eq('id', tenant.id);
    } catch (error) {
        console.error('Error handling payment failed:', error);
    }
}

/**
 * GET /api/payments/test
 * Test payment endpoints
 */
router.get('/test', async (req, res) => {
    try {
        const isReady = stripeConfig.isReady();
        const plans = stripeConfig.getPlans();
        
        res.json({
            success: true,
            message: 'Payment API routes are working!',
            timestamp: new Date().toISOString(),
            stripeConfigured: isReady,
            availablePlans: Object.keys(plans),
            availableEndpoints: [
                'GET /api/payments/plans',
                'POST /api/payments/create-customer',
                'POST /api/payments/create-checkout-session',
                'POST /api/payments/create-portal-session',
                'GET /api/payments/subscription',
                'POST /api/payments/update-subscription',
                'POST /api/payments/cancel-subscription',
                'POST /api/payments/create-payment-intent',
                'POST /api/payments/webhook',
                'GET /api/payments/test'
            ]
        });
    } catch (error) {
        console.error('Payment test error:', error);
        res.status(500).json({
            success: false,
            error: 'Payment test failed'
        });
    }
});

module.exports = router;
