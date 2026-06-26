// TrustMD Proprietary Risk Engine Algorithm
// This is the core competitive advantage - sophisticated risk assessment

// Load modular components
if (typeof require !== 'undefined') {
    const { RiskCalculator } = require('./modules/risk-calculator.js');
    const { RiskValidator } = require('./modules/risk-validator.js');
    const { RiskCalibrator } = require('./modules/risk-calibrator.js');
    global.RiskCalculator = RiskCalculator;
    global.RiskValidator = RiskValidator;
    global.RiskCalibrator = RiskCalibrator;
} else {
    console.log('Loading modular components for risk engine...');
}

class TrustMDRiskEngine {
    constructor() {
        // Externalized configuration - will be loaded from JSON files
        this.riskFactors = {};
        this.severityMultipliers = {};
        this.industryMultipliers = {};
        this.isInitialized = false;
        this.supabaseClient = null;
        this.currentUserId = null;
        this.currentTenantId = null;
        
        // Modular components
        this.riskCalculator = null;
        this.riskValidator = null;
        this.riskCalibrator = null;
        
        // ML and calibration settings
        this.mlEnabled = false; // DISABLED - No AI components
        this.calibrationEnabled = true;
    }
    
    // Initialize risk engine with external configuration
    async initialize(supabaseClient = null, userId = null, tenantId = null) {
        try {
            this.supabaseClient = supabaseClient;
            this.currentUserId = userId;
            this.currentTenantId = tenantId;
            
            // Load external configurations
            await this.loadRiskFactors();
            await this.loadIndustryMultipliers();
            
            // Initialize modular components
            await this.initializeModules();
            
            this.isInitialized = true;
            console.log('TrustMD Risk Engine initialized with modular components and external configuration');
            return true;
        } catch (error) {
            console.error('Failed to initialize risk engine:', error);
            throw error;
        }
    }
    
    // Initialize modular components
    async initializeModules() {
        try {
            // Initialize risk calculator
            this.riskCalculator = new RiskCalculator(
                this.riskFactors,
                this.severityMultipliers,
                this.industryMultipliers
            );
            
            // Initialize risk validator
            this.riskValidator = new RiskValidator();
            
            // Initialize risk calibrator
            if (this.calibrationEnabled) {
                this.riskCalibrator = new RiskCalibrator();
                await this.riskCalibrator.initialize();
            }
            
            console.log('Modular components initialized (ML disabled)');
        } catch (error) {
            console.error('Failed to initialize modules:', error);
            throw error;
        }
    }
    
    // Train ML model with historical data
    async trainMLModel() {
        try {
            if (!this.supabaseClient || !this.mlPredictor) {
                return;
            }
            
            // Get historical risk assessment data
            const { data: historicalData, error } = await this.supabaseClient
                .from('risk_assessment_audit')
                .select('*')
                .eq('tenant_id', this.currentTenantId)
                .order('calculated_at', { ascending: false })
                .limit(100);
            
            if (error || !historicalData || historicalData.length === 0) {
                console.log('No historical data available for ML training');
                return;
            }
            
            // Transform data for ML training
            const trainingData = historicalData.map(record => ({
                input: record.input_data,
                outcome: record.actual_outcome || 'predicted',
                accuracy: record.prediction_accuracy || 0.85
            }));
            
            // Train the model
            await this.mlPredictor.trainModel(trainingData);
            console.log('ML model trained with historical data');
        } catch (error) {
            console.error('ML model training failed:', error);
        }
    }
    
    // Get module status and metrics factors from external JSON configuration
    async loadRiskFactors() {
        try {
            // Try to load from database first (for dynamic updates)
            if (this.supabaseClient) {
                const { data, error } = await this.supabaseClient
                    .from('risk_factors_config')
                    .select('config_data, version, updated_at')
                    .eq('is_active', true)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .single();
                
                if (!error && data && data.config_data) {
                    const config = data.config_data;
                    this.riskFactors = config.riskFactors || {};
                    this.severityMultipliers = config.severityMultipliers || {};
                    console.log(`Loaded risk factors from database (version ${data.version})`);
                    return;
                }
            }
            
            // Fallback to local JSON file
            const response = await fetch('./config/risk-factors.json');
            if (!response.ok) {
                throw new Error(`Failed to load risk factors: ${response.status}`);
            }
            
            const config = await response.json();
            this.riskFactors = config.riskFactors || {};
            this.severityMultipliers = config.severityMultipliers || {};
            
            console.log(`Loaded risk factors from local file (version ${config.version})`);
        } catch (error) {
            console.error('Error loading risk factors:', error);
            // Fallback to hardcoded values for safety
            this.loadDefaultRiskFactors();
        }
    }
    
    // Load industry multipliers from external JSON configuration
    async loadIndustryMultipliers() {
        try {
            // Try to load from database first
            if (this.supabaseClient) {
                const { data, error } = await this.supabaseClient
                    .from('industry_multipliers_config')
                    .select('config_data, version, updated_at')
                    .eq('is_active', true)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .single();
                
                if (!error && data && data.config_data) {
                    this.industryMultipliers = data.config_data.industryMultipliers || {};
                    console.log(`Loaded industry multipliers from database (version ${data.version})`);
                    return;
                }
            }
            
            // Fallback to local JSON file
            const response = await fetch('./config/industry-multipliers.json');
            if (!response.ok) {
                throw new Error(`Failed to load industry multipliers: ${response.status}`);
            }
            
            const config = await response.json();
            this.industryMultipliers = config.industryMultipliers || {};
            
            console.log(`Loaded industry multipliers from local file (version ${config.version})`);
        } catch (error) {
            console.error('Error loading industry multipliers:', error);
            // Fallback to hardcoded values for safety
            this.loadDefaultIndustryMultipliers();
        }
    }
    
    // Fallback default risk factors (original hardcoded values)
    loadDefaultRiskFactors() {
        this.riskFactors = {
            // Compliance Risk Factors (weighted)
            documentation: {
                missingConsentForms: { weight: 0.25, severity: 'high' },
                outdatedPolicies: { weight: 0.20, severity: 'medium' },
                incompleteTraining: { weight: 0.30, severity: 'high' },
                auditGaps: { weight: 0.25, severity: 'medium' }
            },
            
            // Operational Risk Factors
            operational: {
                staffTurnover: { weight: 0.15, severity: 'medium' },
                systemDowntime: { weight: 0.20, severity: 'low' },
                processInefficiencies: { weight: 0.25, severity: 'medium' },
                resourceConstraints: { weight: 0.20, severity: 'low' },
                communicationGaps: { weight: 0.20, severity: 'medium' }
            },
            
            // Technical Risk Factors
            technical: {
                dataSecurity: { weight: 0.35, severity: 'critical' },
                systemIntegration: { weight: 0.25, severity: 'medium' },
                backupRecovery: { weight: 0.20, severity: 'high' },
                accessControls: { weight: 0.20, severity: 'high' }
            },
            
            // Regulatory Risk Factors
            regulatory: {
                hipaaCompliance: { weight: 0.15, severity: 'critical' },
                oshaCompliance: { weight: 0.10, severity: 'high' },
                deaCompliance: { weight: 0.20, severity: 'critical' },
                medicareMedicaidCompliance: { weight: 0.25, severity: 'critical' },
                accreditationRequirements: { weight: 0.20, severity: 'high' },
                stateRegulations: { weight: 0.10, severity: 'high' }
            }
        };
        
        this.severityMultipliers = {
            low: 1.0,
            medium: 1.5,
            high: 2.0,
            critical: 3.0
        };
        
        console.log('Loaded default risk factors (fallback mode)');
    }
    
    // Fallback default industry multipliers
    loadDefaultIndustryMultipliers() {
        this.industryMultipliers = {
            // General Practice Types
            'hospital': 1.2,
            'clinic': 1.0,
            'private_practice': 0.8,
            'urgent_care': 1.1,
            'specialty_care': 0.9,
            
            // Primary Care
            'family_medicine': 0.8,
            'internal_medicine': 0.8,
            'pediatrics': 0.7,
            'geriatrics': 0.9,
            'general_practice': 0.8,
            
            // Medical Specialties
            'cardiology': 1.1,
            'dermatology': 0.7,
            'endocrinology': 0.9,
            'gastroenterology': 1.0,
            'nephrology': 1.1,
            'pulmonology': 1.0,
            'rheumatology': 0.9,
            'infectious_disease': 1.0,
            
            // Surgical Specialties
            'general_surgery': 1.2,
            'orthopedic_surgery': 1.1,
            'neurosurgery': 1.3,
            'cardiothoracic_surgery': 1.4,
            'plastic_surgery': 0.9,
            'vascular_surgery': 1.2,
            'pediatric_surgery': 1.3,
            'urology': 1.0,
            'ophthalmology': 0.8,
            'otolaryngology_ent': 0.9,
            
            // Women's Health
            'obstetrics_gynecology': 1.0,
            'maternal_fetal_medicine': 1.2,
            'reproductive_endocrinology': 1.1,
            'gynecologic_oncology': 1.3,
            
            // Mental Health
            'psychiatry': 0.8,
            'psychology': 0.6,
            'counseling': 0.5,
            'addiction_medicine': 0.9,
            'behavioral_health': 0.7,
            
            // Neurological Specialties
            'neurology': 1.0,
            'neurosurgery': 1.3,
            'pain_management': 0.9,
            'sleep_medicine': 0.8,
            
            // Emergency Care
            'emergency_medicine': 1.4,
            'urgent_care': 1.1,
            'trauma_center': 1.6,
            
            // Diagnostic Services
            'radiology': 1.0,
            'diagnostic_radiology': 1.0,
            'interventional_radiology': 1.2,
            'nuclear_medicine': 1.1,
            'pathology': 0.9,
            'clinical_pathology': 0.9,
            'anatomic_pathology': 0.9,
            
            // Emergency & Critical Care
            'emergency_medicine': 1.3,
            'critical_care_medicine': 1.4,
            'intensive_care': 1.4,
            'trauma_center': 1.5,
            
            // Anesthesiology & Pain Management
            'anesthesiology': 1.2,
            'pain_management': 1.0,
            'pain_medicine': 1.0,
            
            // Rehabilitation & Physical Medicine
            'physical_medicine_rehabilitation': 0.9,
            'physical_therapy': 0.6,
            'occupational_therapy': 0.6,
            'speech_therapy': 0.5,
            'rehabilitation_medicine': 0.9,
            
            // Oncology
            'medical_oncology': 1.2,
            'radiation_oncology': 1.3,
            'hematology': 1.1,
            'hematology_oncology': 1.2,
            
            // Allergy & Immunology
            'allergy_immunology': 0.8,
            'clinical_immunology': 0.9,
            
            // Preventive Medicine
            'preventive_medicine': 0.7,
            'public_health': 0.6,
            'occupational_medicine': 0.8,
            'aerospace_medicine': 0.7,
            
            // Dental & Oral Health
            'general_dentistry': 0.6,
            'oral_surgery': 1.0,
            'orthodontics': 0.5,
            'periodontics': 0.7,
            'endodontics': 0.7,
            'pediatric_dentistry': 0.6,
            'prosthodontics': 0.8,
            'oral_maxillofacial_surgery': 1.1,
            
            // Eye Care
            'optometry': 0.5,
            'optical_services': 0.4,
            
            // Alternative & Complementary Medicine
            'chiropractic': 0.6,
            'acupuncture': 0.5,
            'naturopathic_medicine': 0.6,
            'integrative_medicine': 0.7,
            
            // Long-term Care & Facilities
            'nursing_home': 1.1,
            'skilled_nursing_facility': 1.2,
            'assisted_living': 0.9,
            'rehabilitation_facility': 1.0,
            'hospice': 1.0,
            'palliative_care': 0.9,
            
            // Home Health & Mobile Services
            'home_health': 0.8,
            'mobile_health': 0.7,
            'telemedicine': 0.6,
            'virtual_care': 0.6,
            
            // Specialty Clinics
            'wound_care_center': 1.0,
            'infusion_center': 1.1,
            'dialysis_center': 1.2,
            'sleep_center': 0.9,
            'ambulatory_surgery_center': 1.1,
            
            // Research & Academic
            'medical_research': 0.8,
            'clinical_trials': 1.0,
            'academic_medical_center': 1.3,
            'teaching_hospital': 1.4,
            
            // Corporate & Occupational Health
            'occupational_health': 0.8,
            'corporate_health': 0.7,
            'employee_health': 0.7,
            'workplace_health': 0.8,
            
            // Retail & Convenience Care
            'retail_clinic': 0.6,
            'convenience_clinic': 0.6,
            'pharmacy_clinic': 0.7,
            
            // Multi-Specialty Groups
            'multi_specialty_group': 1.0,
            'physician_group_practice': 0.9,
            'medical_group': 0.9,
            
            // Other Healthcare Services
            'case_management': 0.6,
            'care_coordination': 0.6,
            'health_coaching': 0.5,
            'medical_consulting': 0.7,
            
            // Default for unspecified types
            'other': 0.8,
            'unspecified': 0.8
        };
        
        // State-specific risk multipliers based on regulatory complexity
        this.stateMultipliers = {
            // High Regulatory Burden States
            'california': 1.4,
            'ca': 1.4,
            'new_york': 1.3,
            'ny': 1.3,
            'massachusetts': 1.3,
            'ma': 1.3,
            'illinois': 1.2,
            'il': 1.2,
            'washington': 1.2,
            'wa': 1.2,
            'oregon': 1.2,
            'or': 1.2,
            'new_jersey': 1.2,
            'nj': 1.2,
            'connecticut': 1.2,
            'ct': 1.2,
            'rhode_island': 1.2,
            'ri': 1.2,
            'maryland': 1.2,
            'md': 1.2,
            'delaware': 1.2,
            'de': 1.2,
            
            // Moderate Regulatory Burden States
            'texas': 1.1,
            'tx': 1.1,
            'florida': 1.1,
            'fl': 1.1,
            'pennsylvania': 1.1,
            'pa': 1.1,
            'ohio': 1.1,
            'oh': 1.1,
            'michigan': 1.1,
            'mi': 1.1,
            'georgia': 1.1,
            'ga': 1.1,
            'north_carolina': 1.1,
            'nc': 1.1,
            'virginia': 1.1,
            'va': 1.1,
            'arizona': 1.1,
            'az': 1.1,
            'colorado': 1.1,
            'co': 1.1,
            'nevada': 1.1,
            'nv': 1.1,
            'minnesota': 1.1,
            'mn': 1.1,
            'wisconsin': 1.1,
            'wi': 1.1,
            'missouri': 1.1,
            'mo': 1.1,
            'tennessee': 1.1,
            'tn': 1.1,
            'indiana': 1.1,
            'in': 1.1,
            'kentucky': 1.1,
            'ky': 1.1,
            'south_carolina': 1.1,
            'sc': 1.1,
            'oklahoma': 1.1,
            'ok': 1.1,
            'kansas': 1.1,
            'ks': 1.1,
            'louisiana': 1.1,
            'la': 1.1,
            'alabama': 1.1,
            'al': 1.1,
            'mississippi': 1.1,
            'ms': 1.1,
            'arkansas': 1.1,
            'ar': 1.1,
            'west_virginia': 1.1,
            'wv': 1.1,
            'new_mexico': 1.1,
            'nm': 1.1,
            'utah': 1.1,
            'ut': 1.1,
            'idaho': 1.1,
            'id': 1.1,
            'montana': 1.1,
            'mt': 1.1,
            'wyoming': 1.1,
            'wy': 1.1,
            'north_dakota': 1.1,
            'nd': 1.1,
            'south_dakota': 1.1,
            'sd': 1.1,
            'nebraska': 1.1,
            'ne': 1.1,
            'iowa': 1.1,
            'ia': 1.1,
            
            // Standard Regulatory Burden States (1.0x multiplier)
            'alaska': 1.0,
            'ak': 1.0,
            'hawaii': 1.0,
            'hi': 1.0,
            'maine': 1.0,
            'me': 1.0,
            'new_hampshire': 1.0,
            'nh': 1.0,
            'vermont': 1.0,
            'vt': 1.0,
            
            // Default for unspecified states
            'other': 1.0,
            'unspecified': 1.0,
            'unknown': 1.0
        };
        
        this.auditProbabilityFactors = {
            // Factors that increase audit likelihood
            complaints: 0.3,
            breachHistory: 0.4,
            size: 0.2,
            complexity: 0.1
        };
    }

    // Core risk calculation algorithm
    calculateRiskScore(assessmentData) {
        let totalRiskScore = 0;
        let riskBreakdown = {};
        let auditProbability = 0;
        
        // Calculate risk for each category
        for (const [category, factors] of Object.entries(this.riskFactors)) {
            let categoryScore = 0;
            let categoryDetails = [];
            
            for (const [factor, config] of Object.entries(factors)) {
                const factorValue = this.getFactorValue(assessmentData, category, factor);
                const weightedScore = factorValue * config.weight * this.severityMultipliers[config.severity];
                categoryScore += weightedScore;
                
                categoryDetails.push({
                    factor,
                    value: factorValue,
                    weight: config.weight,
                    severity: config.severity,
                    weightedScore,
                    riskLevel: this.determineRiskLevel(weightedScore)
                });
            }
            
            totalRiskScore += categoryScore;
            riskBreakdown[category] = {
                score: categoryScore,
                details: categoryDetails,
                riskLevel: this.determineRiskLevel(categoryScore)
            };
        }
        
        // Apply unified industry and state multiplier with validation
        const validatedPracticeType = this.validatePracticeType(assessmentData.practiceType);
        const validatedState = this.validateState(assessmentData.state);
        
        const industryMultiplier = this.industryMultipliers[validatedPracticeType] || 1.0;
        const stateMultiplier = this.stateMultipliers[validatedState] || 1.0;
        const unifiedMultiplier = industryMultiplier * stateMultiplier;
        
        totalRiskScore *= unifiedMultiplier;
        
        // Calculate audit probability
        auditProbability = this.calculateAuditProbability(assessmentData, totalRiskScore);
        
        // Generate risk mitigation recommendations
        const recommendations = this.generateRecommendations(riskBreakdown);
        
        return {
            overallScore: Math.round(totalRiskScore * 100) / 100,
            riskLevel: this.determineRiskLevel(totalRiskScore),
            breakdown: riskBreakdown,
            auditProbability: Math.round(auditProbability * 100),
            recommendations,
            timestamp: new Date().toISOString(),
            proprietaryAlgorithm: 'TrustMD Risk Engine v2.0',
            unifiedMultiplier: {
                industry: {
                    practiceType: validatedPracticeType,
                    multiplier: industryMultiplier
                },
                state: {
                    state: validatedState,
                    multiplier: stateMultiplier
                },
                combined: unifiedMultiplier,
                breakdown: `Industry (${industryMultiplier}x) × State (${stateMultiplier}x) = ${unifiedMultiplier}x`
            }
        };
    }
    
    // Get factor value from assessment data
    getFactorValue(data, category, factor) {
        const mapping = {
            documentation: {
                missingConsentForms: () => (data.missingConsentForms || 0) / 10,
                outdatedPolicies: () => (data.outdatedPolicies || 0) / 20,
                incompleteTraining: () => (data.incompleteTraining || 0) / 15,
                auditGaps: () => (data.auditGaps || 0) / 10
            },
            operational: {
                staffTurnover: () => Math.min((data.staffTurnoverRate || 0) / 30, 1),
                systemDowntime: () => (data.systemDowntimeHours || 0) / 100,
                processInefficiencies: () => (data.processInefficiencies || 0) / 20,
                resourceConstraints: () => (data.resourceConstraints || 0) / 15,
                communicationGaps: () => (data.communicationGaps || 0) / 10
            },
            technical: {
                dataSecurity: () => this.calculateSecurityRisk(data),
                systemIntegration: () => (data.integrationIssues || 0) / 10,
                backupRecovery: () => (data.backupRecoveryIssues || 0) / 5,
                accessControls: () => (data.accessControlIssues || 0) / 8
            },
            regulatory: {
                hipaaCompliance: () => this.calculateHIPAARisk(data),
                oshaCompliance: () => this.calculateOSHACompliance(data),
                deaCompliance: () => this.calculateDEACompliance(data),
                medicareMedicaidCompliance: () => this.calculateMedicareMedicaidCompliance(data),
                accreditationRequirements: () => this.calculateAccreditationCompliance(data),
                stateRegulations: () => this.calculateStateRegulations(data)
            }
        };
        
        return mapping[category]?.[factor]?.() || 0;
    }
    
    // Calculate security risk (proprietary algorithm)
    calculateSecurityRisk(data) {
        let securityScore = 0;
        
        // Encryption status
        if (!data.encryptionEnabled) securityScore += 0.3;
        
        // Access control maturity
        securityScore += (1 - (data.accessControlMaturity || 0)) * 0.25;
        
        // Security incidents
        securityScore += (data.securityIncidents || 0) * 0.15;
        
        // Vulnerability assessments
        securityScore += (data.vulnerabilities || 0) * 0.1;
        
        // Employee security training
        securityScore += (1 - (data.securityTrainingCompletion || 0)) * 0.2;
        
        return Math.min(securityScore, 1);
    }
    
    // Calculate HIPAA compliance risk (proprietary algorithm)
    calculateHIPAARisk(data) {
        let hipaaScore = 0;
        
        // Privacy policies
        if (!data.privacyPolicyCurrent) hipaaScore += 0.2;
        
        // Business associate agreements
        hipaaScore += (data.missingBAAs || 0) * 0.1;
        
        // Risk assessments
        if (!data.riskAssessmentCurrent) hipaaScore += 0.15;
        
        // Training completion
        hipaaScore += (1 - (data.hipaaTrainingCompletion || 0)) * 0.25;
        
        // Breach notification procedures
        if (!data.breachNotificationProcedures) hipaaScore += 0.15;
        
        // Patient rights procedures
        if (!data.patientRightsProcedures) hipaaScore += 0.1;
        
        // Security measures
        hipaaScore += (1 - (data.securityMeasuresScore || 0)) * 0.15;
        
        return Math.min(hipaaScore, 1);
    }
    
    // Calculate OSHA compliance risk (proprietary algorithm)
    calculateOSHACompliance(data) {
        let oshaScore = 0;
        
        // Safety and health program
        if (!data.safetyHealthPlanCurrent) oshaScore += 0.15;
        
        // Hazard communication program
        if (!data.hazardCommunicationProgram) oshaScore += 0.15;
        
        // Bloodborne pathogens program
        if (!data.bloodbornePathogensProgram) oshaScore += 0.12;
        
        // Training completion rates
        oshaScore += (1 - (data.oshaTrainingCompletion || 0)) * 0.2;
        
        // OSHA 300 log maintenance
        if (!data.osha300LogCurrent) oshaScore += 0.1;
        
        // Safety committee
        if (!data.safetyCommitteeActive) oshaScore += 0.08;
        
        // Workplace injury rate (higher injuries = higher risk)
        const injuryRate = data.workplaceInjuryRate || 0;
        if (injuryRate > 5) oshaScore += 0.1;
        else if (injuryRate > 2) oshaScore += 0.05;
        
        // Safety inspections
        const inspectionFrequency = data.safetyInspectionFrequency || 0;
        if (inspectionFrequency < 2) oshaScore += 0.1; // Less than quarterly
        
        // Hazardous materials management
        if (!data.hazardousMaterialsManaged) oshaScore += 0.08;
        
        // Emergency action plan
        if (!data.emergencyActionPlan) oshaScore += 0.12;
        
        return Math.min(oshaScore, 1);
    }
    
    // Calculate State Regulations compliance risk (proprietary algorithm)
    calculateStateRegulations(data) {
        let stateScore = 0;
        
        // Medical license compliance
        if (!data.medicalLicensesCurrent) stateScore += 0.2;
        if (data.expiredLicenses > 0) stateScore += (data.expiredLicenses * 0.1);
        
        // State privacy laws compliance
        if (!data.statePrivacyCompliant) stateScore += 0.15;
        if (!data.dataBreachNotificationProcess) stateScore += 0.1;
        
        // State reporting requirements
        if (!data.stateReportingCompliant) stateScore += 0.15;
        if (data.overdueStateReports > 0) stateScore += (data.overdueStateReports * 0.05);
        
        // State inspection compliance
        if (!data.stateInspectionCompliant) stateScore += 0.1;
        if (data.stateInspectionViolations > 0) stateScore += (data.stateInspectionViolations * 0.03);
        
        // Continuing education compliance
        if (!data.stateCECompliant) stateScore += 0.15;
        if (data.insufficientCEHours > 0) stateScore += (data.insufficientCEHours * 0.02);
        
        // State-specific requirements
        if (!data.controlledSubstancesCompliant) stateScore += 0.1;
        if (!data.prescriptionMonitoringCompliant) stateScore += 0.08;
        if (!data.telemedicineCompliant) stateScore += 0.07;
        
        // State medical board requirements
        if (!data.medicalBoardRequirementsMet) stateScore += 0.1;
        if (data.pendingBoardActions > 0) stateScore += (data.pendingBoardActions * 0.05);
        
        return Math.min(stateScore, 1);
    }
    
    // Calculate DEA compliance risk (proprietary algorithm)
    calculateDEACompliance(data) {
        let deaScore = 0;
        
        // DEA registration status
        if (!data.deaRegistrationActive) deaScore += 0.3;
        if (data.deaRegistrationExpiring) deaScore += 0.2;
        if (data.expiredDEARegistration > 0) deaScore += (data.expiredDEARegistration * 0.4);
        
        // DEA training compliance
        deaScore += (1 - (data.deaTrainingCompletion || 0)) * 0.25;
        if (data.overdueDEATraining > 0) deaScore += (data.overdueDEATraining * 0.1);
        
        // Diversion prevention program
        if (!data.diversionPreventionProgram) deaScore += 0.2;
        if (!data.diversionPreventionCurrent) deaScore += 0.1;
        
        // Record keeping compliance
        if (!data.deaRecordKeepingCompliant) deaScore += 0.15;
        if (data.deaRecordKeepingViolations > 0) deaScore += (data.deaRecordKeepingViolations * 0.05);
        
        // Inspection compliance
        if (data.deaInspectionViolations > 0) deaScore += (data.deaInspectionViolations * 0.1);
        if (data.pendingDEACorrectiveActions > 0) deaScore += (data.pendingDEACorrectiveActions * 0.08);
        
        // Controlled substance handling
        if (!data.controlledSubstanceProcedures) deaScore += 0.1;
        if (data.controlledSubstanceDiscrepancies > 0) deaScore += (data.controlledSubstanceDiscrepancies * 0.03);
        
        // Inventory management
        if (!data.deaInventoryManagement) deaScore += 0.08;
        if (data.deaInventoryReconciliationIssues > 0) deaScore += (data.deaInventoryReconciliationIssues * 0.04);
        
        // Emergency ordering procedures
        if (!data.emergencyOrderingProcedures) deaScore += 0.05;
        if (data.emergencyOrderingViolations > 0) deaScore += (data.emergencyOrderingViolations * 0.02);
        
        return Math.min(deaScore, 1);
    }
    
    // Calculate Medicare-Medicaid compliance risk (proprietary algorithm)
    calculateMedicareMedicaidCompliance(data) {
        let mmScore = 0;
        
        // Medicare enrollment status
        if (!data.medicareEnrollmentActive) mmScore += 0.25;
        if (data.medicareRevalidationOverdue) mmScore += 0.3;
        if (data.expiredMedicareEnrollment > 0) mmScore += (data.expiredMedicareEnrollment * 0.4);
        
        // Medicaid enrollment status
        if (!data.medicaidEnrollmentActive) mmScore += 0.2;
        if (data.medicaidRevalidationOverdue) mmScore += 0.25;
        if (data.expiredMedicaidEnrollment > 0) mmScore += (data.expiredMedicaidEnrollment * 0.35);
        
        // Billing compliance programs
        if (!data.billingCompliancePrograms) mmScore += 0.2;
        if (!data.codingComplianceProgram) mmScore += 0.15;
        if (!data.fraudDetectionProgram) mmScore += 0.2;
        
        // Audit compliance
        if (data.billingAuditFailures > 0) mmScore += (data.billingAuditFailures * 0.15);
        if (data.pendingAuditCorrectiveActions > 0) mmScore += (data.pendingAuditCorrectiveActions * 0.1);
        
        // Fraud prevention training
        mmScore += (1 - (data.fraudPreventionTrainingCompletion || 0)) * 0.2;
        if (data.overdueFraudTraining > 0) mmScore += (data.overdueFraudTraining * 0.1);
        
        // Credentialing documents
        if (data.expiredCredentialingDocuments > 0) mmScore += (data.expiredCredentialingDocuments * 0.1);
        if (data.missingCredentialingDocuments > 0) mmScore += (data.missingCredentialingDocuments * 0.08);
        
        // Compliance monitoring
        if (!data.regularComplianceMonitoring) mmScore += 0.15;
        if (data.complianceMonitoringGaps > 0) mmScore += (data.complianceMonitoringGaps * 0.05);
        
        // PECOS enrollment
        if (!data.pecosEnrollment) mmScore += 0.1;
        if (data.pecosIssues > 0) mmScore += (data.pecosIssues * 0.05);
        
        // Managed care participation
        if (!data.managedCareParticipation) mmScore += 0.08;
        if (data.managedCareComplianceIssues > 0) mmScore += (data.managedCareComplianceIssues * 0.03);
        
        // Fee schedule compliance
        if (!data.feeScheduleCompliance) mmScore += 0.1;
        if (data.feeScheduleIssues > 0) mmScore += (data.feeScheduleIssues * 0.04);
        
        // Overpayment recovery
        if (data.overpaymentIssues > 0) mmScore += (data.overpaymentIssues * 0.12);
        if (!data.overpaymentTracking) mmScore += 0.08;
        
        // Reporting compliance
        if (!data.adverseEventReporting) mmScore += 0.1;
        if (data.reportingViolations > 0) mmScore += (data.reportingViolations * 0.06);
        
        return Math.min(mmScore, 1);
    }
    
    // Calculate accreditation compliance risk (proprietary algorithm)
    calculateAccreditationCompliance(data) {
        let accreditationScore = 0;
        
        // Accreditation status
        if (!data.accreditationActive) accreditationScore += 0.25;
        if (data.expiredAccreditation > 0) accreditationScore += (data.expiredAccreditation * 0.3);
        if (data.suspendedAccreditation > 0) accreditationScore += (data.suspendedAccreditation * 0.4);
        
        // Survey readiness
        if (!data.surveyReadinessProgram) accreditationScore += 0.2;
        if (data.upcomingSurveyUnprepared) accreditationScore += 0.25;
        if (data.failedSurveys > 0) accreditationScore += (data.failedSurveys * 0.15);
        
        // Standards compliance
        accreditationScore += (1 - (data.standardsComplianceRate || 0)) * 0.2;
        if (data.nonCompliantStandards > 0) accreditationScore += (data.nonCompliantStandards * 0.1);
        if (data.unassessedStandards > 0) accreditationScore += (data.unassessedStandards * 0.05);
        
        // Findings and corrective actions
        if (data.openSurveyFindings > 0) accreditationScore += (data.openSurveyFindings * 0.12);
        if (data.criticalFindings > 0) accreditationScore += (data.criticalFindings * 0.2);
        if (data.overdueCorrectiveActions > 0) accreditationScore += (data.overdueCorrectiveActions * 0.15);
        
        // Continuous readiness
        if (!data.continuousReadinessProgram) accreditationScore += 0.15;
        if (data.readinessGaps > 0) accreditationScore += (data.readinessGaps * 0.08);
        if (data.lowReadinessScores > 0) accreditationScore += (data.lowReadinessScores * 0.1);
        
        // Performance improvement
        if (!data.performanceImprovementProgram) accreditationScore += 0.1;
        if (data.ineffectivePIProjects > 0) accreditationScore += (data.ineffectivePIProjects * 0.05);
        
        // Documentation and evidence
        if (!data.complianceDocumentation) accreditationScore += 0.12;
        if (data.missingEvidenceDocuments > 0) accreditationScore += (data.missingEvidenceDocuments * 0.03);
        
        // Staff training and competency
        if (!data.accreditationStaffTraining) accreditationScore += 0.08;
        if (data.trainingGaps > 0) accreditationScore += (data.trainingGaps * 0.04);
        
        // Leadership engagement
        if (!data.leadershipAccreditationEngagement) accreditationScore += 0.1;
        if (data.governanceIssues > 0) accreditationScore += (data.governanceIssues * 0.06);
        
        // Quality improvement integration
        if (!data.qualityImprovementIntegration) accreditationScore += 0.08;
        if (data.qiComplianceGaps > 0) accreditationScore += (data.qiComplianceGaps * 0.04);
        
        // Patient safety integration
        if (!data.patientSafetyIntegration) accreditationScore += 0.1;
        if (data.safetyComplianceIssues > 0) accreditationScore += (data.safetyComplianceIssues * 0.05);
        
        // Infection control compliance
        if (!data.infectionControlCompliance) accreditationScore += 0.08;
        if (data.infectionControlGaps > 0) accreditationScore += (data.infectionControlGaps * 0.04);
        
        // Emergency management
        if (!data.emergencyManagementCompliance) accreditationScore += 0.06;
        if (data.emergencyManagementGaps > 0) accreditationScore += (data.emergencyManagementGaps * 0.03);
        
        // Medication management
        if (!data.medicationManagementCompliance) accreditationScore += 0.08;
        if (data.medicationManagementGaps > 0) accreditationScore += (data.medicationManagementGaps * 0.04);
        
        return Math.min(accreditationScore, 1);
    }
    
    // Calculate audit probability (proprietary algorithm)
    calculateAuditProbability(data, riskScore) {
        let probability = 0.05; // Base 5% probability
        
        // Risk-based increase
        probability += (riskScore / 100) * 0.3;
        
        // Historical factors
        if (data.previousAuditFindings) probability += 0.1;
        if (data.breachHistory) probability += 0.15;
        if (data.complaintsReceived) probability += 0.1;
        
        // Practice size factor
        if (data.practiceSize === 'large') probability += 0.05;
        if (data.practiceSize === 'medium') probability += 0.02;
        
        // Complexity factor
        if (data.multipleLocations) probability += 0.03;
        if (data.specializedServices) probability += 0.02;
        
        return Math.min(probability, 0.8); // Cap at 80%
    }
    
    // Determine risk level
    determineRiskLevel(score) {
        if (score >= 0.8) return 'critical';
        if (score >= 0.6) return 'high';
        if (score >= 0.4) return 'medium';
        if (score >= 0.2) return 'low';
        return 'minimal';
    }
    
    // Generate proprietary recommendations
    generateRecommendations(riskBreakdown) {
        const recommendations = [];
        
        for (const [category, data] of Object.entries(riskBreakdown)) {
            // Get top 3 highest scoring factors
            const topFactors = data.details
                .sort((a, b) => b.weightedScore - a.weightedScore)
                .slice(0, 3);
            
            for (const factor of topFactors) {
                if (factor.weightedScore > 0.1) { // Only include significant risks
                    recommendations.push({
                        category,
                        factor: factor.factor,
                        impact: factor.weightedScore,
                        severity: factor.severity,
                        priority: this.calculatePriority(factor.weightedScore),
                        action: this.generateActionItem(category, factor.factor),
                        timeframe: this.getTimeframe(factor.severity),
                        estimatedCost: this.estimateMitigationCost(category, factor.factor),
                        riskReduction: this.estimateRiskReduction(factor.weightedScore)
                    });
                }
            }
        }
        
        // Sort by priority
        return recommendations.sort((a, b) => b.priority - a.priority);
    }
    
    // Calculate priority score
    calculatePriority(impact) {
        return Math.round(impact * 100);
    }
    
    // Generate specific action items
    generateActionItem(category, factor) {
        const actionMap = {
            documentation: {
                missingConsentForms: 'Conduct comprehensive consent form audit and update all patient records',
                outdatedPolicies: 'Review and update all policies to meet current regulatory requirements',
                incompleteTraining: 'Implement mandatory training completion tracking and reminders',
                auditGaps: 'Establish quarterly internal audit schedule with detailed checklists'
            },
            operational: {
                staffTurnover: 'Develop staff retention program and cross-training procedures',
                systemDowntime: 'Implement system monitoring and backup redundancy protocols',
                processInefficiencies: 'Conduct workflow analysis and optimize critical processes',
                resourceConstraints: 'Assess resource allocation and implement efficiency improvements',
                communicationGaps: 'Establish standardized communication protocols and regular team meetings'
            },
            technical: {
                dataSecurity: 'Implement comprehensive data encryption and access controls',
                systemIntegration: 'Develop integration roadmap and prioritize critical connections',
                backupRecovery: 'Establish automated backup procedures with regular testing',
                accessControls: 'Implement role-based access control with regular audits'
            },
            regulatory: {
                hipaaCompliance: 'Conduct full HIPAA compliance assessment and remediation',
                oshaCompliance: 'Implement comprehensive OSHA compliance program including safety plans and training',
                stateRegulations: 'Address state-specific regulatory requirements including licensing, reporting, and CME',
                industryStandards: 'Align with industry best practices and accreditation standards',
                accreditationRequirements: 'Prepare for accreditation review with comprehensive documentation'
            }
        };
        
        return actionMap[category]?.[factor] || 'Develop specific mitigation strategy for this risk factor';
    }
    
    // Get timeframe for mitigation
    getTimeframe(severity) {
        const timeframes = {
            critical: 'Immediate (0-30 days)',
            high: 'Urgent (30-60 days)',
            medium: 'Planned (60-90 days)',
            low: 'Scheduled (90-180 days)'
        };
        
        return timeframes[severity] || 'Planned (60-90 days)';
    }
    
    // Estimate mitigation cost
    estimateMitigationCost(category, factor) {
        const costMap = {
            documentation: {
                missingConsentForms: '$2,000 - $5,000',
                outdatedPolicies: '$1,500 - $3,000',
                incompleteTraining: '$3,000 - $8,000',
                auditGaps: '$2,500 - $6,000'
            },
            operational: {
                staffTurnover: '$5,000 - $15,000',
                systemDowntime: '$3,000 - $10,000',
                processInefficiencies: '$2,000 - $7,000',
                resourceConstraints: '$4,000 - $12,000',
                communicationGaps: '$1,000 - $3,000'
            },
            technical: {
                dataSecurity: '$5,000 - $20,000',
                systemIntegration: '$8,000 - $25,000',
                backupRecovery: '$2,000 - $8,000',
                accessControls: '$3,000 - $10,000'
            },
            regulatory: {
                hipaaCompliance: '$10,000 - $50,000',
                oshaCompliance: '$5,000 - $25,000',
                stateRegulations: '$8,000 - $35,000',
                industryStandards: '$3,000 - $15,000',
                accreditationRequirements: '$8,000 - $30,000'
            }
        };
        
        return costMap[category]?.[factor] || '$2,000 - $10,000';
    }
    
    // Estimate risk reduction percentage
    estimateRiskReduction(impact) {
        if (impact >= 0.8) return '85-95%';
        if (impact >= 0.6) return '70-85%';
        if (impact >= 0.4) return '50-70%';
        if (impact >= 0.2) return '30-50%';
        return '20-30%';
    }
    
    // Generate risk trend analysis
    analyzeRiskTrend(historicalAssessments) {
        if (historicalAssessments.length < 2) {
            return {
                trend: 'insufficient_data',
                recommendation: 'Continue regular risk assessments to establish trend analysis'
            };
        }
        
        const recent = historicalAssessments.slice(-3); // Last 3 assessments
        const scores = recent.map(a => a.overallScore);
        
        const trend = this.calculateTrend(scores);
        const volatility = this.calculateVolatility(scores);
        
        return {
            trend,
            volatility,
            direction: scores[scores.length - 1] > scores[0] ? 'increasing' : 'decreasing',
            averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
            recommendation: this.generateTrendRecommendation(trend, volatility)
        };
    }
    
    // Calculate trend
    calculateTrend(scores) {
        if (scores.length < 2) return 'stable';
        
        const change = scores[scores.length - 1] - scores[0];
        const percentChange = (change / scores[0]) * 100;
        
        if (Math.abs(percentChange) < 5) return 'stable';
        return percentChange > 0 ? 'improving' : 'deteriorating';
    }
    
    // Calculate volatility
    calculateVolatility(scores) {
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const standardDeviation = Math.sqrt(variance);
        
        if (standardDeviation < 0.1) return 'low';
        if (standardDeviation < 0.2) return 'medium';
        return 'high';
    }
    
    // Generate trend-based recommendations
    generateTrendRecommendation(trend, volatility) {
        if (trend === 'deteriorating' && volatility === 'high') {
            return 'Immediate intervention required - risk factors are increasing and unpredictable';
        } else if (trend === 'deteriorating') {
            return 'Risk factors are trending upward - implement mitigation strategies immediately';
        } else if (trend === 'improving' && volatility === 'low') {
            return 'Excellent progress - maintain current risk management strategies';
        } else if (trend === 'improving') {
            return 'Good progress - continue current approach but monitor for volatility';
        } else {
            return 'Risk levels are stable - continue regular monitoring and assessment';
        }
    }
    
    // Helper method to validate and normalize practice type
    validatePracticeType(practiceType) {
        if (!practiceType) return 'unspecified';
        
        // Normalize input: lowercase, replace spaces and hyphens with underscores
        const normalized = practiceType.toLowerCase().replace(/[\s\-]+/g, '_');
        
        // Direct match check
        if (this.industryMultipliers.hasOwnProperty(normalized)) {
            return normalized;
        }
        
        // Fuzzy matching for common variations
        const fuzzyMatches = {
            // Primary Care variations
            'family_practice': 'family_medicine',
            'family_doc': 'family_medicine',
            'gp': 'general_practice',
            'primary_care': 'general_practice',
            
            // Surgical variations
            'ortho': 'orthopedic_surgery',
            'ortho_surgery': 'orthopedic_surgery',
            'neurosurg': 'neurosurgery',
            'cardio_surgery': 'cardiothoracic_surgery',
            'ent': 'otolaryngology_ent',
            'ear_nose_throat': 'otolaryngology_ent',
            
            // Medical specialties
            'cardio': 'cardiology',
            'derm': 'dermatology',
            'endo': 'endocrinology',
            'gi': 'gastroenterology',
            'pulm': 'pulmonology',
            
            // Mental health variations
            'therapist': 'psychology',
            'mental_health': 'psychiatry',
            'counselor': 'counseling',
            
            // Dental variations
            'dentist': 'general_dentistry',
            'dental': 'general_dentistry',
            'ortho_dental': 'orthodontics',
            
            // Emergency variations
            'er': 'emergency_medicine',
            'ed': 'emergency_medicine',
            'icu': 'intensive_care',
            
            // Facility variations
            'snf': 'skilled_nursing_facility',
            'rehab': 'rehabilitation_facility',
            'asc': 'ambulatory_surgery_center',
            
            // Group practice variations
            'multispecialty': 'multi_specialty_group',
            'physician_group': 'physician_group_practice',
            'medical_group': 'medical_group'
        };
        
        // Check fuzzy matches
        if (fuzzyMatches[normalized]) {
            return fuzzyMatches[normalized];
        }
        
        // Partial matching for longer terms
        for (const [key, value] of Object.entries(this.industryMultipliers)) {
            if (key.includes(normalized) || normalized.includes(key)) {
                return key;
            }
        }
        
        // Check for partial matches in fuzzy mapping
        for (const [key, value] of Object.entries(fuzzyMatches)) {
            if (normalized.includes(key) || key.includes(normalized)) {
                return value;
            }
        }
        
        // Default fallback
        return 'unspecified';
    }
    
    // Get all available practice types
    getAllPracticeTypes() {
        return Object.keys(this.industryMultipliers);
    }
    
    // Get practice types by category
    getPracticeTypesByCategory() {
        const categories = {
            'Primary Care': ['family_medicine', 'internal_medicine', 'pediatrics', 'geriatrics', 'general_practice'],
            'Medical Specialties': ['cardiology', 'dermatology', 'endocrinology', 'gastroenterology', 'nephrology', 'pulmonology', 'rheumatology', 'infectious_disease'],
            'Surgical Specialties': ['general_surgery', 'orthopedic_surgery', 'neurosurgery', 'cardiothoracic_surgery', 'plastic_surgery', 'vascular_surgery', 'pediatric_surgery', 'urology', 'ophthalmology', 'otolaryngology_ent'],
            'Women\'s Health': ['obstetrics_gynecology', 'maternal_fetal_medicine', 'reproductive_endocrinology', 'gynecologic_oncology'],
            'Mental Health': ['psychiatry', 'psychology', 'counseling', 'addiction_medicine', 'behavioral_health'],
            'Neurological Specialties': ['neurology', 'neuropsychology', 'sleep_medicine'],
            'Diagnostic Services': ['radiology', 'diagnostic_radiology', 'interventional_radiology', 'nuclear_medicine', 'pathology', 'clinical_pathology', 'anatomic_pathology'],
            'Emergency & Critical Care': ['emergency_medicine', 'critical_care_medicine', 'intensive_care', 'trauma_center'],
            'Anesthesiology & Pain Management': ['anesthesiology', 'pain_management', 'pain_medicine'],
            'Rehabilitation & Physical Medicine': ['physical_medicine_rehabilitation', 'physical_therapy', 'occupational_therapy', 'speech_therapy', 'rehabilitation_medicine'],
            'Oncology': ['medical_oncology', 'radiation_oncology', 'hematology', 'hematology_oncology'],
            'Allergy & Immunology': ['allergy_immunology', 'clinical_immunology'],
            'Preventive Medicine': ['preventive_medicine', 'public_health', 'occupational_medicine', 'aerospace_medicine'],
            'Dental & Oral Health': ['general_dentistry', 'oral_surgery', 'orthodontics', 'periodontics', 'endodontics', 'pediatric_dentistry', 'prosthodontics', 'oral_maxillofacial_surgery'],
            'Eye Care': ['optometry', 'optical_services'],
            'Alternative & Complementary Medicine': ['chiropractic', 'acupuncture', 'naturopathic_medicine', 'integrative_medicine'],
            'Long-term Care & Facilities': ['nursing_home', 'skilled_nursing_facility', 'assisted_living', 'rehabilitation_facility', 'hospice', 'palliative_care'],
            'Home Health & Mobile Services': ['home_health', 'mobile_health', 'telemedicine', 'virtual_care'],
            'Specialty Clinics': ['wound_care_center', 'infusion_center', 'dialysis_center', 'sleep_center', 'ambulatory_surgery_center'],
            'Research & Academic': ['medical_research', 'clinical_trials', 'academic_medical_center', 'teaching_hospital'],
            'Corporate & Occupational Health': ['occupational_health', 'corporate_health', 'employee_health', 'workplace_health'],
            'Retail & Convenience Care': ['retail_clinic', 'convenience_clinic', 'pharmacy_clinic'],
            'Multi-Specialty Groups': ['multi_specialty_group', 'physician_group_practice', 'medical_group'],
            'Other Healthcare Services': ['case_management', 'care_coordination', 'health_coaching', 'medical_consulting'],
            'General Practice Types': ['hospital', 'clinic', 'private_practice', 'urgent_care', 'specialty_care']
        };
        
        return categories;
    }
    
    // Get risk multiplier for a practice type
    getRiskMultiplier(practiceType) {
        const validatedType = this.validatePracticeType(practiceType);
        return this.industryMultipliers[validatedType] || this.industryMultipliers['unspecified'];
    }
    
    // Get all available states
    getAllStates() {
        return Object.keys(this.stateMultipliers);
    }
    
    // Get states by regulatory burden category
    getStatesByRegulatoryBurden() {
        const categories = {
            'High Regulatory Burden (1.3-1.4x)': ['california', 'ca', 'new_york', 'ny', 'massachusetts', 'ma'],
            'Moderate-High Regulatory Burden (1.2x)': ['illinois', 'il', 'washington', 'wa', 'oregon', 'or', 'new_jersey', 'nj', 'connecticut', 'ct', 'rhode_island', 'ri', 'maryland', 'md', 'delaware', 'de'],
            'Moderate Regulatory Burden (1.1x)': ['texas', 'tx', 'florida', 'fl', 'pennsylvania', 'pa', 'ohio', 'oh', 'michigan', 'mi', 'georgia', 'ga', 'north_carolina', 'nc', 'virginia', 'va', 'arizona', 'az', 'colorado', 'co', 'nevada', 'nv', 'minnesota', 'mn', 'wisconsin', 'wi', 'missouri', 'mo', 'tennessee', 'tn', 'indiana', 'in', 'kentucky', 'ky', 'south_carolina', 'sc', 'oklahoma', 'ok', 'kansas', 'ks', 'louisiana', 'la', 'alabama', 'al', 'mississippi', 'ms', 'arkansas', 'ar', 'west_virginia', 'wv', 'new_mexico', 'nm', 'utah', 'ut', 'idaho', 'id', 'montana', 'mt', 'wyoming', 'wy', 'north_dakota', 'nd', 'south_dakota', 'sd', 'nebraska', 'ne', 'iowa', 'ia'],
            'Standard Regulatory Burden (1.0x)': ['alaska', 'ak', 'hawaii', 'hi', 'maine', 'me', 'new_hampshire', 'nh', 'vermont', 'vt']
        };
        
        return categories;
    }
    
    // Get state risk multiplier
    getStateRiskMultiplier(state) {
        const validatedState = this.validateState(state);
        return this.stateMultipliers[validatedState] || this.stateMultipliers['unspecified'];
    }
    
    // Get unified multiplier for practice type and state combination
    getUnifiedMultiplier(practiceType, state) {
        const industryMultiplier = this.getRiskMultiplier(practiceType);
        const stateMultiplier = this.getStateRiskMultiplier(state);
        return industryMultiplier * stateMultiplier;
    }
    
    // Helper method to validate and normalize state
    validateState(state) {
        if (!state) return 'unspecified';
        
        // Normalize input: lowercase, replace spaces and hyphens
        const normalized = state.toLowerCase().replace(/[\s\-]+/g, '_');
        
        // Direct match check
        if (this.stateMultipliers.hasOwnProperty(normalized)) {
            return normalized;
        }
        
        // Handle common state name variations
        const stateVariations = {
            // Full name to abbreviation mappings
            'california': 'ca',
            'new_york': 'ny',
            'new_york_state': 'ny',
            'massachusetts': 'ma',
            'illinois': 'il',
            'washington': 'wa',
            'washington_state': 'wa',
            'oregon': 'or',
            'new_jersey': 'nj',
            'connecticut': 'ct',
            'rhode_island': 'ri',
            'maryland': 'md',
            'delaware': 'de',
            'texas': 'tx',
            'florida': 'fl',
            'pennsylvania': 'pa',
            'penn': 'pa',
            'ohio': 'oh',
            'michigan': 'mi',
            'georgia': 'ga',
            'north_carolina': 'nc',
            'ncarolina': 'nc',
            'virginia': 'va',
            'arizona': 'az',
            'colorado': 'co',
            'nevada': 'nv',
            'minnesota': 'mn',
            'wisconsin': 'wi',
            'missouri': 'mo',
            'tennessee': 'tn',
            'indiana': 'in',
            'kentucky': 'ky',
            'south_carolina': 'sc',
            'scarolina': 'sc',
            'oklahoma': 'ok',
            'kansas': 'ks',
            'louisiana': 'la',
            'alabama': 'al',
            'mississippi': 'ms',
            'arkansas': 'ar',
            'west_virginia': 'wv',
            'wv': 'wv',
            'new_mexico': 'nm',
            'utah': 'ut',
            'idaho': 'id',
            'montana': 'mt',
            'wyoming': 'wy',
            'north_dakota': 'nd',
            'ndakota': 'nd',
            'south_dakota': 'sd',
            'sdakota': 'sd',
            'nebraska': 'ne',
            'iowa': 'ia',
            'alaska': 'ak',
            'hawaii': 'hi',
            'maine': 'me',
            'new_hampshire': 'nh',
            'vermont': 'vt',
            
            // Handle common input formats
            'ca_': 'ca',
            'ny_': 'ny',
            'tx_': 'tx',
            'fl_': 'fl',
            
            // Handle postal codes with dots or other separators
            'c.a.': 'ca',
            'n.y.': 'ny',
            't.x.': 'tx',
            'f.l.': 'fl',
            'c.a': 'ca',
            'n.y': 'ny',
            't.x': 'tx',
            'f.l': 'fl'
        };
        
        // Check variations
        if (stateVariations[normalized]) {
            const mappedState = stateVariations[normalized];
            return this.stateMultipliers[mappedState] ? mappedState : 'unspecified';
        }
        
        // Partial matching for state names
        for (const [key, value] of Object.entries(this.stateMultipliers)) {
            if (key.includes(normalized) || normalized.includes(key)) {
                return key;
            }
        }
        
        // Check partial matches in variations
        for (const [key, value] of Object.entries(stateVariations)) {
            if (normalized.includes(key) || key.includes(normalized)) {
                const mappedState = stateVariations[key];
                return this.stateMultipliers[mappedState] ? mappedState : 'unspecified';
            }
        }
        
        // Default fallback
        return 'unspecified';
    }

    // NEW: Cross-Reference Integration Methods
    
    // Calculate risk score including consistency factors
    async calculateRiskScoreWithConsistency(assessmentData, consistencyData = null) {
        try {
            // Get base risk score
            const baseRiskScore = await this.calculateRiskScore(assessmentData);
            
            // Get consistency data if not provided
            if (!consistencyData && this.supabaseClient) {
                consistencyData = await this.getConsistencyRiskFactors(assessmentData.tenantId);
            }
            
            // Add consistency risk factor
            const consistencyRiskFactor = this.calculateConsistencyRiskFactor(consistencyData);
            
            // Update risk factors to include consistency
            const updatedRiskFactors = {
                ...baseRiskScore.riskFactors,
                consistency: consistencyRiskFactor
            };
            
            // Recalculate overall score with consistency factor
            const overallScore = this.calculateOverallScoreWithConsistency(
                baseRiskScore.overallScore,
                consistencyRiskFactor
            );
            
            // Update audit probability based on consistency
            const updatedAuditProbability = this.calculateAuditProbabilityWithConsistency(
                baseRiskScore.auditProbability,
                consistencyRiskFactor
            );
            
            return {
                ...baseRiskScore,
                riskFactors: updatedRiskFactors,
                overallScore,
                auditProbability: updatedAuditProbability,
                consistencyImpact: {
                    score: consistencyRiskFactor.score,
                    impact: consistencyRiskFactor.impact,
                    recommendations: consistencyRiskFactor.recommendations
                }
            };
        } catch (error) {
            console.error('Error calculating risk score with consistency:', error);
            // Fallback to base risk score
            return this.calculateRiskScore(assessmentData);
        }
    }

    // Get consistency risk factors from database
    async getConsistencyRiskFactors(tenantId) {
        try {
            if (!this.supabaseClient) {
                return { score: 100, issues: [] };
            }

            // Get latest consistency check
            const { data: latestCheck, error: checkError } = await this.supabaseClient
                .from('consistency_checks')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('check_date', { ascending: false })
                .limit(1)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
            }

            // Get open consistency issues
            const { data: issues, error: issuesError } = await this.supabaseClient
                .from('consistency_issues')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('resolution_status', 'open')
                .order('severity', { ascending: false });

            if (issuesError) throw issuesError;

            return {
                score: latestCheck?.overall_score || 100,
                issues: issues || [],
                lastCheckDate: latestCheck?.check_date || null,
                criticalIssues: latestCheck?.critical_issues || 0,
                highIssues: latestCheck?.high_issues || 0
            };
        } catch (error) {
            console.error('Error getting consistency risk factors:', error);
            return { score: 100, issues: [] };
        }
    }

    // Calculate consistency risk factor
    calculateConsistencyRiskFactor(consistencyData) {
        const score = consistencyData?.score || 100;
        const issues = consistencyData?.issues || [];
        
        let impact = 'low';
        let riskScore = 0;
        const recommendations = [];

        // Determine impact based on consistency score
        if (score < 60) {
            impact = 'critical';
            riskScore = 40;
        } else if (score < 75) {
            impact = 'high';
            riskScore = 25;
        } else if (score < 85) {
            impact = 'medium';
            riskScore = 15;
        } else {
            impact = 'low';
            riskScore = 5;
        }

        // Add severity-based risk scoring
        const criticalCount = issues.filter(i => i.severity === 'critical').length;
        const highCount = issues.filter(i => i.severity === 'high').length;
        
        riskScore += (criticalCount * 15) + (highCount * 8);

        // Generate recommendations based on issues
        if (criticalCount > 0) {
            recommendations.push({
                priority: 'critical',
                action: 'Resolve critical consistency issues immediately',
                description: `${criticalCount} critical consistency issues found that could trigger audit violations`,
                estimatedImpact: 'Reduces audit probability by 20-30%'
            });
        }

        if (highCount > 0) {
            recommendations.push({
                priority: 'high',
                action: 'Address high-priority consistency issues',
                description: `${highCount} high-priority issues that should be resolved within 30 days`,
                estimatedImpact: 'Reduces audit probability by 10-15%'
            });
        }

        if (score < 80) {
            recommendations.push({
                priority: 'medium',
                action: 'Improve overall documentation consistency',
                description: `Current consistency score is ${score}%. Target score should be 85%+`,
                estimatedImpact: 'Reduces audit probability by 5-10%'
            });
        }

        return {
            score,
            impact,
            weight: 0.15, // 15% weight in overall risk calculation
            riskScore,
            recommendations
        };
    }

    // Calculate overall score including consistency
    calculateOverallScoreWithConsistency(baseScore, consistencyFactor) {
        const consistencyWeight = consistencyFactor.weight;
        const baseWeight = 1 - consistencyWeight;
        
        // Convert consistency score to risk contribution (lower score = higher risk)
        const consistencyRiskContribution = (100 - consistencyFactor.score) * consistencyWeight;
        const baseRiskContribution = baseScore * baseWeight;
        
        return Math.min(100, baseRiskContribution + consistencyRiskContribution);
    }

    // Calculate audit probability with consistency impact
    calculateAuditProbabilityWithConsistency(baseProbability, consistencyFactor) {
        const consistencyScore = consistencyFactor.score;
        const criticalIssues = consistencyFactor.criticalIssues || 0;
        const highIssues = consistencyFactor.highIssues || 0;
        
        let adjustedProbability = baseProbability;
        
        // Increase probability based on consistency issues
        if (consistencyScore < 60) {
            adjustedProbability += 25; // Poor consistency significantly increases audit risk
        } else if (consistencyScore < 75) {
            adjustedProbability += 15; // Fair consistency moderately increases risk
        } else if (consistencyScore < 85) {
            adjustedProbability += 8;  // Good consistency slightly increases risk
        }
        
        // Add issue-specific increases
        adjustedProbability += (criticalIssues * 10) + (highIssues * 5);
        
        return Math.min(95, adjustedProbability); // Cap at 95%
    }

    // Generate cross-reference specific recommendations
    generateCrossReferenceRecommendations(consistencyData, riskLevel) {
        const recommendations = [];
        const issues = consistencyData?.issues || [];
        
        // Group issues by type for consolidated recommendations
        const issueGroups = issues.reduce((groups, issue) => {
            if (!groups[issue.issue_type]) {
                groups[issue.issue_type] = [];
            }
            groups[issue.issue_type].push(issue);
            return groups;
        }, {});

        for (const [issueType, issueList] of Object.entries(issueGroups)) {
            const criticalIssues = issueList.filter(i => i.severity === 'critical');
            const highIssues = issueList.filter(i => i.severity === 'high');
            
            if (criticalIssues.length > 0) {
                recommendations.push({
                    type: 'consistency_critical',
                    priority: 'critical',
                    title: `Resolve ${criticalIssues.length} Critical ${this.formatIssueTypeName(issueType)} Issues`,
                    description: `Critical consistency issues in ${this.formatIssueTypeName(issueType)} that require immediate attention to avoid audit violations.`,
                    actionItems: criticalIssues.map(issue => issue.recommendation),
                    estimatedTime: '1-2 weeks',
                    riskReduction: '20-30%'
                });
            }
            
            if (highIssues.length > 0) {
                recommendations.push({
                    type: 'consistency_high',
                    priority: 'high',
                    title: `Address ${highIssues.length} High-Priority ${this.formatIssueTypeName(issueType)} Issues`,
                    description: `High-priority consistency issues that should be resolved within 30 days.`,
                    actionItems: highIssues.map(issue => issue.recommendation),
                    estimatedTime: '2-4 weeks',
                    riskReduction: '10-15%'
                });
            }
        }

        // Add overall consistency improvement recommendation
        if (consistencyData?.score < 85) {
            recommendations.push({
                type: 'consistency_improvement',
                priority: 'medium',
                title: 'Improve Overall Documentation Consistency',
                description: `Current consistency score is ${consistencyData.score}%. Implement systematic consistency checks to reach target of 85%+.`,
                actionItems: [
                    'Run monthly consistency validations',
                    'Establish document relationship management process',
                    'Implement automated consistency monitoring',
                    'Train staff on documentation standards'
                ],
                estimatedTime: '4-6 weeks',
                riskReduction: '5-10%'
            });
        }

        return recommendations;
    }

    // Format issue type name for display
    formatIssueTypeName(issueType) {
        return issueType.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    // Update risk factors to include consistency
    updateRiskFactorsWithConsistency(riskFactors, consistencyFactor) {
        return {
            ...riskFactors,
            consistency: {
                weight: consistencyFactor.weight,
                severity: consistencyFactor.impact,
                score: consistencyFactor.score,
                issues: consistencyFactor.issues?.length || 0,
                criticalIssues: consistencyFactor.criticalIssues || 0,
                highIssues: consistencyFactor.highIssues || 0
            }
        };
    }

    // Calculate compliance trend including consistency
    async calculateComplianceTrendWithConsistency(tenantId, days = 90) {
        try {
            if (!this.supabaseClient) {
                return { trend: [], consistencyTrend: [], combinedTrend: [] };
            }

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            // Get compliance scores trend
            const { data: complianceScores, error: complianceError } = await this.supabaseClient
                .from('compliance_scores')
                .select('calculated_at, score')
                .eq('tenant_id', tenantId)
                .gte('calculated_at', cutoffDate.toISOString())
                .order('calculated_at', { ascending: true });

            if (complianceError) throw complianceError;

            // Get consistency scores trend
            const { data: consistencyScores, error: consistencyError } = await this.supabaseClient
                .from('consistency_checks')
                .select('check_date, overall_score')
                .eq('tenant_id', tenantId)
                .gte('check_date', cutoffDate.toISOString())
                .order('check_date', { ascending: true });

            if (consistencyError) throw consistencyError;

            // Combine trends
            const combinedTrend = this.mergeComplianceTrends(
                complianceScores || [],
                consistencyScores || []
            );

            return {
                complianceTrend: complianceScores || [],
                consistencyTrend: consistencyScores || [],
                combinedTrend
            };
        } catch (error) {
            console.error('Error calculating compliance trend with consistency:', error);
            return { trend: [], consistencyTrend: [], combinedTrend: [] };
        }
    }

    // Merge compliance and consistency trends
    mergeComplianceTrends(complianceScores, consistencyScores) {
        const merged = [];
        const dateMap = new Map();

        // Add compliance scores
        complianceScores.forEach(score => {
            const date = score.calculated_at.split('T')[0];
            dateMap.set(date, {
                date,
                complianceScore: score.score,
                consistencyScore: null
            });
        });

        // Add consistency scores
        consistencyScores.forEach(score => {
            const date = score.check_date.split('T')[0];
            if (dateMap.has(date)) {
                dateMap.get(date).consistencyScore = score.overall_score;
            } else {
                dateMap.set(date, {
                    date,
                    complianceScore: null,
                    consistencyScore: score.overall_score
                });
            }
        });

        // Convert to array and sort
        return Array.from(dateMap.values())
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Set Supabase client for database operations
    setSupabaseClient(client) {
        this.supabaseClient = client;
    }

    // Initialize cross-reference integration
    async initializeCrossReferenceIntegration(tenantId) {
        this.tenantId = tenantId;
        
        if (this.supabaseClient) {
            // Set tenant context
            await this.supabaseClient.rpc('set_tenant_context', { tenant_id: tenantId });
        }
    }

    // Main risk assessment method using modular components
    async assessRisk(riskData, options = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('Risk engine not initialized. Call initialize() first.');
            }
            
            const assessmentOptions = {
                useCalibration: this.calibrationEnabled && (options.useCalibration !== false),
                includeValidation: true,
                includeCalibrationDetails: false,
                ...options
            };
            
            // Step 1: Validate input data
            let validationResult = { isValid: true, errors: [], warnings: [] };
            if (assessmentOptions.includeValidation && this.riskValidator) {
                validationResult = this.riskValidator.validateRiskData(riskData);
                
                if (!validationResult.isValid) {
                    throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
                }
            }
            
            // Step 2: Calculate base risk score
            let baseResult = {};
            if (this.riskCalculator) {
                baseResult = this.riskCalculator.calculateOverallRisk(riskData.riskFactors, riskData.industryType);
            }
            
            // Step 3: Apply calibration if enabled
            let calibratedResult = baseResult;
            if (assessmentOptions.useCalibration && this.riskCalibrator) {
                const calibration = this.riskCalibrator.calibrateRiskScore(
                    baseResult.overallScore,
                    riskData,
                    riskData.industryType
                );
                
                calibratedResult = {
                    ...baseResult,
                    overallScore: calibration.calibratedScore,
                    calibration: assessmentOptions.includeCalibrationDetails ? calibration : {
                        adjustment: calibration.adjustment,
                        adjustmentPercent: calibration.adjustmentPercent
                    }
                };
            }
            
            // Step 4: Add validation results
            calibratedResult.validation = validationResult;
            
            // Step 5: Add metadata
            calibratedResult.assessmentMetadata = {
                assessedAt: new Date().toISOString(),
                assessedBy: this.currentUserId,
                tenantId: this.currentTenantId,
                engineVersion: '3.0.0-deterministic',
                modulesUsed: {
                    calculator: !!this.riskCalculator,
                    validator: !!this.riskValidator,
                    calibrator: !!this.riskCalibrator && assessmentOptions.useCalibration
                },
                options: assessmentOptions
            };
            
            // Step 6: Log assessment for audit
            await this.logRiskCalculation(riskData, calibratedResult);
            
            return calibratedResult;
        } catch (error) {
            console.error('Risk assessment failed:', error);
            throw error;
        }
    }
    
    // Get module status and metrics
    getModuleStatus() {
        return {
            initialized: this.isInitialized,
            modules: {
                calculator: {
                    loaded: !!this.riskCalculator,
                    status: this.riskCalculator ? 'active' : 'not_loaded'
                },
                validator: {
                    loaded: !!this.riskValidator,
                    status: this.riskValidator ? 'active' : 'not_loaded'
                },
                calibrator: {
                    loaded: !!this.riskCalibrator,
                    status: this.riskCalibrator ? 'active' : 'not_loaded',
                    metrics: this.riskCalibrator ? this.riskCalibrator.getCalibrationStatistics() : null
                }
            },
            settings: {
                mlEnabled: this.mlEnabled,
                calibrationEnabled: this.calibrationEnabled
            }
        };
    }
    
    // Update module settings
    updateModuleSettings(settings) {
        if (settings.calibrationEnabled !== undefined) {
            this.calibrationEnabled = settings.calibrationEnabled;
        }
        // ML settings are ignored - ML is disabled
        console.log('Module settings updated (ML disabled):', {
            calibrationEnabled: this.calibrationEnabled
        });
    }
    
    // Update calibration with actual outcomes
    updateCalibration(calibrationId, actualOutcome, actualRiskLevel) {
        if (!this.riskCalibrator) {
            console.warn('Risk calibrator not initialized');
            return;
        }
        
        this.riskCalibrator.updateWithActualOutcome(calibrationId, actualOutcome, actualRiskLevel);
    }
}

// Export for use in application
window.TrustMDRiskEngine = TrustMDRiskEngine;
