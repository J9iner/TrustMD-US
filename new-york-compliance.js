// TrustMD New York State Compliance Module
// Comprehensive New York-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * New York State Compliance Manager
 * Handles all New York-specific regulatory compliance requirements
 */
class NewYorkComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'NY', 'New York', 1.3);
    }

    // New York-specific compliance validation
    async validateNewYorkCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // New York-specific validations
            const nyValidations = this.performNewYorkValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && nyValidations.isValid,
                score: Math.min(baseValidation.score || 100, nyValidations.score || 100),
                issues: [...baseValidation.errors, ...nyValidations.errors],
                warnings: [...baseValidation.warnings, ...nyValidations.warnings],
                newYorkSpecific: nyValidations
            };
        } catch (error) {
            console.error('New York compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform New York-specific validations
    performNewYorkValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (New York requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('New York requires minimum 50 CME hours triennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('New York medical license must be current');
            score -= 25;
        }

        // Enhanced compliance for high regulatory burden
        if (!complianceData.privacyTraining) {
            warnings.push('New York recommends privacy compliance training');
            score -= 5;
        }

        if (!complianceData.backgroundCheck) {
            errors.push('New York requires background check');
            score -= 10;
        }

        // SHIELD Act compliance
        if (!complianceData.shieldActCompliance) {
            errors.push('New York SHIELD Act compliance required');
            score -= 20;
        }

        // Infection control training
        if (!complianceData.infectionControlTraining) {
            warnings.push('New York requires infection control training');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate New York-specific compliance report
    async generateNewYorkReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const nySpecific = this.performNewYorkValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.7) +      // Base compliance (70%)
                (nySpecific.score * 0.3)        // New York-specific (30%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    newYorkSpecific: nySpecific
                },
                newYorkSpecific: {
                    shieldActCompliance: nySpecific.shieldActCompliance || 'unknown',
                    infectionControlCompliance: nySpecific.infectionControlCompliance || 'unknown',
                    pdmpCompliance: nySpecific.pdmpCompliance || 'unknown',
                    cmeCompliance: nySpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateNewYorkRecommendations(overallScore, {
                    base: baseReport,
                    newYorkSpecific: nySpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating New York compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate New York-specific recommendations
    generateNewYorkRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'New York compliance score below acceptable threshold'
            });
        }

        if (!complianceData.newYorkSpecific?.shieldActCompliance) {
            recommendations.push({
                priority: 'high',
                category: 'privacy',
                action: 'Implement SHIELD Act compliance policies',
                description: 'New York SHIELD Act compliance required'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve New York compliance score'
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
    module.exports = NewYorkComplianceManager;
} else {
    window.NewYorkComplianceManager = NewYorkComplianceManager;
}
