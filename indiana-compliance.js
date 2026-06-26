// TrustMD Indiana State Compliance Module
// Comprehensive Indiana-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Indiana State Compliance Manager
 * Handles all Indiana-specific regulatory compliance requirements
 */
class IndianaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'IN', 'Indiana', 1.0);
    }

    // Indiana-specific compliance validation
    async validateIndianaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Indiana-specific validations
            const inValidations = this.performIndianaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && inValidations.isValid,
                score: Math.min(baseValidation.score || 100, inValidations.score || 100),
                issues: [...baseValidation.errors, ...inValidations.errors],
                warnings: [...baseValidation.warnings, ...inValidations.warnings],
                indianaSpecific: inValidations
            };
        } catch (error) {
            console.error('Indiana compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Indiana-specific validations
    performIndianaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Indiana requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Indiana requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Indiana medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Indiana basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Indiana-specific compliance report
    async generateIndianaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const inSpecific = this.performIndianaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (inSpecific.score * 0.2)        // Indiana-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    indianaSpecific: inSpecific
                },
                indianaSpecific: {
                    standardCompliance: inSpecific.standardCompliance || 'unknown',
                    cmeCompliance: inSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateIndianaRecommendations(overallScore, {
                    base: baseReport,
                    indianaSpecific: inSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Indiana compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Indiana-specific recommendations
    generateIndianaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Indiana compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Indiana compliance score'
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
    module.exports = IndianaComplianceManager;
} else {
    window.IndianaComplianceManager = IndianaComplianceManager;
}
