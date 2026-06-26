// TrustMD Utah State Compliance Module
// Comprehensive Utah-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Utah State Compliance Manager
 * Handles all Utah-specific regulatory compliance requirements
 */
class UtahComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'UT', 'Utah', 1.0);
    }

    // Utah-specific compliance validation
    async validateUtahCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Utah-specific validations
            const utValidations = this.performUtahValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && utValidations.isValid,
                score: Math.min(baseValidation.score || 100, utValidations.score || 100),
                issues: [...baseValidation.errors, ...utValidations.errors],
                warnings: [...baseValidation.warnings, ...utValidations.warnings],
                utahSpecific: utValidations
            };
        } catch (error) {
            console.error('Utah compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Utah-specific validations
    performUtahValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Utah requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Utah requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Utah medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Utah basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Utah-specific compliance report
    async generateUtahReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const utSpecific = this.performUtahValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (utSpecific.score * 0.2)        // Utah-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    utahSpecific: utSpecific
                },
                utahSpecific: {
                    standardCompliance: utSpecific.standardCompliance || 'unknown',
                    cmeCompliance: utSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateUtahRecommendations(overallScore, {
                    base: baseReport,
                    utahSpecific: utSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Utah compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Utah-specific recommendations
    generateUtahRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Utah compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Utah compliance score'
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
    module.exports = UtahComplianceManager;
} else {
    window.UtahComplianceManager = UtahComplianceManager;
}
