// TrustMD Compliance Templates
// Pre-built compliance templates for various regulatory frameworks

class ComplianceTemplates {
    constructor() {
        this.templates = new Map();
        this.initializeTemplates();
    }
    
    // Initialize all compliance templates
    initializeTemplates() {
        // HIPAA Compliance Templates
        this.addTemplate('hipaa_security_rule', {
            name: 'HIPAA Security Rule Assessment',
            category: 'HIPAA',
            description: 'Comprehensive assessment of HIPAA Security Rule requirements',
            version: '2.0',
            requirements: [
                {
                    id: 'hipaa_sr_001',
                    name: 'Security Officer',
                    description: 'Designate a security officer responsible for developing and implementing security policies',
                    category: 'administrative',
                    priority: 'high',
                    dueDays: 30,
                    criteria: [
                        {
                            description: 'Security officer is designated in writing',
                            type: 'document',
                            required: true
                        },
                        {
                            description: 'Security officer has appropriate authority',
                            type: 'verification',
                            required: true
                        }
                    ],
                    evidenceRequired: ['Security officer designation letter', 'Organizational chart']
                },
                {
                    id: 'hipaa_sr_002',
                    name: 'Risk Assessment',
                    description: 'Conduct accurate and thorough assessment of potential risks to ePHI',
                    category: 'administrative',
                    priority: 'high',
                    dueDays: 90,
                    criteria: [
                        {
                            description: 'Risk assessment is conducted annually',
                            type: 'frequency',
                            required: true
                        },
                        {
                            description: 'All systems containing ePHI are assessed',
                            type: 'completeness',
                            required: true
                        }
                    ],
                    evidenceRequired: ['Risk assessment report', 'Risk management plan']
                },
                {
                    id: 'hipaa_sr_003',
                    name: 'Workforce Security',
                    description: 'Implement policies and procedures to prevent unauthorized workforce access',
                    category: 'administrative',
                    priority: 'medium',
                    dueDays: 60,
                    criteria: [
                        {
                            description: 'Authorization procedures are documented',
                            type: 'document',
                            required: true
                        },
                        {
                            description: 'Termination procedures include access revocation',
                            type: 'procedure',
                            required: true
                        }
                    ],
                    evidenceRequired: ['Workforce security policies', 'Access logs']
                }
            ]
        });
        
        // OSHA Compliance Templates
        this.addTemplate('osha_recordkeeping', {
            name: 'OSHA Recordkeeping Requirements',
            category: 'OSHA',
            description: 'OSHA 300 Log and recordkeeping compliance assessment',
            version: '1.0',
            requirements: [
                {
                    id: 'osha_rk_001',
                    name: 'OSHA 300 Log Maintenance',
                    description: 'Maintain OSHA 300 Log for recording work-related injuries and illnesses',
                    category: 'recordkeeping',
                    priority: 'high',
                    dueDays: 7,
                    criteria: [
                        {
                            description: '300 Log is updated within 7 days of recordable incident',
                            type: 'timeliness',
                            required: true
                        },
                        {
                            description: 'All required fields are completed',
                            type: 'completeness',
                            required: true
                        }
                    ],
                    evidenceRequired: ['OSHA 300 Log', 'Incident reports']
                },
                {
                    id: 'osha_rk_002',
                    name: 'Annual Summary',
                    description: 'Complete and post OSHA 300A Summary by February 1st',
                    category: 'recordkeeping',
                    priority: 'high',
                    dueDays: 31,
                    criteria: [
                        {
                            description: '300A Summary is completed accurately',
                            type: 'accuracy',
                            required: true
                        },
                        {
                            description: 'Summary is posted in workplace from Feb 1 to Apr 30',
                            type: 'verification',
                            required: true
                        }
                    ],
                    evidenceRequired: ['OSHA 300A Summary', 'Posting verification photo']
                }
            ]
        });
        
        // DEA Compliance Templates
        this.addTemplate('dea_controlled_substances', {
            name: 'DEA Controlled Substance Compliance',
            category: 'DEA',
            description: 'DEA registration and controlled substance handling compliance',
            version: '1.0',
            requirements: [
                {
                    id: 'dea_cs_001',
                    name: 'DEA Registration',
                    description: 'Maintain current DEA registration for all locations handling controlled substances',
                    category: 'registration',
                    priority: 'high',
                    dueDays: 30,
                    criteria: [
                        {
                            description: 'DEA registration is current and valid',
                            type: 'validity',
                            required: true
                        },
                        {
                            description: 'Registration is displayed in accordance with DEA requirements',
                            type: 'display',
                            required: true
                        }
                    ],
                    evidenceRequired: ['DEA registration certificate', 'Display verification']
                },
                {
                    id: 'dea_cs_002',
                    name: 'Inventory Records',
                    description: 'Maintain biennial inventory of all controlled substances',
                    category: 'recordkeeping',
                    priority: 'high',
                    dueDays: 730,
                    criteria: [
                        {
                            description: 'Biennial inventory is completed on schedule',
                            type: 'frequency',
                            required: true
                        },
                        {
                            description: 'Inventory records are accurate and complete',
                            type: 'accuracy',
                            required: true
                        }
                    ],
                    evidenceRequired: ['Biennial inventory records', 'Inventory reconciliation reports']
                }
            ]
        });
        
        // Medicare/Medicaid Compliance Templates
        this.addTemplate('medicare_billing_compliance', {
            name: 'Medicare Billing Compliance',
            category: 'MEDICARE_MEDICAID',
            description: 'Medicare billing and coding compliance assessment',
            version: '1.0',
            requirements: [
                {
                    id: 'mm_bc_001',
                    name: 'Billing Documentation',
                    description: 'Maintain complete documentation for all Medicare billed services',
                    category: 'billing',
                    priority: 'high',
                    dueDays: 30,
                    criteria: [
                        {
                            description: 'Documentation supports all billed services',
                            type: 'support',
                            required: true
                        },
                        {
                            description: 'Documentation meets medical necessity standards',
                            type: 'necessity',
                            required: true
                        }
                    ],
                    evidenceRequired: ['Billing documentation', 'Medical records', 'Coding audits']
                },
                {
                    id: 'mm_bc_002',
                    name: 'Compliance Program',
                    description: 'Maintain effective billing compliance program',
                    category: 'compliance',
                    priority: 'medium',
                    dueDays: 365,
                    criteria: [
                        {
                            description: 'Compliance program is documented and communicated',
                            type: 'document',
                            required: true
                        },
                        {
                            description: 'Regular compliance training is conducted',
                            type: 'training',
                            required: true
                        }
                    ],
                    evidenceRequired: ['Compliance program manual', 'Training records', 'Monitoring reports']
                }
            ]
        });
        
        // Accreditation Templates
        this.addTemplate('joint_commission_standards', {
            name: 'Joint Commission Standards Compliance',
            category: 'ACCREDITATION',
            description: 'Joint Commission accreditation standards assessment',
            version: '1.0',
            requirements: [
                {
                    id: 'jc_std_001',
                    name: 'Patient Rights',
                    description: 'Ensure patient rights are respected and protected',
                    category: 'patient_care',
                    priority: 'high',
                    dueDays: 90,
                    criteria: [
                        {
                            description: 'Patient rights are documented and communicated',
                            type: 'document',
                            required: true
                        },
                        {
                            description: 'Staff is trained on patient rights',
                            type: 'training',
                            required: true
                        }
                    ],
                    evidenceRequired: ['Patient rights documentation', 'Training records', 'Patient satisfaction surveys']
                },
                {
                    id: 'jc_std_002',
                    name: 'Quality Improvement',
                    description: 'Maintain active quality improvement program',
                    category: 'quality',
                    priority: 'high',
                    dueDays: 180,
                    criteria: [
                        {
                            description: 'QI program is documented and active',
                            type: 'program',
                            required: true
                        },
                        {
                            description: 'QI activities show measurable improvement',
                            type: 'measurement',
                            required: true
                        }
                    ],
                    evidenceRequired: ['QI program documentation', 'Performance improvement data', 'Meeting minutes']
                }
            ]
        });
        
        // State-Specific Templates
        this.addTemplate('california_healthcare_compliance', {
            name: 'California Healthcare Compliance',
            category: 'STATE_SPECIFIC',
            description: 'California-specific healthcare compliance requirements',
            version: '1.0',
            requirements: [
                {
                    id: 'ca_hc_001',
                    name: 'CMIA Compliance',
                    description: 'Comply with California Medical Information Act',
                    category: 'privacy',
                    priority: 'high',
                    dueDays: 60,
                    criteria: [
                        {
                            description: 'CMIA policies are documented and implemented',
                            type: 'policy',
                            required: true
                        },
                        {
                            description: 'Patient access procedures are established',
                            type: 'procedure',
                            required: true
                        }
                    ],
                    evidenceRequired: ['CMIA policies', 'Patient access logs', 'Staff training records']
                },
                {
                    id: 'ca_hc_002',
                    name: 'California Breach Notification',
                    description: 'Comply with California breach notification requirements',
                    category: 'security',
                    priority: 'high',
                    dueDays: 30,
                    criteria: [
                        {
                            description: 'Breach notification procedures are documented',
                            type: 'procedure',
                            required: true
                        },
                        {
                            description: 'Staff is trained on breach response',
                            type: 'training',
                            required: true
                        }
                    ],
                    evidenceRequired: ['Breach notification procedures', 'Training records', 'Incident response documentation']
                }
            ]
        });
    }
    
    // Add a template to the collection
    addTemplate(id, template) {
        this.templates.set(id, {
            id,
            ...template,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }
    
    // Get template by ID
    getTemplate(id) {
        return this.templates.get(id);
    }
    
    // Get all templates
    getAllTemplates() {
        return Array.from(this.templates.values());
    }
    
    // Get templates by category
    getTemplatesByCategory(category) {
        return this.getAllTemplates().filter(template => template.category === category);
    }
    
    // Get template categories
    getCategories() {
        const categories = new Set();
        this.getAllTemplates().forEach(template => {
            categories.add(template.category);
        });
        return Array.from(categories);
    }
    
    // Search templates
    searchTemplates(query) {
        const lowercaseQuery = query.toLowerCase();
        return this.getAllTemplates().filter(template => 
            template.name.toLowerCase().includes(lowercaseQuery) ||
            template.description.toLowerCase().includes(lowercaseQuery) ||
            template.category.toLowerCase().includes(lowercaseQuery)
        );
    }
    
    // Create custom template
    createCustomTemplate(templateData) {
        const id = this.generateTemplateId();
        const customTemplate = {
            id,
            name: templateData.name,
            category: 'CUSTOM',
            description: templateData.description,
            version: '1.0',
            requirements: templateData.requirements || [],
            isCustom: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.addTemplate(id, customTemplate);
        return customTemplate;
    }
    
    // Generate template ID
    generateTemplateId() {
        return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Update template
    updateTemplate(id, updates) {
        const template = this.getTemplate(id);
        if (!template) {
            throw new Error(`Template ${id} not found`);
        }
        
        const updatedTemplate = {
            ...template,
            ...updates,
            id,
            updatedAt: new Date().toISOString()
        };
        
        this.templates.set(id, updatedTemplate);
        return updatedTemplate;
    }
    
    // Delete template
    deleteTemplate(id) {
        return this.templates.delete(id);
    }
    
    // Clone template
    cloneTemplate(id, newName) {
        const original = this.getTemplate(id);
        if (!original) {
            throw new Error(`Template ${id} not found`);
        }
        
        const clonedId = this.generateTemplateId();
        const clonedTemplate = {
            ...original,
            id: clonedId,
            name: newName || `${original.name} (Copy)`,
            isCustom: true,
            clonedFrom: id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.addTemplate(clonedId, clonedTemplate);
        return clonedTemplate;
    }
    
    // Validate template structure
    validateTemplate(template) {
        const errors = [];
        
        if (!template.name || typeof template.name !== 'string') {
            errors.push('Template name is required and must be a string');
        }
        
        if (!template.description || typeof template.description !== 'string') {
            errors.push('Template description is required and must be a string');
        }
        
        if (!template.category || typeof template.category !== 'string') {
            errors.push('Template category is required and must be a string');
        }
        
        if (!Array.isArray(template.requirements)) {
            errors.push('Template requirements must be an array');
        } else {
            template.requirements.forEach((req, index) => {
                if (!req.name || typeof req.name !== 'string') {
                    errors.push(`Requirement ${index + 1}: name is required`);
                }
                if (!req.description || typeof req.description !== 'string') {
                    errors.push(`Requirement ${index + 1}: description is required`);
                }
                if (!req.category || typeof req.category !== 'string') {
                    errors.push(`Requirement ${index + 1}: category is required`);
                }
                if (!req.priority || !['low', 'medium', 'high'].includes(req.priority)) {
                    errors.push(`Requirement ${index + 1}: priority must be low, medium, or high`);
                }
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    // Export template to JSON
    exportTemplate(id) {
        const template = this.getTemplate(id);
        if (!template) {
            throw new Error(`Template ${id} not found`);
        }
        
        return JSON.stringify(template, null, 2);
    }
    
    // Import template from JSON
    importTemplate(templateJson) {
        try {
            const template = JSON.parse(templateJson);
            const validation = this.validateTemplate(template);
            
            if (!validation.isValid) {
                throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
            }
            
            // Generate new ID to avoid conflicts
            const newId = this.generateTemplateId();
            template.id = newId;
            template.isCustom = true;
            template.createdAt = new Date().toISOString();
            template.updatedAt = new Date().toISOString();
            
            this.addTemplate(newId, template);
            return template;
        } catch (error) {
            throw new Error(`Failed to import template: ${error.message}`);
        }
    }
    
    // Get template statistics
    getStatistics() {
        const templates = this.getAllTemplates();
        const categories = this.getCategories();
        
        const stats = {
            total: templates.length,
            custom: templates.filter(t => t.isCustom).length,
            builtIn: templates.filter(t => !t.isCustom).length,
            categories: categories.length,
            categoryBreakdown: {},
            averageRequirements: 0
        };
        
        // Calculate category breakdown
        categories.forEach(category => {
            stats.categoryBreakdown[category] = templates.filter(t => t.category === category).length;
        });
        
        // Calculate average requirements per template
        if (templates.length > 0) {
            const totalRequirements = templates.reduce((sum, template) => {
                return sum + (template.requirements?.length || 0);
            }, 0);
            stats.averageRequirements = Math.round(totalRequirements / templates.length);
        }
        
        return stats;
    }
    
    // Get template requirements summary
    getTemplateRequirementsSummary(templateId) {
        const template = this.getTemplate(templateId);
        if (!template || !template.requirements) {
            return null;
        }
        
        const summary = {
            total: template.requirements.length,
            byPriority: {
                high: 0,
                medium: 0,
                low: 0
            },
            byCategory: {},
            averageDueDays: 0
        };
        
        template.requirements.forEach(req => {
            // Count by priority
            if (summary.byPriority[req.priority]) {
                summary.byPriority[req.priority]++;
            }
            
            // Count by category
            if (!summary.byCategory[req.category]) {
                summary.byCategory[req.category] = 0;
            }
            summary.byCategory[req.category]++;
        });
        
        // Calculate average due days
        const dueDays = template.requirements
            .filter(req => req.dueDays)
            .map(req => req.dueDays);
        
        if (dueDays.length > 0) {
            summary.averageDueDays = Math.round(dueDays.reduce((a, b) => a + b, 0) / dueDays.length);
        }
        
        return summary;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ComplianceTemplates };
} else {
    window.ComplianceTemplates = ComplianceTemplates;
}