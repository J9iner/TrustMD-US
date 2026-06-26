// TrustMD Kentucky State Compliance Module
// Comprehensive Kentucky-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Kentucky State Compliance Manager
 * Handles all Kentucky-specific regulatory compliance requirements
 */
class KentuckyComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'KY', 'Kentucky', 1.0);
    }

    // Kentucky-specific compliance validation
    async validateKentuckyCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Kentucky-specific validations
            const kyValidations = this.performKentuckyValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && kyValidations.isValid,
                score: Math.min(baseValidation.score || 100, kyValidations.score || 100),
                issues: [...baseValidation.errors, ...kyValidations.errors],
                warnings: [...baseValidation.warnings, ...kyValidations.warnings],
                kentuckySpecific: kyValidations
            };
        } catch (error) {
            console.error('Kentucky compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Kentucky-specific validations
    performKentuckyValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Kentucky requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Kentucky requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Kentucky medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Kentucky basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Kentucky-specific compliance report
    async generateKentuckyReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const kySpecific = this.performKentuckyValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (kySpecific.score * 0.2)        // Kentucky-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    kentuckySpecific: kySpecific
                },
                kentuckySpecific: {
                    standardCompliance: kySpecific.standardCompliance || 'unknown',
                    cmeCompliance: kySpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateKentuckyRecommendations(overallScore, {
                    base: baseReport,
                    kentuckySpecific: kySpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Kentucky compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Kentucky-specific recommendations
    generateKentuckyRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Kentucky compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Kentucky compliance score'
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
    module.exports = KentuckyComplianceManager;
} else {
    window.KentuckyComplianceManager = KentuckyComplianceManager;
}
