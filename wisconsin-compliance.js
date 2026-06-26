// TrustMD Wisconsin State Compliance Module
// Comprehensive Wisconsin-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Wisconsin State Compliance Manager
 * Handles all Wisconsin-specific regulatory compliance requirements
 */
class WisconsinComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'WI', 'Wisconsin', 1.0);
    }

    // Wisconsin-specific compliance validation
    async validateWisconsinCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Wisconsin-specific validations
            const wiValidations = this.performWisconsinValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && wiValidations.isValid,
                score: Math.min(baseValidation.score || 100, wiValidations.score || 100),
                issues: [...baseValidation.errors, ...wiValidations.errors],
                warnings: [...baseValidation.warnings, ...wiValidations.warnings],
                wisconsinSpecific: wiValidations
            };
        } catch (error) {
            console.error('Wisconsin compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Wisconsin-specific validations
    performWisconsinValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Wisconsin requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Wisconsin requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Wisconsin medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Wisconsin basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Wisconsin-specific compliance report
    async generateWisconsinReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const wiSpecific = this.performWisconsinValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (wiSpecific.score * 0.2)        // Wisconsin-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    wisconsinSpecific: wiSpecific
                },
                wisconsinSpecific: {
                    standardCompliance: wiSpecific.standardCompliance || 'unknown',
                    cmeCompliance: wiSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateWisconsinRecommendations(overallScore, {
                    base: baseReport,
                    wisconsinSpecific: wiSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Wisconsin compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Wisconsin-specific recommendations
    generateWisconsinRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Wisconsin compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Wisconsin compliance score'
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
    module.exports = WisconsinComplianceManager;
} else {
    window.WisconsinComplianceManager = WisconsinComplianceManager;
}
