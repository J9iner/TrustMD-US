// TrustMD Missouri State Compliance Module
// Comprehensive Missouri-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Missouri State Compliance Manager
 * Handles all Missouri-specific regulatory compliance requirements
 */
class MissouriComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'MO', 'Missouri', 1.0);
    }

    // Missouri-specific compliance validation
    async validateMissouriCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Missouri-specific validations
            const moValidations = this.performMissouriValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && moValidations.isValid,
                score: Math.min(baseValidation.score || 100, moValidations.score || 100),
                issues: [...baseValidation.errors, ...moValidations.errors],
                warnings: [...baseValidation.warnings, ...moValidations.warnings],
                missouriSpecific: moValidations
            };
        } catch (error) {
            console.error('Missouri compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Missouri-specific validations
    performMissouriValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Missouri requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Missouri requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Missouri medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Missouri basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Missouri-specific compliance report
    async generateMissouriReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const moSpecific = this.performMissouriValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (moSpecific.score * 0.2)        // Missouri-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    missouriSpecific: moSpecific
                },
                missouriSpecific: {
                    standardCompliance: moSpecific.standardCompliance || 'unknown',
                    cmeCompliance: moSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateMissouriRecommendations(overallScore, {
                    base: baseReport,
                    missouriSpecific: moSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Missouri compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Missouri-specific recommendations
    generateMissouriRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Missouri compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Missouri compliance score'
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
    module.exports = MissouriComplianceManager;
} else {
    window.MissouriComplianceManager = MissouriComplianceManager;
}
