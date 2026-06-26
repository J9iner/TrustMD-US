// TrustMD Georgia State Compliance Module
// Comprehensive Georgia-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Georgia State Compliance Manager
 * Handles all Georgia-specific regulatory compliance requirements
 */
class GeorgiaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'GA', 'Georgia', 1.0);
    }

    // Georgia-specific compliance validation
    async validateGeorgiaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Georgia-specific validations
            const gaValidations = this.performGeorgiaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && gaValidations.isValid,
                score: Math.min(baseValidation.score || 100, gaValidations.score || 100),
                issues: [...baseValidation.errors, ...gaValidations.errors],
                warnings: [...baseValidation.warnings, ...gaValidations.warnings],
                georgiaSpecific: gaValidations
            };
        } catch (error) {
            console.error('Georgia compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Georgia-specific validations
    performGeorgiaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Georgia requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Georgia requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Georgia medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Georgia basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Georgia-specific compliance report
    async generateGeorgiaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const gaSpecific = this.performGeorgiaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (gaSpecific.score * 0.2)        // Georgia-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    georgiaSpecific: gaSpecific
                },
                georgiaSpecific: {
                    standardCompliance: gaSpecific.standardCompliance || 'unknown',
                    cmeCompliance: gaSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateGeorgiaRecommendations(overallScore, {
                    base: baseReport,
                    georgiaSpecific: gaSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Georgia compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Georgia-specific recommendations
    generateGeorgiaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Georgia compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Georgia compliance score'
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
    module.exports = GeorgiaComplianceManager;
} else {
    window.GeorgiaComplianceManager = GeorgiaComplianceManager;
}
