// TrustMD Compliance Scoring Engine
// Advanced scoring algorithms with state multipliers and automated checks

// Import score validator
// Note: In a real implementation, this would be properly imported
// import { ScoreValidator } from '../utils/score-validator.js';

class ComplianceScoringEngine {
    constructor() {
        this.scoringAlgorithms = new Map();
        this.riskLevels = {
            'critical': 4,
            'high': 3,
            'medium': 2,
            'low': 1
        };
        this.scoreValidator = new ScoreValidator();
        this.currentUserId = null;
        this.currentTenantId = null;
        
        // Initialize scoring algorithms and validator
        this.initializeScoringAlgorithms();
        this.initializeValidator();
    }

    // Initialize validator with scoring rules
    async initializeValidator() {
        await this.scoreValidator.initialize();
    }

    // Initialize scoring algorithms
    initializeScoringAlgorithms() {
        this.scoringAlgorithms.set('weighted_average', this.calculateWeightedAverage.bind(this));
        this.scoringAlgorithms.set('critical_requirements', this.calculateCriticalRequirementsScore.bind(this));
        this.scoringAlgorithms.set('risk_adjusted', this.calculateRiskAdjustedScore.bind(this));
        this.scoringAlgorithms.set('automated_checks', this.calculateAutomatedChecksScore.bind(this));
    }

    // Set current user context for audit logging
    setUserContext(userId, tenantId) {
        this.currentUserId = userId;
        this.currentTenantId = tenantId;
        this.scoreValidator.currentUserId = userId;
    }

    // Enhanced section score calculation with validation
    calculateSectionScore(section, complianceData) {
        let sectionScore = 0;
        let sectionTotalPoints = 0;
        let sectionCompletedPoints = 0;
        let criticalRequirementsMet = 0;
        let totalCriticalRequirements = 0;

        for (const requirement of section.requirements) {
            const requirementData = complianceData.requirements?.[requirement.id] || {};
            const isCompleted = this.isRequirementCompleted(requirement, requirementData);
            
            sectionTotalPoints += requirement.points;
            
            if (isCompleted) {
                sectionCompletedPoints += requirement.points;
                sectionScore += requirement.points;
            }

            // Track critical requirements
            if (requirement.mandatory || requirement.riskLevel === 'critical') {
                totalCriticalRequirements++;
                if (isCompleted) {
                    criticalRequirementsMet++;
                }
            }
        }

        const percentage = sectionTotalPoints > 0 ? (sectionScore / sectionTotalPoints) * 100 : 0;
        const criticalCompliancePercentage = totalCriticalRequirements > 0 ? 
            (criticalRequirementsMet / totalCriticalRequirements) * 100 : 100;

        const result = {
            score: sectionScore,
            totalPoints: sectionTotalPoints,
            percentage,
            criticalRequirementsMet,
            totalCriticalRequirements,
            criticalCompliancePercentage
        };

        // Validate the calculated score
        const validation = this.scoreValidator.validateScore(percentage, 'sectionScore', {
            sectionId: section.id,
            totalRequirements: section.requirements.length
        });

        if (!validation.isValid) {
            console.warn(`Section score validation failed for ${section.id}:`, validation.errors);
            result.validationErrors = validation.errors;
        }

        return result;
    }

    // Enhanced compliance score calculation with validation and auditing
    async calculateComplianceScore(template, complianceData, stateMultiplier = 1.0) {
        try {
            const algorithm = 'weighted_average'; // Default algorithm
            const startTime = Date.now();

            // Calculate overall score using default algorithm
            const overallResult = await this.calculateOverallScore(template, complianceData, stateMultiplier, algorithm);
            
            // Calculate scores using multiple algorithms for consistency checking
            const consistencyScores = await this.calculateConsistencyScores(template, complianceData, stateMultiplier);
            
            // Check score consistency across algorithms
            const consistencyCheck = this.scoreValidator.checkScoreConsistency(
                consistencyScores, 
                Array.from(this.scoringAlgorithms.keys())
            );

            // Validate the final score
            const validation = this.scoreValidator.validateScoreCalculation(overallResult, algorithm, complianceData);

            // Log the calculation for audit
            const auditId = this.scoreValidator.logScoreCalculation(
                template.id || 'unknown',
                'overall',
                overallResult,
                algorithm,
                complianceData,
                validation
            );

            const processingTime = Date.now() - startTime;

            return {
                ...overallResult,
                validation,
                consistency: consistencyCheck,
                auditId,
                algorithm,
                processingTime,
                calculatedAt: new Date().toISOString(),
                calculatedBy: this.currentUserId,
                tenantId: this.currentTenantId,
                stateMultiplier,
                algorithmScores: consistencyScores
            };

        } catch (error) {
            console.error('Error calculating compliance score:', error);
            throw error;
        }
    }

    // Calculate scores using multiple algorithms for consistency checking
    async calculateConsistencyScores(template, complianceData, stateMultiplier) {
        const scores = [];
        const algorithms = ['weighted_average', 'critical_requirements', 'risk_adjusted'];

        for (const algorithm of algorithms) {
            try {
                const score = await this.calculateOverallScore(template, complianceData, stateMultiplier, algorithm);
                scores.push({
                    algorithm,
                    overall: score.overall,
                    grade: score.grade,
                    sectionScores: score.sectionScores
                });
            } catch (error) {
                console.warn(`Error calculating score with ${algorithm}:`, error);
            }
        }

        return scores;
    }

    // Enhanced overall score calculation with validation
    async calculateOverallScore(template, complianceData, stateMultiplier, algorithm) {
        const algorithmFunction = this.scoringAlgorithms.get(algorithm);
        if (!algorithmFunction) {
            throw new Error(`Unknown scoring algorithm: ${algorithm}`);
        }

        // Calculate section scores
        const sectionScores = {};
        let totalScore = 0;
        let totalPoints = 0;
        let totalCriticalRequirements = 0;
        let criticalRequirementsMet = 0;

        for (const section of template.sections) {
            const sectionResult = this.calculateSectionScore(section, complianceData);
            sectionScores[section.id] = sectionResult.percentage;
            
            totalScore += sectionResult.score;
            totalPoints += sectionResult.totalPoints;
            totalCriticalRequirements += sectionResult.totalCriticalRequirements;
            criticalRequirementsMet += sectionResult.criticalRequirementsMet;
        }

        // Apply algorithm-specific calculation
        let overallScore = algorithmFunction(sectionScores, complianceData, template);

        // Apply state multiplier
        overallScore = Math.min(100, overallScore * stateMultiplier);

        // Determine grade
        const grade = this.determineGrade(overallScore);

        const result = {
            overall: Math.round(overallScore * 100) / 100, // Round to 2 decimal places
            grade,
            sectionScores,
            totalPoints,
            completedPoints: totalScore,
            percentage: totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0,
            criticalRequirements: totalCriticalRequirements,
            criticalCompleted: criticalRequirementsMet,
            criticalCompliancePercentage: totalCriticalRequirements > 0 ? 
                (criticalRequirementsMet / totalCriticalRequirements) * 100 : 100
        };

        // Validate the result
        const validation = this.scoreValidator.validateScoreCalculation(result, algorithm, complianceData);
        if (!validation.isValid) {
            console.warn(`Score calculation validation failed for ${algorithm}:`, validation.errors);
            result.validationErrors = validation.errors;
        }

        return result;
    }

    // Determine grade based on score
    determineGrade(score) {
        if (score >= 95) return 'A';
        if (score >= 85) return 'B';
        if (score >= 70) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    }

    // Check if requirement is completed
    isRequirementCompleted(requirement, requirementData) {
        // Check mandatory requirements
        if (requirement.mandatory && !requirementData.completed) {
            return false;
        }

        // Check evidence requirements
        if (requirement.evidenceRequired && requirementData.evidence) {
            const evidenceCount = requirementData.evidence.length || 0;
            const requiredCount = requirement.evidenceRequired.length;
            if (evidenceCount < requiredCount) {
                return false;
            }
        }

        // Check automated checks
        if (requirement.automatedChecks && requirementData.automatedChecks) {
            for (const check of requirement.automatedChecks) {
                if (!requirementData.automatedChecks[check]) {
                    return false;
                }
            }
        }

        // Check expiration dates
        if (requirementData.expirationDate) {
            const expirationDate = new Date(requirementData.expirationDate);
            const today = new Date();
            if (expirationDate < today) {
                return false;
            }
        }

        return requirementData.completed !== false;
    }

    // Calculate weighted average score
    calculateWeightedAverage(sectionScores, template) {
        let totalWeightedScore = 0;
        let totalWeight = 0;

        for (const section of template.sections) {
            const sectionScore = sectionScores[section.id];
            if (sectionScore) {
                totalWeightedScore += sectionScore.percentage * section.weight;
                totalWeight += section.weight;
            }
        }

        return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    }

    // Calculate critical requirements score
    calculateCriticalRequirementsScore(sectionScores, template) {
        let totalCriticalMet = 0;
        let totalCriticalRequired = 0;

        for (const section of template.sections) {
            const sectionScore = sectionScores[section.id];
            if (sectionScore) {
                totalCriticalMet += sectionScore.criticalRequirementsMet;
                totalCriticalRequired += sectionScore.totalCriticalRequirements;
            }
        }

        return totalCriticalRequired > 0 ? 
            (totalCriticalMet / totalCriticalRequired) * 100 : 100;
    }

    // Calculate risk-adjusted score
    calculateRiskAdjustedScore(sectionScores, template) {
        let totalRiskWeightedScore = 0;
        let totalRiskWeight = 0;

        for (const section of template.sections) {
            const sectionScore = sectionScores[section.id];
            if (sectionScore) {
                const riskMultiplier = this.calculateSectionRiskMultiplier(section);
                totalRiskWeightedScore += sectionScore.percentage * section.weight * riskMultiplier;
                totalRiskWeight += section.weight * riskMultiplier;
            }
        }

        return totalRiskWeight > 0 ? totalRiskWeightedScore / totalRiskWeight : 0;
    }

    // Calculate automated checks score
    calculateAutomatedChecksScore(sectionScores, template) {
        let totalAutomatedChecks = 0;
        let totalAutomatedChecksPassed = 0;

        for (const section of template.sections) {
            for (const requirement of section.requirements) {
                if (requirement.automatedChecks) {
                    totalAutomatedChecks += requirement.automatedChecks.length;
                    // This would be populated from actual compliance data
                    // For now, we'll estimate based on section score
                    const sectionScore = sectionScores[section.id];
                    if (sectionScore) {
                        const passedChecks = Math.floor(
                            (sectionScore.percentage / 100) * requirement.automatedChecks.length
                        );
                        totalAutomatedChecksPassed += passedChecks;
                    }
                }
            }
        }

        return totalAutomatedChecks > 0 ? 
            (totalAutomatedChecksPassed / totalAutomatedChecks) * 100 : 100;
    }

    // Calculate section risk multiplier
    calculateSectionRiskMultiplier(section) {
        let totalRiskWeight = 0;
        let requirementCount = 0;

        for (const requirement of section.requirements) {
            const riskLevel = this.riskLevels[requirement.riskLevel] || 1;
            totalRiskWeight += riskLevel;
            requirementCount++;
        }

        return requirementCount > 0 ? totalRiskWeight / requirementCount : 1;
    }

    // Apply state multiplier
    applyStateMultiplier(baseScore, stateMultiplier) {
        return Math.min(100, baseScore * stateMultiplier);
    }

    // Calculate overall compliance score
    async calculateComplianceScore(template, complianceData, stateMultiplier = 1.0) {
        // Calculate section scores
        const sectionScores = {};
        for (const section of template.sections) {
            sectionScores[section.id] = this.calculateSectionScore(section, complianceData);
        }

        // Calculate different scoring algorithms
        const weightedAverage = this.calculateWeightedAverage(sectionScores, template);
        const criticalScore = this.calculateCriticalRequirementsScore(sectionScores, template);
        const riskAdjustedScore = this.calculateRiskAdjustedScore(sectionScores, template);
        const automatedChecksScore = this.calculateAutomatedChecksScore(sectionScores, template);

        // Apply state multiplier
        const finalScore = this.applyStateMultiplier(weightedAverage, stateMultiplier);

        return {
            overall: finalScore,
            weightedAverage,
            criticalScore,
            riskAdjustedScore,
            automatedChecksScore,
            sectionScores,
            passed: finalScore >= (template.scoring?.passingScore || 85),
            grade: this.calculateGrade(finalScore)
        };
    }

    // Calculate letter grade
    calculateGrade(score) {
        if (score >= 95) return 'A+';
        if (score >= 90) return 'A';
        if (score >= 85) return 'B+';
        if (score >= 80) return 'B';
        if (score >= 75) return 'C+';
        if (score >= 70) return 'C';
        if (score >= 65) return 'D';
        return 'F';
    }

    // Scoring Algorithms

    // Weighted Average Algorithm
    calculateWeightedAverage(sectionScores, complianceData, template) {
        let totalWeightedScore = 0;
        let totalWeight = 0;

        for (const section of template.sections) {
            const sectionScore = sectionScores[section.id] || 0;
            let sectionWeight = 1.0;

            // Calculate section weight based on requirements
            for (const requirement of section.requirements) {
                const riskLevel = requirement.riskLevel || 'medium';
                const weight = this.getRiskWeight(riskLevel);
                sectionWeight += weight;
            }

            totalWeightedScore += sectionScore * sectionWeight;
            totalWeight += sectionWeight;
        }

        return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    }

    // Critical Requirements Focus Algorithm
    calculateCriticalRequirementsScore(sectionScores, complianceData, template) {
        let criticalScore = 0;
        let regularScore = 0;
        let criticalCount = 0;
        let regularCount = 0;

        for (const section of template.sections) {
            const sectionScore = sectionScores[section.id] || 0;

            for (const requirement of section.requirements) {
                if (requirement.riskLevel === 'critical' || requirement.mandatory) {
                    criticalScore += sectionScore;
                    criticalCount++;
                } else {
                    regularScore += sectionScore;
                    regularCount++;
                }
            }
        }

        // Critical requirements have 2x weight
        const criticalAverage = criticalCount > 0 ? criticalScore / criticalCount : 0;
        const regularAverage = regularCount > 0 ? regularScore / regularCount : 0;

        return (criticalAverage * 2 + regularAverage) / 3;
    }

    // Risk-Adjusted Scoring Algorithm
    calculateRiskAdjustedScore(sectionScores, complianceData, template) {
        let totalRiskAdjustedScore = 0;
        let totalRiskWeight = 0;

        for (const section of template.sections) {
            const sectionScore = sectionScores[section.id] || 0;
            let sectionRiskWeight = 0;

            for (const requirement of section.requirements) {
                const riskMultiplier = this.getRiskMultiplier(requirement.riskLevel || 'medium');
                sectionRiskWeight += riskMultiplier;
            }

            const averageRiskWeight = sectionRiskWeight / section.requirements.length;
            totalRiskAdjustedScore += sectionScore * averageRiskWeight;
            totalRiskWeight += averageRiskWeight;
        }

        return totalRiskWeight > 0 ? totalRiskAdjustedScore / totalRiskWeight : 0;
    }

    // Automated Checks Algorithm
    calculateAutomatedChecksScore(sectionScores, complianceData, template) {
        let automatedScore = 0;
        let manualScore = 0;
        let automatedCount = 0;
        let manualCount = 0;

        for (const section of template.sections) {
            const sectionScore = sectionScores[section.id] || 0;

            for (const requirement of section.requirements) {
                const requirementData = complianceData.requirements?.[requirement.id] || {};
                const hasAutomatedChecks = requirement.automatedChecks && 
                    requirement.automatedChecks.length > 0;

                if (hasAutomatedChecks) {
                    automatedScore += sectionScore;
                    automatedCount++;
                } else {
                    manualScore += sectionScore;
                    manualCount++;
                }
            }
        }

        // Automated checks get 1.2x weight
        const automatedAverage = automatedCount > 0 ? automatedScore / automatedCount : 0;
        const manualAverage = manualCount > 0 ? manualScore / manualCount : 0;

        return (automatedAverage * 1.2 + manualAverage) / 2.2;
    }

    // Get risk weight for scoring
    getRiskWeight(riskLevel) {
        const weights = {
            'critical': 2.0,
            'high': 1.5,
            'medium': 1.0,
            'low': 0.5
        };
        return weights[riskLevel] || 1.0;
    }

    // Get risk multiplier for scoring
    getRiskMultiplier(riskLevel) {
        const multipliers = {
            'critical': 1.5,
            'high': 1.3,
            'medium': 1.0,
            'low': 0.7
        };
        return multipliers[riskLevel] || 1.0;
    }

    // Audit and Analytics Methods

    // Get score history for template
    async getScoreHistory(templateId, dateRange = {}) {
        return this.scoreValidator.getScoreStatistics(templateId, dateRange);
    }

    // Get audit log for scoring calculations
    getScoreAuditLog(filters = {}) {
        return this.scoreValidator.getAuditLog(filters);
    }

    // Validate score consistency across time
    validateScoreTrend(templateId, dateRange = {}) {
        const statistics = this.getScoreHistory(templateId, dateRange);
        if (!statistics) {
            return { isValid: true, message: 'Insufficient data for trend analysis' };
        }

        const trend = statistics.trend;
        if (trend.direction === 'declining' && Math.abs(trend.slope) > 2) {
            return {
                isValid: false,
                message: 'Significant declining trend detected',
                slope: trend.slope,
                recommendation: 'Review compliance processes and address gaps'
            };
        }

        return { isValid: true, trend };
    }

    // Calibrate scoring algorithm
    async calibrateAlgorithm(algorithm, baselineData) {
        try {
            const calibration = this.scoreValidator.validationRules.calibration;
            if (!calibration.enabled) {
                return { calibrated: false, reason: 'Calibration disabled' };
            }

            // Calculate adjustment based on baseline data
            const averageBaseline = baselineData.reduce((sum, data) => sum + data.score, 0) / baselineData.length;
            const targetScore = calibration.baselineScore;
            const adjustment = (targetScore - averageBaseline) * calibration.adjustmentFactor;

            // Apply maximum adjustment limit
            const finalAdjustment = Math.max(
                -calibration.maxAdjustment,
                Math.min(calibration.maxAdjustment, adjustment)
            );

            return {
                calibrated: true,
                adjustment: finalAdjustment,
                baselineAverage: averageBaseline,
                targetScore,
                algorithm
            };

        } catch (error) {
            console.error('Error calibrating algorithm:', error);
            return { calibrated: false, error: error.message };
        }
    }

    // Export scoring data for analysis
    exportScoringData(templateId, dateRange = {}) {
        const auditLog = this.getScoreAuditLog({ templateId, ...dateRange });
        const statistics = this.getScoreHistory(templateId, dateRange);

        return {
            templateId,
            dateRange,
            exportedAt: new Date().toISOString(),
            auditLog,
            statistics,
            summary: {
                totalCalculations: auditLog.length,
                averageScore: statistics?.scoreStatistics?.mean || 0,
                scoreRange: {
                    min: statistics?.scoreStatistics?.min || 0,
                    max: statistics?.scoreStatistics?.max || 0
                },
                algorithmsUsed: [...new Set(auditLog.map(entry => entry.algorithm))]
            }
        };
    }

    // Validate scoring algorithm performance
    validateAlgorithmPerformance(algorithm, testData) {
        const results = {
            algorithm,
            testCases: testData.length,
            passed: 0,
            failed: 0,
            averageScore: 0,
            consistencyScore: 0,
            errors: []
        };

        try {
            const scores = [];
            
            for (const testCase of testData) {
                try {
                    const score = this.calculateOverallScore(
                        testCase.template,
                        testCase.complianceData,
                        testCase.stateMultiplier || 1.0,
                        algorithm
                    );
                    
                    scores.push(score.overall);
                    
                    // Validate score range
                    if (score.overall >= 0 && score.overall <= 100) {
                        results.passed++;
                    } else {
                        results.failed++;
                        results.errors.push(`Invalid score: ${score.overall}`);
                    }

                } catch (error) {
                    results.failed++;
                    results.errors.push(`Test case failed: ${error.message}`);
                }
            }

            // Calculate metrics
            results.averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
            
            // Calculate consistency (lower standard deviation is better)
            if (scores.length > 1) {
                const mean = results.averageScore;
                const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
                const standardDeviation = Math.sqrt(variance);
                results.consistencyScore = Math.max(0, 100 - standardDeviation);
            } else {
                results.consistencyScore = 100;
            }

        } catch (error) {
            results.errors.push(`Performance validation failed: ${error.message}`);
        }

        return results;
    }

    // Identify compliance gaps
    identifyComplianceGaps(template, complianceData) {
        const gaps = [];
        const highPriorityGaps = [];
        const criticalGaps = [];

        for (const section of template.sections) {
            for (const requirement of section.requirements) {
                const requirementData = complianceData.requirements?.[requirement.id] || {};
                const isCompleted = this.isRequirementCompleted(requirement, requirementData);

                if (!isCompleted) {
                    const gap = {
                        sectionId: section.id,
                        sectionName: section.name,
                        requirementId: requirement.id,
                        requirementName: requirement.name,
                        description: requirement.description,
                        riskLevel: requirement.riskLevel,
                        points: requirement.points,
                        mandatory: requirement.mandatory,
                        evidenceRequired: requirement.evidenceRequired,
                        automatedChecks: requirement.automatedChecks,
                        currentStatus: requirementData.status || 'not_started',
                        lastUpdated: requirementData.lastUpdated
                    };

                    gaps.push(gap);

                    if (requirement.riskLevel === 'critical' || requirement.mandatory) {
                        criticalGaps.push(gap);
                    } else if (requirement.riskLevel === 'high') {
                        highPriorityGaps.push(gap);
                    }
                }
            }
        }

        return {
            all: gaps,
            critical: criticalGaps,
            highPriority: highPriorityGaps,
            totalGaps: gaps.length,
            criticalGapsCount: criticalGaps.length,
            highPriorityGapsCount: highPriorityGaps.length
        };
    }

    // Generate recommendations
    generateRecommendations(gaps, riskLevel = 'medium') {
        const recommendations = [];
        const processedRequirements = new Set();

        // Sort gaps by points and risk level
        const sortedGaps = [...gaps.all].sort((a, b) => {
            // Priority: critical > high > medium > low
            const riskOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
            const riskDiff = riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
            if (riskDiff !== 0) return -riskDiff;
            
            // Then by points
            return b.points - a.points;
        });

        for (const gap of sortedGaps) {
            if (processedRequirements.has(gap.requirementId)) continue;
            
            const recommendation = this.generateRequirementRecommendation(gap);
            if (recommendation) {
                recommendations.push(recommendation);
                processedRequirements.add(gap.requirementId);
            }
        }

        return recommendations.slice(0, 10); // Limit to top 10 recommendations
    }

    // Generate recommendation for a specific requirement
    generateRequirementRecommendation(gap) {
        const actions = [];

        // Evidence-based recommendations
        if (gap.evidenceRequired && gap.evidenceRequired.length > 0) {
            actions.push(`Upload required evidence: ${gap.evidenceRequired.join(', ')}`);
        }

        // Automated check recommendations
        if (gap.automatedChecks && gap.automatedChecks.length > 0) {
            actions.push(`Complete automated checks: ${gap.automatedChecks.join(', ')}`);
        }

        // Risk-based recommendations
        if (gap.riskLevel === 'critical') {
            actions.push('Immediate action required - critical compliance requirement');
        } else if (gap.riskLevel === 'high') {
            actions.push('High priority - complete within 30 days');
        }

        return {
            requirementId: gap.requirementId,
            requirementName: gap.requirementName,
            sectionName: gap.sectionName,
            priority: gap.riskLevel,
            points: gap.points,
            actions,
            estimatedTime: this.estimateCompletionTime(gap),
            dependencies: this.identifyDependencies(gap)
        };
    }

    // Estimate completion time
    estimateCompletionTime(gap) {
        const baseTimes = {
            'critical': '2-5 days',
            'high': '1-2 weeks',
            'medium': '2-4 weeks',
            'low': '1-2 months'
        };
        return baseTimes[gap.riskLevel] || '2-4 weeks';
    }

    // Identify dependencies
    identifyDependencies(gap) {
        const dependencies = [];
        
        // Common dependencies based on requirement type
        if (gap.evidenceRequired && gap.evidenceRequired.includes('License verification')) {
            dependencies.push('Medical license must be active and current');
        }
        
        if (gap.evidenceRequired && gap.evidenceRequired.includes('CME certificates')) {
            dependencies.push('CME courses must be completed and certificates obtained');
        }

        return dependencies;
    }

    // Calculate compliance trend
    calculateComplianceTrend(historicalScores) {
        if (historicalScores.length < 2) {
            return { trend: 'insufficient_data', change: 0 };
        }

        const recent = historicalScores.slice(-3); // Last 3 scores
        const older = historicalScores.slice(-6, -3); // Previous 3 scores

        const recentAvg = recent.reduce((sum, score) => sum + score.overall, 0) / recent.length;
        const olderAvg = older.length > 0 ? 
            older.reduce((sum, score) => sum + score.overall, 0) / older.length : recentAvg;

        const change = recentAvg - olderAvg;
        let trend;

        if (change > 5) trend = 'improving';
        else if (change < -5) trend = 'declining';
        else trend = 'stable';

        return { trend, change: Math.round(change * 100) / 100 };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComplianceScoringEngine;
} else if (typeof window !== 'undefined') {
    window.ComplianceScoringEngine = ComplianceScoringEngine;
}
