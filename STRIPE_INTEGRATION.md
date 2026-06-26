# TrustMD Stripe Payment Integration Guide

## Overview

TrustMD now supports Stripe payment processing for subscription management, allowing healthcare practices to easily manage billing for compliance tracking services.

## Features

- **Subscription Management** - Monthly/annual billing plans
- **Secure Payment Processing** - PCI-compliant Stripe integration
- **Customer Portal** - Self-service billing management
- **Webhook Handling** - Real-time payment event processing
- **Multiple Plans** - Basic, Professional, and Enterprise tiers
- **Proration Support** - Fair billing for plan changes
- **Payment Methods** - Credit/debit card support
- **Invoice Management** - Automatic billing and invoicing

## Setup Instructions

### 1. Environment Configuration

Add the following to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_SINGLE_PRACTICE_MONTHLY=price_1OaBzZ2eZvKYlo2C7aBcX123
STRIPE_PRICE_SINGLE_PRACTICE_YEARLY=price_1OaBzZ2eZvKYlo2C7aBcX456
STRIPE_PRICE_ADDITIONAL_PRACTICE_MONTHLY=price_1OaBzZ2eZvKYlo2C7aBcX789
STRIPE_PRICE_ADDITIONAL_PRACTICE_YEARLY=price_1OaBzZ2eZvKYlo2C7aBcX012
```

### 2. Stripe Account Setup

1. **Create Stripe Account**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/)
   - Sign up or log in to your account
   - Complete business verification

2. **Get API Keys**
   - Navigate to Developers → API keys
   - Copy Publishable key (for frontend)
   - Copy Secret key (for backend)

3. **Create Products and Prices**
   - Go to Products → Add product
   - Create four products:
     - Single Practice - Monthly ($299)
     - Single Practice - Yearly ($2,999)
     - Additional Practice - Monthly ($249)
     - Additional Practice - Yearly ($2,499)
   - Set recurring prices for each plan
   - Copy Price IDs to your environment variables

4. **Setup Webhooks**
   - Go to Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/payments/webhook`
   - Select events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.created`
     - `payment_method.attached`

### 3. Database Setup

Run the payment schema migration:

```sql
-- Run the database/schema/payments_schema.sql file
-- This adds payment tracking tables to your database
```

## API Endpoints

### Plans and Pricing
- `GET /api/payments/plans` - Get available subscription plans

### Customer Management
- `POST /api/payments/create-customer` - Create Stripe customer
- `GET /api/payments/payment-methods` - Get customer payment methods

### Subscription Management
- `POST /api/payments/create-checkout-session` - Create subscription checkout
- `POST /api/payments/create-portal-session` - Create billing portal
- `GET /api/payments/subscription` - Get current subscription
- `POST /api/payments/update-subscription` - Update subscription plan
- `POST /api/payments/cancel-subscription` - Cancel subscription

### Payment Processing
- `POST /api/payments/create-payment-intent` - Create one-time payment
- `POST /api/payments/webhook` - Handle Stripe webhooks

### Testing
- `GET /api/payments/test` - Test payment endpoints

## Frontend Integration

### Using the PaymentService

```javascript
// Initialize TrustMD API
const trustMD = createTrustMDAPI({
    baseURL: 'http://localhost:3001'
});

// Get available plans
const plans = trustMD.payment.getPlans();

// Check subscription status
const hasSubscription = trustMD.payment.hasActiveSubscription();

// Create checkout session
await trustMD.payment.redirectToCheckout(
    'professional',
    'https://yourdomain.com/success',
    'https://yourdomain.com/cancel'
);

// Open billing portal
await trustMD.payment.redirectToBillingPortal(
    'https://yourdomain.com/billing'
);
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';
import { createTrustMDAPI } from '../api';

const PricingCalculator = () => {
    const [plans, setPlans] = useState([]);
    const [practiceCount, setPracticeCount] = useState(1);
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [recommendedPlan, setRecommendedPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        const trustMD = createTrustMDAPI();
        
        // Load plans
        setPlans(trustMD.payment.getPlans());
        
        // Get recommended plan
        const recommended = trustMD.payment.getRecommendedPlan(practiceCount, billingCycle);
        setRecommendedPlan(recommended);
    }, [practiceCount, billingCycle]);
    
    const handleSubscribe = async (planName) => {
        setLoading(true);
        try {
            const trustMD = createTrustMDAPI();
            await trustMD.payment.redirectToCheckout(
                planName,
                `${window.location.origin}/subscription-success`,
                `${window.location.origin}/subscription-canceled`
            );
        } catch (error) {
            console.error('Subscription failed:', error);
            setLoading(false);
        }
    };
    
    const calculateTotalCost = () => {
        if (practiceCount === 1 && recommendedPlan) {
            return recommendedPlan.price;
        } else if (recommendedPlan && recommendedPlan.singlePractice && recommendedPlan.additionalPractice) {
            return trustMD.payment.calculateTotalCost(
                recommendedPlan.singlePractice,
                practiceCount - 1,
                recommendedPlan.additionalPractice
            );
        }
        return 0;
    };
    
    const trustMD = createTrustMDAPI();
    const totalCost = calculateTotalCost();
    const annualSavings = billingCycle === 'yearly' 
        ? (practiceCount === 1 
            ? trustMD.payment.calculateAnnualSavings(recommendedPlan)
            : trustMD.payment.calculateAnnualSavings(recommendedPlan?.singlePractice) + 
              trustMD.payment.calculateAnnualSavings(recommendedPlan?.additionalPractice) * (practiceCount - 1))
        : 0;
    
    return (
        <div className="pricing-calculator">
            <h2>TrustMD Pricing Calculator</h2>
            
            <div className="pricing-controls">
                <div className="practice-count">
                    <label>Number of Practices:</label>
                    <input 
                        type="number" 
                        min="1" 
                        value={practiceCount}
                        onChange={(e) => setPracticeCount(parseInt(e.target.value) || 1)}
                    />
                </div>
                
                <div className="billing-cycle">
                    <label>Billing Cycle:</label>
                    <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)}>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly (Save 2 months)</option>
                    </select>
                </div>
            </div>
            
            <div className="pricing-summary">
                <h3>Total Cost: ${totalCost}/{billingCycle === 'monthly' ? 'month' : 'year'}</h3>
                {annualSavings > 0 && (
                    <p className="savings">Annual Savings: ${annualSavings}</p>
                )}
            </div>
            
            <div className="pricing-plans">
                {practiceCount === 1 ? (
                    <div className="plan-selection">
                        <h3>Single Practice Plans</h3>
                        {trustMD.payment.getSinglePracticePlans()
                            .filter(plan => plan.interval === billingCycle)
                            .map(plan => (
                                <div key={plan.name} className="plan-card">
                                    <h4>{plan.name}</h4>
                                    <p className="price">${plan.price}/{billingCycle === 'monthly' ? 'month' : 'year'}</p>
                                    <ul>
                                        {plan.features.map((feature, index) => (
                                            <li key={index}>{feature}</li>
                                        ))}
                                    </ul>
                                    <button 
                                        onClick={() => handleSubscribe(plan.name)}
                                        disabled={loading}
                                        className="subscribe-btn"
                                    >
                                        Subscribe Now
                                    </button>
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="multi-practice-plans">
                        <div className="plan-section">
                            <h3>Single Practice Plan</h3>
                            {recommendedPlan?.singlePractice && (
                                <div className="plan-card">
                                    <h4>{recommendedPlan.singlePractice.name}</h4>
                                    <p className="price">${recommendedPlan.singlePractice.price}/{billingCycle === 'monthly' ? 'month' : 'year'}</p>
                                    <button 
                                        onClick={() => handleSubscribe(recommendedPlan.singlePractice.name)}
                                        disabled={loading}
                                        className="subscribe-btn"
                                    >
                                        Subscribe
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <div className="plan-section">
                            <h3>Additional Practices ({practiceCount - 1})</h3>
                            {recommendedPlan?.additionalPractice && (
                                <div className="plan-card">
                                    <h4>{recommendedPlan.additionalPractice.name}</h4>
                                    <p className="price">${recommendedPlan.additionalPractice.price}/{billingCycle === 'monthly' ? 'month' : 'year'} each</p>
                                    <p className="total">Total: ${recommendedPlan.additionalPractice.price * (practiceCount - 1)}/{billingCycle === 'monthly' ? 'month' : 'year'}</p>
                                    <button 
                                        onClick={() => handleSubscribe(recommendedPlan.additionalPractice.name)}
                                        disabled={loading}
                                        className="subscribe-btn"
                                    >
                                        Subscribe
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                <div className="enterprise-option">
                    <h3>Need More?</h3>
                    <p>For large organizations with custom needs, contact our sales team.</p>
                    <button className="contact-sales-btn">Contact Sales</button>
                </div>
            </div>
        </div>
    );
};

export default PricingCalculator;
```

### Stripe Elements Integration

```jsx
import React, { useState, useEffect } from 'react';
import { createTrustMDAPI } from '../api';

const PaymentForm = ({ amount, onSuccess, onError }) => {
    const [loading, setLoading] = useState(false);
    const [stripe, setStripe] = useState(null);
    const [elements, setElements] = useState(null);
    const [cardElement, setCardElement] = useState(null);
    
    useEffect(() => {
        const initializeStripe = async () => {
            const trustMD = createTrustMDAPI();
            const { stripe, elements, cardElement } = await trustMD.payment.createElements();
            
            setStripe(stripe);
            setElements(elements);
            setCardElement(cardElement);
            
            cardElement.mount('#card-element');
        };
        
        initializeStripe();
    }, []);
    
    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        
        try {
            const trustMD = createTrustMDAPI();
            
            // Create payment intent
            const { clientSecret } = await trustMD.payment.createPaymentIntent(
                amount,
                'usd',
                'One-time payment'
            );
            
            // Confirm payment
            await trustMD.payment.confirmPayment(clientSecret);
            
            onSuccess();
        } catch (error) {
            onError(error);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit}>
            <div id="card-element">
                {/* Stripe Elements will be mounted here */}
            </div>
            <button type="submit" disabled={loading}>
                {loading ? 'Processing...' : `Pay $${amount}`}
            </button>
        </form>
    );
};

export default PaymentForm;
```

## Subscription Plans

### Single Practice Plans
**Single Practice - $299/month or $2,999/year**
- Single practice location
- Unlimited users
- Unlimited storage
- Full compliance tracking suite
- Priority support
- Real-time monitoring
- Custom reports
- API access
- **Annual savings: $591 (2 months free)**

### Additional Practice Plans
**Additional Practice - $249/month or $2,499/year**
- Additional practice location
- Unlimited users
- Unlimited storage
- Full compliance tracking suite
- Priority support
- Real-time monitoring
- Custom reports
- API access
- **Annual savings: $489 (2 months free)**

### Enterprise Plans
**Enterprise - Contact Sales**
- Unlimited practice locations
- Custom pricing for large organizations
- Dedicated account manager
- Custom integrations
- On-premise deployment options
- SLA guarantees
- Priority feature requests

### Pricing Examples
- **Single Practice**: $299/month or $2,999/year
- **Two Practices**: $548/month ($299 + $249) or $5,498/year ($2,999 + $2,499)
- **Three Practices**: $797/month ($299 + $249 + $249) or $7,997/year
- **Large Organizations**: Contact sales for custom pricing

## Webhook Events

The system handles these Stripe webhook events:

### Subscription Events
- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Subscription modified
- `customer.subscription.deleted` - Subscription canceled

### Payment Events
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed

### Customer Events
- `customer.created` - New customer created
- `payment_method.attached` - Payment method added

## Security Considerations

1. **API Key Security**
   - Never expose secret keys in frontend code
   - Use environment variables for all credentials
   - Rotate keys regularly

2. **Webhook Security**
   - Always verify webhook signatures
   - Use HTTPS for webhook endpoints
   - Log all webhook events for auditing

3. **PCI Compliance**
   - Never handle raw card data
   - Use Stripe Elements for card collection
   - Let Stripe handle sensitive data

## Testing

### Test Cards
Use these Stripe test cards for testing:

```
Card Number: 4242424242424242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

### Test Scenarios
- Successful payments
- Failed payments (insufficient funds)
- Subscription upgrades/downgrades
- Cancellation and reactivation
- Webhook event processing

### Run Tests
```bash
npm run test:payments
```

## Production Considerations

1. **Live Mode**
   - Switch from test to live API keys
   - Update webhook endpoints to production URLs
   - Test with real payment methods

2. **Monitoring**
   - Monitor webhook delivery
   - Track payment success rates
   - Set up alerts for failed payments

3. **Compliance**
   - Ensure PCI DSS compliance
   - Implement proper data retention
   - Maintain audit trails

## Troubleshooting

### Common Issues

1. **"Webhook signature verification failed"**
   - Check webhook secret in environment variables
   - Ensure webhook endpoint is using raw body parsing

2. **"No active subscription found"**
   - Verify customer has active subscription in Stripe
   - Check subscription status in database

3. **"Payment intent creation failed"**
   - Verify Stripe customer exists
   - Check customer has valid payment method

4. **"Checkout session failed"**
   - Verify price IDs are correct
   - Check success/cancel URLs are valid

### Debug Mode

Enable debug logging:
```env
DEBUG=trustmd:*
```

## Support

For payment integration issues:
1. Check Stripe Dashboard for transaction details
2. Review server logs for error messages
3. Verify webhook event delivery
4. Test with Stripe CLI for local development

## Database Schema

The payment system adds these tables:
- `payments` - Transaction records
- `invoices` - Billing invoices
- `subscription_plans` - Plan configurations
- `payment_methods` - Customer payment methods
- `usage_records` - Usage-based billing
- `billing_events` - Webhook event audit trail
- `discounts` - Promotional codes
- `customer_discounts` - Applied discounts

See `database/payments_schema.sql` for complete schema.
