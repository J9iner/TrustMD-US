// TrustMD Hawaii State Compliance Module
// Comprehensive Hawaii-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Hawaii State Compliance Manager
 * Handles all Hawaii-specific regulatory compliance requirements
 */
class HawaiiComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'HI', 'Hawaii', 1.0);
    }

    // Hawaii-specific compliance validation
    async validateHawaiiCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Hawaii-specific validations
            const hiValidations = this.performHawaiiValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && hiValidations.isValid,
                score: Math.min(baseValidation.score || 100, hiValidations.score || 100),
                issues: [...baseValidation.errors, ...hiValidations.errors],
                warnings: [...baseValidation.warnings, ...hiValidations.warnings],
                hawaiiSpecific: hiValidations
            };
        } catch (error) {
            console.error('Hawaii compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Hawaii-specific validations
    performHawaiiValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Hawaii requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Hawaii requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Hawaii medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Hawaii basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Hawaii-specific compliance report
    async generateHawaiiReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const hiSpecific = this.performHawaiiValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (hiSpecific.score * 0.2)        // Hawaii-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    hawaiiSpecific: hiSpecific
                },
                hawaiiSpecific: {
                    standardCompliance: hiSpecific.standardCompliance || 'unknown',
                    cmeCompliance: hiSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateHawaiiRecommendations(overallScore, {
                    base: baseReport,
                    hawaiiSpecific: hiSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Hawaii compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Hawaii-specific recommendations
    generateHawaiiRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Hawaii compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Hawaii compliance score'
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
    module.exports = HawaiiComplianceManager;
} else {
    window.HawaiiComplianceManager = HawaiiComplianceManager;
}
