/**
 * Email API Routes
 * Handles email sending and management through Resend
 */

const express = require('express');
const Joi = require('joi');
const router = express.Router();

const { supabase } = require('../services/supabase-client');
const { validateSession } = require('../middleware/session-manager');
const EmailService = require('../utils/email-service');

// Initialize email service
const emailService = new EmailService();

// Validation schemas
const sendEmailSchema = Joi.object({
    to: Joi.alternatives().try(
        Joi.string().email(),
        Joi.array().items(Joi.string().email())
    ).required(),
    subject: Joi.string().min(1).max(200).required(),
    html: Joi.string().optional(),
    text: Joi.string().optional(),
    replyTo: Joi.string().email().optional(),
    template: Joi.string().optional(),
    templateData: Joi.object().optional()
});

const sendBulkEmailSchema = Joi.object({
    recipients: Joi.array().items(
        Joi.object({
            email: Joi.string().email().required(),
            name: Joi.string().optional(),
            templateData: Joi.object().optional()
        })
    ).required(),
    subject: Joi.string().min(1).max(200).required(),
    template: Joi.string().required(),
    globalTemplateData: Joi.object().optional()
});

/**
 * POST /api/emails/send
 * Send a single email
 */
router.post('/send', async (req, res) => {
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
        const { error, value } = sendEmailSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.details
            });
        }

        const { to, subject, html, text, replyTo, template, templateData } = value;

        // Get user and tenant info
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

        let emailContent = { html, text };

        // Handle template-based emails
        if (template && templateData) {
            emailContent = generateTemplateEmail(template, templateData, user, tenant);
        }

        // Send email
        const result = await emailService.sendEmail({
            to,
            subject,
            ...emailContent,
            replyTo
        });

        // Log email sent
        await logEmailActivity({
            tenantId: session.tenantId,
            userId: session.userId,
            type: 'single',
            recipients: Array.isArray(to) ? to : [to],
            subject,
            template,
            status: 'sent',
            messageId: result.messageId
        });

        res.json({
            success: true,
            data: {
                messageId: result.messageId,
                status: 'sent'
            }
        });
    } catch (error) {
        console.error('Send email error:', error);
        
        // Log failed email
        if (req.headers['x-session-id']) {
            const session = await validateSession(req.headers['x-session-id']);
            if (session) {
                await logEmailActivity({
                    tenantId: session.tenantId,
                    userId: session.userId,
                    type: 'single',
                    recipients: Array.isArray(req.body.to) ? req.body.to : [req.body.to],
                    subject: req.body.subject,
                    template: req.body.template,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        res.status(500).json({
            success: false,
            error: 'Failed to send email'
        });
    }
});

/**
 * POST /api/emails/send-bulk
 * Send bulk emails
 */
router.post('/send-bulk', async (req, res) => {
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
        const { error, value } = sendBulkEmailSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.details
            });
        }

        const { recipients, subject, template, globalTemplateData } = value;

        // Get user and tenant info
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

        const results = [];
        const failedRecipients = [];

        // Send emails to each recipient
        for (const recipient of recipients) {
            try {
                const templateData = {
                    ...globalTemplateData,
                    ...recipient.templateData,
                    recipientName: recipient.name || recipient.email.split('@')[0]
                };

                const emailContent = generateTemplateEmail(template, templateData, user, tenant);

                const result = await emailService.sendEmail({
                    to: recipient.email,
                    subject,
                    ...emailContent
                });

                results.push({
                    email: recipient.email,
                    success: true,
                    messageId: result.messageId
                });
            } catch (error) {
                console.error(`Failed to send email to ${recipient.email}:`, error);
                failedRecipients.push({
                    email: recipient.email,
                    error: error.message
                });
                results.push({
                    email: recipient.email,
                    success: false,
                    error: error.message
                });
            }
        }

        // Log bulk email activity
        await logEmailActivity({
            tenantId: session.tenantId,
            userId: session.userId,
            type: 'bulk',
            recipients: recipients.map(r => r.email),
            subject,
            template,
            status: results.every(r => r.success) ? 'sent' : 'partial',
            successCount: results.filter(r => r.success).length,
            failureCount: failedRecipients.length
        });

        res.json({
            success: true,
            data: {
                results,
                summary: {
                    total: recipients.length,
                    sent: results.filter(r => r.success).length,
                    failed: failedRecipients.length
                }
            }
        });
    } catch (error) {
        console.error('Send bulk email error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send bulk emails'
        });
    }
});

/**
 * POST /api/emails/send-welcome
 * Send welcome email
 */
router.post('/send-welcome', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        const session = await validateSession(sessionId);
        
        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        const { userId, tenantId } = req.body;

        if (!userId || !tenantId) {
            return res.status(400).json({
                success: false,
                error: 'User ID and Tenant ID are required'
            });
        }

        // Get user and tenant info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', tenantId)
            .single();

        if (tenantError || !tenant) {
            return res.status(404).json({
                success: false,
                error: 'Tenant not found'
            });
        }

        // Send welcome email
        const result = await emailService.sendWelcomeEmail(user, tenant);

        // Log email activity
        await logEmailActivity({
            tenantId,
            userId,
            type: 'welcome',
            recipients: [user.email],
            subject: 'Welcome to TrustMD',
            status: 'sent',
            messageId: result.messageId
        });

        res.json({
            success: true,
            data: {
                messageId: result.messageId,
                status: 'sent'
            }
        });
    } catch (error) {
        console.error('Send welcome email error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send welcome email'
        });
    }
});

/**
 * POST /api/emails/send-password-reset
 * Send password reset email
 */
router.post('/send-password-reset', async (req, res) => {
    try {
        const { email, resetToken } = req.body;

        if (!email || !resetToken) {
            return res.status(400).json({
                success: false,
                error: 'Email and reset token are required'
            });
        }

        // Get user info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (userError || !user) {
            // Don't reveal if user exists or not
            return res.json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent.'
            });
        }

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
        const result = await emailService.sendPasswordResetEmail(user, resetToken);

        // Log email activity
        await logEmailActivity({
            tenantId: user.tenant_id,
            userId: user.id,
            type: 'password_reset',
            recipients: [user.email],
            subject: 'Reset Your TrustMD Password',
            status: 'sent',
            messageId: result.messageId
        });

        res.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.'
        });
    } catch (error) {
        console.error('Send password reset email error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send password reset email'
        });
    }
});

/**
 * POST /api/emails/send-verification
 * Send email verification
 */
router.post('/send-verification', async (req, res) => {
    try {
        const { userId, verificationToken } = req.body;

        if (!userId || !verificationToken) {
            return res.status(400).json({
                success: false,
                error: 'User ID and verification token are required'
            });
        }

        // Get user info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get tenant info
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', user.tenant_id)
            .single();

        if (tenantError || !tenant) {
            return res.status(404).json({
                success: false,
                error: 'Tenant not found'
            });
        }

        // Send verification email
        const result = await emailService.sendEmailVerification(user, verificationToken);

        // Log email activity
        await logEmailActivity({
            tenantId: user.tenant_id,
            userId: user.id,
            type: 'email_verification',
            recipients: [user.email],
            subject: 'Verify Your TrustMD Email',
            status: 'sent',
            messageId: result.messageId
        });

        res.json({
            success: true,
            data: {
                messageId: result.messageId,
                status: 'sent'
            }
        });
    } catch (error) {
        console.error('Send verification email error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send verification email'
        });
    }
});

/**
 * GET /api/emails/status
 * Check email service status
 */
router.get('/status', async (req, res) => {
    try {
        const isConfigured = emailService.isReady();
        
        res.json({
            success: true,
            data: {
                service: 'resend',
                configured: isConfigured,
                fromEmail: process.env.RESEND_FROM_EMAIL,
                fromName: process.env.RESEND_FROM_NAME,
                availableTemplates: [
                    'welcome',
                    'password_reset',
                    'email_verification',
                    'subscription_confirmation',
                    'payment_failed',
                    'subscription_cancelled',
                    'compliance_reminder',
                    'document_upload',
                    'security_alert'
                ]
            }
        });
    } catch (error) {
        console.error('Email status check error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check email service status'
        });
    }
});

/**
 * GET /api/emails/test
 * Test email endpoints
 */
router.get('/test', async (req, res) => {
    try {
        const isConfigured = emailService.isReady();
        
        res.json({
            success: true,
            message: 'Email API routes are working!',
            timestamp: new Date().toISOString(),
            emailServiceConfigured: isConfigured,
            availableEndpoints: [
                'POST /api/emails/send',
                'POST /api/emails/send-bulk',
                'POST /api/emails/send-welcome',
                'POST /api/emails/send-password-reset',
                'POST /api/emails/send-verification',
                'GET /api/emails/status',
                'GET /api/emails/test'
            ]
        });
    } catch (error) {
        console.error('Email test error:', error);
        res.status(500).json({
            success: false,
            error: 'Email test failed'
        });
    }
});

// Helper function to generate template emails
function generateTemplateEmail(template, templateData, user, tenant) {
    switch (template) {
        case 'compliance_reminder':
            return {
                html: emailService.getComplianceReminderTemplate(user, tenant, templateData.complianceItems),
                text: emailService.getComplianceReminderTextTemplate(user, tenant, templateData.complianceItems)
            };
        case 'document_upload':
            return {
                html: emailService.getDocumentUploadTemplate(user, tenant, templateData.document),
                text: emailService.getDocumentUploadTextTemplate(user, tenant, templateData.document)
            };
        case 'security_alert':
            return {
                html: emailService.getSecurityAlertTemplate(user, tenant, templateData.alertDetails),
                text: emailService.getSecurityAlertTextTemplate(user, tenant, templateData.alertDetails)
            };
        default:
            return {
                html: templateData.html || '',
                text: templateData.text || ''
            };
    }
}

// Helper function to log email activity
async function logEmailActivity(activity) {
    try {
        await supabase
            .from('email_logs')
            .insert({
                tenant_id: activity.tenantId,
                user_id: activity.userId,
                type: activity.type,
                recipients: activity.recipients,
                subject: activity.subject,
                template: activity.template,
                status: activity.status,
                message_id: activity.messageId,
                error: activity.error,
                success_count: activity.successCount,
                failure_count: activity.failureCount,
                created_at: new Date().toISOString()
            });
    } catch (error) {
        console.error('Failed to log email activity:', error);
    }
}

module.exports = router;
