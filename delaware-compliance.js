// TrustMD Delaware State Compliance Module
// Comprehensive Delaware-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Delaware State Compliance Manager
 * Handles all Delaware-specific regulatory compliance requirements
 */
class DelawareComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'DE', 'Delaware', 1.0);
    }

    // Delaware-specific compliance validation
    async validateDelawareCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Delaware-specific validations
            const deValidations = this.performDelawareValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && deValidations.isValid,
                score: Math.min(baseValidation.score || 100, deValidations.score || 100),
                issues: [...baseValidation.errors, ...deValidations.errors],
                warnings: [...baseValidation.warnings, ...deValidations.warnings],
                delawareSpecific: deValidations
            };
        } catch (error) {
            console.error('Delaware compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Delaware-specific validations
    performDelawareValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Delaware requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Delaware requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Delaware medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Delaware basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Delaware-specific compliance report
    async generateDelawareReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const deSpecific = this.performDelawareValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (deSpecific.score * 0.2)        // Delaware-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    delawareSpecific: deSpecific
                },
                delawareSpecific: {
                    standardCompliance: deSpecific.standardCompliance || 'unknown',
                    cmeCompliance: deSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateDelawareRecommendations(overallScore, {
                    base: baseReport,
                    delawareSpecific: deSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Delaware compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Delaware-specific recommendations
    generateDelawareRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Delaware compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Delaware compliance score'
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
    module.exports = DelawareComplianceManager;
} else {
    window.DelawareComplianceManager = DelawareComplianceManager;
}
