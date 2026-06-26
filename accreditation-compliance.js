// TrustMD Accreditation Compliance Module
// Comprehensive accreditation body compliance tracking and survey management system

class AccreditationComplianceManager {
    constructor(supabaseClient, tenantId) {
        this.supabaseClient = supabaseClient;
        this.tenantId = tenantId;
        this.accreditationData = {
            accreditationBodies: [],
            surveys: [],
            standards: [],
            findings: [],
            correctiveActions: [],
            continuousReadiness: [],
            alerts: [],
            complianceScores: [],
            performanceImprovement: []
        };
    }

    // Initialize accreditation compliance module
    async initialize() {
        try {
            console.log('Initializing Accreditation Compliance Manager...');
            
            // Load all accreditation compliance data
            await this.loadAccreditationData();
            
            // Calculate compliance scores
            await this.calculateComplianceScores();
            
            // Generate alerts for upcoming deadlines
            await this.generateAlerts();
            
            console.log('Accreditation Compliance Manager initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing Accreditation Compliance Manager:', error);
            return false;
        }
    }

    // Load all accreditation compliance data
    async loadAccreditationData() {
        try {
            const [
                accreditationBodies,
                surveys,
                standards,
                findings,
                correctiveActions,
                continuousReadiness,
                alerts,
                complianceScores,
                performanceImprovement
            ] = await Promise.all([
                this.loadAccreditationBodies(),
                this.loadSurveys(),
                this.loadStandards(),
                this.loadFindings(),
                this.loadCorrectiveActions(),
                this.loadContinuousReadiness(),
                this.loadAccreditationAlerts(),
                this.loadComplianceScores(),
                this.loadPerformanceImprovement()
            ]);

            this.accreditationData = {
                accreditationBodies,
                surveys,
                standards,
                findings,
                correctiveActions,
                continuousReadiness,
                alerts,
                complianceScores,
                performanceImprovement
            };

            return this.accreditationData;
        } catch (error) {
            console.error('Error loading accreditation data:', error);
            throw error;
        }
    }

    // Load accreditation bodies
    async loadAccreditationBodies() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('accreditation_bodies')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .order('expiration_date', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading accreditation bodies:', error);
            return [];
        }
    }

    // Load surveys
    async loadSurveys() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('accreditation_surveys')
                .select(`
                    *,
                    accreditation_bodies (
                        id,
                        body_name,
                        body_display_name
                    )
                `)
                .eq('tenant_id', this.tenantId)
                .order('survey_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading surveys:', error);
            return [];
        }
    }

    // Load standards
    async loadStandards() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('accreditation_standards')
                .select(`
                    *,
                    accreditation_bodies (
                        id,
                        body_name,
                        body_display_name
                    )
                `)
                .eq('tenant_id', this.tenantId)
                .order('standard_code', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading standards:', error);
            return [];
        }
    }

    // Load findings
    async loadFindings() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('accreditation_findings')
                .select(`
                    *,
                    surveys (
                        id,
                        survey_type,
                        survey_date
                    ),
                    standards (
                        id,
                        standard_code,
                        standard_title
                    )
                `)
                .eq('tenant_id', this.tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading findings:', error);
            return [];
        }
    }

    // Load corrective actions
    async loadCorrectiveActions() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('corrective_action_plans')
                .select(`
                    *,
                    findings (
                        id,
                        finding_title,
                        finding_type,
                        severity
                    )
                `)
                .eq('tenant_id', this.tenantId)
                .order('completion_date', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading corrective actions:', error);
            return [];
        }
    }

    // Load continuous readiness activities
    async loadContinuousReadiness() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('continuous_readiness_activities')
                .select(`
                    *,
                    accreditation_bodies (
                        id,
                        body_name,
                        body_display_name
                    )
                `)
                .eq('tenant_id', this.tenantId)
                .order('activity_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading continuous readiness activities:', error);
            return [];
        }
    }

    // Load accreditation alerts
    async loadAccreditationAlerts() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('accreditation_compliance_alerts')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading accreditation alerts:', error);
            return [];
        }
    }

    // Load compliance scores
    async loadComplianceScores() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('accreditation_compliance_scores')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .order('calculated_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading compliance scores:', error);
            return [];
        }
    }

    // Load performance improvement projects
    async loadPerformanceImprovement() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('performance_improvement_projects')
                .select(`
                    *,
                    standards (
                        id,
                        standard_code,
                        standard_title
                    )
                `)
                .eq('tenant_id', this.tenantId)
                .order('start_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading performance improvement projects:', error);
            return [];
        }
    }

    // Calculate comprehensive accreditation compliance score
    async calculateComplianceScores() {
        try {
            const standardsCompliance = this.calculateStandardsCompliance();
            const surveyReadiness = this.calculateSurveyReadiness();
            const correctiveActions = this.calculateCorrectiveActionCompliance();
            const continuousReadiness = this.calculateContinuousReadinessCompliance();

            const overallScore = Math.round(
                standardsCompliance.score * 0.35 +
                surveyReadiness.score * 0.25 +
                correctiveActions.score * 0.25 +
                continuousReadiness.score * 0.15
            );

            const complianceData = {
                overallScore,
                status: this.getComplianceStatus(overallScore),
                breakdown: {
                    standards: standardsCompliance,
                    surveyReadiness,
                    correctiveActions,
                    continuousReadiness
                },
                calculatedAt: new Date().toISOString()
            };

            // Save compliance score to database
            await this.saveComplianceScore(complianceData);

            return complianceData;
        } catch (error) {
            console.error('Error calculating compliance scores:', error);
            return null;
        }
    }

    // Calculate standards compliance
    calculateStandardsCompliance() {
        const standards = this.accreditationData.standards;
        
        let score = 100;
        let issues = [];

        if (standards.length === 0) {
            score = 0;
            issues.push({
                priority: 'critical',
                category: 'Standards',
                description: 'No accreditation standards loaded',
                action: 'Load accreditation standards for compliance tracking'
            });
        } else {
            const compliantStandards = standards.filter(standard => 
                standard.compliance_level === 'compliant'
            );

            const complianceRate = (compliantStandards.length / standards.length) * 100;
            score = Math.round(complianceRate);

            // Check for non-compliant standards
            const nonCompliantStandards = standards.filter(standard => 
                standard.compliance_level === 'non_compliant'
            );

            if (nonCompliantStandards.length > 0) {
                issues.push({
                    priority: 'critical',
                    category: 'Standards',
                    description: `${nonCompliantStandards.length} non-compliant standard(s) identified`,
                    action: 'Address non-compliant standards immediately'
                });
            }

            // Check for partially compliant standards
            const partiallyCompliant = standards.filter(standard => 
                standard.compliance_level === 'partial_compliance'
            );

            if (partiallyCompliant.length > 0) {
                issues.push({
                    priority: 'high',
                    category: 'Standards',
                    description: `${partiallyCompliant.length} partially compliant standard(s) identified`,
                    action: 'Complete compliance for partially compliant standards'
                });
            }

            // Check for unassessed standards
            const notAssessed = standards.filter(standard => 
                standard.compliance_level === 'not_assessed'
            );

            if (notAssessed.length > 0) {
                issues.push({
                    priority: 'medium',
                    category: 'Standards',
                    description: `${notAssessed.length} standard(s) not assessed`,
                    action: 'Complete assessment of all standards'
                });
            }
        }

        return {
            score,
            total: standards.length,
            compliant: standards.filter(s => s.compliance_level === 'compliant').length,
            nonCompliant: standards.filter(s => s.compliance_level === 'non_compliant').length,
            issues
        };
    }

    // Calculate survey readiness
    calculateSurveyReadiness() {
        const surveys = this.accreditationData.surveys;
        const upcomingSurveys = surveys.filter(survey => 
            survey.survey_status === 'scheduled' && new Date(survey.survey_date) > new Date()
        );
        
        let score = 100;
        let issues = [];

        if (upcomingSurveys.length === 0) {
            score = 80; // Good score if no immediate surveys
            issues.push({
                priority: 'low',
                category: 'Survey Readiness',
                description: 'No upcoming surveys scheduled',
                action: 'Maintain continuous readiness'
            });
        } else {
            // Check preparation time
            upcomingSurveys.forEach(survey => {
                const daysUntilSurvey = Math.floor((new Date(survey.survey_date) - new Date()) / (1000 * 60 * 60 * 24));
                
                if (daysUntilSurvey <= 30 && !survey.preparation_start_date) {
                    score -= 20;
                    issues.push({
                        priority: 'critical',
                        category: 'Survey Readiness',
                        description: `Survey in ${daysUntilSurvey} days without preparation start date`,
                        action: 'Begin survey preparation immediately'
                    });
                } else if (daysUntilSurvey <= 60 && !survey.preparation_start_date) {
                    score -= 10;
                    issues.push({
                        priority: 'high',
                        category: 'Survey Readiness',
                        description: `Survey in ${daysUntilSurvey} days without preparation start date`,
                        action: 'Schedule survey preparation'
                    });
                }
            });

            // Check for failed surveys
            const failedSurveys = surveys.filter(survey => 
                survey.survey_status === 'failed' || survey.survey_status === 'conditional'
            );

            if (failedSurveys.length > 0) {
                score -= 30;
                issues.push({
                    priority: 'critical',
                    category: 'Survey Readiness',
                    description: `${failedSurveys.length} failed/conditional survey(s) in history`,
                    action: 'Address all survey findings immediately'
                });
            }
        }

        return {
            score: Math.max(0, score),
            upcoming: upcomingSurveys.length,
            failed: surveys.filter(s => s.survey_status === 'failed').length,
            issues
        };
    }

    // Calculate corrective action compliance
    calculateCorrectiveActionCompliance() {
        const findings = this.accreditationData.findings;
        const correctiveActions = this.accreditationData.correctiveActions;
        
        let score = 100;
        let issues = [];

        // Check for findings requiring corrective actions
        const findingsNeedingAction = findings.filter(finding => 
            finding.corrective_action_required && finding.status !== 'resolved'
        );

        if (findingsNeedingAction.length === 0) {
            // No findings requiring action - good score
            score = 100;
        } else {
            // Check for overdue corrective actions
            const overdueActions = correctiveActions.filter(action => 
                action.status === 'overdue' || 
                (action.completion_date && new Date(action.completion_date) < new Date() && action.status !== 'completed')
            );

            if (overdueActions.length > 0) {
                score -= overdueActions.length * 15;
                issues.push({
                    priority: 'critical',
                    category: 'Corrective Actions',
                    description: `${overdueActions.length} overdue corrective action(s)`,
                    action: 'Complete overdue corrective actions immediately'
                });
            }

            // Check for in-progress actions
            const inProgressActions = correctiveActions.filter(action => 
                action.status === 'in_progress'
            );

            if (inProgressActions.length > 0) {
                score -= inProgressActions.length * 5;
                issues.push({
                    priority: 'medium',
                    category: 'Corrective Actions',
                    description: `${inProgressActions.length} corrective action(s) in progress`,
                    action: 'Complete in-progress corrective actions'
                });
            }

            // Check for unverified actions
            const completedButNotVerified = correctiveActions.filter(action => 
                action.status === 'completed'
            );

            if (completedButNotVerified.length > 0) {
                score -= completedButNotVerified.length * 3;
                issues.push({
                    priority: 'low',
                    category: 'Corrective Actions',
                    description: `${completedButNotVerified.length} completed action(s) need verification`,
                    action: 'Verify effectiveness of completed corrective actions'
                });
            }
        }

        return {
            score: Math.max(0, score),
            totalFindings: findings.length,
            openFindings: findingsNeedingAction.length,
            overdueActions: correctiveActions.filter(a => a.status === 'overdue').length,
            issues
        };
    }

    // Calculate continuous readiness compliance
    calculateContinuousReadinessCompliance() {
        const activities = this.accreditationData.continuousReadiness;
        
        let score = 100;
        let issues = [];

        if (activities.length === 0) {
            score = 0;
            issues.push({
                priority: 'high',
                category: 'Continuous Readiness',
                description: 'No continuous readiness activities conducted',
                action: 'Implement continuous readiness program'
            });
        } else {
            // Check recent activities
            const recentActivities = activities.filter(activity => {
                const activityDate = new Date(activity.activity_date);
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                return activityDate > threeMonthsAgo;
            });

            if (recentActivities.length < 2) {
                score -= 20;
                issues.push({
                    priority: 'medium',
                    category: 'Continuous Readiness',
                    description: 'Insufficient continuous readiness activities',
                    action: 'Increase frequency of readiness activities'
                });
            }

            // Check readiness scores
            const lowReadinessScores = recentActivities.filter(activity => 
                activity.readiness_score && activity.readiness_score < 80
            );

            if (lowReadinessScores.length > 0) {
                score -= lowReadinessScores.length * 10;
                issues.push({
                    priority: 'high',
                    category: 'Continuous Readiness',
                    description: `${lowReadinessScores.length} activity(ies) with low readiness scores`,
                    action: 'Address readiness gaps identified in activities'
                });
            }

            // Check for follow-up items
            const needingFollowUp = recentActivities.filter(activity => 
                activity.follow_up_required && (!activity.follow_up_date || new Date(activity.follow_up_date) < new Date())
            );

            if (needingFollowUp.length > 0) {
                score -= needingFollowUp.length * 5;
                issues.push({
                    priority: 'medium',
                    category: 'Continuous Readiness',
                    description: `${needingFollowUp.length} activity follow-up item(s) overdue`,
                    action: 'Complete follow-up items from readiness activities'
                });
            }
        }

        return {
            score: Math.max(0, score),
            totalActivities: activities.length,
            recentActivities: activities.filter(a => {
                const activityDate = new Date(a.activity_date);
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                return activityDate > threeMonthsAgo;
            }).length,
            averageReadinessScore: activities.length > 0 ? 
                Math.round(activities.reduce((sum, a) => sum + (a.readiness_score || 0), 0) / activities.length) : 0,
            issues
        };
    }

    // Get compliance status based on score
    getComplianceStatus(score) {
        if (score >= 95) return 'Excellent';
        if (score >= 85) return 'Good';
        if (score >= 75) return 'Fair';
        if (score >= 65) return 'Poor';
        return 'Critical';
    }

    // Save compliance score to database
    async saveComplianceScore(complianceData) {
        try {
            const { error } = await this.supabaseClient.supabase
                .from('accreditation_compliance_scores')
                .insert({
                    tenant_id: this.tenantId,
                    score: complianceData.overallScore,
                    category: 'overall',
                    factors: complianceData.breakdown,
                    trend_direction: this.calculateTrendDirection(complianceData.overallScore)
                });

            if (error) throw error;
            console.log('Accreditation compliance score saved successfully');
        } catch (error) {
            console.error('Error saving compliance score:', error);
        }
    }

    // Calculate trend direction based on recent scores
    calculateTrendDirection(currentScore) {
        const recentScores = this.accreditationData.complianceScores.slice(0, 5);
        if (recentScores.length < 2) return 'stable';

        const averageRecent = recentScores.reduce((sum, score) => sum + score.score, 0) / recentScores.length;
        
        if (currentScore > averageRecent + 5) return 'improving';
        if (currentScore < averageRecent - 5) return 'declining';
        return 'stable';
    }

    // Generate alerts for upcoming deadlines and issues
    async generateAlerts() {
        try {
            const alerts = [];

            // Check for upcoming surveys
            const upcomingSurveys = this.accreditationData.surveys.filter(survey => 
                survey.survey_status === 'scheduled' && new Date(survey.survey_date) > new Date()
            );

            upcomingSurveys.forEach(survey => {
                const daysUntilSurvey = Math.floor((new Date(survey.survey_date) - new Date()) / (1000 * 60 * 60 * 24));
                
                if (daysUntilSurvey <= 90) {
                    alerts.push({
                        tenant_id: this.tenantId,
                        alert_type: 'survey_scheduled',
                        title: `Upcoming ${survey.accreditation_bodies?.body_display_name || 'Accreditation'} Survey`,
                        description: `Survey scheduled in ${daysUntilSurvey} days`,
                        severity: daysUntilSurvey <= 30 ? 'critical' : 'high',
                        due_date: survey.survey_date
                    });
                }
            });

            // Check for expiring accreditations
            this.accreditationData.accreditationBodies.forEach(body => {
                if (!body.expiration_date) return;

                const daysUntilExpiry = Math.floor((new Date(body.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
                
                if (daysUntilExpiry <= 180 && daysUntilExpiry > 0) {
                    alerts.push({
                        tenant_id: this.tenantId,
                        alert_type: 'accreditation_expiring',
                        title: `${body.body_display_name} Accreditation Expiring`,
                        description: `Accreditation expires in ${daysUntilExpiry} days`,
                        severity: daysUntilExpiry <= 60 ? 'critical' : 'high',
                        due_date: body.expiration_date
                    });
                }
            });

            // Check for overdue corrective actions
            const overdueActions = this.accreditationData.correctiveActions.filter(action => 
                action.status === 'overdue' || 
                (action.completion_date && new Date(action.completion_date) < new Date() && action.status !== 'completed')
            );

            overdueActions.forEach(action => {
                alerts.push({
                    tenant_id: this.tenantId,
                    alert_type: 'corrective_action_due',
                    title: 'Overdue Corrective Action',
                    description: `Corrective action for ${action.findings?.finding_title || 'survey finding'} is overdue`,
                    severity: 'critical',
                    due_date: action.completion_date
                });
            });

            // Save alerts to database
            if (alerts.length > 0) {
                await this.supabaseClient.supabase
                    .from('accreditation_compliance_alerts')
                    .insert(alerts);
            }

            console.log(`Generated ${alerts.length} accreditation compliance alerts`);
        } catch (error) {
            console.error('Error generating alerts:', error);
        }
    }

    // Generate comprehensive accreditation compliance report
    async generateComplianceReport() {
        try {
            const complianceScores = await this.calculateComplianceScores();
            
            return {
                summary: {
                    overallScore: complianceScores.overallScore,
                    status: complianceScores.status,
                    totalAccreditationBodies: this.accreditationData.accreditationBodies.length,
                    activeAccreditations: this.accreditationData.accreditationBodies.filter(b => b.status === 'active').length,
                    upcomingSurveys: this.accreditationData.surveys.filter(s => 
                        s.survey_status === 'scheduled' && new Date(s.survey_date) > new Date()
                    ).length,
                    openFindings: this.accreditationData.findings.filter(f => f.status !== 'resolved').length,
                    activeAlerts: this.accreditationData.alerts.length,
                    performanceImprovementProjects: this.accreditationData.performanceImprovement.length
                },
                breakdown: complianceScores.breakdown,
                urgentIssues: this.getUrgentIssues(complianceScores.breakdown),
                upcomingDeadlines: this.getUpcomingDeadlines(),
                recommendations: this.generateRecommendations(complianceScores),
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error generating compliance report:', error);
            return null;
        }
    }

    // Get urgent issues from compliance breakdown
    getUrgentIssues(breakdown) {
        const issues = [];
        
        Object.values(breakdown).forEach(category => {
            if (category.issues) {
                issues.push(...category.issues.filter(issue => 
                    issue.priority === 'critical' || issue.priority === 'high'
                ));
            }
        });

        return issues.sort((a, b) => {
            const priority = { critical: 4, high: 3, medium: 2, low: 1 };
            return priority[b.priority] - priority[a.priority];
        });
    }

    // Get upcoming deadlines
    getUpcomingDeadlines() {
        const deadlines = [];
        const now = new Date();

        // Survey deadlines
        this.accreditationData.surveys
            .filter(survey => survey.survey_status === 'scheduled' && new Date(survey.survey_date) > now)
            .forEach(survey => {
                deadlines.push({
                    type: 'Survey',
                    description: `${survey.accreditation_bodies?.body_display_name || 'Accreditation'} Survey`,
                    dueDate: survey.survey_date,
                    daysUntil: Math.floor((new Date(survey.survey_date) - now) / (1000 * 60 * 60 * 24))
                });
            });

        // Accreditation expiration deadlines
        this.accreditationData.accreditationBodies
            .filter(body => body.expiration_date && new Date(body.expiration_date) > now)
            .forEach(body => {
                deadlines.push({
                    type: 'Accreditation Expiration',
                    description: `${body.body_display_name} Accreditation`,
                    dueDate: body.expiration_date,
                    daysUntil: Math.floor((new Date(body.expiration_date) - now) / (1000 * 60 * 60 * 24))
                });
            });

        // Corrective action deadlines
        this.accreditationData.correctiveActions
            .filter(action => action.completion_date && new Date(action.completion_date) > now && action.status !== 'completed')
            .forEach(action => {
                deadlines.push({
                    type: 'Corrective Action',
                    description: action.findings?.finding_title || 'Survey Finding Corrective Action',
                    dueDate: action.completion_date,
                    daysUntil: Math.floor((new Date(action.completion_date) - now) / (1000 * 60 * 60 * 24))
                });
            });

        return deadlines.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 10);
    }

    // Generate actionable recommendations
    generateRecommendations(complianceScores) {
        const recommendations = [];
        const breakdown = complianceScores.breakdown;

        // Standards compliance recommendations
        if (breakdown.standards.score < 100) {
            recommendations.push({
                priority: 'high',
                category: 'Standards',
                title: 'Address Non-Compliant Standards',
                description: 'Complete compliance assessment and address all non-compliant standards',
                estimatedCost: '$5,000-20,000 depending on gaps',
                timeframe: '60-90 days'
            });
        }

        // Survey readiness recommendations
        if (breakdown.surveyReadiness.score < 100) {
            recommendations.push({
                priority: 'critical',
                category: 'Survey Readiness',
                title: 'Enhance Survey Preparation',
                description: 'Implement comprehensive survey preparation program',
                estimatedCost: '$10,000-50,000 for preparation activities',
                timeframe: '30-180 days'
            });
        }

        // Corrective action recommendations
        if (breakdown.correctiveActions.score < 100) {
            recommendations.push({
                priority: 'critical',
                category: 'Corrective Actions',
                title: 'Complete Corrective Actions',
                description: 'Address all survey findings and complete required corrective actions',
                estimatedCost: 'Varies by findings',
                timeframe: 'Immediate'
            });
        }

        // Continuous readiness recommendations
        if (breakdown.continuousReadiness.score < 100) {
            recommendations.push({
                priority: 'medium',
                category: 'Continuous Readiness',
                title: 'Strengthen Continuous Readiness',
                description: 'Implement ongoing readiness activities and monitoring',
                estimatedCost: '$5,000-15,000 annually',
                timeframe: 'Ongoing'
            });
        }

        return recommendations;
    }

    // Add accreditation body
    async addAccreditationBody(bodyData) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('accreditation_bodies')
                .insert({
                    tenant_id: this.tenantId,
                    ...bodyData
                })
                .select()
                .single();

            if (error) throw error;
            
            // Refresh data
            await this.loadAccreditationData();
            
            return data;
        } catch (error) {
            console.error('Error adding accreditation body:', error);
            throw error;
        }
    }

    // Add survey
    async addSurvey(surveyData) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('accreditation_surveys')
                .insert({
                    tenant_id: this.tenantId,
                    ...surveyData
                })
                .select()
                .single();

            if (error) throw error;
            
            // Refresh data
            await this.loadAccreditationData();
            
            return data;
        } catch (error) {
            console.error('Error adding survey:', error);
            throw error;
        }
    }

    // Add finding
    async addFinding(findingData) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('accreditation_findings')
                .insert({
                    tenant_id: this.tenantId,
                    ...findingData
                })
                .select()
                .single();

            if (error) throw error;
            
            // Refresh data
            await this.loadAccreditationData();
            
            return data;
        } catch (error) {
            console.error('Error adding finding:', error);
            throw error;
        }
    }

    // Add corrective action
    async addCorrectiveAction(actionData) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('corrective_action_plans')
                .insert({
                    tenant_id: this.tenantId,
                    ...actionData
                })
                .select()
                .single();

            if (error) throw error;
            
            // Refresh data
            await this.loadAccreditationData();
            
            return data;
        } catch (error) {
            console.error('Error adding corrective action:', error);
            throw error;
        }
    }

    // Get dashboard data
    getDashboardData() {
        const complianceScores = this.calculateComplianceScores();
        
        return {
            overallScore: complianceScores.overallScore,
            status: complianceScores.status,
            activeAccreditations: this.accreditationData.accreditationBodies.filter(b => b.status === 'active').length,
            upcomingSurveys: this.accreditationData.surveys.filter(s => 
                s.survey_status === 'scheduled' && new Date(s.survey_date) > new Date()
            ).length,
            openFindings: this.accreditationData.findings.filter(f => f.status !== 'resolved').length,
            activeAlerts: this.accreditationData.alerts.length,
            criticalAlerts: this.accreditationData.alerts.filter(a => a.severity === 'critical').length,
            performanceImprovementProjects: this.accreditationData.performanceImprovement.length,
            upcomingDeadlines: this.getUpcomingDeadlines().slice(0, 5),
            complianceTrend: this.calculateTrendDirection(complianceScores.overallScore)
        };
    }
}

// Export for use in main application
window.AccreditationComplianceManager = AccreditationComplianceManager;
