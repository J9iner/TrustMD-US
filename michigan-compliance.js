// TrustMD Michigan State Compliance Module
// Comprehensive Michigan-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Michigan State Compliance Manager
 * Handles all Michigan-specific regulatory compliance requirements
 */
class MichiganComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'MI', 'Michigan', 1.0);
    }

    // Michigan-specific compliance validation
    async validateMichiganCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Michigan-specific validations
            const miValidations = this.performMichiganValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && miValidations.isValid,
                score: Math.min(baseValidation.score || 100, miValidations.score || 100),
                issues: [...baseValidation.errors, ...miValidations.errors],
                warnings: [...baseValidation.warnings, ...miValidations.warnings],
                michiganSpecific: miValidations
            };
        } catch (error) {
            console.error('Michigan compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Michigan-specific validations
    performMichiganValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Michigan requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Michigan requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Michigan medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Michigan basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Michigan-specific compliance report
    async generateMichiganReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const miSpecific = this.performMichiganValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (miSpecific.score * 0.2)        // Michigan-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    michiganSpecific: miSpecific
                },
                michiganSpecific: {
                    standardCompliance: miSpecific.standardCompliance || 'unknown',
                    cmeCompliance: miSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateMichiganRecommendations(overallScore, {
                    base: baseReport,
                    michiganSpecific: miSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Michigan compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Michigan-specific recommendations
    generateMichiganRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Michigan compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Michigan compliance score'
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
    module.exports = MichiganComplianceManager;
} else {
    window.MichiganComplianceManager = MichiganComplianceManager;
}
