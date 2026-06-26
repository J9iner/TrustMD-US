// TrustMD Evidence Vault Intelligence - Compliance Document Metadata Tracker
// NOT for PHI/EHR processing - only tracks compliance document existence and status

// Load dependencies
if (typeof require !== 'undefined') {
    const { errorHandler } = require('./error-handler.js');
    const { encryptionService } = require('./encryption-service.js');
    global.errorHandler = errorHandler;
    global.encryptionService = encryptionService;
} else {
    console.log('Loading dependencies for evidence vault intelligence...');
}

class TrustMDEvidenceVault {
    constructor() {
        this.supabaseClient = null;
        this.currentUserId = null;
        this.currentTenantId = null;
        this.encryptionEnabled = true;
        
        // Document categories for compliance tracking (metadata only)
        this.documentCategories = {
            // HIPAA Compliance Documents (15% total weight)
            hipaa_policies: {
                requiredFields: ['title', 'type', 'uploadDate', 'reviewDate'],
                complianceScore: 8,
                description: 'HIPAA privacy and security policies',
                category: 'HIPAA',
                retentionMonths: 72,
                keywords: ['privacy', 'security', 'hipaa', 'phi', 'protected health information']
            },
            business_associate_agreements: {
                requiredFields: ['title', 'type', 'uploadDate', 'expiryDate'],
                complianceScore: 4,
                description: 'Business Associate Agreements (BAAs)',
                category: 'HIPAA',
                retentionMonths: 72,
                keywords: ['baa', 'business associate', 'vendor agreement', 'hipaa compliance']
            },
            privacy_notices: {
                requiredFields: ['title', 'type', 'uploadDate', 'reviewDate'],
                complianceScore: 3,
                description: 'HIPAA Privacy Notices for patients',
                category: 'HIPAA',
                retentionMonths: 72,
                keywords: ['privacy notice', 'notice of privacy practices', 'hipaa notice']
            },
            
            // OSHA Compliance Documents (10% total weight)
            osha_programs: {
                requiredFields: ['title', 'type', 'uploadDate', 'reviewDate'],
                complianceScore: 4,
                description: 'OSHA safety and health programs',
                category: 'OSHA',
                retentionMonths: 36,
                keywords: ['osha', 'safety program', 'health program', 'workplace safety']
            },
            osha_training_records: {
                requiredFields: ['title', 'type', 'uploadDate', 'completionDate'],
                complianceScore: 3,
                description: 'OSHA-mandated training records',
                category: 'OSHA',
                retentionMonths: 36,
                keywords: ['osha training', 'safety training', 'bloodborne pathogens', 'hazard communication']
            },
            injury_illness_logs: {
                requiredFields: ['title', 'type', 'uploadDate', 'reportDate'],
                complianceScore: 3,
                description: 'OSHA 300 injury and illness logs',
                category: 'OSHA',
                retentionMonths: 60,
                keywords: ['osha 300', 'injury log', 'illness log', 'workplace injury']
            },
            
            // DEA Compliance Documents (15% total weight)
            dea_registrations: {
                requiredFields: ['title', 'type', 'uploadDate', 'expiryDate'],
                complianceScore: 8,
                description: 'DEA registration certificates',
                category: 'DEA',
                retentionMonths: 60,
                keywords: ['dea registration', 'controlled substance', 'drug enforcement administration']
            },
            controlled_substance_logs: {
                requiredFields: ['title', 'type', 'uploadDate', 'logDate'],
                complianceScore: 4,
                description: 'Controlled substance inventory and dispensing logs',
                category: 'DEA',
                retentionMonths: 24,
                keywords: ['controlled substance log', 'inventory', 'dispensing log', 'schedule ii']
            },
            dea_training_records: {
                requiredFields: ['title', 'type', 'uploadDate', 'completionDate'],
                complianceScore: 3,
                description: 'DEA-mandated controlled substance training',
                category: 'DEA',
                retentionMonths: 36,
                keywords: ['dea training', 'controlled substance training', 'diversion prevention']
            },
            
            // Medicare-Medicaid (CMS) Documents (20% total weight)
            medicare_enrollments: {
                requiredFields: ['title', 'type', 'uploadDate', 'expiryDate'],
                complianceScore: 8,
                description: 'Medicare provider enrollment documents',
                category: 'CMS',
                retentionMonths: 84,
                keywords: ['medicare enrollment', 'ptan', 'provider enrollment', 'cms']
            },
            medicaid_enrollments: {
                requiredFields: ['title', 'type', 'uploadDate', 'expiryDate'],
                complianceScore: 6,
                description: 'Medicaid provider enrollment documents',
                category: 'CMS',
                retentionMonths: 84,
                keywords: ['medicaid enrollment', 'provider enrollment', 'state medicaid']
            },
            billing_compliance_programs: {
                requiredFields: ['title', 'type', 'uploadDate', 'reviewDate'],
                complianceScore: 3,
                description: 'Billing compliance and coding programs',
                category: 'CMS',
                retentionMonths: 72,
                keywords: ['billing compliance', 'coding compliance', 'charge capture', 'fraud prevention']
            },
            billing_audits: {
                requiredFields: ['title', 'type', 'uploadDate', 'auditDate'],
                complianceScore: 3,
                description: 'Medicare/Medicaid billing audit reports',
                category: 'CMS',
                retentionMonths: 84,
                keywords: ['billing audit', 'medicare audit', 'medicaid audit', 'recovery audit']
            },
            
            // Accreditation Documents (20% total weight)
            accreditation_certificates: {
                requiredFields: ['title', 'type', 'uploadDate', 'expiryDate'],
                complianceScore: 8,
                description: 'Accreditation body certificates (TJC, AAAHC, CARF, etc.)',
                category: 'Accreditation',
                retentionMonths: 84,
                keywords: ['accreditation', 'joint commission', 'tjc', 'aaahc', 'carf', 'achc']
            },
            survey_reports: {
                requiredFields: ['title', 'type', 'uploadDate', 'surveyDate'],
                complianceScore: 6,
                description: 'Accreditation survey reports and findings',
                category: 'Accreditation',
                retentionMonths: 84,
                keywords: ['survey report', 'accreditation survey', 'tjc survey', 'findings']
            },
            corrective_action_plans: {
                requiredFields: ['title', 'type', 'uploadDate', 'completionDate'],
                complianceScore: 3,
                description: 'Survey finding corrective action plans',
                category: 'Accreditation',
                retentionMonths: 84,
                keywords: ['corrective action', 'cap', 'plan of correction', 'survey finding']
            },
            performance_improvement_projects: {
                requiredFields: ['title', 'type', 'uploadDate', 'completionDate'],
                complianceScore: 3,
                description: 'Performance improvement projects',
                category: 'Accreditation',
                retentionMonths: 84,
                keywords: ['performance improvement', 'pi project', 'quality improvement', 'qi']
            },
            
            // Continuing Medical Education Documents (10% total weight)
            cme_certificates: {
                requiredFields: ['title', 'type', 'uploadDate', 'completionDate'],
                complianceScore: 4,
                description: 'CME completion certificates',
                category: 'CME',
                retentionMonths: 72,
                keywords: ['cme', 'continuing medical education', 'cme certificate', 'medical education']
            },
            state_cme_documentation: {
                requiredFields: ['title', 'type', 'uploadDate', 'reportingPeriod'],
                complianceScore: 3,
                description: 'State-specific CME documentation and reporting',
                category: 'CME',
                retentionMonths: 72,
                keywords: ['state cme', 'cme reporting', 'medical license renewal', 'cme hours']
            },
            specialty_certifications: {
                requiredFields: ['title', 'type', 'uploadDate', 'expiryDate'],
                complianceScore: 3,
                description: 'Medical specialty certifications and board certifications',
                category: 'CME',
                retentionMonths: 72,
                keywords: ['board certification', 'specialty certification', 'medical specialty']
            },
            
            // Traditional Categories (10% total weight)
            consent_forms: {
                requiredFields: ['title', 'type', 'uploadDate', 'reviewDate'],
                complianceScore: 4,
                description: 'Patient consent form documentation tracking',
                category: 'Clinical',
                retentionMonths: 84,
                keywords: ['consent', 'informed consent', 'patient consent', 'treatment consent']
            },
            policies: {
                requiredFields: ['title', 'type', 'uploadDate', 'reviewDate'],
                complianceScore: 3,
                description: 'General policy document tracking and review schedules',
                category: 'Administrative',
                retentionMonths: 84,
                keywords: ['policy', 'procedure', 'administrative policy']
            },
            training_records: {
                requiredFields: ['title', 'type', 'uploadDate', 'completionDate'],
                complianceScore: 3,
                description: 'General staff training completion tracking',
                category: 'Administrative',
                retentionMonths: 36,
                keywords: ['training', 'staff training', 'employee training', 'training record']
            }
        };
        
        // Compliance patterns for metadata analysis
        this.compliancePatterns = {
            expiredDocuments: {
                pattern: /expired|outdated|old/i,
                severity: 'high',
                autoDetect: true,
                categories: ['all']
            },
            missingReviews: {
                pattern: /review|update|renew/i,
                severity: 'medium',
                autoDetect: true,
                categories: ['all']
            },
            incompleteFields: {
                pattern: /required|mandatory|must/i,
                severity: 'low',
                autoDetect: true,
                categories: ['all']
            },
            // HIPAA-specific patterns
            hipaaViolations: {
                pattern: /breach|violation|complaint|audit/i,
                severity: 'critical',
                autoDetect: true,
                categories: ['HIPAA']
            },
            // OSHA-specific patterns
            oshaViolations: {
                pattern: /citation|violation|inspection|penalty/i,
                severity: 'high',
                autoDetect: true,
                categories: ['OSHA']
            },
            // DEA-specific patterns
            deaViolations: {
                pattern: /diversion|theft|loss|investigation/i,
                severity: 'critical',
                autoDetect: true,
                categories: ['DEA']
            },
            // CMS-specific patterns
            billingViolations: {
                pattern: /overpayment|denial|audit|recovery/i,
                severity: 'high',
                autoDetect: true,
                categories: ['CMS']
            },
            // Accreditation-specific patterns
            accreditationFindings: {
                pattern: /finding|deficiency|citation|recommendation/i,
                severity: 'medium',
                autoDetect: true,
                categories: ['Accreditation']
            }
        };
        
        // Risk indicators based on documentation gaps
        this.riskIndicators = {
            // HIPAA Risk Indicators (25% weight)
            'missing_hipaa_policies': { weight: 0.1, impact: 'critical', category: 'HIPAA' },
            'expired_baas': { weight: 0.08, impact: 'high', category: 'HIPAA' },
            'outdated_privacy_notices': { weight: 0.07, impact: 'medium', category: 'HIPAA' },
            
            // OSHA Risk Indicators (15% weight)
            'missing_osha_programs': { weight: 0.06, impact: 'critical', category: 'OSHA' },
            'outdated_training_records': { weight: 0.05, impact: 'high', category: 'OSHA' },
            'missing_injury_logs': { weight: 0.04, impact: 'medium', category: 'OSHA' },
            
            // DEA Risk Indicators (20% weight)
            'expired_dea_registration': { weight: 0.1, impact: 'critical', category: 'DEA' },
            'missing_controlled_substance_logs': { weight: 0.06, impact: 'critical', category: 'DEA' },
            'outdated_dea_training': { weight: 0.04, impact: 'high', category: 'DEA' },
            
            // CMS Risk Indicators (25% weight)
            'expired_medicare_enrollment': { weight: 0.08, impact: 'critical', category: 'CMS' },
            'expired_medicaid_enrollment': { weight: 0.06, impact: 'critical', category: 'CMS' },
            'missing_billing_compliance': { weight: 0.06, impact: 'high', category: 'CMS' },
            'outstanding_billing_audits': { weight: 0.05, impact: 'medium', category: 'CMS' },
            
            // Accreditation Risk Indicators (20% weight)
            'expired_accreditation': { weight: 0.08, impact: 'critical', category: 'Accreditation' },
            'missing_survey_reports': { weight: 0.06, impact: 'high', category: 'Accreditation' },
            'overdue_corrective_actions': { weight: 0.06, impact: 'medium', category: 'Accreditation' },
            
            // CME Risk Indicators (10% weight)
            'insufficient_cme_hours': { weight: 0.05, impact: 'high', category: 'CME' },
            'expired_certifications': { weight: 0.03, impact: 'medium', category: 'CME' },
            'missing_cme_documentation': { weight: 0.02, impact: 'low', category: 'CME' }
        };
    }
    
    // Enhanced document classification based on content and metadata
    classifyDocument(documentData, content = '') {
        const classification = {
            suggestedCategory: 'other',
            confidence: 0,
            category: 'Administrative',
            retentionMonths: 84,
            keywords: [],
            matches: []
        };
        
        const documentTitle = (documentData.title || '').toLowerCase();
        const documentContent = (content || '').toLowerCase();
        const documentText = `${documentTitle} ${documentContent}`;
        
        // HIPAA Document Classification
        if (this.matchesKeywords(documentText, ['hipaa', 'privacy', 'security', 'phi', 'protected health information', 'breach'])) {
            if (this.matchesKeywords(documentText, ['business associate', 'baa', 'vendor agreement'])) {
                classification.suggestedCategory = 'business_associate_agreements';
                classification.confidence = 0.9;
                classification.category = 'HIPAA';
                classification.retentionMonths = 72;
            } else if (this.matchesKeywords(documentText, ['privacy notice', 'notice of privacy practices'])) {
                classification.suggestedCategory = 'privacy_notices';
                classification.confidence = 0.9;
                classification.category = 'HIPAA';
                classification.retentionMonths = 72;
            } else {
                classification.suggestedCategory = 'hipaa_policies';
                classification.confidence = 0.8;
                classification.category = 'HIPAA';
                classification.retentionMonths = 72;
            }
        }
        
        // OSHA Document Classification
        else if (this.matchesKeywords(documentText, ['osha', 'safety', 'workplace', 'injury', 'illness', 'bloodborne', 'hazard'])) {
            if (this.matchesKeywords(documentText, ['osha 300', 'injury log', 'illness log'])) {
                classification.suggestedCategory = 'injury_illness_logs';
                classification.confidence = 0.9;
                classification.category = 'OSHA';
                classification.retentionMonths = 60;
            } else if (this.matchesKeywords(documentText, ['training', 'certificate', 'completion'])) {
                classification.suggestedCategory = 'osha_training_records';
                classification.confidence = 0.8;
                classification.category = 'OSHA';
                classification.retentionMonths = 36;
            } else {
                classification.suggestedCategory = 'osha_programs';
                classification.confidence = 0.7;
                classification.category = 'OSHA';
                classification.retentionMonths = 36;
            }
        }
        
        // DEA Document Classification
        else if (this.matchesKeywords(documentText, ['dea', 'controlled substance', 'schedule ii', 'narcotic', 'diversion'])) {
            if (this.matchesKeywords(documentText, ['registration', 'certificate', 'license'])) {
                classification.suggestedCategory = 'dea_registrations';
                classification.confidence = 0.9;
                classification.category = 'DEA';
                classification.retentionMonths = 60;
            } else if (this.matchesKeywords(documentText, ['log', 'inventory', 'dispensing', 'record'])) {
                classification.suggestedCategory = 'controlled_substance_logs';
                classification.confidence = 0.8;
                classification.category = 'DEA';
                classification.retentionMonths = 24;
            } else if (this.matchesKeywords(documentText, ['training', 'certificate', 'completion'])) {
                classification.suggestedCategory = 'dea_training_records';
                classification.confidence = 0.8;
                classification.category = 'DEA';
                classification.retentionMonths = 36;
            }
        }
        
        // CMS Document Classification
        else if (this.matchesKeywords(documentText, ['medicare', 'medicaid', 'cms', 'billing', 'reimbursement', 'ptan'])) {
            if (this.matchesKeywords(documentText, ['medicare enrollment', 'provider enrollment'])) {
                classification.suggestedCategory = 'medicare_enrollments';
                classification.confidence = 0.9;
                classification.category = 'CMS';
                classification.retentionMonths = 84;
            } else if (this.matchesKeywords(documentText, ['medicaid enrollment', 'state medicaid'])) {
                classification.suggestedCategory = 'medicaid_enrollments';
                classification.confidence = 0.9;
                classification.category = 'CMS';
                classification.retentionMonths = 84;
            } else if (this.matchesKeywords(documentText, ['billing compliance', 'coding compliance', 'fraud prevention'])) {
                classification.suggestedCategory = 'billing_compliance_programs';
                classification.confidence = 0.8;
                classification.category = 'CMS';
                classification.retentionMonths = 72;
            } else if (this.matchesKeywords(documentText, ['audit', 'recovery', 'overpayment'])) {
                classification.suggestedCategory = 'billing_audits';
                classification.confidence = 0.8;
                classification.category = 'CMS';
                classification.retentionMonths = 84;
            }
        }
        
        // Accreditation Document Classification
        else if (this.matchesKeywords(documentText, ['accreditation', 'joint commission', 'tjc', 'aaahc', 'carf', 'achc', 'survey'])) {
            if (this.matchesKeywords(documentText, ['certificate', 'accreditation'])) {
                classification.suggestedCategory = 'accreditation_certificates';
                classification.confidence = 0.9;
                classification.category = 'Accreditation';
                classification.retentionMonths = 84;
            } else if (this.matchesKeywords(documentText, ['survey report', 'findings', 'deficiency'])) {
                classification.suggestedCategory = 'survey_reports';
                classification.confidence = 0.8;
                classification.category = 'Accreditation';
                classification.retentionMonths = 84;
            } else if (this.matchesKeywords(documentText, ['corrective action', 'cap', 'plan of correction'])) {
                classification.suggestedCategory = 'corrective_action_plans';
                classification.confidence = 0.8;
                classification.category = 'Accreditation';
                classification.retentionMonths = 84;
            } else if (this.matchesKeywords(documentText, ['performance improvement', 'pi project', 'quality improvement'])) {
                classification.suggestedCategory = 'performance_improvement_projects';
                classification.confidence = 0.7;
                classification.category = 'Accreditation';
                classification.retentionMonths = 84;
            }
        }
        
        // CME Document Classification
        else if (this.matchesKeywords(documentText, ['cme', 'continuing medical education', 'medical education', 'board certification'])) {
            if (this.matchesKeywords(documentText, ['cme certificate', 'cme completion'])) {
                classification.suggestedCategory = 'cme_certificates';
                classification.confidence = 0.9;
                classification.category = 'CME';
                classification.retentionMonths = 72;
            } else if (this.matchesKeywords(documentText, ['state cme', 'cme reporting', 'license renewal'])) {
                classification.suggestedCategory = 'state_cme_documentation';
                classification.confidence = 0.8;
                classification.category = 'CME';
                classification.retentionMonths = 72;
            } else if (this.matchesKeywords(documentText, ['board certification', 'specialty certification'])) {
                classification.suggestedCategory = 'specialty_certifications';
                classification.confidence = 0.8;
                classification.category = 'CME';
                classification.retentionMonths = 72;
            }
        }
        
        // Traditional Document Classification
        else if (this.matchesKeywords(documentText, ['consent', 'informed consent', 'patient consent'])) {
            classification.suggestedCategory = 'consent_forms';
            classification.confidence = 0.8;
            classification.category = 'Clinical';
            classification.retentionMonths = 84;
        } else if (this.matchesKeywords(documentText, ['policy', 'procedure', 'administrative'])) {
            classification.suggestedCategory = 'policies';
            classification.confidence = 0.6;
            classification.category = 'Administrative';
            classification.retentionMonths = 84;
        } else if (this.matchesKeywords(documentText, ['training', 'certificate', 'completion'])) {
            classification.suggestedCategory = 'training_records';
            classification.confidence = 0.6;
            classification.category = 'Administrative';
            classification.retentionMonths = 36;
        }
        
        // Store classification details
        classification.keywords = this.extractKeywords(documentText);
        classification.matches = this.getMatchingKeywords(documentText);
        
        return classification;
    }
    
    // Helper method to check keyword matches
    matchesKeywords(text, keywords) {
        const lowerText = text.toLowerCase();
        return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
    }
    
    // Extract keywords from document text
    extractKeywords(text) {
        const keywordPatterns = {
            hipaa: ['hipaa', 'privacy', 'security', 'phi', 'breach'],
            osha: ['osha', 'safety', 'injury', 'illness', 'bloodborne'],
            dea: ['dea', 'controlled substance', 'schedule', 'narcotic'],
            cms: ['medicare', 'medicaid', 'cms', 'billing', 'ptan'],
            accreditation: ['accreditation', 'survey', 'tjc', 'joint commission'],
            cme: ['cme', 'continuing education', 'board certification']
        };
        
        const foundKeywords = [];
        const lowerText = text.toLowerCase();
        
        for (const [category, keywords] of Object.entries(keywordPatterns)) {
            for (const keyword of keywords) {
                if (lowerText.includes(keyword)) {
                    foundKeywords.push({ category, keyword });
                }
            }
        }
        
        return foundKeywords;
    }
    
    // Get matching keywords with context
    getMatchingKeywords(text) {
        const allKeywords = [];
        
        for (const [category, config] of Object.entries(this.documentCategories)) {
            if (config.keywords) {
                for (const keyword of config.keywords) {
                    if (text.toLowerCase().includes(keyword.toLowerCase())) {
                        allKeywords.push({
                            category,
                            keyword,
                            categoryLabel: config.category || category
                        });
                    }
                }
            }
        }
        
        return allKeywords;
    }
    
    // Analyze document metadata for compliance tracking (NO PHI processing)
    async analyzeDocument(documentData, content = '') {
        const analysis = {
            documentId: documentData.id,
            category: documentData.type,
            complianceScore: 0,
            riskLevel: 'low',
            issues: [],
            recommendations: [],
            missingFields: [],
            expiryStatus: null,
            completenessScore: 0,
            timestamp: new Date().toISOString(),
            documentType: 'unknown', // Add document type detection
            isScanned: false, // Track if document is scanned
            ocrConfidence: 0 // OCR confidence score
        };
        
        // Detect if document is scanned/image-based
        const scanAnalysis = this.detectScannedDocument(content, documentData);
        analysis.isScanned = scanAnalysis.isScanned;
        analysis.documentType = scanAnalysis.documentType;
        analysis.ocrConfidence = scanAnalysis.confidence;
        
        if (scanAnalysis.isScanned) {
            // Handle scanned documents with specialized analysis
            return this.analyzeScannedDocument(documentData, analysis);
        }
        
        // Check required fields
        const categoryConfig = this.documentCategories[documentData.type];
        if (categoryConfig) {
            analysis.missingFields = this.checkRequiredFields(documentData, categoryConfig.requiredFields);
            analysis.completenessScore = this.calculateCompleteness(documentData, categoryConfig.requiredFields);
        }
        
        // Content analysis (if content provided)
        if (content) {
            const contentAnalysis = this.analyzeContent(content, documentData.type);
            analysis.issues.push(...contentAnalysis.issues);
            analysis.recommendations.push(...contentAnalysis.recommendations);
        }
        
        // Document-specific analysis
        const specificAnalysis = this.performDocumentSpecificAnalysis(content, documentData.type);
        analysis.issues.push(...specificAnalysis.issues);
        analysis.recommendations.push(...specificAnalysis.recommendations);
        
        // Check expiry status
        analysis.expiryStatus = this.checkExpiryStatus(documentData);
        
        // Calculate final compliance score
        analysis.complianceScore = this.calculateDocumentComplianceScore(analysis);
        analysis.riskLevel = this.determineRiskLevel(analysis.complianceScore);
        
        // Generate recommendations
        analysis.recommendations = this.generateDocumentRecommendations(analysis);
        
        return analysis;
    }
    
    // Detect if document is scanned or image-based
    detectScannedDocument(content, documentData) {
        const analysis = {
            isScanned: false,
            documentType: 'text',
            confidence: 100
        };
        
        // Check for empty or minimal content (indicates scanned document)
        if (!content || content.trim().length < 50) {
            analysis.isScanned = true;
            analysis.documentType = 'scanned';
            analysis.confidence = 95;
            return analysis;
        }
        
        // Check for OCR artifacts (common with scanned documents)
        const ocrIndicators = [
            /\s{3,}/g, // Excessive whitespace
            /[^\w\s\.\,\;\:\!\?\-\(\)\/\&\@\#\$\%\*\+\=\[\]\{\}\"\'\']/g, // Unusual characters
            /\.{3,}/g, // Excessive periods
            /\-{3,}/g, // Excessive dashes
            /\s\w\s\w\s\w\s/g // Single character words (OCR error)
        ];
        
        let ocrScore = 0;
        for (const indicator of ocrIndicators) {
            const matches = content.match(indicator);
            if (matches) {
                ocrScore += matches.length;
            }
        }
        
        // If high OCR score, likely scanned document
        if (ocrScore > 10) {
            analysis.isScanned = true;
            analysis.documentType = 'ocr_processed';
            analysis.confidence = Math.min(95, 60 + ocrScore);
        }
        
        // Check for image-only indicators
        const imageIndicators = [
            content.includes('image'),
            content.includes('scanned'),
            content.includes('copied'),
            documentData.fileName && documentData.fileName.toLowerCase().includes('scan'),
            documentData.fileName && documentData.fileName.toLowerCase().includes('copy')
        ];
        
        if (imageIndicators.some(indicator => indicator)) {
            analysis.isScanned = true;
            analysis.confidence = Math.max(analysis.confidence, 80);
        }
        
        return analysis;
    }
    
    // Analyze scanned documents with specialized logic
    analyzeScannedDocument(documentData, analysis) {
        // Base compliance score for scanned documents is lower due to limited validation
        analysis.complianceScore = 60; // Start at 60% (passing but not optimal)
        analysis.riskLevel = 'medium';
        
        // Add specific issues for scanned documents
        analysis.issues.push({
            type: 'scanned_document',
            severity: 'medium',
            description: 'Document appears to be scanned/image-based, limiting automated validation',
            recommendation: 'Consider converting to text-based PDF for full analysis'
        });
        
        // Add recommendations based on document type
        const recommendations = this.generateScannedDocumentRecommendations(documentData.type);
        analysis.recommendations.push(...recommendations);
        
        // Perform metadata analysis if available
        const metadataAnalysis = this.analyzeDocumentMetadata(documentData);
        analysis.issues.push(...metadataAnalysis.issues);
        analysis.recommendations.push(...metadataAnalysis.recommendations);
        
        // Adjust score based on available metadata
        if (metadataAnalysis.metadataComplete) {
            analysis.complianceScore += 10; // Boost score if metadata is complete
        }
        
        // Check expiry status based on metadata
        analysis.expiryStatus = this.checkExpiryStatus(documentData);
        
        // Final scoring
        analysis.complianceScore = this.calculateDocumentComplianceScore(analysis);
        analysis.riskLevel = this.determineRiskLevel(analysis.complianceScore);
        
        return analysis;
    }
    
    // Generate recommendations for scanned documents
    generateScannedDocumentRecommendations(documentType) {
        const recommendations = [];
        
        // Base recommendations for all scanned documents
        recommendations.push({
            action: 'Convert scanned document to text-based PDF',
            priority: 'high',
            estimatedTime: '15-30 minutes',
            description: 'Use OCR software or rescan with text recognition enabled',
            impact: 'Enables full automated compliance validation'
        });
        
        recommendations.push({
            action: 'Manual review required for scanned document',
            priority: 'medium',
            estimatedTime: '5-10 minutes',
            description: 'Manually verify key elements since automated analysis is limited',
            impact: 'Ensures compliance despite scanning limitations'
        });
        
        // Document-specific recommendations
        switch (documentType) {
            case 'consent_forms':
                recommendations.push({
                    action: 'Verify consent form elements manually',
                    priority: 'high',
                    estimatedTime: '5 minutes',
                    description: 'Check for patient signature, date, and consent language',
                    impact: 'Critical for compliance'
                });
                break;
                
            case 'policies':
                recommendations.push({
                    action: 'Confirm policy approval and dates',
                    priority: 'medium',
                    estimatedTime: '10 minutes',
                    description: 'Verify effective date, approval signatures, and review schedule',
                    impact: 'Ensures policy currency and authority'
                });
                break;
                
            case 'training_records':
                recommendations.push({
                    action: 'Validate training completion details',
                    priority: 'medium',
                    estimatedTime: '5 minutes',
                    description: 'Confirm trainee name, completion date, and instructor',
                    impact: 'Maintains training compliance'
                });
                break;
                
            case 'audit_reports':
                recommendations.push({
                    action: 'Review audit findings and remediation',
                    priority: 'high',
                    estimatedTime: '15 minutes',
                    description: 'Verify audit date, findings, and follow-up actions',
                    impact: 'Critical for audit readiness'
                });
                break;
        }
        
        return recommendations;
    }
    
    // Analyze document metadata for scanned documents
    analyzeDocumentMetadata(documentData) {
        const analysis = {
            issues: [],
            recommendations: [],
            metadataComplete: false
        };
        
        // Check if essential metadata is available
        const essentialFields = ['title', 'type', 'uploadDate'];
        const missingFields = essentialFields.filter(field => !documentData[field]);
        
        if (missingFields.length > 0) {
            analysis.issues.push({
                type: 'missing_metadata',
                severity: 'low',
                description: `Missing metadata: ${missingFields.join(', ')}`,
                recommendation: 'Add document metadata for better tracking'
            });
        } else {
            analysis.metadataComplete = true;
        }
        
        // Check document age
        if (documentData.uploadDate) {
            const uploadDate = new Date(documentData.uploadDate);
            const daysSinceUpload = (new Date() - uploadDate) / (1000 * 60 * 60 * 24);
            
            if (daysSinceUpload > 365) {
                analysis.issues.push({
                    type: 'old_document',
                    severity: 'medium',
                    description: 'Document is over 1 year old',
                    recommendation: 'Review document for currency and relevance'
                });
            }
        }
        
        return analysis;
    }
    
    // Check required fields
    checkRequiredFields(documentData, requiredFields) {
        const missing = [];
        
        for (const field of requiredFields) {
            if (!documentData[field] || documentData[field].trim() === '') {
                missing.push({
                    field,
                    severity: this.getFieldSeverity(field),
                    recommendation: this.getFieldRecommendation(field)
                });
            }
        }
        
        return missing;
    }
    
    // Calculate document completeness
    calculateCompleteness(documentData, requiredFields) {
        const presentFields = requiredFields.filter(field => 
            documentData[field] && documentData[field].trim() !== ''
        ).length;
        
        return (presentFields / requiredFields.length) * 100;
    }
    
    // Analyze document content for compliance patterns
    analyzeContent(content, documentType) {
        const analysis = {
            issues: [],
            recommendations: []
        };
        
        // Pattern-based analysis
        for (const [patternName, patternConfig] of Object.entries(this.compliancePatterns)) {
            if (patternConfig.autoDetect) {
                const matches = content.match(patternConfig.pattern);
                if (matches) {
                    analysis.issues.push({
                        type: patternName,
                        severity: patternConfig.severity,
                        matches: matches.length,
                        description: this.getPatternDescription(patternName)
                    });
                }
            }
        }
        
        // Document-specific analysis
        const specificAnalysis = this.performDocumentSpecificAnalysis(content, documentType);
        analysis.issues.push(...specificAnalysis.issues);
        analysis.recommendations.push(...specificAnalysis.recommendations);
        
        return analysis;
    }
    
    // Document-specific analysis
    performDocumentSpecificAnalysis(content, documentType) {
        const analysis = { issues: [], recommendations: [] };
        
        switch (documentType) {
            case 'consent_forms':
                analysis.issues.push(...this.analyzeConsentForm(content));
                break;
            case 'policies':
                analysis.issues.push(...this.analyzePolicy(content));
                break;
            case 'training_records':
                analysis.issues.push(...this.analyzeTrainingRecord(content));
                break;
            case 'audit_reports':
                analysis.issues.push(...this.analyzeAuditReport(content));
                break;
        }
        
        return analysis;
    }
    
    // Analyze consent form
    analyzeConsentForm(content) {
        const issues = [];
        
        // Check for essential consent elements
        if (!content.includes('consent') && !content.includes('authorization')) {
            issues.push({
                type: 'missing_consent_language',
                severity: 'critical',
                description: 'Consent form lacks clear consent language'
            });
        }
        
        if (!content.includes('purpose') && !content.includes('reason')) {
            issues.push({
                type: 'missing_purpose',
                severity: 'high',
                description: 'Purpose of consent not clearly stated'
            });
        }
        
        if (!content.includes('rights') && !content.includes('withdraw')) {
            issues.push({
                type: 'missing_rights_info',
                severity: 'medium',
                description: 'Patient rights information missing'
            });
        }
        
        return issues;
    }
    
    // Analyze policy document
    analyzePolicy(content) {
        const issues = [];
        
        // Check for policy elements
        if (!content.includes('effective') && !content.includes('date')) {
            issues.push({
                type: 'missing_effective_date',
                severity: 'high',
                description: 'Policy lacks effective date'
            });
        }
        
        if (!content.includes('approval') && !content.includes('authorized')) {
            issues.push({
                type: 'missing_approval',
                severity: 'high',
                description: 'Policy lacks approval information'
            });
        }
        
        if (!content.includes('review') && !content.includes('update')) {
            issues.push({
                type: 'missing_review_schedule',
                severity: 'medium',
                description: 'Policy lacks review schedule'
            });
        }
        
        return issues;
    }
    
    // Analyze training record
    analyzeTrainingRecord(content) {
        const issues = [];
        
        // Check for training elements
        if (!content.includes('completion') && !content.includes('finished')) {
            issues.push({
                type: 'missing_completion_status',
                severity: 'high',
                description: 'Training record lacks completion status'
            });
        }
        
        if (!content.includes('score') && !content.includes('assessment')) {
            issues.push({
                type: 'missing_assessment',
                severity: 'medium',
                description: 'Training record lacks assessment score'
            });
        }
        
        return issues;
    }
    
    // Analyze audit report
    analyzeAuditReport(content) {
        const issues = [];
        
        // Check for audit elements
        if (!content.includes('finding') && !content.includes('observation')) {
            issues.push({
                type: 'missing_findings',
                severity: 'high',
                description: 'Audit report lacks findings'
            });
        }
        
        if (!content.includes('recommendation') && !content.includes('action')) {
            issues.push({
                type: 'missing_recommendations',
                severity: 'medium',
                description: 'Audit report lacks recommendations'
            });
        }
        
        return issues;
    }
    
    // Check expiry status
    checkExpiryStatus(documentData) {
        if (!documentData.expires_at) {
            return { status: 'no_expiry', daysUntilExpiry: null };
        }
        
        const expiryDate = new Date(documentData.expires_at);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        let status;
        if (daysUntilExpiry < 0) {
            status = 'expired';
        } else if (daysUntilExpiry <= 30) {
            status = 'expiring_soon';
        } else if (daysUntilExpiry <= 90) {
            status = 'expiring';
        } else {
            status = 'valid';
        }
        
        return { status, daysUntilExpiry };
    }
    
    // Calculate document compliance score
    calculateDocumentComplianceScore(analysis) {
        let score = 100;
        
        // Deduct points for missing fields
        const criticalMissing = analysis.missingFields.filter(f => f.severity === 'critical').length;
        const highMissing = analysis.missingFields.filter(f => f.severity === 'high').length;
        const mediumMissing = analysis.missingFields.filter(f => f.severity === 'medium').length;
        
        score -= (criticalMissing * 25);
        score -= (highMissing * 15);
        score -= (mediumMissing * 10);
        
        // Deduct points for content issues
        for (const issue of analysis.issues) {
            switch (issue.severity) {
                case 'critical': score -= 20; break;
                case 'high': score -= 15; break;
                case 'medium': score -= 10; break;
                case 'low': score -= 5; break;
            }
        }
        
        // Deduct points for expiry status
        if (analysis.expiryStatus) {
            switch (analysis.expiryStatus.status) {
                case 'expired': score -= 30; break;
                case 'expiring_soon': score -= 15; break;
                case 'expiring': score -= 5; break;
            }
        }
        
        return Math.max(0, Math.round(score));
    }
    
    // Determine risk level
    determineRiskLevel(complianceScore) {
        if (complianceScore >= 90) return 'minimal';
        if (complianceScore >= 80) return 'low';
        if (complianceScore >= 70) return 'medium';
        if (complianceScore >= 60) return 'high';
        return 'critical';
    }
    
    // Generate document recommendations
    generateDocumentRecommendations(analysis) {
        const recommendations = [];
        
        // Recommendations for missing fields
        for (const missing of analysis.missingFields) {
            recommendations.push({
                type: 'missing_field',
                priority: missing.severity,
                action: `Add ${missing.field} to document`,
                description: missing.recommendation,
                estimatedTime: this.getEstimatedTime(missing.severity)
            });
        }
        
        // Recommendations for content issues
        for (const issue of analysis.issues) {
            recommendations.push({
                type: 'content_issue',
                priority: issue.severity,
                action: `Address ${issue.type}`,
                description: issue.description,
                estimatedTime: this.getEstimatedTime(issue.severity)
            });
        }
        
        // Recommendations for expiry
        if (analysis.expiryStatus && analysis.expiryStatus.status !== 'valid') {
            recommendations.push({
                type: 'expiry',
                priority: analysis.expiryStatus.status === 'expired' ? 'critical' : 'high',
                action: 'Update or renew document',
                description: `Document ${analysis.expiryStatus.status}`,
                estimatedTime: '2-4 hours'
            });
        }
        
        return recommendations.sort((a, b) => this.getPriorityScore(b.priority) - this.getPriorityScore(a.priority));
    }
    
    // Get field severity
    getFieldSeverity(field) {
        const severityMap = {
            'patient_signature': 'critical',
            'date': 'high',
            'approval_signature': 'critical',
            'completion_date': 'high',
            'audit_date': 'high'
        };
        
        return severityMap[field] || 'medium';
    }
    
    // Get field recommendation
    getFieldRecommendation(field) {
        const recommendations = {
            'patient_signature': 'Obtain patient signature on the consent form',
            'date': 'Add date to document',
            'approval_signature': 'Obtain required approval signature',
            'completion_date': 'Add training completion date',
            'audit_date': 'Add audit date to report'
        };
        
        return recommendations[field] || `Add ${field} to document`;
    }
    
    // Get pattern description
    getPatternDescription(patternName) {
        const descriptions = {
            'missingSignatures': 'Document may be missing required signatures',
            'expiredDocuments': 'Document may contain expired information',
            'incompleteFields': 'Document may have incomplete required fields',
            'versionControl': 'Document version control issues detected'
        };
        
        return descriptions[patternName] || 'Potential compliance issue detected';
    }
    
    // Get estimated time for resolution
    getEstimatedTime(severity) {
        const timeMap = {
            'critical': '4-8 hours',
            'high': '2-4 hours',
            'medium': '1-2 hours',
            'low': '30 minutes - 1 hour'
        };
        
        return timeMap[severity] || '1-2 hours';
    }
    
    // Get priority score
    getPriorityScore(priority) {
        const scores = {
            'critical': 4,
            'high': 3,
            'medium': 2,
            'low': 1
        };
        
        return scores[priority] || 1;
    }
    
    // Analyze overall evidence vault compliance
    analyzeVaultCompliance(documents) {
        const analysis = {
            totalDocuments: documents.length,
            overallComplianceScore: 0,
            categoryScores: {},
            riskDistribution: {},
            criticalIssues: [],
            recommendations: [],
            retentionStatus: {},
            timestamp: new Date().toISOString()
        };
        
        // Analyze by category
        for (const [category, config] of Object.entries(this.documentCategories)) {
            const categoryDocs = documents.filter(doc => doc.type === category);
            const categoryAnalysis = this.analyzeCategoryCompliance(categoryDocs, config);
            
            analysis.categoryScores[category] = categoryAnalysis;
        }
        
        // Calculate overall score
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const [category, score] of Object.entries(analysis.categoryScores)) {
            const weight = this.documentCategories[category].complianceScore;
            totalScore += score.complianceScore * weight;
            totalWeight += weight;
        }
        
        analysis.overallComplianceScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
        
        // Identify critical issues
        analysis.criticalIssues = this.identifyCriticalIssues(analysis.categoryScores);
        
        // Generate vault-level recommendations
        analysis.recommendations = this.generateVaultRecommendations(analysis);
        
        // Analyze retention status
        analysis.retentionStatus = this.analyzeRetentionStatus(documents);
        
        return analysis;
    }
    
    // Analyze category compliance
    analyzeCategoryCompliance(categoryDocs, config) {
        const analysis = {
            documentCount: categoryDocs.length,
            complianceScore: 0,
            riskLevel: 'low',
            issues: [],
            recommendations: [],
            retentionCompliance: 0
        };
        
        if (categoryDocs.length === 0) {
            analysis.complianceScore = 0;
            analysis.riskLevel = 'critical';
            analysis.issues.push({
                type: 'no_documents',
                severity: 'critical',
                description: `No ${config.priority} priority documents found`
            });
            return analysis;
        }
        
        // Analyze each document
        let totalScore = 0;
        for (const doc of categoryDocs) {
            // This would integrate with the document analysis
            totalScore += 85; // Placeholder - would use actual analysis
        }
        
        analysis.complianceScore = Math.round(totalScore / categoryDocs.length);
        analysis.riskLevel = this.determineRiskLevel(analysis.complianceScore);
        
        return analysis;
    }
    
    // Identify critical issues
    identifyCriticalIssues(categoryScores) {
        const criticalIssues = [];
        
        for (const [category, analysis] of Object.entries(categoryScores)) {
            if (analysis.riskLevel === 'critical') {
                criticalIssues.push({
                    category,
                    issue: `Critical compliance issues in ${category}`,
                    documentCount: analysis.documentCount,
                    score: analysis.complianceScore
                });
            }
        }
        
        return criticalIssues;
    }
    
    // Generate vault-level recommendations
    generateVaultRecommendations(analysis) {
        const recommendations = [];
        
        // Overall compliance recommendations
        if (analysis.overallComplianceScore < 80) {
            recommendations.push({
                type: 'overall_compliance',
                priority: 'high',
                action: 'Implement comprehensive document review process',
                description: 'Overall compliance score below acceptable threshold',
                estimatedTime: '2-4 weeks'
            });
        }
        
        // Category-specific recommendations
        for (const [category, categoryAnalysis] of Object.entries(analysis.categoryScores)) {
            if (categoryAnalysis.complianceScore < 70) {
                recommendations.push({
                    type: 'category_compliance',
                    priority: 'high',
                    action: `Address compliance issues in ${category}`,
                    description: `${category} compliance score: ${categoryAnalysis.complianceScore}%`,
                    estimatedTime: '1-2 weeks'
                });
            }
        }
        
        return recommendations;
    }
    
    // Analyze retention status
    analyzeRetentionStatus(documents) {
        const retentionAnalysis = {
            compliant: 0,
            expiring: 0,
            expired: 0,
            total: documents.length
        };
        
        for (const doc of documents) {
            const expiryStatus = this.checkExpiryStatus(doc);
            switch (expiryStatus.status) {
                case 'valid': retentionAnalysis.compliant++; break;
                case 'expiring':
                case 'expiring_soon': retentionAnalysis.expiring++; break;
                case 'expired': retentionAnalysis.expired++; break;
            }
        }
        
        return retentionAnalysis;
    }

    // NEW: Cross-Reference Integration Methods
    
    // Get documents for cross-reference validation
    async getDocumentsForValidation() {
        try {
            const { data: documents, error } = await this.supabase
                .from('documents')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .eq('is_active', true);

            if (error) throw error;
            
            // Enhance documents with metadata for validation
            return documents.map(doc => ({
                ...doc,
                category: this.determineDocumentCategory(doc),
                type: doc.document_type || this.inferDocumentType(doc),
                expiryDate: doc.expiry_date,
                completionDate: doc.completion_date,
                lastReviewDate: doc.last_review_date,
                status: doc.status || 'active',
                dependencies: doc.dependencies || []
            }));
        } catch (error) {
            console.error('Error getting documents for validation:', error);
            return [];
        }
    }

    // Determine document category for cross-referencing
    determineDocumentCategory(doc) {
        const title = (doc.title || '').toLowerCase();
        const type = (doc.document_type || '').toLowerCase();
        
        // HIPAA Documents
        if (title.includes('hipaa') || title.includes('privacy') || title.includes('security') ||
            type.includes('hipaa') || type.includes('privacy') || type.includes('security')) {
            return 'hipaa_policies';
        }
        
        // OSHA Documents
        if (title.includes('osha') || title.includes('safety') || title.includes('hazard') ||
            type.includes('osha') || type.includes('safety')) {
            return 'osha_programs';
        }
        
        // DEA Documents
        if (title.includes('dea') || title.includes('controlled substance') || title.includes('registration') ||
            type.includes('dea') || type.includes('controlled_substance')) {
            return 'dea_registrations';
        }
        
        // Training Documents
        if (title.includes('training') || title.includes('certificate') || title.includes('cme') ||
            type.includes('training') || type.includes('certificate') || type.includes('cme')) {
            return 'training_records';
        }
        
        // Consent Documents
        if (title.includes('consent') || title.includes('authorization') ||
            type.includes('consent') || type.includes('authorization')) {
            return 'consent_forms';
        }
        
        // Audit Documents
        if (title.includes('audit') || title.includes('inspection') ||
            type.includes('audit') || type.includes('inspection')) {
            return 'audit_reports';
        }
        
        // State Compliance
        if (title.includes('state') || title.includes('california') || title.includes('new york') ||
            type.includes('state') || type.includes('state_compliance')) {
            return 'state_compliance';
        }
        
        // Default category based on document type
        return type || 'general_compliance';
    }

    // Infer document type from title and metadata
    inferDocumentType(doc) {
        const title = (doc.title || '').toLowerCase();
        
        if (title.includes('license')) return 'medical_license';
        if (title.includes('dea')) return 'dea_registration';
        if (title.includes('cme')) return 'cme_certificates';
        if (title.includes('training')) return 'training_records';
        if (title.includes('consent')) return 'consent_forms';
        if (title.includes('policy')) return 'policies';
        if (title.includes('procedure')) return 'procedures';
        if (title.includes('audit')) return 'audit_reports';
        
        return doc.document_type || 'general_document';
    }

    // Check if document relationships are valid
    async validateDocumentRelationships(documentId) {
        try {
            const { data: relationships, error } = await this.supabase
                .from('document_relationships')
                .select(`
                    *,
                    source_document:documents!document_relationships_source_document_id_fkey(title, status, expiry_date),
                    target_document:documents!document_relationships_target_document_id_fkey(title, status, expiry_date)
                `)
                .or(`source_document_id.eq.${documentId},target_document_id.eq.${documentId}`)
                .eq('is_active', true);

            if (error) throw error;

            const issues = [];
            
            for (const rel of relationships || []) {
                // Check if source document is active
                if (rel.source_document && rel.source_document.status !== 'active') {
                    issues.push({
                        type: 'invalid_relationship',
                        severity: 'medium',
                        title: 'Inactive Source Document',
                        description: `Document "${rel.source_document.title}" is inactive but has active relationships.`,
                        relationshipId: rel.id
                    });
                }
                
                // Check if target document is active
                if (rel.target_document && rel.target_document.status !== 'active') {
                    issues.push({
                        type: 'invalid_relationship',
                        severity: 'medium',
                        title: 'Inactive Target Document',
                        description: `Document "${rel.target_document.title}" is inactive but has active relationships.`,
                        relationshipId: rel.id
                    });
                }
                
                // Check expiry alignment for dependency relationships
                if (rel.relationship_type === 'depends_on' && 
                    rel.source_document && rel.source_document.expiry_date &&
                    rel.target_document && rel.target_document.expiry_date) {
                    
                    const sourceExpiry = new Date(rel.source_document.expiry_date);
                    const targetExpiry = new Date(rel.target_document.expiry_date);
                    
                    if (targetExpiry < sourceExpiry) {
                        issues.push({
                            type: 'expiry_misalignment',
                            severity: 'high',
                            title: 'Dependency Expiry Misalignment',
                            description: `Document "${rel.target_document.title}" expires before its dependency "${rel.source_document.title}".`,
                            relationshipId: rel.id
                        });
                    }
                }
            }

            return issues;
        } catch (error) {
            console.error('Error validating document relationships:', error);
            return [];
        }
    }

    // Get document dependencies
    async getDocumentDependencies(documentId) {
        try {
            const { data, error } = await this.supabase
                .from('document_relationships')
                .select(`
                    relationship_type,
                    target_document:documents!document_relationships_target_document_id_fkey(id, title, status, expiry_date)
                `)
                .eq('source_document_id', documentId)
                .eq('is_active', true);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting document dependencies:', error);
            return [];
        }
    }

    // Create document relationship
    async createDocumentRelationship(sourceId, targetId, relationshipType, description = null) {
        try {
            const { data, error } = await this.supabase
                .from('document_relationships')
                .insert({
                    tenant_id: this.tenantId,
                    source_document_id: sourceId,
                    target_document_id: targetId,
                    relationship_type: relationshipType,
                    description: description
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating document relationship:', error);
            throw error;
        }
    }

    // Update document with cross-reference metadata
    async updateDocumentCrossReferenceMetadata(documentId, metadata) {
        try {
            const { error } = await this.supabase
                .from('documents')
                .update({
                    cross_reference_metadata: metadata,
                    updated_at: new Date().toISOString()
                })
                .eq('id', documentId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating document cross-reference metadata:', error);
            throw error;
        }
    }

    // Get consistency score for document category
    async getCategoryConsistencyScore(category) {
        try {
            const { data, error } = await this.supabase
                .rpc('calculate_consistency_score', { 
                    p_tenant_id: this.tenantId 
                });

            if (error) throw error;
            return data || 0;
        } catch (error) {
            console.error('Error getting category consistency score:', error);
            return 0;
        }
    }

    // Enhanced document analysis with cross-reference checking
    async analyzeDocumentWithCrossReference(documentId) {
        try {
            // Get basic document analysis
            const basicAnalysis = await this.analyzeDocument(documentId);
            
            // Get cross-reference issues
            const relationshipIssues = await this.validateDocumentRelationships(documentId);
            
            // Get consistency score for document category
            const document = await this.getDocument(documentId);
            const category = this.determineDocumentCategory(document);
            const consistencyScore = await this.getCategoryConsistencyScore(category);
            
            return {
                ...basicAnalysis,
                crossReference: {
                    relationshipIssues,
                    consistencyScore,
                    category,
                    recommendations: this.generateCrossReferenceRecommendations(relationshipIssues)
                }
            };
        } catch (error) {
            console.error('Error in enhanced document analysis:', error);
            return {
                complianceScore: 0,
                riskLevel: 'critical',
                crossReference: {
                    relationshipIssues: [],
                    consistencyScore: 0,
                    recommendations: []
                }
            };
        }
    }

    // Generate cross-reference recommendations
    generateCrossReferenceRecommendations(issues) {
        const recommendations = [];
        
        for (const issue of issues) {
            switch (issue.type) {
                case 'invalid_relationship':
                    recommendations.push({
                        type: 'relationship_cleanup',
                        priority: 'medium',
                        action: 'Clean up inactive document relationships',
                        description: issue.description,
                        estimatedTime: '1-2 hours'
                    });
                    break;
                    
                case 'expiry_misalignment':
                    recommendations.push({
                        type: 'expiry_alignment',
                        priority: 'high',
                        action: 'Align document expiry dates',
                        description: issue.description,
                        estimatedTime: '2-4 hours'
                    });
                    break;
            }
        }
        
        return recommendations;
    }

    // Get cross-reference summary for dashboard
    async getCrossReferenceSummary() {
        try {
            // Get latest consistency check
            const { data: latestCheck, error: checkError } = await this.supabase
                .from('consistency_checks')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .order('check_date', { ascending: false })
                .limit(1)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
            }

            // Get open issues count
            const { count: openIssues, error: issuesError } = await this.supabase
                .from('consistency_issues')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', this.tenantId)
                .eq('resolution_status', 'open');

            if (issuesError) throw issuesError;

            return {
                latestCheck: latestCheck || null,
                overallScore: latestCheck?.overall_score || 0,
                openIssues: openIssues || 0,
                lastCheckDate: latestCheck?.check_date || null,
                needsAttention: (latestCheck?.overall_score || 0) < 80 || (openIssues || 0) > 0
            };
        } catch (error) {
            console.error('Error getting cross-reference summary:', error);
            return {
                latestCheck: null,
                overallScore: 0,
                openIssues: 0,
                lastCheckDate: null,
                needsAttention: true
            };
        }
    }
    
    // Initialize evidence vault with encryption
    async initialize(supabaseClient, userId, tenantId) {
        try {
            this.supabaseClient = supabaseClient;
            this.currentUserId = userId;
            this.currentTenantId = tenantId;
            
            // Initialize encryption service
            if (this.encryptionEnabled && encryptionService) {
                await encryptionService.initialize();
            }
            
            console.log('Evidence Vault initialized with encryption');
            return true;
        } catch (error) {
            errorHandler.logError(
                errorHandler.errorTypes.SYSTEM,
                'Evidence vault initialization failed',
                { operation: 'initialize_evidence_vault' },
                error
            );
            throw error;
        }
    }
    
    // Encrypt document metadata
    async encryptDocumentMetadata(metadata) {
        try {
            if (!this.encryptionEnabled || !encryptionService) {
                return metadata;
            }
            
            const sensitive = ['title', 'description', 'keywords', 'notes'];
            const encrypted = { ...metadata };
            
            for (const field of sensitive) {
                if (encrypted[field] && typeof encrypted[field] === 'string') {
                    encrypted[field] = await encryptionService.encrypt(encrypted[field]);
                }
            }
            
            encrypted.encrypted_fields = sensitive.filter(field => metadata[field]);
            encrypted.encryption_enabled = true;
            encrypted.encrypted_at = new Date().toISOString();
            
            return encrypted;
        } catch (error) {
            errorHandler.logError(
                errorHandler.errorTypes.SYSTEM,
                'Document metadata encryption failed',
                { operation: 'encrypt_metadata' },
                error
            );
            throw error;
        }
    }
    
    // Decrypt document metadata
    async decryptDocumentMetadata(encryptedMetadata) {
        try {
            if (!this.encryptionEnabled || !encryptionService || !encryptedMetadata.encryption_enabled) {
                return encryptedMetadata;
            }
            
            const decrypted = { ...encryptedMetadata };
            
            if (encryptedMetadata.encrypted_fields) {
                for (const field of encryptedMetadata.encrypted_fields) {
                    if (decrypted[field]) {
                        decrypted[field] = await encryptionService.decrypt(decrypted[field]);
                    }
                }
            }
            
            // Remove encryption metadata
            delete decrypted.encrypted_fields;
            delete decrypted.encryption_enabled;
            delete decrypted.encrypted_at;
            
            return decrypted;
        } catch (error) {
            errorHandler.logError(
                errorHandler.errorTypes.SYSTEM,
                'Document metadata decryption failed',
                { operation: 'decrypt_metadata' },
                error
            );
            throw error;
        }
    }
    
    // Validate document integrity
    validateDocumentIntegrity(document) {
        try {
            if (!document || !document.checksum) {
                return {
                    isValid: false,
                    error: 'Missing document checksum'
                };
            }
            
            // Calculate current checksum
            const currentChecksum = this.calculateChecksum(document.content || document.metadata);
            
            const isValid = currentChecksum === document.checksum;
            
            return {
                isValid,
                currentChecksum,
                storedChecksum: document.checksum,
                lastValidated: new Date().toISOString()
            };
        } catch (error) {
            return {
                isValid: false,
                error: `Integrity validation failed: ${error.message}`
            };
        }
    }
    
    // Calculate checksum for document
    calculateChecksum(content) {
        try {
            const crypto = require('crypto');
            const contentString = typeof content === 'string' ? content : JSON.stringify(content);
            return crypto.createHash('sha256').update(contentString).digest('hex');
        } catch (error) {
            // Fallback for browser environment
            const contentString = typeof content === 'string' ? content : JSON.stringify(content);
            let hash = 0;
            for (let i = 0; i < contentString.length; i++) {
                const char = contentString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash.toString(16);
        }
    }
    
    // Create document version
    async createDocumentVersion(documentId, changes, reason = 'Document update') {
        try {
            if (!this.supabaseClient) {
                throw new Error('Database connection required for versioning');
            }
            
            // Get current document
            const { data: currentDoc, error: fetchError } = await this.supabaseClient
                .from('documents')
                .select('*')
                .eq('id', documentId)
                .single();
            
            if (fetchError || !currentDoc) {
                throw new Error('Document not found');
            }
            
            // Create version record
            const versionData = {
                document_id: documentId,
                version_number: (currentDoc.version_number || 1) + 1,
                content: currentDoc.content,
                metadata: currentDoc.metadata,
                checksum: currentDoc.checksum,
                changes: changes,
                reason: reason,
                created_by: this.currentUserId,
                created_at: new Date().toISOString(),
                tenant_id: this.currentTenantId
            };
            
            // Store version
            const { data: version, error: versionError } = await this.supabaseClient
                .from('document_versions')
                .insert(versionData)
                .select()
                .single();
            
            if (versionError || !version) {
                throw new Error(`Failed to create version: ${versionError?.message}`);
            }
            
            // Update document version number
            const { error: updateError } = await this.supabaseClient
                .from('documents')
                .update({
                    version_number: version.version_number,
                    updated_at: new Date().toISOString()
                })
                .eq('id', documentId);
            
            if (updateError) {
                throw new Error(`Failed to update document version: ${updateError.message}`);
            }
            
            console.log(`Document version ${version.version_number} created for document ${documentId}`);
            return version;
        } catch (error) {
            errorHandler.logError(
                errorHandler.errorTypes.DATABASE,
                'Document version creation failed',
                { documentId, reason, operation: 'create_version' },
                error
            );
            throw error;
        }
    }
    
    // Get document version history
    async getDocumentHistory(documentId) {
        try {
            if (!this.supabaseClient) {
                throw new Error('Database connection required');
            }
            
            const { data, error } = await this.supabaseClient
                .from('document_versions')
                .select('*')
                .eq('document_id', documentId)
                .eq('tenant_id', this.currentTenantId)
                .order('created_at', { ascending: false });
            
            if (error) {
                throw new Error(`Failed to get document history: ${error.message}`);
            }
            
            return data || [];
        } catch (error) {
            errorHandler.logError(
                errorHandler.errorTypes.DATABASE,
                'Failed to get document history',
                { documentId, operation: 'get_history' },
                error
            );
            throw error;
        }
    }
}

// Export for use in the application
window.TrustMDEvidenceVault = TrustMDEvidenceVault;
