// TrustMD Mississippi State Compliance Module
// Comprehensive Mississippi-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Mississippi State Compliance Manager
 * Handles all Mississippi-specific regulatory compliance requirements
 */
class MississippiComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'MS', 'Mississippi', 1.0);
    }

    // Mississippi-specific compliance validation
    async validateMississippiCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Mississippi-specific validations
            const msValidations = this.performMississippiValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && msValidations.isValid,
                score: Math.min(baseValidation.score || 100, msValidations.score || 100),
                issues: [...baseValidation.errors, ...msValidations.errors],
                warnings: [...baseValidation.warnings, ...msValidations.warnings],
                mississippiSpecific: msValidations
            };
        } catch (error) {
            console.error('Mississippi compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Mississippi-specific validations
    performMississippiValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Mississippi requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Mississippi requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Mississippi medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Mississippi basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Mississippi-specific compliance report
    async generateMississippiReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const msSpecific = this.performMississippiValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (msSpecific.score * 0.2)        // Mississippi-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    mississippiSpecific: msSpecific
                },
                mississippiSpecific: {
                    standardCompliance: msSpecific.standardCompliance || 'unknown',
                    cmeCompliance: msSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateMississippiRecommendations(overallScore, {
                    base: baseReport,
                    mississippiSpecific: msSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Mississippi compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Mississippi-specific recommendations
    generateMississippiRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Mississippi compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Mississippi compliance score'
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
    module.exports = MississippiComplianceManager;
} else {
    window.MississippiComplianceManager = MississippiComplianceManager;
}
