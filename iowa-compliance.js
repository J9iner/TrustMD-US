// TrustMD Iowa State Compliance Module
// Comprehensive Iowa-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Iowa State Compliance Manager
 * Handles all Iowa-specific regulatory compliance requirements
 */
class IowaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'IA', 'Iowa', 1.0);
    }

    // Iowa-specific compliance validation
    async validateIowaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Iowa-specific validations
            const iaValidations = this.performIowaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && iaValidations.isValid,
                score: Math.min(baseValidation.score || 100, iaValidations.score || 100),
                issues: [...baseValidation.errors, ...iaValidations.errors],
                warnings: [...baseValidation.warnings, ...iaValidations.warnings],
                iowaSpecific: iaValidations
            };
        } catch (error) {
            console.error('Iowa compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Iowa-specific validations
    performIowaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Iowa requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Iowa requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Iowa medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('Iowa basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Iowa-specific compliance report
    async generateIowaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const iaSpecific = this.performIowaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (iaSpecific.score * 0.2)        // Iowa-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    iowaSpecific: iaSpecific
                },
                iowaSpecific: {
                    standardCompliance: iaSpecific.standardCompliance || 'unknown',
                    cmeCompliance: iaSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateIowaRecommendations(overallScore, {
                    base: baseReport,
                    iowaSpecific: iaSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Iowa compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Iowa-specific recommendations
    generateIowaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Iowa compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Iowa compliance score'
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
    module.exports = IowaComplianceManager;
} else {
    window.IowaComplianceManager = IowaComplianceManager;
}
