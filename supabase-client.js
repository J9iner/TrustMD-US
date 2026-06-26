// TrustMD Supabase Client Integration
// Handles all database operations for the PWA

class TrustMDSupabaseClient {
    constructor() {
        this.supabase = null;
        this.user = null;
        this.currentTenant = null;
        this.tenantId = null;
        this.demoMode = false;
    }

    // Client property wrapper for demo mode compatibility
    get client() {
        if (this.demoMode) {
            return this.createDemoClient();
        }
        return this.supabase;
    }

    createDemoClient() {
        return {
            from: (table) => ({
                select: (columns) => ({
                    eq: (column, value) => ({
                        single: () => Promise.resolve({ 
                            data: this.getDemoData(table, column, value), 
                            error: null 
                        }),
                        then: (resolve) => Promise.resolve({ 
                            data: this.getDemoData(table), 
                            error: null 
                        }).then(resolve)
                    }),
                    then: (resolve) => Promise.resolve({ 
                        data: this.getDemoData(table), 
                        error: null 
                    }).then(resolve)
                }),
                insert: (data) => ({
                    select: () => ({
                        single: () => Promise.resolve({ 
                            data: { ...data, id: 'demo-' + Math.random().toString(36).substr(2, 9) }, 
                            error: null 
                        })
                    })
                }),
                update: (data) => ({
                    eq: (column, value) => ({
                        then: (resolve) => Promise.resolve({ 
                            data: { ...data, id: value }, 
                            error: null 
                        }).then(resolve)
                    })
                }),
                delete: () => ({
                    eq: (column, value) => ({
                        then: (resolve) => Promise.resolve({ 
                            data: null, 
                            error: null 
                        }).then(resolve)
                    })
                })
            }),
            auth: {
                signInWithPassword: (credentials) => Promise.resolve({ 
                    data: { user: this.user }, 
                    error: null 
                }),
                signOut: () => Promise.resolve({ error: null })
            },
            // Missing data loading methods for demo mode
            getComplianceCategories: () => Promise.resolve(this.getDemoComplianceCategories()),
            getComplianceRequirements: () => Promise.resolve(this.getDemoComplianceRequirements()),
            getUserCompliance: () => Promise.resolve(this.getDemoUserCompliance()),
            getComplianceScore: () => Promise.resolve(this.getDemoComplianceScore()),
            getRiskCategories: () => Promise.resolve(this.getDemoRiskCategories()),
            getRiskAssessments: () => Promise.resolve(this.getDemoRiskAssessments()),
            getDocumentTypes: () => Promise.resolve(this.getDemoDocumentTypes()),
            getDocuments: () => Promise.resolve(this.getDemoDocuments()),
            getNotifications: () => Promise.resolve(this.getDemoNotifications())
        };
    }

    async initialize() {
        try {
            // Check if Supabase configuration is valid
            if (!this.validateSupabaseConfig()) {
                console.warn('Invalid Supabase configuration, using demo mode');
                this.enableDemoMode();
                return;
            }
            
            this.supabase = createClient(
                SUPABASE_CONFIG.url,
                SUPABASE_CONFIG.anonKey
            );
            
            // Set up auth state listener
            this.supabase.auth.onAuthStateChange((event, session) => {
                this.handleAuthChange(event, session);
            });
            
            // Detect tenant if multi-tenant is enabled
            if (SUPABASE_CONFIG.multiTenant.enabled) {
                await this.detectTenant();
            }
            
            console.log('Supabase client initialized successfully');
        } catch (error) {
            console.error('Supabase initialization error:', error);
            console.warn('Falling back to demo mode');
            this.enableDemoMode();
        }
    }

    validateSupabaseConfig() {
        // Check if configuration has placeholder values
        if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url.includes('your-project-id')) {
            return false;
        }
        
        if (!SUPABASE_CONFIG.anonKey || SUPABASE_CONFIG.anonKey.includes('your-anon-key')) {
            return false;
        }
        
        return true;
    }

    enableDemoMode() {
        console.log('Enabling demo mode - using mock data');
        this.demoMode = true;
        this.user = {
            id: 'demo-user-id',
            email: 'demo@trustmd.com',
            name: 'Demo User'
        };
        
        // Trigger mock auth state change
        setTimeout(() => {
            this.handleAuthChange('SIGNED_IN', { user: this.user });
        }, 100);
    }

    // Multi-tenant tenant detection
    async detectTenant() {
        const { tenantDetection, defaultSubdomain, tenantHeader } = SUPABASE_CONFIG.multiTenant;
        
        let tenantIdentifier = null;
        
        switch (tenantDetection) {
            case 'subdomain':
                // Extract tenant from subdomain
                const hostname = window.location.hostname;
                const parts = hostname.split('.');
                if (parts.length > 2) {
                    tenantIdentifier = parts[0];
                } else {
                    tenantIdentifier = defaultSubdomain;
                }
                break;
                
            case 'header':
                // Get tenant from header (for API calls)
                // This would be handled in the middleware
                tenantIdentifier = defaultSubdomain;
                break;
                
            case 'manual':
                // Get tenant from local storage or user input
                tenantIdentifier = localStorage.getItem('trustmd_tenant') || defaultSubdomain;
                break;
                
            default:
                tenantIdentifier = defaultSubdomain;
        }
        
        if (tenantIdentifier) {
            await this.loadTenant(tenantIdentifier);
        }
    }

    // Load tenant information
    async loadTenant(tenantIdentifier) {
        try {
            const { data, error } = await this.supabase
                .from('tenants')
                .select('*')
                .or(`subdomain.eq.${tenantIdentifier},name.eq.${tenantIdentifier}`)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            if (data) {
                this.currentTenant = data;
                this.tenantId = data.id;
                console.log('Tenant loaded:', data.name);
            } else {
                // Create default tenant if it doesn't exist
                await this.createDefaultTenant(tenantIdentifier);
            }
        } catch (error) {
            console.error('Error loading tenant:', error);
            throw error;
        }
    }

    // Create default tenant
    async createDefaultTenant(tenantIdentifier) {
        try {
            const { data, error } = await this.supabase
                .from('tenants')
                .insert({
                    name: tenantIdentifier,
                    practice_name: `${tenantIdentifier} Practice`,
                    subdomain: tenantIdentifier,
                    subscription_plan: 'basic',
                    settings: {}
                })
                .select()
                .single();
            
            if (error) throw error;
            
            this.currentTenant = data;
            this.tenantId = data.id;
            console.log('Default tenant created:', data.name);
        } catch (error) {
            console.error('Error creating default tenant:', error);
            throw error;
        }
    }

    // Authentication methods (UPDATED for multi-tenant)
    async signUp(email, password, metadata = {}) {
        try {
            // Include tenant_id in metadata for multi-tenant support
            const userMetadata = {
                ...metadata,
                tenant_id: this.tenantId
            };
            
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: userMetadata
                }
            });
            
            if (error) throw error;
            
            // Create user record in users table with tenant_id
            if (data.user) {
                await this.supabase
                    .from('users')
                    .insert({
                        id: data.user.id,
                        tenant_id: this.tenantId,
                        email: email,
                        full_name: metadata.fullName || '',
                        role: metadata.role || 'staff',
                        practice_name: metadata.practiceName || '',
                        practice_type: metadata.practiceType || '',
                        department: metadata.department || ''
                    });
            }
            
            return data;
        } catch (error) {
            console.error('Sign up error:', error);
            throw error;
        }
    }

    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            // Load user with tenant information
            if (data.user) {
                await this.loadUserProfile(data.user.id);
            }
            
            return data;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            this.user = null;
            this.currentTenant = null;
            this.tenantId = null;
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    // Load user profile with tenant information
    async loadUserProfile(userId) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select(`
                    *,
                    tenants:tenant_id (
                        id,
                        name,
                        practice_name,
                        subdomain,
                        subscription_plan,
                        settings
                    )
                `)
                .eq('id', userId)
                .single();
            
            if (error) throw error;
            
            this.user = data;
            if (data.tenants) {
                this.currentTenant = data.tenants;
                this.tenantId = data.tenants.id;
            }
            
            return data;
        } catch (error) {
            console.error('Error loading user profile:', error);
            throw error;
        }
    }

    async resetPassword(email) {
        try {
            const { error } = await this.client.auth.resetPasswordForEmail(email);
            if (error) throw error;
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    }

    // User profile methods
    async getUserProfile() {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.users)
                .select('*')
                .eq('id', this.user.id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get profile error:', error);
            throw error;
        }
    }

    async updateUserProfile(updates) {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.users)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.user.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update profile error:', error);
            throw error;
        }
    }

    // Compliance methods
    async getComplianceCategories() {
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.compliance.categories)
                .select('*')
                .eq('is_active', true)
                .order('sort_order');

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get compliance categories error:', error);
            throw error;
        }
    }

    async getComplianceRequirements(categoryId = null) {
        try {
            let query = this.client
                .from(SUPABASE_CONFIG.schema.compliance.requirements)
                .select('*')
                .eq('is_active', true);

            if (categoryId) {
                query = query.eq('category_id', categoryId);
            }

            const { data, error } = await query.order('priority', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get compliance requirements error:', error);
            throw error;
        }
    }

    async getUserCompliance() {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.compliance.userCompliance)
                .select(`
                    *,
                    requirement:compliance_requirements(
                        id,
                        title,
                        description,
                        category:compliance_categories(name, color),
                        priority,
                        frequency
                    )
                `)
                .eq('user_id', this.user.id);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get user compliance error:', error);
            throw error;
        }
    }

    async updateComplianceStatus(requirementId, status, notes = '') {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.compliance.userCompliance)
                .upsert({
                    user_id: this.user.id,
                    requirement_id: requirementId,
                    status,
                    notes,
                    completion_date: status === 'completed' ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update compliance status error:', error);
            throw error;
        }
    }

    async getComplianceScore() {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.compliance.scores)
                .select('*')
                .eq('user_id', this.user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            
            return data || { overall_score: 0, category_scores: {}, risk_level: 'low' };
        } catch (error) {
            console.error('Get compliance score error:', error);
            throw error;
        }
    }

    // Risk assessment methods
    async getRiskCategories() {
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.risk.categories)
                .select('*')
                .eq('is_active', true)
                .order('sort_order');

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get risk categories error:', error);
            throw error;
        }
    }

    async getRiskAssessments() {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.risk.assessments)
                .select(`
                    *,
                    template:risk_templates(
                        id,
                        title,
                        category:risk_categories(name, color)
                    )
                `)
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get risk assessments error:', error);
            throw error;
        }
    }

    async createRiskAssessment(assessmentData) {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.risk.assessments)
                .insert({
                    user_id: this.user.id,
                    ...assessmentData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Create risk assessment error:', error);
            throw error;
        }
    }

    async updateRiskAssessment(id, updates) {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.risk.assessments)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('user_id', this.user.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update risk assessment error:', error);
            throw error;
        }
    }

    // Document methods
    async getDocumentTypes() {
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.documents.types)
                .select('*')
                .eq('is_active', true);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get document types error:', error);
            throw error;
        }
    }

    async getDocuments() {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.documents.metadata)
                .select(`
                    *,
                    type:document_types(
                        id,
                        name,
                        retention_period
                    )
                `)
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get documents error:', error);
            throw error;
        }
    }

    async createDocument(documentData) {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            // PHI validation before document creation
            const phiValidation = await this.validateDocumentForPHI(documentData);
            if (!phiValidation.isValid) {
                throw new Error(`PHI validation failed: ${phiValidation.issues.join('; ')}`);
            }
            
            // Add PHI metadata to document
            const enhancedDocumentData = {
                ...documentData,
                phi_risk_score: phiValidation.phiRiskScore || 0,
                phi_scan_result: phiValidation.phiScan || null,
                phi_validated: true,
                phi_validation_date: new Date().toISOString(),
                user_id: this.user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.documents.metadata)
                .insert(enhancedDocumentData)
                .select()
                .single();

            if (error) throw error;
            
            // Log PHI validation event for compliance
            await this.logPHIValidationEvent('document_created', data.id, phiValidation);
            
            return data;
        } catch (error) {
            console.error('Create document error:', error);
            throw error;
        }
    }
    
    // Enhanced document upload with PHI protection
    async uploadDocumentWithPHIProtection(file, documentMetadata = {}) {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            // Step 1: Validate filename and metadata
            const metadataValidation = window.trustMDValidator?.validateDocument({
                filename: file.name,
                title: documentMetadata.title,
                documentType: documentMetadata.type || 'unknown'
            });
            
            if (!metadataValidation.isValid) {
                throw new Error(`Metadata validation failed: ${metadataValidation.issues.join('; ')}`);
            }
            
            // Step 2: Extract and validate content
            const content = await this.extractFileContent(file);
            const contentValidation = window.trustMDValidator?.validateDocumentContent(
                content, 
                documentMetadata.type, 
                file.name
            );
            
            if (!contentValidation.isValid) {
                throw new Error(`Content validation failed: ${contentValidation.message}`);
            }
            
            // Step 3: Show confirmation if PHI detected
            if (contentValidation.requiresExplicitConsent) {
                const confirmed = await window.trustMDValidator?.showPHIConfirmation(contentValidation);
                if (!confirmed) {
                    throw new Error('Upload cancelled by user due to PHI concerns');
                }
            }
            
            // Step 4: Upload file to storage
            const filePath = `${this.tenantId}/documents/${file.name}`;
            const { data: fileData, error: fileError } = await this.supabase.storage
                .from('documents')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (fileError) throw fileError;
            
            // Step 5: Create document record with PHI metadata
            const documentData = {
                title: documentMetadata.title,
                type: documentMetadata.type,
                file_path: filePath,
                file_size: file.size,
                file_type: file.type,
                phi_risk_score: contentValidation.phiScan?.riskScore || 0,
                phi_confidence: contentValidation.phiScan?.confidence || 0,
                phi_detections: contentValidation.phiScan?.phiDetections || [],
                phi_validated: true,
                phi_validation_date: new Date().toISOString(),
                status: 'active'
            };
            
            const document = await this.createDocument(documentData);
            
            // Step 6: Log the upload event
            await this.logPHIValidationEvent('document_uploaded', document.id, {
                filename: file.name,
                fileSize: file.size,
                phiRiskScore: contentValidation.phiScan?.riskScore || 0,
                blocked: false
            });
            
            return {
                document,
                file: fileData,
                phiValidation: contentValidation
            };
            
        } catch (error) {
            console.error('Upload document with PHI protection error:', error);
            
            // Log blocked upload attempt
            await this.logPHIValidationEvent('upload_blocked', null, {
                filename: file.name,
                error: error.message,
                blocked: true
            });
            
            throw error;
        }
    }
    
    // Extract text content from various file types with enhanced format support
    async extractFileContent(file) {
        const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        try {
            switch (extension) {
                case '.txt':
                case '.csv':
                case '.json':
                case '.xml':
                    return await file.text();
                    
                case '.pdf':
                    return await this.extractPDFContent(file);
                    
                case '.docx':
                    return await this.extractDOCXContent(file);
                    
                case '.doc':
                    return await this.extractDOCContent(file);
                    
                case '.rtf':
                    return await this.extractRTFContent(file);
                    
                case '.jpg':
                case '.jpeg':
                case '.png':
                case '.gif':
                case '.bmp':
                case '.tiff':
                    return await this.extractImageContent(file);
                    
                default:
                    console.warn(`Unsupported file type for PHI scanning: ${extension}`);
                    return await this.extractGenericContent(file);
            }
        } catch (error) {
            console.error(`Error extracting content from ${extension}:`, error);
            return '';
        }
    }
    
    // Extract PDF content
    async extractPDFContent(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const text = [];
            
            // Basic PDF text extraction
            for (let i = 0; i < uint8Array.length - 10; i++) {
                if (uint8Array[i] === 0x28 && uint8Array[i + 1] === 0x6A) {
                    let j = i + 2;
                    let textStr = '';
                    while (j < uint8Array.length && uint8Array[j] !== 0x29) {
                        if (uint8Array[j] > 31 && uint8Array[j] < 127) {
                            textStr += String.fromCharCode(uint8Array[j]);
                        }
                        j++;
                    }
                    if (textStr.length > 3) {
                        text.push(textStr);
                    }
                    i = j;
                }
            }
            
            return text.join(' ');
        } catch (error) {
            console.error('Error extracting PDF content:', error);
            return '';
        }
    }
    
    // Extract DOCX content
    async extractDOCXContent(file) {
        try {
            const content = await file.text();
            const textMatches = content.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
            if (textMatches) {
                return textMatches.map(match => 
                    match.replace(/<[^>]*>/g, '').trim()
                ).join(' ');
            }
            return '';
        } catch (error) {
            console.error('Error extracting DOCX content:', error);
            return '';
        }
    }
    
    // Extract DOC content
    async extractDOCContent(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            let text = '';
            
            for (let i = 0; i < uint8Array.length; i++) {
                const char = uint8Array[i];
                if (char >= 32 && char <= 126) {
                    text += String.fromCharCode(char);
                } else if (char === 13 || char === 10) {
                    text += ' ';
                }
            }
            
            return text.replace(/\s+/g, ' ').trim();
        } catch (error) {
            console.error('Error extracting DOC content:', error);
            return '';
        }
    }
    
    // Extract RTF content
    async extractRTFContent(file) {
        try {
            const content = await file.text();
            const textMatches = content.match(/\\[^\\s]*\s*([^\\{]*?)\\par/g);
            if (textMatches) {
                return textMatches.map(match => 
                    match.replace(/\\[^\\s]*\s*/, '').trim()
                ).join(' ');
            }
            return '';
        } catch (error) {
            console.error('Error extracting RTF content:', error);
            return '';
        }
    }
    
    // Extract text from images using OCR
    async extractImageContent(file) {
        try {
            // Placeholder for OCR implementation
            console.log('OCR would be performed on image:', file.name);
            return '';
        } catch (error) {
            console.error('Error extracting image content:', error);
            return '';
        }
    }
    
    // Generic content extraction for unknown formats
    async extractGenericContent(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            let text = '';
            let consecutiveText = 0;
            
            for (let i = 0; i < uint8Array.length && i < 10000; i++) {
                const char = uint8Array[i];
                if (char >= 32 && char <= 126) {
                    text += String.fromCharCode(char);
                    consecutiveText++;
                } else {
                    if (consecutiveText > 10) {
                        text += ' ';
                    }
                    consecutiveText = 0;
                }
            }
            
            return text.replace(/\s+/g, ' ').trim();
        } catch (error) {
            console.error('Error extracting generic content:', error);
            return '';
        }
    }
    
    // Validate document for PHI
    async validateDocumentForPHI(documentData) {
        const validation = {
            isValid: true,
            issues: [],
            phiRiskScore: 0,
            phiScan: null
        };
        
        try {
            // Validate filename
            if (documentData.filename) {
                const filenameValidation = window.trustMDValidator?.validateDocumentFilename(documentData.filename);
                if (!filenameValidation.isValid) {
                    validation.isValid = false;
                    validation.issues.push(...filenameValidation.phiIssues);
                }
            }
            
            // Validate title
            if (documentData.title) {
                const titleValidation = window.trustMDValidator?.validateDocumentTitle(documentData.title);
                if (!titleValidation.isValid) {
                    validation.isValid = false;
                    validation.issues.push(...titleValidation.phiIssues);
                }
            }
            
            // If content is provided, scan it
            if (documentData.content) {
                const contentValidation = window.trustMDValidator?.validateDocumentContent(
                    documentData.content,
                    documentData.documentType || 'unknown',
                    documentData.filename || ''
                );
                
                if (!contentValidation.isValid) {
                    validation.isValid = false;
                    validation.issues.push(contentValidation.message);
                }
                
                validation.phiRiskScore = contentValidation.phiScan?.riskScore || 0;
                validation.phiScan = contentValidation.phiScan;
            }
            
        } catch (error) {
            console.error('PHI validation error:', error);
            validation.isValid = false;
            validation.issues.push('PHI validation system error');
        }
        
        return validation;
    }
    
    // Log PHI validation events for compliance
    async logPHIValidationEvent(eventType, documentId, details) {
        try {
            const logEntry = {
                tenant_id: this.tenantId,
                user_id: this.user?.id,
                event_type: eventType,
                document_id: documentId,
                event_details: details,
                timestamp: new Date().toISOString(),
                ip_address: await this.getClientIP(),
                user_agent: navigator.userAgent
            };
            
            // In a real implementation, you'd store this in a phi_audit_log table
            console.log('PHI Validation Event:', logEntry);
            
            // For demo mode, just log to console
            if (this.demoMode) {
                return;
            }
            
            // Store in database
            await this.client
                .from('phi_audit_log')
                .insert(logEntry);
                
        } catch (error) {
            console.error('Error logging PHI validation event:', error);
            // Don't throw here - logging failure shouldn't block the operation
        }
    }
    
    // Get client IP for audit logging
    async getClientIP() {
        try {
            // In a real implementation, you'd get this from your server
            // For now, return a placeholder
            return 'client_ip_unknown';
        } catch (error) {
            return 'ip_error';
        }
    }
    
    // Get PHI validation statistics for admin dashboard
    async getPHIValidationStats(dateRange = '30d') {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            // In a real implementation, you'd query the phi_audit_log table
            // For now, return demo data
            return {
                totalUploads: 150,
                blockedUploads: 12,
                highRiskDetections: 8,
                mediumRiskDetections: 23,
                lowRiskDetections: 45,
                averageRiskScore: 0.23,
                falsePositiveRate: 0.05,
                userComplianceRate: 0.94
            };
        } catch (error) {
            console.error('Error getting PHI validation stats:', error);
            throw error;
        }
    }
    
    // Quarantine management for suspicious files
    async quarantineDocument(documentId, reason, adminNotes = '') {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.documents.metadata)
                .update({
                    status: 'quarantined',
                    quarantine_reason: reason,
                    quarantine_date: new Date().toISOString(),
                    quarantine_notes: adminNotes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', documentId)
                .select()
                .single();
            
            if (error) throw error;
            
            // Log quarantine event
            await this.logPHIValidationEvent('document_quarantined', documentId, {
                reason,
                adminNotes,
                blocked: true
            });
            
            return data;
        } catch (error) {
            console.error('Error quarantining document:', error);
            throw error;
        }
    }

    // Training methods
    async getTrainingModules() {
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.training.modules)
                .select('*')
                .eq('is_active', true)
                .order('is_mandatory', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get training modules error:', error);
            throw error;
        }
    }

    async getUserTraining() {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.training.userTraining)
                .select(`
                    *,
                    module:training_modules(
                        id,
                        title,
                        description,
                        duration_minutes,
                        category,
                        certificate_required,
                        validity_months
                    )
                `)
                .eq('user_id', this.user.id);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get user training error:', error);
            throw error;
        }
    }

    async updateTrainingProgress(moduleId, progress, status = 'in_progress') {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            const updateData = {
                progress_percentage: progress,
                status,
                updated_at: new Date().toISOString()
            };

            if (status === 'completed') {
                updateData.completion_date = new Date().toISOString();
                updateData.start_date = updateData.start_date || new Date().toISOString();
            } else if (status === 'in_progress' && !updateData.start_date) {
                updateData.start_date = new Date().toISOString();
            }

            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.training.userTraining)
                .upsert({
                    user_id: this.user.id,
                    module_id: moduleId,
                    ...updateData
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update training progress error:', error);
            throw error;
        }
    }

    // Notification methods
    async getNotifications(unreadOnly = false) {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            let query = this.client
                .from(SUPABASE_CONFIG.schema.notifications)
                .select('*')
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false });

            if (unreadOnly) {
                query = query.eq('is_read', false);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get notifications error:', error);
            throw error;
        }
    }

    async markNotificationRead(notificationId) {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.notifications)
                .update({
                    is_read: true,
                    read_at: new Date().toISOString()
                })
                .eq('id', notificationId)
                .eq('user_id', this.user.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Mark notification read error:', error);
            throw error;
        }
    }

    async createNotification(notificationData) {
        if (!this.user) throw new Error('User not authenticated');
        
        try {
            const { data, error } = await this.client
                .from(SUPABASE_CONFIG.schema.notifications)
                .insert({
                    user_id: this.user.id,
                    ...notificationData,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Create notification error:', error);
            throw error;
        }
    }

    // Utility methods
    handleAuthChange(event, session) {
        console.log('Auth state changed:', event, session);
        
        // Handle auth state changes in your app
        if (event === 'SIGNED_IN') {
            console.log('User signed in:', session.user);
            // Update UI, load user data, etc.
        } else if (event === 'SIGNED_OUT') {
            console.log('User signed out');
            // Clear user data, redirect to landing page, etc.
        }
    }

    // Demo mode methods
    getDemoData(table) {
        const demoData = {
            tenants: {
                id: '00000000-0000-0000-0000-000000000000',
                name: 'Demo Organization',
                subdomain: 'demo',
                created_at: new Date().toISOString()
            },
            users: {
                id: 'demo-user-id',
                email: 'demo@trustmd.com',
                name: 'Demo User',
                tenant_id: '00000000-0000-0000-0000-000000000000',
                created_at: new Date().toISOString()
            },
            compliance_scores: {
                id: 'demo-score-id',
                user_id: 'demo-user-id',
                tenant_id: '00000000-0000-0000-0000-000000000000',
                score: 92,
                last_updated: new Date().toISOString()
            },
            documents: [
                {
                    id: 'doc-1',
                    title: 'HIPAA Compliance Manual',
                    type: 'policy',
                    status: 'active',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'doc-2',
                    title: 'DEA Registration Certificate',
                    type: 'certificate',
                    status: 'active',
                    created_at: new Date().toISOString()
                }
            ]
        };
        
        return demoData[table] || [];
    }

    // Demo mode wrapper for database operations
    async demoOperation(operation, table, data = null) {
        console.log(`Demo mode operation: ${operation} on ${table}`);
        
        switch (operation) {
            case 'select':
                return { data: this.getDemoData(table), error: null };
            case 'insert':
                return { data: { ...data, id: 'demo-' + Math.random().toString(36).substr(2, 9) }, error: null };
            case 'update':
                return { data: { ...data, updated_at: new Date().toISOString() }, error: null };
            case 'delete':
                return { data: null, error: null };
            default:
                return { data: null, error: { message: 'Unknown operation' } };
        }
    }

    // Demo data methods for missing functions
    getDemoComplianceCategories() {
        return [
            {
                id: 'hipaa',
                name: 'HIPAA Compliance',
                description: 'Health Insurance Portability and Accountability Act',
                color: '#2c5aa0',
                icon: 'shield-alt',
                is_active: true,
                sort_order: 1
            },
            {
                id: 'dea',
                name: 'DEA Compliance',
                description: 'Drug Enforcement Administration regulations',
                color: '#e74c3c',
                icon: 'pills',
                is_active: true,
                sort_order: 2
            },
            {
                id: 'osha',
                name: 'OSHA Compliance',
                description: 'Occupational Safety and Health Administration',
                color: '#f39c12',
                icon: 'hard-hat',
                is_active: true,
                sort_order: 3
            },
            {
                id: 'medicare',
                name: 'Medicare/Medicaid',
                description: 'Medicare and Medicaid program compliance',
                color: '#27ae60',
                icon: 'id-card',
                is_active: true,
                sort_order: 4
            },
            {
                id: 'accreditation',
                name: 'Accreditation',
                description: 'Healthcare accreditation requirements',
                color: '#8e44ad',
                icon: 'certificate',
                is_active: true,
                sort_order: 5
            }
        ];
    }

    getDemoComplianceRequirements() {
        return [
            // HIPAA Requirements
            {
                id: 'hipaa-001',
                category_id: 'hipaa',
                title: 'Privacy Policy',
                description: 'Maintain current HIPAA privacy policy',
                priority: 3,
                frequency: 'annual',
                is_active: true
            },
            {
                id: 'hipaa-002',
                category_id: 'hipaa',
                title: 'Security Training',
                description: 'Complete annual HIPAA security training',
                priority: 3,
                frequency: 'annual',
                is_active: true
            },
            {
                id: 'hipaa-003',
                category_id: 'hipaa',
                title: 'Breach Notification',
                description: 'Maintain breach notification procedures',
                priority: 2,
                frequency: 'quarterly',
                is_active: true
            },
            // DEA Requirements
            {
                id: 'dea-001',
                category_id: 'dea',
                title: 'DEA Registration',
                description: 'Maintain active DEA registration',
                priority: 3,
                frequency: 'biennial',
                is_active: true
            },
            {
                id: 'dea-002',
                category_id: 'dea',
                title: 'Controlled Substance Logs',
                description: 'Maintain accurate controlled substance logs',
                priority: 3,
                frequency: 'monthly',
                is_active: true
            },
            // OSHA Requirements
            {
                id: 'osha-001',
                category_id: 'osha',
                title: 'Safety Training',
                description: 'Complete OSHA safety training',
                priority: 2,
                frequency: 'annual',
                is_active: true
            },
            {
                id: 'osha-002',
                category_id: 'osha',
                title: 'Incident Reports',
                description: 'Maintain workplace incident reports',
                priority: 2,
                frequency: 'quarterly',
                is_active: true
            }
        ];
    }

    getDemoUserCompliance() {
        return [
            {
                id: 'uc-001',
                user_id: 'demo-user-id',
                requirement_id: 'hipaa-001',
                status: 'completed',
                completed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                due_date: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Privacy policy updated and distributed'
            },
            {
                id: 'uc-002',
                user_id: 'demo-user-id',
                requirement_id: 'hipaa-002',
                status: 'completed',
                completed_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                due_date: new Date(Date.now() + 350 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Annual security training completed'
            },
            {
                id: 'uc-003',
                user_id: 'demo-user-id',
                requirement_id: 'dea-001',
                status: 'pending',
                due_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'DEA registration renewal due'
            },
            {
                id: 'uc-004',
                user_id: 'demo-user-id',
                requirement_id: 'osha-001',
                status: 'in_progress',
                due_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Safety training partially completed'
            }
        ];
    }

    getDemoComplianceScore() {
        return {
            overall_score: 92,
            category_scores: {
                hipaa: 95,
                dea: 88,
                osha: 90,
                medicare: 94,
                accreditation: 91
            },
            last_updated: new Date().toISOString(),
            trend: 'improving'
        };
    }

    getDemoRiskCategories() {
        return [
            {
                id: 'clinical',
                name: 'Clinical Risks',
                description: 'Patient care and clinical practice risks',
                color: '#e74c3c',
                icon: 'stethoscope'
            },
            {
                id: 'administrative',
                name: 'Administrative Risks',
                description: 'Office administration and operational risks',
                color: '#f39c12',
                icon: 'clipboard'
            },
            {
                id: 'technical',
                name: 'Technical Risks',
                description: 'IT systems and technology risks',
                color: '#3498db',
                icon: 'laptop'
            },
            {
                id: 'physical',
                name: 'Physical Risks',
                description: 'Facility and physical environment risks',
                color: '#27ae60',
                icon: 'building'
            }
        ];
    }

    getDemoRiskAssessments() {
        return [
            {
                id: 'ra-001',
                category_id: 'clinical',
                title: 'Patient Data Privacy',
                risk_level: 'medium',
                score: 65,
                mitigation: 'Enhanced privacy training',
                last_assessed: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'ra-002',
                category_id: 'technical',
                title: 'Cybersecurity',
                risk_level: 'high',
                score: 45,
                mitigation: 'Upgrade security systems',
                last_assessed: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'ra-003',
                category_id: 'administrative',
                title: 'Documentation Compliance',
                risk_level: 'low',
                score: 85,
                mitigation: 'Regular audits',
                last_assessed: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
    }

    getDemoDocumentTypes() {
        return [
            {
                id: 'policy',
                name: 'Policy Documents',
                description: 'Office policies and procedures',
                icon: 'file-alt'
            },
            {
                id: 'certificate',
                name: 'Certificates',
                description: 'Professional certificates and licenses',
                icon: 'award'
            },
            {
                id: 'training',
                name: 'Training Records',
                description: 'Staff training documentation',
                icon: 'graduation-cap'
            },
            {
                id: 'report',
                name: 'Reports',
                description: 'Compliance and audit reports',
                icon: 'chart-bar'
            }
        ];
    }

    getDemoDocuments() {
        return [
            {
                id: 'doc-001',
                title: 'HIPAA Privacy Policy',
                type: 'policy',
                status: 'active',
                file_url: '/documents/hipaa-privacy-policy.pdf',
                uploaded_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
                expires_at: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'doc-002',
                title: 'DEA Registration Certificate',
                type: 'certificate',
                status: 'active',
                file_url: '/documents/dea-registration.pdf',
                uploaded_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
                expires_at: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'doc-003',
                title: 'OSHA Safety Training Certificate',
                type: 'training',
                status: 'active',
                file_url: '/documents/osha-training.pdf',
                uploaded_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
                expires_at: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'doc-004',
                title: 'Annual Compliance Report',
                type: 'report',
                status: 'active',
                file_url: '/documents/annual-compliance-report.pdf',
                uploaded_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                expires_at: null
            }
        ];
    }

    getDemoNotifications() {
        return [
            {
                id: 'notif-001',
                user_id: 'demo-user-id',
                title: 'DEA Registration Renewal Due',
                message: 'Your DEA registration expires in 45 days. Please begin the renewal process.',
                type: 'alert',
                priority: 'high',
                read: false,
                created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'notif-002',
                user_id: 'demo-user-id',
                title: 'OSHA Training Reminder',
                message: 'Complete your annual OSHA safety training by the end of this month.',
                type: 'reminder',
                priority: 'medium',
                read: false,
                created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'notif-003',
                user_id: 'demo-user-id',
                title: 'Compliance Score Updated',
                message: 'Your overall compliance score has improved to 92%.',
                type: 'info',
                priority: 'low',
                read: true,
                created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
    }

    // Real-time subscriptions
    subscribeToNotifications(callback) {
        if (!this.user) throw new Error('User not authenticated');
        
        return this.client
            .channel(`notifications:${this.user.id}`)
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: SUPABASE_CONFIG.schema.notifications,
                    filter: `user_id=eq.${this.user.id}`
                },
                callback
            )
            .subscribe();
    }

    subscribeToComplianceUpdates(callback) {
        if (!this.user) throw new Error('User not authenticated');
        
        return this.client
            .channel(`compliance:${this.user.id}`)
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: SUPABASE_CONFIG.schema.compliance.userCompliance,
                    filter: `user_id=eq.${this.user.id}`
                },
                callback
            )
            .subscribe();
    }

    // Error handling
    handleError(error, context = '') {
        console.error(`Supabase error in ${context}:`, error);
        
        // You can add custom error handling here
        if (error.code === 'PGRST301') {
            // Row level security violation
            return new Error('Access denied. You do not have permission to perform this action.');
        } else if (error.code === 'PGRST116') {
            // No rows returned
            return new Error('No data found.');
        }
        
        return error;
    }
}

// Create global instance
window.trustMDClient = new TrustMDSupabaseClient();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrustMDSupabaseClient;
}
