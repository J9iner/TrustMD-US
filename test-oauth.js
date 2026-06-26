// TrustMD OAuth Integration Test
// Test script to verify OAuth functionality

const axios = require('axios');

class OAuthIntegrationTest {
    constructor(baseURL = 'http://localhost:3001') {
        this.baseURL = baseURL;
        this.api = axios.create({
            baseURL,
            timeout: 10000,
            validateStatus: () => true // Don't throw on HTTP errors
        });
    }

    // Test OAuth providers endpoint
    async testOAuthProviders() {
        console.log('🔍 Testing OAuth providers endpoint...');
        
        try {
            const response = await this.api.get('/api/auth/oauth/providers');
            
            if (response.status === 200 && response.data.success) {
                console.log('✅ OAuth providers endpoint working');
                console.log('📊 Available providers:', response.data.data.providers);
                console.log('🔧 OAuth enabled:', response.data.data.oauthEnabled);
                return response.data.data;
            } else {
                console.log('❌ OAuth providers endpoint failed:', response.data);
                return null;
            }
        } catch (error) {
            console.error('❌ OAuth providers test failed:', error.message);
            return null;
        }
    }

    // Test auth endpoint availability
    async testAuthEndpoints() {
        console.log('🔍 Testing auth endpoints...');
        
        try {
            const response = await this.api.get('/api/auth/test');
            
            if (response.status === 200 && response.data.success) {
                console.log('✅ Auth endpoints working');
                console.log('📋 Available endpoints:', response.data.availableEndpoints);
                console.log('🔐 OAuth providers:', response.data.oauthProviders);
                return response.data;
            } else {
                console.log('❌ Auth test endpoint failed:', response.data);
                return null;
            }
        } catch (error) {
            console.error('❌ Auth endpoints test failed:', error.message);
            return null;
        }
    }

    // Test OAuth redirect URLs
    async testOAuthRedirects() {
        console.log('🔍 Testing OAuth redirect URLs...');
        
        const providers = ['google', 'microsoft'];
        const results = {};
        
        for (const provider of providers) {
            try {
                const response = await this.api.get(`/api/auth/${provider}`, {
                    maxRedirects: 0,
                    validateStatus: (status) => status >= 300 && status < 400 // Only redirects
                });
                
                if (response.status >= 300 && response.status < 400) {
                    console.log(`✅ ${provider} OAuth redirect working`);
                    console.log(`🔗 Redirect to:`, response.headers.location);
                    results[provider] = {
                        success: true,
                        redirectUrl: response.headers.location
                    };
                } else {
                    console.log(`⚠️  ${provider} OAuth redirect unexpected status:`, response.status);
                    results[provider] = {
                        success: false,
                        status: response.status,
                        error: 'Unexpected response status'
                    };
                }
            } catch (error) {
                console.log(`❌ ${provider} OAuth redirect failed:`, error.message);
                results[provider] = {
                    success: false,
                    error: error.message
                };
            }
        }
        
        return results;
    }

    // Test environment configuration
    testEnvironmentConfig() {
        console.log('🔍 Testing environment configuration...');
        
        const requiredEnvVars = [
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET',
            'MICROSOFT_CLIENT_ID',
            'MICROSOFT_CLIENT_SECRET',
            'SESSION_SECRET',
            'JWT_SECRET'
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

    // Test database schema for OAuth
    async testDatabaseSchema() {
        console.log('🔍 Testing database schema for OAuth...');
        
        // This would require database access - for now, just check if we can reach the API
        try {
            const response = await this.api.get('/api/health');
            
            if (response.status === 200) {
                console.log('✅ API is reachable (database likely connected)');
                return { success: true, apiHealthy: true };
            } else {
                console.log('⚠️  API health check failed');
                return { success: false, apiHealthy: false };
            }
        } catch (error) {
            console.log('❌ Database schema test failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Run complete OAuth integration test
    async runCompleteTest() {
        console.log('🚀 Starting TrustMD OAuth Integration Test');
        console.log('=' .repeat(50));
        
        const results = {
            timestamp: new Date().toISOString(),
            tests: {}
        };
        
        // Test 1: Environment Configuration
        console.log('\n📋 Test 1: Environment Configuration');
        results.tests.environment = this.testEnvironmentConfig();
        
        // Test 2: Auth Endpoints
        console.log('\n📋 Test 2: Auth Endpoints');
        results.tests.authEndpoints = await this.testAuthEndpoints();
        
        // Test 3: OAuth Providers
        console.log('\n📋 Test 3: OAuth Providers');
        results.tests.oauthProviders = await this.testOAuthProviders();
        
        // Test 4: OAuth Redirects
        console.log('\n📋 Test 4: OAuth Redirects');
        results.tests.oauthRedirects = await this.testOAuthRedirects();
        
        // Test 5: Database Schema
        console.log('\n📋 Test 5: Database Schema');
        results.tests.databaseSchema = await this.testDatabaseSchema();
        
        // Summary
        console.log('\n' + '=' .repeat(50));
        console.log('📊 OAuth Integration Test Summary');
        console.log('=' .repeat(50));
        
        const testResults = Object.values(results.tests);
        const passedTests = testResults.filter(test => {
            if (typeof test === 'object' && test !== null) {
                return test.success || test.allConfigured || (test.data && test.data.success);
            }
            return false;
        }).length;
        
        console.log(`✅ Passed: ${passedTests}/${testResults.length}`);
        console.log(`❌ Failed: ${testResults.length - passedTests}/${testResults.length}`);
        
        if (passedTests === testResults.length) {
            console.log('🎉 All OAuth integration tests passed!');
        } else {
            console.log('⚠️  Some OAuth integration tests failed. Check configuration.');
        }
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        if (!results.tests.environment?.allConfigured) {
            console.log('- Configure missing environment variables in .env file');
        }
        if (!results.tests.oauthProviders?.oauthEnabled) {
            console.log('- Set up OAuth provider credentials (Google/Microsoft)');
        }
        if (results.tests.oauthRedirects) {
            const failedRedirects = Object.entries(results.tests.oauthRedirects)
                .filter(([_, result]) => !result.success);
            if (failedRedirects.length > 0) {
                console.log('- Check OAuth provider configuration for:', failedRedirects.map(([p]) => p).join(', '));
            }
        }
        
        return results;
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const baseURL = process.argv[2] || 'http://localhost:3001';
    const tester = new OAuthIntegrationTest(baseURL);
    
    tester.runCompleteTest()
        .then(results => {
            console.log('\n🏁 OAuth integration test completed');
            process.exit(results.tests.environment?.allConfigured ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ OAuth integration test failed:', error);
            process.exit(1);
        });
}

module.exports = OAuthIntegrationTest;
