// TrustMD New Hampshire State Compliance Module
// Comprehensive New Hampshire-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * New Hampshire State Compliance Manager
 * Handles all New Hampshire-specific regulatory compliance requirements
 */
class NewHampshireComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'NH', 'New Hampshire', 1.0);
    }

    // New Hampshire-specific compliance validation
    async validateNewHampshireCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // New Hampshire-specific validations
            const nhValidations = this.performNewHampshireValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && nhValidations.isValid,
                score: Math.min(baseValidation.score || 100, nhValidations.score || 100),
                issues: [...baseValidation.errors, ...nhValidations.errors],
                warnings: [...baseValidation.warnings, ...nhValidations.warnings],
                newHampshireSpecific: nhValidations
            };
        } catch (error) {
            console.error('New Hampshire compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform New Hampshire-specific validations
    performNewHampshireValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (New Hampshire requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('New Hampshire requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('New Hampshire medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('New Hampshire basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate New Hampshire-specific compliance report
    async generateNewHampshireReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const nhSpecific = this.performNewHampshireValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (nhSpecific.score * 0.2)        // New Hampshire-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    newHampshireSpecific: nhSpecific
                },
                newHampshireSpecific: {
                    standardCompliance: nhSpecific.standardCompliance || 'unknown',
                    cmeCompliance: nhSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateNewHampshireRecommendations(overallScore, {
                    base: baseReport,
                    newHampshireSpecific: nhSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating New Hampshire compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate New Hampshire-specific recommendations
    generateNewHampshireRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'New Hampshire compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve New Hampshire compliance score'
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
    module.exports = NewHampshireComplianceManager;
} else {
    window.NewHampshireComplianceManager = NewHampshireComplianceManager;
}
