// Session Management Dashboard Component
// Provides real-time session monitoring and management interface

class SessionManagementDashboard {
    constructor(sessionManager, apiServer) {
        this.sessionManager = sessionManager;
        this.apiServer = apiServer;
        this.dashboardElement = null;
        this.refreshInterval = null;
        this.currentFilter = 'all';
        this.sortBy = 'lastActivity';
        this.sortOrder = 'desc';
    }

    // Initialize dashboard
    initialize(containerId = 'session-dashboard') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container element not found:', containerId);
            return;
        }

        this.dashboardElement = container;
        this.render();
        this.startAutoRefresh();
        this.attachEventListeners();
    }

    // Render dashboard
    render() {
        const stats = this.sessionManager.getSessionStats();
        
        this.dashboardElement.innerHTML = `
            <div class="session-dashboard">
                <div class="dashboard-header">
                    <h2>Session Management Dashboard</h2>
                    <div class="header-controls">
                        <button id="refresh-sessions" class="btn btn-primary">
                            <i class="fas fa-sync"></i> Refresh
                        </button>
                        <button id="export-sessions" class="btn btn-secondary">
                            <i class="fas fa-download"></i> Export
                        </button>
                    </div>
                </div>

                <div class="dashboard-stats">
                    <div class="stat-card">
                        <div class="stat-value">${stats.activeSessions}</div>
                        <div class="stat-label">Active Sessions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalSessions}</div>
                        <div class="stat-label">Total Sessions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.expiredSessions}</div>
                        <div class="stat-label">Expired Sessions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.terminatedSessions}</div>
                        <div class="stat-label">Terminated Sessions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.failedAttempts}</div>
                        <div class="stat-label">Failed Attempts</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.suspiciousActivities}</div>
                        <div class="stat-label">Suspicious Activities</div>
                    </div>
                </div>

                <div class="dashboard-controls">
                    <div class="filter-controls">
                        <label for="session-filter">Filter:</label>
                        <select id="session-filter" class="form-control">
                            <option value="all">All Sessions</option>
                            <option value="active">Active Only</option>
                            <option value="expired">Expired</option>
                            <option value="suspicious">Suspicious</option>
                            <option value="high-security">High Security</option>
                        </select>
                    </div>
                    <div class="sort-controls">
                        <label for="session-sort">Sort by:</label>
                        <select id="session-sort" class="form-control">
                            <option value="lastActivity">Last Activity</option>
                            <option value="createdAt">Created At</option>
                            <option value="securityLevel">Security Level</option>
                            <option value="email">User Email</option>
                        </select>
                        <button id="sort-order" class="btn btn-secondary">
                            <i class="fas fa-sort-amount-down"></i>
                        </button>
                    </div>
                </div>

                <div class="sessions-container">
                    <div class="loading-indicator" id="sessions-loading">
                        <i class="fas fa-spinner fa-spin"></i> Loading sessions...
                    </div>
                    <div id="sessions-list" class="sessions-list"></div>
                </div>

                <div class="dashboard-footer">
                    <div class="session-actions">
                        <button id="terminate-selected" class="btn btn-danger" disabled>
                            <i class="fas fa-times"></i> Terminate Selected
                        </button>
                        <button id="terminate-all" class="btn btn-warning">
                            <i class="fas fa-times-circle"></i> Terminate All Sessions
                        </button>
                        <button id="cleanup-expired" class="btn btn-secondary">
                            <i class="fas fa-broom"></i> Cleanup Expired
                        </button>
                    </div>
                    <div class="pagination">
                        <button id="prev-page" class="btn btn-secondary" disabled>
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <span id="page-info">Page 1 of 1</span>
                        <button id="next-page" class="btn btn-secondary" disabled>
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.loadSessions();
    }

    // Load sessions data
    async loadSessions() {
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/auth/sessions', {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.renderSessionsList(result.data.sessions);
                this.updatePagination(result.data);
            } else {
                this.showError('Failed to load sessions: ' + result.error);
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.showError('Error loading sessions');
        } finally {
            this.showLoading(false);
        }
    }

    // Render sessions list
    renderSessionsList(sessions) {
        const container = document.getElementById('sessions-list');
        const filteredSessions = this.filterSessions(sessions);
        const sortedSessions = this.sortSessions(filteredSessions);
        
        if (sortedSessions.length === 0) {
            container.innerHTML = `
                <div class="no-sessions">
                    <i class="fas fa-inbox"></i>
                    <p>No sessions found matching the current filter.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sortedSessions.map(session => `
            <div class="session-card ${session.isCurrent ? 'current-session' : ''}" data-session-id="${session.sessionId}">
                <div class="session-header">
                    <div class="session-user">
                        <i class="fas fa-user"></i>
                        <span>${this.escapeHtml(session.email)}</span>
                        ${session.isCurrent ? '<span class="current-badge">Current</span>' : ''}
                    </div>
                    <div class="session-security security-${session.securityLevel.toLowerCase()}">
                        <i class="fas fa-shield-alt"></i>
                        ${session.securityLevel}
                    </div>
                </div>
                
                <div class="session-details">
                    <div class="detail-row">
                        <span class="label">Session ID:</span>
                        <span class="value">${this.escapeHtml(session.sessionId.substring(0, 8))}...</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Created:</span>
                        <span class="value">${this.formatDate(session.createdAt)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Last Activity:</span>
                        <span class="value">${this.formatDate(session.lastActivity)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Expires:</span>
                        <span class="value ${this.isExpiringSoon(session.expiresAt) ? 'expiring-soon' : ''}">
                            ${this.formatDate(session.expiresAt)}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="label">IP Address:</span>
                        <span class="value">${this.escapeHtml(session.ipAddress)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Device:</span>
                        <span class="value">${this.escapeHtml(this.parseUserAgent(session.userAgent))}</span>
                    </div>
                </div>
                
                <div class="session-actions">
                    <button class="btn btn-sm btn-info view-session" data-session-id="${session.sessionId}">
                        <i class="fas fa-eye"></i> Details
                    </button>
                    ${!session.isCurrent ? `
                        <button class="btn btn-sm btn-warning terminate-session" data-session-id="${session.sessionId}">
                            <i class="fas fa-times"></i> Terminate
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        this.attachSessionEventListeners();
    }

    // Filter sessions based on current filter
    filterSessions(sessions) {
        switch (this.currentFilter) {
            case 'active':
                return sessions.filter(s => s.expiresAt > Date.now());
            case 'expired':
                return sessions.filter(s => s.expiresAt <= Date.now());
            case 'suspicious':
                return sessions.filter(s => s.securityLevel === 'LOW');
            case 'high-security':
                return sessions.filter(s => s.securityLevel === 'HIGH');
            default:
                return sessions;
        }
    }

    // Sort sessions
    sortSessions(sessions) {
        return sessions.sort((a, b) => {
            let comparison = 0;
            
            switch (this.sortBy) {
                case 'lastActivity':
                    comparison = a.lastActivity - b.lastActivity;
                    break;
                case 'createdAt':
                    comparison = a.createdAt - b.createdAt;
                    break;
                case 'securityLevel':
                    const levels = { LOW: 1, MEDIUM: 2, HIGH: 3 };
                    comparison = levels[a.securityLevel] - levels[b.securityLevel];
                    break;
                case 'email':
                    comparison = a.email.localeCompare(b.email);
                    break;
            }
            
            return this.sortOrder === 'desc' ? -comparison : comparison;
        });
    }

    // Attach event listeners
    attachEventListeners() {
        // Refresh button
        document.getElementById('refresh-sessions')?.addEventListener('click', () => {
            this.loadSessions();
        });

        // Export button
        document.getElementById('export-sessions')?.addEventListener('click', () => {
            this.exportSessions();
        });

        // Filter change
        document.getElementById('session-filter')?.addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.loadSessions();
        });

        // Sort change
        document.getElementById('session-sort')?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.loadSessions();
        });

        // Sort order toggle
        document.getElementById('sort-order')?.addEventListener('click', () => {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            this.updateSortOrderButton();
            this.loadSessions();
        });

        // Terminate selected
        document.getElementById('terminate-selected')?.addEventListener('click', () => {
            this.terminateSelectedSessions();
        });

        // Terminate all
        document.getElementById('terminate-all')?.addEventListener('click', () => {
            this.terminateAllSessions();
        });

        // Cleanup expired
        document.getElementById('cleanup-expired')?.addEventListener('click', () => {
            this.cleanupExpiredSessions();
        });
    }

    // Attach session-specific event listeners
    attachSessionEventListeners() {
        // View session details
        document.querySelectorAll('.view-session').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sessionId = e.target.closest('button').dataset.sessionId;
                this.showSessionDetails(sessionId);
            });
        });

        // Terminate session
        document.querySelectorAll('.terminate-session').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sessionId = e.target.closest('button').dataset.sessionId;
                this.terminateSession(sessionId);
            });
        });

        // Session selection
        document.querySelectorAll('.session-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.session-actions')) return;
                
                const checkbox = card.querySelector('.session-checkbox');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this.updateTerminateButton();
                }
            });
        });
    }

    // Show session details modal
    async showSessionDetails(sessionId) {
        try {
            const response = await fetch(`/api/auth/sessions/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSessionModal(result.data);
            } else {
                this.showError('Failed to load session details');
            }
        } catch (error) {
            console.error('Error loading session details:', error);
            this.showError('Error loading session details');
        }
    }

    // Terminate specific session
    async terminateSession(sessionId) {
        if (!confirm('Are you sure you want to terminate this session?')) {
            return;
        }

        try {
            const response = await fetch(`/api/auth/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Session terminated successfully');
                this.loadSessions();
            } else {
                this.showError('Failed to terminate session: ' + result.error);
            }
        } catch (error) {
            console.error('Error terminating session:', error);
            this.showError('Error terminating session');
        }
    }

    // Terminate all sessions
    async terminateAllSessions() {
        if (!confirm('Are you sure you want to terminate all sessions? This will log out all users.')) {
            return;
        }

        try {
            const response = await fetch('/api/auth/sessions', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(`Terminated ${result.data.terminatedCount} sessions successfully`);
                this.loadSessions();
            } else {
                this.showError('Failed to terminate sessions: ' + result.error);
            }
        } catch (error) {
            console.error('Error terminating all sessions:', error);
            this.showError('Error terminating sessions');
        }
    }

    // Cleanup expired sessions
    async cleanupExpiredSessions() {
        try {
            const response = await fetch('/api/auth/sessions/cleanup', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(`Cleaned up ${result.data.cleanedCount} expired sessions`);
                this.loadSessions();
            } else {
                this.showError('Failed to cleanup sessions: ' + result.error);
            }
        } catch (error) {
            console.error('Error cleaning up sessions:', error);
            this.showError('Error cleaning up sessions');
        }
    }

    // Export sessions data
    exportSessions() {
        const sessions = Array.from(document.querySelectorAll('.session-card')).map(card => {
            const sessionId = card.dataset.sessionId;
            const sessionData = this.getSessionDataFromCard(card);
            return { sessionId, ...sessionData };
        });

        const csv = this.convertToCSV(sessions);
        this.downloadCSV(csv, 'sessions-export.csv');
    }

    // Helper methods
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    showLoading(show) {
        const loader = document.getElementById('sessions-loading');
        if (loader) {
            loader.style.display = show ? 'block' : 'none';
        }
    }

    showError(message) {
        // Implement error notification
        console.error(message);
        alert(message); // Simple implementation
    }

    showSuccess(message) {
        // Implement success notification
        console.log(message);
        alert(message); // Simple implementation
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    isExpiringSoon(expiresAt) {
        const thirtyMinutes = 30 * 60 * 1000;
        return (expiresAt - Date.now()) < thirtyMinutes;
    }

    parseUserAgent(userAgent) {
        // Simple user agent parsing
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Unknown';
    }

    convertToCSV(data) {
        const headers = ['Session ID', 'Email', 'Created', 'Last Activity', 'Expires', 'IP Address', 'Security Level'];
        const rows = data.map(session => [
            session.sessionId,
            session.email,
            new Date(session.createdAt).toISOString(),
            new Date(session.lastActivity).toISOString(),
            new Date(session.expiresAt).toISOString(),
            session.ipAddress,
            session.securityLevel
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.loadSessions();
        }, 30000); // Refresh every 30 seconds
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    updateSortOrderButton() {
        const button = document.getElementById('sort-order');
        if (button) {
            const icon = button.querySelector('i');
            icon.className = this.sortOrder === 'asc' ? 'fas fa-sort-amount-up' : 'fas fa-sort-amount-down';
        }
    }

    updateTerminateButton() {
        const selectedCount = document.querySelectorAll('.session-checkbox:checked').length;
        const button = document.getElementById('terminate-selected');
        if (button) {
            button.disabled = selectedCount === 0;
        }
    }
}

// Export for use in both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionManagementDashboard;
} else {
    window.SessionManagementDashboard = SessionManagementDashboard;
}
