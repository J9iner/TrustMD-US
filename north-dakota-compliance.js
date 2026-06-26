// TrustMD North Dakota State Compliance Module
// Comprehensive North Dakota-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * North Dakota State Compliance Manager
 * Handles all North Dakota-specific regulatory compliance requirements
 */
class NorthDakotaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'ND', 'North Dakota', 0.0);
    }

    // North Dakota-specific compliance validation
    async validateNorthDakotaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // North Dakota-specific validations
            const ndValidations = this.performNorthDakotaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && ndValidations.isValid,
                score: Math.min(baseValidation.score || 100, ndValidations.score || 100),
                issues: [...baseValidation.errors, ...ndValidations.errors],
                warnings: [...baseValidation.warnings, ...ndValidations.warnings],
                northDakotaSpecific: ndValidations
            };
        } catch (error) {
            console.error('North Dakota compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform North Dakota-specific validations
    performNorthDakotaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (North Dakota requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('North Dakota requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('North Dakota medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for minimal regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('North Dakota basic compliance recommended');
            score -= 5;
        }

        // Frontier healthcare provisions
        if (!complianceData.ruralHealthCompliance) {
            warnings.push('North Dakota frontier healthcare provisions recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate North Dakota-specific compliance report
    async generateNorthDakotaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const ndSpecific = this.performNorthDakotaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.9) +      // Base compliance (90%)
                (ndSpecific.score * 0.1)        // North Dakota-specific (10%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    northDakotaSpecific: ndSpecific
                },
                northDakotaSpecific: {
                    frontierHealthcareCompliance: ndSpecific.frontierHealthcareCompliance || 'unknown',
                    ruralHealthCompliance: ndSpecific.ruralHealthCompliance || 'unknown',
                    cmeCompliance: ndSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateNorthDakotaRecommendations(overallScore, {
                    base: baseReport,
                    northDakotaSpecific: ndSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating North Dakota compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate North Dakota-specific recommendations
    generateNorthDakotaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'North Dakota compliance score below acceptable threshold'
            });
        }

        if (!complianceData.northDakotaSpecific?.frontierHealthcareCompliance) {
            recommendations.push({
                priority: 'medium',
                category: 'frontier',
                action: 'Implement frontier healthcare provisions',
                description: 'North Dakota frontier healthcare provisions recommended'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve North Dakota compliance score'
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
    module.exports = NorthDakotaComplianceManager;
} else {
    window.NorthDakotaComplianceManager = NorthDakotaComplianceManager;
}
