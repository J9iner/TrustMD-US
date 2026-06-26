// TrustMD Email Service with Resend
// Handles all email communications for the TrustMD platform

const { Resend } = require('resend');

class EmailService {
    constructor() {
        this.resend = new Resend(process.env.RESEND_API_KEY);
        this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@trustmd.live';
        this.fromName = process.env.RESEND_FROM_NAME || 'TrustMD';
        this.supportEmail = process.env.RESEND_SUPPORT_EMAIL || 'support@trustmd.live';
        this.billingEmail = process.env.RESEND_BILLING_EMAIL || 'billing@trustmd.live';
        
        this.isConfigured = this.validateConfiguration();
    }

    // Validate Resend configuration
    validateConfiguration() {
        const required = ['RESEND_API_KEY'];
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            console.warn('Resend configuration incomplete. Missing:', missing);
            return false;
        }
        
        return true;
    }

    // Send basic email
    async sendEmail(options) {
        try {
            if (!this.isConfigured) {
                throw new Error('Resend not configured');
            }

            const { to, subject, html, text, from, replyTo } = options;

            const emailOptions = {
                from: from || `${this.fromName} <${this.fromEmail}>`,
                to: Array.isArray(to) ? to : [to],
                subject,
                html,
                text,
                replyTo: replyTo || this.supportEmail
            };

            const result = await this.resend.emails.send(emailOptions);
            
            return {
                success: true,
                messageId: result.data?.id,
                data: result.data
            };
        } catch (error) {
            console.error('Email send failed:', error);
            throw error;
        }
    }

    // Send welcome email
    async sendWelcomeEmail(user, tenant) {
        try {
            const subject = 'Welcome to TrustMD - Your Compliance Journey Starts Here';
            const html = this.getWelcomeTemplate(user, tenant);
            const text = this.getWelcomeTextTemplate(user, tenant);

            return await this.sendEmail({
                to: user.email,
                subject,
                html,
                text,
                replyTo: this.supportEmail
            });
        } catch (error) {
            console.error('Welcome email failed:', error);
            throw error;
        }
    }

    // Send password reset email
    async sendPasswordResetEmail(user, resetToken) {
        try {
            const subject = 'Reset Your TrustMD Password';
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
            const html = this.getPasswordResetTemplate(user, resetUrl);
            const text = this.getPasswordResetTextTemplate(user, resetUrl);

            return await this.sendEmail({
                to: user.email,
                subject,
                html,
                text,
                replyTo: this.supportEmail
            });
        } catch (error) {
            console.error('Password reset email failed:', error);
            throw error;
        }
    }

    // Send email verification
    async sendEmailVerification(user, verificationToken) {
        try {
            const subject = 'Verify Your TrustMD Email Address';
            const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
            const html = this.getEmailVerificationTemplate(user, verificationUrl);
            const text = this.getEmailVerificationTextTemplate(user, verificationUrl);

            return await this.sendEmail({
                to: user.email,
                subject,
                html,
                text,
                replyTo: this.supportEmail
            });
        } catch (error) {
            console.error('Email verification failed:', error);
            throw error;
        }
    }

    // Send subscription confirmation
    async sendSubscriptionConfirmation(user, tenant, subscription) {
        try {
            const subject = 'TrustMD Subscription Confirmed';
            const html = this.getSubscriptionConfirmationTemplate(user, tenant, subscription);
            const text = this.getSubscriptionConfirmationTextTemplate(user, tenant, subscription);

            return await this.sendEmail({
                to: user.email,
                subject,
                html,
                text,
                replyTo: this.billingEmail
            });
        } catch (error) {
            console.error('Subscription confirmation email failed:', error);
            throw error;
        }
    }

    // Send payment failed notification
    async sendPaymentFailedEmail(user, tenant, payment) {
        try {
            const subject = 'Payment Failed - Action Required for TrustMD';
            const html = this.getPaymentFailedTemplate(user, tenant, payment);
            const text = this.getPaymentFailedTextTemplate(user, tenant, payment);

            return await this.sendEmail({
                to: user.email,
                subject,
                html,
                text,
                replyTo: this.billingEmail
            });
        } catch (error) {
            console.error('Payment failed email failed:', error);
            throw error;
        }
    }

    // Send subscription cancelled notification
    async sendSubscriptionCancelledEmail(user, tenant, subscription) {
        try {
            const subject = 'TrustMD Subscription Cancelled';
            const html = this.getSubscriptionCancelledTemplate(user, tenant, subscription);
            const text = this.getSubscriptionCancelledTextTemplate(user, tenant, subscription);

            return await this.sendEmail({
                to: user.email,
                subject,
                html,
                text,
                replyTo: this.billingEmail
            });
        } catch (error) {
            console.error('Subscription cancelled email failed:', error);
            throw error;
        }
    }

    // Send compliance reminder
    async sendComplianceReminder(user, tenant, complianceItems) {
        try {
            const subject = 'Compliance Reminder - Action Required';
            const html = this.getComplianceReminderTemplate(user, tenant, complianceItems);
            const text = this.getComplianceReminderTextTemplate(user, tenant, complianceItems);

            return await this.sendEmail({
                to: user.email,
                subject,
                html,
                text,
                replyTo: this.supportEmail
            });
        } catch (error) {
            console.error('Compliance reminder email failed:', error);
            throw error;
        }
    }

    // Send document upload notification
    async sendDocumentUploadNotification(user, tenant, document) {
        try {
            const subject = 'Document Uploaded to TrustMD';
            const html = this.getDocumentUploadTemplate(user, tenant, document);
            const text = this.getDocumentUploadTextTemplate(user, tenant, document);

            return await this.sendEmail({
                to: user.email,
                subject,
                html,
                text,
                replyTo: this.supportEmail
            });
        } catch (error) {
            console.error('Document upload notification failed:', error);
            throw error;
        }
    }

    // Send security alert
    async sendSecurityAlert(user, tenant, alertDetails) {
        try {
            const subject = 'Security Alert - TrustMD Account Activity';
            const html = this.getSecurityAlertTemplate(user, tenant, alertDetails);
            const text = this.getSecurityAlertTextTemplate(user, tenant, alertDetails);

            return await this.sendEmail({
                to: user.email,
                subject,
                html,
                text,
                replyTo: this.supportEmail
            });
        } catch (error) {
            console.error('Security alert email failed:', error);
            throw error;
        }
    }

    // Send custom notification
    async sendCustomNotification(to, subject, content, options = {}) {
        try {
            const { html, text, replyTo, attachments } = content;
            
            return await this.sendEmail({
                to,
                subject,
                html,
                text,
                replyTo: replyTo || this.supportEmail,
                ...options
            });
        } catch (error) {
            console.error('Custom notification failed:', error);
            throw error;
        }
    }

    // Email Templates
    getWelcomeTemplate(user, tenant) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to TrustMD</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background: #f9fafb; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; background: #e5e7eb; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to TrustMD</h1>
            <p>Your Medical Compliance Platform</p>
        </div>
        <div class="content">
            <h2>Hi ${user.fullName},</h2>
            <p>Welcome to TrustMD! Your account for <strong>${tenant.name}</strong> has been successfully created.</p>
            <p>TrustMD is your comprehensive compliance tracking solution designed specifically for healthcare practices. With our platform, you can:</p>
            <ul>
                <li>Track compliance requirements across all jurisdictions</li>
                <li>Manage document storage and organization</li>
                <li>Generate compliance reports automatically</li>
                <li>Stay up-to-date with regulatory changes</li>
                <li>Ensure audit readiness at all times</li>
            </ul>
            <p>Get started by logging into your account:</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">Login to TrustMD</a>
            <p>If you have any questions, our support team is here to help. Simply reply to this email or contact us at ${this.supportEmail}.</p>
            <p>Best regards,<br>The TrustMD Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 TrustMD. All rights reserved.</p>
            <p>This email was sent to ${user.email} because you created an account.</p>
        </div>
    </div>
</body>
</html>`;
    }

    getWelcomeTextTemplate(user, tenant) {
        return `
Welcome to TrustMD!

Hi ${user.fullName},

Welcome to TrustMD! Your account for ${tenant.name} has been successfully created.

TrustMD is your comprehensive compliance tracking solution designed specifically for healthcare practices. With our platform, you can:

- Track compliance requirements across all jurisdictions
- Manage document storage and organization
- Generate compliance reports automatically
- Stay up-to-date with regulatory changes
- Ensure audit readiness at all times

Get started by logging into your account:
${process.env.FRONTEND_URL || 'http://localhost:3000'}/login

If you have any questions, our support team is here to help. Simply reply to this email or contact us at ${this.supportEmail}.

Best regards,
The TrustMD Team

© 2024 TrustMD. All rights reserved.
This email was sent to ${user.email} because you created an account.
`;
    }

    getPasswordResetTemplate(user, resetUrl) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your TrustMD Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background: #f9fafb; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; background: #e5e7eb; font-size: 12px; }
        .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Reset Your Password</h1>
            <p>TrustMD Security</p>
        </div>
        <div class="content">
            <h2>Hi ${user.fullName},</h2>
            <p>We received a request to reset your TrustMD password. If you didn't make this request, you can safely ignore this email.</p>
            <div class="warning">
                <p><strong>Security Notice:</strong> This password reset link will expire in 1 hour for your security.</p>
            </div>
            <p>To reset your password, click the button below:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>${resetUrl}</p>
            <p>For security reasons, please make sure to:</p>
            <ul>
                <li>Choose a strong password with at least 8 characters</li>
                <li>Include a mix of letters, numbers, and symbols</li>
                <li>Don't reuse passwords from other services</li>
            </ul>
            <p>If you need assistance, please contact our support team at ${this.supportEmail}.</p>
            <p>Best regards,<br>The TrustMD Security Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 TrustMD. All rights reserved.</p>
            <p>This email was sent to ${user.email} because a password reset was requested.</p>
        </div>
    </div>
</body>
</html>`;
    }

    getPasswordResetTextTemplate(user, resetUrl) {
        return `
Reset Your TrustMD Password

Hi ${user.fullName},

We received a request to reset your TrustMD password. If you didn't make this request, you can safely ignore this email.

Security Notice: This password reset link will expire in 1 hour for your security.

To reset your password, visit this link:
${resetUrl}

For security reasons, please make sure to:
- Choose a strong password with at least 8 characters
- Include a mix of letters, numbers, and symbols
- Don't reuse passwords from other services

If you need assistance, please contact our support team at ${this.supportEmail}.

Best regards,
The TrustMD Security Team

© 2024 TrustMD. All rights reserved.
This email was sent to ${user.email} because a password reset was requested.
`;
    }

    getEmailVerificationTemplate(user, verificationUrl) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email Address</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background: #f9fafb; }
        .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; background: #e5e7eb; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Verify Your Email</h1>
            <p>Complete Your TrustMD Setup</p>
        </div>
        <div class="content">
            <h2>Hi ${user.fullName},</h2>
            <p>Thanks for signing up for TrustMD! To complete your account setup, please verify your email address.</p>
            <p>Click the button below to verify your email:</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>${verificationUrl}</p>
            <p>Verifying your email helps us:</p>
            <ul>
                <li>Keep your account secure</li>
                <li>Send important account notifications</li>
                <li>Recover your account if you forget your password</li>
            </ul>
            <p>If you didn't create an account with TrustMD, you can safely ignore this email.</p>
            <p>Best regards,<br>The TrustMD Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 TrustMD. All rights reserved.</p>
            <p>This email was sent to ${user.email} because an account was created.</p>
        </div>
    </div>
</body>
</html>`;
    }

    getEmailVerificationTextTemplate(user, verificationUrl) {
        return `
Verify Your TrustMD Email Address

Hi ${user.fullName},

Thanks for signing up for TrustMD! To complete your account setup, please verify your email address.

Click the link below to verify your email:
${verificationUrl}

Verifying your email helps us:
- Keep your account secure
- Send important account notifications
- Recover your account if you forget your password

If you didn't create an account with TrustMD, you can safely ignore this email.

Best regards,
The TrustMD Team

© 2024 TrustMD. All rights reserved.
This email was sent to ${user.email} because an account was created.
`;
    }

    getSubscriptionConfirmationTemplate(user, tenant, subscription) {
        const planName = subscription.plan?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Your Plan';
        const price = subscription.amount ? `$${(subscription.amount / 100).toFixed(2)}` : 'N/A';
        const interval = subscription.interval || 'month';
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Confirmed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background: #f9fafb; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; background: #e5e7eb; font-size: 12px; }
        .plan-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Subscription Confirmed!</h1>
            <p>Welcome to TrustMD Premium</p>
        </div>
        <div class="content">
            <h2>Hi ${user.fullName},</h2>
            <p>Great news! Your TrustMD subscription has been successfully activated for <strong>${tenant.name}</strong>.</p>
            
            <div class="plan-details">
                <h3>Subscription Details</h3>
                <p><strong>Plan:</strong> ${planName}</p>
                <p><strong>Price:</strong> ${price}/${interval}</p>
                <p><strong>Status:</strong> Active</p>
                <p><strong>Next Billing:</strong> ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}</p>
            </div>
            
            <p>With your premium subscription, you now have access to:</p>
            <ul>
                <li>Unlimited users and storage</li>
                <li>Advanced compliance tracking</li>
                <li>Priority support</li>
                <li>Real-time monitoring</li>
                <li>Custom reports and analytics</li>
                <li>API access for integrations</li>
            </ul>
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="Button">Access Your Dashboard</a>
            
            <p>Need to manage your subscription? You can update your plan, billing information, or cancel anytime from your account settings.</p>
            
            <p>Thank you for choosing TrustMD for your compliance needs!</p>
            <p>Best regards,<br>The TrustMD Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 TrustMD. All rights reserved.</p>
            <p>This email was sent to ${user.email} regarding your subscription.</p>
        </div>
    </div>
</body>
</html>`;
    }

    getSubscriptionConfirmationTextTemplate(user, tenant, subscription) {
        const planName = subscription.plan?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Your Plan';
        const price = subscription.amount ? `$${(subscription.amount / 100).toFixed(2)}` : 'N/A';
        const interval = subscription.interval || 'month';
        
        return `
TrustMD Subscription Confirmed!

Hi ${user.fullName},

Great news! Your TrustMD subscription has been successfully activated for ${tenant.name}.

Subscription Details:
Plan: ${planName}
Price: ${price}/${interval}
Status: Active
Next Billing: ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}

With your premium subscription, you now have access to:
- Unlimited users and storage
- Advanced compliance tracking
- Priority support
- Real-time monitoring
- Custom reports and analytics
- API access for integrations

Access your dashboard:
${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard

Need to manage your subscription? You can update your plan, billing information, or cancel anytime from your account settings.

Thank you for choosing TrustMD for your compliance needs!

Best regards,
The TrustMD Team

© 2024 TrustMD. All rights reserved.
This email was sent to ${user.email} regarding your subscription.
`;
    }

    getPaymentFailedTemplate(user, tenant, payment) {
        const amount = payment.amount ? `$${(payment.amount / 100).toFixed(2)}` : 'N/A';
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Failed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background: #f9fafb; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; background: #e5e7eb; font-size: 12px; }
        .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Payment Failed</h1>
            <p>Action Required</p>
        </div>
        <div class="content">
            <h2>Hi ${user.fullName},</h2>
            <p>We were unable to process your recent payment for your TrustMD subscription.</p>
            
            <div class="warning">
                <h3>Payment Details</h3>
                <p><strong>Amount:</strong> ${amount}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Status:</strong> Failed</p>
            </div>
            
            <p><strong>What happens next?</strong></p>
            <ul>
                <li>Your subscription will remain active for a grace period</li>
                <li>We'll attempt to retry the payment in 3 days</li>
                <li>If payment continues to fail, your subscription may be suspended</li>
            </ul>
            
            <p><strong>What you should do:</strong></p>
            <ol>
                <li>Check your payment method on file</li>
                <li>Update your billing information if needed</li>
                <li>Ensure sufficient funds are available</li>
            </ol>
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing" class="button">Update Payment Method</a>
            
            <p>If you believe this is an error or need assistance, please contact our billing team at ${this.billingEmail}.</p>
            
            <p>Best regards,<br>The TrustMD Billing Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 TrustMD. All rights reserved.</p>
            <p>This email was sent to ${user.email} regarding a payment issue.</p>
        </div>
    </div>
</body>
</html>`;
    }

    getPaymentFailedTextTemplate(user, tenant, payment) {
        const amount = payment.amount ? `$${(payment.amount / 100).toFixed(2)}` : 'N/A';
        
        return `
TrustMD Payment Failed - Action Required

Hi ${user.fullName},

We were unable to process your recent payment for your TrustMD subscription.

Payment Details:
Amount: ${amount}
Date: ${new Date().toLocaleDateString()}
Status: Failed

What happens next?
- Your subscription will remain active for a grace period
- We'll attempt to retry the payment in 3 days
- If payment continues to fail, your subscription may be suspended

What you should do:
1. Check your payment method on file
2. Update your billing information if needed
3. Ensure sufficient funds are available

Update your payment method:
${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing

If you believe this is an error or need assistance, please contact our billing team at ${this.billingEmail}.

Best regards,
The TrustMD Billing Team

© 2024 TrustMD. All rights reserved.
This email was sent to ${user.email} regarding a payment issue.
`;
    }

    getSubscriptionCancelledTemplate(user, tenant, subscription) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Cancelled</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6b7280; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background: #f9fafb; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; background: #e5e7eb; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Subscription Cancelled</h1>
            <p>We're Sorry to See You Go</p>
        </div>
        <div class="content">
            <h2>Hi ${user.fullName},</h2>
            <p>Your TrustMD subscription for <strong>${tenant.name}</strong> has been cancelled as requested.</p>
            
            <p><strong>What happens to your account?</strong></p>
            <ul>
                <li>Your subscription will remain active until the end of your current billing period</li>
                <li>Access to premium features will continue until ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}</li>
                <li>Your data will be safely stored for 90 days after cancellation</li>
                <li>You can reactivate your subscription anytime during this period</li>
            </ul>
            
            <p><strong>After cancellation:</strong></p>
            <ul>
                <li>You'll be downgraded to our free plan (if available)</li>
                <li>Some features may become limited</li>
                <li>Your compliance data remains accessible</li>
            </ul>
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing" class="button">Reactivate Subscription</a>
            
            <p>We'd love to hear your feedback to help us improve TrustMD. Please reply to this email with any suggestions or concerns.</p>
            
            <p>Thank you for using TrustMD for your compliance needs!</p>
            <p>Best regards,<br>The TrustMD Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 TrustMD. All rights reserved.</p>
            <p>This email was sent to ${user.email} regarding your subscription cancellation.</p>
        </div>
    </div>
</body>
</html>`;
    }

    getSubscriptionCancelledTextTemplate(user, tenant, subscription) {
        return `
TrustMD Subscription Cancelled

Hi ${user.fullName},

Your TrustMD subscription for ${tenant.name} has been cancelled as requested.

What happens to your account?
- Your subscription will remain active until the end of your current billing period
- Access to premium features will continue until ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}
- Your data will be safely stored for 90 days after cancellation
- You can reactivate your subscription anytime during this period

After cancellation:
- You'll be downgraded to our free plan (if available)
- Some features may become limited
- Your compliance data remains accessible

Reactivate your subscription:
${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing

We'd love to hear your feedback to help us improve TrustMD. Please reply to this email with any suggestions or concerns.

Thank you for using TrustMD for your compliance needs!

Best regards,
The TrustMD Team

© 2024 TrustMD. All rights reserved.
This email was sent to ${user.email} regarding your subscription cancellation.
`;
    }

    getComplianceReminderTemplate(user, tenant, complianceItems) {
        const itemsList = complianceItems.map(item => `<li><strong>${item.title}</strong> - Due: ${new Date(item.dueDate).toLocaleDateString()}</li>`).join('');
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compliance Reminder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background: #f9fafb; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; background: #e5e7eb; font-size: 12px; }
        .reminder-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Compliance Reminder</h1>
            <p>Action Required</p>
        </div>
        <div class="content">
            <h2>Hi ${user.fullName},</h2>
            <p>You have compliance items requiring attention for <strong>${tenant.name}</strong>.</p>
            
            <div class="reminder-list">
                <h3>Pending Compliance Items</h3>
                <ul>
                    ${itemsList}
                </ul>
            </div>
            
            <p><strong>Why this matters:</strong></p>
            <ul>
                <li>Maintain regulatory compliance</li>
                <li>Avoid potential penalties</li>
                <li>Ensure audit readiness</li>
                <li>Protect your practice reputation</li>
            </ul>
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/compliance" class="button">Review Compliance Items</a>
            
            <p>Need help with compliance tasks? Our support team is available to assist you.</p>
            
            <p>Best regards,<br>The TrustMD Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 TrustMD. All rights reserved.</p>
            <p>This email was sent to ${user.email} regarding compliance reminders.</p>
        </div>
    </div>
</body>
</html>`;
    }

    getComplianceReminderTextTemplate(user, tenant, complianceItems) {
        const itemsList = complianceItems.map(item => `- ${item.title} - Due: ${new Date(item.dueDate).toLocaleDateString()}`).join('\n');
        
        return `
TrustMD Compliance Reminder

Hi ${user.fullName},

You have compliance items requiring attention for ${tenant.name}.

Pending Compliance Items:
${itemsList}

Why this matters:
- Maintain regulatory compliance
- Avoid potential penalties
- Ensure audit readiness
- Protect your practice reputation

Review your compliance items:
${process.env.FRONTEND_URL || 'http://localhost:3000'}/compliance

Need help with compliance tasks? Our support team is available to assist you.

Best regards,
The TrustMD Team

© 2024 TrustMD. All rights reserved.
This email was sent to ${user.email} regarding compliance reminders.
`;
    }

    getDocumentUploadTemplate(user, tenant, document) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Uploaded</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background: #f9fafb; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; background: #e5e7eb; font-size: 12px; }
        .doc-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Document Uploaded</h1>
            <p>TrustMD Document Management</p>
        </div>
        <div class="content">
            <h2>Hi ${user.fullName},</h2>
            <p>A new document has been uploaded to your TrustMD account for <strong>${tenant.name}</strong>.</p>
            
            <div class="doc-details">
                <h3>Document Details</h3>
                <p><strong>Name:</strong> ${document.name}</p>
                <p><strong>Type:</strong> ${document.type}</p>
                <p><strong>Size:</strong> ${document.size}</p>
                <p><strong>Uploaded:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>The document has been automatically processed and is now available in your document library.</p>
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/documents" class="button">View Document</a>
            
            <p>If you didn't upload this document or have any concerns, please contact our support team.</p>
            
            <p>Best regards,<br>The TrustMD Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 TrustMD. All rights reserved.</p>
            <p>This email was sent to ${user.email} regarding document activity.</p>
        </div>
    </div>
</body>
</html>`;
    }

    getDocumentUploadTextTemplate(user, tenant, document) {
        return `
TrustMD Document Uploaded

Hi ${user.fullName},

A new document has been uploaded to your TrustMD account for ${tenant.name}.

Document Details:
Name: ${document.name}
Type: ${document.type}
Size: ${document.size}
Uploaded: ${new Date().toLocaleDateString()}

The document has been automatically processed and is now available in your document library.

View your documents:
${process.env.FRONTEND_URL || 'http://localhost:3000'}/documents

If you didn't upload this document or have any concerns, please contact our support team.

Best regards,
The TrustMD Team

© 2024 TrustMD. All rights reserved.
This email was sent to ${user.email} regarding document activity.
`;
    }

    getSecurityAlertTemplate(user, tenant, alertDetails) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Alert</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background: #f9fafb; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; background: #e5e7eb; font-size: 12px; }
        .alert-details { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Security Alert</h1>
            <p>Account Activity Detected</p>
        </div>
        <div class="content">
            <h2>Hi ${user.fullName},</h2>
            <p>We detected unusual activity on your TrustMD account for <strong>${tenant.name}</strong>.</p>
            
            <div class="alert-details">
                <h3>Activity Details</h3>
                <p><strong>Type:</strong> ${alertDetails.type}</p>
                <p><strong>Time:</strong> ${new Date(alertDetails.timestamp).toLocaleString()}</p>
                <p><strong>Location:</strong> ${alertDetails.location}</p>
                <p><strong>Device:</strong> ${alertDetails.device}</p>
            </div>
            
            <p><strong>Recommended Actions:</strong></p>
            <ol>
                <li>Review your account activity</li>
                <li>Change your password if you don't recognize this activity</li>
                <li>Enable two-factor authentication</li>
                <li>Contact support if you suspect unauthorized access</li>
            </ol>
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/security" class="button">Review Security Settings</a>
            
            <p>If this was you, you can safely ignore this email. If you have any concerns, please contact our security team immediately.</p>
            
            <p>Best regards,<br>The TrustMD Security Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 TrustMD. All rights reserved.</p>
            <p>This email was sent to ${user.email} regarding security activity.</p>
        </div>
    </div>
</body>
</html>`;
    }

    getSecurityAlertTextTemplate(user, tenant, alertDetails) {
        return `
TrustMD Security Alert

Hi ${user.fullName},

We detected unusual activity on your TrustMD account for ${tenant.name}.

Activity Details:
Type: ${alertDetails.type}
Time: ${new Date(alertDetails.timestamp).toLocaleString()}
Location: ${alertDetails.location}
Device: ${alertDetails.device}

Recommended Actions:
1. Review your account activity
2. Change your password if you don't recognize this activity
3. Enable two-factor authentication
4. Contact support if you suspect unauthorized access

Review your security settings:
${process.env.FRONTEND_URL || 'http://localhost:3000'}/security

If this was you, you can safely ignore this email. If you have any concerns, please contact our security team immediately.

Best regards,
The TrustMD Security Team

© 2024 TrustMD. All rights reserved.
This email was sent to ${user.email} regarding security activity.
`;
    }

    // Check if email service is ready
    isReady() {
        return this.isConfigured;
    }
}

module.exports = EmailService;
