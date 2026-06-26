/**
 * Authentication API Routes
 * Handles user authentication, registration, and session management
 * Including OAuth support for Google and Microsoft
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const passport = require('passport');

const router = express.Router();
const { supabase } = require('../services/supabase-client');
const { createSession, validateSession, destroySession } = require('../middleware/session-manager');
const { initializeOAuth, getAvailableProviders, isOAuthConfigured } = require('../utils/oauth-config');
const EmailService = require('../utils/email-service');

// Validation schemas
const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    fullName: Joi.string().min(2).required(),
    role: Joi.string().valid('admin', 'compliance_officer', 'healthcare_provider', 'staff').required(),
    practiceName: Joi.string().min(2).required(),
    practiceType: Joi.string().required(),
    state: Joi.string().length(2).required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
    try {
        // Validate input
        const { error, value } = registerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.details
            });
        }

        const { email, password, fullName, role, practiceName, practiceType, state } = value;

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User already exists'
            });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create tenant first
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({
                name: practiceName,
                practice_name: practiceName,
                practice_type: practiceType,
                subdomain: practiceName.toLowerCase().replace(/\s+/g, '-'),
                subscription_plan: 'basic',
                settings: {},
                is_active: true
            })
            .select()
            .single();

        if (tenantError) {
            console.error('Tenant creation error:', tenantError);
            return res.status(500).json({
                success: false,
                error: 'Failed to create practice'
            });
        }

        // Create user
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert({
                tenant_id: tenant.id,
                email,
                full_name: fullName,
                role,
                department: 'General',
                is_active: true,
                password_hash: hashedPassword
            })
            .select()
            .single();

        if (userError) {
            console.error('User creation error:', userError);
            return res.status(500).json({
                success: false,
                error: 'Failed to create user'
            });
        }

        // Create initial compliance records
        await createInitialComplianceRecords(user.id, tenant.id);

        // Send welcome email
        try {
            const emailService = new EmailService();
            await emailService.sendWelcomeEmail(user, tenant);
        } catch (emailError) {
            console.error('Welcome email failed:', emailError);
            // Don't fail registration if email fails
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                tenantId: tenant.id,
                email: user.email,
                role: user.role 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '24h' }
        );

        // Create session
        const sessionId = await createSession(user.id, tenant.id);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    tenantId: tenant.id
                },
                tenant: {
                    id: tenant.id,
                    name: tenant.name,
                    practiceType: tenant.practice_type
                },
                token,
                sessionId
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/auth/login
 * Authenticate user
 */
router.post('/login', async (req, res) => {
    try {
        // Validate input
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.details
            });
        }

        const { email, password } = value;

        // Get user with tenant info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select(`
                *,
                tenant:tenants(id, name, practice_type, subscription_plan)
            `)
            .eq('email', email)
            .eq('is_active', true)
            .single();

        if (userError || !user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                tenantId: user.tenant_id,
                email: user.email,
                role: user.role 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '24h' }
        );

        // Create session
        const sessionId = await createSession(user.id, user.tenant_id);

        // Update last login
        await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    tenantId: user.tenant_id
                },
                tenant: user.tenant,
                token,
                sessionId
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout user and destroy session
 */
router.post('/logout', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        
        if (sessionId) {
            await destroySession(sessionId);
        }

        res.json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        const session = sessionId ? await validateSession(sessionId) : null;
        
        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        // Get user with tenant info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select(`
                *,
                tenant:tenants(id, name, practice_type, subscription_plan)
            `)
            .eq('id', session.userId)
            .eq('is_active', true)
            .single();

        if (userError || !user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    department: user.department,
                    tenantId: user.tenant_id
                },
                tenant: user.tenant
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/auth/request-password-reset
 * Request password reset email
 */
router.post('/request-password-reset', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        // Get user info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('is_active', true)
            .single();

        if (userError || !user) {
            // Don't reveal if user exists or not
            return res.json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent.'
            });
        }

        // Generate reset token
        const resetToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '1h' }
        );

        // Get tenant info
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', user.tenant_id)
            .single();

        if (tenantError || !tenant) {
            return res.json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent.'
            });
        }

        // Send password reset email
        try {
            const emailService = new EmailService();
            await emailService.sendPasswordResetEmail(user, resetToken);
        } catch (emailError) {
            console.error('Password reset email failed:', emailError);
            // Don't reveal if email failed
        }

        res.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.'
        });
    } catch (error) {
        console.error('Request password reset error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Token and new password are required'
            });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        } catch (jwtError) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }

        // Get user
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', decoded.userId)
            .eq('email', decoded.email)
            .eq('is_active', true)
            .single();

        if (userError || !user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid token'
            });
        }

        // Hash new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: hashedPassword,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            throw updateError;
        }

        res.json({
            success: true,
            message: 'Password reset successful'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * Helper function to create initial compliance records
 */
async function createInitialComplianceRecords(userId, tenantId) {
    try {
        // Create basic compliance requirements
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

/**
 * GET /api/auth/oauth/providers
 * Get available OAuth providers
 */
router.get('/oauth/providers', (req, res) => {
    try {
        const providers = getAvailableProviders();
        
        res.json({
            success: true,
            data: {
                providers,
                oauthEnabled: isOAuthConfigured()
            }
        });
    } catch (error) {
        console.error('OAuth providers error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get OAuth providers'
        });
    }
});

/**
 * GET /api/auth/google
 * Initiate Google OAuth authentication
 */
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
}));

/**
 * GET /api/auth/google/callback
 * Google OAuth callback
 */
router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: process.env.OAUTH_FAILURE_REDIRECT || '/login' }),
    async (req, res) => {
        try {
            const authData = req.user;
            
            // Update last login
            await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', authData.user.id);

            // Redirect to success URL with token
            const redirectUrl = `${process.env.OAUTH_SUCCESS_REDIRECT || '/dashboard'}?token=${authData.token}&sessionId=${authData.sessionId}&provider=${authData.provider}`;
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('Google OAuth callback error:', error);
            res.redirect(process.env.OAUTH_FAILURE_REDIRECT || '/login?error=oauth_failed');
        }
    }
);

/**
 * GET /api/auth/microsoft
 * Initiate Microsoft OAuth authentication
 */
router.get('/microsoft', passport.authenticate('azuread-openidconnect', {
    scope: ['openid', 'profile', 'email']
}));

/**
 * GET /api/auth/microsoft/callback
 * Microsoft OAuth callback
 */
router.get('/microsoft/callback',
    passport.authenticate('azuread-openidconnect', { failureRedirect: process.env.OAUTH_FAILURE_REDIRECT || '/login' }),
    async (req, res) => {
        try {
            const authData = req.user;
            
            // Update last login
            await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', authData.user.id);

            // Redirect to success URL with token
            const redirectUrl = `${process.env.OAUTH_SUCCESS_REDIRECT || '/dashboard'}?token=${authData.token}&sessionId=${authData.sessionId}&provider=${authData.provider}`;
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('Microsoft OAuth callback error:', error);
            res.redirect(process.env.OAUTH_FAILURE_REDIRECT || '/login?error=oauth_failed');
        }
    }
);

/**
 * GET /api/auth/apple
 * Initiate Apple Sign In authentication
 */
router.get('/apple', passport.authenticate('apple', {
    scope: ['name', 'email']
}));

/**
 * POST /api/auth/apple
 * Initiate Apple Sign In authentication (POST for mobile apps)
 */
router.post('/apple', passport.authenticate('apple', {
    scope: ['name', 'email']
}));

/**
 * GET /api/auth/apple/callback
 * Apple Sign In callback
 */
router.get('/apple/callback',
    passport.authenticate('apple', { failureRedirect: process.env.OAUTH_FAILURE_REDIRECT || '/login' }),
    async (req, res) => {
        try {
            const authData = req.user;
            
            // Update last login
            await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', authData.user.id);

            // Redirect to success URL with token
            const redirectUrl = `${process.env.OAUTH_SUCCESS_REDIRECT || '/dashboard'}?token=${authData.token}&sessionId=${authData.sessionId}&provider=${authData.provider}`;
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('Apple OAuth callback error:', error);
            res.redirect(process.env.OAUTH_FAILURE_REDIRECT || '/login?error=oauth_failed');
        }
    }
);

/**
 * POST /api/auth/oauth/verify
 * Verify OAuth token and return user data
 */
router.post('/oauth/verify', async (req, res) => {
    try {
        const { token, sessionId } = req.body;
        
        if (!token || !sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Token and session ID are required'
            });
        }

        // Validate session
        const session = await validateSession(sessionId);
        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        
        // Get user with tenant info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select(`
                *,
                tenant:tenants(id, name, practice_type, subscription_plan)
            `)
            .eq('id', decoded.userId)
            .eq('is_active', true)
            .single();

        if (userError || !user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    department: user.department,
                    oauthProvider: user.oauth_provider,
                    tenantId: user.tenant_id
                },
                tenant: user.tenant,
                token,
                sessionId
            }
        });

    } catch (error) {
        console.error('OAuth token verification error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
});

/**
 * GET /api/auth/test
 * Test endpoint to verify auth routes are working
 */
router.get('/test', (req, res) => {
    const providers = getAvailableProviders();
    
    res.json({
        success: true,
        message: 'Auth API routes are working!',
        timestamp: new Date().toISOString(),
        availableEndpoints: [
            'POST /api/auth/register',
            'POST /api/auth/login', 
            'POST /api/auth/logout',
            'GET /api/auth/me',
            'GET /api/auth/oauth/providers',
            'GET /api/auth/google',
            'GET /api/auth/google/callback',
            'GET /api/auth/microsoft',
            'GET /api/auth/microsoft/callback',
            'POST /api/auth/oauth/verify',
            'GET /api/auth/test'
        ],
        oauthProviders: providers,
        oauthEnabled: isOAuthConfigured()
    });
});

module.exports = router;
