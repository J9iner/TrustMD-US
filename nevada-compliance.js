// TrustMD Nevada State Compliance Module
// Comprehensive Nevada-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Nevada State Compliance Manager
 * Handles all Nevada-specific regulatory compliance requirements
 */
class NevadaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'NV', 'Nevada', 1.0);
    }

    // Nevada-specific compliance validation
    async validateNevadaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Nevada-specific validations
            const nvValidations = this.performNevadaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && nvValidations.isValid,
                score: Math.min(baseValidation.score || 100, nvValidations.score || 100),
                issues: [...baseValidation.errors, ...nvValidations.errors],
                warnings: [...baseValidation.warnings, ...nvValidations.warnings],
                nevadaSpecific: nvValidations
            };
        } catch (error) {
            console.error('Nevada compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Nevada-specific validations
    performNevadaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Nevada requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Nevada requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Nevada medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Nevada basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Nevada-specific compliance report
    async generateNevadaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const nvSpecific = this.performNevadaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (nvSpecific.score * 0.2)        // Nevada-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    nevadaSpecific: nvSpecific
                },
                nevadaSpecific: {
                    standardCompliance: nvSpecific.standardCompliance || 'unknown',
                    cmeCompliance: nvSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateNevadaRecommendations(overallScore, {
                    base: baseReport,
                    nevadaSpecific: nvSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Nevada compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Nevada-specific recommendations
    generateNevadaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Nevada compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Nevada compliance score'
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
    module.exports = NevadaComplianceManager;
} else {
    window.NevadaComplianceManager = NevadaComplianceManager;
}
