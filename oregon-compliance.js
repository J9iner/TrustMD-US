// TrustMD Oregon State Compliance Module
// Comprehensive Oregon-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Oregon State Compliance Manager
 * Handles all Oregon-specific regulatory compliance requirements
 */
class OregonComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'OR', 'Oregon', 1.0);
    }

    // Oregon-specific compliance validation
    async validateOregonCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Oregon-specific validations
            const orValidations = this.performOregonValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && orValidations.isValid,
                score: Math.min(baseValidation.score || 100, orValidations.score || 100),
                issues: [...baseValidation.errors, ...orValidations.errors],
                warnings: [...baseValidation.warnings, ...orValidations.warnings],
                oregonSpecific: orValidations
            };
        } catch (error) {
            console.error('Oregon compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Oregon-specific validations
    performOregonValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Oregon requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Oregon requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Oregon medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Oregon basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Oregon-specific compliance report
    async generateOregonReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const orSpecific = this.performOregonValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (orSpecific.score * 0.2)        // Oregon-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    oregonSpecific: orSpecific
                },
                oregonSpecific: {
                    standardCompliance: orSpecific.standardCompliance || 'unknown',
                    cmeCompliance: orSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateOregonRecommendations(overallScore, {
                    base: baseReport,
                    oregonSpecific: orSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Oregon compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Oregon-specific recommendations
    generateOregonRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Oregon compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Oregon compliance score'
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
    module.exports = OregonComplianceManager;
} else {
    window.OregonComplianceManager = OregonComplianceManager;
}
