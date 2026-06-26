// TrustMD Template Validator
// Comprehensive template validation and integrity checking

class TemplateValidator {
    constructor() {
        this.validationSchema = null;
        this.securityPatterns = {
            scriptInjections: [
                /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                /javascript:/gi,
                /on\w+\s*=/gi,
                /eval\s*\(/gi,
                /setTimeout\s*\(/gi,
                /setInterval\s*\(/gi
            ],
            sqlInjections: [
                /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
                /(--)|(\/\*)|(\*\/)/gi,
                /(\bOR\b.*=.*\bOR\b)/gi,
                /(\bAND\b.*=.*\bAND\b)/gi
            ],
            xssPatterns: [
                /<iframe/gi,
                /<object/gi,
                /<embed/gi,
                /<link/gi,
                /<meta/gi,
                /data:text\/html/gi,
                /vbscript:/gi,
                /expression\s*\(/gi
            ]
        };
    }

    // Initialize validator with schema
    async initialize() {
        try {
            const response = await fetch('/config/template-validation-schema.json');
            if (response.ok) {
                this.validationSchema = await response.json();
                console.log('Template validation schema loaded successfully');
                return true;
            } else {
                console.warn('Failed to load validation schema, using defaults');
                this.validationSchema = this.getDefaultSchema();
                return false;
            }
        } catch (error) {
            console.error('Error loading validation schema:', error);
            this.validationSchema = this.getDefaultSchema();
            return false;
        }
    }

    // Get default schema if loading fails
    getDefaultSchema() {
        return {
            templateSchema: {
                required: ["id", "name", "category", "requirements", "version"],
                properties: {
                    id: { type: "string", minLength: 3, maxLength: 50 },
                    name: { type: "string", minLength: 3, maxLength: 100 },
                    category: { type: "string" },
                    version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
                    requirements: { type: "array", minItems: 1 }
                }
            },
            validationRules: {
                maxRequirementsPerTemplate: 100,
                maxSectionsPerTemplate: 20,
                maxTotalPoints: 1000
            },
            securityChecks: {
                noScriptInjections: true,
                noSqlInjections: true,
                noXssPatterns: true
            }
        };
    }

    // Validate template structure and content
    validateTemplate(template, options = {}) {
        const { strictMode = true, returnDetailedErrors = true } = options;
        const errors = [];
        const warnings = [];

        try {
            // Basic structure validation
            const structureErrors = this.validateTemplateStructure(template);
            errors.push(...structureErrors);

            // Requirements validation
            const requirementErrors = this.validateRequirements(template.requirements || []);
            errors.push(...requirementErrors);

            // Sections validation
            if (template.sections) {
                const sectionErrors = this.validateSections(template.sections, template.requirements || []);
                errors.push(...sectionErrors);
            }

            // Business rules validation
            const businessRuleErrors = this.validateBusinessRules(template);
            errors.push(...businessRuleErrors);

            // Security validation
            const securityErrors = this.validateSecurity(template);
            errors.push(...securityErrors);

            // Metadata validation
            if (template.metadata) {
                const metadataErrors = this.validateMetadata(template.metadata);
                errors.push(...metadataErrors);
            }

            const isValid = errors.length === 0;
            
            if (!isValid && strictMode) {
                throw new Error(`Template validation failed: ${errors.map(e => e.message).join(', ')}`);
            }

            return {
                isValid,
                errors: returnDetailedErrors ? errors : [],
                warnings,
                templateId: template.id,
                validatedAt: new Date().toISOString()
            };

        } catch (error) {
            return {
                isValid: false,
                errors: [{ field: 'general', message: error.message, code: 'VALIDATION_ERROR' }],
                warnings,
                templateId: template.id || 'unknown',
                validatedAt: new Date().toISOString()
            };
        }
    }

    // Validate basic template structure
    validateTemplateStructure(template) {
        const errors = [];
        const schema = this.validationSchema.templateSchema;

        // Check required fields
        for (const requiredField of schema.required) {
            if (!(requiredField in template)) {
                errors.push({
                    field: requiredField,
                    message: `Missing required field: ${requiredField}`,
                    code: 'MISSING_REQUIRED_FIELD'
                });
            }
        }

        // Validate field types and formats
        if (template.id) {
            if (typeof template.id !== 'string') {
                errors.push({
                    field: 'id',
                    message: 'Template ID must be a string',
                    code: 'INVALID_TYPE'
                });
            } else if (schema.properties.id.pattern && !new RegExp(schema.properties.id.pattern).test(template.id)) {
                errors.push({
                    field: 'id',
                    message: 'Template ID contains invalid characters',
                    code: 'INVALID_FORMAT'
                });
            }
        }

        if (template.name) {
            if (typeof template.name !== 'string') {
                errors.push({
                    field: 'name',
                    message: 'Template name must be a string',
                    code: 'INVALID_TYPE'
                });
            } else if (template.name.length < (schema.properties.name.minLength || 3)) {
                errors.push({
                    field: 'name',
                    message: 'Template name is too short',
                    code: 'INVALID_LENGTH'
                });
            }
        }

        if (template.version) {
            const versionPattern = schema.properties.version.pattern;
            if (!new RegExp(versionPattern).test(template.version)) {
                errors.push({
                    field: 'version',
                    message: 'Version must follow semantic versioning (e.g., 1.0.0)',
                    code: 'INVALID_VERSION_FORMAT'
                });
            }
        }

        if (template.category) {
            const validCategories = schema.properties.category.enum;
            if (!validCategories.includes(template.category)) {
                errors.push({
                    field: 'category',
                    message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
                    code: 'INVALID_CATEGORY'
                });
            }
        }

        return errors;
    }

    // Validate requirements array
    validateRequirements(requirements) {
        const errors = [];
        const schema = this.validationSchema.templateSchema.properties.requirements;
        const rules = this.validationSchema.validationRules;

        if (!Array.isArray(requirements)) {
            errors.push({
                field: 'requirements',
                message: 'Requirements must be an array',
                code: 'INVALID_TYPE'
            });
            return errors;
        }

        if (requirements.length === 0) {
            errors.push({
                field: 'requirements',
                message: 'Template must have at least one requirement',
                code: 'EMPTY_REQUIREMENTS'
            });
            return errors;
        }

        if (requirements.length > (rules.maxRequirementsPerTemplate || 100)) {
            errors.push({
                field: 'requirements',
                message: `Too many requirements. Maximum allowed: ${rules.maxRequirementsPerTemplate}`,
                code: 'TOO_MANY_REQUIREMENTS'
            });
        }

        let totalPoints = 0;
        let mandatoryCount = 0;
        let criticalCount = 0;

        for (let i = 0; i < requirements.length; i++) {
            const req = requirements[i];
            const prefix = `requirements[${i}]`;

            // Validate requirement structure
            const reqErrors = this.validateRequirement(req, prefix);
            errors.push(...reqErrors);

            // Track counts for business rule validation
            if (req.points) {
                totalPoints += req.points;
            }
            if (req.mandatory) {
                mandatoryCount++;
            }
            if (req.riskLevel === 'critical') {
                criticalCount++;
            }
        }

        // Business rule checks
        if (totalPoints > (rules.maxTotalPoints || 1000)) {
            errors.push({
                field: 'requirements',
                message: `Total points exceed maximum: ${totalPoints} > ${rules.maxTotalPoints}`,
                code: 'EXCESSIVE_POINTS'
            });
        }

        if (mandatoryCount > (rules.mandatoryRequirementsLimit || 50)) {
            errors.push({
                field: 'requirements',
                message: `Too many mandatory requirements: ${mandatoryCount}`,
                code: 'EXCESSIVE_MANDATORY'
            });
        }

        if (criticalCount > (rules.criticalRequirementsLimit || 20)) {
            errors.push({
                field: 'requirements',
                message: `Too many critical requirements: ${criticalCount}`,
                code: 'EXCESSIVE_CRITICAL'
            });
        }

        return errors;
    }

    // Validate individual requirement
    validateRequirement(requirement, prefix = 'requirement') {
        const errors = [];
        const schema = this.validationSchema.templateSchema.properties.requirements.items;

        // Check required fields
        for (const requiredField of schema.required) {
            if (!(requiredField in requirement)) {
                errors.push({
                    field: `${prefix}.${requiredField}`,
                    message: `Missing required field: ${requiredField}`,
                    code: 'MISSING_REQUIRED_FIELD'
                });
            }
        }

        // Validate ID
        if (requirement.id && typeof requirement.id === 'string') {
            if (!new RegExp(schema.properties.id.pattern).test(requirement.id)) {
                errors.push({
                    field: `${prefix}.id`,
                    message: 'Requirement ID contains invalid characters',
                    code: 'INVALID_FORMAT'
                });
            }
        }

        // Validate points
        if (requirement.points !== undefined) {
            if (typeof requirement.points !== 'number' || requirement.points < 1 || requirement.points > 100) {
                errors.push({
                    field: `${prefix}.points`,
                    message: 'Points must be a number between 1 and 100',
                    code: 'INVALID_POINTS'
                });
            }
        }

        // Validate risk level
        if (requirement.riskLevel) {
            const validRiskLevels = schema.properties.riskLevel.enum;
            if (!validRiskLevels.includes(requirement.riskLevel)) {
                errors.push({
                    field: `${prefix}.riskLevel`,
                    message: `Invalid risk level. Must be one of: ${validRiskLevels.join(', ')}`,
                    code: 'INVALID_RISK_LEVEL'
                });
            }
        }

        return errors;
    }

    // Validate sections
    validateSections(sections, requirements) {
        const errors = [];
        const rules = this.validationSchema.validationRules;

        if (!Array.isArray(sections)) {
            errors.push({
                field: 'sections',
                message: 'Sections must be an array',
                code: 'INVALID_TYPE'
            });
            return errors;
        }

        if (sections.length > (rules.maxSectionsPerTemplate || 20)) {
            errors.push({
                field: 'sections',
                message: `Too many sections. Maximum allowed: ${rules.maxSectionsPerTemplate}`,
                code: 'TOO_MANY_SECTIONS'
            });
        }

        const requirementIds = new Set(requirements.map(req => req.id));

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            const prefix = `sections[${i}]`;

            // Validate section structure
            if (!section.id) {
                errors.push({
                    field: `${prefix}.id`,
                    message: 'Section ID is required',
                    code: 'MISSING_REQUIRED_FIELD'
                });
            }

            if (!section.title) {
                errors.push({
                    field: `${prefix}.title`,
                    message: 'Section title is required',
                    code: 'MISSING_REQUIRED_FIELD'
                });
            }

            // Validate section requirements
            if (section.requirements) {
                for (const reqId of section.requirements) {
                    if (!requirementIds.has(reqId)) {
                        errors.push({
                            field: `${prefix}.requirements`,
                            message: `Section references non-existent requirement: ${reqId}`,
                            code: 'INVALID_REQUIREMENT_REFERENCE'
                        });
                    }
                }
            }
        }

        return errors;
    }

    // Validate business rules
    validateBusinessRules(template) {
        const errors = [];

        // Check for duplicate requirement IDs
        if (template.requirements) {
            const ids = template.requirements.map(req => req.id);
            const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
            if (duplicates.length > 0) {
                errors.push({
                    field: 'requirements',
                    message: `Duplicate requirement IDs found: ${duplicates.join(', ')}`,
                    code: 'DUPLICATE_IDS'
                });
            }
        }

        // Check for duplicate section IDs
        if (template.sections) {
            const ids = template.sections.map(sec => sec.id);
            const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
            if (duplicates.length > 0) {
                errors.push({
                    field: 'sections',
                    message: `Duplicate section IDs found: ${duplicates.join(', ')}`,
                    code: 'DUPLICATE_IDS'
                });
            }
        }

        return errors;
    }

    // Validate security aspects
    validateSecurity(template) {
        const errors = [];
        const checks = this.validationSchema.securityChecks;

        if (!checks) return errors;

        // Check all string fields for security issues
        const stringFields = ['name', 'description'];
        for (const field of stringFields) {
            if (template[field]) {
                const content = template[field];
                
                // Script injection check
                if (checks.noScriptInjections) {
                    for (const pattern of this.securityPatterns.scriptInjections) {
                        if (pattern.test(content)) {
                            errors.push({
                                field,
                                message: `Potential script injection detected in ${field}`,
                                code: 'SCRIPT_INJECTION'
                            });
                            break;
                        }
                    }
                }

                // SQL injection check
                if (checks.noSqlInjections) {
                    for (const pattern of this.securityPatterns.sqlInjections) {
                        if (pattern.test(content)) {
                            errors.push({
                                field,
                                message: `Potential SQL injection detected in ${field}`,
                                code: 'SQL_INJECTION'
                            });
                            break;
                        }
                    }
                }

                // XSS check
                if (checks.noXssPatterns) {
                    for (const pattern of this.securityPatterns.xssPatterns) {
                        if (pattern.test(content)) {
                            errors.push({
                                field,
                                message: `Potential XSS pattern detected in ${field}`,
                                code: 'XSS_PATTERN'
                            });
                            break;
                        }
                    }
                }
            }
        }

        // Check requirements for security issues
        if (template.requirements) {
            for (let i = 0; i < template.requirements.length; i++) {
                const req = template.requirements[i];
                const prefix = `requirements[${i}]`;

                ['title', 'description'].forEach(field => {
                    if (req[field]) {
                        const content = req[field];
                        
                        if (checks.noScriptInjections) {
                            for (const pattern of this.securityPatterns.scriptInjections) {
                                if (pattern.test(content)) {
                                    errors.push({
                                        field: `${prefix}.${field}`,
                                        message: `Potential script injection detected in requirement ${field}`,
                                        code: 'SCRIPT_INJECTION'
                                    });
                                    break;
                                }
                            }
                        }
                    }
                });
            }
        }

        return errors;
    }

    // Validate metadata
    validateMetadata(metadata) {
        const errors = [];

        if (metadata.created && !this.isValidDateTime(metadata.created)) {
            errors.push({
                field: 'metadata.created',
                message: 'Invalid datetime format for created field',
                code: 'INVALID_DATETIME'
            });
        }

        if (metadata.lastUpdated && !this.isValidDateTime(metadata.lastUpdated)) {
            errors.push({
                field: 'metadata.lastUpdated',
                message: 'Invalid datetime format for lastUpdated field',
                code: 'INVALID_DATETIME'
            });
        }

        return errors;
    }

    // Validate datetime format
    isValidDateTime(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    // Calculate template checksum for integrity validation
    calculateChecksum(template) {
        const crypto = require('crypto');
        const templateString = JSON.stringify(template, Object.keys(template).sort());
        return crypto.createHash('sha256').update(templateString).digest('hex');
    }

    // Validate template integrity
    validateIntegrity(template, expectedChecksum) {
        const actualChecksum = this.calculateChecksum(template);
        return actualChecksum === expectedChecksum;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateValidator;
}
