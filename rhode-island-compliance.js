// TrustMD Rhode Island State Compliance Module
// Comprehensive Rhode Island-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Rhode Island State Compliance Manager
 * Handles all Rhode Island-specific regulatory compliance requirements
 */
class RhodeIslandComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'RI', 'Rhode Island', 1.0);
    }

    // Rhode Island-specific compliance validation
    async validateRhodeIslandCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Rhode Island-specific validations
            const riValidations = this.performRhodeIslandValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && riValidations.isValid,
                score: Math.min(baseValidation.score || 100, riValidations.score || 100),
                issues: [...baseValidation.errors, ...riValidations.errors],
                warnings: [...baseValidation.warnings, ...riValidations.warnings],
                rhodeIslandSpecific: riValidations
            };
        } catch (error) {
            console.error('Rhode Island compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Rhode Island-specific validations
    performRhodeIslandValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Rhode Island requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Rhode Island requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Rhode Island medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Rhode Island basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Rhode Island-specific compliance report
    async generateRhodeIslandReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const riSpecific = this.performRhodeIslandValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (riSpecific.score * 0.2)        // Rhode Island-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    rhodeIslandSpecific: riSpecific
                },
                rhodeIslandSpecific: {
                    standardCompliance: riSpecific.standardCompliance || 'unknown',
                    cmeCompliance: riSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateRhodeIslandRecommendations(overallScore, {
                    base: baseReport,
                    rhodeIslandSpecific: riSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Rhode Island compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Rhode Island-specific recommendations
    generateRhodeIslandRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Rhode Island compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Rhode Island compliance score'
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
    module.exports = RhodeIslandComplianceManager;
} else {
    window.RhodeIslandComplianceManager = RhodeIslandComplianceManager;
}
