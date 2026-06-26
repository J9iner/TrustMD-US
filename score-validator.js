// TrustMD Score Validator
// Comprehensive score validation, consistency checking, and audit logging

class ScoreValidator {
    constructor() {
        this.validationRules = null;
        this.auditLog = [];
        this.scoreHistory = new Map();
        this.calibrationData = new Map();
    }

    // Initialize validator with scoring rules
    async initialize() {
        try {
            const response = await fetch('/config/scoring-validation-rules.json');
            if (response.ok) {
                this.validationRules = await response.json();
                console.log('Score validation rules loaded successfully');
                return true;
            } else {
                console.warn('Failed to load scoring validation rules, using defaults');
                this.validationRules = this.getDefaultRules();
                return false;
            }
        } catch (error) {
            console.error('Error loading scoring validation rules:', error);
            this.validationRules = this.getDefaultRules();
            return false;
        }
    }

    // Get default validation rules
    getDefaultRules() {
        return {
            scoreValidation: {
                ranges: {
                    score: { minimum: 0, maximum: 100 },
                    sectionScore: { minimum: 0, maximum: 100 },
                    requirementScore: { minimum: 0, maximum: 100 },
                    points: { minimum: 0, maximum: 1000 }
                }
            },
            algorithms: {
                weighted_average: { name: "Weighted Average" },
                critical_requirements: { name: "Critical Requirements Focus" },
                risk_adjusted: { name: "Risk-Adjusted Scoring" }
            },
            consistency: {
                maxVariance: 15,
                consistencyThreshold: 0.8
            },
            audit: {
                logAllCalculations: true,
                retentionDays: 2555
            }
        };
    }

    // Validate score range and format
    validateScore(score, scoreType = 'score', context = {}) {
        const errors = [];
        const warnings = [];

        try {
            const ranges = this.validationRules.scoreValidation.ranges[scoreType];
            if (!ranges) {
                errors.push({
                    field: 'scoreType',
                    message: `Unknown score type: ${scoreType}`,
                    code: 'INVALID_SCORE_TYPE'
                });
                return { isValid: false, errors, warnings };
            }

            // Check if score is a number
            if (typeof score !== 'number' || isNaN(score)) {
                errors.push({
                    field: scoreType,
                    message: 'Score must be a valid number',
                    code: 'INVALID_NUMBER'
                });
                return { isValid: false, errors, warnings };
            }

            // Check range
            if (score < ranges.minimum) {
                errors.push({
                    field: scoreType,
                    message: `Score ${score} is below minimum ${ranges.minimum}`,
                    code: 'SCORE_TOO_LOW'
                });
            }

            if (score > ranges.maximum) {
                errors.push({
                    field: scoreType,
                    message: `Score ${score} is above maximum ${ranges.maximum}`,
                    code: 'SCORE_TOO_HIGH'
                });
            }

            // Check for decimal precision (max 2 decimal places)
            const decimalPlaces = (score.toString().split('.')[1] || '').length;
            if (decimalPlaces > 2) {
                warnings.push({
                    field: scoreType,
                    message: `Score has ${decimalPlaces} decimal places, recommended max 2`,
                    code: 'EXCESSIVE_PRECISION'
                });
            }

            // Validate percentage if applicable
            if (scoreType === 'score' || scoreType === 'sectionScore') {
                const percentage = score;
                if (percentage < 0 || percentage > 100) {
                    errors.push({
                        field: scoreType,
                        message: `Percentage must be between 0 and 100, got ${percentage}`,
                        code: 'INVALID_PERCENTAGE'
                    });
                }
            }

            const isValid = errors.length === 0;

            return {
                isValid,
                errors,
                warnings,
                score,
                scoreType,
                validatedAt: new Date().toISOString(),
                context
            };

        } catch (error) {
            return {
                isValid: false,
                errors: [{ field: 'general', message: error.message, code: 'VALIDATION_ERROR' }],
                warnings,
                score,
                scoreType,
                validatedAt: new Date().toISOString()
            };
        }
    }

    // Validate complete score calculation
    validateScoreCalculation(calculationResult, algorithm, inputData) {
        const errors = [];
        const warnings = [];

        try {
            // Validate overall score
            const overallValidation = this.validateScore(calculationResult.overall, 'score', { algorithm });
            errors.push(...overallValidation.errors);
            warnings.push(...overallValidation.warnings);

            // Validate section scores if present
            if (calculationResult.sectionScores) {
                for (const [sectionId, sectionScore] of Object.entries(calculationResult.sectionScores)) {
                    const sectionValidation = this.validateScore(sectionScore, 'sectionScore', { 
                        sectionId, 
                        algorithm 
                    });
                    if (!sectionValidation.isValid) {
                        errors.push(...sectionValidation.errors.map(e => ({
                            ...e,
                            field: `sectionScores.${sectionId}.${e.field}`
                        })));
                    }
                    warnings.push(...sectionValidation.warnings.map(w => ({
                        ...w,
                        field: `sectionScores.${sectionId}.${w.field}`
                    })));
                }
            }

            // Validate grade assignment
            if (calculationResult.grade) {
                const gradeValidation = this.validateGrade(calculationResult.grade, calculationResult.overall);
                if (!gradeValidation.isValid) {
                    errors.push(...gradeValidation.errors);
                }
            }

            // Validate mathematical consistency
            const consistencyErrors = this.validateMathematicalConsistency(calculationResult);
            errors.push(...consistencyErrors);

            // Validate algorithm-specific rules
            const algorithmErrors = this.validateAlgorithmSpecificRules(calculationResult, algorithm, inputData);
            errors.push(...algorithmErrors);

            const isValid = errors.length === 0;

            return {
                isValid,
                errors,
                warnings,
                calculationResult,
                algorithm,
                validatedAt: new Date().toISOString()
            };

        } catch (error) {
            return {
                isValid: false,
                errors: [{ field: 'general', message: error.message, code: 'CALCULATION_VALIDATION_ERROR' }],
                warnings,
                calculationResult,
                algorithm,
                validatedAt: new Date().toISOString()
            };
        }
    }

    // Validate grade assignment
    validateGrade(grade, score) {
        const errors = [];
        const thresholds = this.validationRules.scoreValidation.thresholds;

        if (!thresholds) {
            return { isValid: true, errors: [] };
        }

        let expectedGrade = null;
        for (const [level, config] of Object.entries(thresholds)) {
            if (score >= (config.minimum || 0) && score <= (config.maximum || 100)) {
                expectedGrade = config.grade;
                break;
            }
        }

        if (expectedGrade && grade !== expectedGrade) {
            errors.push({
                field: 'grade',
                message: `Grade ${grade} does not match expected grade ${expectedGrade} for score ${score}`,
                code: 'GRADE_MISMATCH'
            });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Validate mathematical consistency
    validateMathematicalConsistency(calculationResult) {
        const errors = [];

        try {
            // Check if section scores average makes sense
            if (calculationResult.sectionScores && Object.keys(calculationResult.sectionScores).length > 0) {
                const sectionScores = Object.values(calculationResult.sectionScores);
                const averageSectionScore = sectionScores.reduce((sum, score) => sum + score, 0) / sectionScores.length;
                
                // Overall score should be reasonably close to section average (within 20%)
                const variance = Math.abs(calculationResult.overall - averageSectionScore);
                if (variance > 20) {
                    errors.push({
                        field: 'consistency',
                        message: `Overall score ${calculationResult.overall} varies significantly from section average ${averageSectionScore.toFixed(2)}`,
                        code: 'SECTION_AVERAGE_VARIANCE'
                    });
                }
            }

            // Validate percentage calculations if present
            if (calculationResult.percentage !== undefined) {
                const expectedPercentage = calculationResult.overall; // Should be the same
                if (Math.abs(calculationResult.percentage - expectedPercentage) > 0.01) {
                    errors.push({
                        field: 'percentage',
                        message: `Percentage ${calculationResult.percentage} does not match score ${expectedPercentage}`,
                        code: 'PERCENTAGE_MISMATCH'
                    });
                }
            }

        } catch (error) {
            errors.push({
                field: 'consistency',
                message: `Error in consistency validation: ${error.message}`,
                code: 'CONSISTENCY_ERROR'
            });
        }

        return errors;
    }

    // Validate algorithm-specific rules
    validateAlgorithmSpecificRules(calculationResult, algorithm, inputData) {
        const errors = [];
        const algorithmConfig = this.validationRules.algorithms[algorithm];

        if (!algorithmConfig) {
            errors.push({
                field: 'algorithm',
                message: `Unknown algorithm: ${algorithm}`,
                code: 'UNKNOWN_ALGORITHM'
            });
            return errors;
        }

        try {
            switch (algorithm) {
                case 'weighted_average':
                    errors.push(...this.validateWeightedAverage(calculationResult, inputData));
                    break;
                case 'critical_requirements':
                    errors.push(...this.validateCriticalRequirements(calculationResult, inputData));
                    break;
                case 'risk_adjusted':
                    errors.push(...this.validateRiskAdjusted(calculationResult, inputData));
                    break;
                case 'automated_checks':
                    errors.push(...this.validateAutomatedChecks(calculationResult, inputData));
                    break;
            }
        } catch (error) {
            errors.push({
                field: 'algorithm',
                message: `Error in ${algorithm} validation: ${error.message}`,
                code: 'ALGORITHM_VALIDATION_ERROR'
            });
        }

        return errors;
    }

    // Validate weighted average algorithm
    validateWeightedAverage(calculationResult, inputData) {
        const errors = [];
        const weights = this.validationRules.algorithms.weighted_average.weights;

        // Check if weights are applied correctly
        if (inputData.requirements) {
            let totalWeight = 0;
            let weightedSum = 0;

            for (const [reqId, reqData] of Object.entries(inputData.requirements)) {
                const riskLevel = reqData.riskLevel || 'medium';
                const weight = weights[riskLevel] || 1.0;
                const score = reqData.score || 0;
                
                totalWeight += weight;
                weightedSum += score * weight;
            }

            if (totalWeight > 0) {
                const expectedScore = weightedSum / totalWeight;
                const variance = Math.abs(calculationResult.overall - expectedScore);
                
                if (variance > 5) { // Allow 5% variance
                    errors.push({
                        field: 'weighted_average',
                        message: `Weighted average calculation variance: ${variance.toFixed(2)}%`,
                        code: 'WEIGHTED_AVERAGE_VARIANCE'
                    });
                }
            }
        }

        return errors;
    }

    // Validate critical requirements algorithm
    validateCriticalRequirements(calculationResult, inputData) {
        const errors = [];
        const config = this.validationRules.algorithms.critical_requirements;

        // Check critical requirements handling
        if (inputData.requirements) {
            const criticalReqs = Object.values(inputData.requirements).filter(req => 
                req.riskLevel === 'critical' || req.mandatory
            );

            if (criticalReqs.length > 0) {
                const criticalScores = criticalReqs.map(req => req.score || 0);
                const avgCriticalScore = criticalScores.reduce((sum, score) => sum + score, 0) / criticalScores.length;

                // Critical requirements should significantly impact overall score
                if (avgCriticalScore < 70 && calculationResult.overall > 80) {
                    errors.push({
                        field: 'critical_requirements',
                        message: 'Low critical requirement scores but high overall score',
                        code: 'CRITICAL_REQUIREMENTS_IMPACT'
                    });
                }
            }
        }

        return errors;
    }

    // Validate risk-adjusted algorithm
    validateRiskAdjusted(calculationResult, inputData) {
        const errors = [];
        const multipliers = this.validationRules.algorithms.risk_adjusted.riskMultipliers;

        // Check risk multiplier application
        if (inputData.requirements) {
            for (const [reqId, reqData] of Object.entries(inputData.requirements)) {
                const riskLevel = reqData.riskLevel || 'medium';
                const multiplier = multipliers[riskLevel] || 1.0;
                
                if (multiplier < 0.5 || multiplier > 2.0) {
                    errors.push({
                        field: 'risk_multiplier',
                        message: `Invalid risk multiplier ${multiplier} for ${riskLevel}`,
                        code: 'INVALID_RISK_MULTIPLIER'
                    });
                }
            }
        }

        return errors;
    }

    // Validate automated checks algorithm
    validateAutomatedChecks(calculationResult, inputData) {
        const errors = [];
        const config = this.validationRules.algorithms.automated_checks;

        // Check automated vs manual scoring
        if (inputData.requirements) {
            const automatedReqs = Object.values(inputData.requirements).filter(req => req.automatedCheck);
            const manualReqs = Object.values(inputData.requirements).filter(req => !req.automatedCheck);

            if (automatedReqs.length > 0 && manualReqs.length > 0) {
                const avgAutomatedScore = automatedReqs.reduce((sum, req) => sum + (req.score || 0), 0) / automatedReqs.length;
                const avgManualScore = manualReqs.reduce((sum, req) => sum + (req.score || 0), 0) / manualReqs.length;

                // Check if automated checks are weighted appropriately
                const variance = Math.abs(avgAutomatedScore - avgManualScore);
                if (variance > 30) {
                    errors.push({
                        field: 'automated_checks',
                        message: `Large variance between automated (${avgAutomatedScore.toFixed(1)}) and manual (${avgManualScore.toFixed(1)}) scores`,
                        code: 'AUTOMATED_MANUAL_VARIANCE'
                    });
                }
            }
        }

        return errors;
    }

    // Check score consistency across algorithms
    checkScoreConsistency(scores, algorithms) {
        const errors = [];
        const consistency = this.validationRules.consistency;

        if (!scores || scores.length < 2) {
            return { isConsistent: true, errors: [] };
        }

        try {
            const scoreValues = scores.map(s => s.overall);
            const maxScore = Math.max(...scoreValues);
            const minScore = Math.min(...scoreValues);
            const variance = maxScore - minScore;

            // Check if variance exceeds threshold
            if (variance > consistency.maxVariance) {
                errors.push({
                    field: 'consistency',
                    message: `Score variance ${variance.toFixed(2)} exceeds maximum ${consistency.maxVariance}`,
                    code: 'EXCESSIVE_VARIANCE'
                });
            }

            // Calculate consistency index
            const mean = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length;
            const standardDeviation = Math.sqrt(
                scoreValues.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scoreValues.length
            );
            const consistencyIndex = 1 - (standardDeviation / mean);

            const isConsistent = consistencyIndex >= consistency.consistencyThreshold;

            return {
                isConsistent,
                consistencyIndex,
                variance,
                standardDeviation,
                mean,
                errors
            };

        } catch (error) {
            errors.push({
                field: 'consistency',
                message: `Error in consistency check: ${error.message}`,
                code: 'CONSISTENCY_CHECK_ERROR'
            });
            return { isConsistent: false, errors };
        }
    }

    // Log score calculation for audit
    logScoreCalculation(templateId, sectionId, score, algorithm, inputData, validationResult) {
        const auditEntry = {
            id: this.generateAuditId(),
            templateId,
            sectionId,
            calculatedScore: score,
            algorithm,
            inputData: this.sanitizeInputData(inputData),
            validationResult,
            timestamp: new Date().toISOString(),
            userId: null, // Would be populated from context
            sessionId: null // Would be populated from context
        };

        this.auditLog.push(auditEntry);

        // Keep audit log within retention limits
        const retentionDays = this.validationRules.audit.retentionDays;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        this.auditLog = this.auditLog.filter(entry => 
            new Date(entry.timestamp) > cutoffDate
        );

        return auditEntry.id;
    }

    // Generate unique audit ID
    generateAuditId() {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Sanitize input data for audit logging
    sanitizeInputData(inputData) {
        const sanitized = { ...inputData };
        
        // Remove sensitive information
        if (sanitized.evidence) {
            sanitized.evidenceCount = Array.isArray(sanitized.evidence) ? sanitized.evidence.length : 0;
            delete sanitized.evidence;
        }

        if (sanitized.personalData) {
            delete sanitized.personalData;
        }

        return sanitized;
    }

    // Get audit log entries
    getAuditLog(filters = {}) {
        let filteredLog = [...this.auditLog];

        if (filters.templateId) {
            filteredLog = filteredLog.filter(entry => entry.templateId === filters.templateId);
        }

        if (filters.algorithm) {
            filteredLog = filteredLog.filter(entry => entry.algorithm === filters.algorithm);
        }

        if (filters.startDate) {
            filteredLog = filteredLog.filter(entry => new Date(entry.timestamp) >= new Date(filters.startDate));
        }

        if (filters.endDate) {
            filteredLog = filteredLog.filter(entry => new Date(entry.timestamp) <= new Date(filters.endDate));
        }

        return filteredLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Get score statistics
    getScoreStatistics(templateId, dateRange = {}) {
        const auditEntries = this.getAuditLog({ 
            templateId, 
            ...dateRange 
        });

        if (auditEntries.length === 0) {
            return null;
        }

        const scores = auditEntries.map(entry => entry.calculatedScore.overall);
        const algorithms = [...new Set(auditEntries.map(entry => entry.algorithm))];

        return {
            templateId,
            dateRange,
            totalCalculations: auditEntries.length,
            scoreStatistics: {
                mean: scores.reduce((sum, score) => sum + score, 0) / scores.length,
                median: this.calculateMedian(scores),
                min: Math.min(...scores),
                max: Math.max(...scores),
                standardDeviation: this.calculateStandardDeviation(scores)
            },
            algorithms: algorithms.map(algo => ({
                name: algo,
                count: auditEntries.filter(entry => entry.algorithm === algo).length,
                averageScore: this.calculateAverage(
                    auditEntries
                        .filter(entry => entry.algorithm === algo)
                        .map(entry => entry.calculatedScore.overall)
                )
            })),
            trend: this.calculateTrend(auditEntries)
        };
    }

    // Calculate median
    calculateMedian(scores) {
        const sorted = [...scores].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
    }

    // Calculate standard deviation
    calculateStandardDeviation(scores) {
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        return Math.sqrt(variance);
    }

    // Calculate average
    calculateAverage(scores) {
        return scores.length > 0 
            ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
            : 0;
    }

    // Calculate trend
    calculateTrend(auditEntries) {
        if (auditEntries.length < 2) {
            return { direction: 'insufficient_data', slope: 0 };
        }

        const sortedEntries = auditEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const scores = sortedEntries.map(entry => entry.calculatedScore.overall);
        
        // Simple linear regression for trend
        const n = scores.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = scores.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * scores[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        
        let direction = 'stable';
        if (slope > 0.5) direction = 'improving';
        else if (slope < -0.5) direction = 'declining';

        return { direction, slope };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScoreValidator;
}
