// TrustMD Stripe Configuration
// Handles Stripe payment processing, subscriptions, and webhooks

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeConfig {
    constructor() {
        this.stripe = stripe;
        this.isConfigured = this.validateConfiguration();
        
        // Subscription plans configuration
        this.plans = {
            'single-practice-monthly': {
                name: 'Single Practice - Monthly',
                price: 299,
                features: [
                    'Single practice location',
                    'Unlimited users',
                    'Unlimited storage',
                    'Full compliance tracking suite',
                    'Priority support',
                    'Real-time monitoring',
                    'Custom reports',
                    'API access',
                    'Monthly billing'
                ],
                stripePriceId: process.env.STRIPE_PRICE_SINGLE_PRACTICE_MONTHLY,
                interval: 'month',
                tier: 'single',
                practiceType: 'single'
            },
            'single-practice-yearly': {
                name: 'Single Practice - Yearly',
                price: 2999,
                features: [
                    'Single practice location',
                    'Unlimited users',
                    'Unlimited storage',
                    'Full compliance tracking suite',
                    'Priority support',
                    'Real-time monitoring',
                    'Custom reports',
                    'API access',
                    'Annual billing (Save $591)',
                    '2 months free'
                ],
                stripePriceId: process.env.STRIPE_PRICE_SINGLE_PRACTICE_YEARLY,
                interval: 'year',
                tier: 'single',
                practiceType: 'single',
                savings: 591
            },
            'additional-practice-monthly': {
                name: 'Additional Practice - Monthly',
                price: 249,
                features: [
                    'Additional practice location',
                    'Unlimited users',
                    'Unlimited storage',
                    'Full compliance tracking suite',
                    'Priority support',
                    'Real-time monitoring',
                    'Custom reports',
                    'API access',
                    'Monthly billing'
                ],
                stripePriceId: process.env.STRIPE_PRICE_ADDITIONAL_PRACTICE_MONTHLY,
                interval: 'month',
                tier: 'additional',
                practiceType: 'additional'
            },
            'additional-practice-yearly': {
                name: 'Additional Practice - Yearly',
                price: 2499,
                features: [
                    'Additional practice location',
                    'Unlimited users',
                    'Unlimited storage',
                    'Full compliance tracking suite',
                    'Priority support',
                    'Real-time monitoring',
                    'Custom reports',
                    'API access',
                    'Annual billing (Save $489)',
                    '2 months free'
                ],
                stripePriceId: process.env.STRIPE_PRICE_ADDITIONAL_PRACTICE_YEARLY,
                interval: 'year',
                tier: 'additional',
                practiceType: 'additional',
                savings: 489
            }
        };
    }

    // Validate Stripe configuration
    validateConfiguration() {
        const required = [
            'STRIPE_SECRET_KEY',
            'STRIPE_PUBLISHABLE_KEY',
            'STRIPE_WEBHOOK_SECRET'
        ];

        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            console.warn('Stripe configuration incomplete. Missing:', missing);
            return false;
        }

        return true;
    }

    // Get available plans
    getPlans() {
        return this.plans;
    }

    // Get plan by name
    getPlan(planName) {
        return this.plans[planName.toLowerCase()];
    }

    // Create Stripe customer
    async createCustomer(tenantData, userData) {
        try {
            const customer = await this.stripe.customers.create({
                name: tenantData.name,
                email: userData.email,
                metadata: {
                    tenantId: tenantData.id,
                    userId: userData.id,
                    practiceName: tenantData.practice_name,
                    practiceType: tenantData.practice_type
                },
                address: {
                    line1: tenantData.address || '',
                    city: tenantData.city || '',
                    state: tenantData.state || '',
                    postal_code: tenantData.postal_code || '',
                    country: 'US'
                }
            });

            return customer;
        } catch (error) {
            console.error('Stripe customer creation failed:', error);
            throw error;
        }
    }

    // Create checkout session for subscription
    async createCheckoutSession(customerId, planName, successUrl, cancelUrl) {
        try {
            const plan = this.getPlan(planName);
            if (!plan) {
                throw new Error(`Invalid plan: ${planName}`);
            }

            const session = await this.stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: plan.stripePriceId,
                        quantity: 1
                    }
                ],
                mode: 'subscription',
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    planName,
                    tenantId: customerId
                },
                subscription_data: {
                    metadata: {
                        planName
                    }
                },
                allow_promotion_codes: true,
                billing_address_collection: 'required',
                customer_update: {
                    address: 'auto',
                    name: 'auto'
                }
            });

            return session;
        } catch (error) {
            console.error('Stripe checkout session creation failed:', error);
            throw error;
        }
    }

    // Create customer portal session
    async createPortalSession(customerId, returnUrl) {
        try {
            const session = await this.stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: returnUrl
            });

            return session;
        } catch (error) {
            console.error('Stripe portal session creation failed:', error);
            throw error;
        }
    }

    // Get subscription details
    async getSubscription(subscriptionId) {
        try {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
            return subscription;
        } catch (error) {
            console.error('Stripe subscription retrieval failed:', error);
            throw error;
        }
    }

    // Update subscription
    async updateSubscription(subscriptionId, priceId) {
        try {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
            
            const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
                items: [{
                    id: subscription.items.data[0].id,
                    price: priceId
                }],
                proration_behavior: 'create_prorations'
            });

            return updatedSubscription;
        } catch (error) {
            console.error('Stripe subscription update failed:', error);
            throw error;
        }
    }

    // Cancel subscription
    async cancelSubscription(subscriptionId, immediate = false) {
        try {
            const subscription = await this.stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: !immediate
            });

            if (immediate) {
                const canceledSubscription = await this.stripe.subscriptions.del(subscriptionId);
                return canceledSubscription;
            }

            return subscription;
        } catch (error) {
            console.error('Stripe subscription cancellation failed:', error);
            throw error;
        }
    }

    // Get customer subscriptions
    async getCustomerSubscriptions(customerId) {
        try {
            const subscriptions = await this.stripe.subscriptions.list({
                customer: customerId,
                status: 'all',
                limit: 10
            });

            return subscriptions;
        } catch (error) {
            console.error('Stripe customer subscriptions retrieval failed:', error);
            throw error;
        }
    }

    // Get customer payment methods
    async getCustomerPaymentMethods(customerId) {
        try {
            const paymentMethods = await this.stripe.paymentMethods.list({
                customer: customerId,
                type: 'card'
            });

            return paymentMethods;
        } catch (error) {
            console.error('Stripe payment methods retrieval failed:', error);
            throw error;
        }
    }

    // Create payment intent for one-time payments
    async createPaymentIntent(customerId, amount, currency = 'usd', metadata = {}) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                customer: customerId,
                amount: amount * 100, // Convert to cents
                currency,
                metadata,
                automatic_payment_methods: {
                    enabled: true
                }
            });

            return paymentIntent;
        } catch (error) {
            console.error('Stripe payment intent creation failed:', error);
            throw error;
        }
    }

    // Process webhook event
    async processWebhookEvent(body, signature) {
        try {
            const event = this.stripe.webhooks.constructEvent(
                body,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );

            return event;
        } catch (error) {
            console.error('Stripe webhook signature verification failed:', error);
            throw error;
        }
    }

    // Handle webhook events
    async handleWebhookEvent(event) {
        try {
            switch (event.type) {
                case 'customer.subscription.created':
                    await this.handleSubscriptionCreated(event.data.object);
                    break;
                
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;
                
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;
                
                case 'invoice.payment_succeeded':
                    await this.handleInvoicePaymentSucceeded(event.data.object);
                    break;
                
                case 'invoice.payment_failed':
                    await this.handleInvoicePaymentFailed(event.data.object);
                    break;
                
                case 'customer.created':
                    await this.handleCustomerCreated(event.data.object);
                    break;
                
                case 'payment_method.attached':
                    await this.handlePaymentMethodAttached(event.data.object);
                    break;
                
                default:
                    console.log(`Unhandled webhook event type: ${event.type}`);
            }

            return { received: true };
        } catch (error) {
            console.error('Webhook event handling failed:', error);
            throw error;
        }
    }

    // Webhook event handlers
    async handleSubscriptionCreated(subscription) {
        console.log('Subscription created:', subscription.id);
        // Update database with new subscription
    }

    async handleSubscriptionUpdated(subscription) {
        console.log('Subscription updated:', subscription.id);
        // Update database with subscription changes
    }

    async handleSubscriptionDeleted(subscription) {
        console.log('Subscription deleted:', subscription.id);
        // Update database to reflect subscription cancellation
    }

    async handleInvoicePaymentSucceeded(invoice) {
        console.log('Invoice payment succeeded:', invoice.id);
        // Update payment records, extend subscription
    }

    async handleInvoicePaymentFailed(invoice) {
        console.log('Invoice payment failed:', invoice.id);
        // Notify customer, update payment status
    }

    async handleCustomerCreated(customer) {
        console.log('Customer created:', customer.id);
        // Update database with new customer
    }

    async handlePaymentMethodAttached(paymentMethod) {
        console.log('Payment method attached:', paymentMethod.id);
        // Update customer payment methods
    }

    // Get publishable key for frontend
    getPublishableKey() {
        return process.env.STRIPE_PUBLISHABLE_KEY;
    }

    // Check if Stripe is properly configured
    isReady() {
        return this.isConfigured;
    }
}

module.exports = StripeConfig;
