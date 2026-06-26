// TrustMD North Carolina State Compliance Module
// Comprehensive North Carolina-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * North Carolina State Compliance Manager
 * Handles all North Carolina-specific regulatory compliance requirements
 */
class NorthCarolinaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'NC', 'North Carolina', 1.0);
    }

    // North Carolina-specific compliance validation
    async validateNorthCarolinaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // North Carolina-specific validations
            const ncValidations = this.performNorthCarolinaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && ncValidations.isValid,
                score: Math.min(baseValidation.score || 100, ncValidations.score || 100),
                issues: [...baseValidation.errors, ...ncValidations.errors],
                warnings: [...baseValidation.warnings, ...ncValidations.warnings],
                northCarolinaSpecific: ncValidations
            };
        } catch (error) {
            console.error('North Carolina compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform North Carolina-specific validations
    performNorthCarolinaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (North Carolina requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('North Carolina requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('North Carolina medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('North Carolina basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate North Carolina-specific compliance report
    async generateNorthCarolinaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const ncSpecific = this.performNorthCarolinaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (ncSpecific.score * 0.2)        // North Carolina-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    northCarolinaSpecific: ncSpecific
                },
                northCarolinaSpecific: {
                    standardCompliance: ncSpecific.standardCompliance || 'unknown',
                    cmeCompliance: ncSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateNorthCarolinaRecommendations(overallScore, {
                    base: baseReport,
                    northCarolinaSpecific: ncSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating North Carolina compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate North Carolina-specific recommendations
    generateNorthCarolinaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'North Carolina compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve North Carolina compliance score'
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
    module.exports = NorthCarolinaComplianceManager;
} else {
    window.NorthCarolinaComplianceManager = NorthCarolinaComplianceManager;
}
