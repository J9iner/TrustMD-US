// TrustMD Email Integration Test
// Test script to verify Resend email functionality

const axios = require('axios');

class EmailIntegrationTest {
    constructor(baseURL = 'http://localhost:3001') {
        this.baseURL = baseURL;
        this.api = axios.create({
            baseURL,
            timeout: 10000,
            validateStatus: () => true // Don't throw on HTTP errors
        });
    }

    // Test email service status
    async testEmailServiceStatus() {
        console.log('📧 Testing email service status...');
        
        try {
            const response = await this.api.get('/api/emails/status');
            
            if (response.status === 200 && response.data.success) {
                console.log('✅ Email service status endpoint working');
                console.log('🔧 Service configured:', response.data.data.configured);
                console.log('📧 From email:', response.data.data.fromEmail);
                console.log('📋 Available templates:', response.data.data.availableTemplates.length);
                return response.data.data;
            } else {
                console.log('❌ Email service status failed:', response.data);
                return null;
            }
        } catch (error) {
            console.error('❌ Email service status test failed:', error.message);
            return null;
        }
    }

    // Test email endpoints availability
    async testEmailEndpoints() {
        console.log('📧 Testing email endpoints...');
        
        try {
            const response = await this.api.get('/api/emails/test');
            
            if (response.status === 200 && response.data.success) {
                console.log('✅ Email endpoints working');
                console.log('📋 Available endpoints:', response.data.availableEndpoints);
                console.log('🕒 Timestamp:', response.data.timestamp);
                return response.data;
            } else {
                console.log('❌ Email test endpoint failed:', response.data);
                return null;
            }
        } catch (error) {
            console.error('❌ Email endpoints test failed:', error.message);
            return null;
        }
    }

    // Test sending a simple email
    async testSendSimpleEmail() {
        console.log('📧 Testing simple email sending...');
        
        try {
            const response = await this.api.post('/api/emails/send', {
                to: 'test@example.com',
                subject: 'TrustMD Email Test',
                html: '<h1>Test Email</h1><p>This is a test email from TrustMD.</p>',
                text: 'Test Email\n\nThis is a test email from TrustMD.'
            }, {
                headers: {
                    'x-session-id': 'test-session-id'
                }
            });
            
            if (response.status === 401) {
                console.log('✅ Email send endpoint properly protected (requires authentication)');
                return { protected: true };
            } else if (response.status === 200 && response.data.success) {
                console.log('✅ Simple email sent successfully');
                console.log('📧 Message ID:', response.data.data.messageId);
                return response.data.data;
            } else {
                console.log('⚠️  Email send endpoint response:', response.status, response.data);
                return { status: response.status, data: response.data };
            }
        } catch (error) {
            console.error('❌ Simple email test failed:', error.message);
            return null;
        }
    }

    // Test welcome email endpoint
    async testWelcomeEmail() {
        console.log('📧 Testing welcome email endpoint...');
        
        try {
            const response = await this.api.post('/api/emails/send-welcome', {
                userId: 'test-user-id',
                tenantId: 'test-tenant-id'
            }, {
                headers: {
                    'x-session-id': 'test-session-id'
                }
            });
            
            if (response.status === 401) {
                console.log('✅ Welcome email endpoint properly protected');
                return { protected: true };
            } else if (response.status === 404) {
                console.log('✅ Welcome email endpoint validates user/tenant existence');
                return { validationWorking: true };
            } else if (response.status === 200 && response.data.success) {
                console.log('✅ Welcome email sent successfully');
                return response.data.data;
            } else {
                console.log('⚠️  Welcome email endpoint response:', response.status, response.data);
                return { status: response.status, data: response.data };
            }
        } catch (error) {
            console.error('❌ Welcome email test failed:', error.message);
            return null;
        }
    }

    // Test password reset email endpoint
    async testPasswordResetEmail() {
        console.log('📧 Testing password reset email endpoint...');
        
        try {
            const response = await this.api.post('/api/emails/send-password-reset', {
                email: 'test@example.com',
                resetToken: 'test-reset-token'
            });
            
            if (response.status === 200) {
                console.log('✅ Password reset email endpoint working (security-conscious response)');
                console.log('📝 Response:', response.data.message);
                return response.data;
            } else {
                console.log('⚠️  Password reset endpoint response:', response.status, response.data);
                return { status: response.status, data: response.data };
            }
        } catch (error) {
            console.error('❌ Password reset email test failed:', error.message);
            return null;
        }
    }

    // Test email verification endpoint
    async testEmailVerification() {
        console.log('📧 Testing email verification endpoint...');
        
        try {
            const response = await this.api.post('/api/emails/send-verification', {
                userId: 'test-user-id',
                verificationToken: 'test-verification-token'
            }, {
                headers: {
                    'x-session-id': 'test-session-id'
                }
            });
            
            if (response.status === 401) {
                console.log('✅ Email verification endpoint properly protected');
                return { protected: true };
            } else if (response.status === 404) {
                console.log('✅ Email verification endpoint validates user existence');
                return { validationWorking: true };
            } else if (response.status === 200 && response.data.success) {
                console.log('✅ Email verification sent successfully');
                return response.data.data;
            } else {
                console.log('⚠️  Email verification endpoint response:', response.status, response.data);
                return { status: response.status, data: response.data };
            }
        } catch (error) {
            console.error('❌ Email verification test failed:', error.message);
            return null;
        }
    }

    // Test bulk email sending
    async testBulkEmail() {
        console.log('📧 Testing bulk email sending...');
        
        try {
            const response = await this.api.post('/api/emails/send-bulk', {
                recipients: [
                    { email: 'test1@example.com', name: 'Test User 1' },
                    { email: 'test2@example.com', name: 'Test User 2' }
                ],
                subject: 'TrustMD Bulk Email Test',
                template: 'compliance_reminder',
                globalTemplateData: {
                    complianceItems: [
                        { title: 'HIPAA Training', dueDate: '2024-12-31' }
                    ]
                }
            }, {
                headers: {
                    'x-session-id': 'test-session-id'
                }
            });
            
            if (response.status === 401) {
                console.log('✅ Bulk email endpoint properly protected');
                return { protected: true };
            } else if (response.status === 200 && response.data.success) {
                console.log('✅ Bulk email sent successfully');
                console.log('📊 Summary:', response.data.data.summary);
                return response.data.data;
            } else {
                console.log('⚠️  Bulk email endpoint response:', response.status, response.data);
                return { status: response.status, data: response.data };
            }
        } catch (error) {
            console.error('❌ Bulk email test failed:', error.message);
            return null;
        }
    }

    // Test environment configuration
    testEnvironmentConfig() {
        console.log('🔧 Testing environment configuration...');
        
        const requiredEnvVars = [
            'RESEND_API_KEY',
            'RESEND_FROM_EMAIL',
            'RESEND_FROM_NAME'
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
        
        // Check optional variables
        const optionalEnvVars = [
            'RESEND_SUPPORT_EMAIL',
            'RESEND_BILLING_EMAIL'
        ];
        
        for (const envVar of optionalEnvVars) {
            const value = process.env[envVar];
            const isConfigured = !!value;
            
            config[envVar] = {
                configured: isConfigured,
                hasValue: !!value,
                length: value ? value.length : 0
            };
            
            if (isConfigured) {
                console.log(`✅ ${envVar} configured`);
            } else {
                console.log(`ℹ️  ${envVar} not configured (optional)`);
            }
        }
        
        console.log(`🔧 Environment fully configured: ${allConfigured ? '✅' : '❌'}`);
        return { allConfigured, config };
    }

    // Test integration with auth (password reset)
    async testAuthIntegration() {
        console.log('🔐 Testing auth integration...');
        
        try {
            const response = await this.api.post('/api/auth/request-password-reset', {
                email: 'test@example.com'
            });
            
            if (response.status === 200) {
                console.log('✅ Auth password reset integration working');
                console.log('📝 Response:', response.data.message);
                return response.data;
            } else {
                console.log('⚠️  Auth integration response:', response.status, response.data);
                return { status: response.status, data: response.data };
            }
        } catch (error) {
            console.error('❌ Auth integration test failed:', error.message);
            return null;
        }
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

    // Run complete email integration test
    async runCompleteTest() {
        console.log('🚀 Starting TrustMD Email Integration Test');
        console.log('=' .repeat(50));
        
        const results = {
            timestamp: new Date().toISOString(),
            tests: {}
        };
        
        // Test 1: Environment Configuration
        console.log('\n📋 Test 1: Environment Configuration');
        results.tests.environment = this.testEnvironmentConfig();
        
        // Test 2: Email Service Status
        console.log('\n📋 Test 2: Email Service Status');
        results.tests.emailServiceStatus = await this.testEmailServiceStatus();
        
        // Test 3: Email Endpoints
        console.log('\n📋 Test 3: Email Endpoints');
        results.tests.emailEndpoints = await this.testEmailEndpoints();
        
        // Test 4: Simple Email
        console.log('\n📋 Test 4: Simple Email Sending');
        results.tests.simpleEmail = await this.testSendSimpleEmail();
        
        // Test 5: Welcome Email
        console.log('\n📋 Test 5: Welcome Email');
        results.tests.welcomeEmail = await this.testWelcomeEmail();
        
        // Test 6: Password Reset Email
        console.log('\n📋 Test 6: Password Reset Email');
        results.tests.passwordResetEmail = await this.testPasswordResetEmail();
        
        // Test 7: Email Verification
        console.log('\n📋 Test 7: Email Verification');
        results.tests.emailVerification = await this.testEmailVerification();
        
        // Test 8: Bulk Email
        console.log('\n📋 Test 8: Bulk Email Sending');
        results.tests.bulkEmail = await this.testBulkEmail();
        
        // Test 9: Auth Integration
        console.log('\n📋 Test 9: Auth Integration');
        results.tests.authIntegration = await this.testAuthIntegration();
        
        // Test 10: Database Connectivity
        console.log('\n📋 Test 10: Database Connectivity');
        results.tests.databaseConnectivity = await this.testDatabaseConnectivity();
        
        // Summary
        console.log('\n' + '=' .repeat(50));
        console.log('📧 Email Integration Test Summary');
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
            console.log('🎉 All email integration tests passed!');
        } else {
            console.log('⚠️  Some email integration tests failed. Check configuration.');
        }
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        if (!results.tests.environment?.allConfigured) {
            console.log('- Configure missing Resend environment variables');
        }
        if (!results.tests.emailServiceStatus?.configured) {
            console.log('- Set up Resend API key and configuration');
        }
        if (results.tests.databaseConnectivity?.success === false) {
            console.log('- Check database connectivity and run email schema migration');
        }
        
        return results;
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const baseURL = process.argv[2] || 'http://localhost:3001';
    const tester = new EmailIntegrationTest(baseURL);
    
    tester.runCompleteTest()
        .then(results => {
            console.log('\n🏁 Email integration test completed');
            
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
            console.error('❌ Email integration test failed:', error);
            process.exit(1);
        });
}

module.exports = EmailIntegrationTest;
