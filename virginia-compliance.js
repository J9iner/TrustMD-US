// TrustMD Virginia State Compliance Module
// Comprehensive Virginia-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Virginia State Compliance Manager
 * Handles all Virginia-specific regulatory compliance requirements
 */
class VirginiaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'VA', 'Virginia', 1.0);
    }

    // Virginia-specific compliance validation
    async validateVirginiaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Virginia-specific validations
            const vaValidations = this.performVirginiaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && vaValidations.isValid,
                score: Math.min(baseValidation.score || 100, vaValidations.score || 100),
                issues: [...baseValidation.errors, ...vaValidations.errors],
                warnings: [...baseValidation.warnings, ...vaValidations.warnings],
                virginiaSpecific: vaValidations
            };
        } catch (error) {
            console.error('Virginia compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Virginia-specific validations
    performVirginiaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Virginia requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Virginia requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Virginia medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Virginia basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Virginia-specific compliance report
    async generateVirginiaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const vaSpecific = this.performVirginiaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (vaSpecific.score * 0.2)        // Virginia-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    virginiaSpecific: vaSpecific
                },
                virginiaSpecific: {
                    standardCompliance: vaSpecific.standardCompliance || 'unknown',
                    cmeCompliance: vaSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateVirginiaRecommendations(overallScore, {
                    base: baseReport,
                    virginiaSpecific: vaSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Virginia compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Virginia-specific recommendations
    generateVirginiaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Virginia compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Virginia compliance score'
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
    module.exports = VirginiaComplianceManager;
} else {
    window.VirginiaComplianceManager = VirginiaComplianceManager;
}
