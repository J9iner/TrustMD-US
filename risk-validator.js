// TrustMD Risk Engine - Risk Validator Module
// Handles input validation and schema enforcement

class RiskValidator {
    constructor() {
        this.validationRules = {
            industryType: {
                required: true,
                type: 'string',
                enum: [
                    'hospital', 'clinic', 'private_practice', 'urgent_care', 'specialty_care',
                    'family_medicine', 'internal_medicine', 'pediatrics', 'geriatrics', 'general_practice',
                    'cardiology', 'dermatology', 'endocrinology', 'gastroenterology', 'nephrology',
                    'pulmonology', 'rheumatology', 'infectious_disease', 'general_surgery',
                    'orthopedic_surgery', 'neurosurgery', 'cardiothoracic_surgery', 'plastic_surgery',
                    'vascular_surgery', 'pediatric_surgery', 'urology', 'ophthalmology',
                    'otolaryngology_ent', 'obstetrics_gynecology', 'maternal_fetal_medicine',
                    'reproductive_endocrinology', 'gynecologic_oncology', 'psychiatry',
                    'psychology', 'counseling', 'addiction_medicine', 'behavioral_health',
                    'neurology', 'pain_management', 'sleep_medicine', 'emergency_medicine',
                    'trauma_center', 'radiology', 'pathology', 'laboratory', 'imaging_center',
                    'physical_therapy', 'occupational_therapy', 'speech_therapy', 'rehabilitation_medicine',
                    'medical_oncology', 'radiation_oncology', 'hematology', 'hematology_oncology'
                ]
            },
            riskFactors: {
                required: true,
                type: 'object',
                properties: {
                    documentation: {
                        type: 'object',
                        properties: {
                            missingConsentForms: { type: 'number', minimum: 0, maximum: 1 },
                            outdatedPolicies: { type: 'number', minimum: 0, maximum: 1 },
                            incompleteTraining: { type: 'number', minimum: 0, maximum: 1 },
                            auditGaps: { type: 'number', minimum: 0, maximum: 1 }
                        }
                    },
                    operational: {
                        type: 'object',
                        properties: {
                            staffTurnover: { type: 'number', minimum: 0, maximum: 1 },
                            systemDowntime: { type: 'number', minimum: 0, maximum: 1 },
                            processInefficiencies: { type: 'number', minimum: 0, maximum: 1 },
                            resourceConstraints: { type: 'number', minimum: 0, maximum: 1 },
                            communicationGaps: { type: 'number', minimum: 0, maximum: 1 }
                        }
                    },
                    technical: {
                        type: 'object',
                        properties: {
                            dataSecurity: { type: 'number', minimum: 0, maximum: 1 },
                            systemIntegration: { type: 'number', minimum: 0, maximum: 1 },
                            backupRecovery: { type: 'number', minimum: 0, maximum: 1 },
                            accessControls: { type: 'number', minimum: 0, maximum: 1 }
                        }
                    },
                    regulatory: {
                        type: 'object',
                        properties: {
                            hipaaCompliance: { type: 'number', minimum: 0, maximum: 1 },
                            oshaCompliance: { type: 'number', minimum: 0, maximum: 1 },
                            deaCompliance: { type: 'number', minimum: 0, maximum: 1 },
                            medicareMedicaidCompliance: { type: 'number', minimum: 0, maximum: 1 },
                            accreditationRequirements: { type: 'number', minimum: 0, maximum: 1 },
                            stateRegulations: { type: 'number', minimum: 0, maximum: 1 }
                        }
                    }
                }
            }
        };
    }
    
    // Validate risk data against schema
    validateRiskData(data) {
        try {
            const errors = [];
            const warnings = [];
            
            // Check if data is provided
            if (!data || typeof data !== 'object') {
                errors.push('Risk data must be a valid object');
                return { isValid: false, errors, warnings };
            }
            
            // Validate industry type
            const industryValidation = this.validateField('industryType', data.industryType, this.validationRules.industryType);
            errors.push(...industryValidation.errors);
            warnings.push(...industryValidation.warnings);
            
            // Validate risk factors
            const factorsValidation = this.validateField('riskFactors', data.riskFactors, this.validationRules.riskFactors);
            errors.push(...factorsValidation.errors);
            warnings.push(...factorsValidation.warnings);
            
            // Additional business logic validation
            const businessValidation = this.validateBusinessLogic(data);
            errors.push(...businessValidation.errors);
            warnings.push(...businessValidation.warnings);
            
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                validatedAt: new Date().toISOString()
            };
        } catch (error) {
            return {
                isValid: false,
                errors: [`Validation error: ${error.message}`],
                warnings: [],
                validatedAt: new Date().toISOString()
            };
        }
    }
    
    // Validate individual field
    validateField(fieldName, value, rule) {
        const errors = [];
        const warnings = [];
        
        // Check required fields
        if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push(`${fieldName} is required`);
            return { errors, warnings };
        }
        
        // Skip validation if field is optional and not provided
        if (!rule.required && (value === undefined || value === null || value === '')) {
            return { errors, warnings };
        }
        
        // Type validation
        if (rule.type && typeof value !== rule.type) {
            errors.push(`${fieldName} must be of type ${rule.type}`);
            return { errors, warnings };
        }
        
        // Enum validation
        if (rule.enum && !rule.enum.includes(value)) {
            errors.push(`${fieldName} must be one of: ${rule.enum.join(', ')}`);
        }
        
        // Object property validation
        if (rule.type === 'object' && rule.properties && typeof value === 'object') {
            for (const [propName, propRule] of Object.entries(rule.properties)) {
                const propValidation = this.validateField(`${fieldName}.${propName}`, value[propName], propRule);
                errors.push(...propValidation.errors);
                warnings.push(...propValidation.warnings);
            }
        }
        
        // Numeric validation
        if (rule.type === 'number' && typeof value === 'number') {
            if (rule.minimum !== undefined && value < rule.minimum) {
                errors.push(`${fieldName} must be >= ${rule.minimum}`);
            }
            if (rule.maximum !== undefined && value > rule.maximum) {
                errors.push(`${fieldName} must be <= ${rule.maximum}`);
            }
        }
        
        return { errors, warnings };
    }
    
    // Validate business logic
    validateBusinessLogic(data) {
        const errors = [];
        const warnings = [];
        
        // Check for logical inconsistencies
        if (data.riskFactors) {
            // High technical risk but low operational risk might be unusual
            const techRisk = this.calculateCategoryAverage(data.riskFactors.technical);
            const operationalRisk = this.calculateCategoryAverage(data.riskFactors.operational);
            
            if (techRisk > 0.7 && operationalRisk < 0.3) {
                warnings.push('High technical risk with low operational risk - verify data accuracy');
            }
            
            // Check for missing data in critical areas
            const regulatoryRisk = this.calculateCategoryAverage(data.riskFactors.regulatory);
            if (regulatoryRisk > 0.8) {
                warnings.push('Critical regulatory compliance issues detected - immediate attention required');
            }
            
            // Check for unusually low risk across all categories
            const overallRisk = this.calculateOverallAverage(data.riskFactors);
            if (overallRisk < 0.1) {
                warnings.push('Unusually low risk scores - verify data completeness');
            }
        }
        
        return { errors, warnings };
    }
    
    // Calculate average risk for a category
    calculateCategoryAverage(category) {
        if (!category || typeof category !== 'object') return 0;
        
        const values = Object.values(category).filter(v => typeof v === 'number');
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }
    
    // Calculate overall average risk
    calculateOverallAverage(riskFactors) {
        if (!riskFactors || typeof riskFactors !== 'object') return 0;
        
        const categoryAverages = Object.values(riskFactors).map(cat => this.calculateCategoryAverage(cat));
        return categoryAverages.length > 0 ? categoryAverages.reduce((a, b) => a + b, 0) / categoryAverages.length : 0;
    }
    
    // Sanitize input data
    sanitizeRiskData(data) {
        try {
            const sanitized = { ...data };
            
            // Sanitize industry type
            if (sanitized.industryType && typeof sanitized.industryType === 'string') {
                sanitized.industryType = sanitized.industryType.toLowerCase().trim().replace(/\s+/g, '_');
            }
            
            // Sanitize risk factor values
            if (sanitized.riskFactors && typeof sanitized.riskFactors === 'object') {
                for (const [category, factors] of Object.entries(sanitized.riskFactors)) {
                    if (typeof factors === 'object') {
                        for (const [factor, value] of Object.entries(factors)) {
                            if (typeof value === 'number') {
                                // Clamp values between 0 and 1
                                sanitized.riskFactors[category][factor] = Math.max(0, Math.min(1, value));
                            }
                        }
                    }
                }
            }
            
            return sanitized;
        } catch (error) {
            console.error('Error sanitizing risk data:', error);
            return data;
        }
    }
    
    // Get validation schema
    getValidationSchema() {
        return this.validationRules;
    }
    
    // Update validation rules
    updateValidationRules(newRules) {
        this.validationRules = { ...this.validationRules, ...newRules };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RiskValidator;
} else {
    window.RiskValidator = RiskValidator;
}
