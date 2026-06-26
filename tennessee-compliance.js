// TrustMD Tennessee State Compliance Module
// Comprehensive Tennessee-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Tennessee State Compliance Manager
 * Handles all Tennessee-specific regulatory compliance requirements
 */
class TennesseeComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'TN', 'Tennessee', 1.0);
    }

    // Tennessee-specific compliance validation
    async validateTennesseeCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Tennessee-specific validations
            const tnValidations = this.performTennesseeValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && tnValidations.isValid,
                score: Math.min(baseValidation.score || 100, tnValidations.score || 100),
                issues: [...baseValidation.errors, ...tnValidations.errors],
                warnings: [...baseValidation.warnings, ...tnValidations.warnings],
                tennesseeSpecific: tnValidations
            };
        } catch (error) {
            console.error('Tennessee compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Tennessee-specific validations
    performTennesseeValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Tennessee requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Tennessee requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Tennessee medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Tennessee basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Tennessee-specific compliance report
    async generateTennesseeReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const tnSpecific = this.performTennesseeValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (tnSpecific.score * 0.2)        // Tennessee-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    tennesseeSpecific: tnSpecific
                },
                tennesseeSpecific: {
                    standardCompliance: tnSpecific.standardCompliance || 'unknown',
                    cmeCompliance: tnSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateTennesseeRecommendations(overallScore, {
                    base: baseReport,
                    tennesseeSpecific: tnSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Tennessee compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Tennessee-specific recommendations
    generateTennesseeRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Tennessee compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Tennessee compliance score'
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
    module.exports = TennesseeComplianceManager;
} else {
    window.TennesseeComplianceManager = TennesseeComplianceManager;
}
