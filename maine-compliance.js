// TrustMD Maine State Compliance Module
// Comprehensive Maine-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Maine State Compliance Manager
 * Handles all Maine-specific regulatory compliance requirements
 */
class MaineComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'ME', 'Maine', 1.0);
    }

    // Maine-specific compliance validation
    async validateMaineCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Maine-specific validations
            const meValidations = this.performMaineValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && meValidations.isValid,
                score: Math.min(baseValidation.score || 100, meValidations.score || 100),
                issues: [...baseValidation.errors, ...meValidations.errors],
                warnings: [...baseValidation.warnings, ...meValidations.warnings],
                maineSpecific: meValidations
            };
        } catch (error) {
            console.error('Maine compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Maine-specific validations
    performMaineValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Maine requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Maine requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Maine medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Maine basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Maine-specific compliance report
    async generateMaineReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const meSpecific = this.performMaineValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (meSpecific.score * 0.2)        // Maine-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    maineSpecific: meSpecific
                },
                maineSpecific: {
                    standardCompliance: meSpecific.standardCompliance || 'unknown',
                    cmeCompliance: meSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateMaineRecommendations(overallScore, {
                    base: baseReport,
                    maineSpecific: meSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Maine compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Maine-specific recommendations
    generateMaineRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Maine compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Maine compliance score'
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
    module.exports = MaineComplianceManager;
} else {
    window.MaineComplianceManager = MaineComplianceManager;
}
