// TrustMD DEA Compliance Module
// Comprehensive DEA registration and compliance tracking system

class DEAComplianceManager {
    constructor(supabaseClient, tenantId) {
        this.supabaseClient = supabaseClient;
        this.tenantId = tenantId;
        this.deaData = {
            registrations: [],
            trainingRecords: [],
            inspections: [],
            diversionPrograms: [],
            alerts: [],
            complianceScores: []
        };
    }

    // Initialize DEA compliance module
    async initialize() {
        try {
            console.log('Initializing DEA Compliance Manager...');
            
            // Load all DEA compliance data
            await this.loadDEAData();
            
            // Calculate compliance scores
            await this.calculateComplianceScores();
            
            // Generate alerts for upcoming deadlines
            await this.generateAlerts();
            
            console.log('DEA Compliance Manager initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing DEA Compliance Manager:', error);
            return false;
        }
    }

    // Load all DEA compliance data
    async loadDEAData() {
        try {
            const [
                registrations,
                trainingRecords,
                inspections,
                diversionPrograms,
                alerts,
                complianceScores
            ] = await Promise.all([
                this.loadDEARegistrations(),
                this.loadDEATrainingRecords(),
                this.loadDEAInspections(),
                this.loadDiversionPrograms(),
                this.loadDEAAlerts(),
                this.loadComplianceScores()
            ]);

            this.deaData = {
                registrations,
                trainingRecords,
                inspections,
                diversionPrograms,
                alerts,
                complianceScores
            };

            return this.deaData;
        } catch (error) {
            console.error('Error loading DEA data:', error);
            throw error;
        }
    }

    // Load DEA registrations
    async loadDEARegistrations() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('dea_registrations')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .order('expiration_date', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading DEA registrations:', error);
            return [];
        }
    }

    // Load DEA training records
    async loadDEATrainingRecords() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('dea_training_records')
                .select(`
                    *,
                    dea_training_requirements (
                        id,
                        training_type,
                        title,
                        description,
                        frequency,
                        dea_mandated
                    )
                `)
                .eq('tenant_id', this.tenantId)
                .order('completion_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading DEA training records:', error);
            return [];
        }
    }

    // Load DEA inspections
    async loadDEAInspections() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('dea_inspections')
                .select(`
                    *,
                    dea_registrations (
                        id,
                        dea_number,
                        business_activity
                    )
                `)
                .eq('tenant_id', this.tenantId)
                .order('inspection_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading DEA inspections:', error);
            return [];
        }
    }

    // Load diversion prevention programs
    async loadDiversionPrograms() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('dea_diversion_prevention')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .order('next_review_date', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading diversion programs:', error);
            return [];
        }
    }

    // Load DEA alerts
    async loadDEAAlerts() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('dea_compliance_alerts')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading DEA alerts:', error);
            return [];
        }
    }

    // Load compliance scores
    async loadComplianceScores() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('dea_compliance_scores')
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

    // Calculate comprehensive DEA compliance score
    async calculateComplianceScores() {
        try {
            const registrationScore = this.calculateRegistrationCompliance();
            const trainingScore = this.calculateTrainingCompliance();
            const inspectionScore = this.calculateInspectionCompliance();
            const diversionScore = this.calculateDiversionPreventionCompliance();

            const overallScore = Math.round(
                registrationScore.score * 0.3 +
                trainingScore.score * 0.25 +
                inspectionScore.score * 0.25 +
                diversionScore.score * 0.2
            );

            const complianceData = {
                overallScore,
                status: this.getComplianceStatus(overallScore),
                breakdown: {
                    registration: registrationScore,
                    training: trainingScore,
                    inspections: inspectionScore,
                    diversionPrevention: diversionScore
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

    // Calculate registration compliance
    calculateRegistrationCompliance() {
        const registrations = this.deaData.registrations;
        const activeRegistrations = registrations.filter(reg => 
            reg.status === 'active' && new Date(reg.expiration_date) > new Date()
        );

        let score = 0;
        let issues = [];

        if (registrations.length === 0) {
            score = 0;
            issues.push({
                priority: 'critical',
                category: 'Registration',
                description: 'No DEA registrations found',
                action: 'Register with DEA for controlled substance prescribing'
            });
        } else {
            const activeRate = (activeRegistrations.length / registrations.length) * 100;
            score = Math.round(activeRate);

            // Check for expiring registrations
            const expiringSoon = activeRegistrations.filter(reg => {
                const daysUntilExpiry = Math.floor((new Date(reg.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
                return daysUntilExpiry <= 90;
            });

            if (expiringSoon.length > 0) {
                issues.push({
                    priority: 'high',
                    category: 'Registration',
                    description: `${expiringSoon.length} DEA registration(s) expiring within 90 days`,
                    action: 'Renew expiring DEA registrations'
                });
            }
        }

        return {
            score,
            total: registrations.length,
            active: activeRegistrations.length,
            issues
        };
    }

    // Calculate training compliance
    calculateTrainingCompliance() {
        const trainingRecords = this.deaData.trainingRecords;
        const now = new Date();
        
        // Group training by type
        const trainingByType = {};
        trainingRecords.forEach(record => {
            const type = record.dea_training_requirements?.training_type || 'unknown';
            if (!trainingByType[type]) {
                trainingByType[type] = [];
            }
            trainingByType[type].push(record);
        });

        let score = 0;
        let issues = [];
        const requiredTrainings = ['dea_controlled_substances', 'diversion_prevention'];

        requiredTrainings.forEach(type => {
            const records = trainingByType[type] || [];
            const currentRecords = records.filter(record => {
                if (!record.expiration_date) return true;
                return new Date(record.expiration_date) > now;
            });

            if (currentRecords.length === 0) {
                issues.push({
                    priority: 'high',
                    category: 'Training',
                    description: `Missing required ${type.replace(/_/g, ' ')} training`,
                    action: `Complete ${type.replace(/_/g, ' ')} training`
                });
            } else {
                // Check for expiring training
                const expiringSoon = currentRecords.filter(record => {
                    if (!record.expiration_date) return false;
                    const daysUntilExpiry = Math.floor((new Date(record.expiration_date) - now) / (1000 * 60 * 60 * 24));
                    return daysUntilExpiry <= 30;
                });

                if (expiringSoon.length > 0) {
                    issues.push({
                        priority: 'medium',
                        category: 'Training',
                        description: `${type.replace(/_/g, ' ')} training expiring soon`,
                        action: `Renew ${type.replace(/_/g, ' ')} training`
                    });
                }
            }
        });

        // Calculate score based on completion of required trainings
        const completedRequired = requiredTrainings.filter(type => {
            const records = trainingByType[type] || [];
            return records.some(record => {
                if (!record.expiration_date) return true;
                return new Date(record.expiration_date) > now;
            });
        }).length;

        score = Math.round((completedRequired / requiredTrainings.length) * 100);

        return {
            score,
            required: requiredTrainings.length,
            completed: completedRequired,
            issues
        };
    }

    // Calculate inspection compliance
    calculateInspectionCompliance() {
        const inspections = this.deaData.inspections;
        const recentInspections = inspections.filter(inspection => {
            const inspectionDate = new Date(inspection.inspection_date);
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            return inspectionDate > oneYearAgo;
        });

        let score = 100; // Start with perfect score
        let issues = [];

        // Check for failed inspections
        const failedInspections = recentInspections.filter(inspection => 
            inspection.compliance_status === 'non_compliant'
        );

        if (failedInspections.length > 0) {
            score -= 30;
            issues.push({
                priority: 'critical',
                category: 'Inspections',
                description: `${failedInspections.length} failed DEA inspection(s) in past year`,
                action: 'Address all inspection violations immediately'
            });
        }

        // Check for pending corrective actions
        const pendingActions = recentInspections.filter(inspection => 
            inspection.compliance_status === 'pending_correction' &&
            inspection.follow_up_date && new Date(inspection.follow_up_date) < new Date()
        );

        if (pendingActions.length > 0) {
            score -= 20;
            issues.push({
                priority: 'high',
                category: 'Inspections',
                description: `${pendingActions.length} overdue corrective action(s)`,
                action: 'Complete all required corrective actions'
            });
        }

        return {
            score: Math.max(0, score),
            total: inspections.length,
            recent: recentInspections.length,
            failed: failedInspections.length,
            issues
        };
    }

    // Calculate diversion prevention compliance
    calculateDiversionPreventionCompliance() {
        const programs = this.deaData.diversionPrograms;
        const activePrograms = programs.filter(program => 
            program.status === 'active'
        );

        let score = 0;
        let issues = [];
        const requiredPrograms = [
            'access_controls',
            'record_keeping',
            'inventory_management',
            'waste_disposal'
        ];

        if (programs.length === 0) {
            score = 0;
            issues.push({
                priority: 'critical',
                category: 'Diversion Prevention',
                description: 'No diversion prevention programs implemented',
                action: 'Implement required diversion prevention programs'
            });
        } else {
            const implementedRequired = requiredPrograms.filter(type => 
                activePrograms.some(program => program.program_type === type)
            ).length;

            score = Math.round((implementedRequired / requiredPrograms.length) * 100);

            // Check for programs needing review
            const needingReview = activePrograms.filter(program => 
                program.next_review_date && new Date(program.next_review_date) <= new Date()
            );

            if (needingReview.length > 0) {
                issues.push({
                    priority: 'medium',
                    category: 'Diversion Prevention',
                    description: `${needingReview.length} diversion prevention program(s) need review`,
                    action: 'Review and update diversion prevention programs'
                });
            }
        }

        return {
            score,
            required: requiredPrograms.length,
            implemented: implementedRequired,
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
                .from('dea_compliance_scores')
                .insert({
                    tenant_id: this.tenantId,
                    score: complianceData.overallScore,
                    category: 'overall',
                    factors: complianceData.breakdown,
                    trend_direction: this.calculateTrendDirection(complianceData.overallScore)
                });

            if (error) throw error;
            console.log('DEA compliance score saved successfully');
        } catch (error) {
            console.error('Error saving compliance score:', error);
        }
    }

    // Calculate trend direction based on recent scores
    calculateTrendDirection(currentScore) {
        const recentScores = this.deaData.complianceScores.slice(0, 5);
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

            // Check for expiring registrations
            this.deaData.registrations.forEach(registration => {
                if (registration.status !== 'active') return;

                const daysUntilExpiry = Math.floor((new Date(registration.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
                
                if (daysUntilExpiry <= 90 && daysUntilExpiry > 0) {
                    alerts.push({
                        tenant_id: this.tenantId,
                        alert_type: 'expiration_warning',
                        title: `DEA Registration Expiring Soon`,
                        description: `DEA registration ${registration.dea_number} expires in ${daysUntilExpiry} days`,
                        severity: daysUntilExpiry <= 30 ? 'critical' : 'high',
                        due_date: registration.expiration_date
                    });
                }
            });

            // Check for overdue training
            const overdueTraining = this.identifyOverdueTraining();
            overdueTraining.forEach(training => {
                alerts.push({
                    tenant_id: this.tenantId,
                    alert_type: 'training_due',
                    title: 'DEA Training Required',
                    description: `${training.type} training is overdue or missing`,
                    severity: 'high',
                    due_date: new Date().toISOString().split('T')[0]
                });
            });

            // Save alerts to database
            if (alerts.length > 0) {
                await this.supabaseClient.supabase
                    .from('dea_compliance_alerts')
                    .insert(alerts);
            }

            console.log(`Generated ${alerts.length} DEA compliance alerts`);
        } catch (error) {
            console.error('Error generating alerts:', error);
        }
    }

    // Identify overdue training
    identifyOverdueTraining() {
        const overdue = [];
        const trainingRecords = this.deaData.trainingRecords;
        const now = new Date();

        // Check for required trainings
        const requiredTrainings = ['dea_controlled_substances', 'diversion_prevention'];
        
        requiredTrainings.forEach(type => {
            const records = trainingRecords.filter(record => 
                record.dea_training_requirements?.training_type === type
            );

            const currentRecords = records.filter(record => {
                if (!record.expiration_date) return true;
                return new Date(record.expiration_date) > now;
            });

            if (currentRecords.length === 0) {
                overdue.push({ type: type.replace(/_/g, ' ') });
            }
        });

        return overdue;
    }

    // Generate comprehensive DEA compliance report
    async generateComplianceReport() {
        try {
            const complianceScores = await this.calculateComplianceScores();
            
            return {
                summary: {
                    overallScore: complianceScores.overallScore,
                    status: complianceScores.status,
                    totalRegistrations: this.deaData.registrations.length,
                    activeRegistrations: this.deaData.registrations.filter(r => r.status === 'active').length,
                    activeAlerts: this.deaData.alerts.length,
                    lastInspection: this.deaData.inspections.length > 0 ? 
                        this.deaData.inspections[0].inspection_date : null
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

        // Registration expirations
        this.deaData.registrations
            .filter(reg => reg.status === 'active' && new Date(reg.expiration_date) > now)
            .forEach(reg => {
                deadlines.push({
                    type: 'Registration Renewal',
                    description: `DEA registration ${registration.dea_number}`,
                    dueDate: reg.expiration_date,
                    daysUntil: Math.floor((new Date(reg.expiration_date) - now) / (1000 * 60 * 60 * 24))
                });
            });

        // Training expirations
        this.deaData.trainingRecords
            .filter(record => record.expiration_date && new Date(record.expiration_date) > now)
            .forEach(record => {
                deadlines.push({
                    type: 'Training Renewal',
                    description: record.dea_training_requirements?.title || 'DEA Training',
                    dueDate: record.expiration_date,
                    daysUntil: Math.floor((new Date(record.expiration_date) - now) / (1000 * 60 * 60 * 24))
                });
            });

        return deadlines.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 10);
    }

    // Generate actionable recommendations
    generateRecommendations(complianceScores) {
        const recommendations = [];
        const breakdown = complianceScores.breakdown;

        // Registration recommendations
        if (breakdown.registration.score < 100) {
            recommendations.push({
                priority: 'high',
                category: 'Registration',
                title: 'Renew Expiring DEA Registrations',
                description: 'Ensure all DEA registrations are current and renewed before expiration',
                estimatedCost: '$731 per registration renewal',
                timeframe: '30-60 days'
            });
        }

        // Training recommendations
        if (breakdown.training.score < 100) {
            recommendations.push({
                priority: 'high',
                category: 'Training',
                title: 'Complete Required DEA Training',
                description: 'Complete all mandatory DEA-controlled substance training',
                estimatedCost: '$200-500 per training course',
                timeframe: '30 days'
            });
        }

        // Inspection recommendations
        if (breakdown.inspections.score < 100) {
            recommendations.push({
                priority: 'critical',
                category: 'Inspections',
                title: 'Address Inspection Violations',
                description: 'Immediately address all DEA inspection violations and corrective actions',
                estimatedCost: 'Varies by violation',
                timeframe: 'Immediate'
            });
        }

        // Diversion prevention recommendations
        if (breakdown.diversionPrevention.score < 100) {
            recommendations.push({
                priority: 'high',
                category: 'Diversion Prevention',
                title: 'Implement Diversion Prevention Programs',
                description: 'Implement comprehensive diversion prevention programs as required by DEA',
                estimatedCost: '$1,000-5,000 for program implementation',
                timeframe: '60-90 days'
            });
        }

        return recommendations;
    }

    // Add new DEA registration
    async addDEARegistration(registrationData) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('dea_registrations')
                .insert({
                    tenant_id: this.tenantId,
                    ...registrationData
                })
                .select()
                .single();

            if (error) throw error;
            
            // Refresh data
            await this.loadDEAData();
            
            return data;
        } catch (error) {
            console.error('Error adding DEA registration:', error);
            throw error;
        }
    }

    // Update DEA registration
    async updateDEARegistration(registrationId, updateData) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('dea_registrations')
                .update(updateData)
                .eq('id', registrationId)
                .eq('tenant_id', this.tenantId)
                .select()
                .single();

            if (error) throw error;
            
            // Refresh data
            await this.loadDEAData();
            
            return data;
        } catch (error) {
            console.error('Error updating DEA registration:', error);
            throw error;
        }
    }

    // Add training record
    async addTrainingRecord(trainingData) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('dea_training_records')
                .insert({
                    tenant_id: this.tenantId,
                    ...trainingData
                })
                .select()
                .single();

            if (error) throw error;
            
            // Refresh data
            await this.loadDEAData();
            
            return data;
        } catch (error) {
            console.error('Error adding training record:', error);
            throw error;
        }
    }

    // Get dashboard data
    getDashboardData() {
        const complianceScores = this.calculateComplianceScores();
        
        return {
            overallScore: complianceScores.overallScore,
            status: complianceScores.status,
            activeRegistrations: this.deaData.registrations.filter(r => r.status === 'active').length,
            totalRegistrations: this.deaData.registrations.length,
            activeAlerts: this.deaData.alerts.length,
            criticalAlerts: this.deaData.alerts.filter(a => a.severity === 'critical').length,
            upcomingDeadlines: this.getUpcomingDeadlines().slice(0, 5),
            recentInspections: this.deaData.inspections.slice(0, 3),
            complianceTrend: this.calculateTrendDirection(complianceScores.overallScore)
        };
    }
}

// Export for use in main application
window.DEAComplianceManager = DEAComplianceManager;
