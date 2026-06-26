// TrustMD State Compliance Analytics Module
// Provides analytics and insights for state-specific compliance

class StateComplianceAnalytics {
    constructor(supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.currentUserId = null;
        this.currentTenantId = null;
        this.analyticsCache = new Map();
        this.cacheTTL = 600000; // 10 minutes
    }
    
    // Initialize analytics module
    async initialize(userId, tenantId) {
        this.currentUserId = userId;
        this.currentTenantId = tenantId;
        console.log('State Compliance Analytics initialized');
    }
    
    // Get comprehensive state compliance dashboard
    async getStateComplianceDashboard(timeRange = '90d') {
        try {
            const cacheKey = `state_dashboard_${timeRange}`;
            const cached = this.getCachedResult(cacheKey);
            if (cached) {
                return cached;
            }
            
            // Calculate date range
            const endDate = new Date();
            const startDate = new Date();
            const days = parseInt(timeRange.replace('d', ''));
            startDate.setDate(endDate.getDate() - days);
            
            // Get analytics data
            const [
                complianceOverview,
                statePerformance,
                regulatoryTrends,
                riskAnalysis,
                benchmarkComparison
            ] = await Promise.all([
                this.getComplianceOverview(startDate, endDate),
                this.getStatePerformance(startDate, endDate),
                this.getRegulatoryTrends(startDate, endDate),
                this.getRiskAnalysis(startDate, endDate),
                this.getBenchmarkComparison(startDate, endDate)
            ]);
            
            const dashboard = {
                summary: {
                    totalStates: complianceOverview.totalStates,
                    averageCompliance: complianceOverview.averageCompliance,
                    highRiskStates: complianceOverview.highRiskStates,
                    criticalIssues: complianceOverview.criticalIssues,
                    timeRange
                },
                statePerformance,
                regulatoryTrends,
                riskAnalysis,
                benchmarkComparison,
                insights: this.generateInsights(complianceOverview, statePerformance, riskAnalysis),
                recommendations: this.generateRecommendations(complianceOverview, riskAnalysis),
                generatedAt: new Date().toISOString()
            };
            
            // Cache result
            this.setCachedResult(cacheKey, dashboard);
            
            return dashboard;
        } catch (error) {
            console.error('Failed to generate state compliance dashboard:', error);
            return {
                error: error.message,
                generatedAt: new Date().toISOString()
            };
        }
    }
    
    // Get compliance overview
    async getComplianceOverview(startDate, endDate) {
        try {
            // Get state compliance data
            const { data: complianceData, error } = await this.supabaseClient
                .from('state_compliance_reports')
                .select('*')
                .eq('tenant_id', this.currentTenantId)
                .gte('report_date', startDate.toISOString())
                .lte('report_date', endDate.toISOString());
            
            if (error) throw error;
            
            // Calculate overview metrics
            const totalStates = new Set(complianceData.map(d => d.state_code)).size;
            const averageCompliance = complianceData.length > 0
                ? complianceData.reduce((sum, d) => sum + d.overall_score, 0) / complianceData.length
                : 0;
            
            const highRiskStates = complianceData
                .filter(d => d.overall_score < 60)
                .map(d => d.state_code);
            
            const criticalIssues = complianceData
                .filter(d => d.critical_issues > 0)
                .reduce((sum, d) => sum + d.critical_issues, 0);
            
            return {
                totalStates,
                averageCompliance: Math.round(averageCompliance),
                highRiskStates,
                criticalIssues,
                complianceDistribution: this.calculateComplianceDistribution(complianceData)
            };
        } catch (error) {
            console.error('Failed to get compliance overview:', error);
            return {
                totalStates: 0,
                averageCompliance: 0,
                highRiskStates: [],
                criticalIssues: 0,
                error: error.message
            };
        }
    }
    
    // Get state performance metrics
    async getStatePerformance(startDate, endDate) {
        try {
            // Get state performance data
            const { data: performanceData, error } = await this.supabaseClient
                .from('state_performance_metrics')
                .select('*')
                .eq('tenant_id', this.currentTenantId)
                .gte('metric_date', startDate.toISOString())
                .lte('metric_date', endDate.toISOString());
            
            if (error) throw error;
            
            // Group by state and calculate performance
            const statePerformance = {};
            performanceData.forEach(metric => {
                if (!statePerformance[metric.state_code]) {
                    statePerformance[metric.state_code] = {
                        stateCode: metric.state_code,
                        metrics: [],
                        averageScore: 0,
                        trend: 'stable',
                        rank: 0
                    };
                }
                
                statePerformance[metric.state_code].metrics.push(metric);
            });
            
            // Calculate averages and trends for each state
            Object.values(statePerformance).forEach(state => {
                state.averageScore = state.metrics.reduce((sum, m) => sum + m.compliance_score, 0) / state.metrics.length;
                state.trend = this.calculateTrend(state.metrics);
            });
            
            // Rank states by performance
            const rankedStates = Object.values(statePerformance)
                .sort((a, b) => b.averageScore - a.averageScore)
                .map((state, index) => {
                    state.rank = index + 1;
                    return state;
                });
            
            return rankedStates;
        } catch (error) {
            console.error('Failed to get state performance:', error);
            return [];
        }
    }
    
    // Get regulatory trends
    async getRegulatoryTrends(startDate, endDate) {
        try {
            // Get regulatory change data
            const { data: regulatoryData, error } = await this.supabaseClient
                .from('regulatory_changes')
                .select('*')
                .eq('tenant_id', this.currentTenantId)
                .gte('change_date', startDate.toISOString())
                .lte('change_date', endDate.toISOString());
            
            if (error) throw error;
            
            // Analyze trends
            const trends = {
                totalChanges: regulatoryData.length,
                changesByType: this.groupByType(regulatoryData),
                changesByState: this.groupByState(regulatoryData),
                changesByMonth: this.groupByMonth(regulatoryData),
                impactAnalysis: this.analyzeImpact(regulatoryData),
                upcomingDeadlines: this.getUpcomingDeadlines(regulatoryData)
            };
            
            return trends;
        } catch (error) {
            console.error('Failed to get regulatory trends:', error);
            return {
                totalChanges: 0,
                changesByType: {},
                changesByState: {},
                changesByMonth: {},
                impactAnalysis: {},
                upcomingDeadlines: [],
                error: error.message
            };
        }
    }
    
    // Get risk analysis
    async getRiskAnalysis(startDate, endDate) {
        try {
            // Get risk assessment data
            const { data: riskData, error } = await this.supabaseClient
                .from('state_risk_assessments')
                .select('*')
                .eq('tenant_id', this.currentTenantId)
                .gte('assessment_date', startDate.toISOString())
                .lte('assessment_date', endDate.toISOString());
            
            if (error) throw error;
            
            // Analyze risk patterns
            const riskAnalysis = {
                totalAssessments: riskData.length,
                averageRiskScore: riskData.length > 0
                    ? riskData.reduce((sum, d) => sum + d.risk_score, 0) / riskData.length
                    : 0,
                riskDistribution: this.calculateRiskDistribution(riskData),
                highRiskStates: riskData.filter(d => d.risk_score > 70).map(d => d.state_code),
                riskFactors: this.analyzeRiskFactors(riskData),
                mitigationEffectiveness: this.analyzeMitigationEffectiveness(riskData)
            };
            
            return riskAnalysis;
        } catch (error) {
            console.error('Failed to get risk analysis:', error);
            return {
                totalAssessments: 0,
                averageRiskScore: 0,
                riskDistribution: {},
                highRiskStates: [],
                riskFactors: {},
                mitigationEffectiveness: {},
                error: error.message
            };
        }
    }
    
    // Get benchmark comparison
    async getBenchmarkComparison(startDate, endDate) {
        try {
            // Get benchmark data
            const { data: benchmarkData, error } = await this.supabaseClient
                .from('compliance_benchmarks')
                .select('*')
                .eq('tenant_id', this.currentTenantId)
                .gte('benchmark_date', startDate.toISOString())
                .lte('benchmark_date', endDate.toISOString());
            
            if (error) throw error;
            
            // Compare against industry standards
            const comparison = {
                industryAverage: benchmarkData.length > 0
                    ? benchmarkData.reduce((sum, d) => sum + d.industry_average, 0) / benchmarkData.length
                    : 0,
                tenantAverage: benchmarkData.length > 0
                    ? benchmarkData.reduce((sum, d) => sum + d.tenant_score, 0) / benchmarkData.length
                    : 0,
                performanceGap: 0,
                topPerformers: [],
                improvementAreas: []
            };
            
            comparison.performanceGap = comparison.industryAverage - comparison.tenantAverage;
            
            // Identify top performers and improvement areas
            if (benchmarkData.length > 0) {
                comparison.topPerformers = benchmarkData
                    .filter(d => d.tenant_score > d.industry_average)
                    .map(d => ({
                        state: d.state_code,
                        score: d.tenant_score,
                        gap: d.tenant_score - d.industry_average
                    }));
                
                comparison.improvementAreas = benchmarkData
                    .filter(d => d.tenant_score < d.industry_average)
                    .map(d => ({
                        state: d.state_code,
                        score: d.tenant_score,
                        gap: d.industry_average - d.tenant_score,
                        priority: d.gap > 20 ? 'high' : d.gap > 10 ? 'medium' : 'low'
                    }));
            }
            
            return comparison;
        } catch (error) {
            console.error('Failed to get benchmark comparison:', error);
            return {
                industryAverage: 0,
                tenantAverage: 0,
                performanceGap: 0,
                topPerformers: [],
                improvementAreas: [],
                error: error.message
            };
        }
    }
    
    // Calculate compliance distribution
    calculateComplianceDistribution(complianceData) {
        const distribution = {
            excellent: 0,    // 90-100
            good: 0,         // 80-89
            fair: 0,         // 70-79
            poor: 0,         // 60-69
            critical: 0       // < 60
        };
        
        complianceData.forEach(data => {
            const score = data.overall_score;
            if (score >= 90) distribution.excellent++;
            else if (score >= 80) distribution.good++;
            else if (score >= 70) distribution.fair++;
            else if (score >= 60) distribution.poor++;
            else distribution.critical++;
        });
        
        return distribution;
    }
    
    // Calculate trend
    calculateTrend(metrics) {
        if (metrics.length < 2) return 'insufficient_data';
        
        const sortedMetrics = metrics.sort((a, b) => new Date(a.metric_date) - new Date(b.metric_date));
        const recent = sortedMetrics.slice(-5); // Last 5 metrics
        
        if (recent.length < 3) return 'insufficient_data';
        
        // Calculate trend direction
        let increasing = 0;
        let decreasing = 0;
        
        for (let i = 1; i < recent.length; i++) {
            if (recent[i].compliance_score > recent[i-1].compliance_score) increasing++;
            else if (recent[i].compliance_score < recent[i-1].compliance_score) decreasing++;
        }
        
        if (increasing > decreasing) return 'improving';
        if (decreasing > increasing) return 'declining';
        return 'stable';
    }
    
    // Group regulatory changes by type
    groupByType(regulatoryData) {
        const grouped = {};
        regulatoryData.forEach(change => {
            if (!grouped[change.change_type]) {
                grouped[change.change_type] = 0;
            }
            grouped[change.change_type]++;
        });
        return grouped;
    }
    
    // Group regulatory changes by state
    groupByState(regulatoryData) {
        const grouped = {};
        regulatoryData.forEach(change => {
            if (!grouped[change.state_code]) {
                grouped[change.state_code] = [];
            }
            grouped[change.state_code].push(change);
        });
        return grouped;
    }
    
    // Group regulatory changes by month
    groupByMonth(regulatoryData) {
        const grouped = {};
        regulatoryData.forEach(change => {
            const month = new Date(change.change_date).toISOString().substring(0, 7); // YYYY-MM
            if (!grouped[month]) {
                grouped[month] = 0;
            }
            grouped[month]++;
        });
        return grouped;
    }
    
    // Analyze impact of regulatory changes
    analyzeImpact(regulatoryData) {
        const impact = {
            high: 0,
            medium: 0,
            low: 0,
            totalCost: 0,
            averageImplementationTime: 0
        };
        
        const implementationTimes = [];
        
        regulatoryData.forEach(change => {
            impact[change.impact_level]++;
            impact.totalCost += change.estimated_cost || 0;
            
            if (change.implementation_days) {
                implementationTimes.push(change.implementation_days);
            }
        });
        
        impact.averageImplementationTime = implementationTimes.length > 0
            ? implementationTimes.reduce((sum, time) => sum + time, 0) / implementationTimes.length
            : 0;
        
        return impact;
    }
    
    // Get upcoming deadlines
    getUpcomingDeadlines(regulatoryData) {
        const now = new Date();
        const upcoming = regulatoryData
            .filter(change => {
                const deadline = new Date(change.compliance_deadline);
                return deadline > now;
            })
            .sort((a, b) => new Date(a.compliance_deadline) - new Date(b.compliance_deadline))
            .slice(0, 10) // Next 10 deadlines
            .map(change => ({
                state: change.state_code,
                requirement: change.requirement_description,
                deadline: change.compliance_deadline,
                daysUntil: Math.ceil((new Date(change.compliance_deadline) - now) / (1000 * 60 * 60 * 24)),
                priority: change.impact_level
            }));
        
        return upcoming;
    }
    
    // Calculate risk distribution
    calculateRiskDistribution(riskData) {
        const distribution = {
            minimal: 0,    // 0-20
            low: 0,        // 21-40
            medium: 0,     // 41-60
            high: 0,       // 61-80
            critical: 0    // 81-100
        };
        
        riskData.forEach(data => {
            const score = data.risk_score;
            if (score <= 20) distribution.minimal++;
            else if (score <= 40) distribution.low++;
            else if (score <= 60) distribution.medium++;
            else if (score <= 80) distribution.high++;
            else distribution.critical++;
        });
        
        return distribution;
    }
    
    // Analyze risk factors
    analyzeRiskFactors(riskData) {
        const factors = {};
        
        riskData.forEach(assessment => {
            if (assessment.risk_factors) {
                Object.keys(assessment.risk_factors).forEach(factor => {
                    if (!factors[factor]) {
                        factors[factor] = {
                            totalScore: 0,
                            count: 0,
                            averageScore: 0
                        };
                    }
                    
                    factors[factor].totalScore += assessment.risk_factors[factor];
                    factors[factor].count++;
                });
            }
        });
        
        // Calculate averages
        Object.values(factors).forEach(factor => {
            factor.averageScore = factor.count > 0 ? factor.totalScore / factor.count : 0;
        });
        
        return factors;
    }
    
    // Analyze mitigation effectiveness
    analyzeMitigationEffectiveness(riskData) {
        const effectiveness = {
            totalMitigations: 0,
            successfulMitigations: 0,
            averageReduction: 0,
            effectivenessByType: {}
        };
        
        const reductions = [];
        
        riskData.forEach(assessment => {
            if (assessment.mitigation_actions) {
                assessment.mitigation_actions.forEach(action => {
                    effectiveness.totalMitigations++;
                    
                    if (action.successful) {
                        effectiveness.successfulMitigations++;
                        reductions.push(action.risk_reduction || 0);
                    }
                    
                    // Group by type
                    if (!effectiveness.effectivenessByType[action.action_type]) {
                        effectiveness.effectivenessByType[action.action_type] = {
                            total: 0,
                            successful: 0,
                            successRate: 0
                        };
                    }
                    
                    effectiveness.effectivenessByType[action.action_type].total++;
                    if (action.successful) {
                        effectiveness.effectivenessByType[action.action_type].successful++;
                    }
                });
            }
        });
        
        // Calculate success rates
        Object.values(effectiveness.effectivenessByType).forEach(type => {
            type.successRate = type.total > 0 ? (type.successful / type.total * 100) : 0;
        });
        
        effectiveness.averageReduction = reductions.length > 0
            ? reductions.reduce((sum, reduction) => sum + reduction, 0) / reductions.length
            : 0;
        
        return effectiveness;
    }
    
    // Generate insights
    generateInsights(complianceOverview, statePerformance, riskAnalysis) {
        const insights = [];
        
        // Compliance insights
        if (complianceOverview.averageCompliance < 70) {
            insights.push({
                type: 'compliance',
                level: 'critical',
                message: `Overall compliance is ${complianceOverview.averageCompliance}%, below acceptable threshold`,
                recommendation: 'Immediate action required to improve compliance across all states'
            });
        }
        
        // Performance insights
        const topPerformers = statePerformance.filter(s => s.rank <= 3);
        const bottomPerformers = statePerformance.filter(s => s.rank >= statePerformance.length - 2);
        
        if (topPerformers.length > 0) {
            insights.push({
                type: 'performance',
                level: 'positive',
                message: `Top performing states: ${topPerformers.map(s => s.stateCode).join(', ')}`,
                recommendation: 'Study best practices from top performing states'
            });
        }
        
        if (bottomPerformers.length > 0) {
            insights.push({
                type: 'performance',
                level: 'warning',
                message: `States needing attention: ${bottomPerformers.map(s => s.stateCode).join(', ')}`,
                recommendation: 'Focus improvement efforts on underperforming states'
            });
        }
        
        // Risk insights
        if (riskAnalysis.highRiskStates.length > 0) {
            insights.push({
                type: 'risk',
                level: 'critical',
                message: `${riskAnalysis.highRiskStates.length} states at high risk`,
                recommendation: 'Implement targeted risk mitigation strategies'
            });
        }
        
        return insights;
    }
    
    // Generate recommendations
    generateRecommendations(complianceOverview, riskAnalysis) {
        const recommendations = [];
        
        // Compliance recommendations
        if (complianceOverview.highRiskStates.length > 0) {
            recommendations.push({
                priority: 'high',
                category: 'compliance',
                action: 'Address high-risk states',
                description: `Focus on ${complianceOverview.highRiskStates.length} states with compliance scores below 60%`,
                estimatedImpact: '15-25% improvement in overall compliance',
                timeframe: '30-60 days'
            });
        }
        
        // Risk recommendations
        if (riskAnalysis.averageRiskScore > 60) {
            recommendations.push({
                priority: 'high',
                category: 'risk',
                action: 'Implement comprehensive risk mitigation',
                description: 'Average risk score exceeds acceptable threshold',
                estimatedImpact: '20-30% reduction in risk exposure',
                timeframe: '45-90 days'
            });
        }
        
        return recommendations;
    }
    
    // Get cached result
    getCachedResult(key) {
        const cached = this.analyticsCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        return null;
    }
    
    // Set cached result
    setCachedResult(key, data) {
        this.analyticsCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    // Clear cache
    clearCache() {
        this.analyticsCache.clear();
        console.log('State compliance analytics cache cleared');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateComplianceAnalytics;
} else {
    window.StateComplianceAnalytics = StateComplianceAnalytics;
}
