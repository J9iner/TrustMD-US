// TrustMD Compliance Template Engine
// Core engine for managing and processing compliance templates

class ComplianceTemplateEngine {
    constructor(supabaseClient, tenantId) {
        this.supabaseClient = supabaseClient;
        this.tenantId = tenantId;
        this.templates = new Map();
        this.templateCache = new Map();
        this.processingQueue = [];
        this.isProcessing = false;
        
        // Template categories
        this.categories = {
            HIPAA: 'hipaa',
            OSHA: 'osha',
            DEA: 'dea',
            ACCREDITATION: 'accreditation',
            MEDICARE_MEDICAID: 'medicare_medicaid',
            STATE_SPECIFIC: 'state_specific'
        };
        
        this.initialize();
    }
    
    // Initialize the template engine
    async initialize() {
        try {
            console.log('Initializing Compliance Template Engine...');
            
            // Load all templates
            await this.loadAllTemplates();
            
            // Setup template processing
            this.setupProcessing();
            
            console.log('Compliance Template Engine initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Compliance Template Engine:', error);
            throw error;
        }
    }
    
    // Load all compliance templates from database
    async loadAllTemplates() {
        try {
            const { data: templates, error } = await this.supabaseClient
                .from('compliance_templates')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .eq('status', 'active');
            
            if (error) throw error;
            
            // Cache templates by category and ID
            for (const template of templates || []) {
                this.templates.set(template.id, template);
                
                if (!this.templateCache.has(template.category)) {
                    this.templateCache.set(template.category, new Map());
                }
                this.templateCache.get(template.category).set(template.id, template);
            }
            
            console.log(`Loaded ${templates?.length || 0} compliance templates`);
            return templates;
        } catch (error) {
            console.error('Failed to load compliance templates:', error);
            throw error;
        }
    }
    
    // Get template by ID
    getTemplate(templateId) {
        return this.templates.get(templateId);
    }
    
    // Get templates by category
    getTemplatesByCategory(category) {
        return this.templateCache.get(category) || new Map();
    }
    
    // Process compliance template for a specific entity
    async processTemplate(templateId, entityId, entityType, context = {}) {
        try {
            const template = this.getTemplate(templateId);
            if (!template) {
                throw new Error(`Template ${templateId} not found`);
            }
            
            // Add to processing queue
            const processingJob = {
                id: this.generateJobId(),
                templateId,
                entityId,
                entityType,
                context,
                status: 'pending',
                createdAt: new Date().toISOString()
            };
            
            this.processingQueue.push(processingJob);
            
            // Start processing if not already running
            if (!this.isProcessing) {
                this.processQueue();
            }
            
            return processingJob;
        } catch (error) {
            console.error('Failed to process template:', error);
            throw error;
        }
    }
    
    // Generate unique job ID
    generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Setup template processing system
    setupProcessing() {
        // Process templates in batches
        setInterval(() => {
            if (this.processingQueue.length > 0 && !this.isProcessing) {
                this.processQueue();
            }
        }, 1000);
    }
    
    // Process the template queue
    async processQueue() {
        if (this.isProcessing || this.processingQueue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            const batchSize = 5;
            const batch = this.processingQueue.splice(0, batchSize);
            
            await Promise.all(batch.map(job => this.processJob(job)));
            
            // Continue processing if more jobs exist
            if (this.processingQueue.length > 0) {
                setTimeout(() => this.processQueue(), 100);
            }
        } catch (error) {
            console.error('Error processing template queue:', error);
        } finally {
            this.isProcessing = false;
        }
    }
    
    // Process individual template job
    async processJob(job) {
        try {
            job.status = 'processing';
            job.startedAt = new Date().toISOString();
            
            const template = this.getTemplate(job.templateId);
            const result = await this.applyTemplate(template, job);
            
            job.status = 'completed';
            job.completedAt = new Date().toISOString();
            job.result = result;
            
            // Store result
            await this.storeTemplateResult(job);
            
            console.log(`Template processing completed for job ${job.id}`);
            return result;
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.failedAt = new Date().toISOString();
            
            console.error(`Template processing failed for job ${job.id}:`, error);
            throw error;
        }
    }
    
    // Apply template to entity
    async applyTemplate(template, job) {
        const { entityId, entityType, context } = job;
        
        // Process template variables
        const processedTemplate = this.processTemplateVariables(template, context);
        
        // Generate compliance requirements
        const requirements = this.generateRequirements(processedTemplate, entityType);
        
        // Create compliance checklist
        const checklist = this.generateChecklist(requirements);
        
        // Calculate compliance score
        const score = await this.calculateComplianceScore(checklist, entityId);
        
        return {
            templateId: template.id,
            templateName: template.name,
            entityId,
            entityType,
            requirements,
            checklist,
            complianceScore: score,
            processedAt: new Date().toISOString()
        };
    }
    
    // Process template variables
    processTemplateVariables(template, context) {
        let processed = { ...template };
        
        // Replace variables in template content
        if (template.content) {
            processed.content = this.replaceVariables(template.content, context);
        }
        
        if (template.requirements) {
            processed.requirements = template.requirements.map(req => ({
                ...req,
                description: this.replaceVariables(req.description, context),
                criteria: req.criteria?.map(criterion => ({
                    ...criterion,
                    description: this.replaceVariables(criterion.description, context)
                }))
            }));
        }
        
        return processed;
    }
    
    // Replace template variables with context values
    replaceVariables(text, context) {
        if (!text || typeof text !== 'string') {
            return text;
        }
        
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return context[key] || match;
        });
    }
    
    // Generate compliance requirements from template
    generateRequirements(template, entityType) {
        const requirements = template.requirements || [];
        
        return requirements.map(req => ({
            id: this.generateRequirementId(),
            templateId: template.id,
            name: req.name,
            description: req.description,
            category: req.category || template.category,
            priority: req.priority || 'medium',
            dueDate: this.calculateDueDate(req.dueDays),
            criteria: req.criteria || [],
            evidenceRequired: req.evidenceRequired || [],
            status: 'pending'
        }));
    }
    
    // Generate requirement ID
    generateRequirementId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Calculate due date from template
    calculateDueDate(daysFromNow) {
        if (!daysFromNow) return null;
        
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + parseInt(daysFromNow));
        return dueDate.toISOString();
    }
    
    // Generate compliance checklist
    generateChecklist(requirements) {
        return {
            id: this.generateChecklistId(),
            requirements: requirements.map(req => ({
                requirementId: req.id,
                completed: false,
                completedAt: null,
                notes: '',
                evidence: []
            })),
            totalItems: requirements.length,
            completedItems: 0,
            score: 0,
            lastUpdated: new Date().toISOString()
        };
    }
    
    // Generate checklist ID
    generateChecklistId() {
        return `checklist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Calculate compliance score
    async calculateComplianceScore(checklist, entityId) {
        const completedItems = checklist.requirements.filter(req => req.completed).length;
        const totalItems = checklist.requirements.length;
        
        if (totalItems === 0) {
            return { score: 0, level: 'unknown' };
        }
        
        const rawScore = (completedItems / totalItems) * 100;
        
        // Determine compliance level
        let level;
        if (rawScore >= 95) level = 'excellent';
        else if (rawScore >= 85) level = 'good';
        else if (rawScore >= 70) level = 'fair';
        else if (rawScore >= 50) level = 'poor';
        else level = 'critical';
        
        return {
            score: Math.round(rawScore),
            level,
            completedItems,
            totalItems,
            calculatedAt: new Date().toISOString()
        };
    }
    
    // Store template processing result
    async storeTemplateResult(job) {
        try {
            const { data, error } = await this.supabaseClient
                .from('template_processing_results')
                .insert({
                    tenant_id: this.tenantId,
                    job_id: job.id,
                    template_id: job.templateId,
                    entity_id: job.entityId,
                    entity_type: job.entityType,
                    status: job.status,
                    result: job.result,
                    error: job.error,
                    created_at: job.createdAt,
                    completed_at: job.completedAt
                });
            
            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error('Failed to store template result:', error);
            throw error;
        }
    }
    
    // Get processing status
    getProcessingStatus() {
        return {
            isProcessing: this.isProcessing,
            queueLength: this.processingQueue.length,
            totalTemplates: this.templates.size,
            categories: Array.from(this.templateCache.keys())
        };
    }
    
    // Create new template
    async createTemplate(templateData) {
        try {
            const { data, error } = await this.supabaseClient
                .from('compliance_templates')
                .insert({
                    tenant_id: this.tenantId,
                    ...templateData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            
            // Cache the new template
            this.templates.set(data.id, data);
            
            if (!this.templateCache.has(data.category)) {
                this.templateCache.set(data.category, new Map());
            }
            this.templateCache.get(data.category).set(data.id, data);
            
            return data;
        } catch (error) {
            console.error('Failed to create template:', error);
            throw error;
        }
    }
    
    // Update template
    async updateTemplate(templateId, updates) {
        try {
            const { data, error } = await this.supabaseClient
                .from('compliance_templates')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', templateId)
                .eq('tenant_id', this.tenantId)
                .select()
                .single();
            
            if (error) throw error;
            
            // Update cache
            this.templates.set(templateId, data);
            this.templateCache.get(data.category)?.set(templateId, data);
            
            return data;
        } catch (error) {
            console.error('Failed to update template:', error);
            throw error;
        }
    }
    
    // Delete template
    async deleteTemplate(templateId) {
        try {
            const { error } = await this.supabaseClient
                .from('compliance_templates')
                .update({ 
                    status: 'deleted',
                    updated_at: new Date().toISOString()
                })
                .eq('id', templateId)
                .eq('tenant_id', this.tenantId);
            
            if (error) throw error;
            
            // Remove from cache
            const template = this.templates.get(templateId);
            if (template) {
                this.templates.delete(templateId);
                this.templateCache.get(template.category)?.delete(templateId);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to delete template:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ComplianceTemplateEngine };
} else {
    window.ComplianceTemplateEngine = ComplianceTemplateEngine;
}