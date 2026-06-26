# TrustMD Apple Sign In Integration

This guide covers the setup and implementation of Apple Sign In (Sign in with Apple) for the TrustMD platform.

## Overview

Apple Sign In provides a secure, privacy-focused authentication method that allows users to sign in using their Apple ID. This integration follows Apple's guidelines and security requirements.

## Prerequisites

### Apple Developer Account

1. **Apple Developer Program Membership**
   - Enroll in the Apple Developer Program ($99/year)
   - Go to [developer.apple.com](https://developer.apple.com/)

2. **App ID Creation**
   - Create a new App ID in Apple Developer Portal
   - Enable "Sign In with Apple" capability
   - Note your Bundle ID (e.g., `com.trustmd.app`)

3. **Service ID (for web apps)**
   - Create a Service ID if using web-based authentication
   - Configure return URLs and domains

### Apple Private Key

1. **Generate Private Key**
   - Go to "Keys" section in Apple Developer Portal
   - Create a new key
   - Enable "Sign In with Apple" capability
   - Download the `.p8` key file (can only be downloaded once)

2. **Key Information**
   - Save the Key ID (10-character string)
   - Note your Team ID (10-character string)

## Setup

### 1. Environment Configuration

Add the following to your `.env` file:

```env
# Apple Sign In Configuration
APPLE_CLIENT_ID=com.trustmd.app
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_KEY_FILE_PATH=./keys/AuthKey.p8
APPLE_CALLBACK_URL=http://localhost:3001/api/auth/apple/callback
```

### 2. Key File Setup

1. **Create Keys Directory**
   ```bash
   mkdir keys
   ```

2. **Place Private Key**
   ```bash
   # Move your downloaded .p8 key file to keys directory
   mv ~/Downloads/AuthKey_ABC123DEF4.p8 ./keys/AuthKey.p8
   ```

3. **Set Permissions**
   ```bash
   chmod 600 ./keys/AuthKey.p8
   ```

### 3. Dependencies

Install Apple Sign In dependencies:

```bash
npm install passport-apple
```

## API Endpoints

### Apple Sign In Routes

#### Initiate Apple Sign In (Web)
```http
GET /api/auth/apple
```

#### Initiate Apple Sign In (Mobile)
```http
POST /api/auth/apple
```

#### Apple Sign In Callback
```http
GET /api/auth/apple/callback
```

#### OAuth Providers
```http
GET /api/auth/oauth/providers
```

## Implementation Details

### Apple OAuth Strategy

The Apple Sign In implementation uses `passport-apple` strategy:

```javascript
const AppleStrategy = require('passport-apple').Strategy;

passport.use(new AppleStrategy(
    {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        keyFilePath: process.env.APPLE_KEY_FILE_PATH,
        callbackURL: process.env.APPLE_CALLBACK_URL,
        scope: ['name', 'email']
    },
    async (accessToken, refreshToken, idToken, profile, done) => {
        // Handle Apple authentication
    }
));
```

### Profile Handling

Apple Sign In has unique characteristics:

1. **Email Privacy**: Users can hide their email address
2. **Name Provision**: Name is only provided on first sign-in
3. **ID Token**: Contains verified user information

```javascript
// Apple profile structure
if (provider === 'apple') {
    email = profile.email || (profile.emails && profile.emails[0]?.value);
    fullName = profile.name ? 
        `${profile.name.firstName || ''} ${profile.name.lastName || ''}`.trim() : 
        'Apple User';
}
```

## Frontend Integration

### Web Implementation

```html
<!-- Apple Sign In Button -->
<div id="appleid-signin" 
     data-color="black" 
     data-border="rounded" 
     data-type="sign-in" 
     data-mode="center-align"
     data-width="200"
     data-height="40">
</div>

<script src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"></script>
<script>
    AppleID.auth.init({
        clientId: 'com.trustmd.app',
        scope: 'name email',
        redirectURI: 'http://localhost:3001/api/auth/apple/callback',
        state: Math.random().toString(36).substring(2, 15),
        usePopup: false
    });
</script>
```

### React Component

```jsx
import React, { useEffect } from 'react';

const AppleSignInButton = () => {
    useEffect(() => {
        // Load Apple Sign In script
        const script = document.createElement('script');
        script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
        script.async = true;
        document.body.appendChild(script);

        script.onload = () => {
            AppleID.auth.init({
                clientId: process.env.REACT_APP_APPLE_CLIENT_ID,
                scope: 'name email',
                redirectURI: `${process.env.REACT_APP_API_URL}/api/auth/apple/callback`,
                state: generateRandomState(),
                usePopup: false
            });
        };

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const handleAppleSignIn = () => {
        AppleID.auth.signIn();
    };

    return (
        <button 
            onClick={handleAppleSignIn}
            className="apple-sign-in-btn"
        >
            Sign in with Apple
        </button>
    );
};

function generateRandomState() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}
```

### Mobile App Integration

#### iOS Implementation

```swift
import AuthenticationServices

class AppleSignInManager: NSObject {
    static func signInWithApple() {
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }
}

extension AppleSignInManager: ASAuthorizationControllerDelegate {
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        if let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential {
            let userIdentifier = appleIDCredential.user
            let fullName = appleIDCredential.fullName
            let email = appleIDCredential.email
            let identityToken = appleIDCredential.identityToken
            
            // Send to backend
            sendToBackend(token: identityToken, user: userIdentifier)
        }
    }
}
```

#### Android Implementation

```java
// Add to build.gradle
implementation 'com.google.android.gms:play-services-auth:20.7.0'

// Sign in with Apple on Android
private void signInWithApple() {
    SignInButton signInButton = findViewById(R.id.sign_in_button);
    signInButton.setOnClickListener(v -> {
        Intent signInIntent = mGoogleSignInClient.getSignInIntent();
        startActivityForResult(signInIntent, RC_SIGN_IN);
    });
}
```

## Security Considerations

### 1. Private Key Security

```bash
# Secure the private key file
chmod 600 ./keys/AuthKey.p8
chown $USER:$USER ./keys/AuthKey.p8

# Add to .gitignore
echo "keys/" >> .gitignore
```

### 2. State Parameter

Always use a secure state parameter to prevent CSRF:

```javascript
function generateSecureState() {
    return crypto.randomBytes(16).toString('hex');
}
```

### 3. Token Validation

Validate the ID token from Apple:

```javascript
const jwt = require('jsonwebtoken');

function validateAppleIdToken(idToken) {
    try {
        // Decode and verify Apple's ID token
        const decoded = jwt.decode(idToken, { complete: true });
        
        // Verify issuer
        if (decoded.payload.iss !== 'https://appleid.apple.com') {
            throw new Error('Invalid issuer');
        }
        
        // Verify audience
        if (decoded.payload.aud !== process.env.APPLE_CLIENT_ID) {
            throw new Error('Invalid audience');
        }
        
        // Verify expiration
        if (decoded.payload.exp < Date.now() / 1000) {
            throw new Error('Token expired');
        }
        
        return decoded.payload;
    } catch (error) {
        console.error('Apple ID token validation failed:', error);
        throw error;
    }
}
```

## Testing

### Run Apple Sign In Tests

```bash
# Test Apple OAuth configuration
npm run test:apple

# Test all OAuth providers
npm run test:oauth

# Test specific endpoints
curl http://localhost:3001/api/auth/oauth/providers
```

### Test Script Features

The Apple Sign In test script verifies:

1. **Environment Configuration**
   - Required environment variables
   - Key file existence
   - OAuth configuration

2. **API Endpoints**
   - OAuth providers endpoint
   - Apple OAuth initiation
   - Apple OAuth callback

3. **Integration**
   - Database connectivity
   - OAuth flow completion

## Troubleshooting

### Common Issues

1. **Invalid Key File**
   ```
   Error: ENOENT: no such file or directory, open '.../AuthKey.p8'
   ```
   **Solution**: Ensure the key file path is correct and file exists

2. **Invalid Team ID**
   ```
   Error: invalid_team_id
   ```
   **Solution**: Verify Team ID in Apple Developer Portal

3. **Invalid Client ID**
   ```
   Error: invalid_client
   ```
   **Solution**: Check Bundle ID/Service ID configuration

4. **Callback URL Mismatch**
   ```
   Error: redirect_uri_mismatch
   ```
   **Solution**: Ensure callback URL matches Apple Developer Portal

### Debug Mode

Enable debug logging:

```env
DEBUG=passport:*
```

### Apple Developer Portal Checklist

- [ ] Apple Developer Program membership active
- [ ] App ID created with Sign In with Apple enabled
- [ ] Private key generated and downloaded
- [ ] Service ID created (for web apps)
- [ ] Return URLs configured
- [ ] Team ID noted
- [ ] Bundle ID/Service ID correct

## Production Deployment

### Environment Variables

```env
# Production Apple Sign In Configuration
APPLE_CLIENT_ID=com.trustmd.production
APPLE_TEAM_ID=ABCD123456
APPLE_KEY_ID=EFG789HIJK
APPLE_KEY_FILE_PATH=/app/keys/AuthKey.p8
APPLE_CALLBACK_URL=https://api.trustmd.com/api/auth/apple/callback
```

### Security Best Practices

1. **Key Management**
   - Store private keys in secure location
   - Use environment-specific keys
   - Rotate keys periodically

2. **HTTPS Required**
   - Always use HTTPS in production
   - Configure SSL certificates
   - Update callback URLs

3. **Monitoring**
   - Monitor Apple OAuth success/failure rates
   - Log authentication events
   - Set up alerts for failures

## Compliance

### Apple Guidelines

1. **Privacy Policy**
   - Update privacy policy for Apple Sign In
   - Include Apple's requirements

2. **User Data**
   - Handle user data per Apple's guidelines
   - Respect user privacy choices

3. **App Store Requirements**
   - Include Apple Sign In if using other social logins
   - Follow Apple's Human Interface Guidelines

### Healthcare Compliance

1. **HIPAA Considerations**
   - Ensure Apple Sign In doesn't expose PHI
   - Maintain audit trails
   - Implement proper session management

2. **Data Handling**
   - Store Apple ID securely
   - Implement proper data retention
   - Follow healthcare data regulations

## API Reference

### Apple Sign In Endpoints

#### GET /api/auth/apple
Initiates Apple Sign In flow for web applications.

**Response**: Redirect to Apple authentication page

#### POST /api/auth/apple
Initiates Apple Sign In flow for mobile applications.

**Response**: Redirect to Apple authentication page

#### GET /api/auth/apple/callback
Handles Apple Sign In callback.

**Query Parameters**:
- `code`: Authorization code from Apple
- `state`: State parameter for CSRF protection
- `id_token`: ID token (if provided)

**Response**: Redirect to success/failure URL

### Configuration Object

```javascript
const appleConfig = {
    clientID: 'com.trustmd.app',
    teamID: 'ABCD123456',
    keyID: 'EFG789HIJK',
    keyFilePath: './keys/AuthKey.p8',
    callbackURL: 'http://localhost:3001/api/auth/apple/callback',
    scope: ['name', 'email']
};
```

### Profile Object

```javascript
// Apple Sign In profile structure
const appleProfile = {
    id: 'user-identifier',
    email: 'user@example.com',
    name: {
        firstName: 'John',
        lastName: 'Doe'
    }
};
```

## Support

For Apple Sign In issues:

1. **Apple Developer Support**: Contact Apple Developer Technical Support
2. **Documentation**: [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
3. **Community**: Apple Developer Forums
4. **TrustMD Support**: Internal technical team

## Updates and Maintenance

### Regular Tasks

1. **Key Rotation**: Rotate private keys annually
2. **Review Configuration**: Check Apple Developer Portal settings
3. **Monitor Usage**: Track authentication success rates
4. **Update Dependencies**: Keep passport-apple updated

### Version Updates

When updating Apple Sign In integration:

1. Test with Apple's sandbox environment
2. Verify backward compatibility
3. Update documentation
4. Communicate changes to users

This comprehensive Apple Sign In integration provides TrustMD users with a secure, privacy-focused authentication option that meets Apple's requirements and healthcare compliance standards.
