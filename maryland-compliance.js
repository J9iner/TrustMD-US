// TrustMD Maryland State Compliance Module
// Comprehensive Maryland-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Maryland State Compliance Manager
 * Handles all Maryland-specific regulatory compliance requirements
 */
class MarylandComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'MD', 'Maryland', 1.0);
    }

    // Maryland-specific compliance validation
    async validateMarylandCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Maryland-specific validations
            const mdValidations = this.performMarylandValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && mdValidations.isValid,
                score: Math.min(baseValidation.score || 100, mdValidations.score || 100),
                issues: [...baseValidation.errors, ...mdValidations.errors],
                warnings: [...baseValidation.warnings, ...mdValidations.warnings],
                marylandSpecific: mdValidations
            };
        } catch (error) {
            console.error('Maryland compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Maryland-specific validations
    performMarylandValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Maryland requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Maryland requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Maryland medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Maryland basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Maryland-specific compliance report
    async generateMarylandReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const mdSpecific = this.performMarylandValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (mdSpecific.score * 0.2)        // Maryland-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    marylandSpecific: mdSpecific
                },
                marylandSpecific: {
                    standardCompliance: mdSpecific.standardCompliance || 'unknown',
                    cmeCompliance: mdSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateMarylandRecommendations(overallScore, {
                    base: baseReport,
                    marylandSpecific: mdSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Maryland compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Maryland-specific recommendations
    generateMarylandRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Maryland compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Maryland compliance score'
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
    module.exports = MarylandComplianceManager;
} else {
    window.MarylandComplianceManager = MarylandComplianceManager;
}
