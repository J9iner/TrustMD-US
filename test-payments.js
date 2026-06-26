// TrustMD Payment Integration Test
// Test script to verify Stripe payment functionality

const axios = require('axios');

class PaymentIntegrationTest {
    constructor(baseURL = 'http://localhost:3001') {
        this.baseURL = baseURL;
        this.api = axios.create({
            baseURL,
            timeout: 10000,
            validateStatus: () => true // Don't throw on HTTP errors
        });
    }

    // Test payment plans endpoint
    async testPaymentPlans() {
        console.log('💳 Testing payment plans endpoint...');
        
        try {
            const response = await this.api.get('/api/payments/plans');
            
            if (response.status === 200 && response.data.success) {
                console.log('✅ Payment plans endpoint working');
                console.log('📊 Available plans:', Object.keys(response.data.data.plans));
                console.log('💳 Stripe publishable key configured:', !!response.data.data.publishableKey);
                return response.data.data;
            } else {
                console.log('❌ Payment plans endpoint failed:', response.data);
                return null;
            }
        } catch (error) {
            console.error('❌ Payment plans test failed:', error.message);
            return null;
        }
    }

    // Test payment endpoints availability
    async testPaymentEndpoints() {
        console.log('💳 Testing payment endpoints...');
        
        try {
            const response = await this.api.get('/api/payments/test');
            
            if (response.status === 200 && response.data.success) {
                console.log('✅ Payment endpoints working');
                console.log('📋 Available endpoints:', response.data.availableEndpoints);
                console.log('🔧 Stripe configured:', response.data.stripeConfigured);
                console.log('📊 Available plans:', response.data.availablePlans);
                return response.data;
            } else {
                console.log('❌ Payment test endpoint failed:', response.data);
                return null;
            }
        } catch (error) {
            console.error('❌ Payment endpoints test failed:', error.message);
            return null;
        }
    }

    // Test customer creation
    async testCustomerCreation() {
        console.log('👤 Testing customer creation...');
        
        try {
            // This would normally require authentication
            // For testing, we'll check if the endpoint exists and handles auth properly
            const response = await this.api.post('/api/payments/create-customer');
            
            if (response.status === 401) {
                console.log('✅ Customer creation endpoint properly protected');
                return { protected: true };
            } else if (response.status === 200 && response.data.success) {
                console.log('✅ Customer creation working');
                return response.data.data;
            } else {
                console.log('⚠️  Customer creation endpoint response:', response.status, response.data);
                return { status: response.status, data: response.data };
            }
        } catch (error) {
            console.error('❌ Customer creation test failed:', error.message);
            return null;
        }
    }

    // Test checkout session creation
    async testCheckoutSession() {
        console.log('🛒 Testing checkout session creation...');
        
        try {
            const response = await this.api.post('/api/payments/create-checkout-session', {
                planName: 'basic',
                successUrl: 'https://example.com/success',
                cancelUrl: 'https://example.com/cancel'
            });
            
            if (response.status === 401) {
                console.log('✅ Checkout session endpoint properly protected');
                return { protected: true };
            } else if (response.status === 200 && response.data.success) {
                console.log('✅ Checkout session creation working');
                return response.data.data;
            } else {
                console.log('⚠️  Checkout session endpoint response:', response.status, response.data);
                return { status: response.status, data: response.data };
            }
        } catch (error) {
            console.error('❌ Checkout session test failed:', error.message);
            return null;
        }
    }

    // Test payment intent creation
    async testPaymentIntent() {
        console.log('💰 Testing payment intent creation...');
        
        try {
            const response = await this.api.post('/api/payments/create-payment-intent', {
                amount: 1000, // $10.00
                currency: 'usd',
                description: 'Test payment'
            });
            
            if (response.status === 401) {
                console.log('✅ Payment intent endpoint properly protected');
                return { protected: true };
            } else if (response.status === 200 && response.data.success) {
                console.log('✅ Payment intent creation working');
                return response.data.data;
            } else {
                console.log('⚠️  Payment intent endpoint response:', response.status, response.data);
                return { status: response.status, data: response.data };
            }
        } catch (error) {
            console.error('❌ Payment intent test failed:', error.message);
            return null;
        }
    }

    // Test webhook endpoint
    async testWebhookEndpoint() {
        console.log('🪝 Testing webhook endpoint...');
        
        try {
            // Test with invalid signature to verify signature checking
            const response = await this.api.post('/api/payments/webhook', 
                { test: 'data' },
                {
                    headers: {
                        'stripe-signature': 'invalid_signature'
                    }
                }
            );
            
            if (response.status === 400) {
                console.log('✅ Webhook endpoint properly validating signatures');
                return { validationWorking: true };
            } else {
                console.log('⚠️  Webhook endpoint response:', response.status, response.data);
                return { status: response.status, data: response.data };
            }
        } catch (error) {
            console.error('❌ Webhook test failed:', error.message);
            return null;
        }
    }

    // Test environment configuration
    testEnvironmentConfig() {
        console.log('🔧 Testing environment configuration...');
        
        const requiredEnvVars = [
            'STRIPE_SECRET_KEY',
            'STRIPE_PUBLISHABLE_KEY',
            'STRIPE_WEBHOOK_SECRET',
            'STRIPE_PRICE_BASIC',
            'STRIPE_PRICE_PROFESSIONAL',
            'STRIPE_PRICE_ENTERPRISE'
        ];
        
        const config = {};
        let allConfigured = true;
        
        for (const envVar of requiredEnvVars) {
            const value = process.env[envVar];
            const isConfigured = !!value;
            
            config[envVar] = {
                configured: isConfigured,
                hasValue: !!value,
                length: value ? value.length : 0
            };
            
            if (!isConfigured) {
                allConfigured = false;
                console.log(`⚠️  ${envVar} not configured`);
            } else {
                console.log(`✅ ${envVar} configured`);
            }
        }
        
        console.log(`🔧 Environment fully configured: ${allConfigured ? '✅' : '❌'}`);
        return { allConfigured, config };
    }

    // Test database connectivity (basic check)
    async testDatabaseConnectivity() {
        console.log('🗄️  Testing database connectivity...');
        
        try {
            const response = await this.api.get('/api/health');
            
            if (response.status === 200) {
                console.log('✅ Database connectivity working (API healthy)');
                return { success: true, apiHealthy: true };
            } else {
                console.log('⚠️  API health check failed');
                return { success: false, apiHealthy: false };
            }
        } catch (error) {
            console.log('❌ Database connectivity test failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Run complete payment integration test
    async runCompleteTest() {
        console.log('🚀 Starting TrustMD Payment Integration Test');
        console.log('=' .repeat(50));
        
        const results = {
            timestamp: new Date().toISOString(),
            tests: {}
        };
        
        // Test 1: Environment Configuration
        console.log('\n📋 Test 1: Environment Configuration');
        results.tests.environment = this.testEnvironmentConfig();
        
        // Test 2: Payment Endpoints
        console.log('\n📋 Test 2: Payment Endpoints');
        results.tests.paymentEndpoints = await this.testPaymentEndpoints();
        
        // Test 3: Payment Plans
        console.log('\n📋 Test 3: Payment Plans');
        results.tests.paymentPlans = await this.testPaymentPlans();
        
        // Test 4: Customer Creation
        console.log('\n📋 Test 4: Customer Creation');
        results.tests.customerCreation = await this.testCustomerCreation();
        
        // Test 5: Checkout Session
        console.log('\n📋 Test 5: Checkout Session');
        results.tests.checkoutSession = await this.testCheckoutSession();
        
        // Test 6: Payment Intent
        console.log('\n📋 Test 6: Payment Intent');
        results.tests.paymentIntent = await this.testPaymentIntent();
        
        // Test 7: Webhook Endpoint
        console.log('\n📋 Test 7: Webhook Endpoint');
        results.tests.webhookEndpoint = await this.testWebhookEndpoint();
        
        // Test 8: Database Connectivity
        console.log('\n📋 Test 8: Database Connectivity');
        results.tests.databaseConnectivity = await this.testDatabaseConnectivity();
        
        // Summary
        console.log('\n' + '=' .repeat(50));
        console.log('💳 Payment Integration Test Summary');
        console.log('=' .repeat(50));
        
        const testResults = Object.values(results.tests);
        const passedTests = testResults.filter(test => {
            if (typeof test === 'object' && test !== null) {
                return test.success || test.allConfigured || test.protected || test.validationWorking;
            }
            return false;
        }).length;
        
        console.log(`✅ Passed: ${passedTests}/${testResults.length}`);
        console.log(`❌ Failed: ${testResults.length - passedTests}/${testResults.length}`);
        
        if (passedTests === testResults.length) {
            console.log('🎉 All payment integration tests passed!');
        } else {
            console.log('⚠️  Some payment integration tests failed. Check configuration.');
        }
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        if (!results.tests.environment?.allConfigured) {
            console.log('- Configure missing Stripe environment variables');
        }
        if (!results.tests.paymentPlans?.publishableKey) {
            console.log('- Set up Stripe publishable key');
        }
        if (!results.tests.paymentEndpoints?.stripeConfigured) {
            console.log('- Configure Stripe API keys');
        }
        if (results.tests.databaseConnectivity?.success === false) {
            console.log('- Check database connectivity and run payment schema migration');
        }
        
        return results;
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const baseURL = process.argv[2] || 'http://localhost:3001';
    const tester = new PaymentIntegrationTest(baseURL);
    
    tester.runCompleteTest()
        .then(results => {
            console.log('\n🏁 Payment integration test completed');
            
            // Exit with appropriate code
            const allPassed = Object.values(results.tests).every(test => {
                if (typeof test === 'object' && test !== null) {
                    return test.success || test.allConfigured || test.protected || test.validationWorking;
                }
                return false;
            });
            
            process.exit(allPassed ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Payment integration test failed:', error);
            process.exit(1);
        });
}

module.exports = PaymentIntegrationTest;
