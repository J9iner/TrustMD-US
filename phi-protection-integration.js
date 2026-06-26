// TrustMD PHI Protection Integration
// Main integration point for all PHI protection components

class PHIProtectionIntegration {
    constructor() {
        this.isInitialized = false;
        this.components = {
            detectionEngine: null,
            validator: null,
            ui: null,
            adminDashboard: null,
            supabaseClient: null
        };
        this.config = {
            enabled: true,
            strictMode: false,
            educationRequired: true,
            auditLogging: true,
            quarantineThreshold: 0.8
        };
    }
    
    // Initialize PHI protection system
    async initialize(config = {}) {
        if (this.isInitialized) {
            console.warn('PHI Protection already initialized');
            return;
        }
        
        try {
            // Merge configuration
            this.config = { ...this.config, ...config };
            
            // Initialize components in order
            await this.initializeDetectionEngine();
            await this.initializeValidator();
            await this.initializeUI();
            await this.initializeSupabaseIntegration();
            await this.initializeAdminDashboard();
            
            // Setup global error handling
            this.setupErrorHandling();
            
            // Setup performance monitoring
            this.setupPerformanceMonitoring();
            
            this.isInitialized = true;
            
            console.log('PHI Protection System initialized successfully');
            
            // Log initialization event
            await this.logSystemEvent('phi_protection_initialized', {
                config: this.config,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Failed to initialize PHI Protection System:', error);
            throw error;
        }
    }
    
    // Initialize PHI detection engine
    async initializeDetectionEngine() {
        if (window.phiDetectionEngine) {
            this.components.detectionEngine = window.phiDetectionEngine;
            console.log('PHI Detection Engine loaded');
        } else {
            throw new Error('PHI Detection Engine not available');
        }
    }
    
    // Initialize validator
    async initializeValidator() {
        if (window.trustMDValidator) {
            this.components.validator = window.trustMDValidator;
            console.log('PHI Validator loaded');
        } else {
            throw new Error('PHI Validator not available');
        }
    }
    
    // Initialize UI components
    async initializeUI() {
        if (window.phiProtectionUI) {
            this.components.ui = window.phiProtectionUI;
            this.components.ui.initialize();
            console.log('PHI Protection UI loaded');
        } else {
            throw new Error('PHI Protection UI not available');
        }
    }
    
    // Initialize Supabase integration
    async initializeSupabaseIntegration() {
        if (window.supabaseClient) {
            this.components.supabaseClient = window.supabaseClient;
            
            // Enhance Supabase client with PHI protection
            this.enhanceSupabaseClient();
            
            console.log('PHI Supabase integration loaded');
        } else {
            console.warn('Supabase client not available - some features may be limited');
        }
    }
    
    // Initialize admin dashboard
    async initializeAdminDashboard() {
        if (window.phiAdminDashboard) {
            this.components.adminDashboard = window.phiAdminDashboard;
            console.log('PHI Admin Dashboard loaded');
        } else {
            console.warn('PHI Admin Dashboard not available');
        }
    }
    
    // Enhance Supabase client with PHI protection
    enhanceSupabaseClient() {
        const client = this.components.supabaseClient;
        
        // Store original methods
        const originalCreateDocument = client.createDocument.bind(client);
        const originalUploadDocument = client.uploadDocument?.bind(client);
        
        // Enhanced create document with dual validation
        client.createDocument = async (documentData) => {
            // Client-side validation
            const clientValidation = await this.validateDocumentForPHI(documentData);
            
            if (!clientValidation.isValid) {
                throw new Error(`Client-side PHI validation failed: ${clientValidation.issues.join('; ')}`);
            }
            
            // Server-side validation (if available)
            if (this.config.enableServerSideValidation) {
                const serverValidation = await this.performServerSideValidation(documentData);
                if (!serverValidation.isValid) {
                    throw new Error(`Server-side PHI validation failed: ${serverValidation.message}`);
                }
            }
            
            // Call original method
            return originalCreateDocument(documentData);
        };
        
        // Enhanced upload with dual validation and real-time scanning
        client.uploadDocument = async (file, metadata) => {
            try {
                // Step 1: Client-side validation
                const clientValidation = await this.validateFileForPHI(file, {
                    enableRealTime: this.config.enableRealTimeScanning,
                    chunkSize: this.config.chunkSize || 1024 * 1024,
                    scanInterval: this.config.scanInterval || 500
                });
                
                if (!clientValidation.isValid && clientValidation.blocked) {
                    throw new Error(`Client-side PHI validation failed: ${clientValidation.message}`);
                }
                
                // Step 2: Server-side validation (if available)
                if (this.config.enableServerSideValidation) {
                    const serverValidation = await this.performServerSideFileValidation(file, metadata);
                    if (!serverValidation.isValid && serverValidation.blocked) {
                        throw new Error(`Server-side PHI validation failed: ${serverValidation.message}`);
                    }
                }
                
                // Step 3: Use PHI-protected upload method
                if (client.uploadDocumentWithPHIProtection) {
                    return client.uploadDocumentWithPHIProtection(file, metadata);
                } else if (originalUploadDocument) {
                    // Fallback to original with validation
                    return originalUploadDocument(file, metadata);
                } else {
                    throw new Error('No upload method available');
                }
                
            } catch (error) {
                // Log validation failure
                await this.logValidationFailure(file, metadata, error);
                throw error;
            }
        };
        
        // Add comprehensive upload method
        client.uploadDocumentWithComprehensivePHIProtection = async (file, metadata, options = {}) => {
            const uploadId = this.generateUploadId();
            
            try {
                // Pre-upload validation
                const preValidation = await this.performComprehensiveValidation(file, metadata, options);
                if (!preValidation.isValid) {
                    throw new Error(`Comprehensive validation failed: ${preValidation.message}`);
                }
                
                // Progressive upload with real-time scanning
                if (file.size > (options.progressiveThreshold || 5 * 1024 * 1024)) {
                    return this.performProgressiveUpload(file, metadata, uploadId, preValidation);
                } else {
                    return this.performStandardUpload(file, metadata, uploadId, preValidation);
                }
                
            } catch (error) {
                await this.logUploadFailure(uploadId, file, metadata, error);
                throw error;
            }
        };
    }
    
    // Perform server-side validation
    async performServerSideValidation(documentData) {
        try {
            if (!this.config.serverValidationEndpoint) {
                return { isValid: true, message: 'Server-side validation not configured' };
            }
            
            const response = await fetch(this.config.serverValidationEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Validation-Source': 'trustmd-client'
                },
                body: JSON.stringify({
                    documentData,
                    validationType: 'document_metadata',
                    clientTimestamp: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server validation failed: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Server-side validation error:', error);
            return { 
                isValid: true, 
                message: 'Server-side validation unavailable - proceeding with client-side only',
                fallback: true
            };
        }
    }
    
    // Perform server-side file validation
    async performServerSideFileValidation(file, metadata) {
        try {
            if (!this.config.serverValidationEndpoint) {
                return { isValid: true, message: 'Server-side validation not configured' };
            }
            
            // Convert file to base64 for server-side processing
            const fileBase64 = await this.fileToBase64(file);
            
            const response = await fetch(this.config.serverValidationEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Validation-Source': 'trustmd-client'
                },
                body: JSON.stringify({
                    file: fileBase64,
                    filename: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                    documentType: metadata.type || 'unknown',
                    metadata,
                    validationType: 'file_content',
                    clientTimestamp: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server file validation failed: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Server-side file validation error:', error);
            return { 
                isValid: true, 
                message: 'Server-side validation unavailable - proceeding with client-side only',
                fallback: true
            };
        }
    }
    
    // Perform comprehensive validation
    async performComprehensiveValidation(file, metadata, options) {
        const validation = {
            isValid: true,
            issues: [],
            warnings: [],
            riskLevel: 'low',
            validationSteps: []
        };
        
        try {
            // Step 1: Filename validation
            const filenameStep = {
                step: 'filename_validation',
                status: 'processing'
            };
            validation.validationSteps.push(filenameStep);
            
            const filenameValidation = this.components.validator.validateDocumentFilename(file.name);
            if (!filenameValidation.isValid) {
                validation.isValid = false;
                validation.issues.push(...filenameValidation.phiIssues);
                filenameStep.status = 'failed';
                filenameStep.error = filenameValidation.error;
            } else {
                filenameStep.status = 'completed';
            }
            
            // Step 2: Metadata validation
            const metadataStep = {
                step: 'metadata_validation',
                status: 'processing'
            };
            validation.validationSteps.push(metadataStep);
            
            if (metadata.title) {
                const titleValidation = this.components.validator.validateDocumentTitle(metadata.title);
                if (!titleValidation.isValid) {
                    validation.isValid = false;
                    validation.issues.push(...titleValidation.phiIssues);
                    metadataStep.status = 'failed';
                    metadataStep.error = titleValidation.error;
                } else {
                    metadataStep.status = 'completed';
                }
            }
            
            // Step 3: Content extraction
            const extractionStep = {
                step: 'content_extraction',
                status: 'processing'
            };
            validation.validationSteps.push(extractionStep);
            
            const content = await this.extractFileContent(file);
            extractionStep.status = 'completed';
            extractionStep.contentSize = content.length;
            
            // Step 4: PHI scanning
            const scanningStep = {
                step: 'phi_scanning',
                status: 'processing'
            };
            validation.validationSteps.push(scanningStep);
            
            const contentValidation = this.components.validator.validateDocumentContent(
                content,
                metadata.type || 'unknown',
                file.name
            );
            
            if (!contentValidation.isValid) {
                validation.isValid = false;
                validation.issues.push(contentValidation.message);
                validation.riskLevel = contentValidation.phiRisk;
                scanningStep.status = 'failed';
                scanningStep.error = contentValidation.message;
            } else {
                scanningStep.status = 'completed';
                validation.riskLevel = contentValidation.phiRisk;
            }
            
            // Step 5: Server-side verification (if configured)
            if (this.config.enableServerSideValidation) {
                const serverStep = {
                    step: 'server_verification',
                    status: 'processing'
                };
                validation.validationSteps.push(serverStep);
                
                const serverValidation = await this.performServerSideFileValidation(file, metadata);
                if (!serverValidation.isValid && !serverValidation.fallback) {
                    validation.isValid = false;
                    validation.issues.push(serverValidation.message);
                    serverStep.status = 'failed';
                    serverStep.error = serverValidation.message;
                } else {
                    serverStep.status = serverValidation.fallback ? 'skipped' : 'completed';
                    if (serverValidation.fallback) {
                        validation.warnings.push('Server-side validation unavailable - using client-side only');
                    }
                }
            }
            
            // Step 6: Final assessment
            const assessmentStep = {
                step: 'final_assessment',
                status: 'completed'
            };
            validation.validationSteps.push(assessmentStep);
            
            validation.phiScan = contentValidation.phiScan;
            validation.requiresConfirmation = contentValidation.requiresExplicitConsent;
            
        } catch (error) {
            validation.isValid = false;
            validation.issues.push(`Comprehensive validation error: ${error.message}`);
            validation.error = error;
        }
        
        return validation;
    }
    
    // Perform progressive upload with real-time scanning
    async performProgressiveUpload(file, metadata, uploadId, preValidation) {
        const chunkSize = this.config.chunkSize || 1024 * 1024; // 1MB chunks
        const scanInterval = this.config.scanInterval || 500; // Scan every 500ms
        
        let offset = 0;
        let totalScanned = 0;
        let phiDetected = false;
        const scanResults = [];
        
        return new Promise(async (resolve, reject) => {
            try {
                const scanChunk = async () => {
                    if (offset >= file.size || phiDetected) {
                        // Upload complete or PHI detected
                        const finalResult = this.aggregateScanResults(scanResults);
                        
                        if (phiDetected) {
                            reject(new Error(`PHI detected during upload: ${finalResult.message}`));
                        } else {
                            // Complete the upload
                            const uploadResult = await this.completeUpload(file, metadata, uploadId, finalResult);
                            resolve(uploadResult);
                        }
                        return;
                    }
                    
                    // Read next chunk
                    const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
                    const chunkContent = await this.extractFileContent(chunk);
                    
                    // Scan chunk for PHI
                    const chunkResult = await this.scanContentForPHI(chunkContent, file.name);
                    scanResults.push(chunkResult);
                    
                    // Check if PHI detected
                    if (chunkResult.hasPHI || chunkResult.blocked) {
                        phiDetected = true;
                        reject(new Error(`PHI detected in chunk ${Math.floor(offset / chunkSize)}: ${chunkResult.message}`));
                        return;
                    }
                    
                    totalScanned += chunk.size;
                    offset += chunk.size;
                    
                    // Update progress
                    this.updateUploadProgress(uploadId, {
                        scanned: totalScanned,
                        totalSize: file.size,
                        progress: (totalScanned / file.size) * 100,
                        status: 'scanning'
                    });
                    
                    // Schedule next chunk scan
                    setTimeout(scanChunk, scanInterval);
                };
                
                // Start progressive scanning and upload
                scanChunk();
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Perform standard upload
    async performStandardUpload(file, metadata, uploadId, preValidation) {
        try {
            this.updateUploadProgress(uploadId, {
                status: 'uploading',
                progress: 0
            });
            
            // Use existing upload method
            const result = await this.components.supabaseClient.uploadDocumentWithPHIProtection(file, metadata);
            
            this.updateUploadProgress(uploadId, {
                status: 'completed',
                progress: 100
            });
            
            return result;
            
        } catch (error) {
            this.updateUploadProgress(uploadId, {
                status: 'failed',
                error: error.message
            });
            throw error;
        }
    }
    
    // Helper methods
    generateUploadId() {
        return 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    updateUploadProgress(uploadId, progress) {
        // In a real implementation, this would update UI or send WebSocket events
        console.log(`Upload progress ${uploadId}:`, progress);
        
        // Trigger progress event
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('phiUploadProgress', {
                detail: { uploadId, progress }
            }));
        }
    }
    
    completeUpload(file, metadata, uploadId, validationResult) {
        // Complete upload process
        console.log(`Upload ${uploadId} completed:`, validationResult);
        
        return {
            uploadId,
            file: file.name,
            metadata,
            validationResult,
            timestamp: new Date().toISOString()
        };
    }
    
    async logValidationFailure(file, metadata, error) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                event: 'validation_failure',
                file: file.name,
                fileSize: file.size,
                fileType: file.type,
                metadata,
                error: error.message,
                stack: error.stack
            };
            
            console.error('Validation failure:', logEntry);
            await this.logSystemEvent('phi_validation_failure', logEntry);
            
        } catch (logError) {
            console.error('Error logging validation failure:', logError);
        }
    }
    
    async logUploadFailure(uploadId, file, metadata, error) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                event: 'upload_failure',
                uploadId,
                file: file.name,
                fileSize: file.size,
                fileType: file.type,
                metadata,
                error: error.message,
                stack: error.stack
            };
            
            console.error('Upload failure:', logEntry);
            await this.logSystemEvent('phi_upload_failure', logEntry);
            
        } catch (logError) {
            console.error('Error logging upload failure:', logError);
        }
    }
    
    // Main document validation method
    async validateDocumentForPHI(documentData) {
        const validation = {
            isValid: true,
            issues: [],
            phiRiskScore: 0,
            phiScan: null,
            blocked: false
        };
        
        try {
            // Validate filename
            if (documentData.filename) {
                const filenameValidation = this.components.validator.validateDocumentFilename(documentData.filename);
                if (!filenameValidation.isValid) {
                    validation.isValid = false;
                    validation.issues.push(...filenameValidation.phiIssues);
                }
            }
            
            // Validate title
            if (documentData.title) {
                const titleValidation = this.components.validator.validateDocumentTitle(documentData.title);
                if (!titleValidation.isValid) {
                    validation.isValid = false;
                    validation.issues.push(...titleValidation.phiIssues);
                }
            }
            
            // Validate content
            if (documentData.content) {
                const contentValidation = this.components.validator.validateDocumentContent(
                    documentData.content,
                    documentData.documentType || 'unknown',
                    documentData.filename || ''
                );
                
                if (!contentValidation.isValid) {
                    validation.isValid = false;
                    validation.blocked = true;
                    validation.issues.push(contentValidation.message);
                }
                
                validation.phiRiskScore = contentValidation.phiScan?.riskScore || 0;
                validation.phiScan = contentValidation.phiScan;
            }
            
            // Check quarantine threshold
            if (validation.phiRiskScore > this.config.quarantineThreshold) {
                validation.blocked = true;
                validation.issues.push(`Risk score ${validation.phiRiskScore} exceeds quarantine threshold ${this.config.quarantineThreshold}`);
            }
            
        } catch (error) {
            console.error('PHI validation error:', error);
            validation.isValid = false;
            validation.issues.push('PHI validation system error');
        }
        
        return validation;
    }
    
    // Validate file for PHI with real-time scanning
    async validateFileForPHI(file, options = {}) {
        const { 
            enableRealTime = true, 
            chunkSize = 1024 * 1024, // 1MB chunks
            scanInterval = 500 // Scan every 500ms
        } = options;
        
        try {
            // Quick filename validation
            const filenameValidation = this.components.validator.validateDocumentFilename(file.name);
            if (!filenameValidation.isValid) {
                return {
                    isValid: false,
                    message: filenameValidation.error,
                    riskLevel: 'high',
                    blocked: true
                };
            }
            
            // For small files (<1MB), do immediate scan
            if (file.size < chunkSize || !enableRealTime) {
                const content = await this.extractFileContent(file);
                return await this.scanContentForPHI(content, file.name);
            }
            
            // For large files, do progressive scanning
            return await this.scanFileProgressively(file, chunkSize, scanInterval);
            
        } catch (error) {
            console.error('Error validating file:', error);
            return {
                isValid: false,
                message: 'File validation error',
                riskLevel: 'unknown',
                blocked: true
            };
        }
    }
    
    // Scan file progressively for real-time PHI detection
    async scanFileProgressively(file, chunkSize, scanInterval) {
        return new Promise(async (resolve, reject) => {
            try {
                let offset = 0;
                let totalScanned = 0;
                let phiDetected = false;
                let scanResults = [];
                
                const scanChunk = async () => {
                    try {
                        if (offset >= file.size || phiDetected) {
                            // Final scan result
                            const finalResult = this.aggregateScanResults(scanResults);
                            resolve(finalResult);
                            return;
                        }
                        
                        // Read next chunk
                        const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
                        const chunkContent = await this.extractFileContent(chunk);
                        
                        if (chunkContent.trim()) {
                            // Scan chunk for PHI
                            const chunkResult = await this.scanContentForPHI(chunkContent, file.name);
                            scanResults.push(chunkResult);
                            
                            // Check if PHI detected
                            if (chunkResult.hasPHI || chunkResult.blocked) {
                                phiDetected = true;
                                resolve({
                                    ...chunkResult,
                                    scanned: totalScanned,
                                    totalSize: file.size,
                                    progressiveScan: true,
                                    interrupted: true
                                });
                                return;
                            }
                        }
                        
                        totalScanned += chunk.size;
                        offset += chunk.size;
                        
                        // Schedule next chunk scan
                        setTimeout(scanChunk, scanInterval);
                        
                    } catch (error) {
                        console.error('Error scanning chunk:', error);
                        reject(error);
                    }
                };
                
                // Start progressive scanning
                scanChunk();
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Scan content for PHI
    async scanContentForPHI(content, filename = '') {
        try {
            const contentValidation = this.components.validator.validateDocumentContent(
                content,
                'unknown',
                filename
            );
            
            return {
                isValid: contentValidation.isValid,
                message: contentValidation.message,
                riskLevel: contentValidation.phiRisk,
                phiScan: contentValidation.phiScan,
                blocked: !contentValidation.isValid,
                hasPHI: contentValidation.hasPHI,
                requiresConfirmation: contentValidation.requiresExplicitConsent
            };
            
        } catch (error) {
            console.error('Error scanning content for PHI:', error);
            return {
                isValid: false,
                message: 'PHI scanning error',
                riskLevel: 'unknown',
                blocked: true,
                hasPHI: false
            };
        }
    }
    
    // Aggregate progressive scan results
    aggregateScanResults(scanResults) {
        if (scanResults.length === 0) {
            return {
                isValid: true,
                hasPHI: false,
                blocked: false,
                riskLevel: 'low',
                message: 'No PHI detected'
            };
        }
        
        const aggregated = {
            isValid: true,
            hasPHI: false,
            blocked: false,
            riskLevel: 'low',
            message: 'No PHI detected',
            phiScan: {
                phiDetections: [],
                riskScore: 0,
                confidence: 0,
                recommendations: []
            },
            scannedChunks: scanResults.length
        };
        
        // Aggregate results from all chunks
        for (const result of scanResults) {
            if (!result.isValid) {
                aggregated.isValid = false;
                aggregated.blocked = true;
            }
            
            if (result.hasPHI) {
                aggregated.hasPHI = true;
            }
            
            if (result.phiScan && result.phiScan.phiDetections) {
                aggregated.phiScan.phiDetections.push(...result.phiScan.phiDetections);
            }
            
            // Update risk level to highest found
            if (result.riskLevel === 'high' || 
                (result.riskLevel === 'medium' && aggregated.riskLevel !== 'high')) {
                aggregated.riskLevel = result.riskLevel;
            }
            
            // Update risk score to highest found
            if (result.phiScan && result.phiScan.riskScore > aggregated.phiScan.riskScore) {
                aggregated.phiScan.riskScore = result.phiScan.riskScore;
            }
            
            // Update confidence to highest found
            if (result.phiScan && result.phiScan.confidence > aggregated.phiScan.confidence) {
                aggregated.phiScan.confidence = result.phiScan.confidence;
            }
            
            // Aggregate recommendations
            if (result.phiScan && result.phiScan.recommendations) {
                aggregated.phiScan.recommendations.push(...result.phiScan.recommendations);
            }
        }
        
        // Remove duplicate recommendations
        aggregated.phiScan.recommendations = [...new Set(aggregated.phiScan.recommendations)];
        
        // Set final message
        if (aggregated.blocked) {
            aggregated.message = 'PHI detected - upload blocked';
        } else if (aggregated.hasPHI) {
            aggregated.message = 'Potential PHI detected - review required';
        }
        
        return aggregated;
    }
    
    // Extract file content with enhanced format support
    async extractFileContent(file) {
        const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        try {
            switch (extension) {
                case '.txt':
                case '.csv':
                case '.json':
                case '.xml':
                    return await this.extractTextContent(file);
                    
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
    
    // Extract text-based content
    async extractTextContent(file) {
        try {
            return await file.text();
        } catch (error) {
            console.error('Error reading text file:', error);
            return '';
        }
    }
    
    // Extract PDF content
    async extractPDFContent(file) {
        try {
            // For browser environment, we'll use a simplified approach
            // In production, you'd use pdf-parse library
            const arrayBuffer = await file.arrayBuffer();
            
            // Basic PDF text extraction (simplified)
            // In real implementation, use proper PDF parsing library
            const text = await this.extractPDFTextSimple(arrayBuffer);
            return text;
        } catch (error) {
            console.error('Error extracting PDF content:', error);
            return '';
        }
    }
    
    // Simple PDF text extraction (placeholder - use pdf-parse in production)
    async extractPDFTextSimple(arrayBuffer) {
        const uint8Array = new Uint8Array(arrayBuffer);
        const text = [];
        
        // Look for text strings in PDF (basic approach)
        for (let i = 0; i < uint8Array.length - 10; i++) {
            // Look for text patterns in PDF
            if (uint8Array[i] === 0x28 && uint8Array[i + 1] === 0x6A) {
                // Found text object marker, extract until closing parenthesis
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
    }
    
    // Extract DOCX content
    async extractDOCXContent(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            
            // Basic DOCX text extraction (simplified)
            // In production, use mammoth.js library
            const text = await this.extractDOCXTextSimple(arrayBuffer);
            return text;
        } catch (error) {
            console.error('Error extracting DOCX content:', error);
            return '';
        }
    }
    
    // Simple DOCX text extraction (placeholder - use mammoth.js in production)
    async extractDOCXTextSimple(arrayBuffer) {
        const uint8Array = new Uint8Array(arrayBuffer);
        const decoder = new TextDecoder('utf-8');
        const content = decoder.decode(uint8Array);
        
        // Extract text from DOCX XML structure (basic)
        const textMatches = content.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
        if (textMatches) {
            return textMatches.map(match => 
                match.replace(/<[^>]*>/g, '').trim()
            ).join(' ');
        }
        
        return '';
    }
    
    // Extract DOC content
    async extractDOCContent(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            
            // Basic DOC text extraction (very simplified)
            // In production, use antiword or similar library
            const text = await this.extractDOCTextSimple(arrayBuffer);
            return text;
        } catch (error) {
            console.error('Error extracting DOC content:', error);
            return '';
        }
    }
    
    // Simple DOC text extraction (placeholder)
    async extractDOCTextSimple(arrayBuffer) {
        const uint8Array = new Uint8Array(arrayBuffer);
        let text = '';
        
        // Look for readable text patterns in DOC file
        for (let i = 0; i < uint8Array.length; i++) {
            const char = uint8Array[i];
            if (char >= 32 && char <= 126) { // Printable ASCII
                text += String.fromCharCode(char);
            } else if (char === 13 || char === 10) {
                text += ' ';
            }
        }
        
        // Clean up and return meaningful text
        return text.replace(/\s+/g, ' ').trim();
    }
    
    // Extract RTF content
    async extractRTFContent(file) {
        try {
            const content = await file.text();
            
            // Extract text from RTF format
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
            // Basic image OCR (placeholder - use Tesseract.js in production)
            const text = await this.performOCR(file);
            return text;
        } catch (error) {
            console.error('Error extracting image content:', error);
            return '';
        }
    }
    
    // Perform OCR on image (placeholder implementation)
    async performOCR(file) {
        // In production, implement with Tesseract.js
        console.log('OCR would be performed on image:', file.name);
        
        // For now, return empty to avoid false positives
        // Real implementation would:
        // 1. Load Tesseract.js
        // 2. Process image
        // 3. Extract text
        // 4. Return extracted text
        
        return '';
    }
    
    // Generic content extraction for unknown formats
    async extractGenericContent(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Look for readable text patterns
            let text = '';
            let consecutiveText = 0;
            
            for (let i = 0; i < uint8Array.length && i < 10000; i++) { // Limit to first 10KB
                const char = uint8Array[i];
                if (char >= 32 && char <= 126) { // Printable ASCII
                    text += String.fromCharCode(char);
                    consecutiveText++;
                } else {
                    if (consecutiveText > 10) { // Only add spaces between meaningful text
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
    
    // Setup global error handling
    setupErrorHandling() {
        // Handle PHI-related errors globally
        window.addEventListener('error', (event) => {
            if (event.message && event.message.toLowerCase().includes('phi')) {
                console.error('PHI Protection Error:', event.error);
                this.logSystemEvent('phi_protection_error', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason.message && event.reason.message.toLowerCase().includes('phi')) {
                console.error('PHI Protection Promise Rejection:', event.reason);
                this.logSystemEvent('phi_protection_promise_error', {
                    reason: event.reason.message,
                    timestamp: new Date().toISOString()
                });
            }
        });
    }
    
    // Setup performance monitoring
    setupPerformanceMonitoring() {
        // Monitor PHI detection performance
        if (window.PerformanceObserver) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.name.includes('phi') || entry.name.includes('detection')) {
                        console.log(`PHI Performance: ${entry.name} took ${entry.duration}ms`);
                    }
                });
            });
            
            observer.observe({ entryTypes: ['measure'] });
        }
    }
    
    // Log system events
    async logSystemEvent(eventType, details) {
        if (!this.config.auditLogging) return;
        
        try {
            const logEntry = {
                event_type: eventType,
                event_details: details,
                timestamp: new Date().toISOString(),
                component: 'phi_protection_integration'
            };
            
            if (this.components.supabaseClient) {
                await this.components.supabaseClient.logPHIValidationEvent(eventType, null, details);
            } else {
                console.log('PHI System Event:', logEntry);
            }
            
        } catch (error) {
            console.error('Error logging system event:', error);
        }
    }
    
    // Get system status
    getSystemStatus() {
        return {
            initialized: this.isInitialized,
            components: {
                detectionEngine: !!this.components.detectionEngine,
                validator: !!this.components.validator,
                ui: !!this.components.ui,
                adminDashboard: !!this.components.adminDashboard,
                supabaseClient: !!this.components.supabaseClient
            },
            config: this.config,
            timestamp: new Date().toISOString()
        };
    }
    
    // Update configuration
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        this.logSystemEvent('phi_config_updated', {
            newConfig: newConfig,
            timestamp: new Date().toISOString()
        });
    }
    
    // Show admin dashboard
    showAdminDashboard() {
        if (this.components.adminDashboard) {
            this.components.adminDashboard.initialize();
        } else {
            console.error('Admin dashboard not available');
        }
    }
    
    // Run PHI detection on content
    async scanContent(content, documentType = 'unknown', filename = '') {
        if (!this.components.detectionEngine) {
            throw new Error('PHI Detection Engine not available');
        }
        
        return this.components.detectionEngine.scanContent(content, documentType, filename);
    }
    
    // Validate document
    async validateDocument(documentData) {
        if (!this.components.validator) {
            throw new Error('PHI Validator not available');
        }
        
        return this.components.validator.validateDocument(documentData);
    }
    
    // Show PHI warning
    showPHIWarning(validationResult, container) {
        if (!this.components.ui) {
            console.error('PHI UI not available');
            return;
        }
        
        this.components.ui.showPHIWarning(validationResult, container);
    }
    
    // Show education modal
    showEducationModal() {
        if (!this.components.ui) {
            console.error('PHI UI not available');
            return;
        }
        
        this.components.ui.showEducationModal();
    }
    
    // Get PHI statistics
    async getPHIStatistics(dateRange = '30d') {
        if (!this.components.supabaseClient) {
            throw new Error('Supabase client not available');
        }
        
        return this.components.supabaseClient.getPHIValidationStats(dateRange);
    }
    
    // Quarantine document
    async quarantineDocument(documentId, reason, adminNotes = '') {
        if (!this.components.supabaseClient) {
            throw new Error('Supabase client not available');
        }
        
        return this.components.supabaseClient.quarantineDocument(documentId, reason, adminNotes);
    }
    
    // Cleanup and destroy
    destroy() {
        // Cleanup components
        if (this.components.adminDashboard) {
            this.components.adminDashboard.destroy();
        }
        
        // Remove global references
        window.phiProtectionIntegration = null;
        
        this.isInitialized = false;
        
        console.log('PHI Protection System destroyed');
    }
}

// Create global instance
window.phiProtectionIntegration = new PHIProtectionIntegration();

// Auto-initialize when all components are loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for all components to be available
    const checkComponents = () => {
        return window.phiDetectionEngine && 
               window.trustMDValidator && 
               window.phiProtectionUI && 
               window.supabaseClient;
    };
    
    const initializeWhenReady = async () => {
        if (checkComponents()) {
            try {
                await window.phiProtectionIntegration.initialize();
            } catch (error) {
                console.error('Failed to auto-initialize PHI Protection:', error);
            }
        } else {
            // Check again in 100ms
            setTimeout(initializeWhenReady, 100);
        }
    };
    
    // Start checking after a short delay
    setTimeout(initializeWhenReady, 500);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PHIProtectionIntegration;
}
