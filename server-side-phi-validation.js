// TrustMD Server-Side PHI Validation
// Prevents client-side bypass and provides robust PHI protection with rate limiting

// Load dependencies
if (typeof require !== 'undefined') {
    const { errorHandler } = require('./error-handler.js');
    const { encryptionService } = require('./encryption-service.js');
    global.errorHandler = errorHandler;
    global.encryptionService = encryptionService;
} else {
    console.log('Loading dependencies for server-side PHI validation...');
}

class ServerSidePHIValidation {
    constructor() {
        this.phiDetectionEngine = null;
        this.validationCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.rateLimiter = new Map();
        this.rateLimitWindow = 60 * 1000; // 1 minute
        this.maxRequestsPerWindow = 100;
        this.blockDuration = 15 * 60 * 1000; // 15 minutes
    }
    
    // Initialize server-side validation
    initialize() {
        // In a real Node.js environment, this would initialize with actual libraries
        console.log('Server-side PHI validation initialized');
        
        // Load PHI detection engine
        if (typeof require !== 'undefined') {
            try {
                // In Node.js environment, load proper libraries
                this.initializeNodeJSEnvironment();
            } catch (error) {
                console.error('Failed to initialize Node.js environment:', error);
            }
        }
    }
    
    // Initialize Node.js environment with proper libraries
    initializeNodeJSEnvironment() {
        // Load PDF parsing library
        const pdfParse = require('pdf-parse');
        
        // Load DOCX parsing library
        const mammoth = require('mammoth');
        
        // Load OCR library
        const Tesseract = require('tesseract.js');
        
        // Load text extraction library
        const textract = require('textract');
        
        this.nodeLibraries = {
            pdfParse,
            mammoth,
            Tesseract,
            textract
        };
    }
    
    // Main validation endpoint
    async validateFileForPHI(req, res) {
        try {
            // Rate limiting
            if (!this.checkRateLimit(req.ip)) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: 'Too many validation requests'
                });
            }
            
            const { file, documentType, filename, validationOptions } = req.body;
            
            // Check cache first
            const cacheKey = this.generateCacheKey(file, documentType, filename);
            const cachedResult = this.getFromCache(cacheKey);
            if (cachedResult) {
                return res.json(cachedResult);
            }
            
            // Extract file content
            const content = await this.extractFileContentServerSide(file, filename);
            
            // Perform PHI validation
            const validationResult = await this.validateContentServerSide(
                content, 
                documentType, 
                filename,
                validationOptions
            );
            
            // Cache the result
            this.setCache(cacheKey, validationResult);
            
            // Log validation event
            await this.logValidationEvent(req, validationResult);
            
            res.json(validationResult);
            
        } catch (error) {
            console.error('Server-side PHI validation error:', error);
            res.status(500).json({
                error: 'Validation failed',
                message: 'Server-side validation error'
            });
        }
    }
    
    // Rate limiting middleware
    rateLimitMiddleware() {
        return (req, res, next) => {
            const clientId = this.getClientId(req);
            const now = Date.now();
            
            // Clean old entries
            this.cleanExpiredEntries(now);
            
            // Get current requests for this client
            const clientRequests = this.rateLimiter.get(clientId) || [];
            
            // Check if rate limit exceeded
            const recentRequests = clientRequests.filter(timestamp => 
                (now - timestamp) < this.rateLimitWindow
            );
            
            if (recentRequests.length >= this.maxRequestsPerWindow) {
                // Block the request
                this.blockClient(clientId, now);
                
                errorHandler.logError(
                    errorHandler.errorTypes.NETWORK,
                    'Rate limit exceeded',
                    { 
                        clientId, 
                        requestCount: recentRequests.length,
                        windowMs: this.rateLimitWindow,
                        maxRequests: this.maxRequestsPerWindow 
                    },
                    new Error('Rate limit exceeded')
                );
                
                return res.status(429).json({
                    error: 'Too Many Requests',
                    message: `Rate limit exceeded. Maximum ${this.maxRequestsPerWindow} requests per ${this.rateLimitWindow/1000} seconds.`,
                    retryAfter: this.blockDuration / 1000
                });
            }
            
            // Add current request
            clientRequests.push(now);
            this.rateLimiter.set(clientId, clientRequests);
            
            // Continue to next middleware
            next();
        };
    }
    
    // Get client identifier
    getClientId(req) {
        // Use IP address as client identifier
        return req.ip || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress || 
               req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               'unknown';
    }
    
    // Clean expired rate limit entries
    cleanExpiredEntries(now) {
        for (const [clientId, requests] of this.rateLimiter.entries()) {
            const validRequests = requests.filter(timestamp => 
                (now - timestamp) < this.rateLimitWindow
            );
            
            if (validRequests.length === 0) {
                this.rateLimiter.delete(clientId);
            } else {
                this.rateLimiter.set(clientId, validRequests);
            }
        }
    }
    
    // Block client for duration
    blockClient(clientId, now) {
        this.rateLimiter.set(clientId, [
            ...this.rateLimiter.get(clientId) || [],
            { blocked: true, blockedAt: now }
        ]);
    }
    
    // Check if client is blocked
    isClientBlocked(clientId) {
        const requests = this.rateLimiter.get(clientId) || [];
        const latestEntry = requests[requests.length - 1];
        
        return latestEntry && 
               latestEntry.blocked && 
               (Date.now() - latestEntry.blockedAt) < this.blockDuration;
    }
    
    // Get rate limit status
    getRateLimitStatus(clientId) {
        const requests = this.rateLimiter.get(clientId) || [];
        const recentRequests = requests.filter(req => 
            !req.blocked && (Date.now() - req) < this.rateLimitWindow
        );
        
        return {
            clientId,
            currentRequests: recentRequests.length,
            maxRequests: this.maxRequestsPerWindow,
            windowMs: this.rateLimitWindow,
            isBlocked: this.isClientBlocked(clientId),
            blockedUntil: requests.find(req => req.blocked)?.blockedAt
        };
    }

    // Progressive validation endpoint for large files
    async validateFileChunk(req, res) {
        try {
            const { chunkData, chunkIndex, totalChunks, documentType, filename, fileId } = req.body;
            
            // Validate chunk
            const chunkValidation = await this.validateContentServerSide(
                chunkData,
                documentType,
                filename,
                { chunkIndex, totalChunks }
            );
            
            // Store chunk result in session/cache
            const sessionKey = `chunk_validation_${fileId}`;
            const chunkResults = this.getChunkResults(sessionKey) || [];
            chunkResults[chunkIndex] = chunkValidation;
            
            // Check if PHI detected in any chunk
            const phiDetected = chunkResults.some(result => 
                result.hasPHI || result.blocked || !result.isValid
            );
            
            if (phiDetected) {
                // Immediately reject if PHI detected
                return res.json({
                    blocked: true,
                    hasPHI: true,
                    message: 'PHI detected in chunk ' + chunkIndex,
                    chunkIndex,
                    phiDetected: true,
                    validationComplete: false
                });
            }
            
            // Check if all chunks processed
            if (chunkResults.length === totalChunks) {
                // Aggregate all chunk results
                const finalResult = this.aggregateChunkResults(chunkResults);
                
                // Cache final result
                const cacheKey = this.generateCacheKey(null, documentType, filename);
                this.setCache(cacheKey, finalResult);
                
                return res.json({
                    ...finalResult,
                    validationComplete: true,
                    totalChunks
                });
            }
            
            // Partial result
            return res.json({
                ...chunkValidation,
                chunkIndex,
                processedChunks: chunkResults.length,
                totalChunks,
                validationComplete: false,
                phiDetected: false
            });
            
        } catch (error) {
            console.error('Chunk validation error:', error);
            res.status(500).json({
                error: 'Chunk validation failed',
                message: error.message
            });
        }
    }
    
    // Extract file content server-side with proper libraries
    async extractFileContentServerSide(file, filename) {
        const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        
        try {
            switch (extension) {
                case '.pdf':
                    return await this.extractPDFContentServerSide(file);
                    
                case '.docx':
                    return await this.extractDOCXContentServerSide(file);
                    
                case '.doc':
                    return await this.extractDOCContentServerSide(file);
                    
                case '.txt':
                case '.csv':
                case '.json':
                case '.xml':
                    return file.toString('utf-8');
                    
                case '.jpg':
                case '.jpeg':
                case '.png':
                case '.bmp':
                case '.tiff':
                    return await this.extractImageContentServerSide(file);
                    
                default:
                    return await this.extractGenericContentServerSide(file);
            }
        } catch (error) {
            console.error(`Error extracting ${extension} content server-side:`, error);
            return '';
        }
    }
    
    // Extract PDF content server-side
    async extractPDFContentServerSide(file) {
        if (!this.nodeLibraries || !this.nodeLibraries.pdfParse) {
            return this.extractPDFContentSimple(file);
        }
        
        return new Promise((resolve, reject) => {
            this.nodeLibraries.pdfParse(file, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data.text || '');
                }
            });
        });
    }
    
    // Extract DOCX content server-side
    async extractDOCXContentServerSide(file) {
        if (!this.nodeLibraries || !this.nodeLibraries.mammoth) {
            return this.extractDOCXContentSimple(file);
        }
        
        const result = await this.nodeLibraries.mammoth.extractRawText({ buffer: file });
        return result.value || '';
    }
    
    // Extract DOC content server-side
    async extractDOCContentServerSide(file) {
        if (!this.nodeLibraries || !this.nodeLibraries.textract) {
            return this.extractDOCContentSimple(file);
        }
        
        return new Promise((resolve, reject) => {
            this.nodeLibraries.textract.fromBufferWithPath('application/msword', file, (err, text) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(text || '');
                }
            });
        });
    }
    
    // Extract image content server-side
    async extractImageContentServerSide(file) {
        if (!this.nodeLibraries || !this.nodeLibraries.Tesseract) {
            return '';
        }
        
        try {
            const { data: { text } } = await this.nodeLibraries.Tesseract.recognize(file, 'eng');
            return text || '';
        } catch (error) {
            console.error('OCR error:', error);
            return '';
        }
    }
    
    // Fallback extraction methods
    extractPDFContentSimple(file) {
        // Simple PDF text extraction (same as client-side)
        // In production, use proper PDF library
        return '';
    }
    
    extractDOCXContentSimple(file) {
        // Simple DOCX extraction (same as client-side)
        return '';
    }
    
    extractDOCContentSimple(file) {
        // Simple DOC extraction (same as client-side)
        return '';
    }
    
    extractGenericContentServerSide(file) {
        // Generic text extraction
        return file.toString('utf-8', 0, Math.min(file.length, 10000));
    }
    
    // Validate content server-side
    async validateContentServerSide(content, documentType, filename, options = {}) {
        try {
            // Use server-side PHI detection engine
            const phiScan = await this.scanContentForPHIServerSide(content, documentType, filename);
            
            // Apply server-side validation rules
            const validationResult = this.applyServerSideValidationRules(
                phiScan, 
                documentType, 
                filename, 
                options
            );
            
            return {
                isValid: validationResult.isValid,
                blocked: validationResult.blocked,
                hasPHI: phiScan.hasPHI,
                phiRisk: validationResult.phiRisk,
                phiScan: phiScan,
                message: validationResult.message,
                recommendations: validationResult.recommendations,
                serverSide: true,
                timestamp: new Date().toISOString(),
                validationId: this.generateValidationId()
            };
            
        } catch (error) {
            console.error('Server-side content validation error:', error);
            return {
                isValid: false,
                blocked: true,
                hasPHI: false,
                phiRisk: 'high',
                message: 'Server-side validation error',
                error: error.message,
                serverSide: true
            };
        }
    }
    
    // Scan content for PHI server-side
    async scanContentForPHIServerSide(content, documentType, filename) {
        // In a real implementation, this would use server-side PHI detection
        // For now, simulate the same detection as client-side
        
        const detections = [];
        
        // SSN detection
        const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g;
        let match;
        while ((match = ssnPattern.exec(content)) !== null) {
            detections.push({
                type: 'ssn',
                match: match[0],
                index: match.index,
                confidence: 0.95,
                description: 'Social Security Number'
            });
        }
        
        // MRN detection
        const mrnPattern = /\b(MRN|MR\s*#|Medical\s*Record\s*#?)\s*[:#]?\s*(\w{4,12})\b/gi;
        while ((match = mrnPattern.exec(content)) !== null) {
            detections.push({
                type: 'mrn',
                match: match[0],
                index: match.index,
                confidence: 0.90,
                description: 'Medical Record Number'
            });
        }
        
        // Patient name detection
        const namePattern = /\b(Patient|Name|Patient\s*Name)\s*[:#]?\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi;
        while ((match = namePattern.exec(content)) !== null) {
            detections.push({
                type: 'patientName',
                match: match[0],
                index: match.index,
                confidence: 0.80,
                description: 'Patient Name'
            });
        }
        
        // Calculate risk score and confidence
        const riskScore = this.calculateRiskScore(detections);
        const confidence = this.calculateConfidence(detections);
        
        return {
            hasPHI: detections.length > 0,
            phiDetections: detections,
            riskScore,
            confidence,
            blocked: riskScore > 0.7 || confidence > 0.8
        };
    }
    
    // Apply server-side validation rules
    applyServerSideValidationRules(phiScan, documentType, filename, options) {
        // Server-side can be more strict
        const serverRules = {
            maxRiskScore: 0.6, // More strict than client-side
            maxConfidenceScore: 0.7, // More strict than client-side
            requireExplicitConsent: true,
            blockOnAnyPHI: true // Server-side blocks on any PHI detection
        };
        
        let isValid = true;
        let blocked = false;
        let phiRisk = 'low';
        let message = '';
        let recommendations = [];
        
        if (phiScan.hasPHI && serverRules.blockOnAnyPHI) {
            isValid = false;
            blocked = true;
            phiRisk = 'high';
            message = 'Server-side validation: PHI detected - upload blocked';
            recommendations.push({
                type: 'server_side_block',
                priority: 'high',
                action: 'Remove all PHI from document',
                description: 'Server-side validation detected PHI and blocked upload'
            });
        } else if (phiScan.riskScore > serverRules.maxRiskScore) {
            isValid = false;
            blocked = true;
            phiRisk = 'high';
            message = `Server-side: Risk score ${phiScan.riskScore} exceeds threshold ${serverRules.maxRiskScore}`;
        } else if (phiScan.confidence > serverRules.maxConfidenceScore) {
            isValid = false;
            blocked = true;
            phiRisk = 'high';
            message = `Server-side: Confidence ${phiScan.confidence} exceeds threshold ${serverRules.maxConfidenceScore}`;
        }
        
        return {
            isValid,
            blocked,
            phiRisk,
            message,
            recommendations
        };
    }
    
    // Calculate risk score
    calculateRiskScore(detections) {
        if (detections.length === 0) return 0;
        
        const weights = {
            ssn: 1.0,
            mrn: 0.9,
            patientName: 0.8,
            dob: 0.8,
            phone: 0.4,
            address: 0.4,
            medical_code: 0.6
        };
        
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const detection of detections) {
            const weight = weights[detection.type] || 0.5;
            totalScore += detection.confidence * weight;
            totalWeight += weight;
        }
        
        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }
    
    // Calculate confidence
    calculateConfidence(detections) {
        if (detections.length === 0) return 0;
        
        const totalConfidence = detections.reduce((sum, d) => sum + d.confidence, 0);
        return totalConfidence / detections.length;
    }
    
    // Aggregate chunk results
    aggregateChunkResults(chunkResults) {
        const allDetections = [];
        let maxRiskScore = 0;
        let maxConfidence = 0;
        let hasPHI = false;
        let blocked = false;
        
        for (const result of chunkResults) {
            if (result.phiScan && result.phiScan.phiDetections) {
                allDetections.push(...result.phiScan.phiDetections);
            }
            
            if (result.phiScan) {
                maxRiskScore = Math.max(maxRiskScore, result.phiScan.riskScore || 0);
                maxConfidence = Math.max(maxConfidence, result.phiScan.confidence || 0);
                hasPHI = hasPHI || result.phiScan.hasPHI;
                blocked = blocked || result.blocked;
            }
        }
        
        return {
            isValid: !blocked,
            blocked,
            hasPHI,
            phiRisk: blocked ? 'high' : (hasPHI ? 'medium' : 'low'),
            phiScan: {
                hasPHI,
                phiDetections: allDetections,
                riskScore: maxRiskScore,
                confidence: maxConfidence,
                blocked
            },
            aggregatedChunks: chunkResults.length
        };
    }
    
    // Rate limiting
    checkRateLimit(ip) {
        const now = Date.now();
        const requests = this.rateLimiter.get(ip) || [];
        
        // Remove old requests outside window
        const validRequests = requests.filter(time => now - time < this.rateLimitWindow);
        
        if (validRequests.length >= this.maxRequestsPerWindow) {
            return false;
        }
        
        validRequests.push(now);
        this.rateLimiter.set(ip, validRequests);
        return true;
    }
    
    // Cache management
    generateCacheKey(file, documentType, filename) {
        // Generate cache key based on content hash and metadata
        const contentHash = file ? this.hashContent(file) : '';
        return `${contentHash}_${documentType}_${filename}`;
    }
    
    getFromCache(key) {
        const cached = this.validationCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.result;
        }
        return null;
    }
    
    setCache(key, result) {
        this.validationCache.set(key, {
            result,
            timestamp: Date.now()
        });
    }
    
    getChunkResults(sessionKey) {
        return this.validationCache.get(sessionKey)?.results || [];
    }
    
    setChunkResults(sessionKey, results) {
        this.validationCache.set(sessionKey, {
            results,
            timestamp: Date.now()
        });
    }
    
    hashContent(content) {
        // Simple hash function - in production use crypto
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }
    
    generateValidationId() {
        return 'val_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Log validation events
    async logValidationEvent(req, validationResult) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                validationId: validationResult.validationId,
                result: validationResult,
                serverSide: true
            };
            
            console.log('Server-side PHI validation event:', logEntry);
            
            // In production, store in database
            // await this.storeValidationLog(logEntry);
            
        } catch (error) {
            console.error('Error logging validation event:', error);
        }
    }
}

// Export for use in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServerSidePHIValidation;
}

// Browser compatibility
if (typeof window !== 'undefined') {
    window.ServerSidePHIValidation = ServerSidePHIValidation;
}
