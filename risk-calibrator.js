// TrustMD Risk Engine - Risk Calibration Module
// Handles risk score calibration and adjustment over time

class RiskCalibrator {
    constructor() {
        this.calibrationHistory = [];
        this.calibrationFactors = {};
        this.benchmarkData = new Map();
        this.calibrationMetrics = {
            lastCalibrated: null,
            totalCalibrations: 0,
            averageAdjustment: 0,
            calibrationAccuracy: 0
        };
    }
    
    // Initialize calibration system
    async initialize() {
        try {
            // Load calibration factors from storage or database
            await this.loadCalibrationFactors();
            
            // Load benchmark data
            await this.loadBenchmarkData();
            
            console.log('Risk Calibrator initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize risk calibrator:', error);
            return false;
        }
    }
    
    // Calibrate risk score based on historical accuracy
    calibrateRiskScore(originalScore, riskData, industryType) {
        try {
            // Get calibration factors for this industry
            const industryCalibration = this.calibrationFactors[industryType] || this.getDefaultCalibration();
            
            // Calculate adjustment factors
            const historicalAccuracy = this.getHistoricalAccuracy(industryType);
            const benchmarkComparison = this.compareWithBenchmark(originalScore, industryType);
            const trendAdjustment = this.calculateTrendAdjustment(riskData);
            
            // Apply calibration formula
            const calibratedScore = this.applyCalibration(
                originalScore,
                industryCalibration,
                historicalAccuracy,
                benchmarkComparison,
                trendAdjustment
            );
            
            // Record calibration
            this.recordCalibration(originalScore, calibratedScore, riskData, industryType);
            
            return {
                originalScore,
                calibratedScore,
                adjustment: calibratedScore - originalScore,
                adjustmentPercent: ((calibratedScore - originalScore) / originalScore * 100).toFixed(2),
                factors: {
                    historicalAccuracy,
                    benchmarkComparison,
                    trendAdjustment,
                    industryCalibration
                },
                calibratedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Risk calibration failed:', error);
            return {
                originalScore,
                calibratedScore: originalScore,
                adjustment: 0,
                adjustmentPercent: '0.00',
                error: error.message,
                calibratedAt: new Date().toISOString()
            };
        }
    }
    
    // Apply calibration formula
    applyCalibration(originalScore, industryCalibration, historicalAccuracy, benchmarkComparison, trendAdjustment) {
        // Base calibration factor
        let calibrationFactor = industryCalibration.baseFactor || 1.0;
        
        // Adjust based on historical accuracy
        if (historicalAccuracy < 0.8) {
            calibrationFactor *= 1.1; // Increase score if historically under-predicted
        } else if (historicalAccuracy > 0.95) {
            calibrationFactor *= 0.95; // Decrease score if historically over-predicted
        }
        
        // Adjust based on benchmark comparison
        if (benchmarkComparison.deviation > 0.2) {
            calibrationFactor *= (1 + benchmarkComparison.adjustment);
        }
        
        // Apply trend adjustment
        calibrationFactor *= (1 + trendAdjustment);
        
        // Apply calibrated score
        let calibratedScore = originalScore * calibrationFactor;
        
        // Ensure score stays within bounds
        calibratedScore = Math.max(0, Math.min(100, calibratedScore));
        
        return Math.round(calibratedScore * 100) / 100;
    }
    
    // Get historical accuracy for industry
    getHistoricalAccuracy(industryType) {
        const industryHistory = this.calibrationHistory.filter(h => h.industryType === industryType);
        
        if (industryHistory.length === 0) {
            return 0.85; // Default accuracy
        }
        
        // Calculate accuracy based on how well past calibrations predicted actual outcomes
        const recentHistory = industryHistory.slice(-20); // Last 20 calibrations
        const accuracies = recentHistory.map(h => h.actualAccuracy || 0.85);
        
        return accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    }
    
    // Compare with benchmark data
    compareWithBenchmark(score, industryType) {
        const benchmark = this.benchmarkData.get(industryType);
        
        if (!benchmark) {
            return { deviation: 0, adjustment: 0 };
        }
        
        const deviation = Math.abs(score - benchmark.averageScore) / benchmark.averageScore;
        let adjustment = 0;
        
        if (score > benchmark.averageScore * 1.2) {
            adjustment = -0.1; // Score is significantly higher than benchmark
        } else if (score < benchmark.averageScore * 0.8) {
            adjustment = 0.1; // Score is significantly lower than benchmark
        }
        
        return { deviation, adjustment };
    }
    
    // Calculate trend adjustment
    calculateTrendAdjustment(riskData) {
        // Analyze trends in risk data
        let trendAdjustment = 0;
        
        // Check for improving trends
        if (riskData.trendData) {
            const trend = riskData.trendData;
            
            if (trend.complianceImproving) {
                trendAdjustment -= 0.05; // Reduce score if compliance is improving
            }
            
            if (trend.incidentsDecreasing) {
                trendAdjustment -= 0.03; // Reduce score if incidents are decreasing
            }
            
            if (trend.trainingIncreasing) {
                trendAdjustment -= 0.02; // Reduce score if training is increasing
            }
            
            if (trend.staffTurnoverIncreasing) {
                trendAdjustment += 0.04; // Increase score if turnover is increasing
            }
        }
        
        return trendAdjustment;
    }
    
    // Record calibration for future learning
    recordCalibration(originalScore, calibratedScore, riskData, industryType) {
        const calibrationRecord = {
            originalScore,
            calibratedScore,
            adjustment: calibratedScore - originalScore,
            industryType,
            riskData,
            timestamp: new Date().toISOString(),
            calibrationId: this.generateCalibrationId()
        };
        
        this.calibrationHistory.push(calibrationRecord);
        
        // Update metrics
        this.updateCalibrationMetrics();
        
        // Keep history manageable (last 1000 records)
        if (this.calibrationHistory.length > 1000) {
            this.calibrationHistory = this.calibrationHistory.slice(-1000);
        }
    }
    
    // Update calibration metrics
    updateCalibrationMetrics() {
        const recentCalibrations = this.calibrationHistory.slice(-50);
        
        if (recentCalibrations.length > 0) {
            const adjustments = recentCalibrations.map(c => c.adjustment);
            this.calibrationMetrics.averageAdjustment = adjustments.reduce((sum, adj) => sum + adj, 0) / adjustments.length;
            this.calibrationMetrics.totalCalibrations = this.calibrationHistory.length;
            this.calibrationMetrics.lastCalibrated = new Date().toISOString();
        }
    }
    
    // Update calibration with actual outcomes
    updateWithActualOutcome(calibrationId, actualOutcome, actualRiskLevel) {
        try {
            const calibration = this.calibrationHistory.find(c => c.calibrationId === calibrationId);
            
            if (calibration) {
                calibration.actualOutcome = actualOutcome;
                calibration.actualRiskLevel = actualRiskLevel;
                calibration.updatedAt = new Date().toISOString();
                
                // Calculate accuracy
                const predictedRisk = this.getRiskLevelFromScore(calibration.calibratedScore);
                calibration.actualAccuracy = predictedRisk === actualRiskLevel ? 1.0 : 0.5;
                
                // Update industry calibration factors based on outcomes
                this.updateIndustryCalibration(calibration.industryType, calibration.actualAccuracy);
                
                console.log(`Updated calibration ${calibrationId} with actual outcome`);
            }
        } catch (error) {
            console.error('Failed to update calibration with actual outcome:', error);
        }
    }
    
    // Update industry calibration factors
    updateIndustryCalibration(industryType, accuracy) {
        if (!this.calibrationFactors[industryType]) {
            this.calibrationFactors[industryType] = this.getDefaultCalibration();
        }
        
        const calibration = this.calibrationFactors[industryType];
        
        // Adjust base factor based on accuracy
        if (accuracy < 0.8) {
            calibration.baseFactor = Math.min(calibration.baseFactor * 1.02, 1.5);
        } else if (accuracy > 0.95) {
            calibration.baseFactor = Math.max(calibration.baseFactor * 0.98, 0.5);
        }
        
        calibration.lastUpdated = new Date().toISOString();
        calibration.accuracy = accuracy;
    }
    
    // Get risk level from score
    getRiskLevelFromScore(score) {
        if (score >= 80) return 'critical';
        if (score >= 60) return 'high';
        if (score >= 40) return 'medium';
        if (score >= 20) return 'low';
        return 'minimal';
    }
    
    // Get default calibration
    getDefaultCalibration() {
        return {
            baseFactor: 1.0,
            accuracy: 0.85,
            lastUpdated: new Date().toISOString(),
            sampleSize: 0
        };
    }
    
    // Generate calibration ID
    generateCalibrationId() {
        return `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Load calibration factors from storage
    async loadCalibrationFactors() {
        try {
            // In a real implementation, this would load from database
            // For now, use default values
            this.calibrationFactors = {
                hospital: { baseFactor: 1.05, accuracy: 0.87, lastUpdated: new Date().toISOString() },
                clinic: { baseFactor: 0.98, accuracy: 0.91, lastUpdated: new Date().toISOString() },
                private_practice: { baseFactor: 0.95, accuracy: 0.89, lastUpdated: new Date().toISOString() },
                emergency_medicine: { baseFactor: 1.10, accuracy: 0.84, lastUpdated: new Date().toISOString() }
            };
        } catch (error) {
            console.error('Failed to load calibration factors:', error);
            this.calibrationFactors = {};
        }
    }
    
    // Load benchmark data
    async loadBenchmarkData() {
        try {
            // In a real implementation, this would load from database
            // For now, use mock benchmark data
            this.benchmarkData.set('hospital', { averageScore: 65, sampleSize: 150 });
            this.benchmarkData.set('clinic', { averageScore: 45, sampleSize: 200 });
            this.benchmarkData.set('private_practice', { averageScore: 35, sampleSize: 300 });
            this.benchmarkData.set('emergency_medicine', { averageScore: 75, sampleSize: 50 });
        } catch (error) {
            console.error('Failed to load benchmark data:', error);
        }
    }
    
    // Get calibration statistics
    getCalibrationStatistics() {
        return {
            metrics: this.calibrationMetrics,
            industryFactors: this.calibrationFactors,
            benchmarkData: Object.fromEntries(this.benchmarkData),
            recentCalibrations: this.calibrationHistory.slice(-10),
            totalHistorySize: this.calibrationHistory.length
        };
    }
    
    // Reset calibration data
    resetCalibration() {
        this.calibrationHistory = [];
        this.calibrationFactors = {};
        this.calibrationMetrics = {
            lastCalibrated: null,
            totalCalibrations: 0,
            averageAdjustment: 0,
            calibrationAccuracy: 0
        };
        console.log('Calibration data reset');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RiskCalibrator;
} else {
    window.RiskCalibrator = RiskCalibrator;
}
