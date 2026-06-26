// TrustMD Alaska State Compliance Module
// Comprehensive Alaska-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Alaska State Compliance Manager
 * Handles all Alaska-specific regulatory compliance requirements
 */
class AlaskaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'AK', 'Alaska', 0.0);
    }

    // Alaska-specific compliance validation
    async validateAlaskaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Alaska-specific validations
            const akValidations = this.performAlaskaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && akValidations.isValid,
                score: Math.min(baseValidation.score || 100, akValidations.score || 100),
                issues: [...baseValidation.errors, ...akValidations.errors],
                warnings: [...baseValidation.warnings, ...akValidations.warnings],
                alaskaSpecific: akValidations
            };
        } catch (error) {
            console.error('Alaska compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Alaska-specific validations
    performAlaskaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Alaska requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Alaska requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Alaska medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for minimal regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Alaska basic compliance recommended');
            score -= 5;
        }

        // Frontier healthcare provisions
        if (!complianceData.ruralHealthCompliance) {
            warnings.push('Alaska frontier healthcare provisions recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Alaska-specific compliance report
    async generateAlaskaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const akSpecific = this.performAlaskaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.9) +      // Base compliance (90%)
                (akSpecific.score * 0.1)        // Alaska-specific (10%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    alaskaSpecific: akSpecific
                },
                alaskaSpecific: {
                    frontierHealthcareCompliance: akSpecific.frontierHealthcareCompliance || 'unknown',
                    ruralHealthCompliance: akSpecific.ruralHealthCompliance || 'unknown',
                    cmeCompliance: akSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateAlaskaRecommendations(overallScore, {
                    base: baseReport,
                    alaskaSpecific: akSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Alaska compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Alaska-specific recommendations
    generateAlaskaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Alaska compliance score below acceptable threshold'
            });
        }

        if (!complianceData.alaskaSpecific?.frontierHealthcareCompliance) {
            recommendations.push({
                priority: 'medium',
                category: 'frontier',
                action: 'Implement frontier healthcare provisions',
                description: 'Alaska frontier healthcare provisions recommended'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Alaska compliance score'
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
    module.exports = AlaskaComplianceManager;
} else {
    window.AlaskaComplianceManager = AlaskaComplianceManager;
}
