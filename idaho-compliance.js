// TrustMD Idaho State Compliance Module
// Comprehensive Idaho-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Idaho State Compliance Manager
 * Handles all Idaho-specific regulatory compliance requirements
 */
class IdahoComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'ID', 'Idaho', 0.0);
    }

    // Idaho-specific compliance validation
    async validateIdahoCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Idaho-specific validations
            const idValidations = this.performIdahoValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && idValidations.isValid,
                score: Math.min(baseValidation.score || 100, idValidations.score || 100),
                issues: [...baseValidation.errors, ...idValidations.errors],
                warnings: [...baseValidation.warnings, ...idValidations.warnings],
                idahoSpecific: idValidations
            };
        } catch (error) {
            console.error('Idaho compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Idaho-specific validations
    performIdahoValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Idaho requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Idaho requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Idaho medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for minimal regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Idaho basic compliance recommended');
            score -= 5;
        }

        // Frontier healthcare provisions
        if (!complianceData.ruralHealthCompliance) {
            warnings.push('Idaho frontier healthcare provisions recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Idaho-specific compliance report
    async generateIdahoReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const idSpecific = this.performIdahoValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.9) +      // Base compliance (90%)
                (idSpecific.score * 0.1)        // Idaho-specific (10%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    idahoSpecific: idSpecific
                },
                idahoSpecific: {
                    frontierHealthcareCompliance: idSpecific.frontierHealthcareCompliance || 'unknown',
                    ruralHealthCompliance: idSpecific.ruralHealthCompliance || 'unknown',
                    cmeCompliance: idSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateIdahoRecommendations(overallScore, {
                    base: baseReport,
                    idahoSpecific: idSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Idaho compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Idaho-specific recommendations
    generateIdahoRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Idaho compliance score below acceptable threshold'
            });
        }

        if (!complianceData.idahoSpecific?.frontierHealthcareCompliance) {
            recommendations.push({
                priority: 'medium',
                category: 'frontier',
                action: 'Implement frontier healthcare provisions',
                description: 'Idaho frontier healthcare provisions recommended'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Idaho compliance score'
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
    module.exports = IdahoComplianceManager;
} else {
    window.IdahoComplianceManager = IdahoComplianceManager;
}
