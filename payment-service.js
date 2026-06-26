// TrustMD Payment Service
// Handles payment processing, subscription management, and billing operations

class PaymentService {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.stripePublishableKey = null;
        this.availablePlans = [];
        this.currentSubscription = null;
        
        // Event listeners
        this.eventListeners = {
            'subscription-created': [],
            'subscription-updated': [],
            'subscription-cancelled': [],
            'payment-succeeded': [],
            'payment-failed': [],
            'plan-changed': []
        };
        
        // Initialize
        this.initializePaymentService();
    }
    
    // Initialize payment service
    async initializePaymentService() {
        try {
            await this.loadPlans();
            await this.loadCurrentSubscription();
        } catch (error) {
            console.error('Payment service initialization failed:', error);
        }
    }
    
    // Load available subscription plans
    async loadPlans() {
        try {
            const response = await this.apiClient.get('/payments/plans');
            
            if (response.data && response.data.success) {
                this.availablePlans = response.data.data.plans;
                this.stripePublishableKey = response.data.data.publishableKey;
            }
        } catch (error) {
            console.error('Failed to load payment plans:', error);
        }
    }
    
    // Get available plans
    getPlans() {
        return this.availablePlans;
    }
    
    // Get Stripe publishable key
    getStripePublishableKey() {
        return this.stripePublishableKey;
    }
    
    // Load current subscription
    async loadCurrentSubscription() {
        try {
            const response = await this.apiClient.get('/payments/subscription');
            
            if (response.data && response.data.success) {
                this.currentSubscription = response.data.data.subscription;
            }
        } catch (error) {
            console.error('Failed to load current subscription:', error);
        }
    }
    
    // Get current subscription
    getCurrentSubscription() {
        return this.currentSubscription;
    }
    
    // Check if user has active subscription
    hasActiveSubscription() {
        return this.currentSubscription && 
               (this.currentSubscription.status === 'active' || 
                this.currentSubscription.status === 'trialing');
    }
    
    // Get subscription status
    getSubscriptionStatus() {
        if (!this.currentSubscription) {
            return 'no_subscription';
        }
        return this.currentSubscription.status;
    }
    
    // Create Stripe customer
    async createCustomer() {
        try {
            const response = await this.apiClient.post('/payments/create-customer');
            
            if (response.data && response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.error || 'Failed to create customer');
            }
        } catch (error) {
            console.error('Create customer failed:', error);
            throw error;
        }
    }
    
    // Create checkout session for subscription
    async createCheckoutSession(planName, successUrl, cancelUrl) {
        try {
            const response = await this.apiClient.post('/payments/create-checkout-session', {
                planName,
                successUrl,
                cancelUrl
            });
            
            if (response.data && response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.error || 'Failed to create checkout session');
            }
        } catch (error) {
            console.error('Create checkout session failed:', error);
            throw error;
        }
    }
    
    // Redirect to Stripe checkout
    async redirectToCheckout(planName, successUrl, cancelUrl) {
        try {
            const session = await this.createCheckoutSession(planName, successUrl, cancelUrl);
            
            if (typeof window !== 'undefined' && session.url) {
                window.location.href = session.url;
            }
            
            return session;
        } catch (error) {
            console.error('Redirect to checkout failed:', error);
            throw error;
        }
    }
    
    // Create billing portal session
    async createPortalSession(returnUrl) {
        try {
            const response = await this.apiClient.post('/payments/create-portal-session', {
                returnUrl
            });
            
            if (response.data && response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.error || 'Failed to create portal session');
            }
        } catch (error) {
            console.error('Create portal session failed:', error);
            throw error;
        }
    }
    
    // Redirect to billing portal
    async redirectToBillingPortal(returnUrl) {
        try {
            const session = await this.createPortalSession(returnUrl);
            
            if (typeof window !== 'undefined' && session.url) {
                window.location.href = session.url;
            }
            
            return session;
        } catch (error) {
            console.error('Redirect to billing portal failed:', error);
            throw error;
        }
    }
    
    // Update subscription
    async updateSubscription(planName) {
        try {
            const response = await this.apiClient.post('/payments/update-subscription', {
                planName
            });
            
            if (response.data && response.data.success) {
                this.currentSubscription = response.data.data.subscription;
                this.emit('subscription-updated', this.currentSubscription);
                this.emit('plan-changed', { planName, subscription: this.currentSubscription });
                
                return response.data.data;
            } else {
                throw new Error(response.data.error || 'Failed to update subscription');
            }
        } catch (error) {
            console.error('Update subscription failed:', error);
            throw error;
        }
    }
    
    // Cancel subscription
    async cancelSubscription(immediate = false) {
        try {
            const response = await this.apiClient.post('/payments/cancel-subscription', {
                immediate
            });
            
            if (response.data && response.data.success) {
                this.currentSubscription = response.data.data.subscription;
                this.emit('subscription-cancelled', this.currentSubscription);
                
                return response.data.data;
            } else {
                throw new Error(response.data.error || 'Failed to cancel subscription');
            }
        } catch (error) {
            console.error('Cancel subscription failed:', error);
            throw error;
        }
    }
    
    // Create payment intent for one-time payments
    async createPaymentIntent(amount, currency = 'usd', description = '') {
        try {
            const response = await this.apiClient.post('/payments/create-payment-intent', {
                amount,
                currency,
                description
            });
            
            if (response.data && response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.error || 'Failed to create payment intent');
            }
        } catch (error) {
            console.error('Create payment intent failed:', error);
            throw error;
        }
    }
    
    // Confirm payment with Stripe Elements
    async confirmPayment(clientSecret, paymentMethodId) {
        try {
            if (!window.Stripe) {
                throw new Error('Stripe.js not loaded');
            }
            
            const stripe = window.Stripe(this.stripePublishableKey);
            
            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: paymentMethodId
            });
            
            if (error) {
                throw error;
            }
            
            this.emit('payment-succeeded', paymentIntent);
            return paymentIntent;
        } catch (error) {
            console.error('Confirm payment failed:', error);
            this.emit('payment-failed', error);
            throw error;
        }
    }
    
    // Get plan by name
    getPlan(planName) {
        return this.availablePlans.find(plan => 
            plan.name.toLowerCase() === planName.toLowerCase()
        );
    }

    // Get plans by tier
    getPlansByTier(tier) {
        return this.availablePlans.filter(plan => plan.tier === tier);
    }

    // Get single practice plans
    getSinglePracticePlans() {
        return this.getPlansByTier('single');
    }

    // Get additional practice plans
    getAdditionalPracticePlans() {
        return this.getPlansByTier('additional');
    }

    // Get monthly plans
    getMonthlyPlans() {
        return this.availablePlans.filter(plan => plan.interval === 'month');
    }

    // Get yearly plans
    getYearlyPlans() {
        return this.availablePlans.filter(plan => plan.interval === 'year');
    }

    // Calculate annual savings
    calculateAnnualSavings(plan) {
        if (!plan || plan.interval !== 'year') return 0;
        return plan.savings || 0;
    }

    // Calculate total cost for multiple practices
    calculateTotalCost(singlePracticePlan, additionalPracticesCount, additionalPracticePlan) {
        const singleCost = singlePracticePlan.price;
        const additionalCost = additionalPracticePlan ? additionalPracticePlan.price * additionalPracticesCount : 0;
        return singleCost + additionalCost;
    }

    // Get recommended plan based on practice count
    getRecommendedPlan(practiceCount, billingCycle = 'monthly') {
        if (practiceCount === 1) {
            return this.getPlan(`single-practice-${billingCycle}`);
        } else {
            return {
                singlePractice: this.getPlan(`single-practice-${billingCycle}`),
                additionalPractice: this.getPlan(`additional-practice-${billingCycle}`),
                totalPractices: practiceCount
            };
        }
    }
    
    // Calculate proration for plan change
    calculateProration(currentPlan, newPlan) {
        if (!currentPlan || !newPlan) return null;
        
        const currentPrice = currentPlan.price;
        const newPrice = newPlan.price;
        
        return {
            currentPrice,
            newPrice,
            priceDifference: newPrice - currentPrice,
            isUpgrade: newPrice > currentPrice,
            isDowngrade: newPrice < currentPrice
        };
    }
    
    // Format price for display
    formatPrice(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase()
        }).format(amount);
    }
    
    // Format subscription date
    formatSubscriptionDate(date) {
        return new Date(date * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // Get subscription features
    getSubscriptionFeatures(planName) {
        const plan = this.getPlan(planName);
        return plan ? plan.features : [];
    }
    
    // Check if feature is available in current plan
    isFeatureAvailable(feature) {
        if (!this.currentSubscription) return false;
        
        const planName = this.currentSubscription.metadata?.planName || 'basic';
        const plan = this.getPlan(planName);
        
        return plan && plan.features.includes(feature);
    }
    
    // Get usage limits for current plan
    getUsageLimits() {
        if (!this.currentSubscription) {
            return {
                users: 1,
                storage: 1024 * 1024 * 100, // 100MB
                reports: 10
            };
        }
        
        const planName = this.currentSubscription.metadata?.planName || 'basic';
        const plan = this.getPlan(planName);
        
        switch (planName) {
            case 'basic':
                return {
                    users: 5,
                    storage: 1024 * 1024 * 1024 * 10, // 10GB
                    reports: 100
                };
            case 'professional':
                return {
                    users: -1, // unlimited
                    storage: -1, // unlimited
                    reports: -1 // unlimited
                };
            case 'enterprise':
                return {
                    users: -1,
                    storage: -1,
                    reports: -1
                };
            default:
                return {
                    users: 1,
                    storage: 1024 * 1024 * 100,
                    reports: 10
                };
        }
    }
    
    // Refresh subscription data
    async refreshSubscription() {
        try {
            await this.loadCurrentSubscription();
        } catch (error) {
            console.error('Failed to refresh subscription:', error);
        }
    }
    
    // Event management
    addEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
    }
    
    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            const index = this.eventListeners[event].indexOf(callback);
            if (index > -1) {
                this.eventListeners[event].splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in payment event listener for ${event}:`, error);
                }
            });
        }
    }
    
    // Load Stripe.js
    loadStripe() {
        return new Promise((resolve, reject) => {
            if (window.Stripe) {
                resolve(window.Stripe);
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = () => {
                if (window.Stripe) {
                    resolve(window.Stripe);
                } else {
                    reject(new Error('Failed to load Stripe.js'));
                }
            };
            script.onerror = () => reject(new Error('Failed to load Stripe.js'));
            document.head.appendChild(script);
        });
    }
    
    // Create Stripe Elements
    async createElements() {
        try {
            await this.loadStripe();
            
            const stripe = window.Stripe(this.stripePublishableKey);
            const elements = stripe.elements();
            
            const cardElement = elements.create('card', {
                style: {
                    base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': {
                            color: '#aab7c4'
                        }
                    }
                }
            });
            
            return {
                stripe,
                elements,
                cardElement
            };
        } catch (error) {
            console.error('Failed to create Stripe Elements:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PaymentService };
} else {
    window.PaymentService = PaymentService;
}
