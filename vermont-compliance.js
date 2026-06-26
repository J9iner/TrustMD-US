// TrustMD Vermont State Compliance Module
// Comprehensive Vermont-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Vermont State Compliance Manager
 * Handles all Vermont-specific regulatory compliance requirements
 */
class VermontComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'VT', 'Vermont', 1.0);
    }

    // Vermont-specific compliance validation
    async validateVermontCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Vermont-specific validations
            const vtValidations = this.performVermontValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && vtValidations.isValid,
                score: Math.min(baseValidation.score || 100, vtValidations.score || 100),
                issues: [...baseValidation.errors, ...vtValidations.errors],
                warnings: [...baseValidation.warnings, ...vtValidations.warnings],
                vermontSpecific: vtValidations
            };
        } catch (error) {
            console.error('Vermont compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Vermont-specific validations
    performVermontValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Vermont requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Vermont requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Vermont medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Vermont basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Vermont-specific compliance report
    async generateVermontReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const vtSpecific = this.performVermontValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (vtSpecific.score * 0.2)        // Vermont-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    vermontSpecific: vtSpecific
                },
                vermontSpecific: {
                    standardCompliance: vtSpecific.standardCompliance || 'unknown',
                    cmeCompliance: vtSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateVermontRecommendations(overallScore, {
                    base: baseReport,
                    vermontSpecific: vtSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Vermont compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Vermont-specific recommendations
    generateVermontRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Vermont compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Vermont compliance score'
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
    module.exports = VermontComplianceManager;
} else {
    window.VermontComplianceManager = VermontComplianceManager;
}
