// TrustMD Oklahoma State Compliance Module
// Comprehensive Oklahoma-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Oklahoma State Compliance Manager
 * Handles all Oklahoma-specific regulatory compliance requirements
 */
class OklahomaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'OK', 'Oklahoma', 1.0);
    }

    // Oklahoma-specific compliance validation
    async validateOklahomaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Oklahoma-specific validations
            const okValidations = this.performOklahomaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && okValidations.isValid,
                score: Math.min(baseValidation.score || 100, okValidations.score || 100),
                issues: [...baseValidation.errors, ...okValidations.errors],
                warnings: [...baseValidation.warnings, ...okValidations.warnings],
                oklahomaSpecific: okValidations
            };
        } catch (error) {
            console.error('Oklahoma compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Oklahoma-specific validations
    performOklahomaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Oklahoma requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Oklahoma requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Oklahoma medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Oklahoma basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Oklahoma-specific compliance report
    async generateOklahomaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const okSpecific = this.performOklahomaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (okSpecific.score * 0.2)        // Oklahoma-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    oklahomaSpecific: okSpecific
                },
                oklahomaSpecific: {
                    standardCompliance: okSpecific.standardCompliance || 'unknown',
                    cmeCompliance: okSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateOklahomaRecommendations(overallScore, {
                    base: baseReport,
                    oklahomaSpecific: okSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Oklahoma compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Oklahoma-specific recommendations
    generateOklahomaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Oklahoma compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Oklahoma compliance score'
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
    module.exports = OklahomaComplianceManager;
} else {
    window.OklahomaComplianceManager = OklahomaComplianceManager;
}
