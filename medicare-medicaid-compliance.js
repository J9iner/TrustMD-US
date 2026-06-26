// TrustMD Medicare-Medicaid Compliance Module
// Comprehensive Medicare and Medicaid enrollment and billing compliance tracking system

class MedicareMedicaidComplianceManager {
    constructor(supabaseClient, tenantId) {
        this.supabaseClient = supabaseClient;
        this.tenantId = tenantId;
        this.mmData = {
            medicareEnrollments: [],
            medicaidEnrollments: [],
            billingPrograms: [],
            billingAudits: [],
            fraudPreventionTraining: [],
            fraudTrainingRecords: [],
            alerts: [],
            complianceScores: [],
            credentialingDocuments: [],
            monitoringActivities: []
        };
    }

    // Initialize Medicare-Medicaid compliance module
    async initialize() {
        try {
            console.log('Initializing Medicare-Medicaid Compliance Manager...');
            
            // Load all Medicare-Medicaid compliance data
            await this.loadMMData();
            
            // Calculate compliance scores
            await this.calculateComplianceScores();
            
            // Generate alerts for upcoming deadlines
            await this.generateAlerts();
            
            console.log('Medicare-Medicaid Compliance Manager initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing Medicare-Medicaid Compliance Manager:', error);
            return false;
        }
    }

    // Load all Medicare-Medicaid compliance data
    async loadMMData() {
        try {
            const [
                medicareEnrollments,
                medicaidEnrollments,
                billingPrograms,
                billingAudits,
                fraudPreventionTraining,
                fraudTrainingRecords,
                alerts,
                complianceScores,
                credentialingDocuments,
                monitoringActivities
            ] = await Promise.all([
                this.loadMedicareEnrollments(),
                this.loadMedicaidEnrollments(),
                this.loadBillingPrograms(),
                this.loadBillingAudits(),
                this.loadFraudPreventionTraining(),
                this.loadFraudTrainingRecords(),
                this.loadMMAlerts(),
                this.loadComplianceScores(),
                this.loadCredentialingDocuments(),
                this.loadMonitoringActivities()
            ]);

            this.mmData = {
                medicareEnrollments,
                medicaidEnrollments,
                billingPrograms,
                billingAudits,
                fraudPreventionTraining,
                fraudTrainingRecords,
                alerts,
                complianceScores,
                credentialingDocuments,
                monitoringActivities
            };

            return this.mmData;
        } catch (error) {
            console.error('Error loading Medicare-Medicaid data:', error);
            throw error;
        }
    }

    // Load Medicare enrollments
    async loadMedicareEnrollments() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('medicare_enrollments')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .order('revalidation_date', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading Medicare enrollments:', error);
            return [];
        }
    }

    // Load Medicaid enrollments
    async loadMedicaidEnrollments() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('medicaid_enrollments')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .order('revalidation_date', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading Medicaid enrollments:', error);
            return [];
        }
    }

    // Load billing compliance programs
    async loadBillingPrograms() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('billing_compliance_programs')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .order('next_review_date', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading billing programs:', error);
            return [];
        }
    }

    // Load billing audits
    async loadBillingAudits() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('billing_audits')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .order('audit_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading billing audits:', error);
            return [];
        }
    }

    // Load fraud prevention training requirements
    async loadFraudPreventionTraining() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('fraud_prevention_training')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading fraud prevention training:', error);
            return [];
        }
    }

    // Load fraud prevention training records
    async loadFraudTrainingRecords() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('fraud_prevention_training_records')
                .select(`
                    *,
                    fraud_prevention_training (
                        id,
                        training_type,
                        title,
                        description,
                        frequency,
                        mandated_by
                    )
                `)
                .eq('tenant_id', this.tenantId)
                .order('completion_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading fraud training records:', error);
            return [];
        }
    }

    // Load Medicare-Medicaid alerts
    async loadMMAlerts() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('medicare_medicaid_compliance_alerts')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading Medicare-Medicaid alerts:', error);
            return [];
        }
    }

    // Load compliance scores
    async loadComplianceScores() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('medicare_medicaid_compliance_scores')
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

    // Load credentialing documents
    async loadCredentialingDocuments() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('provider_credentialing_documents')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .order('expiration_date', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading credentialing documents:', error);
            return [];
        }
    }

    // Load monitoring activities
    async loadMonitoringActivities() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('compliance_monitoring_activities')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .order('activity_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading monitoring activities:', error);
            return [];
        }
    }

    // Calculate comprehensive Medicare-Medicaid compliance score
    async calculateComplianceScores() {
        try {
            const enrollmentScore = this.calculateEnrollmentCompliance();
            const billingScore = this.calculateBillingCompliance();
            const auditScore = this.calculateAuditCompliance();
            const trainingScore = this.calculateTrainingCompliance();
            const fraudPreventionScore = this.calculateFraudPreventionCompliance();

            const overallScore = Math.round(
                enrollmentScore.score * 0.25 +
                billingScore.score * 0.25 +
                auditScore.score * 0.20 +
                trainingScore.score * 0.15 +
                fraudPreventionScore.score * 0.15
            );

            const complianceData = {
                overallScore,
                status: this.getComplianceStatus(overallScore),
                breakdown: {
                    enrollment: enrollmentScore,
                    billing: billingScore,
                    audits: auditScore,
                    training: trainingScore,
                    fraudPrevention: fraudPreventionScore
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

    // Calculate enrollment compliance
    calculateEnrollmentCompliance() {
        const medicareEnrollments = this.mmData.medicareEnrollments;
        const medicaidEnrollments = this.mmData.medicaidEnrollments;
        const credentialingDocuments = this.mmData.credentialingDocuments;
        
        let score = 100;
        let issues = [];

        // Check Medicare enrollment status
        const activeMedicare = medicareEnrollments.filter(enrollment => 
            enrollment.status === 'active'
        );

        if (medicareEnrollments.length === 0) {
            score -= 30;
            issues.push({
                priority: 'critical',
                category: 'Medicare Enrollment',
                description: 'No Medicare enrollment found',
                action: 'Enroll in Medicare program'
            });
        } else {
            const medicareActiveRate = (activeMedicare.length / medicareEnrollments.length) * 100;
            if (medicareActiveRate < 100) {
                score -= (100 - medicareActiveRate) * 0.3;
            }
        }

        // Check Medicaid enrollment status
        const activeMedicaid = medicaidEnrollments.filter(enrollment => 
            enrollment.status === 'active'
        );

        if (medicaidEnrollments.length === 0) {
            score -= 30;
            issues.push({
                priority: 'high',
                category: 'Medicaid Enrollment',
                description: 'No Medicaid enrollment found',
                action: 'Enroll in state Medicaid programs'
            });
        } else {
            const medicaidActiveRate = (activeMedicaid.length / medicaidEnrollments.length) * 100;
            if (medicaidActiveRate < 100) {
                score -= (100 - medicaidActiveRate) * 0.3;
            }
        }

        // Check for revalidation deadlines
        const now = new Date();
        const allEnrollments = [...medicareEnrollments, ...medicaidEnrollments];
        const expiringSoon = allEnrollments.filter(enrollment => {
            if (!enrollment.revalidation_date) return false;
            const daysUntilRevalidation = Math.floor((new Date(enrollment.revalidation_date) - now) / (1000 * 60 * 60 * 24));
            return daysUntilRevalidation <= 90;
        });

        if (expiringSoon.length > 0) {
            score -= expiringSoon.length * 5;
            issues.push({
                priority: 'high',
                category: 'Enrollment Revalidation',
                description: `${expiringSoon.length} enrollment(s) require revalidation within 90 days`,
                action: 'Schedule enrollment revalidation'
            });
        }

        // Check credentialing documents
        const expiredDocuments = credentialingDocuments.filter(doc => 
            doc.expiration_date && new Date(doc.expiration_date) < now
        );

        if (expiredDocuments.length > 0) {
            score -= expiredDocuments.length * 10;
            issues.push({
                priority: 'critical',
                category: 'Credentialing Documents',
                description: `${expiredDocuments.length} credentialing document(s) expired`,
                action: 'Update expired credentialing documents'
            });
        }

        return {
            score: Math.max(0, Math.round(score)),
            total: allEnrollments.length,
            active: activeMedicare.length + activeMedicaid.length,
            expiringSoon: expiringSoon.length,
            issues
        };
    }

    // Calculate billing compliance
    calculateBillingCompliance() {
        const billingPrograms = this.mmData.billingPrograms;
        const billingAudits = this.mmData.billingAudits;
        
        let score = 100;
        let issues = [];

        // Check billing compliance programs
        const requiredPrograms = [
            'coding_compliance',
            'billing_audits',
            'charge_capture',
            'fraud_detection'
        ];

        const activePrograms = billingPrograms.filter(program => 
            program.status === 'active'
        );

        const implementedRequired = requiredPrograms.filter(type => 
            activePrograms.some(program => program.program_type === type)
        ).length;

        if (implementedRequired < requiredPrograms.length) {
            score -= (requiredPrograms.length - implementedRequired) * 15;
            issues.push({
                priority: 'high',
                category: 'Billing Programs',
                description: `${requiredPrograms.length - implementedRequired} required billing program(s) missing`,
                action: 'Implement missing billing compliance programs'
            });
        }

        // Check for programs needing review
        const needingReview = activePrograms.filter(program => 
            program.next_review_date && new Date(program.next_review_date) <= new Date()
        );

        if (needingReview.length > 0) {
            score -= needingReview.length * 5;
            issues.push({
                priority: 'medium',
                category: 'Billing Programs',
                description: `${needingReview.length} billing program(s) need review`,
                action: 'Review and update billing compliance programs'
            });
        }

        // Check audit results
        const recentAudits = billingAudits.filter(audit => {
            const auditDate = new Date(audit.audit_date);
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            return auditDate > oneYearAgo;
        });

        const failedAudits = recentAudits.filter(audit => 
            audit.compliance_score && audit.compliance_score < 80
        );

        if (failedAudits.length > 0) {
            score -= failedAudits.length * 20;
            issues.push({
                priority: 'critical',
                category: 'Billing Audits',
                description: `${failedAudits.length} failed billing audit(s) in past year`,
                action: 'Address audit findings and implement corrective actions'
            });
        }

        return {
            score: Math.max(0, Math.round(score)),
            requiredPrograms: requiredPrograms.length,
            implemented: implementedRequired,
            recentAudits: recentAudits.length,
            failedAudits: failedAudits.length,
            issues
        };
    }

    // Calculate audit compliance
    calculateAuditCompliance() {
        const billingAudits = this.mmData.billingAudits;
        const monitoringActivities = this.mmData.monitoringActivities;
        
        let score = 100;
        let issues = [];

        // Check for recent audits
        const recentAudits = billingAudits.filter(audit => {
            const auditDate = new Date(audit.audit_date);
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            return auditDate > oneYearAgo;
        });

        if (recentAudits.length === 0) {
            score -= 20;
            issues.push({
                priority: 'medium',
                category: 'Audits',
                description: 'No billing audits conducted in past year',
                action: 'Schedule regular billing audits'
            });
        }

        // Check for pending corrective actions
        const pendingActions = recentAudits.filter(audit => 
            audit.audit_status === 'pending_correction' &&
            audit.follow_up_date && new Date(audit.follow_up_date) < new Date()
        );

        if (pendingActions.length > 0) {
            score -= pendingActions.length * 15;
            issues.push({
                priority: 'critical',
                category: 'Corrective Actions',
                description: `${pendingActions.length} overdue corrective action(s) from audits`,
                action: 'Complete all required corrective actions'
            });
        }

        // Check monitoring activities
        const recentMonitoring = monitoringActivities.filter(activity => {
            const activityDate = new Date(activity.activity_date);
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return activityDate > sixMonthsAgo;
        });

        if (recentMonitoring.length === 0) {
            score -= 15;
            issues.push({
                priority: 'medium',
                category: 'Monitoring',
                description: 'No compliance monitoring activities in past 6 months',
                action: 'Implement regular compliance monitoring'
            });
        }

        return {
            score: Math.max(0, Math.round(score)),
            recentAudits: recentAudits.length,
            pendingActions: pendingActions.length,
            recentMonitoring: recentMonitoring.length,
            issues
        };
    }

    // Calculate training compliance
    calculateTrainingCompliance() {
        const fraudTrainingRecords = this.mmData.fraudTrainingRecords;
        const fraudPreventionTraining = this.mmData.fraudPreventionTraining;
        
        let score = 100;
        let issues = [];

        // Group training records by type
        const trainingByType = {};
        fraudTrainingRecords.forEach(record => {
            const type = record.fraud_prevention_training?.training_type || 'unknown';
            if (!trainingByType[type]) {
                trainingByType[type] = [];
            }
            trainingByType[type].push(record);
        });

        // Check for required training
        const requiredTrainings = ['fraud_waste_abuse', 'compliance_ethics', 'billing_integrity'];
        const now = new Date();

        requiredTrainings.forEach(type => {
            const records = trainingByType[type] || [];
            const currentRecords = records.filter(record => {
                if (!record.expiration_date) return true;
                return new Date(record.expiration_date) > now;
            });

            if (currentRecords.length === 0) {
                score -= 20;
                issues.push({
                    priority: 'high',
                    category: 'Training',
                    description: `Missing required ${type.replace(/_/g, ' ')} training`,
                    action: `Complete ${type.replace(/_/g, ' ')} training`
                });
            }
        });

        // Check for expiring training
        const expiringSoon = fraudTrainingRecords.filter(record => {
            if (!record.expiration_date) return false;
            const daysUntilExpiry = Math.floor((new Date(record.expiration_date) - now) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry <= 30;
        });

        if (expiringSoon.length > 0) {
            score -= expiringSoon.length * 5;
            issues.push({
                priority: 'medium',
                category: 'Training',
                description: `${expiringSoon.length} training record(s) expiring soon`,
                action: 'Renew expiring training certifications'
            });
        }

        return {
            score: Math.max(0, Math.round(score)),
            required: requiredTrainings.length,
            completed: Object.keys(trainingByType).filter(type => 
                requiredTrainings.includes(type)
            ).length,
            expiringSoon: expiringSoon.length,
            issues
        };
    }

    // Calculate fraud prevention compliance
    calculateFraudPreventionCompliance() {
        const billingPrograms = this.mmData.billingPrograms;
        const monitoringActivities = this.mmData.monitoringActivities;
        
        let score = 100;
        let issues = [];

        // Check for fraud prevention programs
        const fraudPrograms = billingPrograms.filter(program => 
            program.program_type === 'fraud_detection' && program.status === 'active'
        );

        if (fraudPrograms.length === 0) {
            score -= 25;
            issues.push({
                priority: 'critical',
                category: 'Fraud Prevention',
                description: 'No fraud detection program implemented',
                action: 'Implement comprehensive fraud prevention program'
            });
        }

        // Check for regular monitoring
        const recentMonitoring = monitoringActivities.filter(activity => {
            const activityDate = new Date(activity.activity_date);
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            return activityDate > threeMonthsAgo;
        });

        if (recentMonitoring.length < 2) {
            score -= 15;
            issues.push({
                priority: 'medium',
                category: 'Fraud Prevention',
                description: 'Insufficient fraud prevention monitoring activities',
                action: 'Increase frequency of fraud prevention monitoring'
            });
        }

        // Check for high-risk findings
        const highRiskFindings = recentMonitoring.filter(activity => 
            activity.risk_level === 'high' || activity.risk_level === 'critical'
        );

        if (highRiskFindings.length > 0) {
            score -= highRiskFindings.length * 10;
            issues.push({
                priority: 'high',
                category: 'Fraud Prevention',
                description: `${highRiskFindings.length} high-risk finding(s) in monitoring activities`,
                action: 'Address high-risk findings immediately'
            });
        }

        return {
            score: Math.max(0, Math.round(score)),
            fraudPrograms: fraudPrograms.length,
            recentMonitoring: recentMonitoring.length,
            highRiskFindings: highRiskFindings.length,
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
                .from('medicare_medicaid_compliance_scores')
                .insert({
                    tenant_id: this.tenantId,
                    score: complianceData.overallScore,
                    category: 'overall',
                    factors: complianceData.breakdown,
                    trend_direction: this.calculateTrendDirection(complianceData.overallScore)
                });

            if (error) throw error;
            console.log('Medicare-Medicaid compliance score saved successfully');
        } catch (error) {
            console.error('Error saving compliance score:', error);
        }
    }

    // Calculate trend direction based on recent scores
    calculateTrendDirection(currentScore) {
        const recentScores = this.mmData.complianceScores.slice(0, 5);
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

            // Check for enrollment revalidation
            const allEnrollments = [...this.mmData.medicareEnrollments, ...this.mmData.medicaidEnrollments];
            allEnrollments.forEach(enrollment => {
                if (enrollment.status !== 'active') return;

                const daysUntilRevalidation = Math.floor((new Date(enrollment.revalidation_date) - new Date()) / (1000 * 60 * 60 * 24));
                
                if (daysUntilRevalidation <= 90 && daysUntilRevalidation > 0) {
                    alerts.push({
                        tenant_id: this.tenantId,
                        alert_type: 'revalidation_due',
                        title: `${enrollment.npi_number} Enrollment Revalidation Required`,
                        description: `${enrollment.npi_number} enrollment requires revalidation in ${daysUntilRevalidation} days`,
                        severity: daysUntilRevalidation <= 30 ? 'critical' : 'high',
                        due_date: enrollment.revalidation_date
                    });
                }
            });

            // Check for expiring credentialing documents
            this.mmData.credentialingDocuments.forEach(doc => {
                if (!doc.expiration_date) return;

                const daysUntilExpiry = Math.floor((new Date(doc.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
                
                if (daysUntilExpiry <= 60 && daysUntilExpiry > 0) {
                    alerts.push({
                        tenant_id: this.tenantId,
                        alert_type: 'documentation_missing',
                        title: 'Credentialing Document Expiring',
                        description: `${doc.document_title} expires in ${daysUntilExpiry} days`,
                        severity: daysUntilExpiry <= 30 ? 'critical' : 'high',
                        due_date: doc.expiration_date
                    });
                }
            });

            // Check for overdue training
            const overdueTraining = this.identifyOverdueTraining();
            overdueTraining.forEach(training => {
                alerts.push({
                    tenant_id: this.tenantId,
                    alert_type: 'training_required',
                    title: 'Fraud Prevention Training Required',
                    description: `${training.type} training is overdue or missing`,
                    severity: 'high',
                    due_date: new Date().toISOString().split('T')[0]
                });
            });

            // Save alerts to database
            if (alerts.length > 0) {
                await this.supabaseClient.supabase
                    .from('medicare_medicaid_compliance_alerts')
                    .insert(alerts);
            }

            console.log(`Generated ${alerts.length} Medicare-Medicaid compliance alerts`);
        } catch (error) {
            console.error('Error generating alerts:', error);
        }
    }

    // Identify overdue training
    identifyOverdueTraining() {
        const overdue = [];
        const trainingRecords = this.mmData.fraudTrainingRecords;
        const now = new Date();

        // Check for required trainings
        const requiredTrainings = ['fraud_waste_abuse', 'compliance_ethics', 'billing_integrity'];
        
        requiredTrainings.forEach(type => {
            const records = trainingRecords.filter(record => 
                record.fraud_prevention_training?.training_type === type
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

    // Generate comprehensive Medicare-Medicaid compliance report
    async generateComplianceReport() {
        try {
            const complianceScores = await this.calculateComplianceScores();
            
            return {
                summary: {
                    overallScore: complianceScores.overallScore,
                    status: complianceScores.status,
                    totalMedicareEnrollments: this.mmData.medicareEnrollments.length,
                    totalMedicaidEnrollments: this.mmData.medicaidEnrollments.length,
                    activeEnrollments: this.mmData.medicareEnrollments.filter(e => e.status === 'active').length + 
                                     this.mmData.medicaidEnrollments.filter(e => e.status === 'active').length,
                    activeAlerts: this.mmData.alerts.length,
                    recentAudits: this.mmData.billingAudits.length,
                    credentialingDocuments: this.mmData.credentialingDocuments.length
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

        // Enrollment revalidation deadlines
        const allEnrollments = [...this.mmData.medicareEnrollments, ...this.mmData.medicaidEnrollments];
        allEnrollments
            .filter(enrollment => enrollment.status === 'active' && enrollment.revalidation_date && new Date(enrollment.revalidation_date) > now)
            .forEach(enrollment => {
                deadlines.push({
                    type: 'Enrollment Revalidation',
                    description: `${enrollment.npi_number} (${enrollment.npi_number.startsWith('M') ? 'Medicare' : 'Medicaid'})`,
                    dueDate: enrollment.revalidation_date,
                    daysUntil: Math.floor((new Date(enrollment.revalidation_date) - now) / (1000 * 60 * 60 * 24))
                });
            });

        // Document expiration deadlines
        this.mmData.credentialingDocuments
            .filter(doc => doc.expiration_date && new Date(doc.expiration_date) > now)
            .forEach(doc => {
                deadlines.push({
                    type: 'Document Expiration',
                    description: doc.document_title,
                    dueDate: doc.expiration_date,
                    daysUntil: Math.floor((new Date(doc.expiration_date) - now) / (1000 * 60 * 60 * 24))
                });
            });

        return deadlines.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 10);
    }

    // Generate actionable recommendations
    generateRecommendations(complianceScores) {
        const recommendations = [];
        const breakdown = complianceScores.breakdown;

        // Enrollment recommendations
        if (breakdown.enrollment.score < 100) {
            recommendations.push({
                priority: 'high',
                category: 'Enrollment',
                title: 'Complete Provider Enrollment',
                description: 'Ensure all required Medicare and Medicaid enrollments are active and current',
                estimatedCost: '$500-2,000 per enrollment',
                timeframe: '30-60 days'
            });
        }

        // Billing compliance recommendations
        if (breakdown.billing.score < 100) {
            recommendations.push({
                priority: 'high',
                category: 'Billing Compliance',
                title: 'Implement Billing Compliance Programs',
                description: 'Establish comprehensive billing compliance and audit programs',
                estimatedCost: '$5,000-15,000 for program implementation',
                timeframe: '60-90 days'
            });
        }

        // Audit recommendations
        if (breakdown.audits.score < 100) {
            recommendations.push({
                priority: 'critical',
                category: 'Audits',
                title: 'Address Audit Findings',
                description: 'Complete all required corrective actions from billing audits',
                estimatedCost: 'Varies by findings',
                timeframe: 'Immediate'
            });
        }

        // Training recommendations
        if (breakdown.training.score < 100) {
            recommendations.push({
                priority: 'high',
                category: 'Training',
                title: 'Complete Fraud Prevention Training',
                description: 'Complete all required fraud, waste, and abuse prevention training',
                estimatedCost: '$200-500 per training course',
                timeframe: '30 days'
            });
        }

        // Fraud prevention recommendations
        if (breakdown.fraudPrevention.score < 100) {
            recommendations.push({
                priority: 'high',
                category: 'Fraud Prevention',
                title: 'Enhance Fraud Prevention Programs',
                description: 'Implement comprehensive fraud detection and prevention systems',
                estimatedCost: '$10,000-50,000 for system implementation',
                timeframe: '90-180 days'
            });
        }

        return recommendations;
    }

    // Add Medicare enrollment
    async addMedicareEnrollment(enrollmentData) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('medicare_enrollments')
                .insert({
                    tenant_id: this.tenantId,
                    ...enrollmentData
                })
                .select()
                .single();

            if (error) throw error;
            
            // Refresh data
            await this.loadMMData();
            
            return data;
        } catch (error) {
            console.error('Error adding Medicare enrollment:', error);
            throw error;
        }
    }

    // Add Medicaid enrollment
    async addMedicaidEnrollment(enrollmentData) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('medicaid_enrollments')
                .insert({
                    tenant_id: this.tenantId,
                    ...enrollmentData
                })
                .select()
                .single();

            if (error) throw error;
            
            // Refresh data
            await this.loadMMData();
            
            return data;
        } catch (error) {
            console.error('Error adding Medicaid enrollment:', error);
            throw error;
        }
    }

    // Add billing audit record
    async addBillingAudit(auditData) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('billing_audits')
                .insert({
                    tenant_id: this.tenantId,
                    ...auditData
                })
                .select()
                .single();

            if (error) throw error;
            
            // Refresh data
            await this.loadMMData();
            
            return data;
        } catch (error) {
            console.error('Error adding billing audit:', error);
            throw error;
        }
    }

    // Add fraud prevention training record
    async addFraudTrainingRecord(trainingData) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('fraud_prevention_training_records')
                .insert({
                    tenant_id: this.tenantId,
                    ...trainingData
                })
                .select()
                .single();

            if (error) throw error;
            
            // Refresh data
            await this.loadMMData();
            
            return data;
        } catch (error) {
            console.error('Error adding fraud training record:', error);
            throw error;
        }
    }

    // Get dashboard data
    getDashboardData() {
        const complianceScores = this.calculateComplianceScores();
        
        return {
            overallScore: complianceScores.overallScore,
            status: complianceScores.status,
            activeMedicareEnrollments: this.mmData.medicareEnrollments.filter(e => e.status === 'active').length,
            activeMedicaidEnrollments: this.mmData.medicaidEnrollments.filter(e => e.status === 'active').length,
            totalEnrollments: this.mmData.medicareEnrollments.length + this.mmData.medicaidEnrollments.length,
            activeAlerts: this.mmData.alerts.length,
            criticalAlerts: this.mmData.alerts.filter(a => a.severity === 'critical').length,
            recentAudits: this.mmData.billingAudits.length,
            credentialingDocuments: this.mmData.credentialingDocuments.length,
            upcomingDeadlines: this.getUpcomingDeadlines().slice(0, 5),
            complianceTrend: this.calculateTrendDirection(complianceScores.overallScore)
        };
    }
}

// Export for use in main application
window.MedicareMedicaidComplianceManager = MedicareMedicaidComplianceManager;
