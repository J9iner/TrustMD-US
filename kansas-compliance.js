// TrustMD Kansas State Compliance Module
// Comprehensive Kansas-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Kansas State Compliance Manager
 * Handles all Kansas-specific regulatory compliance requirements
 */
class KansasComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'KS', 'Kansas', 1.0);
    }

    // Kansas-specific compliance validation
    async validateKansasCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Kansas-specific validations
            const ksValidations = this.performKansasValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && ksValidations.isValid,
                score: Math.min(baseValidation.score || 100, ksValidations.score || 100),
                issues: [...baseValidation.errors, ...ksValidations.errors],
                warnings: [...baseValidation.warnings, ...ksValidations.warnings],
                kansasSpecific: ksValidations
            };
        } catch (error) {
            console.error('Kansas compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Kansas-specific validations
    performKansasValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Kansas requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Kansas requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Kansas medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Kansas basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Kansas-specific compliance report
    async generateKansasReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const ksSpecific = this.performKansasValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (ksSpecific.score * 0.2)        // Kansas-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    kansasSpecific: ksSpecific
                },
                kansasSpecific: {
                    standardCompliance: ksSpecific.standardCompliance || 'unknown',
                    cmeCompliance: ksSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateKansasRecommendations(overallScore, {
                    base: baseReport,
                    kansasSpecific: ksSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Kansas compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Kansas-specific recommendations
    generateKansasRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Kansas compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Kansas compliance score'
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
    module.exports = KansasComplianceManager;
} else {
    window.KansasComplianceManager = KansasComplianceManager;
}
