// TrustMD Wyoming State Compliance Module
// Comprehensive Wyoming-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Wyoming State Compliance Manager
 * Handles all Wyoming-specific regulatory compliance requirements
 */
class WyomingComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'WY', 'Wyoming', 0.0);
    }

    // Wyoming-specific compliance validation
    async validateWyomingCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Wyoming-specific validations
            const wyValidations = this.performWyomingValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && wyValidations.isValid,
                score: Math.min(baseValidation.score || 100, wyValidations.score || 100),
                issues: [...baseValidation.errors, ...wyValidations.errors],
                warnings: [...baseValidation.warnings, ...wyValidations.warnings],
                wyomingSpecific: wyValidations
            };
        } catch (error) {
            console.error('Wyoming compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Wyoming-specific validations
    performWyomingValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Wyoming requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Wyoming requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Wyoming medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for minimal regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Wyoming basic compliance recommended');
            score -= 5;
        }

        // Frontier healthcare provisions
        if (!complianceData.ruralHealthCompliance) {
            warnings.push('Wyoming frontier healthcare provisions recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Wyoming-specific compliance report
    async generateWyomingReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const wySpecific = this.performWyomingValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.9) +      // Base compliance (90%)
                (wySpecific.score * 0.1)        // Wyoming-specific (10%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    wyomingSpecific: wySpecific
                },
                wyomingSpecific: {
                    frontierHealthcareCompliance: wySpecific.frontierHealthcareCompliance || 'unknown',
                    ruralHealthCompliance: wySpecific.ruralHealthCompliance || 'unknown',
                    cmeCompliance: wySpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateWyomingRecommendations(overallScore, {
                    base: baseReport,
                    wyomingSpecific: wySpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Wyoming compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Wyoming-specific recommendations
    generateWyomingRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Wyoming compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Wyoming compliance score'
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
    module.exports = WyomingComplianceManager;
} else {
    window.WyomingComplianceManager = WyomingComplianceManager;
}
