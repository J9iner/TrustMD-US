// TrustMD Apple Sign In Test
// Test script to verify Apple OAuth functionality

const axios = require('axios');

class AppleSignInTest {
    constructor(baseURL = 'http://localhost:3001') {
        this.baseURL = baseURL;
        this.api = axios.create({
            baseURL,
            timeout: 10000,
            validateStatus: () => true // Don't throw on HTTP errors
        });
    }

    // Test OAuth providers endpoint includes Apple
    async testOAuthProviders() {
        console.log('🍎 Testing OAuth providers endpoint...');
        
        try {
            const response = await this.api.get('/api/auth/oauth/providers');
            
            if (response.status === 200 && response.data.success) {
                console.log('✅ OAuth providers endpoint working');
                console.log('📋 Available providers:', response.data.data.providers.map(p => p.displayName));
                
                const appleProvider = response.data.data.providers.find(p => p.name === 'apple');
                if (appleProvider) {
                    console.log('✅ Apple Sign In provider available');
                    console.log('🔗 Auth URL:', appleProvider.authUrl);
                    return true;
                } else {
                    console.log('❌ Apple Sign In provider not available');
                    return false;
                }
            } else {
                console.log('❌ OAuth providers endpoint failed:', response.data);
                return false;
            }
        } catch (error) {
            console.error('❌ OAuth providers test failed:', error.message);
            return false;
        }
    }

    // Test Apple OAuth initiation
    async testAppleOAuthInitiation() {
        console.log('🍎 Testing Apple OAuth initiation...');
        
        try {
            const response = await this.api.get('/api/auth/apple', {
                maxRedirects: 0 // Don't follow redirects
            });
            
            if (response.status === 302) {
                console.log('✅ Apple OAuth initiation working');
                console.log('🔄 Redirect to:', response.headers.location);
                return true;
            } else if (response.status === 404) {
                console.log('❌ Apple OAuth route not found');
                return false;
            } else {
                console.log('⚠️  Apple OAuth initiation response:', response.status);
                return false;
            }
        } catch (error) {
            if (error.response && error.response.status === 302) {
                console.log('✅ Apple OAuth initiation working');
                console.log('🔄 Redirect to:', error.response.headers.location);
                return true;
            } else {
                console.error('❌ Apple OAuth initiation test failed:', error.message);
                return false;
            }
        }
    }

    // Test Apple OAuth POST initiation (for mobile apps)
    async testAppleOAuthPost() {
        console.log('🍎 Testing Apple OAuth POST initiation...');
        
        try {
            const response = await this.api.post('/api/auth/apple', {}, {
                maxRedirects: 0
            });
            
            if (response.status === 302) {
                console.log('✅ Apple OAuth POST initiation working');
                console.log('🔄 Redirect to:', response.headers.location);
                return true;
            } else {
                console.log('⚠️  Apple OAuth POST initiation response:', response.status);
                return false;
            }
        } catch (error) {
            if (error.response && error.response.status === 302) {
                console.log('✅ Apple OAuth POST initiation working');
                console.log('🔄 Redirect to:', error.response.headers.location);
                return true;
            } else {
                console.error('❌ Apple OAuth POST initiation test failed:', error.message);
                return false;
            }
        }
    }

    // Test environment configuration
    testEnvironmentConfig() {
        console.log('🔧 Testing Apple Sign In environment configuration...');
        
        const requiredEnvVars = [
            'APPLE_CLIENT_ID',
            'APPLE_TEAM_ID',
            'APPLE_KEY_ID',
            'APPLE_KEY_FILE_PATH'
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
            'APPLE_CALLBACK_URL'
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
        
        console.log(`🔧 Apple Sign In fully configured: ${allConfigured ? '✅' : '❌'}`);
        return { allConfigured, config };
    }

    // Test Apple key file existence
    testAppleKeyFile() {
        console.log('🔑 Testing Apple key file...');
        
        const keyFilePath = process.env.APPLE_KEY_FILE_PATH;
        if (!keyFilePath) {
            console.log('❌ APPLE_KEY_FILE_PATH not configured');
            return false;
        }
        
        try {
            const fs = require('fs');
            const exists = fs.existsSync(keyFilePath);
            
            if (exists) {
                console.log('✅ Apple key file exists');
                console.log('📁 Key file path:', keyFilePath);
                return true;
            } else {
                console.log('❌ Apple key file not found at:', keyFilePath);
                return false;
            }
        } catch (error) {
            console.error('❌ Error checking Apple key file:', error.message);
            return false;
        }
    }

    // Test Apple OAuth configuration
    testAppleOAuthConfig() {
        console.log('⚙️  Testing Apple OAuth configuration...');
        
        const config = {
            clientID: process.env.APPLE_CLIENT_ID,
            teamID: process.env.APPLE_TEAM_ID,
            keyID: process.env.APPLE_KEY_ID,
            keyFilePath: process.env.APPLE_KEY_FILE_PATH,
            callbackURL: process.env.APPLE_CALLBACK_URL || 'http://localhost:3001/api/auth/apple/callback',
            scope: ['name', 'email']
        };
        
        console.log('📋 Apple OAuth Configuration:');
        Object.entries(config).forEach(([key, value]) => {
            if (key === 'keyFilePath') {
                console.log(`  ${key}: ${value ? '✅ Configured' : '❌ Missing'}`);
            } else {
                console.log(`  ${key}: ${value || '❌ Missing'}`);
            }
        });
        
        const isConfigured = !!(config.clientID && config.teamID && config.keyID && config.keyFilePath);
        console.log(`⚙️  Apple OAuth properly configured: ${isConfigured ? '✅' : '❌'}`);
        
        return { isConfigured, config };
    }

    // Test database connectivity
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

    // Run complete Apple Sign In test
    async runCompleteTest() {
        console.log('🍎 Starting TrustMD Apple Sign In Test');
        console.log('=' .repeat(50));
        
        const results = {
            timestamp: new Date().toISOString(),
            tests: {}
        };
        
        // Test 1: Environment Configuration
        console.log('\n📋 Test 1: Environment Configuration');
        results.tests.environment = this.testEnvironmentConfig();
        
        // Test 2: Apple Key File
        console.log('\n📋 Test 2: Apple Key File');
        results.tests.keyFile = this.testAppleKeyFile();
        
        // Test 3: Apple OAuth Config
        console.log('\n📋 Test 3: Apple OAuth Configuration');
        results.tests.oauthConfig = this.testAppleOAuthConfig();
        
        // Test 4: Database Connectivity
        console.log('\n📋 Test 4: Database Connectivity');
        results.tests.databaseConnectivity = await this.testDatabaseConnectivity();
        
        // Test 5: OAuth Providers
        console.log('\n📋 Test 5: OAuth Providers Endpoint');
        results.tests.oauthProviders = await this.testOAuthProviders();
        
        // Test 6: Apple OAuth Initiation
        console.log('\n📋 Test 6: Apple OAuth Initiation');
        results.tests.oauthInitiation = await this.testAppleOAuthInitiation();
        
        // Test 7: Apple OAuth POST Initiation
        console.log('\n📋 Test 7: Apple OAuth POST Initiation');
        results.tests.oauthPostInitiation = await this.testAppleOAuthPost();
        
        // Summary
        console.log('\n' + '=' .repeat(50));
        console.log('🍎 Apple Sign In Test Summary');
        console.log('=' .repeat(50));
        
        const testResults = Object.values(results.tests);
        const passedTests = testResults.filter(test => {
            if (typeof test === 'object' && test !== null) {
                return test.success || test.allConfigured || test.isConfigured || test === true;
            }
            return test === true;
        }).length;
        
        console.log(`✅ Passed: ${passedTests}/${testResults.length}`);
        console.log(`❌ Failed: ${testResults.length - passedTests}/${testResults.length}`);
        
        if (passedTests === testResults.length) {
            console.log('🎉 All Apple Sign In tests passed!');
        } else {
            console.log('⚠️  Some Apple Sign In tests failed. Check configuration.');
        }
        
        // Recommendations
        console.log('\n💡 Apple Sign In Setup Recommendations:');
        if (!results.tests.environment?.allConfigured) {
            console.log('- Configure missing Apple environment variables');
        }
        if (!results.tests.keyFile) {
            console.log('- Download and place Apple private key file');
        }
        if (!results.tests.oauthProviders) {
            console.log('- Check Apple OAuth configuration in oauth-config.js');
        }
        if (!results.tests.oauthInitiation) {
            console.log('- Verify Apple Sign In credentials and callback URL');
        }
        
        return results;
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const baseURL = process.argv[2] || 'http://localhost:3001';
    const tester = new AppleSignInTest(baseURL);
    
    tester.runCompleteTest()
        .then(results => {
            console.log('\n🏁 Apple Sign In test completed');
            
            // Exit with appropriate code
            const allPassed = Object.values(results.tests).every(test => {
                if (typeof test === 'object' && test !== null) {
                    return test.success || test.allConfigured || test.isConfigured || test === true;
                }
                return test === true;
            });
            
            process.exit(allPassed ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Apple Sign In test failed:', error);
            process.exit(1);
        });
}

module.exports = AppleSignInTest;
