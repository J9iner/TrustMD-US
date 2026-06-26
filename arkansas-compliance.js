// TrustMD Arkansas State Compliance Module
// Comprehensive Arkansas-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Arkansas State Compliance Manager
 * Handles all Arkansas-specific regulatory compliance requirements
 */
class ArkansasComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'AR', 'Arkansas', 1.0);
    }

    // Arkansas-specific compliance validation
    async validateArkansasCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Arkansas-specific validations
            const arValidations = this.performArkansasValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && arValidations.isValid,
                score: Math.min(baseValidation.score || 100, arValidations.score || 100),
                issues: [...baseValidation.errors, ...arValidations.errors],
                warnings: [...baseValidation.warnings, ...arValidations.warnings],
                arkansasSpecific: arValidations
            };
        } catch (error) {
            console.error('Arkansas compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Arkansas-specific validations
    performArkansasValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Arkansas requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Arkansas requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Arkansas medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Arkansas basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Arkansas-specific compliance report
    async generateArkansasReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const arSpecific = this.performArkansasValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (arSpecific.score * 0.2)        // Arkansas-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    arkansasSpecific: arSpecific
                },
                arkansasSpecific: {
                    standardCompliance: arSpecific.standardCompliance || 'unknown',
                    cmeCompliance: arSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateArkansasRecommendations(overallScore, {
                    base: baseReport,
                    arkansasSpecific: arSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Arkansas compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Arkansas-specific recommendations
    generateArkansasRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Arkansas compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Arkansas compliance score'
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
    module.exports = ArkansasComplianceManager;
} else {
    window.ArkansasComplianceManager = ArkansasComplianceManager;
}
