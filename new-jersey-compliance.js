// TrustMD New Jersey State Compliance Module
// Comprehensive New Jersey-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * New Jersey State Compliance Manager
 * Handles all New Jersey-specific regulatory compliance requirements
 */
class NewJerseyComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'NJ', 'New Jersey', 1.0);
    }

    // New Jersey-specific compliance validation
    async validateNewJerseyCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // New Jersey-specific validations
            const njValidations = this.performNewJerseyValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && njValidations.isValid,
                score: Math.min(baseValidation.score || 100, njValidations.score || 100),
                issues: [...baseValidation.errors, ...njValidations.errors],
                warnings: [...baseValidation.warnings, ...njValidations.warnings],
                newJerseySpecific: njValidations
            };
        } catch (error) {
            console.error('New Jersey compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform New Jersey-specific validations
    performNewJerseyValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (New Jersey requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('New Jersey requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('New Jersey medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('New Jersey basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate New Jersey-specific compliance report
    async generateNewJerseyReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const njSpecific = this.performNewJerseyValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (njSpecific.score * 0.2)        // New Jersey-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    newJerseySpecific: njSpecific
                },
                newJerseySpecific: {
                    standardCompliance: njSpecific.standardCompliance || 'unknown',
                    cmeCompliance: njSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateNewJerseyRecommendations(overallScore, {
                    base: baseReport,
                    newJerseySpecific: njSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating New Jersey compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate New Jersey-specific recommendations
    generateNewJerseyRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'New Jersey compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve New Jersey compliance score'
            });
        }

        return recommendations;
    }

    // Get compliance status
    getComplianceStatus(score) {
        if (score >= 95) return 'excellent';
        if (score >= 85) return 'good';
        if (score >= 70) return 'acceptable';
        if (score >= 60) return 'needs_improvement';
        return 'critical';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NewJerseyComplianceManager;
} else {
    window.NewJerseyComplianceManager = NewJerseyComplianceManager;
}
