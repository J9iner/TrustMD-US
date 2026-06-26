// TrustMD PHI Detection Engine
// Prevents accidental uploads of Protected Health Information and EHR data

class PHIDetectionEngine {
    constructor() {
        this.phiPatterns = {
            // Social Security Numbers
            ssn: {
                pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
                confidence: 0.95,
                description: 'Social Security Number'
            },
            ssnNoDash: {
                pattern: /\b\d{9}\b/g,
                confidence: 0.7,
                description: '9-digit number (possible SSN)',
                context: (match, text) => {
                    // Higher confidence if near SSN-related terms
                    const contextWindow = 50;
                    const start = Math.max(0, match.index - contextWindow);
                    const end = Math.min(text.length, match.index + match[0].length + contextWindow);
                    const context = text.substring(start, end).toLowerCase();
                    
                    const ssnTerms = ['social security', 'ssn', 'tax id', 'identification'];
                    return ssnTerms.some(term => context.includes(term)) ? 0.9 : 0.7;
                }
            },
            
            // Medical Record Numbers
            mrn: {
                pattern: /\b(MRN|MR\s*#|Medical\s*Record\s*#?)\s*[:#]?\s*(\w{4,12})\b/gi,
                confidence: 0.9,
                description: 'Medical Record Number',
                groups: [2] // Extract the MRN value
            },
            patientId: {
                pattern: /\b(Patient\s*ID|Patient\s*Identifier)\s*[:#]?\s*(\w{4,12})\b/gi,
                confidence: 0.85,
                description: 'Patient ID',
                groups: [2]
            },
            
            // Patient Names
            patientName: {
                pattern: /\b(Patient|Name|Patient\s*Name)\s*[:#]?\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi,
                confidence: 0.8,
                description: 'Patient Name'
            },
            doctorPatient: {
                pattern: /\b(Dr\.|Doctor|Physician)\s+[A-Z][a-z]+\s+(?:treating|seeing|examining|for)\s+([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi,
                confidence: 0.75,
                description: 'Doctor-Patient Relationship'
            },
            
            // Dates of Birth
            dob: {
                pattern: /\b(DOB|Date\s*of\s*Birth|Birth\s*Date)\s*[:#]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/gi,
                confidence: 0.85,
                description: 'Date of Birth',
                groups: [2]
            },
            dobFormat: {
                pattern: /\b(Born|Birthdate|Born\s*on)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/gi,
                confidence: 0.7,
                description: 'Birth Date Format',
                groups: [2]
            },
            
            // Phone Numbers (with context)
            phoneNumber: {
                pattern: /\b(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
                confidence: 0.6,
                description: 'Phone Number',
                context: (match, text) => {
                    const contextWindow = 30;
                    const start = Math.max(0, match.index - contextWindow);
                    const end = Math.min(text.length, match.index + match[0].length + contextWindow);
                    const context = text.substring(start, end).toLowerCase();
                    
                    const phoneTerms = ['phone', 'cell', 'mobile', 'contact', 'call', 'patient'];
                    return phoneTerms.some(term => context.includes(term)) ? 0.8 : 0.6;
                }
            },
            
            // Addresses
            address: {
                pattern: /\b\d+\s+([A-Z][a-z]+\s*)+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi,
                confidence: 0.7,
                description: 'Street Address'
            },
            
            // Medical Codes
            icd10: {
                pattern: /\b[A-Z]\d{2}(?:\.\d{1,3})?\b/g,
                confidence: 0.8,
                description: 'ICD-10 Diagnosis Code',
                context: (match, text) => {
                    const contextWindow = 30;
                    const start = Math.max(0, match.index - contextWindow);
                    const end = Math.min(text.length, match.index + match[0].length + contextWindow);
                    const context = text.substring(start, end).toLowerCase();
                    
                    const medicalTerms = ['diagnosis', 'icd', 'code', 'condition', 'diagnosed'];
                    return medicalTerms.some(term => context.includes(term)) ? 0.9 : 0.8;
                }
            },
            cpt: {
                pattern: /\b\d{5}\b/g,
                confidence: 0.6,
                description: 'CPT Procedure Code',
                context: (match, text) => {
                    const contextWindow = 30;
                    const start = Math.max(0, match.index - contextWindow);
                    const end = Math.min(text.length, match.index + match[0].length + contextWindow);
                    const context = text.substring(start, end).toLowerCase();
                    
                    const cptTerms = ['cpt', 'procedure', 'code', 'billing', 'service'];
                    return cptTerms.some(term => context.includes(term)) ? 0.85 : 0.6;
                }
            },
            npi: {
                pattern: /\b(NPI|National\s*Provider\s*Identifier)\s*[:#]?\s*(\d{10})\b/gi,
                confidence: 0.9,
                description: 'National Provider Identifier',
                groups: [2]
            },
            
            // Clinical Terms
            diagnosis: {
                pattern: /\b(diagnosed with|diagnosis of|patient has|suffers from)\s+([a-z\s]{10,50})\b/gi,
                confidence: 0.7,
                description: 'Medical Diagnosis'
            },
            medication: {
                pattern: /\b(prescribed|taking|medication|drug|dosage)\s+([a-z\s]{5,30})\b/gi,
                confidence: 0.6,
                description: 'Medication Information'
            },
            treatment: {
                pattern: /\b(treatment|therapy|surgery|procedure)\s+(?:for|of|on)\s+([a-z\s]{10,50})\b/gi,
                confidence: 0.65,
                description: 'Treatment Information'
            },
            
            // Healthcare Facility Terms
            facility: {
                pattern: /\b(hospital|clinic|medical center|healthcare facility)\s+(?:at|located)\s+([a-z\s]{10,50})\b/gi,
                confidence: 0.6,
                description: 'Healthcare Facility Information'
            },
            
            // Insurance Information
            insurance: {
                pattern: /\b(insurance|policy|coverage|plan)\s*(?:number|id|#)\s*[:#]?\s*(\w{6,20})\b/gi,
                confidence: 0.75,
                description: 'Insurance Information',
                groups: [2]
            },
            
            // Emergency Contact
            emergencyContact: {
                pattern: /\b(emergency\s*contact|emergency\s*phone)\s*[:#]?\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi,
                confidence: 0.8,
                description: 'Emergency Contact Information'
            }
        };
        
        this.highRiskKeywords = [
            'patient', 'diagnosis', 'treatment', 'medication', 'therapy', 'surgery',
            'medical record', 'clinical', 'physician', 'doctor', 'nurse', 'hospital',
            'clinic', 'healthcare', 'prescription', 'dosage', 'symptoms', 'condition'
        ];
        
        this.documentTypeRisk = {
            'consent_forms': 0.3, // Lower risk - expected to have some patient info
            'policies': 0.1,      // Very low risk
            'training_records': 0.2, // Low risk
            'audit_reports': 0.4,   // Medium risk
            'patient_records': 0.9,  // High risk (if this type exists)
            'clinical_notes': 0.9,  // High risk
            'lab_results': 0.9,     // High risk
            'billing_records': 0.8  // High risk
        };
    }
    
    // Scan content for PHI
    scanContent(content, documentType = 'unknown', filename = '') {
        const results = {
            hasPHI: false,
            phiDetections: [],
            riskScore: 0,
            confidence: 0,
            recommendations: [],
            blocked: false
        };
        
        // Preprocess content
        const cleanContent = this.preprocessContent(content);
        
        // Scan for each PHI pattern
        for (const [patternName, patternConfig] of Object.entries(this.phiPatterns)) {
            const matches = this.findMatches(cleanContent, patternConfig, patternName);
            results.phiDetections.push(...matches);
        }
        
        // Calculate risk score
        results.riskScore = this.calculateRiskScore(results.phiDetections, documentType);
        
        // Determine overall confidence
        results.confidence = this.calculateOverallConfidence(results.phiDetections);
        
        // Generate recommendations
        results.recommendations = this.generateRecommendations(results.phiDetections, documentType);
        
        // Determine if content should be blocked
        results.hasPHI = results.phiDetections.length > 0;
        results.blocked = results.riskScore > 0.7 || results.confidence > 0.8;
        
        return results;
    }
    
    // Preprocess content for better detection
    preprocessContent(content) {
        if (typeof content !== 'string') {
            return '';
        }
        
        // Normalize whitespace
        let cleanContent = content.replace(/\s+/g, ' ');
        
        // Remove common non-PHI number patterns to reduce false positives
        cleanContent = cleanContent.replace(/\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g, '[CARD_NUMBER]');
        cleanContent = cleanContent.replace(/\b\d{1,5}\s*(st|nd|rd|th)\b/g, '[ORDINAL]');
        
        return cleanContent;
    }
    
    // Find matches for a specific pattern
    findMatches(content, patternConfig, patternName) {
        const matches = [];
        let match;
        
        // Reset regex lastIndex
        if (patternConfig.pattern.global) {
            patternConfig.pattern.lastIndex = 0;
        }
        
        while ((match = patternConfig.pattern.exec(content)) !== null) {
            const detection = {
                type: patternName,
                description: patternConfig.description,
                match: match[0],
                index: match.index,
                confidence: patternConfig.confidence
            };
            
            // Apply context-based confidence adjustment if available
            if (patternConfig.context) {
                detection.confidence = patternConfig.context(match, content);
            }
            
            // Extract specific groups if defined
            if (patternConfig.groups) {
                detection.extractedValue = patternConfig.groups.map(groupIndex => match[groupIndex]).join(' ');
            }
            
            // Get surrounding context for review
            const contextStart = Math.max(0, match.index - 50);
            const contextEnd = Math.min(content.length, match.index + match[0].length + 50);
            detection.context = content.substring(contextStart, contextEnd);
            
            matches.push(detection);
        }
        
        return matches;
    }
    
    // Calculate overall risk score
    calculateRiskScore(detections, documentType) {
        if (detections.length === 0) return 0;
        
        let totalScore = 0;
        let weightSum = 0;
        
        // Base score from detections
        for (const detection of detections) {
            const weight = this.getDetectionWeight(detection.type);
            totalScore += detection.confidence * weight;
            weightSum += weight;
        }
        
        let baseScore = weightSum > 0 ? totalScore / weightSum : 0;
        
        // Adjust for document type risk
        const documentTypeMultiplier = this.documentTypeRisk[documentType] || 0.5;
        baseScore *= documentTypeMultiplier;
        
        // Boost score for multiple detection types
        const uniqueTypes = new Set(detections.map(d => d.type)).size;
        const typeMultiplier = Math.min(1.5, 1 + (uniqueTypes - 1) * 0.2);
        baseScore *= typeMultiplier;
        
        // Cap at 1.0
        return Math.min(1.0, baseScore);
    }
    
    // Get weight for different PHI types
    getDetectionWeight(phiType) {
        const weights = {
            ssn: 1.0,
            mrn: 0.9,
            patientId: 0.9,
            patientName: 0.8,
            dob: 0.8,
            icd10: 0.7,
            npi: 0.6,
            diagnosis: 0.6,
            medication: 0.5,
            treatment: 0.5,
            address: 0.4,
            phoneNumber: 0.3,
            insurance: 0.3
        };
        
        return weights[phiType] || 0.5;
    }
    
    // Calculate overall confidence
    calculateOverallConfidence(detections) {
        if (detections.length === 0) return 0;
        
        const totalConfidence = detections.reduce((sum, d) => sum + d.confidence, 0);
        const averageConfidence = totalConfidence / detections.length;
        
        // Boost confidence for multiple high-confidence detections
        const highConfidenceCount = detections.filter(d => d.confidence > 0.8).length;
        const multiplier = Math.min(1.2, 1 + highConfidenceCount * 0.1);
        
        return Math.min(1.0, averageConfidence * multiplier);
    }
    
    // Generate recommendations based on detections
    generateRecommendations(detections, documentType) {
        const recommendations = [];
        
        if (detections.length === 0) {
            recommendations.push({
                type: 'info',
                message: 'No PHI detected in this document.',
                action: 'safe_to_upload'
            });
            return recommendations;
        }
        
        // High-level recommendations
        if (detections.some(d => d.type === 'ssn' || d.type === 'mrn')) {
            recommendations.push({
                type: 'critical',
                message: 'Document contains direct patient identifiers (SSN/MRN).',
                action: 'remove_phi_or_do_not_upload'
            });
        }
        
        if (detections.some(d => d.type === 'patientName' || d.type === 'dob')) {
            recommendations.push({
                type: 'high',
                message: 'Document contains patient names and/or dates of birth.',
                action: 'redact_patient_info'
            });
        }
        
        if (detections.some(d => ['icd10', 'diagnosis', 'medication', 'treatment'].includes(d.type))) {
            recommendations.push({
                type: 'medium',
                message: 'Document contains clinical information.',
                action: 'verify_compliance_document_only'
            });
        }
        
        // Document-specific guidance
        if (documentType === 'consent_forms') {
            recommendations.push({
                type: 'info',
                message: 'Consent forms may contain some patient information. Ensure this is a template, not a completed form.',
                action: 'verify_template_only'
            });
        }
        
        // General recommendations
        recommendations.push({
            type: 'warning',
            message: 'TrustMD is designed for compliance documents only, not patient records.',
            action: 'review_document_purpose'
        });
        
        return recommendations;
    }
    
    // Quick scan for high-risk content (faster, less thorough)
    quickScan(content) {
        const highRiskPatterns = ['ssn', 'mrn', 'patientId', 'patientName', 'dob'];
        const detections = [];
        
        for (const patternName of highRiskPatterns) {
            const patternConfig = this.phiPatterns[patternName];
            if (patternConfig) {
                const matches = this.findMatches(content, patternConfig, patternName);
                detections.push(...matches);
            }
        }
        
        return {
            hasHighRiskPHI: detections.length > 0,
            detectionCount: detections.length,
            riskLevel: detections.length > 2 ? 'high' : detections.length > 0 ? 'medium' : 'low'
        };
    }
    
    // Validate filename for PHI indicators
    validateFilename(filename) {
        if (!filename || typeof filename !== 'string') {
            return { safe: true, issues: [] };
        }
        
        const issues = [];
        const lowerFilename = filename.toLowerCase();
        
        // Check for patient identifiers in filename
        if (/\b\d{3}-\d{2}-\d{4}\b/.test(filename)) {
            issues.push('Filename contains SSN format');
        }
        
        if (/\b(mrn|patient)\s*\d+/i.test(filename)) {
            issues.push('Filename contains patient identifier');
        }
        
        if (this.highRiskKeywords.some(keyword => lowerFilename.includes(keyword))) {
            issues.push('Filename contains healthcare terms');
        }
        
        return {
            safe: issues.length === 0,
            issues: issues
        };
    }
}

// Create global instance
window.phiDetectionEngine = new PHIDetectionEngine();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PHIDetectionEngine;
}
