// TrustMD Arizona State Compliance Module
// Comprehensive Arizona-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Arizona State Compliance Manager
 * Handles all Arizona-specific regulatory compliance requirements
 */
class ArizonaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'AZ', 'Arizona', 1.0);
    }

    // Arizona-specific compliance validation
    async validateArizonaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Arizona-specific validations
            const azValidations = this.performArizonaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && azValidations.isValid,
                score: Math.min(baseValidation.score || 100, azValidations.score || 100),
                issues: [...baseValidation.errors, ...azValidations.errors],
                warnings: [...baseValidation.warnings, ...azValidations.warnings],
                arizonaSpecific: azValidations
            };
        } catch (error) {
            console.error('Arizona compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Arizona-specific validations
    performArizonaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Arizona requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Arizona requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Arizona medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Arizona basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Arizona-specific compliance report
    async generateArizonaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const azSpecific = this.performArizonaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (azSpecific.score * 0.2)        // Arizona-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    arizonaSpecific: azSpecific
                },
                arizonaSpecific: {
                    standardCompliance: azSpecific.standardCompliance || 'unknown',
                    cmeCompliance: azSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateArizonaRecommendations(overallScore, {
                    base: baseReport,
                    arizonaSpecific: azSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Arizona compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Arizona-specific recommendations
    generateArizonaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Arizona compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Arizona compliance score'
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
    module.exports = ArizonaComplianceManager;
} else {
    window.ArizonaComplianceManager = ArizonaComplianceManager;
}
