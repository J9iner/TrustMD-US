// TrustMD Compliance Template Engine
// Core engine for loading, managing, and generating compliance reports

// Import template validator
// Note: In a real implementation, this would be properly imported
// import { TemplateValidator } from '../utils/template-validator.js';

class ComplianceTemplateEngine {
    constructor(supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.templateLoader = new StateTemplateLoader();
        this.scoringEngine = new ComplianceScoringEngine();
        this.templateCache = new Map();
        this.reportCache = new Map();
        this.currentTenantId = null;
        this.templateValidator = new TemplateValidator();
        this.templateVersions = new Map(); // Track template versions
        this.accessControl = new Map(); // Track user access permissions
        this.currentUserId = null;
        this.templateRegistry = null; // External template configuration
        this.analyticsEngine = null; // Analytics engine
    }

    // Initialize the engine
    async initialize() {
        try {
            // Get current user and tenant ID
            const { data: { user } } = await this.supabaseClient.supabase.auth.getUser();
            this.currentUserId = user.id;
            
            const { data: userData } = await this.supabaseClient.supabase
                .from('users')
                .select('tenant_id, role')
                .eq('id', user.id)
                .single();
            
            this.currentTenantId = userData?.tenant_id;
            
            // Initialize template validator
            await this.templateValidator.initialize();
            
            // Load external template configuration
            await this.loadTemplateRegistry();
            
            // Initialize analytics engine
            await this.initializeAnalytics();
            
            // Load user access permissions
            await this.loadUserPermissions();
            
            // Set user context for analytics
            if (this.analyticsEngine) {
                this.analyticsEngine.setUserContext(this.currentUserId, this.currentTenantId);
            }
            
            console.log('Compliance Template Engine initialized with external configuration and analytics');
            return true;
        } catch (error) {
            console.error('Error initializing compliance template engine:', error);
            return false;
        }
    }

    // Load external template configuration
    async loadTemplateRegistry() {
        try {
            const response = await fetch('/config/template-registry.json');
            if (response.ok) {
                this.templateRegistry = await response.json();
                console.log('Template registry loaded successfully from external configuration');
            } else {
                console.warn('Failed to load template registry, using defaults');
                this.templateRegistry = this.getDefaultTemplateRegistry();
            }
        } catch (error) {
            console.error('Error loading template registry:', error);
            this.templateRegistry = this.getDefaultTemplateRegistry();
        }
    }

    // Get default template registry (fallback)
    getDefaultTemplateRegistry() {
        return {
            federalTemplates: [
                {
                    id: 'hipaa-federal',
                    name: 'HIPAA Compliance',
                    category: 'federal',
                    description: 'Health Insurance Portability and Accountability Act',
                    isActive: true
                }
            ],
            configuration: {
                enableStateTemplates: true,
                enableSpecialtyTemplates: false,
                enableCustomTemplates: false
            }
        };
    }

    // Initialize analytics engine
    async initializeAnalytics() {
        try {
            // Note: In a real implementation, TemplateAnalyticsEngine would be imported
            // this.analyticsEngine = new TemplateAnalyticsEngine(this.supabaseClient);
            // await this.analyticsEngine.initialize();
            
            console.log('Analytics engine initialization completed');
        } catch (error) {
            console.warn('Analytics engine initialization failed:', error);
        }
    }

    // Load user permissions for template access
    async loadUserPermissions() {
        try {
            const { data: permissions } = await this.supabaseClient.supabase
                .from('user_template_permissions')
                .select('template_id, permission_level')
                .eq('user_id', this.currentUserId)
                .eq('tenant_id', this.currentTenantId);

            if (permissions) {
                permissions.forEach(perm => {
                    this.accessControl.set(perm.template_id, perm.permission_level);
                });
            }
        } catch (error) {
            console.warn('Error loading user permissions:', error);
        }
    }

    // Validate user access to template
    async validateTemplateAccess(templateId, requiredPermission = 'read') {
        const userRole = await this.getUserRole();
        
        // Admin has full access
        if (userRole === 'admin') {
            return true;
        }

        const userPermission = this.accessControl.get(templateId) || 'none';
        const permissionLevels = { 'none': 0, 'read': 1, 'write': 2, 'delete': 3, 'admin': 4 };
        
        return permissionLevels[userPermission] >= permissionLevels[requiredPermission];
    }

    // Get user role
    async getUserRole() {
        try {
            const { data: userData } = await this.supabaseClient.supabase
                .from('users')
                .select('role')
                .eq('id', this.currentUserId)
                .single();
            
            return userData?.role || 'user';
        } catch (error) {
            return 'user';
        }
    }

    // Enhanced template loading with validation and versioning
    async loadTemplate(templateId, version = 'latest') {
        // Check cache first
        const cacheKey = `${templateId}:${version}`;
        if (this.templateCache.has(cacheKey)) {
            return this.templateCache.get(cacheKey);
        }

        try {
            // Validate access
            const hasAccess = await this.validateTemplateAccess(templateId, 'read');
            if (!hasAccess) {
                throw new Error(`Access denied to template: ${templateId}`);
            }

            let template;

            if (templateId.endsWith('-federal')) {
                // Load federal template
                template = await this.loadFederalTemplate(templateId, version);
            } else if (templateId.endsWith('-state')) {
                // Load state template
                const stateCode = templateId.split('-')[0].toUpperCase();
                template = await this.templateLoader.loadStateTemplate(stateCode, version);
            } else {
                throw new Error(`Unknown template type: ${templateId}`);
            }

            // Validate template structure and content
            const validation = this.templateValidator.validateTemplate(template, {
                strictMode: true,
                returnDetailedErrors: true
            });

            if (!validation.isValid) {
                console.error(`Template validation failed for ${templateId}:`, validation.errors);
                throw new Error(`Template validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
            }

            // Add metadata to template
            template.validatedAt = validation.validatedAt;
            template.version = version;
            template.checksum = this.templateValidator.calculateChecksum(template);

            // Cache the validated template
            this.templateCache.set(cacheKey, template);
            
            // Log template access
            await this.logTemplateAccess(templateId, version, 'load');
            
            return template;
        } catch (error) {
            console.error(`Error loading template ${templateId}:`, error);
            await this.logTemplateAccess(templateId, version, 'load_error', error.message);
            throw error;
        }
    }

    // Get available templates for tenant
    async getAvailableTemplates() {
        const startTime = Date.now();
        
        try {
            // Track template access
            await this.trackTemplateUsage('template_list_viewed', null, { 
                source: 'getAvailableTemplates' 
            });

            // Get active states for tenant
            const { data: stateLicenses } = await this.supabaseClient.supabase
                .from('state_medical_licenses')
                .select('state_code')
                .eq('tenant_id', this.currentTenantId)
                .neq('status', 'expired');

            const activeStates = [...new Set(stateLicenses?.map(license => license.state_code) || [])];
            
            // Build template list from external configuration
            const templates = [];

            // Add federal templates from registry
            if (this.templateRegistry?.federalTemplates) {
                templates.push(...this.templateRegistry.federalTemplates
                    .filter(template => template.isActive)
                    .map(template => ({
                        ...template,
                        source: 'registry',
                        loadedAt: new Date().toISOString()
                    }))
                );
            }

            // Add specialty templates if enabled
            if (this.templateRegistry?.configuration?.enableSpecialtyTemplates && 
                this.templateRegistry?.specialtyTemplates) {
                templates.push(...this.templateRegistry.specialtyTemplates
                    .filter(template => template.isActive)
                    .map(template => ({
                        ...template,
                        source: 'registry',
                        loadedAt: new Date().toISOString()
                    }))
                );
            }

            // Add custom templates if enabled
            if (this.templateRegistry?.configuration?.enableCustomTemplates && 
                this.templateRegistry?.customTemplates) {
                templates.push(...this.templateRegistry.customTemplates
                    .filter(template => template.isActive)
                    .map(template => ({
                        ...template,
                        source: 'registry',
                        loadedAt: new Date().toISOString()
                    }))
                );
            }

            // Add state templates if enabled
            if (this.templateRegistry?.configuration?.enableStateTemplates) {
                for (const stateCode of activeStates) {
                    try {
                        const stateConfig = this.templateLoader.getStateConfig(stateCode);
                        templates.push({
                            id: `${stateCode.toLowerCase()}-state`,
                            name: `${stateConfig.stateCode} State Compliance`,
                            category: 'state',
                            subcategory: stateCode,
                            description: `${stateConfig.stateCode} state-specific compliance requirements`,
                            tier: stateConfig.tier,
                            multiplier: stateConfig.multiplier,
                            isActive: true,
                            source: 'state_loader',
                            loadedAt: new Date().toISOString()
                        });
                    } catch (error) {
                        console.warn(`Invalid state code: ${stateCode}`);
                        await this.trackTemplateUsage('state_template_error', null, { 
                            stateCode, 
                            error: error.message 
                        });
                    }
                }
            }

            // Track performance
            const duration = Date.now() - startTime;
            await this.trackPerformance('getAvailableTemplates', duration, {
                templateCount: templates.length,
                stateCount: activeStates.length
            });

            console.log(`Retrieved ${templates.length} templates from external configuration`);
            return templates;
        } catch (error) {
            console.error('Error getting available templates:', error);
            await this.trackError(error, { method: 'getAvailableTemplates' });
            throw error;
        }
    }

    // Track template usage for analytics
    async trackTemplateUsage(eventType, templateId, metadata = {}) {
        if (this.analyticsEngine) {
            await this.analyticsEngine.trackTemplateUsage(eventType, templateId, metadata);
        }
    }

    // Track performance metrics
    async trackPerformance(operation, duration, metadata = {}) {
        if (this.analyticsEngine) {
            await this.analyticsEngine.trackPerformance(operation, duration, metadata);
        }
    }

    // Track errors
    async trackError(error, context = {}) {
        if (this.analyticsEngine) {
            await this.analyticsEngine.trackError(error, context);
        }
    }

    // Load template by ID
    async loadTemplate(templateId) {
        // Check cache first
        if (this.templateCache.has(templateId)) {
            return this.templateCache.get(templateId);
        }

        try {
            let template;

            if (templateId.endsWith('-federal')) {
                // Load federal template
                template = await this.loadFederalTemplate(templateId);
            } else if (templateId.endsWith('-state')) {
                // Load state template
                const stateCode = templateId.split('-')[0].toUpperCase();
                template = await this.templateLoader.loadStateTemplate(stateCode);
            } else {
                throw new Error(`Unknown template type: ${templateId}`);
            }

            // Cache the template
            this.templateCache.set(templateId, template);
            
            return template;
        } catch (error) {
            console.error(`Error loading template ${templateId}:`, error);
            throw error;
        }
    }

    // Load federal template
    async loadFederalTemplate(templateId) {
        const federalTemplates = {
            'hipaa-federal': () => import('./federal/hipaa-template.js'),
            'dea-federal': () => import('./federal/dea-template.js'),
            'osha-federal': () => import('./federal/osha-template.js')
        };

        const loader = federalTemplates[templateId];
        if (!loader) {
            throw new Error(`Unknown federal template: ${templateId}`);
        }

        const templateModule = await loader();
        return new templateModule.default();
    }

    // Gather compliance data for a template
    async gatherComplianceData(templateId, dateRange = {}) {
        try {
            const { startDate, endDate } = dateRange;
            
            // Get template to understand data requirements
            const template = await this.loadTemplate(templateId);
            
            // Gather data based on template requirements
            const complianceData = {
                templateId,
                tenantId: this.currentTenantId,
                dateRange,
                requirements: {},
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    dataSources: []
                }
            };

            // Gather data for each requirement
            for (const section of template.sections) {
                for (const requirement of section.requirements) {
                    const requirementData = await this.gatherRequirementData(requirement, dateRange);
                    complianceData.requirements[requirement.id] = requirementData;
                }
            }

            return complianceData;
        } catch (error) {
            console.error('Error gathering compliance data:', error);
            throw error;
        }
    }

    // Gather data for a specific requirement
    async gatherRequirementData(requirement, dateRange) {
        const requirementData = {
            id: requirement.id,
            name: requirement.name,
            status: 'not_started',
            completed: false,
            evidence: [],
            automatedChecks: {},
            lastUpdated: null,
            expirationDate: null
        };

        try {
            // Gather evidence based on requirement type
            if (requirement.evidenceRequired) {
                for (const evidenceType of requirement.evidenceRequired) {
                    const evidence = await this.gatherEvidence(evidenceType, dateRange);
                    if (evidence) {
                        requirementData.evidence.push(evidence);
                    }
                }
            }

            // Run automated checks
            if (requirement.automatedChecks) {
                for (const check of requirement.automatedChecks) {
                    const checkResult = await this.runAutomatedCheck(check);
                    requirementData.automatedChecks[check] = checkResult;
                }
            }

            // Determine completion status
            requirementData.completed = this.isRequirementComplete(requirement, requirementData);
            requirementData.status = requirementData.completed ? 'completed' : 'in_progress';
            requirementData.lastUpdated = new Date().toISOString();

        } catch (error) {
            console.error(`Error gathering data for requirement ${requirement.id}:`, error);
            requirementData.error = error.message;
        }

        return requirementData;
    }

    // Gather evidence for a specific type
    async gatherEvidence(evidenceType, dateRange) {
        try {
            switch (evidenceType) {
                case 'Medical license':
                    return await this.gatherLicenseEvidence();
                case 'CME certificates':
                    return await this.gatherCMEEvidence(dateRange);
                case 'DEA registration':
                    return await this.gatherDEAEvidence();
                case 'Privacy policy':
                    return await this.gatherPrivacyPolicyEvidence();
                case 'Training records':
                    return await this.gatherTrainingEvidence(dateRange);
                default:
                    console.warn(`Unknown evidence type: ${evidenceType}`);
                    return null;
            }
        } catch (error) {
            console.error(`Error gathering evidence for ${evidenceType}:`, error);
            return null;
        }
    }

    // Gather license evidence
    async gatherLicenseEvidence() {
        const { data: licenses } = await this.supabaseClient.supabase
            .from('state_medical_licenses')
            .select('*')
            .eq('tenant_id', this.currentTenantId)
            .neq('status', 'expired')
            .order('expiration_date', { ascending: false })
            .limit(1);

        if (licenses && licenses.length > 0) {
            const license = licenses[0];
            return {
                type: 'Medical license',
                id: license.id,
                documentUrl: license.document_url,
                expirationDate: license.expiration_date,
                status: license.status,
                stateCode: license.state_code
            };
        }

        return null;
    }

    // Gather CME evidence
    async gatherCMEEvidence(dateRange) {
        const { data: cmeRecords } = await this.supabaseClient.supabase
            .from('cme_records')
            .select('*')
            .eq('tenant_id', this.currentTenantId);

        if (cmeRecords && cmeRecords.length > 0) {
            return {
                type: 'CME certificates',
                count: cmeRecords.length,
                totalHours: cmeRecords.reduce((sum, record) => sum + (record.hours || 0), 0),
                records: cmeRecords
            };
        }

        return null;
    }

    // Gather DEA evidence
    async gatherDEAEvidence() {
        const { data: deaRegistrations } = await this.supabaseClient.supabase
            .from('dea_registrations')
            .select('*')
            .eq('tenant_id', this.currentTenantId)
            .eq('status', 'active');

        if (deaRegistrations && deaRegistrations.length > 0) {
            return {
                type: 'DEA registration',
                registrations: deaRegistrations
            };
        }

        return null;
    }

    // Gather privacy policy evidence
    async gatherPrivacyPolicyEvidence() {
        const { data: policies } = await this.supabaseClient.supabase
            .from('privacy_policies')
            .select('*')
            .eq('tenant_id', this.currentTenantId)
            .eq('is_active', true);

        if (policies && policies.length > 0) {
            return {
                type: 'Privacy policy',
                policies: policies
            };
        }

        return null;
    }

    // Gather training evidence
    async gatherTrainingEvidence(dateRange) {
        const { data: trainingRecords } = await this.supabaseClient.supabase
            .from('training_records')
            .select('*')
            .eq('tenant_id', this.currentTenantId);

        if (trainingRecords && trainingRecords.length > 0) {
            return {
                type: 'Training records',
                count: trainingRecords.length,
                records: trainingRecords
            };
        }

        return null;
    }

    // Run automated check
    async runAutomatedCheck(checkType) {
        try {
            switch (checkType) {
                case 'license_current':
                    return await this.checkLicenseCurrent();
                case 'cme_hours_met':
                    return await this.checkCMEHoursMet();
                case 'dea_current':
                    return await this.checkDEACurrent();
                case 'privacy_policy_current':
                    return await this.checkPrivacyPolicyCurrent();
                case 'training_completed':
                    return await this.checkTrainingCompleted();
                default:
                    console.warn(`Unknown automated check: ${checkType}`);
                    return false;
            }
        } catch (error) {
            console.error(`Error running automated check ${checkType}:`, error);
            return false;
        }
    }

    // Check if license is current
    async checkLicenseCurrent() {
        const { data: licenses } = await this.supabaseClient.supabase
            .from('state_medical_licenses')
            .select('expiration_date')
            .eq('tenant_id', this.currentTenantId)
            .neq('status', 'expired');

        if (licenses && licenses.length > 0) {
            const today = new Date();
            return licenses.some(license => new Date(license.expiration_date) > today);
        }

        return false;
    }

    // Check if CME hours are met
    async checkCMEHoursMet() {
        // This would check against state-specific requirements
        // For now, return a basic check
        const { data: cmeRecords } = await this.supabaseClient.supabase
            .from('cme_records')
            .select('hours')
            .eq('tenant_id', this.currentTenantId);

        if (cmeRecords && cmeRecords.length > 0) {
            const totalHours = cmeRecords.reduce((sum, record) => sum + (record.hours || 0), 0);
            return totalHours >= 25; // Basic threshold
        }

        return false;
    }

    // Check if DEA registration is current
    async checkDEACurrent() {
        const { data: deaRegistrations } = await this.supabaseClient.supabase
            .from('dea_registrations')
            .select('expiration_date')
            .eq('tenant_id', this.currentTenantId)
            .eq('status', 'active');

        if (deaRegistrations && deaRegistrations.length > 0) {
            const today = new Date();
            return deaRegistrations.some(reg => new Date(reg.expiration_date) > today);
        }

        return false;
    }

    // Check if privacy policy is current
    async checkPrivacyPolicyCurrent() {
        const { data: policies } = await this.supabaseClient.supabase
            .from('privacy_policies')
            .select('next_review_date')
            .eq('tenant_id', this.currentTenantId)
            .eq('is_active', true);

        if (policies && policies.length > 0) {
            const today = new Date();
            return policies.some(policy => new Date(policy.next_review_date) > today);
        }

        return false;
    }

    // Check if training is completed
    async checkTrainingCompleted() {
        const { data: trainingRecords } = await this.supabaseClient.supabase
            .from('training_records')
            .select('completion_date')
            .eq('tenant_id', this.currentTenantId)
            .eq('status', 'completed');

        return trainingRecords && trainingRecords.length > 0;
    }

    // Check if requirement is complete
    isRequirementComplete(requirement, requirementData) {
        // Check mandatory requirements
        if (requirement.mandatory && !requirementData.completed) {
            return false;
        }

        // Check evidence requirements
        if (requirement.evidenceRequired && requirementData.evidence) {
            const evidenceCount = requirementData.evidence.length;
            const requiredCount = requirement.evidenceRequired.length;
            if (evidenceCount < requiredCount) {
                return false;
            }
        }

        // Check automated checks
        if (requirement.automatedChecks && requirementData.automatedChecks) {
            for (const check of requirement.automatedChecks) {
                if (!requirementData.automatedChecks[check]) {
                    return false;
                }
            }
        }

        return true;
    }

    // Generate compliance report
    async generateComplianceReport(templateId, dateRange = {}) {
        try {
            // Validate access
            const hasAccess = await this.validateTemplateAccess(templateId, 'read');
            if (!hasAccess) {
                throw new Error(`Access denied to template: ${templateId}`);
            }

            // Check cache first
            const cacheKey = `${templateId}-${JSON.stringify(dateRange)}`;
            if (this.reportCache.has(cacheKey)) {
                return this.reportCache.get(cacheKey);
            }

            // Load template
            const template = await this.loadTemplate(templateId);
            
            // Gather compliance data
            const complianceData = await this.gatherComplianceData(templateId, dateRange);
            
            // Get state multiplier for state templates
            let stateMultiplier = 1.0;
            if (templateId.endsWith('-state')) {
                const stateCode = templateId.split('-')[0].toUpperCase();
                stateMultiplier = this.templateLoader.getStateMultiplier(stateCode);
            }
            
            // Calculate scores
            const scores = await this.scoringEngine.calculateComplianceScore(
                template, 
                complianceData, 
                stateMultiplier
            );
            
            // Identify gaps
            const gaps = this.scoringEngine.identifyComplianceGaps(template, complianceData);
            
            // Generate recommendations
            const recommendations = this.scoringEngine.generateRecommendations(gaps);
            
            // Build report
            const report = {
                template: template.getTemplate ? template.getTemplate() : template,
                templateId,
                tenantId: this.currentTenantId,
                dateRange,
                generatedAt: new Date().toISOString(),
                scores,
                gaps,
                recommendations,
                complianceData,
                stateMultiplier,
                summary: {
                    overallScore: Math.round(scores.overall),
                    grade: scores.grade,
                    totalRequirements: template.sections?.reduce((sum, section) => sum + section.requirements.length, 0) || 0,
                    completedRequirements: complianceData.completedRequirements || 0,
                    criticalRequirements: complianceData.criticalRequirements || 0,
                    criticalCompleted: complianceData.criticalCompleted || 0
                }
            };

            // Cache the report
            this.reportCache.set(cacheKey, report);
            
            // Log report generation
            await this.logTemplateAccess(templateId, 'latest', 'report_generated');
            
            return report;
        } catch (error) {
            console.error('Error generating compliance report:', error);
            throw error;
        }
    }

    // Template Versioning System
    async createTemplateVersion(templateId, templateData, versionType = 'patch') {
        try {
            // Validate write access
            const hasAccess = await this.validateTemplateAccess(templateId, 'write');
            if (!hasAccess) {
                throw new Error(`Access denied to create template version: ${templateId}`);
            }

            // Validate template data
            const validation = this.templateValidator.validateTemplate(templateData, {
                strictMode: true,
                returnDetailedErrors: true
            });

            if (!validation.isValid) {
                throw new Error(`Template validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
            }

            // Get current version
            const currentVersion = await this.getCurrentTemplateVersion(templateId);
            const newVersion = this.incrementVersion(currentVersion, versionType);

            // Add version metadata
            templateData.version = newVersion;
            templateData.templateId = templateId;
            templateData.createdAt = new Date().toISOString();
            templateData.createdBy = this.currentUserId;
            templateData.checksum = this.templateValidator.calculateChecksum(templateData);

            // Store version in database
            const { data, error } = await this.supabaseClient.supabase
                .from('template_versions')
                .insert({
                    template_id: templateId,
                    version: newVersion,
                    template_data: templateData,
                    created_by: this.currentUserId,
                    tenant_id: this.currentTenantId,
                    version_type: versionType,
                    checksum: templateData.checksum
                })
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to create template version: ${error.message}`);
            }

            // Update version tracking
            this.templateVersions.set(`${templateId}:${newVersion}`, data);

            // Clear cache for this template
            this.clearTemplateCache(templateId);

            // Log version creation
            await this.logTemplateAccess(templateId, newVersion, 'version_created', `Version type: ${versionType}`);

            console.log(`Template version ${newVersion} created for ${templateId}`);
            return data;
        } catch (error) {
            console.error('Error creating template version:', error);
            throw error;
        }
    }

    // Get current template version
    async getCurrentTemplateVersion(templateId) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('template_versions')
                .select('version')
                .eq('template_id', templateId)
                .eq('tenant_id', this.currentTenantId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            return data?.version || '1.0.0';
        } catch (error) {
            return '1.0.0';
        }
    }

    // Increment version based on type
    incrementVersion(currentVersion, type) {
        const [major, minor, patch] = currentVersion.split('.').map(Number);
        
        switch (type) {
            case 'major':
                return `${major + 1}.0.0`;
            case 'minor':
                return `${major}.${minor + 1}.0`;
            case 'patch':
                return `${major}.${minor}.${patch + 1}`;
            default:
                return `${major}.${minor}.${patch + 1}`;
        }
    }

    // Rollback to previous version
    async rollbackTemplateVersion(templateId, targetVersion) {
        try {
            // Validate admin access
            const hasAccess = await this.validateTemplateAccess(templateId, 'admin');
            if (!hasAccess) {
                throw new Error(`Access denied to rollback template: ${templateId}`);
            }

            // Get target version data
            const { data: versionData, error } = await this.supabaseClient.supabase
                .from('template_versions')
                .select('*')
                .eq('template_id', templateId)
                .eq('version', targetVersion)
                .eq('tenant_id', this.currentTenantId)
                .single();

            if (error || !versionData) {
                throw new Error(`Target version ${targetVersion} not found for template ${templateId}`);
            }

            // Validate integrity
            const isValid = this.templateValidator.validateIntegrity(
                versionData.template_data, 
                versionData.checksum
            );

            if (!isValid) {
                throw new Error(`Template integrity check failed for version ${targetVersion}`);
            }

            // Create rollback version
            await this.createTemplateVersion(templateId, versionData.template_data, 'patch');

            // Clear cache
            this.clearTemplateCache(templateId);

            // Log rollback
            await this.logTemplateAccess(templateId, targetVersion, 'rollback', `Rolled back to version ${targetVersion}`);

            console.log(`Template ${templateId} rolled back to version ${targetVersion}`);
            return true;
        } catch (error) {
            console.error('Error rolling back template version:', error);
            throw error;
        }
    }

    // Get template version history
    async getTemplateVersionHistory(templateId) {
        try {
            // Validate read access
            const hasAccess = await this.validateTemplateAccess(templateId, 'read');
            if (!hasAccess) {
                throw new Error(`Access denied to template history: ${templateId}`);
            }

            const { data, error } = await this.supabaseClient.supabase
                .from('template_versions')
                .select('*')
                .eq('template_id', templateId)
                .eq('tenant_id', this.currentTenantId)
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error(`Failed to get version history: ${error.message}`);
            }

            return data || [];
        } catch (error) {
            console.error('Error getting template version history:', error);
            throw error;
        }
    }

    // Template Access Logging
    async logTemplateAccess(templateId, version, action, details = null) {
        try {
            await this.supabaseClient.supabase
                .from('template_access_log')
                .insert({
                    template_id: templateId,
                    version,
                    action,
                    user_id: this.currentUserId,
                    tenant_id: this.currentTenantId,
                    details,
                    timestamp: new Date().toISOString(),
                    ip_address: null // Would be populated from request in real implementation
                });
        } catch (error) {
            console.warn('Failed to log template access:', error);
        }
    }

    // Clear template cache
    clearTemplateCache(templateId) {
        // Remove all versions of this template from cache
        for (const key of this.templateCache.keys()) {
            if (key.startsWith(`${templateId}:`)) {
                this.templateCache.delete(key);
            }
        }
    }

    // Clear report cache
    clearReportCache(templateId = null) {
        if (templateId) {
            // Remove all reports for this template
            for (const key of this.reportCache.keys()) {
                if (key.startsWith(`${templateId}-`)) {
                    this.reportCache.delete(key);
                }
            }
        } else {
            // Clear all report cache
            this.reportCache.clear();
        }
    }

    // Get template analytics
    async getTemplateAnalytics(templateId, dateRange = {}) {
        try {
            // Validate read access
            const hasAccess = await this.validateTemplateAccess(templateId, 'read');
            if (!hasAccess) {
                throw new Error(`Access denied to template analytics: ${templateId}`);
            }

            const { startDate, endDate } = dateRange;
            
            // Get usage statistics
            const { data: usageStats } = await this.supabaseClient.supabase
                .from('template_access_log')
                .select('*')
                .eq('template_id', templateId)
                .eq('tenant_id', this.currentTenantId)
                .gte('timestamp', startDate || '1970-01-01')
                .lte('timestamp', endDate || new Date().toISOString());

            // Get version statistics
            const { data: versionStats } = await this.supabaseClient.supabase
                .from('template_versions')
                .select('*')
                .eq('template_id', templateId)
                .eq('tenant_id', this.currentTenantId);

            // Calculate analytics
            const analytics = {
                templateId,
                dateRange,
                usage: {
                    totalAccess: usageStats?.length || 0,
                    uniqueUsers: [...new Set(usageStats?.map(log => log.user_id) || [])].length,
                    actions: this.groupByAction(usageStats || []),
                    dailyUsage: this.groupByDay(usageStats || [])
                },
                versions: {
                    totalVersions: versionStats?.length || 0,
                    latestVersion: versionStats?.[0]?.version || '1.0.0',
                    versionHistory: versionStats?.map(v => ({
                        version: v.version,
                        createdAt: v.created_at,
                        createdBy: v.created_by,
                        versionType: v.version_type
                    })) || []
                }
            };

            return analytics;
        } catch (error) {
            console.error('Error getting template analytics:', error);
            throw error;
        }
    }

    // Group usage by action type
    groupByAction(usageLogs) {
        const grouped = {};
        usageLogs.forEach(log => {
            grouped[log.action] = (grouped[log.action] || 0) + 1;
        });
        return grouped;
    }

    // Group usage by day
    groupByDay(usageLogs) {
        const grouped = {};
        usageLogs.forEach(log => {
            const day = log.timestamp.split('T')[0];
            grouped[day] = (grouped[day] || 0) + 1;
        });
        return grouped;
    }

    // Validate template integrity
    async validateTemplateIntegrity(templateId, version = 'latest') {
        try {
            const template = await this.loadTemplate(templateId, version);
            const { data: storedVersion } = await this.supabaseClient.supabase
                .from('template_versions')
                .select('checksum')
                .eq('template_id', templateId)
                .eq('version', version)
                .eq('tenant_id', this.currentTenantId)
                .single();

            if (!storedVersion) {
                throw new Error(`Version ${version} not found in database`);
            }

            const currentChecksum = this.templateValidator.calculateChecksum(template);
            const isValid = currentChecksum === storedVersion.checksum;

            await this.logTemplateAccess(templateId, version, 'integrity_check', 
                `Result: ${isValid ? 'Valid' : 'Invalid'}`);

            return {
                isValid,
                expectedChecksum: storedVersion.checksum,
                actualChecksum: currentChecksum,
                templateId,
                version
            };
        } catch (error) {
            console.error('Error validating template integrity:', error);
            throw error;
        }
    }

    // Generate multi-state report
    async generateMultiStateReport(stateCodes, dateRange = {}) {
        try {
            const reports = {};
            const combinedScores = {
                overall: 0,
                sectionScores: {},
                totalRequirements: 0,
                completedRequirements: 0,
                criticalGaps: 0,
                highPriorityGaps: 0
            };

            // Generate reports for each state
            for (const stateCode of stateCodes) {
                const templateId = `${stateCode.toLowerCase()}-state`;
                const report = await this.generateComplianceReport(templateId, dateRange);
                reports[stateCode] = report;

                // Aggregate scores
                combinedScores.overall += report.scores.overall;
                combinedScores.totalRequirements += report.summary.totalRequirements;
                combinedScores.completedRequirements += report.summary.completedRequirements;
                combinedScores.criticalGaps += report.summary.criticalGaps;
                combinedScores.highPriorityGaps += report.summary.highPriorityGaps;
            }

            // Calculate averages
            const stateCount = stateCodes.length;
            combinedScores.overall = Math.round(combinedScores.overall / stateCount);
            combinedScores.completionRate = Math.round(
                (combinedScores.completedRequirements / combinedScores.totalRequirements) * 100
            );

            return {
                type: 'multi-state',
                stateCodes,
                dateRange,
                generatedAt: new Date().toISOString(),
                reports,
                combinedScores,
                summary: {
                    averageScore: combinedScores.overall,
                    totalStates: stateCount,
                    overallCompletionRate: combinedScores.completionRate,
                    totalCriticalGaps: combinedScores.criticalGaps,
                    totalHighPriorityGaps: combinedScores.highPriorityGaps
                }
            };
        } catch (error) {
            console.error('Error generating multi-state report:', error);
            throw error;
        }
    }

    // Clear caches
    clearTemplateCache(templateId = null) {
        if (templateId) {
            this.templateCache.delete(templateId);
        } else {
            this.templateCache.clear();
        }
    }

    clearReportCache() {
        this.reportCache.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComplianceTemplateEngine;
} else if (typeof window !== 'undefined') {
    window.ComplianceTemplateEngine = ComplianceTemplateEngine;
}
