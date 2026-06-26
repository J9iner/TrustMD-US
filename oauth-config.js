// TrustMD OAuth Configuration
// Handles OAuth strategies for Google and Microsoft authentication

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AzureADStrategy = require('passport-azure-ad').OIDCStrategyStrategy;
const AppleStrategy = require('passport-apple').Strategy;
const { supabase } = require('../services/supabase-client');
const { createSession, destroySession } = require('../middleware/session-manager');
const jwt = require('jsonwebtoken');

// OAuth configuration
const oauthConfig = {
    google: {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback'
    },
    microsoft: {
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:3001/api/auth/microsoft/callback',
        identityMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
        responseType: 'code',
        responseMode: 'query',
        scope: ['openid', 'profile', 'email'],
        allowHttpForRedirectUrl: process.env.NODE_ENV === 'development'
    },
    apple: {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        keyFilePath: process.env.APPLE_KEY_FILE_PATH,
        callbackURL: process.env.APPLE_CALLBACK_URL || 'http://localhost:3001/api/auth/apple/callback',
        scope: ['name', 'email']
    }
};

// Helper function to create or update OAuth user
async function createOrUpdateOAuthUser(profile, provider, tenantId = null) {
    try {
        // Handle different profile structures for different providers
        let email;
        let fullName;
        
        if (provider === 'apple') {
            // Apple Sign In profile structure
            email = profile.email || (profile.emails && profile.emails[0]?.value);
            // Apple may not provide name on first sign-in
            fullName = profile.name ? `${profile.name.firstName || ''} ${profile.name.lastName || ''}`.trim() : 'Apple User';
            
            if (!email) {
                throw new Error('Email is required from Apple Sign In');
            }
        } else {
            // Google and Microsoft profile structure
            email = profile.emails?.[0]?.value;
            if (!email) {
                throw new Error('Email is required from OAuth provider');
            }
            
            fullName = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();
        }

        // Check if user exists
        const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (userError && userError.code !== 'PGRST116') { // Not found error
            throw userError;
        }

        let user, tenant;

        if (existingUser) {
            // User exists, update OAuth info
            const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update({
                    oauth_provider: provider,
                    oauth_id: profile.id,
                    last_login: new Date().toISOString(),
                    is_active: true
                })
                .eq('id', existingUser.id)
                .select()
                .single();

            if (updateError) throw updateError;
            user = updatedUser;

            // Get tenant info
            const { data: userTenant } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', user.tenant_id)
                .single();

            tenant = userTenant;

        } else {
            // New user, create account and tenant
            const practiceName = `${fullName}'s Practice`;
            const { data: newTenant, error: tenantError } = await supabase
                .from('tenants')
                .insert({
                    name: practiceName,
                    practice_name: practiceName,
                    practice_type: 'General Practice',
                    subdomain: practiceName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                    subscription_plan: 'basic',
                    settings: {},
                    is_active: true
                })
                .select()
                .single();

            if (tenantError) throw tenantError;
            tenant = newTenant;

            // Create user
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    tenant_id: tenant.id,
                    email,
                    full_name: fullName,
                    role: 'healthcare_provider',
                    department: 'General',
                    is_active: true,
                    oauth_provider: provider,
                    oauth_id: profile.id,
                    password_hash: null // OAuth users don't have passwords
                })
                .select()
                .single();

            if (createError) throw createError;
            user = newUser;

            // Create initial compliance records
            await createInitialComplianceRecords(user.id, tenant.id);
        }

        return { user, tenant };
    } catch (error) {
        console.error('OAuth user creation error:', error);
        throw error;
    }
}

// Helper function to create initial compliance records
async function createInitialComplianceRecords(userId, tenantId) {
    try {
        const { error } = await supabase
            .from('user_compliance')
            .insert([
                {
                    user_id: userId,
                    requirement_id: 'hipaa-privacy',
                    status: 'pending',
                    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    user_id: userId,
                    requirement_id: 'osha-training',
                    status: 'pending',
                    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            ]);

        if (error) {
            console.error('Failed to create initial compliance records:', error);
        }
    } catch (error) {
        console.error('Error creating initial compliance records:', error);
    }
}

// Helper function to generate JWT token
function generateJWT(user, tenant) {
    return jwt.sign(
        { 
            userId: user.id, 
            tenantId: tenant.id,
            email: user.email,
            role: user.role 
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
    );
}

// Google OAuth Strategy
passport.use(new GoogleStrategy(
    oauthConfig.google,
    async (accessToken, refreshToken, profile, done) => {
        try {
            const result = await createOrUpdateOAuthUser(profile, 'google');
            
            if (!result.user || !result.tenant) {
                return done(new Error('Failed to create or update user'), null);
            }

            const token = generateJWT(result.user, result.tenant);
            const sessionId = await createSession(result.user.id, result.tenant.id);

            return done(null, {
                user: result.user,
                tenant: result.tenant,
                token,
                sessionId,
                provider: 'google'
            });
        } catch (error) {
            return done(error, null);
        }
    }
));

// Microsoft OAuth Strategy
passport.use(new AzureADStrategy(
    oauthConfig.microsoft,
    async (iss, sub, profile, accessToken, refreshToken, done) => {
        try {
            const result = await createOrUpdateOAuthUser(profile, 'microsoft');
            
            if (!result.user || !result.tenant) {
                return done(new Error('Failed to create or update user'), null);
            }

            const token = generateJWT(result.user, result.tenant);
            const sessionId = await createSession(result.user.id, result.tenant.id);

            return done(null, {
                user: result.user,
                tenant: result.tenant,
                token,
                sessionId,
                provider: 'microsoft'
            });
        } catch (error) {
            return done(error, null);
        }
    }
));

// Apple OAuth Strategy
passport.use(new AppleStrategy(
    oauthConfig.apple,
    async (accessToken, refreshToken, idToken, profile, done) => {
        try {
            const result = await createOrUpdateOAuthUser(profile, 'apple');
            
            if (!result.user || !result.tenant) {
                return done(new Error('Failed to create or update user'), null);
            }

            const token = generateJWT(result.user, result.tenant);
            const sessionId = await createSession(result.user.id, result.tenant.id);

            return done(null, {
                user: result.user,
                tenant: result.tenant,
                token,
                sessionId,
                provider: 'apple'
            });
        } catch (error) {
            return done(error, null);
        }
    }
));

// Serialization for session management
passport.serializeUser((data, done) => {
    done(null, data);
});

passport.deserializeUser((data, done) => {
    done(null, data);
});

// Middleware initialization
function initializeOAuth(app) {
    // Check if OAuth is properly configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn('Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
    }

    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
        console.warn('Microsoft OAuth not configured. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables.');
    }

    if (!process.env.APPLE_CLIENT_ID || !process.env.APPLE_TEAM_ID || !process.env.APPLE_KEY_ID || !process.env.APPLE_KEY_FILE_PATH) {
        console.warn('Apple OAuth not configured. Set APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_KEY_FILE_PATH environment variables.');
    }

    // Initialize passport
    app.use(passport.initialize());
    app.use(passport.session());

    console.log('OAuth middleware initialized');
}

// Helper function to check if OAuth is configured
function isOAuthConfigured() {
    return (
        (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ||
        (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) ||
        (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_KEY_FILE_PATH)
    );
}

// Get available OAuth providers
function getAvailableProviders() {
    const providers = [];
    
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        providers.push({
            name: 'google',
            displayName: 'Google',
            authUrl: '/api/auth/google',
            icon: 'google-icon'
        });
    }

    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
        providers.push({
            name: 'microsoft',
            displayName: 'Microsoft',
            authUrl: '/api/auth/microsoft',
            icon: 'microsoft-icon'
        });
    }

    if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_KEY_FILE_PATH) {
        providers.push({
            name: 'apple',
            displayName: 'Apple',
            authUrl: '/api/auth/apple',
            icon: 'apple-icon'
        });
    }

    return providers;
}

module.exports = {
    initializeOAuth,
    isOAuthConfigured,
    getAvailableProviders,
    oauthConfig,
    createOrUpdateOAuthUser,
    generateJWT
};
