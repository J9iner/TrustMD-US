// TrustMD Alabama State Compliance Module
// Comprehensive Alabama-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Alabama State Compliance Manager
 * Handles all Alabama-specific regulatory compliance requirements
 */
class AlabamaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'AL', 'Alabama', 1.0);
    }

    // Alabama-specific compliance validation
    async validateAlabamaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Alabama-specific validations
            const alValidations = this.performAlabamaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && alValidations.isValid,
                score: Math.min(baseValidation.score || 100, alValidations.score || 100),
                issues: [...baseValidation.errors, ...alValidations.errors],
                warnings: [...baseValidation.warnings, ...alValidations.warnings],
                alabamaSpecific: alValidations
            };
        } catch (error) {
            console.error('Alabama compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Alabama-specific validations
    performAlabamaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Alabama requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Alabama requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Alabama medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Alabama basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Alabama-specific compliance report
    async generateAlabamaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const alSpecific = this.performAlabamaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (alSpecific.score * 0.2)        // Alabama-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    alabamaSpecific: alSpecific
                },
                alabamaSpecific: {
                    standardCompliance: alSpecific.standardCompliance || 'unknown',
                    cmeCompliance: alSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateAlabamaRecommendations(overallScore, {
                    base: baseReport,
                    alabamaSpecific: alSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Alabama compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Alabama-specific recommendations
    generateAlabamaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Alabama compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Alabama compliance score'
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
    module.exports = AlabamaComplianceManager;
} else {
    window.AlabamaComplianceManager = AlabamaComplianceManager;
}
