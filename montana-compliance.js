// TrustMD Montana State Compliance Module
// Comprehensive Montana-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Montana State Compliance Manager
 * Handles all Montana-specific regulatory compliance requirements
 */
class MontanaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'MT', 'Montana', 0.0);
    }

    // Montana-specific compliance validation
    async validateMontanaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Montana-specific validations
            const mtValidations = this.performMontanaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && mtValidations.isValid,
                score: Math.min(baseValidation.score || 100, mtValidations.score || 100),
                issues: [...baseValidation.errors, ...mtValidations.errors],
                warnings: [...baseValidation.warnings, ...mtValidations.warnings],
                montanaSpecific: mtValidations
            };
        } catch (error) {
            console.error('Montana compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Montana-specific validations
    performMontanaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Montana requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Montana requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Montana medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for minimal regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Montana basic compliance recommended');
            score -= 5;
        }

        // Frontier healthcare provisions
        if (!complianceData.ruralHealthCompliance) {
            warnings.push('Montana frontier healthcare provisions recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Montana-specific compliance report
    async generateMontanaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const mtSpecific = this.performMontanaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.9) +      // Base compliance (90%)
                (mtSpecific.score * 0.1)        // Montana-specific (10%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    montanaSpecific: mtSpecific
                },
                montanaSpecific: {
                    frontierHealthcareCompliance: mtSpecific.frontierHealthcareCompliance || 'unknown',
                    ruralHealthCompliance: mtSpecific.ruralHealthCompliance || 'unknown',
                    cmeCompliance: mtSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateMontanaRecommendations(overallScore, {
                    base: baseReport,
                    montanaSpecific: mtSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Montana compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Montana-specific recommendations
    generateMontanaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Montana compliance score below acceptable threshold'
            });
        }

        if (!complianceData.montanaSpecific?.frontierHealthcareCompliance) {
            recommendations.push({
                priority: 'medium',
                category: 'frontier',
                action: 'Implement frontier healthcare provisions',
                description: 'Montana frontier healthcare provisions recommended'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Montana compliance score'
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
    module.exports = MontanaComplianceManager;
} else {
    window.MontanaComplianceManager = MontanaComplianceManager;
}
