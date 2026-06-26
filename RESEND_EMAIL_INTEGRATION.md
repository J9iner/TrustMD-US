# TrustMD Resend Email Integration

This guide covers the setup and usage of Resend email services in the TrustMD platform.

## Overview

TrustMD uses Resend for all email communications including:
- User registration and welcome emails
- Password reset notifications
- Email verification
- Subscription and payment notifications
- Compliance reminders
- Security alerts
- Document upload notifications

## Setup

### 1. Environment Configuration

Add the following to your `.env` file:

```env
# Resend Email Configuration
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@trustmd.live
RESEND_FROM_NAME=TrustMD
RESEND_SUPPORT_EMAIL=support@trustmd.live
RESEND_BILLING_EMAIL=billing@trustmd.live
```

### 2. Resend Account Setup

1. **Create Resend Account**
   - Go to [Resend Dashboard](https://resend.com/)
   - Sign up or log in to your account

2. **Get API Key**
   - Navigate to API Keys
   - Create a new API key
   - Copy the key to your environment variables

3. **Configure Domain**
   - Go to Domains
   - Add your domain (e.g., trustmd.live)
   - Verify DNS records
   - Wait for domain verification

4. **Set Up Sender Addresses**
   - Configure the from email addresses
   - Verify sender authentication

### 3. Database Migration

Run the email schema migration:

```sql
-- Execute database/email_schema.sql
```

This creates tables for:
- Email logging and tracking
- Email templates
- User preferences
- Delivery events

## API Endpoints

### Email Management

#### Send Single Email
```http
POST /api/emails/send
Content-Type: application/json
Authorization: Bearer <session_id>

{
  "to": "user@example.com",
  "subject": "Test Email",
  "html": "<h1>Hello</h1>",
  "text": "Hello",
  "replyTo": "support@trustmd.live"
}
```

#### Send Bulk Email
```http
POST /api/emails/send-bulk
Content-Type: application/json
Authorization: Bearer <session_id>

{
  "recipients": [
    {
      "email": "user1@example.com",
      "name": "User 1",
      "templateData": { "customField": "value" }
    }
  ],
  "subject": "Bulk Email",
  "template": "compliance_reminder",
  "globalTemplateData": {
    "complianceItems": [...]
  }
}
```

#### Send Welcome Email
```http
POST /api/emails/send-welcome
Content-Type: application/json
Authorization: Bearer <session_id>

{
  "userId": "user-uuid",
  "tenantId": "tenant-uuid"
}
```

#### Send Password Reset
```http
POST /api/emails/send-password-reset
Content-Type: application/json

{
  "email": "user@example.com",
  "resetToken": "jwt-token"
}
```

#### Send Email Verification
```http
POST /api/emails/send-verification
Content-Type: application/json
Authorization: Bearer <session_id>

{
  "userId": "user-uuid",
  "verificationToken": "jwt-token"
}
```

### Status and Testing

#### Check Email Service Status
```http
GET /api/emails/status
```

#### Test Email Endpoints
```http
GET /api/emails/test
```

## Email Templates

### Available Templates

1. **Welcome Email** (`welcome`)
   - Sent to new users after registration
   - Includes login instructions and feature overview

2. **Password Reset** (`password_reset`)
   - Sent when user requests password reset
   - Includes secure reset link with expiration

3. **Email Verification** (`email_verification`)
   - Sent to verify user email addresses
   - Required for account activation

4. **Subscription Confirmation** (`subscription_confirmation`)
   - Sent when subscription is activated
   - Includes plan details and billing information

5. **Payment Failed** (`payment_failed`)
   - Sent when payment processing fails
   - Includes action required information

6. **Subscription Cancelled** (`subscription_cancelled`)
   - Sent when subscription is cancelled
   - Includes next steps and data retention info

7. **Compliance Reminder** (`compliance_reminder`)
   - Sent for compliance task reminders
   - Includes due dates and action items

8. **Document Upload** (`document_upload`)
   - Sent when documents are uploaded
   - Includes document details and links

9. **Security Alert** (`security_alert`)
   - Sent for security events
   - Includes activity details and recommendations

### Custom Templates

Create custom email templates:

```sql
INSERT INTO email_templates (
  tenant_id,
  name,
  display_name,
  description,
  subject_template,
  html_template,
  text_template,
  variables
) VALUES (
  'tenant-uuid',
  'custom_welcome',
  'Custom Welcome',
  'Custom welcome message',
  'Welcome to {{tenant_name}}!',
  '<h1>Welcome {{user_name}}!</h1>',
  'Welcome {{user_name}}!',
  '{"user_name": "string", "tenant_name": "string"}'
);
```

## Integration Examples

### Backend Integration

```javascript
const EmailService = require('../utils/email-service');

const emailService = new EmailService();

// Send welcome email
await emailService.sendWelcomeEmail(user, tenant);

// Send custom email
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Custom Notification',
  html: '<p>Your custom message</p>',
  text: 'Your custom message'
});
```

### Frontend Integration

```javascript
// Send email via API
const response = await fetch('/api/emails/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-session-id': sessionId
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Test Email',
    html: '<h1>Test</h1>',
    text: 'Test'
  })
});

const result = await response.json();
```

## Email Preferences

Users can manage their email preferences:

### Available Preference Types

- `marketing` - Marketing emails and newsletters
- `transactional` - Transactional emails (required)
- `compliance` - Compliance reminders
- `billing` - Billing and payment notifications
- `security` - Security alerts
- `notifications` - General notifications
- `reminders` - Task reminders
- `updates` - Product updates

### Managing Preferences

```javascript
// Update user preferences
await fetch('/api/emails/preferences', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'x-session-id': sessionId
  },
  body: JSON.stringify({
    emailType: 'marketing',
    isEnabled: false,
    frequency: 'never'
  })
});
```

## Email Analytics

### Tracking Email Performance

```sql
-- Get email statistics
SELECT * FROM get_email_statistics('tenant-uuid', '30');

-- View email analytics
SELECT * FROM email_analytics 
WHERE tenant_id = 'tenant-uuid' 
AND date >= CURRENT_DATE - INTERVAL '30 days';
```

### Available Metrics

- **Total Sent** - Number of emails sent
- **Delivery Rate** - Percentage of successfully delivered emails
- **Open Rate** - Percentage of opened emails
- **Click Rate** - Percentage of clicked emails
- **Bounce Rate** - Percentage of bounced emails
- **Most Used Templates** - Most frequently sent email types

## Email Quotas

### Default Quotas

- **Free Tier**: 1,000 emails/month
- **Professional**: 10,000 emails/month
- **Enterprise**: Unlimited emails

### Quota Management

```sql
-- Check email quota
SELECT check_email_quota('tenant-uuid');

-- Update tenant quota
UPDATE tenants 
SET email_quota = 10000 
WHERE id = 'tenant-uuid';
```

## Security Features

### Rate Limiting

- Email sending is rate-limited per tenant
- Bulk emails have additional restrictions
- Quota enforcement prevents abuse

### Content Security

- HTML emails are sanitized
- Links are validated and tracked
- Attachment scanning (if enabled)

### Authentication

- All email endpoints require authentication
- Session validation for protected operations
- Role-based access control

## Testing

### Run Email Tests

```bash
# Run complete email integration test
npm run test:emails

# Test specific endpoint
curl http://localhost:3001/api/emails/test

# Check email service status
curl http://localhost:3001/api/emails/status
```

### Test Email Templates

```javascript
// Test template rendering
const emailService = new EmailService();
const html = emailService.getWelcomeTemplate(user, tenant);
const text = emailService.getWelcomeTextTemplate(user, tenant);
```

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Verify API key is correct
   - Check key permissions
   - Ensure domain is verified

2. **Emails Not Sending**
   - Check quota limits
   - Verify sender addresses
   - Check email service status

3. **Templates Not Rendering**
   - Verify template variables
   - Check HTML syntax
   - Review template database records

4. **Delivery Issues**
   - Check DNS records
   - Verify domain reputation
   - Review bounce logs

### Debug Mode

Enable debug logging:

```env
DEBUG=resend:*
```

### Email Logs

View email logs:

```sql
-- Recent email logs
SELECT * FROM email_logs 
WHERE tenant_id = 'tenant-uuid' 
ORDER BY created_at DESC 
LIMIT 10;

-- Failed emails
SELECT * FROM email_logs 
WHERE status = 'failed' 
AND tenant_id = 'tenant-uuid';
```

## Best Practices

### Email Design

1. **Responsive Design**: Use mobile-friendly templates
2. **Plain Text Fallback**: Always include text versions
3. **Brand Consistency**: Use consistent branding
4. **Clear CTAs**: Include clear call-to-action buttons
5. **Personalization**: Use user-specific data

### Content Guidelines

1. **HIPAA Compliance**: Avoid PHI in emails
2. **Security**: Never send passwords or sensitive data
3. **Clarity**: Use clear, concise language
4. **Timing**: Send emails at appropriate times
5. **Frequency**: Respect user preferences

### Performance Optimization

1. **Batch Processing**: Use bulk sending for multiple recipients
2. **Template Caching**: Cache rendered templates
3. **Queue Management**: Use email queues for high volume
4. **Monitoring**: Monitor delivery rates and errors
5. **Cleanup**: Archive old email logs regularly

## Production Deployment

### Environment Setup

1. **Production API Key**: Use production Resend API key
2. **Domain Configuration**: Configure production domain
3. **Monitoring**: Set up email delivery monitoring
4. **Alerts**: Configure alerts for failures
5. **Backup**: Backup email templates and settings

### Scaling Considerations

1. **Load Balancing**: Distribute email sending load
2. **Rate Limits**: Respect Resend rate limits
3. **Database Optimization**: Optimize email log queries
4. **Caching**: Cache frequently used templates
5. **Monitoring**: Monitor email queue and performance

## Support

For email integration issues:

1. **Documentation**: Check this guide first
2. **Logs**: Review application and email logs
3. **Status**: Check Resend service status
4. **Support**: Contact Resend support for API issues
5. **Community**: Check TrustMD community forums

## API Reference

### EmailService Class

```javascript
const emailService = new EmailService();

// Methods
await emailService.sendEmail(options);
await emailService.sendWelcomeEmail(user, tenant);
await emailService.sendPasswordResetEmail(user, resetToken);
await emailService.sendEmailVerification(user, verificationToken);
await emailService.sendSubscriptionConfirmation(user, tenant, subscription);
await emailService.sendPaymentFailedEmail(user, tenant, payment);
await emailService.sendSubscriptionCancelledEmail(user, tenant, subscription);
await emailService.sendComplianceReminder(user, tenant, complianceItems);
await emailService.sendDocumentUploadNotification(user, tenant, document);
await emailService.sendSecurityAlert(user, tenant, alertDetails);
await emailService.sendCustomNotification(to, subject, content, options);

// Properties
emailService.isReady() // Boolean
emailService.fromEmail // String
emailService.fromName // String
```

### Response Format

```json
{
  "success": true,
  "data": {
    "messageId": "resend-message-id",
    "status": "sent"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details"
}
```

This comprehensive email integration provides TrustMD with reliable, scalable email communications for all user interactions and business processes.
