// TrustMD Colorado State Compliance Module
// Comprehensive Colorado-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Colorado State Compliance Manager
 * Handles all Colorado-specific regulatory compliance requirements
 */
class ColoradoComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'CO', 'Colorado', 1.0);
    }

    // Colorado-specific compliance validation
    async validateColoradoCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Colorado-specific validations
            const coValidations = this.performColoradoValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && coValidations.isValid,
                score: Math.min(baseValidation.score || 100, coValidations.score || 100),
                issues: [...baseValidation.errors, ...coValidations.errors],
                warnings: [...baseValidation.warnings, ...coValidations.warnings],
                coloradoSpecific: coValidations
            };
        } catch (error) {
            console.error('Colorado compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Colorado-specific validations
    performColoradoValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Colorado requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Colorado requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Colorado medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Colorado basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Colorado-specific compliance report
    async generateColoradoReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const coSpecific = this.performColoradoValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (coSpecific.score * 0.2)        // Colorado-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    coloradoSpecific: coSpecific
                },
                coloradoSpecific: {
                    standardCompliance: coSpecific.standardCompliance || 'unknown',
                    cmeCompliance: coSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateColoradoRecommendations(overallScore, {
                    base: baseReport,
                    coloradoSpecific: coSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Colorado compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Colorado-specific recommendations
    generateColoradoRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Colorado compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Colorado compliance score'
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
    module.exports = ColoradoComplianceManager;
} else {
    window.ColoradoComplianceManager = ColoradoComplianceManager;
}
