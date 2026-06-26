// TrustMD Illinois State Compliance Module
// Comprehensive Illinois-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Illinois State Compliance Manager
 * Handles all Illinois-specific regulatory compliance requirements
 */
class IllinoisComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'IL', 'Illinois', 1.0);
    }

    // Illinois-specific compliance validation
    async validateIllinoisCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Illinois-specific validations
            const ilValidations = this.performIllinoisValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && ilValidations.isValid,
                score: Math.min(baseValidation.score || 100, ilValidations.score || 100),
                issues: [...baseValidation.errors, ...ilValidations.errors],
                warnings: [...baseValidation.warnings, ...ilValidations.warnings],
                illinoisSpecific: ilValidations
            };
        } catch (error) {
            console.error('Illinois compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Illinois-specific validations
    performIllinoisValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Illinois requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Illinois requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Illinois medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Illinois basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Illinois-specific compliance report
    async generateIllinoisReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const ilSpecific = this.performIllinoisValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (ilSpecific.score * 0.2)        // Illinois-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    illinoisSpecific: ilSpecific
                },
                illinoisSpecific: {
                    standardCompliance: ilSpecific.standardCompliance || 'unknown',
                    cmeCompliance: ilSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateIllinoisRecommendations(overallScore, {
                    base: baseReport,
                    illinoisSpecific: ilSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Illinois compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Illinois-specific recommendations
    generateIllinoisRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Illinois compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Illinois compliance score'
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
    module.exports = IllinoisComplianceManager;
} else {
    window.IllinoisComplianceManager = IllinoisComplianceManager;
}
