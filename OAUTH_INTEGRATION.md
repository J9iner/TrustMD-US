# TrustMD OAuth Integration Guide

## Overview

TrustMD now supports OAuth authentication for Google, Microsoft, and Apple accounts, allowing healthcare professionals to sign in quickly and securely using their existing organizational accounts.

## Features

- **Google OAuth** - Sign in with Google accounts
- **Microsoft OAuth** - Sign in with Microsoft/Azure AD accounts  
- **Apple Sign In** - Sign in with Apple ID (privacy-focused authentication)
- **Automatic User Provisioning** - Creates new users and tenants automatically
- **Profile Mapping** - Maps OAuth profiles to TrustMD user structure
- **Session Management** - Maintains secure sessions with OAuth tokens
- **Account Linking** - Link OAuth accounts to existing TrustMD users

## Setup Instructions

### 1. Environment Configuration

Add the following to your `.env` file:

```env
# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_CALLBACK_URL=http://localhost:3001/api/auth/microsoft/callback

# Apple Sign In Configuration
APPLE_CLIENT_ID=com.trustmd.app
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_KEY_FILE_PATH=./keys/AuthKey.p8
APPLE_CALLBACK_URL=http://localhost:3001/api/auth/apple/callback

OAUTH_SUCCESS_REDIRECT=http://localhost:3000/dashboard
OAUTH_FAILURE_REDIRECT=http://localhost:3000/login
SESSION_SECRET=your-session-secret-key-here
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API and Google OAuth2 API
4. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3001/api/auth/google/callback`
5. Copy Client ID and Client Secret to your `.env` file

### 3. Microsoft OAuth Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory
3. App registrations → New registration
4. Set redirect URI: `http://localhost:3001/api/auth/microsoft/callback`
5. Copy Application (client) ID and create client secret
6. Add to your `.env` file

### 4. Apple Sign In Setup

1. **Apple Developer Account**
   - Enroll in Apple Developer Program ($99/year)
   - Go to [developer.apple.com](https://developer.apple.com/)

2. **Create App ID**
   - Create new App ID with Sign In with Apple capability
   - Note your Bundle ID (e.g., `com.trustmd.app`)

3. **Generate Private Key**
   - Go to Keys section in Apple Developer Portal
   - Create new key with Sign In with Apple capability
   - Download the `.p8` key file (can only be downloaded once)
   - Note the Key ID and your Team ID

4. **Configure Key File**
   ```bash
   mkdir keys
   mv ~/Downloads/AuthKey_ABC123DEF4.p8 ./keys/AuthKey.p8
   chmod 600 ./keys/AuthKey.p8
   ```

5. **Add Environment Variables**
   - Add Apple configuration to your `.env` file
   - Update callback URL in Apple Developer Portal

For detailed Apple Sign In setup, see [Apple Sign In Integration Guide](./APPLE_SIGN_IN_INTEGRATION.md).

## API Endpoints

### OAuth Providers
- `GET /api/auth/oauth/providers` - Get available OAuth providers

### Google OAuth
- `GET /api/auth/google` - Initiate Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback

### Microsoft OAuth  
- `GET /api/auth/microsoft` - Initiate Microsoft OAuth login
- `GET /api/auth/microsoft/callback` - Microsoft OAuth callback

### Apple Sign In
- `GET /api/auth/apple` - Initiate Apple Sign In (web)
- `POST /api/auth/apple` - Initiate Apple Sign In (mobile)
- `GET /api/auth/apple/callback` - Apple Sign In callback

### OAuth Verification
- `POST /api/auth/oauth/verify` - Verify OAuth token and get user data

## Frontend Integration

### Using the AuthService

```javascript
// Initialize TrustMD API
const trustMD = createTrustMDAPI({
    baseURL: 'http://localhost:3001'
});

// Get available OAuth providers
const providers = trustMD.authService.getOAuthProviders();

// Initiate OAuth login
trustMD.authService.addEventListener('oauth-login', (data) => {
    console.log('OAuth login successful:', data);
});

trustMD.authService.addEventListener('oauth-error', (error) => {
    console.error('OAuth login failed:', error);
});

// Login with Google
trustMD.authService.initiateOAuthLogin('google');

// Login with Microsoft
trustMD.authService.initiateOAuthLogin('microsoft');
```

### React Component Example

```jsx
import React, { useEffect, useState } from 'react';
import { createTrustMDAPI } from '../api';

const OAuthLogin = () => {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        const trustMD = createTrustMDAPI();
        
        // Load OAuth providers
        trustMD.authService.loadOAuthProviders().then(() => {
            setProviders(trustMD.authService.getOAuthProviders());
        });
        
        // Handle OAuth events
        trustMD.authService.addEventListener('oauth-login', (data) => {
            console.log('Login successful:', data);
            // Redirect to dashboard
            window.location.href = '/dashboard';
        });
        
        trustMD.authService.addEventListener('oauth-error', (error) => {
            console.error('Login failed:', error);
            setLoading(false);
        });
        
        // Handle OAuth redirect
        trustMD.authService.handleOAuthRedirect();
    }, []);
    
    const handleOAuthLogin = (provider) => {
        setLoading(true);
        const trustMD = createTrustMDAPI();
        trustMD.authService.initiateOAuthLogin(provider);
    };
    
    return (
        <div className="oauth-login">
            <h3>Sign in with your organizational account</h3>
            {providers.map(provider => (
                <button
                    key={provider.name}
                    onClick={() => handleOAuthLogin(provider.name)}
                    disabled={loading}
                    className={`oauth-btn ${provider.name}`}
                >
                    Sign in with {provider.displayName}
                </button>
            ))}
        </div>
    );
};

export default OAuthLogin;
```

## User Flow

### New User Registration
1. User clicks "Sign in with Google/Microsoft"
2. OAuth provider authentication screen opens
3. User authenticates and grants permissions
4. Provider redirects to TrustMD callback
5. TrustMD creates new user and tenant automatically
6. User is logged in and redirected to dashboard

### Existing User Login
1. User clicks "Sign in with Google/Microsoft"
2. OAuth provider authentication
3. TrustMD finds existing user by OAuth provider ID
4. User is logged in and redirected to dashboard

## User Profile Mapping

### Google Profile Fields
- Email → `user.email`
- Display Name → `user.full_name`
- Given Name → `user.first_name`
- Family Name → `user.last_name`
- Profile Picture → `user.avatar_url`
- Verified → `user.email_verified`

### Microsoft Profile Fields
- Email/UPN → `user.email`
- Display Name → `user.full_name`
- Given Name → `user.first_name`
- Family Name → `user.last_name`
- Job Title → `user.job_title`
- Department → `user.department`
- Profile Picture → `user.avatar_url`

## Security Features

- **State Parameter** - Prevents CSRF attacks
- **Secure Sessions** - HTTP-only cookies in production
- **Token Validation** - JWT token verification
- **Automatic Expiry** - Sessions expire after inactivity
- **OAuth Scopes** - Minimal required permissions only

## Testing OAuth Integration

Test the OAuth setup with the test script:

```bash
# Test all OAuth providers
npm run test:oauth

# Test Apple Sign In specifically
npm run test:apple
```

This will test:
- Environment configuration
- OAuth provider availability
- Redirect URLs
- API endpoints
- Database connectivity
- Apple key file existence

## Troubleshooting

### Common Issues

1. **"OAuth provider not configured"**
   - Check environment variables are set
   - Verify client ID and secret are correct

2. **"Redirect URI mismatch"**
   - Ensure callback URLs match OAuth provider configuration
   - Check for trailing slashes and HTTP/HTTPS

3. **"User creation failed"**
   - Check database connectivity
   - Verify required fields in OAuth profile

4. **"Session expired"**
   - Check session secret is configured
   - Verify cookie settings for production

5. **"Apple key file not found"**
   - Verify APPLE_KEY_FILE_PATH is correct
   - Ensure .p8 key file exists and has proper permissions

6. **"Invalid Apple Team ID"**
   - Check Apple Developer Portal for correct Team ID
   - Verify Team ID matches environment variable

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=trustmd:*
```

## Production Considerations

1. **HTTPS Required** - OAuth providers require HTTPS in production
2. **Domain Configuration** - Update callback URLs for production domain
3. **Session Security** - Ensure secure cookie settings
4. **Rate Limiting** - Implement rate limiting for OAuth endpoints
5. **Monitoring** - Monitor OAuth login attempts and failures
6. **Apple Key Security** - Store Apple private keys securely and rotate annually

## Database Schema Updates

The OAuth integration adds these fields to the `users` table:
- `oauth_provider` - 'google', 'microsoft', or 'apple'
- `oauth_id` - Provider-specific user ID
- `avatar_url` - Profile picture URL
- `email_verified` - Boolean for email verification status

## Support

For OAuth integration issues:
1. Check the test output: `npm run test:oauth`
2. Review server logs for detailed error messages
3. Verify OAuth provider configuration
4. Ensure environment variables are correctly set
