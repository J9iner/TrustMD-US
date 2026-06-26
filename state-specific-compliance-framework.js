// TrustMD State Compliance Framework
// Core modular system for state-specific regulatory compliance

class StateComplianceFramework {
    constructor(supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.currentTenantId = null;
        this.activeStates = [];
        this.stateModules = new Map();
        this.coreFramework = null;
    }

    // Initialize the framework
    async initialize() {
        try {
            this.currentTenantId = await this.getCurrentTenantId();
            this.coreFramework = new CoreComplianceManager(this.supabaseClient, this.currentTenantId);
            
            // Load active states for this tenant
            await this.loadActiveStates();
            
            // Initialize state modules for active states
            await this.initializeStateModules();
            
            console.log('State Compliance Framework initialized');
            return true;
        } catch (error) {
            console.error('Error initializing framework:', error);
            return false;
        }
    }

    // Get current tenant ID
    async getCurrentTenantId() {
        const { data: { user } } = await this.supabaseClient.supabase.auth.getUser();
        const { data: userData } = await this.supabaseClient.supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .single();
        return userData?.tenant_id;
    }

    // Load active states for tenant
    async loadActiveStates() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('state_medical_licenses')
                .select('state_code')
                .eq('tenant_id', this.currentTenantId)
                .neq('status', 'expired');

            if (error) throw error;
            
            // Get unique state codes
            const uniqueStates = [...new Set(data?.map(license => license.state_code) || [])];
            this.activeStates = uniqueStates;
            
            return this.activeStates;
        } catch (error) {
            console.error('Error loading active states:', error);
            return [];
        }
    }

    // Initialize state modules
    async initializeStateModules() {
        for (const stateCode of this.activeStates) {
            try {
                const module = await this.loadStateModule(stateCode);
                if (module) {
                    this.stateModules.set(stateCode, module);
                    console.log(`Loaded state module: ${stateCode}`);
                }
            } catch (error) {
                console.error(`Error loading state module ${stateCode}:`, error);
            }
        }
    }

    // Load state-specific module
    async loadStateModule(stateCode) {
        const moduleMap = {
            // Tier 1 States (Highest Burden)
            'CA': () => import('./states/california-compliance.js'),
            'NY': () => import('./states/new-york-compliance.js'),
            'TX': () => import('./states/texas-compliance.js'),
            'FL': () => import('./states/florida-compliance.js'),
            'IL': () => import('./states/illinois-compliance.js'),
            
            // Tier 2 States (High Burden)
            'PA': () => import('./states/pennsylvania-compliance.js'),
            'OH': () => import('./states/ohio-compliance.js'),
            'MI': () => import('./states/michigan-compliance.js'),
            
            // Tier 3 States (Moderate Burden)
            'GA': () => import('./states/georgia-compliance.js'),
            'NC': () => import('./states/north-carolina-compliance.js'),
            'NJ': () => import('./states/new-jersey-compliance.js'),
            'VA': () => import('./states/virginia-compliance.js'),
            
            // Tier 4 States (Lowest Burden)
            'AZ': () => import('./states/arizona-compliance.js'),
            'CO': () => import('./states/colorado-compliance.js'),
            'MD': () => import('./states/maryland-compliance.js'),
            'MA': () => import('./states/massachusetts-compliance.js'),
            'WA': () => import('./states/washington-compliance.js'),
            'OR': () => import('./states/oregon-compliance.js'),
            'NV': () => import('./states/nevada-compliance.js'),
            
            // Tier 5 States (Minimal Burden)
            'AK': () => import('./states/alaska-compliance.js'),
            'HI': () => import('./states/hawaii-compliance.js'),
            'ID': () => import('./states/idaho-compliance.js'),
            'MT': () => import('./states/montana-compliance.js'),
            'WY': () => import('./states/wyoming-compliance.js'),
            'ME': () => import('./states/maine-compliance.js'),
            'NH': () => import('./states/new-hampshire-compliance.js'),
            'VT': () => import('./states/vermont-compliance.js'),
            'WI': () => import('./states/wisconsin-compliance.js'),
            'IA': () => import('./states/iowa-compliance.js'),
            'KS': () => import('./states/kansas-compliance.js'),
            'NE': () => import('./states/nebraska-compliance.js'),
            'ND': () => import('./states/north-dakota-compliance.js'),
            'SD': () => import('./states/south-dakota-compliance.js'),
            'TN': () => import('./states/tennessee-compliance.js'),
            'SC': () => import('./states/south-carolina-compliance.js'),
            'AL': () => import('./states/alabama-compliance.js'),
            'LA': () => import('./states/louisiana-compliance.js'),
            'KY': () => import('./states/kentucky-compliance.js'),
            'OK': () => import('./states/oklahoma-compliance.js'),
            'MS': () => import('./states/mississippi-compliance.js'),
            'IN': () => import('./states/indiana-compliance.js'),
            'MO': () => import('./states/missouri-compliance.js'),
            'AR': () => import('./states/arkansas-compliance.js'),
            'WV': () => import('./states/west-virginia-compliance.js'),
            'CT': () => import('./states/connecticut-compliance.js'),
            'NM': () => import('./states/new-mexico-compliance.js'),
            'UT': () => import('./states/utah-compliance.js'),
            'DE': () => import('./states/delaware-compliance.js'),
            'RI': () => import('./states/rhode-island-compliance.js')
        };

        try {
            if (moduleMap[stateCode]) {
                const module = await moduleMap[stateCode]();
                return new module.default(this.supabaseClient, this.currentTenantId);
            } else {
                // Default state module for states without specific implementations
                return new DefaultStateCompliance(this.supabaseClient, this.currentTenantId, stateCode);
            }
        } catch (error) {
            console.error(`Error loading module for ${stateCode}:`, error);
            return new DefaultStateCompliance(this.supabaseClient, this.currentTenantId, stateCode);
        }
    }

    // Get comprehensive compliance report
    async getComplianceReport() {
        const coreReport = await this.coreFramework.generateCoreReport();
        const stateReports = {};

        for (const [stateCode, module] of this.stateModules) {
            try {
                stateReports[stateCode] = await module.generateStateReport();
            } catch (error) {
                console.error(`Error generating report for ${stateCode}:`, error);
                stateReports[stateCode] = { error: error.message };
            }
        }

        return {
            summary: this.generateSummaryReport(coreReport, stateReports),
            core: coreReport,
            states: stateReports,
            framework: {
                activeStates: this.activeStates,
                totalStates: this.stateModules.size,
                lastUpdated: new Date().toISOString()
            }
        };
    }

    // Generate summary report
    generateSummaryReport(coreReport, stateReports) {
        const stateScores = Object.values(stateReports)
            .filter(report => report.overallScore)
            .map(report => report.overallScore);

        const averageStateScore = stateScores.length > 0 
            ? Math.round(stateScores.reduce((a, b) => a + b, 0) / stateScores.length)
            : 0;

        return {
            overallScore: Math.round((coreReport.overallScore + averageStateScore) / 2),
            status: this.getOverallStatus(coreReport.overallScore, averageStateScore),
            coreCompliance: coreReport.overallScore,
            stateCompliance: averageStateScore,
            activeStates: this.activeStates.length,
            highPriorityIssues: this.getHighPriorityIssues(coreReport, stateReports)
        };
    }

    // Get overall compliance status
    getOverallStatus(coreScore, stateScore) {
        const average = (coreScore + stateScore) / 2;
        if (average >= 90) return 'Excellent';
        if (average >= 80) return 'Good';
        if (average >= 70) return 'Fair';
        if (average >= 60) return 'Poor';
        return 'Critical';
    }

    // Get high priority issues across all states
    getHighPriorityIssues(coreReport, stateReports) {
        const issues = [];

        // Core issues
        if (coreReport.urgentIssues) {
            issues.push(...coreReport.urgentIssues);
        }

        // State issues
        Object.entries(stateReports).forEach(([stateCode, report]) => {
            if (report.urgentIssues) {
                issues.push(...report.urgentIssues.map(issue => ({
                    ...issue,
                    state: stateCode
                })));
            }
        });

        return issues.sort((a, b) => {
            const priority = { critical: 4, high: 3, medium: 2, low: 1 };
            return priority[b.priority] - priority[a.priority];
        }).slice(0, 10); // Top 10 issues
    }
}

// Core Compliance Manager - Universal across all states
class CoreComplianceManager {
    constructor(supabaseClient, tenantId) {
        this.supabaseClient = supabaseClient;
        this.tenantId = tenantId;
    }

    // Generate core compliance report
    async generateCoreReport() {
        try {
            const [
                licenseCompliance,
                reportingCompliance,
                inspectionCompliance
            ] = await Promise.all([
                this.getLicenseCompliance(),
                this.getReportingCompliance(),
                this.getInspectionCompliance()
            ]);

            const overallScore = Math.round(
                (licenseCompliance.score * 0.4 + 
                 reportingCompliance.score * 0.3 + 
                 inspectionCompliance.score * 0.3)
            );

            return {
                overallScore,
                status: this.getComplianceStatus(overallScore),
                breakdown: {
                    licensing: licenseCompliance,
                    reporting: reportingCompliance,
                    inspections: inspectionCompliance
                },
                urgentIssues: this.getUrgentIssues(licenseCompliance, reportingCompliance, inspectionCompliance),
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error generating core report:', error);
            return { error: error.message };
        }
    }

    // Get license compliance
    async getLicenseCompliance() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('state_medical_licenses')
                .select('*')
                .eq('tenant_id', this.tenantId);

            if (error) throw error;

            const totalLicenses = data?.length || 0;
            const activeLicenses = data?.filter(license => 
                license.status === 'active' && new Date(license.expiration_date) > new Date()
            ).length || 0;

            const score = totalLicenses > 0 ? (activeLicenses / totalLicenses) * 100 : 100;

            return {
                score: Math.round(score),
                active: activeLicenses,
                total: totalLicenses,
                issues: this.getLicenseIssues(data || [])
            };
        } catch (error) {
            console.error('Error getting license compliance:', error);
            return { score: 0, error: error.message };
        }
    }

    // Get compliance status
    getComplianceStatus(score) {
        if (score >= 90) return 'Excellent';
        if (score >= 80) return 'Good';
        if (score >= 70) return 'Fair';
        if (score >= 60) return 'Poor';
        return 'Critical';
    }

    // Get license issues
    getLicenseIssues(licenses) {
        const issues = [];
        const expired = licenses.filter(license => 
            license.status === 'expired' || new Date(license.expiration_date) <= new Date()
        );

        if (expired.length > 0) {
            issues.push({
                priority: 'critical',
                category: 'Licensing',
                description: `${expired.length} expired license(s)`,
                action: 'Renew expired licenses immediately'
            });
        }

        return issues;
    }

    // Get urgent issues
    getUrgentIssues(licenseCompliance, reportingCompliance, inspectionCompliance) {
        return [
            ...(licenseCompliance.issues || []),
            ...(reportingCompliance?.issues || []),
            ...(inspectionCompliance?.issues || [])
        ].filter(issue => issue.priority === 'critical' || issue.priority === 'high');
    }
}

// Default State Compliance - For states without specific implementations
class DefaultStateCompliance {
    constructor(supabaseClient, tenantId, stateCode) {
        this.supabaseClient = supabaseClient;
        this.tenantId = tenantId;
        this.stateCode = stateCode;
    }

    async generateStateReport() {
        return {
            stateCode: this.stateCode,
            stateName: this.getStateName(this.stateCode),
            overallScore: 75, // Default score
            status: 'Fair',
            breakdown: {
                licensing: { score: 75 },
                reporting: { score: 75 },
                inspections: { score: 75 }
            },
            note: 'Using default compliance module - consider implementing state-specific requirements'
        };
    }

    getStateName(stateCode) {
        const stateNames = {
            'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
            'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'DC': 'District of Columbia',
            'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IN': 'Indiana',
            'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana',
            'ME': 'Maine', 'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan',
            'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana',
            'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
            'NM': 'New Mexico', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
            'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island',
            'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'UT': 'Utah',
            'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
            'WI': 'Wisconsin', 'WY': 'Wyoming'
        };
        return stateNames[stateCode] || stateCode;
    }

    // Validate state module integrity
    validateStateModule(module, stateCode) {
        try {
            const errors = [];
            const warnings = [];

            // Check required methods
            const requiredMethods = ['getRequirements', 'validateCompliance', 'getPenalties', 'getUpdates'];
            for (const method of requiredMethods) {
                if (typeof module[method] !== 'function') {
                    errors.push(`Missing required method: ${method}`);
                }
            }

            // Check module structure
            if (!module.stateCode || module.stateCode !== stateCode) {
                errors.push(`State code mismatch: expected ${stateCode}, got ${module.stateCode}`);
            }

            if (!module.version) {
                warnings.push('Module version not specified');
            }

            if (!module.lastUpdated) {
                warnings.push('Module last updated date not specified');
            }

            // Validate requirements structure
            if (module.getRequirements) {
                try {
                    const requirements = module.getRequirements();
                    if (!Array.isArray(requirements)) {
                        errors.push('getRequirements() must return an array');
                    } else {
                        // Validate each requirement
                        for (const req of requirements) {
                            if (!req.id || !req.title || !req.description) {
                                errors.push('Requirement missing required fields: id, title, description');
                            }
                            if (!req.severity || !['low', 'medium', 'high', 'critical'].includes(req.severity)) {
                                errors.push('Invalid severity level in requirement');
                            }
                        }
                    }
                } catch (error) {
                    errors.push(`Error calling getRequirements(): ${error.message}`);
                }
            }

            // Validate penalties structure
            if (module.getPenalties) {
                try {
                    const penalties = module.getPenalties();
                    if (!Array.isArray(penalties)) {
                        errors.push('getPenalties() must return an array');
                    } else {
                        for (const penalty of penalties) {
                            if (!penalty.violation || !penalty.penalty) {
                                errors.push('Penalty missing required fields: violation, penalty');
                            }
                        }
                    }
                } catch (error) {
                    errors.push(`Error calling getPenalties(): ${error.message}`);
                }
            }

            // Test validateCompliance method
            if (module.validateCompliance) {
                try {
                    const testResult = module.validateCompliance({
                        documents: [],
                        complianceData: {}
                    });
                    if (!testResult || typeof testResult.score !== 'number') {
                        errors.push('validateCompliance() must return an object with score property');
                    }
                } catch (error) {
                    errors.push(`Error calling validateCompliance(): ${error.message}`);
                }
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                moduleInfo: {
                    stateCode: module.stateCode,
                    version: module.version,
                    lastUpdated: module.lastUpdated,
                    hasUpdates: !!module.getUpdates
                }
            };
        } catch (error) {
            return {
                isValid: false,
                errors: [`Module validation failed: ${error.message}`],
                warnings: []
            };
        }
    }

    // Update state regulations from external source
    async updateStateRegulations(stateCode) {
        try {
            if (!this.supabaseClient) {
                throw new Error('Database connection required for state updates');
            }

            // Check if state is active for this tenant
            if (!this.activeStates.includes(stateCode)) {
                throw new Error(`State ${stateCode} is not active for this tenant`);
            }

            // Get latest regulations from external API or database
            const updatedRegulations = await this.fetchLatestRegulations(stateCode);

            if (!updatedRegulations) {
                throw new Error('No updated regulations available');
            }

            // Backup current module
            const currentModule = this.stateModules.get(stateCode);
            if (currentModule) {
                await this.backupStateModule(stateCode, currentModule);
            }

            // Update module with new regulations
            const updatedModule = await this.applyRegulationUpdates(stateCode, updatedRegulations);

            // Cache updated module
            this.stateModules.set(stateCode, updatedModule);

            // Log the update
            await this.logStateUpdate(stateCode, updatedRegulations);

            // Notify stakeholders
            await this.notifyStateUpdate(stateCode, updatedRegulations);

            console.log(`State regulations updated for ${stateCode}`);
            return updatedModule;
        } catch (error) {
            console.error(`Failed to update state regulations for ${stateCode}:`, error);
            throw error;
        }
    }

    // Fetch latest regulations from external source
    async fetchLatestRegulations(stateCode) {
        try {
            // In a real implementation, this would fetch from state regulatory APIs
            // For now, return mock data
            return {
                version: '2.0.0',
                lastUpdated: new Date().toISOString(),
                changes: [
                    {
                        type: 'requirement_added',
                        requirement: {
                            id: `${stateCode}_NEW_001`,
                            title: 'New Compliance Requirement',
                            description: 'Updated requirement for 2024',
                            severity: 'high'
                        }
                    }
                ]
            };
        } catch (error) {
            console.error('Error fetching latest regulations:', error);
            return null;
        }
    }

    // Apply regulation updates to state module
    async applyRegulationUpdates(stateCode, regulations) {
        try {
            const currentModule = this.stateModules.get(stateCode);
            if (!currentModule) {
                throw new Error(`No existing module found for state ${stateCode}`);
            }

            // Create updated module
            const updatedModule = {
                ...currentModule,
                version: regulations.version,
                lastUpdated: regulations.lastUpdated,
                changes: regulations.changes
            };

            // Apply changes to requirements
            if (regulations.changes) {
                for (const change of regulations.changes) {
                    switch (change.type) {
                        case 'requirement_added':
                            if (updatedModule.getRequirements) {
                                const currentReqs = updatedModule.getRequirements();
                                currentReqs.push(change.requirement);
                                updatedModule.getRequirements = () => currentReqs;
                            }
                            break;
                        case 'requirement_updated':
                            if (updatedModule.getRequirements) {
                                const currentReqs = updatedModule.getRequirements();
                                const index = currentReqs.findIndex(req => req.id === change.requirement.id);
                                if (index !== -1) {
                                    currentReqs[index] = change.requirement;
                                }
                                updatedModule.getRequirements = () => currentReqs;
                            }
                            break;
                        case 'requirement_removed':
                            if (updatedModule.getRequirements) {
                                const currentReqs = updatedModule.getRequirements();
                                const filteredReqs = currentReqs.filter(req => req.id !== change.requirementId);
                                updatedModule.getRequirements = () => filteredReqs;
                            }
                            break;
                    }
                }
            }

            return updatedModule;
        } catch (error) {
            console.error('Error applying regulation updates:', error);
            throw error;
        }
    }

    // Backup state module before update
    async backupStateModule(stateCode, module) {
        try {
            if (!this.supabaseClient) {
                return;
            }

            const backupData = {
                state_code: stateCode,
                module_data: module,
                backup_date: new Date().toISOString(),
                tenant_id: this.currentTenantId,
                created_by: this.currentUserId
            };

            const { error } = await this.supabaseClient
                .from('state_module_backups')
                .insert(backupData);

            if (error) {
                console.error('Failed to backup state module:', error);
            } else {
                console.log(`State module backed up for ${stateCode}`);
            }
        } catch (error) {
            console.error('Error backing up state module:', error);
        }
    }

    // Log state update
    async logStateUpdate(stateCode, regulations) {
        try {
            if (!this.supabaseClient) {
                return;
            }

            const logEntry = {
                state_code: stateCode,
                update_type: 'regulation_update',
                old_version: this.stateModules.get(stateCode)?.version,
                new_version: regulations.version,
                changes: regulations.changes,
                updated_at: new Date().toISOString(),
                tenant_id: this.currentTenantId,
                updated_by: this.currentUserId
            };

            const { error } = await this.supabaseClient
                .from('state_update_logs')
                .insert(logEntry);

            if (error) {
                console.error('Failed to log state update:', error);
            }
        } catch (error) {
            console.error('Error logging state update:', error);
        }
    }

    // Notify stakeholders of state update
    async notifyStateUpdate(stateCode, regulations) {
        try {
            // In a real implementation, this would send notifications
            console.log(`State update notification sent for ${stateCode}: ${regulations.changes.length} changes`);
        } catch (error) {
            console.error('Error sending state update notification:', error);
        }
    }

    // Resolve state conflicts
    async resolveStateConflicts(conflicts) {
        try {
            const resolutions = [];

            for (const conflict of conflicts) {
                const resolution = await this.resolveConflict(conflict);
                resolutions.push(resolution);
            }

            return resolutions;
        } catch (error) {
            console.error('Error resolving state conflicts:', error);
            throw error;
        }
    }

    // Resolve individual conflict
    async resolveConflict(conflict) {
        try {
            const { stateCode, conflictType, details } = conflict;

            switch (conflictType) {
                case 'requirement_conflict':
                    return await this.resolveRequirementConflict(stateCode, details);
                case 'penalty_conflict':
                    return await this.resolvePenaltyConflict(stateCode, details);
                case 'timeline_conflict':
                    return await this.resolveTimelineConflict(stateCode, details);
                default:
                    return {
                        stateCode,
                        conflictType,
                        resolution: 'manual_review_required',
                        message: 'Conflict requires manual review'
                    };
            }
        } catch (error) {
            console.error('Error resolving conflict:', error);
            return {
                stateCode: conflict.stateCode,
                conflictType: conflict.conflictType,
                resolution: 'error',
                message: error.message
            };
        }
    }

    // Resolve requirement conflict
    async resolveRequirementConflict(stateCode, details) {
        // Implement conflict resolution logic
        return {
            stateCode,
            conflictType: 'requirement_conflict',
            resolution: 'stricter_requirement',
            message: 'Applied stricter requirement to ensure compliance'
        };
    }

    // Resolve penalty conflict
    async resolvePenaltyConflict(stateCode, details) {
        // Implement penalty conflict resolution logic
        return {
            stateCode,
            conflictType: 'penalty_conflict',
            resolution: 'higher_penalty',
            message: 'Applied higher penalty to ensure compliance'
        };
    }

    // Resolve timeline conflict
    async resolveTimelineConflict(stateCode, details) {
        // Implement timeline conflict resolution logic
        return {
            stateCode,
            conflictType: 'timeline_conflict',
            resolution: 'earlier_deadline',
            message: 'Applied earlier deadline to ensure compliance'
        };
    }

    // Get state module health status
    async getStateModuleHealth() {
        try {
            const healthStatus = {};

            for (const stateCode of this.activeStates) {
                const module = this.stateModules.get(stateCode);
                if (module) {
                    const validation = this.validateStateModule(module, stateCode);
                    healthStatus[stateCode] = {
                        isValid: validation.isValid,
                        errorCount: validation.errors.length,
                        warningCount: validation.warnings.length,
                        version: module.version,
                        lastUpdated: module.lastUpdated,
                        lastValidated: new Date().toISOString()
                    };
                } else {
                    healthStatus[stateCode] = {
                        isValid: false,
                        errorCount: 1,
                        warningCount: 0,
                        version: 'unknown',
                        lastUpdated: 'unknown',
                        lastValidated: new Date().toISOString(),
                        errors: ['Module not loaded']
                    };
                }
            }

            return healthStatus;
        } catch (error) {
            console.error('Error getting state module health:', error);
            return {};
        }
    }
}

// Export for use in main application
window.StateComplianceFramework = StateComplianceFramework;