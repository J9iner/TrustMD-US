// TrustMD Nebraska State Compliance Module
// Comprehensive Nebraska-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Nebraska State Compliance Manager
 * Handles all Nebraska-specific regulatory compliance requirements
 */
class NebraskaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'NE', 'Nebraska', 1.0);
    }

    // Nebraska-specific compliance validation
    async validateNebraskaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Nebraska-specific validations
            const neValidations = this.performNebraskaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && neValidations.isValid,
                score: Math.min(baseValidation.score || 100, neValidations.score || 100),
                issues: [...baseValidation.errors, ...neValidations.errors],
                warnings: [...baseValidation.warnings, ...neValidations.warnings],
                nebraskaSpecific: neValidations
            };
        } catch (error) {
            console.error('Nebraska compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Nebraska-specific validations
    performNebraskaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Nebraska requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Nebraska requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Nebraska medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Nebraska basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Nebraska-specific compliance report
    async generateNebraskaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const neSpecific = this.performNebraskaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (neSpecific.score * 0.2)        // Nebraska-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    nebraskaSpecific: neSpecific
                },
                nebraskaSpecific: {
                    standardCompliance: neSpecific.standardCompliance || 'unknown',
                    cmeCompliance: neSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateNebraskaRecommendations(overallScore, {
                    base: baseReport,
                    nebraskaSpecific: neSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Nebraska compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Nebraska-specific recommendations
    generateNebraskaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Nebraska compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Nebraska compliance score'
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
    module.exports = NebraskaComplianceManager;
} else {
    window.NebraskaComplianceManager = NebraskaComplianceManager;
}
