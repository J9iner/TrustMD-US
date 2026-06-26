// TrustMD Connecticut State Compliance Module
// Comprehensive Connecticut-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Connecticut State Compliance Manager
 * Handles all Connecticut-specific regulatory compliance requirements
 */
class ConnecticutComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'CT', 'Connecticut', 1.0);
    }

    // Connecticut-specific compliance validation
    async validateConnecticutCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Connecticut-specific validations
            const ctValidations = this.performConnecticutValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && ctValidations.isValid,
                score: Math.min(baseValidation.score || 100, ctValidations.score || 100),
                issues: [...baseValidation.errors, ...ctValidations.errors],
                warnings: [...baseValidation.warnings, ...ctValidations.warnings],
                connecticutSpecific: ctValidations
            };
        } catch (error) {
            console.error('Connecticut compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Connecticut-specific validations
    performConnecticutValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Connecticut requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Connecticut requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Connecticut medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Connecticut basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Connecticut-specific compliance report
    async generateConnecticutReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const ctSpecific = this.performConnecticutValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (ctSpecific.score * 0.2)        // Connecticut-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    connecticutSpecific: ctSpecific
                },
                connecticutSpecific: {
                    standardCompliance: ctSpecific.standardCompliance || 'unknown',
                    cmeCompliance: ctSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateConnecticutRecommendations(overallScore, {
                    base: baseReport,
                    connecticutSpecific: ctSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Connecticut compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Connecticut-specific recommendations
    generateConnecticutRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Connecticut compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Connecticut compliance score'
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
    module.exports = ConnecticutComplianceManager;
} else {
    window.ConnecticutComplianceManager = ConnecticutComplianceManager;
}
