// TrustMD Input Validation & Security
// Prevents blank space attacks and ensures data integrity

class TrustMDValidator {
    constructor() {
        this.validationRules = {};
        this.securityPatterns = {};
        this.phiValidationRules = {};
        
        // Load configuration from external JSON file
        this.loadConfiguration();
    }
    
    // Load validation configuration from external JSON
    async loadConfiguration() {
        try {
            const response = await fetch('/config/validation-rules.json');
            if (response.ok) {
                const config = await response.json();
                this.validationRules = config.validationRules || {};
                this.securityPatterns = config.securityPatterns || {};
                this.phiValidationRules = config.phiValidationRules || {};
                console.log('Validation configuration loaded successfully');
            } else {
                console.warn('Failed to load validation configuration, using defaults');
                this.loadDefaultConfiguration();
            }
        } catch (error) {
            console.error('Error loading validation configuration:', error);
            this.loadDefaultConfiguration();
        }
    }
    
    // Load default configuration as fallback
    loadDefaultConfiguration() {
        this.validationRules = {
            // Text input validation
            text: {
                minLength: 2,
                maxLength: 255,
                required: true,
                trimWhitespace: true,
                preventEmpty: true
            },
            
            // Email validation
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                trimWhitespace: true,
                preventEmpty: true
            },
            
            // Password validation
            password: {
                minLength: 8,
                maxLength: 128,
                required: true,
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                preventEmpty: true
            },
            
            // Document title validation
            documentTitle: {
                minLength: 3,
                maxLength: 200,
                required: true,
                trimWhitespace: true,
                preventEmpty: true,
                preventOnlySpecialChars: true
            },
            
            // Description validation
            description: {
                minLength: 10,
                maxLength: 2000,
                required: false,
                trimWhitespace: true,
                preventEmpty: true
            },
            
            // Notes validation
            notes: {
                minLength: 5,
                maxLength: 1000,
                required: false,
                trimWhitespace: true,
                preventEmpty: true
            }
        };
        
        this.securityPatterns = {
            // Prevent script injection
            scriptInjection: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            
            // Prevent SQL injection patterns
            sqlInjection: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
            
            // Prevent XSS patterns - Enhanced with modern attack vectors
            xssPatterns: [
                // Basic XSS patterns
                /javascript:/gi,
                /on\w+\s*=/gi,
                /<iframe/gi,
                /<object/gi,
                /<embed/gi,
                /<script/gi,
                /<applet/gi,
                /<meta/gi,
                /<link/gi,
                /<style/gi,
                /<form/gi,
                /<input/gi,
                /<img/gi,
                /<svg/gi,
                /<video/gi,
                /<audio/gi,
                
                // Advanced XSS patterns
                /onload\s*=/gi,
                /onerror\s*=/gi,
                /onmouseover\s*=/gi,
                /onfocus\s*=/gi,
                /onblur\s*=/gi,
                /onchange\s*=/gi,
                /onsubmit\s*=/gi,
                /onclick\s*=/gi,
                /ondblclick\s*=/gi,
                /onkeydown\s*=/gi,
                /onkeyup\s*=/gi,
                /onkeypress\s*=/gi,
                
                // Encoding-based XSS
                /&#x/gi,
                /&#\d{1,5};/gi,
                /%3c/gi,
                /%3e/gi,
                /%3cscript/gi,
                /expression\s*\(/gi,
                /@import/gi,
                
                // Protocol-based XSS
                /data:/gi,
                /vbscript:/gi,
                /file:/gi,
                /ftp:/gi,
                
                // Event handler variations
                /on\w+\s*\(/gi,
                /eval\s*\(/gi,
                /settimeout\s*\(/gi,
                /setinterval\s*\(/gi,
                
                // CSS-based XSS
                /behavior\s*:/gi,
                /binding\s*:/gi,
                
                // Modern framework patterns
                /angular\s*\(/gi,
                /react\s*\(/gi,
                /vue\s*\(/gi,
                
                // Bypass attempts
                /<[\s]*script[\s]*>/gi,
                /<[\s]*iframe[\s]*>/gi,
                /<[\s]*object[\s]*>/gi
            ],
            
            // Prevent excessive whitespace
            excessiveWhitespace: /^\s+|\s{2,}|\s+$/g,
            
            // Prevent repeated characters
            repeatedChars: /(.)\1{4,}/g,
            
            // Prevent control characters
            controlChars: /[\x00-\x1F\x7F]/g
        };
        
        this.phiValidationRules = {
            // Document content validation
            documentContent: {
                maxPHIRiskScore: 0.7,
                maxConfidenceScore: 0.8,
                requireExplicitConsent: true,
                allowedDocumentTypes: [
                    'policies', 'training_records', 'consent_forms', 'certificates',
                    'accreditation_documents', 'audit_reports', 'compliance_manuals',
                    'procedures', 'guidelines', 'protocols', 'standards'
                ]
            },
            
            // Filename validation
            documentFilename: {
                preventPatientIdentifiers: true,
                preventMedicalTerms: true,
                allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.xls', '.xlsx', '.ppt', '.pptx'],
                maxFilenameLength: 255
            },
            
            // Document title validation
            documentTitle: {
                preventPHI: true,
                minLength: 3,
                maxLength: 200,
                allowedTerms: ['policy', 'procedure', 'training', 'certificate', 'compliance', 'manual', 'guide', 'protocol', 'standard']
            }
        };
        
        this.documentTypePHIRules = {
            // High compliance documents - very strict
            'policies': {
                maxRiskScore: 0.2,
                maxConfidenceScore: 0.6,
                allowedPHI: ['template_indicators', 'sample_data'],
                blockedPHI: ['ssn', 'mrn', 'patient_name', 'dob', 'phone', 'address'],
                description: 'Policy documents should be templates, not patient-specific'
            },
            
            // Training records - moderate strictness
            'training_records': {
                maxRiskScore: 0.3,
                maxConfidenceScore: 0.7,
                allowedPHI: ['completion_data', 'certificate_info'],
                blockedPHI: ['ssn', 'mrn', 'patient_name', 'dob'],
                description: 'Training records may contain names but no patient data'
            },
            
            // Consent forms - special handling
            'consent_forms': {
                maxRiskScore: 0.5,
                maxConfidenceScore: 0.8,
                allowedPHI: ['template_fields', 'sample_data'],
                blockedPHI: ['ssn', 'mrn', 'patient_name', 'dob', 'phone', 'address'],
                description: 'Consent forms should be templates, not completed forms'
            },
            
            // Certificates - moderate strictness
            'certificates': {
                maxRiskScore: 0.1,
                maxConfidenceScore: 0.5,
                allowedPHI: ['name', 'date', 'certificate_number'],
                blockedPHI: ['ssn', 'mrn', 'dob', 'phone', 'address'],
                description: 'Certificates may contain professional names but no patient data'
            },
            
            // Accreditation documents - strict
            'accreditation_documents': {
                maxRiskScore: 0.2,
                maxConfidenceScore: 0.6,
                allowedPHI: ['facility_info', 'survey_data'],
                blockedPHI: ['ssn', 'mrn', 'patient_name', 'dob', 'phone', 'address'],
                description: 'Accreditation documents should not contain patient data'
            },
            
            // Audit reports - very strict
            'audit_reports': {
                maxRiskScore: 0.1,
                maxConfidenceScore: 0.4,
                allowedPHI: ['audit_findings', 'compliance_data'],
                blockedPHI: ['ssn', 'mrn', 'patient_name', 'dob', 'phone', 'address'],
                description: 'Audit reports should not contain patient identifiers'
            },
            
            // Compliance manuals - strict
            'compliance_manuals': {
                maxRiskScore: 0.2,
                maxConfidenceScore: 0.6,
                allowedPHI: ['template_indicators', 'sample_data'],
                blockedPHI: ['ssn', 'mrn', 'patient_name', 'dob', 'phone', 'address'],
                description: 'Compliance manuals should be templates or guidelines'
            },
            
            // Procedures - moderate strictness
            'procedures': {
                maxRiskScore: 0.3,
                maxConfidenceScore: 0.7,
                allowedPHI: ['template_indicators'],
                blockedPHI: ['ssn', 'mrn', 'patient_name', 'dob', 'phone', 'address'],
                description: 'Procedures should be templates, not patient-specific'
            },
            
            // Guidelines - moderate strictness
            'guidelines': {
                maxRiskScore: 0.3,
                maxConfidenceScore: 0.7,
                allowedPHI: ['template_indicators', 'sample_data'],
                blockedPHI: ['ssn', 'mrn', 'patient_name', 'dob', 'phone', 'address'],
                description: 'Guidelines should be general, not patient-specific'
            },
            
            // Protocols - strict
            'protocols': {
                maxRiskScore: 0.2,
                maxConfidenceScore: 0.6,
                allowedPHI: ['template_indicators'],
                blockedPHI: ['ssn', 'mrn', 'patient_name', 'dob', 'phone', 'address'],
                description: 'Protocols should be templates, not patient-specific'
            },
            
            // Standards - very strict
            'standards': {
                maxRiskScore: 0.1,
                maxConfidenceScore: 0.4,
                allowedPHI: ['reference_data'],
                blockedPHI: ['ssn', 'mrn', 'patient_name', 'dob', 'phone', 'address'],
                description: 'Standards should not contain any patient data'
            },
            
            // Default rules for unknown types
            'default': {
                maxRiskScore: 0.4,
                maxConfidenceScore: 0.7,
                allowedPHI: [],
                blockedPHI: ['ssn', 'mrn', 'patient_name', 'dob', 'phone', 'address'],
                description: 'Unknown document type - strict validation applied'
            }
        };
    }
    
    // Main validation function
    validate(input, type, options = {}) {
        const rules = { ...this.validationRules[type], ...options };
        
        if (!rules) {
            throw new Error(`Unknown validation type: ${type}`);
        }
        
        // Convert to string if not already
        let value = typeof input === 'string' ? input : String(input);
        
        // Security checks first
        const securityCheck = this.performSecurityValidation(value);
        if (!securityCheck.isValid) {
            return {
                isValid: false,
                error: securityCheck.error,
                sanitizedValue: null
            };
        }
        
        // Apply validation rules
        const validationResult = this.applyValidationRules(value, rules);
        
        return validationResult;
    }
    
    // Security validation
    performSecurityValidation(value) {
        // Check for script injection
        if (this.securityPatterns.scriptInjection.test(value)) {
            return {
                isValid: false,
                error: 'Invalid content format detected'
            };
        }
        
        // Check for SQL injection
        if (this.securityPatterns.sqlInjection.test(value)) {
            return {
                isValid: false,
                error: 'Invalid content format detected'
            };
        }
        
        // Check for XSS patterns
        for (const pattern of this.securityPatterns.xssPatterns) {
            if (pattern.test(value)) {
                return {
                    isValid: false,
                    error: 'Invalid content format detected'
                };
            }
        }
        
        // Check for control characters
        if (this.securityPatterns.controlChars.test(value)) {
            return {
                isValid: false,
                error: 'Invalid characters detected'
            };
        }
        
        return { isValid: true };
    }
    
    // Apply validation rules
    applyValidationRules(value, rules) {
        let sanitizedValue = value;
        
        // Trim whitespace if required
        if (rules.trimWhitespace) {
            sanitizedValue = sanitizedValue.trim();
        }
        
        // Remove excessive whitespace
        sanitizedValue = sanitizedValue.replace(this.securityPatterns.excessiveWhitespace, ' ');
        
        // Check if empty after trimming
        if (rules.preventEmpty && this.isEmpty(sanitizedValue)) {
            return {
                isValid: false,
                error: 'This field cannot be empty or contain only whitespace',
                sanitizedValue: null
            };
        }
        
        // Check minimum length
        if (rules.minLength && sanitizedValue.length < rules.minLength) {
            return {
                isValid: false,
                error: `Minimum length is ${rules.minLength} characters`,
                sanitizedValue: null
            };
        }
        
        // Check maximum length
        if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
            return {
                isValid: false,
                error: `Maximum length is ${rules.maxLength} characters`,
                sanitizedValue: null
            };
        }
        
        // Check if required but empty
        if (rules.required && this.isEmpty(sanitizedValue)) {
            return {
                isValid: false,
                error: 'This field is required',
                sanitizedValue: null
            };
        }
        
        // Check pattern if specified
        if (rules.pattern && !rules.pattern.test(sanitizedValue)) {
            return {
                isValid: false,
                error: 'Invalid format',
                sanitizedValue: null
            };
        }
        
        // Check for only special characters
        if (rules.preventOnlySpecialChars && !/[a-zA-Z0-9]/.test(sanitizedValue)) {
            return {
                isValid: false,
                error: 'Must contain at least one letter or number',
                sanitizedValue: null
            };
        }
        
        // Check for repeated characters
        if (this.securityPatterns.repeatedChars.test(sanitizedValue)) {
            return {
                isValid: false,
                error: 'Excessive repeated characters not allowed',
                sanitizedValue: null
            };
        }
        
        return {
            isValid: true,
            error: null,
            sanitizedValue: sanitizedValue
        };
    }
    
    // Check if value is empty
    isEmpty(value) {
        return !value || value.trim().length === 0;
    }
    
    // Validate form data
    validateForm(formData, schema) {
        const errors = {};
        const sanitizedData = {};
        let isValid = true;
        
        for (const [fieldName, fieldType] of Object.entries(schema)) {
            const fieldValue = formData[fieldName];
            const validation = this.validate(fieldValue, fieldType);
            
            if (!validation.isValid) {
                errors[fieldName] = validation.error;
                isValid = false;
            } else {
                sanitizedData[fieldName] = validation.sanitizedValue;
            }
        }
        
        return {
            isValid,
            errors,
            sanitizedData
        };
    }
    
    // Sanitize HTML content (for rich text editors)
    sanitizeHTML(html) {
        const tempDiv = document.createElement('div');
        tempDiv.textContent = html;
        return tempDiv.innerHTML;
    }
    
    // Validate file upload
    validateFile(file, allowedTypes = [], maxSizeMB = 10) {
        const errors = [];
        
        // Check if file exists
        if (!file) {
            errors.push('No file selected');
            return { isValid: false, errors };
        }
        
        // Check file size
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            errors.push(`File size must be less than ${maxSizeMB}MB`);
        }
        
        // Check file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
            errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
        }
        
        // Check file name for security
        const fileNameValidation = this.validate(file.name, 'documentTitle');
        if (!fileNameValidation.isValid) {
            errors.push('Invalid file name');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    // Real-time validation for form inputs
    setupRealTimeValidation() {
        // Add validation to all form inputs
        document.addEventListener('input', (event) => {
            const element = event.target;
            
            // Skip if not a form element
            if (!element.matches('input, textarea, select')) {
                return;
            }
            
            // Get validation type from data attribute
            const validationType = element.dataset.validation;
            if (!validationType) {
                return;
            }
            
            // Perform validation
            const validation = this.validate(element.value, validationType);
            
            // Update UI
            this.updateFieldValidation(element, validation);
        });
        
        // Add validation to form submissions
        document.addEventListener('submit', (event) => {
            const form = event.target;
            if (!form.matches('form')) {
                return;
            }
            
            // Get validation schema from form
            const schema = this.getFormSchema(form);
            if (!schema) {
                return;
            }
            
            // Validate form data
            const formData = new FormData(form);
            const formObject = Object.fromEntries(formData.entries());
            const validation = this.validateForm(formObject, schema);
            
            if (!validation.isValid) {
                event.preventDefault();
                this.showFormErrors(form, validation.errors);
            }
        });
    }
    
    // Update field validation UI
    updateFieldValidation(element, validation) {
        // Remove existing validation classes
        element.classList.remove('valid', 'invalid');
        
        // Remove existing error message
        const existingError = element.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        if (element.value.trim() === '') {
            return; // Don't show validation for empty fields unless required
        }
        
        if (validation.isValid) {
            element.classList.add('valid');
            this.showFieldSuccess(element);
        } else {
            element.classList.add('invalid');
            this.showFieldError(element, validation.error);
        }
    }
    
    // Show field error
    showFieldError(element, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            color: var(--danger-color);
            font-size: 0.8rem;
            margin-top: 0.25rem;
        `;
        
        element.parentNode.appendChild(errorDiv);
    }
    
    // Show field success
    showFieldSuccess(element) {
        const successDiv = document.createElement('div');
        successDiv.className = 'field-success';
        successDiv.innerHTML = '<i class="fas fa-check-circle"></i>';
        successDiv.style.cssText = `
            color: var(--success-color);
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
        `;
        
        element.parentNode.style.position = 'relative';
        element.parentNode.appendChild(successDiv);
    }
    
    // Show form errors
    showFormErrors(form, errors) {
        // Clear existing errors
        form.querySelectorAll('.field-error').forEach(error => error.remove());
        
        // Show errors for each field
        for (const [fieldName, errorMessage] of Object.entries(errors)) {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                this.showFieldError(field, errorMessage);
                field.classList.add('invalid');
                field.focus();
            }
        }
        
        // Show general error message
        const generalError = document.createElement('div');
        generalError.className = 'form-error';
        generalError.textContent = 'Please correct the errors below';
        generalError.style.cssText = `
            background: rgba(231, 76, 60, 0.1);
            color: var(--danger-color);
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            border: 1px solid var(--danger-color);
        `;
        
        form.insertBefore(generalError, form.firstChild);
    }
    
    // Get form schema from data attributes
    getFormSchema(form) {
        const schema = {};
        const fields = form.querySelectorAll('[data-validation]');
        
        fields.forEach(field => {
            const validationType = field.dataset.validation;
            const fieldName = field.name || field.id;
            
            if (fieldName && validationType) {
                schema[fieldName] = validationType;
            }
        });
        
        return Object.keys(schema).length > 0 ? schema : null;
    }
    
    // Enhanced content validation for documents
    validateDocumentContent(content) {
        const issues = [];
        
        // Check for meaningful content
        const words = content.trim().split(/\s+/).filter(word => word.length > 0);
        if (words.length < 3) {
            issues.push('Content must contain at least 3 meaningful words');
        }
        
        // Check for repeated patterns
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        if (uniqueWords.size < words.length * 0.3) {
            issues.push('Content appears to contain excessive repetition');
        }
        
        // Check for placeholder text
        const placeholders = [
            'lorem ipsum', 'dummy text', 'placeholder', 'sample text',
            'test content', 'example text', 'filler text'
        ];
        
        const lowerContent = content.toLowerCase();
        for (const placeholder of placeholders) {
            if (lowerContent.includes(placeholder)) {
                issues.push('Content appears to contain placeholder text');
                break;
            }
        }
        
        // Check for meaningful sentences
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const meaningfulSentences = sentences.filter(sentence => {
            const words = sentence.trim().split(/\s+/);
            return words.length >= 3 && !this.securityPatterns.repeatedChars.test(sentence);
        });
        
        if (meaningfulSentences.length === 0) {
            issues.push('Content must contain at least one meaningful sentence');
        }
        
        return {
            isValid: issues.length === 0,
            issues,
            wordCount: words.length,
            sentenceCount: sentences.length,
            meaningfulSentenceCount: meaningfulSentences.length
        };
    }
    
    // Batch validation for multiple inputs
    validateBatch(inputs) {
        const results = {};
        let overallValid = true;
        
        for (const [inputName, inputValue] of Object.entries(inputs)) {
            const validation = this.validate(inputValue, 'text');
            results[inputName] = validation;
            
            if (!validation.isValid) {
                overallValid = false;
            }
        }
        
        return {
            isValid: overallValid,
            results
        };
    }
    
    // PHI Validation Methods
    
    // Validate document content for PHI with document type-specific rules
    validateDocumentContent(content, documentType = 'unknown', filename = '') {
        // Ensure PHI detection engine is available
        if (!window.phiDetectionEngine) {
            console.warn('PHI detection engine not loaded');
            return {
                isValid: true,
                phiRisk: 'unknown',
                message: 'PHI detection unavailable - proceed with caution'
            };
        }
        
        const phiRules = this.phiValidationRules.documentContent;
        const typeRules = this.documentTypePHIRules[documentType] || this.documentTypePHIRules.default;
        
        // Scan content for PHI
        const phiScan = window.phiDetectionEngine.scanContent(content, documentType, filename);
        
        // Check if document type is allowed
        const isAllowedType = phiRules.allowedDocumentTypes.includes(documentType);
        
        // Apply document type-specific validation
        const typeValidation = this.applyDocumentTypeRules(phiScan, typeRules, documentType);
        
        // Determine validation result
        let isValid = true;
        let message = '';
        let phiRisk = 'low';
        
        if (phiScan.blocked || typeValidation.blocked) {
            isValid = false;
            phiRisk = 'high';
            message = 'Document contains PHI and cannot be uploaded to TrustMD.';
        } else if (phiScan.riskScore > typeRules.maxRiskScore) {
            isValid = false;
            phiRisk = 'high';
            message = `Document risk score (${phiScan.riskScore}) exceeds threshold for ${documentType} (${typeRules.maxRiskScore}).`;
        } else if (phiScan.confidence > typeRules.maxConfidenceScore) {
            isValid = false;
            phiRisk = 'high';
            message = `PHI confidence (${phiScan.confidence}) exceeds threshold for ${documentType} (${typeRules.maxConfidenceScore}).`;
        } else if (phiScan.hasPHI && !isAllowedType) {
            isValid = false;
            phiRisk = 'medium';
            message = `PHI detected in document type '${documentType}' which is not allowed.`;
        } else if (phiScan.hasPHI && typeValidation.hasBlockedPHI) {
            isValid = false;
            phiRisk = 'high';
            message = `Document contains blocked PHI types for ${documentType}: ${typeValidation.blockedTypes.join(', ')}.`;
        } else if (phiScan.hasPHI) {
            phiRisk = 'medium';
            message = `Potential PHI detected in ${documentType} - review required. ${typeValidation.description}`;
        }
        
        return {
            isValid,
            phiRisk,
            phiScan,
            message,
            recommendations: [...(phiScan.recommendations || []), ...(typeValidation.recommendations || [])],
            requiresExplicitConsent: phiScan.hasPHI && phiRules.requireExplicitConsent,
            documentTypeRules: typeValidation
        };
    }
    
    // Apply document type-specific PHI rules
    applyDocumentTypeRules(phiScan, typeRules, documentType) {
        const validation = {
            blocked: false,
            hasBlockedPHI: false,
            blockedTypes: [],
            recommendations: []
        };
        
        if (!phiScan || !phiScan.phiDetections) {
            return validation;
        }
        
        // Check for blocked PHI types
        for (const detection of phiScan.phiDetections) {
            const detectionType = this.mapDetectionType(detection.type);
            
            if (typeRules.blockedPHI.includes(detectionType)) {
                validation.blocked = true;
                validation.hasBlockedPHI = true;
                validation.blockedTypes.push(detectionType);
            }
        }
        
        // Add document type-specific recommendations
        if (validation.blocked) {
            validation.recommendations.push({
                type: 'document_type_violation',
                priority: 'high',
                action: `Remove ${validation.blockedTypes.join(', ')} from ${documentType}`,
                description: typeRules.description
            });
        }
        
        // Check if allowed PHI types are present
        const allowedPHIDetections = phiScan.phiDetections.filter(detection => {
            const detectionType = this.mapDetectionType(detection.type);
            return typeRules.allowedPHI.includes(detectionType);
        });
        
        if (allowedPHIDetections.length > 0) {
            validation.recommendations.push({
                type: 'allowed_phi_present',
                priority: 'medium',
                action: 'Verify this is appropriate for document type',
                description: `Contains allowed PHI: ${allowedPHIDetections.map(d => d.type).join(', ')}`
            });
        }
        
        return validation;
    }
    
    // Map PHI detection types to standardized categories
    mapDetectionType(detectionType) {
        const mapping = {
            'ssn': 'ssn',
            'ssnNoDash': 'ssn',
            'mrn': 'mrn',
            'patientId': 'mrn',
            'patientName': 'patient_name',
            'doctorPatient': 'patient_name',
            'dob': 'dob',
            'dobFormat': 'dob',
            'phoneNumber': 'phone',
            'address': 'address',
            'icd10': 'medical_code',
            'cpt': 'medical_code',
            'npi': 'medical_code',
            'diagnosis': 'medical_code',
            'medication': 'medical_code',
            'treatment': 'medical_code',
            'facility': 'facility_info',
            'insurance': 'insurance_info',
            'emergencyContact': 'contact_info'
        };
        
        return mapping[detectionType] || detectionType;
    }
    
    // Validate document filename for PHI indicators
    validateDocumentFilename(filename) {
        const phiRules = this.phiValidationRules.documentFilename;
        const issues = [];
        
        // Basic filename validation
        if (!filename || typeof filename !== 'string') {
            return {
                isValid: false,
                error: 'Filename is required',
                phiIssues: ['Missing filename']
            };
        }
        
        // Length check
        if (filename.length > phiRules.maxFilenameLength) {
            issues.push(`Filename too long (max ${phiRules.maxFilenameLength} characters)`);
        }
        
        // Extension check
        const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        if (!phiRules.allowedExtensions.includes(extension)) {
            issues.push(`File type '${extension}' not allowed`);
        }
        
        // PHI validation
        if (phiRules.preventPatientIdentifiers || phiRules.preventMedicalTerms) {
            const filenameValidation = window.phiDetectionEngine?.validateFilename(filename);
            if (filenameValidation && !filenameValidation.safe) {
                issues.push(...filenameValidation.issues);
            }
        }
        
        return {
            isValid: issues.length === 0,
            error: issues.length > 0 ? issues.join('; ') : null,
            phiIssues: issues
        };
    }
    
    // Validate document title for PHI
    validateDocumentTitle(title) {
        const phiRules = this.phiValidationRules.documentTitle;
        const issues = [];
        
        // Basic validation
        if (!title || typeof title !== 'string') {
            return {
                isValid: false,
                error: 'Document title is required',
                phiIssues: ['Missing title']
            };
        }
        
        // Length check
        if (title.length < phiRules.minLength) {
            issues.push(`Title too short (min ${phiRules.minLength} characters)`);
        }
        
        if (title.length > phiRules.maxLength) {
            issues.push(`Title too long (max ${phiRules.maxLength} characters)`);
        }
        
        // PHI validation
        if (phiRules.preventPHI) {
            const phiScan = window.phiDetectionEngine?.scanContent(title, 'document_title');
            if (phiScan && phiScan.hasPHI) {
                issues.push('Title contains potential PHI');
                // Add specific detection details
                phiScan.phiDetections.forEach(detection => {
                    issues.push(`- ${detection.description}: "${detection.match}"`);
                });
            }
        }
        
        // Check for allowed terms (optional guidance)
        const hasAllowedTerm = phiRules.allowedTerms.some(term => 
            title.toLowerCase().includes(term)
        );
        
        return {
            isValid: issues.length === 0,
            error: issues.length > 0 ? issues.join('; ') : null,
            phiIssues: issues,
            hasAllowedTerm,
            suggestion: !hasAllowedTerm ? `Consider including terms like: ${phiRules.allowedTerms.join(', ')}` : null
        };
    }
    
    // Comprehensive document validation (content + filename + title)
    validateDocument(documentData) {
        const { content, filename, title, documentType } = documentData;
        const results = {
            isValid: true,
            phiRisk: 'low',
            issues: [],
            recommendations: [],
            blocked: false
        };
        
        // Validate filename
        const filenameValidation = this.validateDocumentFilename(filename);
        if (!filenameValidation.isValid) {
            results.isValid = false;
            results.issues.push(...filenameValidation.phiIssues);
        }
        
        // Validate title
        const titleValidation = this.validateDocumentTitle(title);
        if (!titleValidation.isValid) {
            results.isValid = false;
            results.issues.push(...titleValidation.phiIssues);
        }
        
        // Validate content
        if (content) {
            const contentValidation = this.validateDocumentContent(content, documentType, filename);
            if (!contentValidation.isValid) {
                results.isValid = false;
                results.blocked = true;
                results.phiRisk = contentValidation.phiRisk;
            }
            results.issues.push(contentValidation.message || '');
            results.recommendations.push(...(contentValidation.recommendations || []));
        }
        
        return results;
    }
    
    // Show PHI validation warnings to user
    showPHIWarning(validationResult, container) {
        // Remove existing warnings
        container.querySelectorAll('.phi-warning').forEach(warning => warning.remove());
        
        if (!validationResult.phiIssues || validationResult.phiIssues.length === 0) {
            return;
        }
        
        const warningDiv = document.createElement('div');
        warningDiv.className = 'phi-warning';
        warningDiv.style.cssText = `
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
            border-left: 4px solid #f39c12;
        `;
        
        let warningHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-weight: bold; margin-right: 0.5rem;">⚠️ PHI Detection Alert:</span>
                <span style="font-weight: bold; text-transform: uppercase;">${validationResult.phiRisk} RISK</span>
            </div>
            <ul style="margin: 0; padding-left: 1.5rem;">
        `;
        
        validationResult.phiIssues.forEach(issue => {
            warningHTML += `<li>${issue}</li>`;
        });
        
        warningHTML += '</ul>';
        
        if (validationResult.recommendations && validationResult.recommendations.length > 0) {
            warningHTML += `
                <div style="margin-top: 0.5rem; font-weight: bold;">Recommendations:</div>
                <ul style="margin: 0.25rem 0 0 1.5rem;">
            `;
            
            validationResult.recommendations.forEach(rec => {
                warningHTML += `<li>${rec.message}</li>`;
            });
            
            warningHTML += '</ul>';
        }
        
        warningDiv.innerHTML = warningHTML;
        container.appendChild(warningDiv);
    }
    
    // Show PHI confirmation dialog
    async showPHIConfirmation(validationResult) {
        if (!validationResult.requiresExplicitConsent) {
            return true; // No confirmation needed
        }
        
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white;
                padding: 2rem;
                border-radius: 12px;
                max-width: 500px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            `;
            
            dialog.innerHTML = `
                <h3 style="margin: 0 0 1rem 0; color: #e74c3c;">🚨 PHI Confirmation Required</h3>
                <p style="margin: 0 0 1rem 0; line-height: 1.5;">
                    This document may contain Protected Health Information (PHI). TrustMD is designed 
                    for compliance documents only, not patient records.
                </p>
                <p style="margin: 0 0 1.5rem 0; font-weight: bold;">
                    Please confirm this is a compliance document (policy, training certificate, etc.) 
                    and NOT a patient record.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button id="phi-cancel" style="
                        padding: 0.5rem 1rem;
                        border: 1px solid #ccc;
                        background: white;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Cancel Upload</button>
                    <button id="phi-confirm" style="
                        padding: 0.5rem 1rem;
                        background: #e74c3c;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Confirm Compliance Document</button>
                </div>
            `;
            
            modal.appendChild(dialog);
            document.body.appendChild(modal);
            
            document.getElementById('phi-cancel').onclick = () => {
                document.body.removeChild(modal);
                resolve(false);
            };
            
            document.getElementById('phi-confirm').onclick = () => {
                document.body.removeChild(modal);
                resolve(true);
            };
            
            // Close on backdrop click
            modal.onclick = (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    resolve(false);
                }
            };
        });
    }

    // CSRF Protection Methods
    generateCSRFToken() {
        // Generate cryptographically secure random token
        const array = new Uint8Array(32);
        crypto.getRandomValues(array, array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    validateCSRFToken(request) {
        const token = request.headers['x-csrf-token'] || request.body?._csrf;
        const sessionToken = this.getSessionCSRFToken();
        
        if (!token || token !== sessionToken) {
            return {
                isValid: false,
                error: 'CSRF token validation failed'
            };
        }
        
        return { isValid: true };
    }

    getSessionCSRFToken() {
        // Get token from session storage or create new one
        let token = sessionStorage.getItem('csrf-token');
        if (!token) {
            token = this.generateCSRFToken();
            sessionStorage.setItem('csrf-token', token);
        }
        return token;
    }

    setCSRFToken() {
        const token = this.generateCSRFToken();
        sessionStorage.setItem('csrf-token', token);
        return token;
    }

    addCSRFToForm(form) {
        const token = this.getSessionCSRFToken();
        
        // Add hidden input field to form
        let csrfInput = form.querySelector('input[name="_csrf"]');
        if (!csrfInput) {
            csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = '_csrf';
            form.appendChild(csrfInput);
        }
        
        csrfInput.value = token;
        return token;
    }

    // Enhanced input length validation for DoS protection
    validateInputLength(input, fieldName, maxLength = 10000) {
        if (typeof input === 'string' && input.length > maxLength) {
            return {
                isValid: false,
                error: `Input exceeds maximum length of ${maxLength} characters for field: ${fieldName}`,
                sanitizedValue: input.substring(0, maxLength)
            };
        }
        
        return { isValid: true };
    }
}

// Create global validator instance
window.trustMDValidator = new TrustMDValidator();

// Auto-initialize real-time validation
document.addEventListener('DOMContentLoaded', () => {
    window.trustMDValidator.setupRealTimeValidation();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrustMDValidator;
}
