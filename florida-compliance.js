// TrustMD Florida State Compliance Module
// Comprehensive Florida-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * Florida State Compliance Manager
 * Handles all Florida-specific regulatory compliance requirements
 */
class FloridaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'FL', 'Florida', 1.2);
    }

    // Florida-specific compliance validation
    async validateFloridaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // Florida-specific validations
            const flValidations = this.performFloridaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && flValidations.isValid,
                score: Math.min(baseValidation.score || 100, flValidations.score || 100),
                issues: [...baseValidation.errors, ...flValidations.errors],
                warnings: [...baseValidation.warnings, ...flValidations.warnings],
                floridaSpecific: flValidations
            };
        } catch (error) {
            console.error('Florida compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform Florida-specific validations
    performFloridaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (Florida requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('Florida requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('Florida medical license must be current');
            score -= 25;
        }

        // Enhanced compliance for medium-high regulatory burden
        if (!complianceData.privacyTraining) {
            warnings.push('Florida recommends privacy compliance training');
            score -= 5;
        }

        if (!complianceData.backgroundCheck) {
            errors.push('Florida requires background check');
            score -= 10;
        }

        // Comprehensive healthcare regulations
        if (!complianceData.qualityImprovementProgram) {
            warnings.push('Florida recommends quality improvement program');
            score -= 5;
        }

        // Telemedicine compliance
        if (!complianceData.telemedicineCompliance) {
            warnings.push('Florida telemedicine compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate Florida-specific compliance report
    async generateFloridaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const flSpecific = this.performFloridaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.7) +      // Base compliance (70%)
                (flSpecific.score * 0.3)        // Florida-specific (30%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    floridaSpecific: flSpecific
                },
                floridaSpecific: {
                    comprehensiveHealthcareCompliance: flSpecific.comprehensiveHealthcareCompliance || 'unknown',
                    telemedicineCompliance: flSpecific.telemedicineCompliance || 'unknown',
                    cmeCompliance: flSpecific.cmeCompliance || 'unknown',
                    qualityImprovementCompliance: flSpecific.qualityImprovementCompliance || 'unknown'
                },
                recommendations: this.generateFloridaRecommendations(overallScore, {
                    base: baseReport,
                    floridaSpecific: flSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating Florida compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate Florida-specific recommendations
    generateFloridaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'Florida compliance score below acceptable threshold'
            });
        }

        if (!complianceData.floridaSpecific?.qualityImprovementProgram) {
            recommendations.push({
                priority: 'medium',
                category: 'quality',
                action: 'Implement quality improvement program',
                description: 'Florida comprehensive healthcare regulations recommend quality improvement programs'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve Florida compliance score'
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
    module.exports = FloridaComplianceManager;
} else {
    window.FloridaComplianceManager = FloridaComplianceManager;
}
