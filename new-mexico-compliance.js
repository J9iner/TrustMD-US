// TrustMD New Mexico State Compliance Module
// Comprehensive New Mexico-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * New Mexico State Compliance Manager
 * Handles all New Mexico-specific regulatory compliance requirements
 */
class NewMexicoComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'NM', 'New Mexico', 1.0);
    }

    // New Mexico-specific compliance validation
    async validateNewMexicoCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // New Mexico-specific validations
            const nmValidations = this.performNewMexicoValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && nmValidations.isValid,
                score: Math.min(baseValidation.score || 100, nmValidations.score || 100),
                issues: [...baseValidation.errors, ...nmValidations.errors],
                warnings: [...baseValidation.warnings, ...nmValidations.warnings],
                newMexicoSpecific: nmValidations
            };
        } catch (error) {
            console.error('New Mexico compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform New Mexico-specific validations
    performNewMexicoValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (New Mexico requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('New Mexico requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('New Mexico medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('New Mexico basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate New Mexico-specific compliance report
    async generateNewMexicoReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const nmSpecific = this.performNewMexicoValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (nmSpecific.score * 0.2)        // New Mexico-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    newMexicoSpecific: nmSpecific
                },
                newMexicoSpecific: {
                    standardCompliance: nmSpecific.standardCompliance || 'unknown',
                    cmeCompliance: nmSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateNewMexicoRecommendations(overallScore, {
                    base: baseReport,
                    newMexicoSpecific: nmSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating New Mexico compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate New Mexico-specific recommendations
    generateNewMexicoRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'New Mexico compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve New Mexico compliance score'
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
    module.exports = NewMexicoComplianceManager;
} else {
    window.NewMexicoComplianceManager = NewMexicoComplianceManager;
}
