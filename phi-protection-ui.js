// TrustMD PHI Protection UI Components
// User interface elements for PHI warnings, education, and guidance

// Load input sanitizer
if (typeof require !== 'undefined') {
    const { inputSanitizer } = require('./input-sanitizer.js');
    global.inputSanitizer = inputSanitizer;
} else {
    // Browser environment - ensure script is loaded first
    console.log('Loading input sanitizer for PHI protection UI...');
}

class PHIProtectionUI {
    constructor() {
        this.isInitialized = false;
        this.activeWarnings = new Map();
        this.userEducationLevel = 'basic'; // basic, intermediate, advanced
    }
    
    // Escape HTML to prevent XSS
    escapeHTML(text) {
        if (typeof text !== 'string') {
            return '';
        }
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }
    
    // Initialize PHI protection UI
    initialize() {
        if (this.isInitialized) return;
        
        this.setupGlobalStyles();
        this.setupUploadInterceptors();
        this.setupEducationComponents();
        this.isInitialized = true;
        
        console.log('PHI Protection UI initialized');
    }
    
    // Setup global CSS styles for PHI warnings
    setupGlobalStyles() {
        const styleId = 'phi-protection-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* PHI Protection UI Styles */
            .phi-warning-banner {
                background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
                border: 2px solid #f39c12;
                border-radius: 12px;
                padding: 1.5rem;
                margin: 1rem 0;
                box-shadow: 0 4px 15px rgba(243, 156, 18, 0.2);
                animation: phiWarningPulse 2s ease-in-out infinite;
            }
            
            @keyframes phiWarningPulse {
                0%, 100% { border-color: #f39c12; }
                50% { border-color: #e67e22; }
            }
            
            .phi-warning-high {
                background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
                border-color: #e74c3c;
                box-shadow: 0 4px 15px rgba(231, 76, 60, 0.2);
            }
            
            .phi-warning-medium {
                background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
                border-color: #ff9800;
                box-shadow: 0 4px 15px rgba(255, 152, 0, 0.2);
            }
            
            .phi-warning-low {
                background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
                border-color: #4caf50;
                box-shadow: 0 4px 15px rgba(76, 175, 80, 0.2);
            }
            
            .phi-warning-header {
                display: flex;
                align-items: center;
                margin-bottom: 1rem;
                font-weight: bold;
                font-size: 1.1rem;
            }
            
            .phi-warning-icon {
                font-size: 1.5rem;
                margin-right: 0.5rem;
            }
            
            .phi-warning-content {
                margin-bottom: 1rem;
                line-height: 1.6;
            }
            
            .phi-warning-actions {
                display: flex;
                gap: 1rem;
                margin-top: 1rem;
                flex-wrap: wrap;
            }
            
            .phi-warning-button {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .phi-button-primary {
                background: #3498db;
                color: white;
            }
            
            .phi-button-primary:hover {
                background: #2980b9;
                transform: translateY(-2px);
            }
            
            .phi-button-danger {
                background: #e74c3c;
                color: white;
            }
            
            .phi-button-danger:hover {
                background: #c0392b;
                transform: translateY(-2px);
            }
            
            .phi-button-secondary {
                background: #95a5a6;
                color: white;
            }
            
            .phi-button-secondary:hover {
                background: #7f8c8d;
                transform: translateY(-2px);
            }
            
            .phi-education-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: phiModalFadeIn 0.3s ease;
            }
            
            @keyframes phiModalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .phi-education-content {
                background: white;
                border-radius: 16px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: phiModalSlideIn 0.3s ease;
            }
            
            @keyframes phiModalSlideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .phi-education-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 2rem;
                border-radius: 16px 16px 0 0;
                text-align: center;
            }
            
            .phi-education-body {
                padding: 2rem;
            }
            
            .phi-education-section {
                margin-bottom: 2rem;
            }
            
            .phi-education-section h3 {
                color: #2c3e50;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .phi-education-section ul {
                margin: 0;
                padding-left: 1.5rem;
            }
            
            .phi-education-section li {
                margin-bottom: 0.5rem;
                line-height: 1.6;
            }
            
            .phi-upload-zone {
                border: 3px dashed #bdc3c7;
                border-radius: 12px;
                padding: 3rem 2rem;
                text-align: center;
                transition: all 0.3s ease;
                background: #f8f9fa;
                position: relative;
            }
            
            .phi-upload-zone.dragover {
                border-color: #3498db;
                background: #e3f2fd;
                transform: scale(1.02);
            }
            
            .phi-upload-zone.has-phi-warning {
                border-color: #e74c3c;
                background: #ffebee;
            }
            
            .phi-upload-zone.has-phi-caution {
                border-color: #f39c12;
                background: #fff8e1;
            }
            
            .phi-upload-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
                color: #95a5a6;
            }
            
            .phi-upload-text {
                font-size: 1.2rem;
                color: #2c3e50;
                margin-bottom: 1rem;
            }
            
            .phi-upload-hint {
                color: #7f8c8d;
                font-size: 0.9rem;
            }
            
            .phi-progress-bar {
                width: 100%;
                height: 8px;
                background: #ecf0f1;
                border-radius: 4px;
                overflow: hidden;
                margin: 1rem 0;
            }
            
            .phi-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #3498db, #2ecc71);
                transition: width 0.3s ease;
                border-radius: 4px;
            }
            
            .phi-status-indicator {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-size: 0.9rem;
                font-weight: 600;
            }
            
            .phi-status-safe {
                background: #d4edda;
                color: #155724;
            }
            
            .phi-status-caution {
                background: #fff3cd;
                color: #856404;
            }
            
            .phi-status-danger {
                background: #f8d7da;
                color: #721c24;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Setup upload interceptors to add PHI protection
    setupUploadInterceptors() {
        // Intercept file input changes
        document.addEventListener('change', (event) => {
            if (event.target.type === 'file' && event.target.files.length > 0) {
                this.handleFileSelection(event.target, event.target.files);
            }
        });
        
        // Setup drag and drop
        document.addEventListener('dragover', (event) => {
            if (event.dataTransfer.files.length > 0) {
                event.preventDefault();
                this.showDropZone(event);
            }
        });
        
        document.addEventListener('drop', (event) => {
            if (event.dataTransfer.files.length > 0) {
                event.preventDefault();
                this.handleFileDrop(event, event.dataTransfer.files);
            }
        });
        
        document.addEventListener('dragleave', (event) => {
            if (event.target.classList?.contains('phi-upload-zone')) {
                this.hideDropZone(event.target);
            }
        });
    }
    
    // Handle file selection
    async handleFileSelection(input, files) {
        for (const file of files) {
            await this.validateAndWarnFile(file, input);
        }
    }
    
    // Handle file drop
    async handleFileDrop(event, files) {
        this.hideDropZone(event.target);
        
        for (const file of files) {
            await this.validateAndWarnFile(file, event.target);
        }
    }
    
    // Validate file and show warnings if needed
    async validateAndWarnFile(file, container) {
        try {
            // Quick filename validation
            const filenameValidation = window.trustMDValidator?.validateDocumentFilename(file.name);
            
            if (!filenameValidation.isValid) {
                this.showPHIWarning({
                    type: 'filename',
                    risk: 'high',
                    issues: filenameValidation.phiIssues,
                    file: file.name
                }, container);
                return;
            }
            
            // Extract content for validation (if possible)
            const content = await this.extractFileContent(file);
            
            if (content) {
                const contentValidation = window.trustMDValidator?.validateDocumentContent(
                    content, 
                    'unknown', 
                    file.name
                );
                
                if (contentValidation.phiRisk !== 'low') {
                    this.showPHIWarning({
                        type: 'content',
                        risk: contentValidation.phiRisk,
                        issues: [contentValidation.message],
                        recommendations: contentValidation.recommendations,
                        file: file.name,
                        phiScan: contentValidation.phiScan
                    }, container);
                }
            }
            
        } catch (error) {
            console.error('Error validating file:', error);
        }
    }
    
    // Extract file content (basic implementation)
    async extractFileContent(file) {
        const textExtensions = ['.txt', '.csv', '.json', '.xml'];
        const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (textExtensions.includes(extension)) {
            try {
                return await file.text();
            } catch (error) {
                console.error('Error reading file content:', error);
                return '';
            }
        }
        
        return '';
    }
    
    // Show PHI warning banner
    showPHIWarning(warningData, container) {
        const warningId = `phi-warning-${Date.now()}`;
        
        const warningBanner = document.createElement('div');
        warningBanner.className = `phi-warning-banner phi-warning-${warningData.risk}`;
        warningBanner.id = warningId;
        
        const riskIcon = warningData.risk === 'high' ? '🚨' : 
                        warningData.risk === 'medium' ? '⚠️' : 'ℹ️';
        
        let recommendationsHTML = '';
        if (warningData.recommendations && warningData.recommendations.length > 0) {
            recommendationsHTML = `
                <div class="phi-warning-section">
                    <strong>Recommendations:</strong>
                    <ul>
                        ${warningData.recommendations.map(rec => `<li>${rec.message}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        warningBanner.innerHTML = `
            <div class="phi-warning-header">
                <span class="phi-warning-icon">${this.escapeHTML(riskIcon)}</span>
                <span>PHI Detection Alert - ${this.escapeHTML(warningData.risk.toUpperCase())} RISK</span>
            </div>
            <div class="phi-warning-content">
                <p><strong>File:</strong> ${this.escapeHTML(warningData.file)}</p>
                <ul>
                    ${warningData.issues.map(issue => `<li>${this.escapeHTML(issue)}</li>`).join('')}
                </ul>
                ${recommendationsHTML}
            </div>
            <div class="phi-warning-actions">
                <button class="phi-warning-button phi-button-primary" onclick="window.phiProtectionUI.showEducationModal()">
                    📚 Learn About PHI
                </button>
                <button class="phi-warning-button phi-button-secondary" onclick="window.phiProtectionUI.dismissWarning('${warningId}')">
                    Dismiss
                </button>
            </div>
        `;
        
        // Find appropriate container
        let targetContainer = container;
        if (!targetContainer || !targetContainer.appendChild) {
            targetContainer = document.body;
        }
        
        targetContainer.appendChild(warningBanner);
        this.activeWarnings.set(warningId, warningBanner);
        
        // Auto-dismiss after 30 seconds for low/medium risk
        if (warningData.risk !== 'high') {
            setTimeout(() => {
                this.dismissWarning(warningId);
            }, 30000);
        }
    }
    
    // Dismiss warning
    dismissWarning(warningId) {
        const warning = this.activeWarnings.get(warningId);
        if (warning) {
            warning.remove();
            this.activeWarnings.delete(warningId);
        }
    }
    
    // Show education modal
    showEducationModal() {
        const modal = document.createElement('div');
        modal.className = 'phi-education-modal';
        modal.innerHTML = `
            <div class="phi-education-content">
                <div class="phi-education-header">
                    <h2>🛡️ Understanding Protected Health Information (PHI)</h2>
                    <p>TrustMD is designed for compliance documents, not patient records</p>
                </div>
                <div class="phi-education-body">
                    <div class="phi-education-section">
                        <h3>🚫 What is NOT Allowed in TrustMD</h3>
                        <ul>
                            <li><strong>Patient Names:</strong> ${this.escapeHTML('John Smith, Jane Doe, etc.')}</li>
                            <li><strong>Medical Record Numbers:</strong> ${this.escapeHTML('MRN #12345, Patient ID 67890')}</li>
                            <li><strong>Social Security Numbers:</strong> ${this.escapeHTML('123-45-6789')}</li>
                            <li><strong>Dates of Birth:</strong> ${this.escapeHTML('DOB: 01/15/1980')}</li>
                            <li><strong>Diagnosis Information:</strong> Patient diagnosed with...</li>
                            <li><strong>Treatment Records:</strong> Patient received treatment for...</li>
                            <li><strong>Medication Information:</strong> Prescribed...</li>
                        </ul>
                    </div>
                    
                    <div class="phi-education-section">
                        <h3>✅ What IS Allowed in TrustMD</h3>
                        <ul>
                            <li><strong>Policy Documents:</strong> HIPAA Privacy Policy templates</li>
                            <li><strong>Training Certificates:</strong> OSHA training completion</li>
                            <li><strong>Compliance Manuals:</strong> Office procedure guides</li>
                            <li><strong>Consent Form Templates:</strong> Blank consent forms</li>
                            <li><strong>Accreditation Documents:</strong> TJC survey reports</li>
                            <li><strong>Billing Compliance:</strong> Coding guidelines (no patient data)</li>
                        </ul>
                    </div>
                    
                    <div class="phi-education-section">
                        <h3>🎯 Best Practices</h3>
                        <ul>
                            <li>Use patient identifiers like "Patient A" or "Sample Patient"</li>
                            <li>Remove all dates except document creation/review dates</li>
                            <li>Redact any personal information before uploading</li>
                            <li>Verify documents are templates, not completed forms</li>
                            <li>When in doubt, don't upload - contact compliance officer</li>
                        </ul>
                    </div>
                    
                    <div class="phi-warning-actions">
                        <button class="phi-warning-button phi-button-primary" onclick="window.phiProtectionUI.closeEducationModal(this)">
                            I Understand
                        </button>
                        <button class="phi-warning-button phi-button-secondary" onclick="window.phiProtectionUI.showAdvancedHelp()">
                            Need More Help
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeEducationModal(modal);
            }
        });
    }
    
    // Close education modal
    closeEducationModal(button) {
        const modal = button.closest('.phi-education-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    // Show advanced help
    showAdvancedHelp() {
        // Create a more detailed help modal or redirect to help documentation
        alert('Advanced help would open here with detailed PHI guidelines and examples.');
    }
    
    // Show drop zone for drag and drop
    showDropZone(event) {
        let dropZone = document.querySelector('.phi-upload-zone');
        
        if (!dropZone) {
            dropZone = document.createElement('div');
            dropZone.className = 'phi-upload-zone';
            dropZone.innerHTML = `
                <div class="phi-upload-icon">📁</div>
                <div class="phi-upload-text">${this.escapeHTML('Drop files here to upload')}</div>
                <div class="phi-upload-hint">${this.escapeHTML('Files will be scanned for PHI before upload')}</div>
            `;
            
            // Position the drop zone
            dropZone.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 9999;
                pointer-events: none;
            `;
            
            document.body.appendChild(dropZone);
        }
        
        dropZone.classList.add('dragover');
        dropZone.style.pointerEvents = 'auto';
    }
    
    // Hide drop zone
    hideDropZone(dropZone) {
        if (dropZone && dropZone.classList) {
            dropZone.classList.remove('dragover');
            dropZone.style.pointerEvents = 'none';
            
            setTimeout(() => {
                if (dropZone.parentNode && !dropZone.classList.contains('dragover')) {
                    dropZone.remove();
                }
            }, 300);
        }
    }
    
    // Setup education components
    setupEducationComponents() {
        // Add PHI education tooltips to relevant elements
        this.addTooltips();
        
        // Add periodic education reminders
        this.setupEducationReminders();
    }
    
    // Add tooltips to upload areas
    addTooltips() {
        const uploadAreas = document.querySelectorAll('input[type="file"], .upload-area, .file-upload');
        
        uploadAreas.forEach(area => {
            area.setAttribute('title', 'TrustMD scans all uploads for PHI. Only compliance documents allowed.');
            area.setAttribute('data-phi-protected', 'true');
        });
    }
    
    // Setup education reminders
    setupEducationReminders() {
        // Show education modal on first upload attempt
        let hasSeenEducation = localStorage.getItem('trustmd-phi-education-seen');
        
        if (!hasSeenEducation) {
            setTimeout(() => {
                this.showEducationModal();
                localStorage.setItem('trustmd-phi-education-seen', 'true');
            }, 5000);
        }
    }
    
    // Create enhanced upload component
    createEnhancedUploadComponent(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="phi-upload-zone" id="${this.escapeHTML(containerId)}-drop-zone">
                <div class="phi-upload-icon">📤</div>
                <div class="phi-upload-text">${this.escapeHTML('Drop compliance documents here')}</div>
                <div class="phi-upload-hint">
                    ${this.escapeHTML('Supported: PDF, DOC, DOCX, TXT (max 10MB)')}<br>
                    <strong>${this.escapeHTML('No patient records or PHI allowed')}</strong>
                </div>
                <input type="file" id="${this.escapeHTML(containerId)}-file-input" multiple accept=".pdf,.doc,.docx,.txt" style="display: none;">
                <div class="phi-warning-actions">
                    <button class="phi-warning-button phi-button-primary" onclick="document.getElementById('${this.escapeHTML(containerId)}-file-input').click()">
                        ${this.escapeHTML('Choose Files')}
                    </button>
                    <button class="phi-warning-button phi-button-secondary" onclick="window.phiProtectionUI.showEducationModal()">
                        📚 What is PHI?
                    </button>
                </div>
            </div>
            <div id="${containerId}-warnings"></div>
            <div id="${containerId}-progress"></div>
        `;
        
        // Setup file input handling
        const fileInput = document.getElementById(`${containerId}-file-input`);
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(fileInput, e.target.files);
        });
    }
    
    // Show upload progress
    showUploadProgress(containerId, progress, status = 'uploading') {
        const progressContainer = document.getElementById(`${containerId}-progress`);
        if (!progressContainer) return;
        
        const statusClass = status === 'success' ? 'phi-status-safe' : 
                          status === 'error' ? 'phi-status-danger' : 'phi-status-caution';
        
        const statusIcon = status === 'success' ? '✅' : 
                         status === 'error' ? '❌' : '⏳';
        
        progressContainer.innerHTML = `
            <div class="phi-progress-bar">
                <div class="phi-progress-fill" style="width: ${this.escapeHTML(progress.toString())}%"></div>
            </div>
            <div class="phi-status-indicator ${this.escapeHTML(statusClass)}">
                ${this.escapeHTML(statusIcon)} ${this.escapeHTML(status === 'success' ? 'Upload Complete' : status === 'error' ? 'Upload Failed' : 'Uploading...')}
            </div>
        `;
    }
}

// Create global instance
window.phiProtectionUI = new PHIProtectionUI();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.phiProtectionUI.initialize();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PHIProtectionUI;
}
