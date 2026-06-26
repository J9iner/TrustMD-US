// TrustMD OSHA Compliance Module
// Comprehensive OSHA compliance tracking and management

class OSHAComplianceManager {
    constructor(supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.oshaPrograms = [];
        this.trainingRequirements = [];
        this.trainingRecords = [];
        this.injuryLog = [];
        this.inspections = [];
        this.safetyCommittee = null;
        this.hazardousMaterials = [];
    }

    // Initialize OSHA compliance data
    async initialize() {
        try {
            await Promise.all([
                this.loadOSHAPrograms(),
                this.loadTrainingRequirements(),
                this.loadTrainingRecords(),
                this.loadInjuryLog(),
                this.loadInspections(),
                this.loadSafetyCommittee(),
                this.loadHazardousMaterials()
            ]);
            
            console.log('OSHA compliance module initialized');
            return true;
        } catch (error) {
            console.error('Error initializing OSHA compliance:', error);
            return false;
        }
    }

    // Load OSHA programs
    async loadOSHAPrograms() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('osha_programs')
                .select('*')
                .eq('status', 'active');
            
            if (error) throw error;
            this.oshaPrograms = data || [];
            return this.oshaPrograms;
        } catch (error) {
            console.error('Error loading OSHA programs:', error);
            return [];
        }
    }

    // Load training requirements
    async loadTrainingRequirements() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('osha_training_requirements')
                .select('*');
            
            if (error) throw error;
            this.trainingRequirements = data || [];
            return this.trainingRequirements;
        } catch (error) {
            console.error('Error loading training requirements:', error);
            return [];
        }
    }

    // Load training records
    async loadTrainingRecords() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('osha_training_records')
                .select(`
                    *,
                    training_requirement:osha_training_requirements(*),
                    user:users(id, full_name, email)
                `);
            
            if (error) throw error;
            this.trainingRecords = data || [];
            return this.trainingRecords;
        } catch (error) {
            console.error('Error loading training records:', error);
            return [];
        }
    }

    // Load injury/illness log
    async loadInjuryLog() {
        try {
            const currentYear = new Date().getFullYear();
            const { data, error } = await this.supabaseClient.supabase
                .from('osha_injury_illness_log')
                .select('*')
                .eq('log_year', currentYear)
                .order('injury_date', { ascending: false });
            
            if (error) throw error;
            this.injuryLog = data || [];
            return this.injuryLog;
        } catch (error) {
            console.error('Error loading injury log:', error);
            return [];
        }
    }

    // Load inspections
    async loadInspections() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('osha_inspections')
                .select('*')
                .order('inspection_date', { ascending: false });
            
            if (error) throw error;
            this.inspections = data || [];
            return this.inspections;
        } catch (error) {
            console.error('Error loading inspections:', error);
            return [];
        }
    }

    // Load safety committee
    async loadSafetyCommittee() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('osha_safety_committee')
                .select('*')
                .eq('id', 1) // Assuming one committee per tenant
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            this.safetyCommittee = data;
            return this.safetyCommittee;
        } catch (error) {
            console.error('Error loading safety committee:', error);
            return null;
        }
    }

    // Load hazardous materials
    async loadHazardousMaterials() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('osha_hazardous_materials')
                .select('*')
                .order('chemical_name', { ascending: true });
            
            if (error) throw error;
            this.hazardousMaterials = data || [];
            return this.hazardousMaterials;
        } catch (error) {
            console.error('Error loading hazardous materials:', error);
            return [];
        }
    }

    // Calculate OSHA compliance score
    calculateOSHAComplianceScore() {
        let totalScore = 0;
        let maxScore = 0;
        let factors = {};

        // Safety Programs (30% of score)
        const programScore = this.calculateProgramScore();
        factors.programs = programScore;
        totalScore += programScore.score * 0.3;
        maxScore += 100 * 0.3;

        // Training Completion (25% of score)
        const trainingScore = this.calculateTrainingScore();
        factors.training = trainingScore;
        totalScore += trainingScore.score * 0.25;
        maxScore += 100 * 0.25;

        // Record Keeping (20% of score)
        const recordScore = this.calculateRecordScore();
        factors.records = recordScore;
        totalScore += recordScore.score * 0.2;
        maxScore += 100 * 0.2;

        // Safety Inspections (15% of score)
        const inspectionScore = this.calculateInspectionScore();
        factors.inspections = inspectionScore;
        totalScore += inspectionScore.score * 0.15;
        maxScore += 100 * 0.15;

        // Injury Rate (10% of score)
        const injuryScore = this.calculateInjuryScore();
        factors.injuries = injuryScore;
        totalScore += injuryScore.score * 0.1;
        maxScore += 100 * 0.1;

        return {
            overallScore: Math.round((totalScore / maxScore) * 100),
            breakdown: factors,
            status: this.getComplianceStatus((totalScore / maxScore) * 100)
        };
    }

    // Calculate program compliance score
    calculateProgramScore() {
        const requiredPrograms = [
            'safety_health_plan',
            'hazard_communication',
            'bloodborne_pathogens',
            'emergency_action'
        ];

        const activePrograms = this.oshaPrograms.filter(p => 
            requiredPrograms.includes(p.program_type) && p.status === 'active'
        );

        const score = (activePrograms.length / requiredPrograms.length) * 100;

        return {
            score,
            active: activePrograms.length,
            required: requiredPrograms.length,
            missing: requiredPrograms.filter(type => 
                !activePrograms.some(p => p.program_type === type)
            )
        };
    }

    // Calculate training compliance score
    calculateTrainingScore() {
        if (this.trainingRequirements.length === 0) return { score: 100, completed: 0, required: 0 };

        const requiredTraining = this.trainingRequirements.filter(t => t.frequency !== 'as_needed');
        const completedTraining = this.trainingRecords.filter(record => {
            const requirement = requiredTraining.find(t => t.id === record.training_requirement_id);
            if (!requirement) return false;

            // Check if training is current
            const completionDate = new Date(record.completion_date);
            const now = new Date();
            const monthsDiff = (now - completionDate) / (1000 * 60 * 60 * 24 * 30);

            switch (requirement.frequency) {
                case 'annual': return monthsDiff <= 12;
                case 'biennial': return monthsDiff <= 24;
                case 'initial': return true; // Initial training doesn't expire
                default: return true;
            }
        });

        const score = (completedTraining.length / requiredTraining.length) * 100;

        return {
            score,
            completed: completedTraining.length,
            required: requiredTraining.length,
            expired: requiredTraining.length - completedTraining.length
        };
    }

    // Calculate record keeping score
    calculateRecordScore() {
        let score = 100;
        const issues = [];

        // Check OSHA 300 log
        const currentYear = new Date().getFullYear();
        const hasCurrentLog = this.injuryLog.some(record => record.log_year === currentYear);
        if (!hasCurrentLog) {
            score -= 30;
            issues.push('Missing OSHA 300 log for current year');
        }

        // Check safety committee
        if (!this.safetyCommittee || !this.safetyCommittee.formation_date) {
            score -= 20;
            issues.push('No active safety committee');
        }

        // Check hazardous materials inventory
        if (this.hazardousMaterials.length === 0) {
            score -= 25;
            issues.push('No hazardous materials inventory');
        } else {
            const recentInventory = this.hazardousMaterials.some(material => {
                if (!material.last_inventory_date) return false;
                const inventoryDate = new Date(material.last_inventory_date);
                const monthsDiff = (new Date() - inventoryDate) / (1000 * 60 * 60 * 24 * 30);
                return monthsDiff <= 12;
            });

            if (!recentInventory) {
                score -= 15;
                issues.push('Hazardous materials inventory not updated within 12 months');
            }
        }

        return {
            score: Math.max(0, score),
            issues
        };
    }

    // Calculate inspection score
    calculateInspectionScore() {
        const now = new Date();
        const threeMonthsAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
        
        const recentInspections = this.inspections.filter(inspection => 
            new Date(inspection.inspection_date) >= threeMonthsAgo
        );

        let score = 0;
        if (recentInspections.length >= 2) score = 100; // Quarterly or more frequent
        else if (recentInspections.length >= 1) score = 70; // At least one in 3 months
        else score = 0; // No recent inspections

        return {
            score,
            recent: recentInspections.length,
            total: this.inspections.length,
            lastInspection: this.inspections.length > 0 ? 
                this.inspections[0].inspection_date : null
        };
    }

    // Calculate injury rate score
    calculateInjuryScore() {
        const currentYear = new Date().getFullYear();
        const yearRecords = this.injuryLog.filter(record => record.log_year === currentYear);
        
        // Calculate Total Recordable Incident Rate (TRIR)
        const totalHoursWorked = 200000; // Standard baseline (100 employees x 2000 hours)
        const recordableCases = yearRecords.filter(record => 
            record.treatment_type !== 'first_aid'
        ).length;
        
        const trir = (recordableCases * 200000) / totalHoursWorked;

        let score = 100;
        if (trir > 5) score = 0;
        else if (trir > 3) score = 40;
        else if (trir > 1) score = 70;
        else if (trir > 0.5) score = 85;

        return {
            score,
            trir: trir.toFixed(2),
            recordableCases,
            totalCases: yearRecords.length
        };
    }

    // Get compliance status
    getComplianceStatus(score) {
        if (score >= 90) return 'Excellent';
        if (score >= 80) return 'Good';
        if (score >= 70) return 'Fair';
        if (score >= 60) return 'Poor';
        return 'Critical';
    }

    // Get upcoming training requirements
    getUpcomingTraining() {
        const upcoming = [];
        const now = new Date();

        this.trainingRequirements.forEach(requirement => {
            const records = this.trainingRecords.filter(r => 
                r.training_requirement_id === requirement.id
            );

            const latestRecord = records.sort((a, b) => 
                new Date(b.completion_date) - new Date(a.completion_date)
            )[0];

            if (!latestRecord) {
                upcoming.push({
                    requirement,
                    status: 'required',
                    dueDate: 'ASAP'
                });
                return;
            }

            const completionDate = new Date(latestRecord.completion_date);
            const monthsDiff = (now - completionDate) / (1000 * 60 * 60 * 24 * 30);

            let dueDate = null;
            let status = 'current';

            switch (requirement.frequency) {
                case 'annual':
                    dueDate = new Date(completionDate.getTime() + (365 * 24 * 60 * 60 * 1000));
                    if (monthsDiff > 10) status = 'due_soon';
                    if (monthsDiff > 12) status = 'overdue';
                    break;
                case 'biennial':
                    dueDate = new Date(completionDate.getTime() + (730 * 24 * 60 * 60 * 1000));
                    if (monthsDiff > 22) status = 'due_soon';
                    if (monthsDiff > 24) status = 'overdue';
                    break;
            }

            if (status !== 'current') {
                upcoming.push({
                    requirement,
                    status,
                    dueDate: dueDate ? dueDate.toLocaleDateString() : 'Overdue',
                    lastCompleted: completionDate.toLocaleDateString()
                });
            }
        });

        return upcoming.sort((a, b) => {
            const priority = { overdue: 3, due_soon: 2, required: 1 };
            return priority[b.status] - priority[a.status];
        });
    }

    // Generate OSHA compliance report
    generateComplianceReport() {
        const complianceScore = this.calculateOSHAComplianceScore();
        const upcomingTraining = this.getUpcomingTraining();

        return {
            summary: {
                overallScore: complianceScore.overallScore,
                status: complianceScore.status,
                lastUpdated: new Date().toLocaleDateString()
            },
            breakdown: complianceScore.breakdown,
            upcomingTraining: upcomingTraining.slice(0, 5), // Top 5 upcoming
            recentInjuries: this.injuryLog.slice(0, 3), // Last 3 injuries
            recentInspections: this.inspections.slice(0, 3), // Last 3 inspections
            recommendations: this.generateRecommendations(complianceScore)
        };
    }

    // Generate recommendations based on compliance score
    generateRecommendations(complianceScore) {
        const recommendations = [];

        if (complianceScore.breakdown.programs?.score < 100) {
            complianceScore.breakdown.programs.missing.forEach(program => {
                recommendations.push({
                    priority: 'high',
                    category: 'Programs',
                    action: `Implement ${program.replace('_', ' ')} program`,
                    cost: '$2,000 - $8,000',
                    timeframe: '30-60 days'
                });
            });
        }

        if (complianceScore.breakdown.training?.score < 100) {
            const expiredCount = complianceScore.breakdown.training.expired;
            if (expiredCount > 0) {
                recommendations.push({
                    priority: 'high',
                    category: 'Training',
                    action: `Complete ${expiredCount} expired OSHA training requirements`,
                    cost: '$500 - $2,000',
                    timeframe: '30 days'
                });
            }
        }

        if (complianceScore.breakdown.records?.issues?.length > 0) {
            complianceScore.breakdown.records.issues.forEach(issue => {
                recommendations.push({
                    priority: 'medium',
                    category: 'Records',
                    action: `Address: ${issue}`,
                    cost: '$500 - $1,500',
                    timeframe: '15-30 days'
                });
            });
        }

        if (complianceScore.breakdown.inspections?.score < 70) {
            recommendations.push({
                priority: 'medium',
                category: 'Inspections',
                action: 'Schedule quarterly workplace safety inspections',
                cost: '$1,000 - $3,000',
                timeframe: '15 days'
            });
        }

        if (complianceScore.breakdown.injuries?.trir > 3) {
            recommendations.push({
                priority: 'high',
                category: 'Safety',
                action: 'Implement injury prevention program based on incident analysis',
                cost: '$3,000 - $10,000',
                timeframe: '60-90 days'
            });
        }

        return recommendations.sort((a, b) => {
            const priority = { high: 3, medium: 2, low: 1 };
            return priority[b.priority] - priority[a.priority];
        });
    }
}

// Export for use in main application
window.OSHAComplianceManager = OSHAComplianceManager;
