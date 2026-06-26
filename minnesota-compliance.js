// TrustMD Minnesota State Compliance Module
// Comprehensive Minnesota-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Minnesota State Compliance Manager
 * Handles all Minnesota-specific regulatory compliance requirements
 */
class MinnesotaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'MN', 'Minnesota', 1.0);
    }

    // Minnesota-specific compliance validation
    async validateMinnesotaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Minnesota-specific validations
            const mnValidations = this.performMinnesotaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && mnValidations.isValid,
                score: Math.min(baseValidation.score || 100, mnValidations.score || 100),
                issues: [...baseValidation.errors, ...mnValidations.errors],
                warnings: [...baseValidation.warnings, ...mnValidations.warnings],
                minnesotaSpecific: mnValidations
            };
        } catch (error) {
            console.error('Minnesota compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Minnesota-specific validations
    performMinnesotaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Minnesota requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Minnesota requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Minnesota medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Minnesota basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Minnesota-specific compliance report
    async generateMinnesotaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const mnSpecific = this.performMinnesotaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (mnSpecific.score * 0.2)        // Minnesota-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    minnesotaSpecific: mnSpecific
                },
                minnesotaSpecific: {
                    standardCompliance: mnSpecific.standardCompliance || 'unknown',
                    cmeCompliance: mnSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateMinnesotaRecommendations(overallScore, {
                    base: baseReport,
                    minnesotaSpecific: mnSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Minnesota compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Minnesota-specific recommendations
    generateMinnesotaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Minnesota compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Minnesota compliance score'
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
    module.exports = MinnesotaComplianceManager;
} else {
    window.MinnesotaComplianceManager = MinnesotaComplianceManager;
}
