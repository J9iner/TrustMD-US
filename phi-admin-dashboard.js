// TrustMD PHI Admin Dashboard
// Administrative interface for monitoring PHI detection and compliance

// Load dependencies
if (typeof require !== 'undefined') {
    const { errorHandler } = require('./error-handler.js');
    global.errorHandler = errorHandler;
} else {
    console.log('Loading error handler for PHI admin dashboard...');
}

class PHIAdminDashboard {
    constructor() {
        this.isInitialized = false;
        this.currentView = 'overview';
        this.filters = {
            dateRange: '30d',
            riskLevel: 'all',
            eventType: 'all'
        };
        this.refreshInterval = null;
        this.currentUser = null;
        this.userPermissions = new Set();
    }
    
    // Check if user has admin permissions
    async checkAdminPermissions() {
        try {
            // Get current user from global state or session
            const currentUser = window.trustMDState?.get('currentUser') || 
                             JSON.parse(sessionStorage.getItem('currentUser')) ||
                             null;
            
            if (!currentUser) {
                throw new Error('User not authenticated');
            }
            
            // Check if user has admin role
            const userRoles = window.trustMDState?.get('userRoles') || 
                           JSON.parse(sessionStorage.getItem('userRoles')) || [];
            
            const hasAdminRole = userRoles.some(role => 
                ['Super Admin', 'Admin', 'PHI Admin'].includes(role)
            );
            
            if (!hasAdminRole) {
                throw new Error('User does not have admin permissions');
            }
            
            // Store user info for later use
            this.currentUser = currentUser;
            this.userPermissions = new Set([
                'phi:read', 'phi:write', 'phi:delete', 'phi:export',
                'audit:read', 'user:read', 'role:manage'
            ]);
            
            return true;
        } catch (error) {
            errorHandler.logError(
                errorHandler.errorTypes.AUTHORIZATION,
                'Admin access check failed',
                { userId: this.currentUser?.id, action: 'dashboard_access' },
                error
            );
            return false;
        }
    }
    
    // Initialize admin dashboard
    async initialize() {
        if (this.isInitialized) return;
        
        // Check admin permissions first
        const hasPermission = await this.checkAdminPermissions();
        if (!hasPermission) {
            this.showAccessDenied();
            return;
        }
        
        this.setupDashboardStyles();
        this.createDashboardLayout();
        this.loadDashboardData();
        this.setupEventListeners();
        this.startAutoRefresh();
        
        this.isInitialized = true;
        console.log('PHI Admin Dashboard initialized for user:', this.currentUser?.email);
    }
    
    // Show access denied message
    showAccessDenied() {
        const accessDenied = document.createElement('div');
        accessDenied.className = 'phi-access-denied';
        accessDenied.innerHTML = `
            <div class="phi-access-denied-content">
                <h1>🚫 Access Denied</h1>
                <p>You do not have permission to access the PHI Admin Dashboard.</p>
                <p><strong>Required Permissions:</strong> Admin or PHI Admin role</p>
                <p>Please contact your system administrator if you believe this is an error.</p>
                <button class="phi-button phi-button-primary" onclick="window.location.href='/dashboard'">
                    Return to Dashboard
                </button>
            </div>
        `;
        
        // Add styles for access denied page
        const style = document.createElement('style');
        style.textContent = `
            .phi-access-denied {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #f8f9fa;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            }
            .phi-access-denied-content {
                background: white;
                padding: 3rem;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
            }
            .phi-access-denied h1 {
                color: #e74c3c;
                margin-bottom: 1rem;
            }
            .phi-access-denied p {
                margin-bottom: 1rem;
                color: #666;
            }
        `;
        document.head.appendChild(style);
        document.body.innerHTML = '';
        document.body.appendChild(accessDenied);
        
        // Log the access attempt
        errorHandler.logError(
            errorHandler.errorTypes.AUTHORIZATION,
            'Unauthorized admin dashboard access attempt',
            { 
                userId: this.currentUser?.id || 'unknown',
                action: 'admin_dashboard_access',
                timestamp: new Date().toISOString()
            }
        );
    }
    
    // Setup dashboard styles
    setupDashboardStyles() {
        const styleId = 'phi-admin-dashboard-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .phi-admin-dashboard {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #f8f9fa;
                min-height: 100vh;
                padding: 2rem;
            }
            
            .phi-dashboard-header {
                background: white;
                border-radius: 12px;
                padding: 2rem;
                margin-bottom: 2rem;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .phi-dashboard-title {
                font-size: 2rem;
                color: #2c3e50;
                margin: 0 0 1rem 0;
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .phi-dashboard-subtitle {
                color: #7f8c8d;
                font-size: 1.1rem;
                margin: 0;
            }
            
            .phi-dashboard-filters {
                background: white;
                border-radius: 12px;
                padding: 1.5rem;
                margin-bottom: 2rem;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
                align-items: center;
            }
            
            .phi-filter-group {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .phi-filter-label {
                font-weight: 600;
                color: #2c3e50;
                font-size: 0.9rem;
            }
            
            .phi-filter-select {
                padding: 0.5rem 1rem;
                border: 2px solid #e1e8ed;
                border-radius: 8px;
                background: white;
                font-size: 0.9rem;
                min-width: 150px;
            }
            
            .phi-filter-select:focus {
                outline: none;
                border-color: #3498db;
            }
            
            .phi-dashboard-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 2rem;
                margin-bottom: 2rem;
            }
            
            .phi-metric-card {
                background: white;
                border-radius: 12px;
                padding: 1.5rem;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                transition: transform 0.3s ease;
            }
            
            .phi-metric-card:hover {
                transform: translateY(-5px);
            }
            
            .phi-metric-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 1rem;
            }
            
            .phi-metric-title {
                font-weight: 600;
                color: #2c3e50;
                font-size: 0.9rem;
            }
            
            .phi-metric-icon {
                font-size: 1.5rem;
            }
            
            .phi-metric-value {
                font-size: 2.5rem;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 0.5rem;
            }
            
            .phi-metric-change {
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }
            
            .phi-change-positive {
                color: #27ae60;
            }
            
            .phi-change-negative {
                color: #e74c3c;
            }
            
            .phi-change-neutral {
                color: #95a5a6;
            }
            
            .phi-metric-card.high-risk {
                border-left: 4px solid #e74c3c;
            }
            
            .phi-metric-card.medium-risk {
                border-left: 4px solid #f39c12;
            }
            
            .phi-metric-card.low-risk {
                border-left: 4px solid #27ae60;
            }
            
            .phi-dashboard-section {
                background: white;
                border-radius: 12px;
                padding: 2rem;
                margin-bottom: 2rem;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .phi-section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 1.5rem;
            }
            
            .phi-section-title {
                font-size: 1.5rem;
                color: #2c3e50;
                margin: 0;
            }
            
            .phi-section-actions {
                display: flex;
                gap: 1rem;
            }
            
            .phi-button {
                padding: 0.5rem 1rem;
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
            }
            
            .phi-button-danger {
                background: #e74c3c;
                color: white;
            }
            
            .phi-button-danger:hover {
                background: #c0392b;
            }
            
            .phi-button-secondary {
                background: #95a5a6;
                color: white;
            }
            
            .phi-button-secondary:hover {
                background: #7f8c8d;
            }
            
            .phi-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 1rem;
            }
            
            .phi-table th {
                background: #f8f9fa;
                padding: 1rem;
                text-align: left;
                font-weight: 600;
                color: #2c3e50;
                border-bottom: 2px solid #e1e8ed;
            }
            
            .phi-table td {
                padding: 1rem;
                border-bottom: 1px solid #e1e8ed;
            }
            
            .phi-table tr:hover {
                background: #f8f9fa;
            }
            
            .phi-risk-badge {
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.8rem;
                font-weight: 600;
                text-transform: uppercase;
            }
            
            .phi-risk-high {
                background: #ffebee;
                color: #c62828;
            }
            
            .phi-risk-medium {
                background: #fff8e1;
                color: #f57c00;
            }
            
            .phi-risk-low {
                background: #e8f5e8;
                color: #2e7d32;
            }
            
            .phi-status-badge {
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.8rem;
                font-weight: 600;
            }
            
            .phi-status-active {
                background: #e8f5e8;
                color: #2e7d32;
            }
            
            .phi-status-quarantined {
                background: #fff3cd;
                color: #856404;
            }
            
            .phi-status-blocked {
                background: #ffebee;
                color: #c62828;
            }
            
            .phi-chart-container {
                height: 300px;
                margin: 1rem 0;
                position: relative;
            }
            
            .phi-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                color: #7f8c8d;
            }
            
            .phi-loading-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #e1e8ed;
                border-top: 2px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 1rem;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .phi-empty-state {
                text-align: center;
                padding: 3rem;
                color: #7f8c8d;
            }
            
            .phi-empty-state-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
            
            .phi-detail-modal {
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
            }
            
            .phi-detail-content {
                background: white;
                border-radius: 16px;
                max-width: 800px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            
            .phi-detail-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 2rem;
                border-radius: 16px 16px 0 0;
            }
            
            .phi-detail-body {
                padding: 2rem;
            }
            
            .phi-detail-section {
                margin-bottom: 2rem;
            }
            
            .phi-detail-section h3 {
                color: #2c3e50;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Create dashboard layout
    createDashboardLayout() {
        const dashboardContainer = document.createElement('div');
        dashboardContainer.className = 'phi-admin-dashboard';
        dashboardContainer.innerHTML = `
            <div class="phi-dashboard-header">
                <h1 class="phi-dashboard-title">
                    🛡️ PHI Protection Dashboard
                </h1>
                <p class="phi-dashboard-subtitle">
                    Monitor and manage Protected Health Information detection across TrustMD
                </p>
            </div>
            
            <div class="phi-dashboard-filters">
                <div class="phi-filter-group">
                    <label class="phi-filter-label">Date Range</label>
                    <select class="phi-filter-select" id="phi-date-range">
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d" selected>Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                    </select>
                </div>
                
                <div class="phi-filter-group">
                    <label class="phi-filter-label">Risk Level</label>
                    <select class="phi-filter-select" id="phi-risk-filter">
                        <option value="all" selected>All Levels</option>
                        <option value="high">High Risk</option>
                        <option value="medium">Medium Risk</option>
                        <option value="low">Low Risk</option>
                    </select>
                </div>
                
                <div class="phi-filter-group">
                    <label class="phi-filter-label">Event Type</label>
                    <select class="phi-filter-select" id="phi-event-filter">
                        <option value="all" selected>All Events</option>
                        <option value="upload">Uploads</option>
                        <option value="blocked">Blocked</option>
                        <option value="quarantined">Quarantined</option>
                    </select>
                </div>
                
                <div class="phi-filter-group">
                    <button class="phi-button phi-button-primary" onclick="window.phiAdminDashboard.refreshData()">
                        🔄 Refresh
                    </button>
                </div>
            </div>
            
            <div class="phi-dashboard-grid" id="phi-metrics-grid">
                <!-- Metrics will be populated here -->
            </div>
            
            <div class="phi-dashboard-section">
                <div class="phi-section-header">
                    <h2 class="phi-section-title">📊 PHI Detection Trends</h2>
                    <div class="phi-section-actions">
                        <button class="phi-button phi-button-secondary" onclick="window.phiAdminDashboard.exportData()">
                            📥 Export Data
                        </button>
                    </div>
                </div>
                <div class="phi-chart-container" id="phi-trends-chart">
                    <div class="phi-loading">
                        <div class="phi-loading-spinner"></div>
                        Loading chart...
                    </div>
                </div>
            </div>
            
            <div class="phi-dashboard-section">
                <div class="phi-section-header">
                    <h2 class="phi-section-title">🚨 Recent PHI Incidents</h2>
                    <div class="phi-section-actions">
                        <button class="phi-button phi-button-danger" onclick="window.phiAdminDashboard.showQuarantineManagement()">
                            🛑 Manage Quarantine
                        </button>
                    </div>
                </div>
                <div id="phi-incidents-table">
                    <div class="phi-loading">
                        <div class="phi-loading-spinner"></div>
                        Loading incidents...
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dashboardContainer);
    }
    
    // Load dashboard data
    async loadDashboardData() {
        try {
            // Load metrics
            await this.loadMetrics();
            
            // Load incidents
            await this.loadIncidents();
            
            // Load trends
            await this.loadTrends();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }
    
    // Load metrics
    async loadMetrics() {
        try {
            const stats = await window.supabaseClient?.getPHIValidationStats(this.filters.dateRange);
            
            if (!stats) {
                // Use demo data if no real data available
                stats = {
                    totalUploads: 150,
                    blockedUploads: 12,
                    highRiskDetections: 8,
                    mediumRiskDetections: 23,
                    lowRiskDetections: 45,
                    averageRiskScore: 0.23,
                    falsePositiveRate: 0.05,
                    userComplianceRate: 0.94
                };
            }
            
            const metricsGrid = document.getElementById('phi-metrics-grid');
            metricsGrid.innerHTML = `
                <div class="phi-metric-card high-risk">
                    <div class="phi-metric-header">
                        <span class="phi-metric-title">Blocked Uploads</span>
                        <span class="phi-metric-icon">🚫</span>
                    </div>
                    <div class="phi-metric-value">${stats.blockedUploads}</div>
                    <div class="phi-metric-change phi-change-negative">
                        ↑ 15% from last period
                    </div>
                </div>
                
                <div class="phi-metric-card medium-risk">
                    <div class="phi-metric-header">
                        <span class="phi-metric-title">High Risk Detections</span>
                        <span class="phi-metric-icon">⚠️</span>
                    </div>
                    <div class="phi-metric-value">${stats.highRiskDetections}</div>
                    <div class="phi-metric-change phi-change-negative">
                        ↑ 8% from last period
                    </div>
                </div>
                
                <div class="phi-metric-card low-risk">
                    <div class="phi-metric-header">
                        <span class="phi-metric-title">User Compliance Rate</span>
                        <span class="phi-metric-icon">✅</span>
                    </div>
                    <div class="phi-metric-value">${Math.round(stats.userComplianceRate * 100)}%</div>
                    <div class="phi-metric-change phi-change-positive">
                        ↑ 3% from last period
                    </div>
                </div>
                
                <div class="phi-metric-card">
                    <div class="phi-metric-header">
                        <span class="phi-metric-title">False Positive Rate</span>
                        <span class="phi-metric-icon">📊</span>
                    </div>
                    <div class="phi-metric-value">${Math.round(stats.falsePositiveRate * 100)}%</div>
                    <div class="phi-metric-change phi-change-positive">
                        ↓ 2% from last period
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading metrics:', error);
        }
    }
    
    // Load incidents
    async loadIncidents() {
        try {
            const incidentsContainer = document.getElementById('phi-incidents-table');
            
            // Demo data - in real implementation, this would come from the database
            const incidents = [
                {
                    id: '1',
                    timestamp: '2024-01-15T10:30:00Z',
                    filename: 'patient_records.pdf',
                    user: 'john.doe@clinic.com',
                    riskLevel: 'high',
                    eventType: 'blocked',
                    phiDetections: ['SSN', 'Patient Name', 'DOB'],
                    status: 'blocked'
                },
                {
                    id: '2',
                    timestamp: '2024-01-15T09:15:00Z',
                    filename: 'consent_form_template.docx',
                    user: 'jane.smith@clinic.com',
                    riskLevel: 'medium',
                    eventType: 'upload',
                    phiDetections: ['Patient Name'],
                    status: 'active'
                },
                {
                    id: '3',
                    timestamp: '2024-01-14T16:45:00Z',
                    filename: 'training_certificate.pdf',
                    user: 'mike.wilson@clinic.com',
                    riskLevel: 'low',
                    eventType: 'upload',
                    phiDetections: [],
                    status: 'active'
                }
            ];
            
            const tableHTML = `
                <table class="phi-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>File</th>
                            <th>User</th>
                            <th>Risk Level</th>
                            <th>Event Type</th>
                            <th>PHI Detections</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${incidents.map(incident => `
                            <tr>
                                <td>${new Date(incident.timestamp).toLocaleString()}</td>
                                <td>${incident.filename}</td>
                                <td>${incident.user}</td>
                                <td>
                                    <span class="phi-risk-badge phi-risk-${incident.riskLevel}">
                                        ${incident.riskLevel}
                                    </span>
                                </td>
                                <td>${incident.eventType}</td>
                                <td>${incident.phiDetections.join(', ') || 'None'}</td>
                                <td>
                                    <span class="phi-status-badge phi-status-${incident.status}">
                                        ${incident.status}
                                    </span>
                                </td>
                                <td>
                                    <button class="phi-button phi-button-primary" onclick="window.phiAdminDashboard.showIncidentDetails('${incident.id}')">
                                        View Details
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            incidentsContainer.innerHTML = tableHTML;
            
        } catch (error) {
            console.error('Error loading incidents:', error);
            document.getElementById('phi-incidents-table').innerHTML = 
                '<div class="phi-empty-state">Error loading incidents</div>';
        }
    }
    
    // Load trends
    async loadTrends() {
        try {
            const chartContainer = document.getElementById('phi-trends-chart');
            
            // Demo chart - in real implementation, use Chart.js or similar
            chartContainer.innerHTML = `
                <div style="height: 100%; display: flex; align-items: center; justify-content: center; background: #f8f9fa; border-radius: 8px;">
                    <div style="text-align: center; color: #7f8c8d;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📈</div>
                        <div>PHI Detection Trends Chart</div>
                        <div style="font-size: 0.9rem; margin-top: 0.5rem;">
                            Chart visualization would be implemented here
                        </div>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading trends:', error);
        }
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Filter changes
        document.getElementById('phi-date-range')?.addEventListener('change', (e) => {
            this.filters.dateRange = e.target.value;
            this.refreshData();
        });
        
        document.getElementById('phi-risk-filter')?.addEventListener('change', (e) => {
            this.filters.riskLevel = e.target.value;
            this.refreshData();
        });
        
        document.getElementById('phi-event-filter')?.addEventListener('change', (e) => {
            this.filters.eventType = e.target.value;
            this.refreshData();
        });
    }
    
    // Start auto-refresh
    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.refreshData();
        }, 60000); // Refresh every minute
    }
    
    // Stop auto-refresh
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
    
    // Refresh dashboard data
    async refreshData() {
        await this.loadDashboardData();
    }
    
    // Show incident details
    showIncidentDetails(incidentId) {
        // Create modal with detailed incident information
        const modal = document.createElement('div');
        modal.className = 'phi-detail-modal';
        modal.innerHTML = `
            <div class="phi-detail-content">
                <div class="phi-detail-header">
                    <h2>🔍 Incident Details</h2>
                    <p>Incident ID: ${incidentId}</p>
                </div>
                <div class="phi-detail-body">
                    <div class="phi-detail-section">
                        <h3>📄 File Information</h3>
                        <p><strong>Filename:</strong> patient_records.pdf</p>
                        <p><strong>File Size:</strong> 2.4 MB</p>
                        <p><strong>Upload Time:</strong> 2024-01-15 10:30:00</p>
                    </div>
                    
                    <div class="phi-detail-section">
                        <h3>🚨 PHI Detections</h3>
                        <ul>
                            <li><strong>SSN:</strong> 123-45-6789 (confidence: 95%)</li>
                            <li><strong>Patient Name:</strong> John Smith (confidence: 85%)</li>
                            <li><strong>DOB:</strong> 01/15/1980 (confidence: 90%)</li>
                        </ul>
                    </div>
                    
                    <div class="phi-detail-section">
                        <h3>👤 User Information</h3>
                        <p><strong>User:</strong> john.doe@clinic.com</p>
                        <p><strong>IP Address:</strong> 192.168.1.100</p>
                        <p><strong>User Agent:</strong> Mozilla/5.0...</p>
                    </div>
                    
                    <div class="phi-detail-section">
                        <h3>⚙️ Actions</h3>
                        <div style="display: flex; gap: 1rem;">
                            <button class="phi-button phi-button-danger" onclick="window.phiAdminDashboard.quarantineDocument('${incidentId}')">
                                🛑 Quarantine Document
                            </button>
                            <button class="phi-button phi-button-secondary" onclick="window.phiAdminDashboard.contactUser('${incidentId}')">
                                📧 Contact User
                            </button>
                            <button class="phi-button phi-button-primary" onclick="this.closest('.phi-detail-modal').remove()">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // Quarantine document
    async quarantineDocument(incidentId) {
        try {
            await window.supabaseClient?.quarantineDocument(
                incidentId, 
                'PHI detected - admin action',
                'Document quarantined due to high PHI risk score'
            );
            
            alert('Document quarantined successfully');
            this.refreshData();
            
        } catch (error) {
            console.error('Error quarantining document:', error);
            alert('Failed to quarantine document');
        }
    }
    
    // Contact user
    contactUser(incidentId) {
        // Open email client or contact form
        const subject = `PHI Detection Alert - Incident ${incidentId}`;
        const body = `Dear User,\n\nWe detected potential Protected Health Information in your recent upload to TrustMD.\n\nPlease review our PHI guidelines and ensure you are only uploading compliance documents, not patient records.\n\nIf you believe this is a false positive, please contact our support team.\n\nThank you,\nTrustMD Compliance Team`;
        
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    
    // Show quarantine management
    showQuarantineManagement() {
        alert('Quarantine management interface would open here');
    }
    
    // Export data
    async exportData() {
        try {
            // Check if user has export permissions
            if (!this.userPermissions.has('phi:export')) {
                throw new Error('User does not have export permissions');
            }
            
            // Log the export action
            errorHandler.logError(
                errorHandler.errorTypes.AUTHORIZATION,
                'PHI data export initiated',
                {
                    userId: this.currentUser?.id,
                    action: 'data_export',
                    filters: this.filters,
                    timestamp: new Date().toISOString()
                }
            );
            
            // In a real implementation, this would:
            // 1. Validate export request
            // 2. Encrypt sensitive data
            // 3. Generate audit trail
            // 4. Create secure download link
            
            alert('Data export functionality would be implemented here with proper encryption and audit logging');
            
        } catch (error) {
            errorHandler.logError(
                errorHandler.errorTypes.AUTHORIZATION,
                'Data export access denied',
                { 
                    userId: this.currentUser?.id, 
                    action: 'data_export',
                    error: error.message 
                },
                error
            );
            alert('Access denied: You do not have permission to export data');
        }
    }
    
    // Show error message
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    // Cleanup
    destroy() {
        this.stopAutoRefresh();
        
        // Remove dashboard from DOM
        const dashboard = document.querySelector('.phi-admin-dashboard');
        if (dashboard) {
            dashboard.remove();
        }
        
        this.isInitialized = false;
    }
}

// Create global instance
window.phiAdminDashboard = new PHIAdminDashboard();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PHIAdminDashboard;
}
