// TrustMD Base State Compliance Manager
// Common functionality for all state compliance modules

class BaseStateComplianceManager {
    constructor(supabaseClient, tenantId, stateCode, stateName, regulatoryBurden) {
        this.supabaseClient = supabaseClient;
        this.tenantId = tenantId;
        this.stateCode = stateCode;
        this.stateName = stateName;
        this.regulatoryBurden = regulatoryBurden;
        this.requirements = {};
    }
    
    // Initialize state compliance manager
    async initialize() {
        try {
            // Load state-specific regulations from external config
            await this.loadRegulations();
            console.log(`${this.stateName} compliance manager initialized`);
            return true;
        } catch (error) {
            console.error(`Failed to initialize ${this.stateName} compliance:`, error);
            throw error;
        }
    }
    
    // Load state regulations from external JSON file
    async loadRegulations() {
        try {
            const response = await fetch(`/states/${this.stateCode.toLowerCase()}-regulations.json`);
            if (!response.ok) {
                throw new Error(`Failed to load ${this.stateCode} regulations`);
            }
            this.requirements = await response.json();
        } catch (error) {
            console.error(`Failed to load ${this.stateCode} regulations:`, error);
            // Fallback to default requirements
            this.requirements = this.getDefaultRequirements();
        }
    }
    
    // Get default requirements (fallback)
    getDefaultRequirements() {
        return {
            medicalBoard: {
                licenseRenewal: 'biennial',
                cmeHours: 50,
                painManagementHours: 12,
                controlledSubstancesHours: 8,
                ethicsHours: 0,
                telemedicineRequired: false,
                licenseVerification: true,
                backgroundCheck: true,
                malpracticeInsurance: true
            },
            privacy: {
                hipaaCompliance: true,
                statePrivacyLaws: false,
                breachNotification: '72_hours',
                patientRights: true,
                dataRetention: '6_years'
            },
            reporting: {
                incidentReporting: true,
                adverseEventReporting: true,
                prescriptionMonitoring: false,
                cmeReporting: true,
                licenseStatusReporting: true
            },
            inspections: {
                frequency: 'biennial',
                unannounced: false,
                telemedicineInspection: false,
                documentationReview: true,
                facilityInspection: true
            },
            penalties: {
                licenseViolation: '1000-10000',
                privacyViolation: '2500-25000',
                reportingViolation: '500-5000',
                practiceViolation: '1000-50000',
                criminalPenalties: 'felony_misdemeanor'
            }
        };
    }
    
    // Validate compliance data
    validateComplianceData(data) {
        try {
            const schema = this.getStateSchema();
            return this.validateAgainstSchema(data, schema);
        } catch (error) {
            console.error('Compliance validation failed:', error);
            return {
                isValid: false,
                errors: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }
    
    // Get state validation schema
    getStateSchema() {
        return {
            required: ['licenseNumber', 'expirationDate', 'cmeHours'],
            properties: {
                licenseNumber: { type: 'string', minLength: 1 },
                expirationDate: { type: 'string', format: 'date' },
                cmeHours: { type: 'number', minimum: 0 }
            }
        };
    }
    
    // Validate data against schema
    validateAgainstSchema(data, schema) {
        const errors = [];
        const warnings = [];
        
        // Check required fields
        if (schema.required) {
            for (const field of schema.required) {
                if (!data[field]) {
                    errors.push(`Missing required field: ${field}`);
                }
            }
        }
        
        // Check properties
        if (schema.properties && data) {
            for (const [field, rules] of Object.entries(schema.properties)) {
                const value = data[field];
                
                if (value !== undefined && value !== null) {
                    // Type validation
                    if (rules.type && typeof value !== rules.type) {
                        errors.push(`Field ${field} must be of type ${rules.type}`);
                    }
                    
                    // Length validation
                    if (rules.minLength && value.length < rules.minLength) {
                        errors.push(`Field ${field} must be at least ${rules.minLength} characters`);
                    }
                    
                    // Minimum value validation
                    if (rules.minimum && value < rules.minimum) {
                        errors.push(`Field ${field} must be at least ${rules.minimum}`);
                    }
                    
                    // Format validation
                    if (rules.format === 'date') {
                        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                        if (!dateRegex.test(value)) {
                            errors.push(`Field ${field} must be in YYYY-MM-DD format`);
                        }
                    }
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    // Get state requirements
    getRequirements() {
        return this.requirements;
    }
    
    // Validate compliance status
    async validateCompliance(complianceData) {
        try {
            const validation = this.validateComplianceData(complianceData);
            if (!validation.isValid) {
                return {
                    compliant: false,
                    score: 0,
                    issues: validation.errors,
                    warnings: validation.warnings
                };
            }
            
            // Calculate compliance score based on state requirements
            const score = this.calculateComplianceScore(complianceData);
            
            return {
                compliant: score >= 80,
                score,
                issues: score < 80 ? [`Compliance score ${score} below threshold`] : [],
                warnings: score < 90 ? [`Compliance score ${score} needs improvement`] : []
            };
        } catch (error) {
            console.error('Compliance validation failed:', error);
            return {
                compliant: false,
                score: 0,
                issues: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }
    
    // Calculate compliance score
    calculateComplianceScore(complianceData) {
        let score = 100; // Start with perfect score
        
        // Deduct points for missing or expired items
        if (!complianceData.licenseNumber) score -= 20;
        if (complianceData.licenseExpired) score -= 30;
        if (!complianceData.cmeComplete) score -= 15;
        if (!complianceData.privacyTraining) score -= 10;
        if (!complianceData.insuranceCurrent) score -= 15;
        if (!complianceData.backgroundCheckCurrent) score -= 10;
        
        return Math.max(0, Math.min(100, score));
    }
    
    // Get state penalties
    getPenalties() {
        return this.requirements.penalties || {};
    }
    
    // Get state information
    getStateInfo() {
        return {
            code: this.stateCode,
            name: this.stateName,
            regulatoryBurden: this.regulatoryBurden,
            requirements: this.requirements
        };
    }
    
    // Update state requirements (manual)
    async updateRequirements(newRequirements) {
        try {
            this.requirements = { ...this.requirements, ...newRequirements };
            console.log(`${this.stateName} requirements updated manually`);
            return true;
        } catch (error) {
            console.error(`Failed to update ${this.stateName} requirements:`, error);
            return false;
        }
    }
    
    // Get compliance status for specific area
    getAreaCompliance(area) {
        if (!this.requirements[area]) {
            return {
                compliant: false,
                score: 0,
                message: `Unknown compliance area: ${area}`
            };
        }
        
        const areaRequirements = this.requirements[area];
        // This would be implemented based on actual data
        return {
            compliant: true,
            score: 85,
            requirements: areaRequirements
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseStateComplianceManager;
} else {
    window.BaseStateComplianceManager = BaseStateComplianceManager;
}
