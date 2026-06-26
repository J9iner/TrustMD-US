// TrustMD Texas State Compliance Module
// Comprehensive Texas-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Texas State Compliance Manager
 * Handles all Texas-specific regulatory compliance requirements
 */
class TexasComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'TX', 'Texas', 1.2);
    }

    // Texas-specific compliance validation
    async validateTexasCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Texas-specific validations
            const txValidations = this.performTexasValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && txValidations.isValid,
                score: Math.min(baseValidation.score || 100, txValidations.score || 100),
                issues: [...baseValidation.errors, ...txValidations.errors],
                warnings: [...baseValidation.warnings, ...txValidations.warnings],
                texasSpecific: txValidations
            };
        } catch (error) {
            console.error('Texas compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Texas-specific validations
    performTexasValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Texas requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Texas requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Texas medical license must be current');
            score -= 25;
        }

        // Enhanced compliance for medium-high regulatory burden
        if (!complianceData.privacyTraining) {
            warnings.push('Texas recommends privacy compliance training');
            score -= 5;
        }

        if (!complianceData.backgroundCheck) {
            errors.push('Texas requires background check');
            score -= 10;
        }

        // Medical Privacy Act compliance
        if (!complianceData.medicalPrivacyActCompliance) {
            errors.push('Texas Medical Privacy Act compliance required');
            score -= 20;
        }

        // Frontier medicine considerations
        if (!complianceData.ruralHealthCompliance) {
            warnings.push('Texas frontier medicine provisions recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Texas-specific compliance report
    async generateTexasReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const txSpecific = this.performTexasValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (txSpecific.score * 0.2)        // Texas-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    texasSpecific: txSpecific
                },
                texasSpecific: {
                    medicalPrivacyActCompliance: txSpecific.medicalPrivacyActCompliance || 'unknown',
                    frontierMedicineCompliance: txSpecific.frontierMedicineCompliance || 'unknown',
                    ruralHealthCompliance: txSpecific.ruralHealthCompliance || 'unknown',
                    cmeCompliance: txSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateTexasRecommendations(overallScore, {
                    base: baseReport,
                    texasSpecific: txSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Texas compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Texas-specific recommendations
    generateTexasRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Texas compliance score below acceptable threshold'
            });
        }

        if (!complianceData.texasSpecific?.medicalPrivacyActCompliance) {
            recommendations.push({
                priority: 'high',
                category: 'privacy',
                action: 'Implement Medical Privacy Act compliance policies',
                description: 'Texas Medical Privacy Act compliance required'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Texas compliance score'
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
    module.exports = TexasComplianceManager;
} else {
    window.TexasComplianceManager = TexasComplianceManager;
}
