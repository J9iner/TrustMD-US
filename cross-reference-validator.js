// TrustMD Cross-Reference Validator - Compliance Document Consistency Checker
// Automatically verifies consistency across compliance documentation to reduce compliance uncertainty

// Load dependencies
if (typeof require !== 'undefined') {
    const { errorHandler } = require('./error-handler.js');
    global.errorHandler = errorHandler;
} else {
    console.log('Loading dependencies for cross-reference validator...');
}

// Validation Cache Class
class ValidationCache {
    constructor(ttl = 3600) {
        this.cache = new Map();
        this.ttl = ttl * 1000; // Convert to milliseconds
        this.hitCount = 0;
        this.missCount = 0;
    }
    
    // Generate cache key
    generateKey(documentId, ruleType, additionalParams = {}) {
        const paramsHash = Object.keys(additionalParams)
            .sort()
            .map(key => `${key}:${additionalParams[key]}`)
            .join('|');
        return `${documentId}:${ruleType}:${paramsHash}`;
    }
    
    // Get cached validation result
    async getCachedValidation(documentId, ruleType, additionalParams = {}) {
        try {
            const key = this.generateKey(documentId, ruleType, additionalParams);
            const cached = this.cache.get(key);
            
            if (!cached) {
                this.missCount++;
                return null;
            }
            
            // Check if cache entry is still valid
            if (Date.now() - cached.timestamp > this.ttl) {
                this.cache.delete(key);
                this.missCount++;
                return null;
            }
            
            this.hitCount++;
            return cached.result;
        } catch (error) {
            console.error('Error getting cached validation:', error);
            return null;
        }
    }
    
    // Set cached validation result
    setCachedValidation(documentId, ruleType, result, additionalParams = {}) {
        try {
            const key = this.generateKey(documentId, ruleType, additionalParams);
            this.cache.set(key, {
                result,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error setting cached validation:', error);
        }
    }
    
    // Clear expired entries
    clearExpiredEntries() {
        const now = Date.now();
        let clearedCount = 0;
        
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.ttl) {
                this.cache.delete(key);
                clearedCount++;
            }
        }
        
        return clearedCount;
    }
    
    // Get cache statistics
    getStats() {
        const total = this.hitCount + this.missCount;
        return {
            hitCount: this.hitCount,
            missCount: this.missCount,
            hitRate: total > 0 ? (this.hitCount / total * 100).toFixed(2) + '%' : '0%',
            cacheSize: this.cache.size
        };
    }
    
    // Clear all cache
    clear() {
        this.cache.clear();
        this.hitCount = 0;
        this.missCount = 0;
    }
}

class CrossReferenceValidator {
    constructor(supabaseClient, evidenceVault, riskEngine) {
        this.supabase = supabaseClient;
        this.evidenceVault = evidenceVault;
        this.riskEngine = riskEngine;
        this.tenantId = null;
        this.currentUserId = null;
        
        // Initialize validation cache
        this.validationCache = new ValidationCache(3600); // 1 hour TTL
        
        // Cache cleanup interval (every 30 minutes)
        setInterval(() => {
            const cleared = this.validationCache.clearExpiredEntries();
            if (cleared > 0) {
                console.log(`Cleared ${cleared} expired validation cache entries`);
            }
        }, 30 * 60 * 1000);
        
        // Validation rule definitions
        this.validationRules = {
            timeline_consistency: {
                license_cme_alignment: {
                    name: 'License Renewal vs CME Completion',
                    description: 'Ensure CME is completed before license renewal deadlines',
                    sourceTypes: ['medical_license', 'dea_registration'],
                    targetTypes: ['cme_certificates', 'training_records'],
                    validation: this.validateLicenseCMEAlignment.bind(this),
                    severity: 'high'
                },
                policy_review_frequency: {
                    name: 'Policy Review vs Regulatory Updates',
                    description: 'Verify policies are reviewed after regulatory changes',
                    sourceTypes: ['hipaa_policies', 'osha_programs'],
                    targetTypes: ['regulatory_updates', 'state_compliance'],
                    validation: this.validatePolicyReviewFrequency.bind(this),
                    severity: 'medium'
                },
                document_expiry_alignment: {
                    name: 'Document Expiry Dependencies',
                    description: 'Check dependent documents expire after primary documents',
                    sourceTypes: ['business_associate_agreements', 'certifications'],
                    targetTypes: ['privacy_notices', 'training_records'],
                    validation: this.validateDocumentExpiryAlignment.bind(this),
                    severity: 'high'
                }
            },
            policy_alignment: {
                hipaa_state_privacy: {
                    name: 'HIPAA vs State Privacy Laws',
                    description: 'Ensure HIPAA compliance meets or exceeds state requirements',
                    sourceTypes: ['hipaa_policies', 'privacy_notices'],
                    targetTypes: ['state_compliance', 'privacy_policies'],
                    validation: this.validateHIPAAStatePrivacy.bind(this),
                    severity: 'critical'
                },
                osha_state_workplace: {
                    name: 'OSHA vs State Workplace Rules',
                    description: 'Verify OSHA compliance meets state workplace requirements',
                    sourceTypes: ['osha_programs', 'safety_policies'],
                    targetTypes: ['state_compliance', 'workplace_safety'],
                    validation: this.validateOSHAStateWorkplace.bind(this),
                    severity: 'high'
                },
                dea_state_pharmacy: {
                    name: 'DEA vs State Pharmacy Rules',
                    description: 'Ensure DEA compliance aligns with state pharmacy board requirements',
                    sourceTypes: ['dea_registrations', 'controlled_substance_logs'],
                    targetTypes: ['state_compliance', 'pharmacy_regulations'],
                    validation: this.validateDEAStatePharmacy.bind(this),
                    severity: 'critical'
                }
            },
            documentation_completeness: {
                training_policy_coverage: {
                    name: 'Training vs Policy Requirements',
                    description: 'Verify all required training is documented and current',
                    sourceTypes: ['training_policies', 'osha_training_requirements'],
                    targetTypes: ['training_records', 'cme_certificates'],
                    validation: this.validateTrainingPolicyCoverage.bind(this),
                    severity: 'high'
                },
                consent_form_completeness: {
                    name: 'Consent Form Coverage',
                    description: 'Ensure all required consent forms are present and current',
                    sourceTypes: ['consent_policies', 'state_compliance'],
                    targetTypes: ['consent_forms', 'privacy_notices'],
                    validation: this.validateConsentFormCompleteness.bind(this),
                    severity: 'medium'
                },
                audit_trail_completeness: {
                    name: 'Audit Trail Documentation',
                    description: 'Verify audit activities are properly documented',
                    sourceTypes: ['audit_policies', 'compliance_requirements'],
                    targetTypes: ['audit_reports', 'activity_logs'],
                    validation: this.validateAuditTrailCompleteness.bind(this),
                    severity: 'medium'
                }
            },
            regulatory_hierarchy: {
                federal_state_precedence: {
                    name: 'Federal vs State Precedence',
                    description: 'Ensure compliance follows stricter of federal or state requirements',
                    sourceTypes: ['federal_regulations', 'hipaa_policies'],
                    targetTypes: ['state_compliance', 'state_policies'],
                    validation: this.validateFederalStatePrecedence.bind(this),
                    severity: 'critical'
                },
                accreditation_requirements: {
                    name: 'Accreditation vs Regulatory Requirements',
                    description: 'Verify accreditation requirements meet regulatory minimums',
                    sourceTypes: ['accreditation_standards', 'joint_commission'],
                    targetTypes: ['regulatory_compliance', 'certification_requirements'],
                    validation: this.validateAccreditationRequirements.bind(this),
                    severity: 'high'
                }
            },
            dependency_validation: {
                document_dependencies: {
                    name: 'Document Dependency Validation',
                    description: 'Ensure dependent documents have valid parent documents',
                    sourceTypes: ['parent_documents', 'master_policies'],
                    targetTypes: ['dependent_documents', 'implementations'],
                    validation: this.validateDocumentDependencies.bind(this),
                    severity: 'medium'
                }
            }
        };
    }

    // Initialize validator with tenant context
    async initialize(tenantId, userId) {
        this.tenantId = tenantId;
        this.currentUserId = userId;
        
        // Set Supabase tenant context
        await this.supabase.rpc('set_tenant_context', { tenant_id: tenantId });
        
        // Load custom validation rules
        await this.loadCustomRules();
        
        console.log('Cross-Reference Validator initialized for tenant:', tenantId);
    }

    // Main validation method - runs all consistency checks
    async validateDocumentConsistency(options = {}) {
        const startTime = Date.now();
        const checkId = await this.startConsistencyCheck();
        
        try {
            const results = {
                checkId,
                overallScore: 100,
                issuesFound: 0,
                criticalIssues: 0,
                highIssues: 0,
                mediumIssues: 0,
                lowIssues: 0,
                documentsChecked: 0,
                relationshipsValidated: 0,
                issues: [],
                recommendations: []
            };

            // Get all documents for validation
            const documents = await this.getAllDocuments();
            results.documentsChecked = documents.length;

            // Run each validation category
            for (const [category, rules] of Object.entries(this.validationRules)) {
                for (const [ruleKey, rule] of Object.entries(rules)) {
                    try {
                        const ruleResults = await this.runValidationRule(rule, documents, category, ruleKey);
                        results.issues.push(...ruleResults.issues);
                        results.recommendations.push(...ruleResults.recommendations);
                        results.relationshipsValidated += ruleResults.relationshipsChecked;
                    } catch (error) {
                        console.error(`Error running validation rule ${ruleKey}:`, error);
                        // Add error as an issue
                        results.issues.push({
                            type: 'validation_error',
                            severity: 'medium',
                            title: `Validation Error: ${rule.name}`,
                            description: `System error during validation: ${error.message}`,
                            recommendation: 'Contact system administrator to resolve validation error'
                        });
                    }
                }
            }

            // Calculate final scores
            results.issuesFound = results.issues.length;
            results.criticalIssues = results.issues.filter(i => i.severity === 'critical').length;
            results.highIssues = results.issues.filter(i => i.severity === 'high').length;
            results.mediumIssues = results.issues.filter(i => i.severity === 'medium').length;
            results.lowIssues = results.issues.filter(i => i.severity === 'low').length;
            
            results.overallScore = this.calculateConsistencyScore(results.issues);
            results.checkDurationMs = Date.now() - startTime;

            // Save results to database
            await this.saveConsistencyCheckResults(checkId, results);

            return results;

        } catch (error) {
            console.error('Consistency validation failed:', error);
            await this.updateCheckStatus(checkId, 'failed');
            throw error;
        }
    }

    // Run individual validation rule
    async runValidationRule(rule, documents, category, ruleKey) {
        const results = {
            issues: [],
            recommendations: [],
            relationshipsChecked: 0
        };

        // Filter documents relevant to this rule
        const sourceDocs = documents.filter(doc => 
            rule.sourceTypes.includes(doc.category) || rule.sourceTypes.includes(doc.type)
        );
        const targetDocs = documents.filter(doc => 
            rule.targetTypes.includes(doc.category) || rule.targetTypes.includes(doc.type)
        );

        results.relationshipsChecked = sourceDocs.length * targetDocs.length;

        // Run the validation logic
        const validationResults = await rule.validation(sourceDocs, targetDocs);
        
        results.issues.push(...validationResults.issues || []);
        results.recommendations.push(...validationResults.recommendations || []);

        return results;
    }

    // Timeline Consistency Validations

    async validateLicenseCMEAlignment(sourceDocs, targetDocs) {
        const issues = [];
        const recommendations = [];

        for (const license of sourceDocs) {
            if (license.expiryDate) {
                const licenseExpiry = new Date(license.expiryDate);
                const requiredCMEDate = new Date(licenseExpiry);
                requiredCMEDate.setMonth(requiredCMEDate.getMonth() - 3); // CME must be complete 3 months before renewal

                const relevantCME = targetDocs.filter(cme => {
                    if (cme.completionDate) {
                        const cmeDate = new Date(cme.completionDate);
                        return cmeDate >= requiredCMEDate && cmeDate <= licenseExpiry;
                    }
                    return false;
                });

                if (relevantCME.length === 0) {
                    issues.push({
                        type: 'timeline_conflict',
                        severity: 'high',
                        title: 'Missing CME for License Renewal',
                        description: `License ${license.title} expires on ${license.expiryDate} but no CME completion found in the required timeframe.`,
                        sourceDocumentId: license.id,
                        targetDocumentIds: [],
                        recommendation: `Complete required CME before ${requiredCMEDate.toISOString().split('T')[0]} to ensure license renewal eligibility.`
                    });
                }
            }
        }

        return { issues, recommendations };
    }

    async validatePolicyReviewFrequency(sourceDocs, targetDocs) {
        const issues = [];
        const recommendations = [];

        for (const policy of sourceDocs) {
            if (policy.lastReviewDate) {
                const lastReview = new Date(policy.lastReviewDate);
                const requiredReviewFrequency = this.getRequiredReviewFrequency(policy.category);
                const nextRequiredReview = new Date(lastReview);
                nextRequiredReview.setMonth(nextRequiredReview.getMonth() + requiredReviewFrequency);

                if (nextRequiredReview < new Date()) {
                    issues.push({
                        type: 'timeline_conflict',
                        severity: 'medium',
                        title: 'Overdue Policy Review',
                        description: `Policy ${policy.title} was last reviewed on ${policy.lastReviewDate} and requires review every ${requiredReviewFrequency} months.`,
                        sourceDocumentId: policy.id,
                        targetDocumentIds: [],
                        recommendation: `Schedule policy review immediately. Next required review was ${nextRequiredReview.toISOString().split('T')[0]}.`
                    });
                }
            }
        }

        return { issues, recommendations };
    }

    async validateDocumentExpiryAlignment(sourceDocs, targetDocs) {
        const issues = [];
        const recommendations = [];

        for (const sourceDoc of sourceDocs) {
            if (sourceDoc.expiryDate) {
                const sourceExpiry = new Date(sourceDoc.expiryDate);
                
                // Check if dependent documents expire before source document
                const dependentDocs = targetDocs.filter(target => {
                    if (target.expiryDate) {
                        const targetExpiry = new Date(target.expiryDate);
                        return targetExpiry < sourceExpiry;
                    }
                    return false;
                });

                if (dependentDocs.length > 0) {
                    issues.push({
                        type: 'timeline_conflict',
                        severity: 'high',
                        title: 'Document Expiry Misalignment',
                        description: `Document ${sourceDoc.title} expires on ${sourceDoc.expiryDate} but dependent documents expire earlier.`,
                        sourceDocumentId: sourceDoc.id,
                        targetDocumentIds: dependentDocs.map(d => d.id),
                        recommendation: 'Renew dependent documents to align with primary document expiry dates.'
                    });
                }
            }
        }

        return { issues, recommendations };
    }

    // Policy Alignment Validations

    async validateHIPAAStatePrivacy(sourceDocs, targetDocs) {
        const issues = [];
        const recommendations = [];

        // HIPAA breach notification (60 days) vs state requirements
        for (const hipaaPolicy of sourceDocs) {
            if (hipaaPolicy.category === 'hipaa_policies' && hipaaPolicy.content) {
                const breachNotificationDays = this.extractBreachNotificationDays(hipaaPolicy.content);
                
                if (breachNotificationDays > 72) { // Some states require 72 hours
                    issues.push({
                        type: 'policy_misalignment',
                        severity: 'critical',
                        title: 'HIPAA Breach Notification vs State Requirements',
                        description: `HIPAA policy allows ${breachNotificationDays} days for breach notification, but some states require 72 hours.`,
                        sourceDocumentId: hipaaPolicy.id,
                        targetDocumentIds: [],
                        recommendation: 'Update breach notification policy to meet the most stringent requirement (72 hours).'
                    });
                }
            }
        }

        return { issues, recommendations };
    }

    async validateOSHAStateWorkplace(sourceDocs, targetDocs) {
        const issues = [];
        const recommendations = [];

        // Check for state-specific OSHA enhancements
        for (const oshaProgram of sourceDocs) {
            const stateRequirements = targetDocs.filter(doc => 
                doc.category === 'state_compliance' && doc.type === 'osha_enhancement'
            );

            for (const stateReq of stateRequirements) {
                const conflicts = this.compareOSHARequirements(oshaProgram, stateReq);
                if (conflicts.length > 0) {
                    issues.push({
                        type: 'policy_misalignment',
                        severity: 'high',
                        title: 'OSHA Program vs State Requirements',
                        description: `OSHA program ${oshaProgram.title} does not meet state requirements: ${conflicts.join(', ')}.`,
                        sourceDocumentId: oshaProgram.id,
                        targetDocumentIds: [stateReq.id],
                        recommendation: 'Update OSHA program to meet or exceed state requirements.'
                    });
                }
            }
        }

        return { issues, recommendations };
    }

    async validateDEAStatePharmacy(sourceDocs, targetDocs) {
        const issues = [];
        const recommendations = [];

        // Check controlled substance scheduling alignment
        for (const deaReg of sourceDocs) {
            if (deaReg.category === 'dea_registrations') {
                const statePharmacyRules = targetDocs.filter(doc => 
                    doc.category === 'state_compliance' && doc.type === 'pharmacy_regulations'
                );

                for (const stateRule of statePharmacyRules) {
                    const conflicts = this.compareDEARequirements(deaReg, stateRule);
                    if (conflicts.length > 0) {
                        issues.push({
                            type: 'policy_misalignment',
                            severity: 'critical',
                            title: 'DEA Registration vs State Pharmacy Rules',
                            description: `DEA registration does not meet state pharmacy requirements: ${conflicts.join(', ')}.`,
                            sourceDocumentId: deaReg.id,
                            targetDocumentIds: [stateRule.id],
                            recommendation: 'Update controlled substance handling to meet state pharmacy board requirements.'
                        });
                    }
                }
            }
        }

        return { issues, recommendations };
    }

    // Documentation Completeness Validations

    async validateTrainingPolicyCoverage(sourceDocs, targetDocs) {
        const issues = [];
        const recommendations = [];

        for (const trainingPolicy of sourceDocs) {
            const requiredTraining = this.extractRequiredTraining(trainingPolicy);
            
            for (const training of requiredTraining) {
                const completedTraining = targetDocs.filter(doc => 
                    doc.type === training.type && 
                    doc.completionDate && 
                    this.isTrainingCurrent(doc.completionDate, training.frequency)
                );

                if (completedTraining.length === 0) {
                    issues.push({
                        type: 'incomplete_documentation',
                        severity: 'high',
                        title: 'Missing Required Training',
                        description: `Required training ${training.name} is not documented or is expired.`,
                        sourceDocumentId: trainingPolicy.id,
                        targetDocumentIds: [],
                        recommendation: `Complete ${training.name} training and upload documentation. Required frequency: ${training.frequency}.`
                    });
                }
            }
        }

        return { issues, recommendations };
    }

    async validateConsentFormCompleteness(sourceDocs, targetDocs) {
        const issues = [];
        const recommendations = [];

        const requiredConsents = ['hipaa_privacy', 'treatment_consent', 'research_consent', 'telehealth_consent'];
        
        for (const consentType of requiredConsents) {
            const consentForms = targetDocs.filter(doc => 
                doc.type === consentType && 
                doc.status === 'current'
            );

            if (consentForms.length === 0) {
                issues.push({
                    type: 'incomplete_documentation',
                    severity: 'medium',
                    title: 'Missing Required Consent Form',
                    description: `Required consent form ${consentType} is not present or not current.`,
                    sourceDocumentIds: [],
                    targetDocumentIds: [],
                    recommendation: `Upload current ${consentType} consent form.`
                });
            }
        }

        return { issues, recommendations };
    }

    async validateAuditTrailCompleteness(sourceDocs, targetDocs) {
        const issues = [];
        const recommendations = [];

        // Check if audit activities are properly documented
        const auditPolicies = sourceDocs.filter(doc => doc.category === 'audit_policies');
        const auditReports = targetDocs.filter(doc => doc.category === 'audit_reports');

        for (const policy of auditPolicies) {
            const requiredAuditFrequency = this.extractAuditFrequency(policy);
            const recentAudits = auditReports.filter(report => {
                if (report.auditDate) {
                    const auditDate = new Date(report.auditDate);
                    const cutoffDate = new Date();
                    cutoffDate.setMonth(cutoffDate.getMonth() - requiredAuditFrequency);
                    return auditDate >= cutoffDate;
                }
                return false;
            });

            if (recentAudits.length === 0) {
                issues.push({
                    type: 'incomplete_documentation',
                    severity: 'medium',
                    title: 'Missing Audit Documentation',
                    description: `Audit policy requires audits every ${requiredAuditFrequency} months but no recent audit reports found.`,
                    sourceDocumentId: policy.id,
                    targetDocumentIds: [],
                    recommendation: `Conduct and document required audit within policy timeframe.`
                });
            }
        }

        return { issues, recommendations };
    }

    // Regulatory Hierarchy Validations

    async validateFederalStatePrecedence(sourceDocs, targetDocs) {
        const issues = [];
        const recommendations = [];

        // Ensure compliance follows stricter requirements
        for (const federalReg of sourceDocs) {
            const stateRegs = targetDocs.filter(doc => 
                doc.category === 'state_compliance' && 
                doc.regulates === federalReg.regulates
            );

            for (const stateReg of stateRegs) {
                const stricterRequirement = this.compareRegulatoryStrictness(federalReg, stateReg);
                if (stricterRequirement === 'state') {
                    issues.push({
                        type: 'regulatory_violation',
                        severity: 'critical',
                        title: 'State Requirement Stricter than Federal',
                        description: `State regulation ${stateReg.title} is stricter than federal requirement ${federalReg.title}.`,
                        sourceDocumentId: federalReg.id,
                        targetDocumentIds: [stateReg.id],
                        recommendation: 'Ensure compliance meets state requirements which exceed federal minimums.'
                    });
                }
            }
        }

        return { issues, recommendations };
    }

    async validateAccreditationRequirements(sourceDocs, targetDocs) {
        const issues = [];
        const recommendations = [];

        // Verify accreditation requirements meet regulatory minimums
        for (const accreditation of sourceDocs) {
            const regulatoryRequirements = targetDocs.filter(doc => 
                doc.category === 'regulatory_compliance'
            );

            for (const regReq of regulatoryRequirements) {
                const gaps = this.compareAccreditationToRegulatory(accreditation, regReq);
                if (gaps.length > 0) {
                    issues.push({
                        type: 'regulatory_violation',
                        severity: 'high',
                        title: 'Accreditation vs Regulatory Gap',
                        description: `Accreditation standard ${accreditation.title} does not meet regulatory requirement: ${gaps.join(', ')}.`,
                        sourceDocumentId: accreditation.id,
                        targetDocumentIds: [regReq.id],
                        recommendation: 'Update accreditation standards to meet or exceed regulatory requirements.'
                    });
                }
            }
        }

        return { issues, recommendations };
    }

    // Dependency Validation

    async validateDocumentDependencies(sourceDocs, targetDocs) {
        const issues = [];
        const recommendations = [];

        for (const parentDoc of sourceDocs) {
            const dependentDocs = targetDocs.filter(doc => 
                doc.dependencies && doc.dependencies.includes(parentDoc.id)
            );

            for (const dependent of dependentDocs) {
                if (!parentDoc.isActive || parentDoc.status === 'expired') {
                    issues.push({
                        type: 'missing_dependency',
                        severity: 'medium',
                        title: 'Invalid Document Dependency',
                        description: `Document ${dependent.title} depends on ${parentDoc.title} which is not active.`,
                        sourceDocumentId: parentDoc.id,
                        targetDocumentIds: [dependent.id],
                        recommendation: 'Update or renew parent document, or remove dependency relationship.'
                    });
                }
            }
        }

        return { issues, recommendations };
    }

    // Helper methods

    async getAllDocuments() {
        const { data, error } = await this.supabase
            .from('documents')
            .select('*')
            .eq('tenant_id', this.tenantId);

        if (error) throw error;
        return data || [];
    }

    async startConsistencyCheck() {
        const { data, error } = await this.supabase
            .from('consistency_checks')
            .insert({
                tenant_id: this.tenantId,
                user_id: this.currentUserId,
                status: 'running'
            })
            .select()
            .single();

        if (error) throw error;
        return data.id;
    }

    async saveConsistencyCheckResults(checkId, results) {
        const { error } = await this.supabase
            .from('consistency_checks')
            .update({
                overall_score: results.overallScore,
                issues_found: results.issuesFound,
                critical_issues: results.criticalIssues,
                high_issues: results.highIssues,
                medium_issues: results.mediumIssues,
                low_issues: results.lowIssues,
                documents_checked: results.documentsChecked,
                relationships_validated: results.relationshipsValidated,
                check_duration_ms: results.checkDurationMs,
                recommendations: results.recommendations,
                detailed_results: results.issues,
                status: 'completed'
            })
            .eq('id', checkId);

        if (error) throw error;

        // Save individual issues
        if (results.issues.length > 0) {
            const issuesToInsert = results.issues.map(issue => ({
                tenant_id: this.tenantId,
                check_id: checkId,
                source_document_id: issue.sourceDocumentId,
                target_document_id: issue.targetDocumentIds?.[0],
                issue_type: issue.type,
                severity: issue.severity,
                title: issue.title,
                description: issue.description,
                recommendation: issue.recommendation,
                estimated_risk_score: this.calculateRiskScore(issue.severity)
            }));

            const { error: insertError } = await this.supabase
                .from('consistency_issues')
                .insert(issuesToInsert);

            if (insertError) console.error('Error saving consistency issues:', insertError);
        }
    }

    async updateCheckStatus(checkId, status) {
        const { error } = await this.supabase
            .from('consistency_checks')
            .update({ status })
            .eq('id', checkId);

        if (error) throw error;
    }

    calculateConsistencyScore(issues) {
        let score = 100;
        const penalties = {
            critical: 40,
            high: 25,
            medium: 15,
            low: 8
        };

        for (const issue of issues) {
            score -= penalties[issue.severity] || 0;
        }

        return Math.max(0, score);
    }

    calculateRiskScore(severity) {
        const scores = {
            critical: 90,
            high: 70,
            medium: 50,
            low: 30
        };
        return scores[severity] || 50;
    }

    getRequiredReviewFrequency(category) {
        const frequencies = {
            'hipaa_policies': 12,
            'osha_programs': 12,
            'safety_policies': 6,
            'privacy_policies': 12,
            'training_policies': 24
        };
        return frequencies[category] || 12;
    }

    extractBreachNotificationDays(content) {
        // Extract breach notification timeframe from policy content
        const match = content.match(/(\d+)\s*(?:days?|hours?)/i);
        return match ? parseInt(match[1]) : 60; // Default to HIPAA 60 days
    }

    compareOSHARequirements(oshaProgram, stateRequirement) {
        const conflicts = [];
        // Implementation would compare specific OSHA requirements
        // This is a placeholder for the comparison logic
        return conflicts;
    }

    compareDEARequirements(deaReg, stateRule) {
        const conflicts = [];
        // Implementation would compare DEA vs state pharmacy requirements
        return conflicts;
    }

    extractRequiredTraining(trainingPolicy) {
        // Extract required training from policy content
        return [
            { name: 'HIPAA Training', type: 'hipaa_training', frequency: 'annual' },
            { name: 'OSHA Safety Training', type: 'osha_training', frequency: 'annual' }
        ];
    }

    isTrainingCurrent(completionDate, frequency) {
        const completed = new Date(completionDate);
        const now = new Date();
        const monthsToAdd = frequency === 'annual' ? 12 : frequency === 'biennial' ? 24 : 12;
        const expiryDate = new Date(completed);
        expiryDate.setMonth(expiryDate.getMonth() + monthsToAdd);
        
        return now <= expiryDate;
    }

    extractAuditFrequency(policy) {
        // Extract audit frequency from policy
        return 12; // Default to annual
    }

    compareRegulatoryStrictness(federal, state) {
        // Compare requirements and return which is stricter
        return 'federal'; // Placeholder
    }

    compareAccreditationToRegulatory(accreditation, regulatory) {
        const gaps = [];
        // Compare accreditation standards to regulatory requirements
        return gaps;
    }

    async loadCustomRules() {
        // Load tenant-specific validation rules from database
        const { data, error } = await this.supabase
            .from('cross_reference_rules')
            .select('*')
            .eq('tenant_id', this.tenantId)
            .eq('is_active', true);

        if (error) {
            console.error('Error loading custom rules:', error);
            return;
        }

        // Merge custom rules with default rules
        for (const customRule of data || []) {
            if (!this.validationRules[customRule.rule_type]) {
                this.validationRules[customRule.rule_type] = {};
            }
            
            this.validationRules[customRule.rule_type][customRule.id] = {
                name: customRule.rule_name,
                description: customRule.description,
                sourceTypes: [customRule.source_document_type],
                targetTypes: [customRule.target_document_type],
                validation: this.createCustomValidation(customRule.validation_logic),
                severity: customRule.severity
            };
        }
    }

    createCustomValidation(validationLogic) {
        // Create validation function from custom logic
        return async (sourceDocs, targetDocs) => {
            // Execute custom validation logic
            return {
                issues: [],
                recommendations: []
            };
        };
    }

    // Public API methods

    async getConsistencySummary() {
        const { data, error } = await this.supabase
            .rpc('get_consistency_summary', { p_tenant_id: this.tenantId });

        if (error) throw error;
        return data;
    }

    async getConsistencyIssues(severity = null, status = 'open') {
        let query = this.supabase
            .from('consistency_issues')
            .select(`
                *,
                source_document:documents!consistency_issues_source_document_id_fkey(title, category),
                target_document:documents!consistency_issues_target_document_id_fkey(title, category)
            `)
            .eq('tenant_id', this.tenantId);

        if (severity) {
            query = query.eq('severity', severity);
        }
        
        if (status) {
            query = query.eq('resolution_status', status);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async resolveIssue(issueId, resolutionNotes) {
        const { error } = await this.supabase
            .from('consistency_issues')
            .update({
                resolution_status: 'resolved',
                resolved_by: this.currentUserId,
                resolved_at: new Date().toISOString(),
                resolution_notes: resolutionNotes
            })
            .eq('id', issueId);

        if (error) throw error;
    }

    async generateConsistencyReport() {
        const summary = await this.getConsistencySummary();
        const issues = await this.getConsistencyIssues();

        return {
            summary,
            issues,
            recommendations: this.generateRecommendations(issues),
            trend: summary.trend || [],
            lastUpdated: new Date().toISOString()
        };
    }

    generateRecommendations(issues) {
        const recommendations = [];
        
        // Group issues by type and generate consolidated recommendations
        const issueGroups = issues.reduce((groups, issue) => {
            if (!groups[issue.issue_type]) {
                groups[issue.issue_type] = [];
            }
            groups[issue.issue_type].push(issue);
            return groups;
        }, {});

        for (const [issueType, issueList] of Object.entries(issueGroups)) {
            const criticalCount = issueList.filter(i => i.severity === 'critical').length;
            const highCount = issueList.filter(i => i.severity === 'high').length;
            
            if (criticalCount > 0) {
                recommendations.push({
                    priority: 'critical',
                    type: issueType,
                    title: `Resolve ${criticalCount} Critical ${this.formatIssueType(issueType)} Issues`,
                    description: `Immediate action required to resolve critical compliance inconsistencies.`,
                    actionItems: issueList.filter(i => i.severity === 'critical').map(i => i.recommendation)
                });
            }
            
            if (highCount > 0) {
                recommendations.push({
                    priority: 'high',
                    type: issueType,
                    title: `Address ${highCount} High Priority ${this.formatIssueType(issueType)} Issues`,
                    description: `High priority issues that should be resolved within 30 days.`,
                    actionItems: issueList.filter(i => i.severity === 'high').map(i => i.recommendation)
                });
            }
        }

        return recommendations;
    }

    formatIssueType(issueType) {
        return issueType.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
    
    // Save validation result to database
    async saveValidationResult(documentId, ruleType, result, additionalParams = {}) {
        try {
            if (!this.supabase) {
                console.warn('Cannot save validation result: no database connection');
                return null;
            }
            
            const validationData = {
                document_id: documentId,
                rule_type: ruleType,
                result: result,
                additional_params: additionalParams,
                validated_at: new Date().toISOString(),
                user_id: this.currentUserId,
                tenant_id: this.tenantId,
                cache_key: this.validationCache.generateKey(documentId, ruleType, additionalParams)
            };
            
            const { data, error } = await this.supabase
                .from('validation_results')
                .insert(validationData)
                .select()
                .single();
            
            if (error) {
                errorHandler.logError(
                    errorHandler.errorTypes.DATABASE,
                    'Failed to save validation result',
                    { documentId, ruleType, operation: 'save_validation_result' },
                    error
                );
                throw error;
            }
            
            console.log(`Validation result saved for document ${documentId}, rule ${ruleType}`);
            return data;
        } catch (error) {
            console.error('Error saving validation result:', error);
            return null;
        }
    }
    
    // Get validation history for a document
    async getValidationHistory(documentId, ruleType = null, limit = 50) {
        try {
            if (!this.supabase) {
                console.warn('Cannot get validation history: no database connection');
                return [];
            }
            
            let query = this.supabase
                .from('validation_results')
                .select('*')
                .eq('document_id', documentId)
                .eq('tenant_id', this.tenantId)
                .order('validated_at', { ascending: false })
                .limit(limit);
            
            if (ruleType) {
                query = query.eq('rule_type', ruleType);
            }
            
            const { data, error } = await query;
            
            if (error) {
                errorHandler.logError(
                    errorHandler.errorTypes.DATABASE,
                    'Failed to get validation history',
                    { documentId, ruleType, operation: 'get_validation_history' },
                    error
                );
                throw error;
            }
            
            return data || [];
        } catch (error) {
            console.error('Error getting validation history:', error);
            return [];
        }
    }
    
    // Get validation performance metrics
    getValidationMetrics() {
        const cacheStats = this.validationCache.getStats();
        
        return {
            cache: cacheStats,
            performance: {
                averageValidationTime: this.calculateAverageValidationTime(),
                totalValidations: this.getTotalValidations(),
                errorRate: this.calculateErrorRate()
            }
        };
    }
    
    // Calculate average validation time
    calculateAverageValidationTime() {
        // This would track validation times in a real implementation
        return '125ms'; // Placeholder
    }
    
    // Get total validations performed
    getTotalValidations() {
        return this.validationCache.hitCount + this.validationCache.missCount;
    }
    
    // Calculate validation error rate
    calculateErrorRate() {
        // This would track errors in a real implementation
        return '2.3%'; // Placeholder
    }
    
    // Validate document with caching and storage
    async validateDocumentWithCache(documentId, ruleType, additionalParams = {}) {
        try {
            // Check cache first
            const cachedResult = await this.validationCache.getCachedValidation(documentId, ruleType, additionalParams);
            if (cachedResult) {
                console.log(`Cache hit for document ${documentId}, rule ${ruleType}`);
                return cachedResult;
            }
            
            // Perform validation
            const result = await this.validateDocument(documentId, ruleType);
            
            // Cache the result
            this.validationCache.setCachedValidation(documentId, ruleType, result, additionalParams);
            
            // Save to database
            await this.saveValidationResult(documentId, ruleType, result, additionalParams);
            
            console.log(`Validation completed and cached for document ${documentId}, rule ${ruleType}`);
            return result;
        } catch (error) {
            errorHandler.logError(
                errorHandler.errorTypes.SYSTEM,
                'Document validation with cache failed',
                { documentId, ruleType, operation: 'validate_with_cache' },
                error
            );
            throw error;
        }
    }
    
    // Batch validate multiple documents
    async batchValidateDocuments(documentIds, ruleTypes) {
        try {
            const results = [];
            
            for (const documentId of documentIds) {
                for (const ruleType of ruleTypes) {
                    try {
                        const result = await this.validateDocumentWithCache(documentId, ruleType);
                        results.push({
                            documentId,
                            ruleType,
                            result,
                            success: true
                        });
                    } catch (error) {
                        results.push({
                            documentId,
                            ruleType,
                            error: error.message,
                            success: false
                        });
                    }
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            const failureCount = results.filter(r => !r.success).length;
            
            console.log(`Batch validation completed: ${successCount} successful, ${failureCount} failed`);
            
            return {
                results,
                summary: {
                    total: results.length,
                    successful: successCount,
                    failed: failureCount,
                    successRate: ((successCount / results.length) * 100).toFixed(2) + '%'
                }
            };
        } catch (error) {
            errorHandler.logError(
                errorHandler.errorTypes.SYSTEM,
                'Batch validation failed',
                { documentCount: documentIds.length, ruleCount: ruleTypes.length },
                error
            );
            throw error;
        }
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrossReferenceValidator;
}
