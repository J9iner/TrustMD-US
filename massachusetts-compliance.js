// TrustMD Massachusetts State Compliance Module
// Comprehensive Massachusetts-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Massachusetts State Compliance Manager
 * Handles all Massachusetts-specific regulatory compliance requirements
 */
class MassachusettsComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'MA', 'Massachusetts', 1.3);
    }

    // Massachusetts-specific compliance validation
    async validateMassachusettsCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Massachusetts-specific validations
            const maValidations = this.performMassachusettsValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && maValidations.isValid,
                score: Math.min(baseValidation.score || 100, maValidations.score || 100),
                issues: [...baseValidation.errors, ...maValidations.errors],
                warnings: [...baseValidation.warnings, ...maValidations.warnings],
                massachusettsSpecific: maValidations
            };
        } catch (error) {
            console.error('Massachusetts compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Massachusetts-specific validations
    performMassachusettsValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Massachusetts requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Massachusetts requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Massachusetts medical license must be current');
            score -= 25;
        }

        // Enhanced compliance for high regulatory burden
        if (!complianceData.privacyTraining) {
            warnings.push('Massachusetts recommends privacy compliance training');
            score -= 5;
        }

        if (!complianceData.backgroundCheck) {
            errors.push('Massachusetts requires background check');
            score -= 10;
        }

        // Comprehensive privacy laws compliance
        if (!complianceData.comprehensivePrivacyCompliance) {
            errors.push('Massachusetts comprehensive privacy laws compliance required');
            score -= 20;
        }

        // Privacy officer designation
        if (!complianceData.privacyOfficerDesignated) {
            warnings.push('Massachusetts recommends privacy officer designation');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Massachusetts-specific compliance report
    async generateMassachusettsReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const maSpecific = this.performMassachusettsValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.7) +      // Base compliance (70%)
                (maSpecific.score * 0.3)        // Massachusetts-specific (30%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    massachusettsSpecific: maSpecific
                },
                massachusettsSpecific: {
                    comprehensivePrivacyCompliance: maSpecific.comprehensivePrivacyCompliance || 'unknown',
                    privacyOfficerDesignated: maSpecific.privacyOfficerDesignated || 'unknown',
                    cmeCompliance: maSpecific.cmeCompliance || 'unknown',
                    dataProtectionCompliance: maSpecific.dataProtectionCompliance || 'unknown'
                },
                recommendations: this.generateMassachusettsRecommendations(overallScore, {
                    base: baseReport,
                    massachusettsSpecific: maSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Massachusetts compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Massachusetts-specific recommendations
    generateMassachusettsRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Massachusetts compliance score below acceptable threshold'
            });
        }

        if (!complianceData.massachusettsSpecific?.comprehensivePrivacyCompliance) {
            recommendations.push({
                priority: 'high',
                category: 'privacy',
                action: 'Implement comprehensive privacy compliance',
                description: 'Massachusetts comprehensive privacy laws compliance required'
            });
        }

        if (!complianceData.massachusettsSpecific?.privacyOfficerDesignated) {
            recommendations.push({
                priority: 'medium',
                category: 'privacy',
                action: 'Designate privacy officer',
                description: 'Massachusetts recommends privacy officer designation'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Massachusetts compliance score'
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
    module.exports = MassachusettsComplianceManager;
} else {
    window.MassachusettsComplianceManager = MassachusettsComplianceManager;
}
