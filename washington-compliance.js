// TrustMD Washington State Compliance Module
// Comprehensive Washington-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Washington State Compliance Manager
 * Handles all Washington-specific regulatory compliance requirements
 */
class WashingtonComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'WA', 'Washington', 1.0);
    }

    // Washington-specific compliance validation
    async validateWashingtonCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Washington-specific validations
            const waValidations = this.performWashingtonValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && waValidations.isValid,
                score: Math.min(baseValidation.score || 100, waValidations.score || 100),
                issues: [...baseValidation.errors, ...waValidations.errors],
                warnings: [...baseValidation.warnings, ...waValidations.warnings],
                washingtonSpecific: waValidations
            };
        } catch (error) {
            console.error('Washington compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Washington-specific validations
    performWashingtonValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Washington requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Washington requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Washington medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Washington basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Washington-specific compliance report
    async generateWashingtonReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const waSpecific = this.performWashingtonValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (waSpecific.score * 0.2)        // Washington-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    washingtonSpecific: waSpecific
                },
                washingtonSpecific: {
                    standardCompliance: waSpecific.standardCompliance || 'unknown',
                    cmeCompliance: waSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateWashingtonRecommendations(overallScore, {
                    base: baseReport,
                    washingtonSpecific: waSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Washington compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Washington-specific recommendations
    generateWashingtonRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Washington compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Washington compliance score'
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
    module.exports = WashingtonComplianceManager;
} else {
    window.WashingtonComplianceManager = WashingtonComplianceManager;
}
