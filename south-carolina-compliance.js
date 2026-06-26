// TrustMD South Carolina State Compliance Module
// Comprehensive South Carolina-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * South Carolina State Compliance Manager
 * Handles all South Carolina-specific regulatory compliance requirements
 */
class SouthCarolinaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'SC', 'South Carolina', 1.0);
    }

    // South Carolina-specific compliance validation
    async validateSouthCarolinaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // South Carolina-specific validations
            const scValidations = this.performSouthCarolinaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && scValidations.isValid,
                score: Math.min(baseValidation.score || 100, scValidations.score || 100),
                issues: [...baseValidation.errors, ...scValidations.errors],
                warnings: [...baseValidation.warnings, ...scValidations.warnings],
                southCarolinaSpecific: scValidations
            };
        } catch (error) {
            console.error('South Carolina compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform South Carolina-specific validations
    performSouthCarolinaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (South Carolina requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('South Carolina requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('South Carolina medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('South Carolina basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate South Carolina-specific compliance report
    async generateSouthCarolinaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const scSpecific = this.performSouthCarolinaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (scSpecific.score * 0.2)        // South Carolina-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    southCarolinaSpecific: scSpecific
                },
                southCarolinaSpecific: {
                    standardCompliance: scSpecific.standardCompliance || 'unknown',
                    cmeCompliance: scSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateSouthCarolinaRecommendations(overallScore, {
                    base: baseReport,
                    southCarolinaSpecific: scSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating South Carolina compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate South Carolina-specific recommendations
    generateSouthCarolinaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'South Carolina compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve South Carolina compliance score'
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
    module.exports = SouthCarolinaComplianceManager;
} else {
    window.SouthCarolinaComplianceManager = SouthCarolinaComplianceManager;
}
