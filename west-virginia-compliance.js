// TrustMD West Virginia State Compliance Module
// Comprehensive West Virginia-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * West Virginia State Compliance Manager
 * Handles all West Virginia-specific regulatory compliance requirements
 */
class WestVirginiaComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, 'WV', 'West Virginia', 1.0);
    }

    // West Virginia-specific compliance validation
    async validateWestVirginiaCompliance(complianceData) {
        try {
            const baseValidation = this.validateComplianceData(complianceData);
            if (!baseValidation.isValid) {
                return baseValidation;
            }

            // West Virginia-specific validations
            const wvValidations = this.performWestVirginiaValidations(complianceData);
            
            return {
                compliant: baseValidation.isValid && wvValidations.isValid,
                score: Math.min(baseValidation.score || 100, wvValidations.score || 100),
                issues: [...baseValidation.errors, ...wvValidations.errors],
                warnings: [...baseValidation.warnings, ...wvValidations.warnings],
                westVirginiaSpecific: wvValidations
            };
        } catch (error) {
            console.error('West Virginia compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    // Perform West Virginia-specific validations
    performWestVirginiaValidations(complianceData) {
        const errors = [];
        const warnings = [];
        let score = 100;

        // CME hours validation (West Virginia requires 50 hours)
        if (complianceData.cmeHours < 50) {
            errors.push('West Virginia requires minimum 50 CME hours biennially');
            score -= 15;
        }

        // License validation
        if (!complianceData.licenseCurrent) {
            errors.push('West Virginia medical license must be current');
            score -= 25;
        }

        // Basic compliance checks for standard regulatory burden
        if (!complianceData.basicCompliance) {
            warnings.push('West Virginia basic compliance recommended');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            score: Math.max(0, score),
            errors,
            warnings
        };
    }

    // Generate West Virginia-specific compliance report
    async generateWestVirginiaReport() {
        try {
            const baseReport = await this.validateCompliance({});
            const wvSpecific = this.performWestVirginiaValidations({});

            const overallScore = Math.round(
                (baseReport.score * 0.8) +      // Base compliance (80%)
                (wvSpecific.score * 0.2)        // West Virginia-specific (20%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    base: baseReport,
                    westVirginiaSpecific: wvSpecific
                },
                westVirginiaSpecific: {
                    standardCompliance: wvSpecific.standardCompliance || 'unknown',
                    cmeCompliance: wvSpecific.cmeCompliance || 'unknown'
                },
                recommendations: this.generateWestVirginiaRecommendations(overallScore, {
                    base: baseReport,
                    westVirginiaSpecific: wvSpecific
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating West Virginia compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Generate West Virginia-specific recommendations
    generateWestVirginiaRecommendations(score, complianceData) {
        const recommendations = [];

        if (score < 80) {
            recommendations.push({
                priority: 'critical',
                category: 'compliance',
                action: 'Address critical compliance issues immediately',
                description: 'West Virginia compliance score below acceptable threshold'
            });
        }

        if (score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'improvement',
                action: 'Enhance compliance practices',
                description: 'Opportunity to improve West Virginia compliance score'
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
    module.exports = WestVirginiaComplianceManager;
} else {
    window.WestVirginiaComplianceManager = WestVirginiaComplianceManager;
}
