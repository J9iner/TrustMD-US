// TrustMD Risk Engine - Risk Calculator Module
// Handles core risk calculation logic and scoring

class RiskCalculator {
    constructor(riskFactors, severityMultipliers, industryMultipliers) {
        this.riskFactors = riskFactors;
        this.severityMultipliers = severityMultipliers;
        this.industryMultipliers = industryMultipliers;
    }
    
    // Calculate risk score for a specific category
    calculateCategoryRisk(category, categoryData) {
        try {
            if (!this.riskFactors[category]) {
                throw new Error(`Unknown risk category: ${category}`);
            }
            
            let categoryScore = 0;
            let categoryWeight = 0;
            const issues = [];
            
            for (const [factor, factorConfig] of Object.entries(this.riskFactors[category])) {
                const factorValue = categoryData[factor] || 0;
                const weight = factorConfig.weight;
                const severity = factorConfig.severity;
                
                // Calculate factor score
                const factorScore = factorValue * weight * this.severityMultipliers[severity];
                categoryScore += factorScore;
                categoryWeight += weight;
                
                // Track issues for high-risk factors
                if (factorValue > 0.7 && (severity === 'high' || severity === 'critical')) {
                    issues.push({
                        factor,
                        severity,
                        value: factorValue,
                        score: factorScore,
                        recommendation: this.getFactorRecommendation(factor, severity)
                    });
                }
            }
            
            return {
                category,
                score: categoryScore,
                weight: categoryWeight,
                issues,
                normalizedScore: categoryWeight > 0 ? categoryScore / categoryWeight : 0
            };
        } catch (error) {
            console.error(`Error calculating risk for category ${category}:`, error);
            return {
                category,
                score: 0,
                weight: 0,
                issues: [],
                normalizedScore: 0,
                error: error.message
            };
        }
    }
    
    // Calculate overall risk score
    calculateOverallRisk(riskData, industryType) {
        try {
            const categoryResults = {};
            let totalScore = 0;
            let totalWeight = 0;
            const allIssues = [];
            
            // Calculate risk for each category
            for (const category of Object.keys(this.riskFactors)) {
                const categoryData = riskData[category] || {};
                const result = this.calculateCategoryRisk(category, categoryData);
                
                categoryResults[category] = result;
                totalScore += result.score;
                totalWeight += result.weight;
                allIssues.push(...result.issues);
            }
            
            // Apply industry multiplier
            const industryMultiplier = this.industryMultipliers[industryType] || 1.0;
            const baseScore = totalWeight > 0 ? totalScore / totalWeight : 0;
            const finalScore = baseScore * industryMultiplier;
            
            return {
                overallScore: Math.min(finalScore * 100, 100), // Cap at 100
                baseScore: baseScore * 100,
                industryMultiplier,
                industryType,
                categoryBreakdown: categoryResults,
                issues: allIssues,
                riskLevel: this.getRiskLevel(finalScore * 100),
                calculatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error calculating overall risk:', error);
            return {
                overallScore: 0,
                baseScore: 0,
                industryMultiplier: 1.0,
                industryType,
                categoryBreakdown: {},
                issues: [],
                riskLevel: 'unknown',
                error: error.message,
                calculatedAt: new Date().toISOString()
            };
        }
    }
    
    // Get risk level based on score
    getRiskLevel(score) {
        if (score >= 80) return 'critical';
        if (score >= 60) return 'high';
        if (score >= 40) return 'medium';
        if (score >= 20) return 'low';
        return 'minimal';
    }
    
    // Get recommendation for specific factor
    getFactorRecommendation(factor, severity) {
        const recommendations = {
            missingConsentForms: 'Update consent forms immediately and ensure all patients have current signed forms',
            outdatedPolicies: 'Review and update all policies to meet current regulatory requirements',
            incompleteTraining: 'Complete all required training modules and update training records',
            auditGaps: 'Schedule comprehensive audit and address all identified gaps',
            staffTurnover: 'Implement retention strategies and cross-training programs',
            systemDowntime: 'Upgrade infrastructure and implement redundancy measures',
            processInefficiencies: 'Conduct process analysis and implement workflow improvements',
            resourceConstraints: 'Assess resource needs and allocate additional budget/staff',
            communicationGaps: 'Establish clear communication protocols and regular team meetings',
            dataSecurity: 'Implement comprehensive security measures and conduct security audit',
            systemIntegration: 'Integrate disparate systems and ensure data flow',
            backupRecovery: 'Implement robust backup and disaster recovery procedures',
            accessControls: 'Review and strengthen access control policies',
            hipaaCompliance: 'Conduct HIPAA compliance audit and address violations',
            oshaCompliance: 'Review OSHA requirements and implement safety measures',
            deaCompliance: 'Ensure DEA registration compliance and proper record-keeping',
            medicareMedicaidCompliance: 'Review billing practices and ensure compliance',
            accreditationRequirements: 'Prepare for accreditation review and address deficiencies',
            stateRegulations: 'Review state-specific requirements and ensure compliance'
        };
        
        return recommendations[factor] || `Address ${factor.replace(/([A-Z])/g, ' $1').toLowerCase()} issues immediately`;
    }
    
    // Update risk factors
    updateRiskFactors(newRiskFactors) {
        this.riskFactors = { ...this.riskFactors, ...newRiskFactors };
    }
    
    // Update severity multipliers
    updateSeverityMultipliers(newMultipliers) {
        this.severityMultipliers = { ...this.severityMultipliers, ...newMultipliers };
    }
    
    // Update industry multipliers
    updateIndustryMultipliers(newMultipliers) {
        this.industryMultipliers = { ...this.industryMultipliers, ...newMultipliers };
    }
    
    // Get current configuration
    getConfiguration() {
        return {
            riskFactors: this.riskFactors,
            severityMultipliers: this.severityMultipliers,
            industryMultipliers: this.industryMultipliers
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RiskCalculator;
} else {
    window.RiskCalculator = RiskCalculator;
}
