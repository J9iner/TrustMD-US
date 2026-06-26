// TrustMD South Dakota State Compliance Module
// Comprehensive South Dakota-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * South Dakota State Compliance Manager
 * Handles all South Dakota-specific regulatory compliance requirements
 */
class SouthDakotaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'SD', 'South Dakota', 0.0);
    }

    // South Dakota-specific compliance validation
    async validateSouthDakotaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // South Dakota-specific validations
            const sdValidations = this.performSouthDakotaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && sdValidations.isValid,
                score: Math.min(baseValidation.score || 100, sdValidations.score || 100),
                issues: [...baseValidation.errors, ...sdValidations.errors],
                warnings: [...baseValidation.warnings, ...sdValidations.warnings],
                southDakotaSpecific: sdValidations
            };
        } catch (error) {
            console.error('South Dakota compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform South Dakota-specific validations
    performSouthDakotaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (South Dakota requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('South Dakota requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('South Dakota medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for minimal regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('South Dakota basic compliance recommended');
            score -= 5;
        }

        // Frontier healthcare provisions
        if (!complianceData.ruralHealthCompliance) {
            warnings.push('South Dakota frontier healthcare provisions recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate South Dakota-specific compliance report
    async generateSouthDakotaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const sdSpecific = this.performSouthDakotaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.9) +      // Base compliance (90%)
                (sdSpecific.score * 0.1)        // South Dakota-specific (10%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    southDakotaSpecific: sdSpecific
                },
                southDakotaSpecific: {
                    frontierHealthcareCompliance: sdSpecific.frontierHealthcareCompliance || 'unknown',
                    ruralHealthCompliance: sdSpecific.ruralHealthCompliance || 'unknown',
                    cmeCompliance: sdSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateSouthDakotaRecommendations(overallScore, {
                    base: baseReport,
                    southDakotaSpecific: sdSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating South Dakota compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate South Dakota-specific recommendations
    generateSouthDakotaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'South Dakota compliance score below acceptable threshold'
            });
        }

        if (!complianceData.southDakotaSpecific?.frontierHealthcareCompliance) {
            recommendations.push({
                priority: 'medium',
                category: 'frontier',
                action: 'Implement frontier healthcare provisions',
                description: 'South Dakota frontier healthcare provisions recommended'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve South Dakota compliance score'
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
    module.exports = SouthDakotaComplianceManager;
} else {
    window.SouthDakotaComplianceManager = SouthDakotaComplianceManager;
}
