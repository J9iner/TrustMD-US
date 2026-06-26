// TrustMD User Profile Mapping for OAuth
// Handles mapping OAuth provider profiles to TrustMD user structure

const { supabase } = require('../services/supabase-client');

class OAuthProfileMapper {
    constructor() {
        this.providerMappers = {
            google: this.mapGoogleProfile.bind(this),
            microsoft: this.mapMicrosoftProfile.bind(this)
        };
    }

    /**
     * Map OAuth profile to TrustMD user structure
     * @param {Object} profile - OAuth provider profile
     * @param {string} provider - Provider name ('google' or 'microsoft')
     * @returns {Object} Mapped user profile
     */
    mapProfile(profile, provider) {
        const mapper = this.providerMappers[provider];
        if (!mapper) {
            throw new Error(`Unsupported OAuth provider: ${provider}`);
        }

        return mapper(profile);
    }

    /**
     * Map Google OAuth profile
     * @param {Object} profile - Google profile object
     * @returns {Object} Mapped profile
     */
    mapGoogleProfile(profile) {
        const email = profile.emails?.[0]?.value;
        const firstName = profile.name?.givenName || '';
        const lastName = profile.name?.familyName || '';
        const fullName = profile.displayName || `${firstName} ${lastName}`.trim();

        return {
            email,
            fullName: fullName || 'Unknown User',
            firstName,
            lastName,
            avatar: profile.photos?.[0]?.value || null,
            provider: 'google',
            providerId: profile.id,
            verified: profile.verified || false,
            locale: profile.language || 'en',
            metadata: {
                raw: profile,
                mappedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Map Microsoft OAuth profile
     * @param {Object} profile - Microsoft profile object
     * @returns {Object} Mapped profile
     */
    mapMicrosoftProfile(profile) {
        const email = profile.upn || profile.email || profile._json?.email;
        const firstName = profile.given_name || profile.name?.givenName || '';
        const lastName = profile.family_name || profile.name?.familyName || '';
        const fullName = profile.displayName || profile.name || `${firstName} ${lastName}`.trim();

        return {
            email,
            fullName: fullName || 'Unknown User',
            firstName,
            lastName,
            avatar: profile.picture || null,
            provider: 'microsoft',
            providerId: profile.oid || profile.sub,
            verified: true, // Microsoft accounts are verified by default
            locale: profile.locale || 'en',
            jobTitle: profile.jobTitle || null,
            department: profile.department || null,
            officeLocation: profile.officeLocation || null,
            metadata: {
                raw: profile,
                mappedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Validate mapped profile
     * @param {Object} mappedProfile - Mapped profile object
     * @returns {Object} Validation result
     */
    validateMappedProfile(mappedProfile) {
        const errors = [];

        if (!mappedProfile.email) {
            errors.push('Email is required');
        } else if (!this.isValidEmail(mappedProfile.email)) {
            errors.push('Invalid email format');
        }

        if (!mappedProfile.fullName || mappedProfile.fullName.trim().length < 2) {
            errors.push('Full name must be at least 2 characters');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if email is valid
     * @param {string} email - Email address
     * @returns {boolean} Valid email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Enrich profile with additional data
     * @param {Object} mappedProfile - Mapped profile
     * @param {Object} additionalData - Additional data to merge
     * @returns {Object} Enriched profile
     */
    enrichProfile(mappedProfile, additionalData = {}) {
        return {
            ...mappedProfile,
            ...additionalData,
            metadata: {
                ...mappedProfile.metadata,
                enrichedAt: new Date().toISOString(),
                enrichmentData: additionalData
            }
        };
    }

    /**
     * Get default role for new OAuth users
     * @param {Object} mappedProfile - Mapped profile
     * @returns {string} Default role
     */
    getDefaultRole(mappedProfile) {
        // Business logic for default role assignment
        // For healthcare compliance, default to healthcare_provider
        // Could be enhanced based on email domain, job title, etc.
        
        const email = mappedProfile.email.toLowerCase();
        
        // Check for common healthcare organization domains
        const healthcareDomains = [
            'hospital', 'clinic', 'medical', 'health', 'healthcare',
            'hhs', 'nih', 'cdc', 'medicare', 'medicaid'
        ];

        const isHealthcareEmail = healthcareDomains.some(domain => 
            email.includes(domain)
        );

        if (isHealthcareEmail) {
            return 'healthcare_provider';
        }

        // Check job titles for healthcare indicators
        if (mappedProfile.jobTitle) {
            const healthcareTitles = [
                'doctor', 'physician', 'nurse', 'medical', 'clinical',
                'surgeon', 'dentist', 'pharmacist', 'therapist'
            ];

            const isHealthcareTitle = healthcareTitles.some(title =>
                mappedProfile.jobTitle.toLowerCase().includes(title)
            );

            if (isHealthcareTitle) {
                return 'healthcare_provider';
            }
        }

        // Default to staff for unknown profiles
        return 'staff';
    }

    /**
     * Generate practice name for new OAuth users
     * @param {Object} mappedProfile - Mapped profile
     * @returns {string} Practice name
     */
    generatePracticeName(mappedProfile) {
        const baseName = mappedProfile.fullName || mappedProfile.email.split('@')[0];
        
        // If job title or department is available, use it
        if (mappedProfile.jobTitle) {
            return `${baseName} - ${mappedProfile.jobTitle}`;
        }
        
        if (mappedProfile.department) {
            return `${baseName} - ${mappedProfile.department}`;
        }

        return `${baseName}'s Practice`;
    }

    /**
     * Create user record from OAuth profile
     * @param {Object} mappedProfile - Mapped profile
     * @param {string} tenantId - Tenant ID
     * @returns {Object} User record
     */
    createUserRecord(mappedProfile, tenantId) {
        const validation = this.validateMappedProfile(mappedProfile);
        if (!validation.isValid) {
            throw new Error(`Profile validation failed: ${validation.errors.join(', ')}`);
        }

        return {
            tenant_id: tenantId,
            email: mappedProfile.email,
            full_name: mappedProfile.fullName,
            role: this.getDefaultRole(mappedProfile),
            department: mappedProfile.department || 'General',
            is_active: true,
            oauth_provider: mappedProfile.provider,
            oauth_id: mappedProfile.providerId,
            password_hash: null, // OAuth users don't have passwords
            avatar_url: mappedProfile.avatar,
            email_verified: mappedProfile.verified,
            metadata: mappedProfile.metadata,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }

    /**
     * Update existing user with OAuth data
     * @param {Object} existingUser - Existing user record
     * @param {Object} mappedProfile - Mapped profile
     * @returns {Object} Updated user record
     */
    updateUserWithOAuthData(existingUser, mappedProfile) {
        return {
            ...existingUser,
            oauth_provider: mappedProfile.provider,
            oauth_id: mappedProfile.providerId,
            avatar_url: mappedProfile.avatar || existingUser.avatar_url,
            email_verified: mappedProfile.verified || existingUser.email_verified,
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {
                ...existingUser.metadata,
                ...mappedProfile.metadata,
                lastOAuthUpdate: new Date().toISOString()
            }
        };
    }

    /**
     * Check if user exists with OAuth provider
     * @param {string} provider - OAuth provider
     * @param {string} providerId - Provider-specific ID
     * @returns {Promise<Object|null>} User record or null
     */
    async findUserByOAuth(provider, providerId) {
        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('oauth_provider', provider)
                .eq('oauth_id', providerId)
                .single();

            if (error && error.code !== 'PGRST116') { // Not found error
                throw error;
            }

            return user;
        } catch (error) {
            console.error('Error finding user by OAuth:', error);
            return null;
        }
    }

    /**
     * Check if user exists by email
     * @param {string} email - Email address
     * @returns {Promise<Object|null>} User record or null
     */
    async findUserByEmail(email) {
        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (error && error.code !== 'PGRST116') { // Not found error
                throw error;
            }

            return user;
        } catch (error) {
            console.error('Error finding user by email:', error);
            return null;
        }
    }
}

module.exports = OAuthProfileMapper;
