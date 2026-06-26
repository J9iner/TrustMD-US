// @ts-nocheck
// TrustMD Ohio State Compliance Module
// Comprehensive Ohio-specific regulatory compliance implementation

/**
 * @typedef {Object} SupabaseClient
 * @property {Object} supabase - Supabase client instance
 * @property {Function} supabase.from - Database query function
 */

/**
 * @typedef {Object} License
 * @property {string} id
 * @property {string} state_code
 * @property {string} status
 * @property {string} expiration_date
 */

/**
 * @typedef {Object} PrivacyPolicy
 * @property {string} id
 * @property {string} compliance_type
 * @property {string} status
 * @property {string} next_review_date
 */

/**
 * @typedef {Object} ReportingRequirement
 * @property {string} id
 * @property {string} reporting_agency
 * @property {string} reporting_type
 * @property {string} status
 */

/**
 * @typedef {Object} Inspection
 * @property {string} id
 * @property {string} inspection_date
 * @property {string} compliance_status
 */

/**
 * @typedef {Object} CMERecord
 * @property {string} id
 * @property {string} reporting_period_end
 * @property {number} completed_hours
 * @property {number} opioid_prescribing_hours
 * @property {number} controlled_substances_hours
 * @property {string} status
 */

/**
 * @typedef {Object} StateRequirement
 * @property {string} id
 * @property {string} requirement_type
 * @property {string} status
 */

/**
 * Ohio State Compliance Manager
 * Handles all Ohio-specific regulatory compliance requirements
 */
export default class OhioComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        /** @type {SupabaseClient} */
        this.supabaseClient = supabaseClient;
        /** @type {string} */
        this.tenantId = tenantId;
        /** @type {string} */
        this.stateCode = 'OH';
        /** @type {string} */
        this.stateName = 'Ohio';
        /** @type {number} */
        this.regulatoryBurden = 1.05; // Ohio has second Tier 2 regulatory burden
        
        // Ohio-specific requirements
        /** @type {Object} */
        this.requirements = {
            medicalBoard: {
                licenseRenewal: 'biennial',
                cmeHours: 50,
                cmeCycle: '2 years',
                opioidPrescribingHours: 1,
                controlledSubstancesHours: 0,
                telemedicineRequired: true,
                prescriptionMonitoring: 'mandatory',
                opioidLimits: true
            },
            privacy: {
                dataBreachNotification: '30 days',
                privacyAct: 'Ohio Data Protection Act',
                marketingConsent: 'required',
                dataRetention: '5 years',
                patientRights: 'enhanced'
            },
            reporting: {
                infectiousDiseases: 'immediate',
                adverseEvents: '24 hours',
                dataBreaches: '30 days',
                qualityMetrics: 'annual',
                dohInspections: 'biennial'
            },
            inspections: {
                frequency: 'biennial',
                unannounced: false,
                scope: 'comprehensive',
                enforcement: 'moderate'
            }
        };
    }

    // Generate Ohio-specific compliance report
    /**
     * @returns {Promise<Object>} Compliance report object
     */
    async generateStateReport() {
        try {
            const [
                medicalBoardCompliance,
                privacyCompliance,
                reportingCompliance,
                inspectionCompliance,
                cmeCompliance,
                specificRequirements
            ] = await Promise.all([
                this.getMedicalBoardCompliance(),
                this.getPrivacyCompliance(),
                this.getReportingCompliance(),
                this.getInspectionCompliance(),
                this.getCMECompliance(),
                this.getSpecificRequirementsCompliance()
            ]);

            // Calculate weighted score with Ohio-specific factors
            const overallScore = Math.round(
                medicalBoardCompliance.score * 0.30 +      // Medical Board (30%)
                privacyCompliance.score * 0.20 +          // Privacy (20%)
                reportingCompliance.score * 0.20 +        // Reporting (20%)
                inspectionCompliance.score * 0.15 +       // Inspections (15%)
                cmeCompliance.score * 0.10 +              // CME (10%)
                specificRequirements.score * 0.05         // Specific (5%)
            );

            const report = {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore,
                status: this.getComplianceStatus(overallScore),
                regulatoryBurden: this.regulatoryBurden,
                breakdown: {
                    medicalBoard: medicalBoardCompliance,
                    privacy: privacyCompliance,
                    reporting: reportingCompliance,
                    inspections: inspectionCompliance,
                    cme: cmeCompliance,
                    specific: specificRequirements
                },
                urgentIssues: this.getUrgentIssues(medicalBoardCompliance, privacyCompliance, reportingCompliance, inspectionCompliance),
                ohioSpecific: {
                    dataProtectionCompliance: privacyCompliance.dataProtectionStatus,
                    oarrsCompliance: specificRequirements.oarrsStatus,
                    telemedicineCompliance: specificRequirements.telemedicineStatus,
                    opioidPrescribingCompliance: cmeCompliance.opioidPrescribingStatus
                },
                recommendations: this.generateOhioRecommendations(overallScore, {
                    medicalBoard: medicalBoardCompliance,
                    privacy: privacyCompliance,
                    reporting: reportingCompliance,
                    inspections: inspectionCompliance,
                    cme: cmeCompliance,
                    specific: specificRequirements
                }),
                lastUpdated: new Date().toISOString()
            };

            return report;
        } catch (/** @type {any} */ error) {
            console.error('Error generating Ohio compliance report:', error);
            return { error: error?.message || 'Unknown error', stateCode: this.stateCode };
        }
    }

    // Ohio State Medical Board compliance
    /**
     * @returns {Promise<Object>} Medical board compliance data
     */
    async getMedicalBoardCompliance() {
        try {
            const { data: licenses, error } = await this.supabaseClient.supabase
                .from('state_medical_licenses')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .eq('state_code', this.stateCode);

            if (error) throw error;

            const totalLicenses = licenses?.length || 0;
            const activeLicenses = licenses?.filter(/** @type {License} */ (license) => 
                license.status === 'active' && new Date(license.expiration_date) > new Date()
            ).length || 0;

            let score = totalLicenses > 0 ? (activeLicenses / totalLicenses) * 100 : 100;

            // Check for Ohio-specific requirements
            const issues = [];
            const ohLicenses = licenses || [];

            // Check expiring licenses (Ohio requires 90-day notice)
            const expiringSoon = ohLicenses.filter(/** @type {License} */ (license) => {
                const expirationDate = new Date(license.expiration_date);
                const ninetyDaysFromNow = new Date();
                ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
                return expirationDate <= ninetyDaysFromNow && expirationDate > new Date();
            });

            if (expiringSoon.length > 0) {
                score -= 15;
                issues.push({
                    priority: 'high',
                    description: `${expiringSoon.length} Ohio license(s) expiring within 90 days`,
                    action: 'Initiate Ohio State Medical Board renewal process immediately'
                });
            }

            // Check for expired licenses
            const expired = ohLicenses.filter(/** @type {License} */ (license) => 
                license.status === 'expired' || new Date(license.expiration_date) <= new Date()
            );

            if (expired.length > 0) {
                score -= 25;
                issues.push({
                    priority: 'critical',
                    description: `${expired.length} expired Ohio license(s)`,
                    action: 'Contact Ohio State Medical Board immediately for reinstatement'
                });
            }

            return {
                score: Math.max(0, Math.round(score)),
                active: activeLicenses,
                total: totalLicenses,
                expiringSoon: expiringSoon.length,
                expired: expired.length,
                issues,
                boardStatus: this.getMedicalBoardStatus(ohLicenses)
            };
        } catch (/** @type {any} */ error) {
            console.error('Error getting Medical Board compliance:', error);
            return { score: 0, error: error?.message || 'Unknown error' };
        }
    }

    // Ohio data protection and privacy compliance
    /**
     * @returns {Promise<Object>} Privacy compliance data
     */
    async getPrivacyCompliance() {
        try {
            const { data: privacyPolicies, error } = await this.supabaseClient.supabase
                .from('state_privacy_compliance')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .eq('state_code', this.stateCode);

            if (error) throw error;

            const totalPolicies = privacyPolicies?.length || 0;
            const activePolicies = privacyPolicies?.filter(/** @type {PrivacyPolicy} */ (policy) => 
                policy.status === 'active' && new Date(policy.next_review_date) > new Date()
            ).length || 0;

            let score = totalPolicies > 0 ? (activePolicies / totalPolicies) * 100 : 85; // Default to 85 if no policies

            const issues = [];

            // Check for Ohio-specific data protection requirements
            const dataProtectionPolicies = privacyPolicies?.filter(/** @type {PrivacyPolicy} */ (policy) => 
                policy.compliance_type === 'data_breach_notification' ||
                policy.compliance_type === 'data_protection'
            ) || [];

            if (dataProtectionPolicies.length === 0) {
                score -= 20;
                issues.push({
                    priority: 'high',
                    description: 'No Ohio data protection policies found',
                    action: 'Implement Ohio Data Protection Act compliance policies'
                });
            }

            // Check for privacy policies
            const privacyPolicyPolicies = privacyPolicies?.filter(/** @type {PrivacyPolicy} */ (policy) => 
                policy.compliance_type === 'patient_privacy'
            ) || [];

            if (privacyPolicyPolicies.length === 0) {
                score -= 15;
                issues.push({
                    priority: 'medium',
                    description: 'No Ohio privacy policies documented',
                    action: 'Implement comprehensive Ohio privacy policies'
                });
            }

            return {
                score: Math.max(0, Math.round(score)),
                dataProtectionStatus: dataProtectionPolicies.length > 0 ? 'compliant' : 'non_compliant',
                breachNotificationStatus: dataProtectionPolicies.length > 0 ? 'implemented' : 'missing',
                totalPolicies,
                activePolicies,
                issues
            };
        } catch (/** @type {any} */ error) {
            console.error('Error getting privacy compliance:', error);
            return { score: 0, error: error?.message || 'Unknown error' };
        }
    }

    // Ohio reporting compliance
    /**
     * @returns {Promise<Object>} Reporting compliance data
     */
    async getReportingCompliance() {
        try {
            const { data: reportingRequirements, error } = await this.supabaseClient.supabase
                .from('state_reporting_requirements')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .eq('state_code', this.stateCode);

            if (error) throw error;

            const totalRequirements = reportingRequirements?.length || 0;
            const compliantRequirements = reportingRequirements?.filter(/** @type {ReportingRequirement} */ (req) => req.status !== 'overdue').length || 0;

            let score = totalRequirements > 0 ? (compliantRequirements / totalRequirements) * 100 : 90;

            const issues = [];

            // Check for overdue reports
            const overdue = reportingRequirements?.filter(/** @type {ReportingRequirement} */ (req) => req.status === 'overdue') || [];
            if (overdue.length > 0) {
                score -= 20;
                issues.push({
                    priority: 'critical',
                    description: `${overdue.length} overdue Ohio report(s)`,
                    action: 'Submit overdue reports to Ohio DOH immediately'
                });
            }

            // Check for Ohio-specific reporting requirements
            const dohReports = reportingRequirements?.filter(/** @type {ReportingRequirement} */ (req) => 
                req.reporting_agency?.includes('DOH') || 
                req.reporting_type?.includes('infectious_disease')
            ) || [];

            if (dohReports.length === 0) {
                score -= 10;
                issues.push({
                    priority: 'medium',
                    description: 'No Ohio DOH reporting requirements configured',
                    action: 'Set up Ohio Department of Health reporting'
                });
            }

            return {
                score: Math.max(0, Math.round(score)),
                compliant: compliantRequirements,
                overdue: overdue.length,
                total: totalRequirements,
                dohReports: dohReports.length,
                issues
            };
        } catch (/** @type {any} */ error) {
            console.error('Error getting reporting compliance:', error);
            return { score: 0, error: error?.message || 'Unknown error' };
        }
    }

    // Ohio inspection compliance
    /**
     * @returns {Promise<Object>} Inspection compliance data
     */
    async getInspectionCompliance() {
        try {
            const { data: inspections, error } = await this.supabaseClient.supabase
                .from('state_inspection_records')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .eq('state_code', this.stateCode)
                .gte('inspection_date', new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString())
                .order('inspection_date', { ascending: false });

            if (error) throw error;

            const totalInspections = inspections?.length || 0;
            const compliantInspections = inspections?.filter(/** @type {Inspection} */ (inspection) => 
                inspection.compliance_status === 'compliant'
            ).length || 0;

            let score = totalInspections > 0 ? (compliantInspections / totalInspections) * 100 : 85;

            const issues = [];

            // Check for non-compliant inspections
            const nonCompliant = inspections?.filter(/** @type {Inspection} */ (inspection) => 
                inspection.compliance_status === 'non_compliant'
            ) || [];

            if (nonCompliant.length > 0) {
                score -= 25;
                issues.push({
                    priority: 'high',
                    description: `${nonCompliant.length} non-compliant Ohio inspection(s)`,
                    action: 'Address Ohio DOH inspection violations immediately'
                });
            }

            // Check if last inspection was over 30 months ago (Ohio inspects biennially)
            const lastInspection = inspections?.[0];
            if (lastInspection) {
                const monthsSinceLast = (new Date() - new Date(lastInspection.inspection_date)) / (1000 * 60 * 60 * 24 * 30);
                if (monthsSinceLast > 30) {
                    score -= 15;
                    issues.push({
                        priority: 'medium',
                        description: `Last Ohio inspection was ${Math.round(monthsSinceLast)} months ago`,
                        action: 'Prepare for potential Ohio DOH inspection - ensure readiness'
                    });
                }
            }

            return {
                score: Math.max(0, Math.round(score)),
                compliant: compliantInspections,
                nonCompliant: nonCompliant.length,
                total: totalInspections,
                lastInspection: lastInspection?.inspection_date || null,
                monthsSinceLast: lastInspection ? Math.round((new Date() - new Date(lastInspection.inspection_date)) / (1000 * 60 * 60 * 24 * 30)) : null,
                issues
            };
        } catch (/** @type {any} */ error) {
            console.error('Error getting inspection compliance:', error);
            return { score: 0, error: error?.message || 'Unknown error' };
        }
    }

    // Ohio CME compliance
    /**
     * @returns {Promise<Object>} CME compliance data
     */
    async getCMECompliance() {
        try {
            const { data: cmeRecords, error } = await this.supabaseClient.supabase
                .from('state_continuing_education')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .eq('state_code', this.stateCode);

            if (error) throw error;

            // Filter for current reporting periods (2-year cycle)
            const currentPeriods = cmeRecords?.filter(/** @type {CMERecord} */ (cme) => {
                const endDate = new Date(cme.reporting_period_end);
                const twoYearsAgo = new Date();
                twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
                return endDate >= twoYearsAgo;
            }) || [];

            const totalPeriods = currentPeriods.length;
            const compliantPeriods = currentPeriods.filter(/** @type {CMERecord} */ (cme) => 
                cme.completed_hours >= this.requirements.medicalBoard.cmeHours && cme.status === 'completed'
            ).length;

            let score = totalPeriods > 0 ? (compliantPeriods / totalPeriods) * 100 : 75;

            const issues = [];
            let opioidPrescribingCompliant = true;

            // Check Ohio-specific CME requirements
            currentPeriods.forEach(/** @type {CMERecord} */ (cme) => {
                // Opioid prescribing CME (1 hour required - Ohio specific)
                if ((cme.opioid_prescribing_hours || 0) < this.requirements.medicalBoard.opioidPrescribingHours) {
                    score -= 10;
                    opioidPrescribingCompliant = false;
                    issues.push({
                        priority: 'high',
                        description: `Insufficient opioid prescribing CME hours (${cme.opioid_prescribing_hours || 0}/${this.requirements.medicalBoard.opioidPrescribingHours})`,
                        action: 'Complete Ohio-mandated opioid prescribing CME'
                    });
                }
            });

            // Check for expiring CME periods
            const expiringSoon = currentPeriods.filter(/** @type {CMERecord} */ (cme) => {
                const endDate = new Date(cme.reporting_period_end);
                const ninetyDaysFromNow = new Date();
                ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
                return endDate <= ninetyDaysFromNow && cme.status !== 'completed';
            });

            if (expiringSoon.length > 0) {
                score -= 5;
                issues.push({
                    priority: 'medium',
                    description: `${expiringSoon.length} CME period(s) expiring within 90 days`,
                    action: 'Complete remaining CME hours before deadline'
                });
            }

            return {
                score: Math.max(0, Math.round(score)),
                compliant: compliantPeriods,
                total: totalPeriods,
                expiringSoon: expiringSoon.length,
                requiredHours: this.requirements.medicalBoard.cmeHours,
                cmeCycle: this.requirements.medicalBoard.cmeCycle,
                opioidPrescribingRequired: this.requirements.medicalBoard.opioidPrescribingHours,
                opioidPrescribingStatus: opioidPrescribingCompliant ? 'compliant' : 'non_compliant',
                issues
            };
        } catch (/** @type {any} */ error) {
            console.error('Error getting CME compliance:', error);
            return { score: 0, error: error?.message || 'Unknown error' };
        }
    }

    // Ohio-specific requirements compliance
    /**
     * @returns {Promise<Object>} Specific requirements compliance data
     */
    async getSpecificRequirementsCompliance() {
        try {
            const { data: requirements, error } = await this.supabaseClient.supabase
                .from('state_specific_requirements')
                .select('*')
                .eq('tenant_id', this.tenantId)
                .eq('state_code', this.stateCode);

            if (error) throw error;

            const totalRequirements = requirements?.length || 0;
            const completedRequirements = requirements?.filter(/** @type {StateRequirement} */ (req) => req.status === 'completed').length || 0;

            let score = totalRequirements > 0 ? (completedRequirements / totalRequirements) * 100 : 80;

            const issues = [];

            // Check Ohio OARRS compliance
            const oarrsRequirements = requirements?.filter(/** @type {StateRequirement} */ (req) => 
                req.requirement_type === 'prescription_monitoring'
            ) || [];

            const oarrsCompliant = oarrsRequirements.some(req => req.status === 'completed');
            if (!oarrsCompliant) {
                score -= 15;
                issues.push({
                    priority: 'high',
                    description: 'Ohio OARRS (Automated Rx Reporting System) not compliant',
                    action: 'Enroll in Ohio OARRS system'
                });
            }

            // Check telemedicine compliance
            const telemedicineRequirements = requirements?.filter(/** @type {StateRequirement} */ (req) => 
                req.requirement_type === 'telemedicine'
            ) || [];

            const telemedicineCompliant = telemedicineRequirements.some(req => req.status === 'completed');
            if (!telemedicineCompliant) {
                score -= 10;
                issues.push({
                    priority: 'medium',
                    description: 'Ohio telemedicine requirements not met',
                    action: 'Implement Ohio telemedicine compliance policies'
                });
            }

            // Check opioid prescribing limits
            const opioidRequirements = requirements?.filter(/** @type {StateRequirement} */ (req) => 
                req.requirement_type === 'opioid_training'
            ) || [];

            const opioidCompliant = opioidRequirements.some(req => req.status === 'completed');
            if (!opioidCompliant) {
                score -= 10;
                issues.push({
                    priority: 'high',
                    description: 'Ohio opioid prescribing limits not addressed',
                    action: 'Implement Ohio opioid prescribing guidelines'
                });
            }

            return {
                score: Math.max(0, Math.round(score)),
                completed: completedRequirements,
                total: totalRequirements,
                oarrsStatus: oarrsCompliant ? 'compliant' : 'non_compliant',
                telemedicineStatus: telemedicineCompliant ? 'compliant' : 'non_compliant',
                opioidLimitsStatus: opioidCompliant ? 'compliant' : 'non_compliant',
                issues
            };
        } catch (/** @type {any} */ error) {
            console.error('Error getting specific requirements compliance:', error);
            return { score: 0, error: error?.message || 'Unknown error' };
        }
    }

    // Get Medical Board status
    /**
     * @param {License[]} licenses - Array of license objects
     * @returns {string} Medical board status
     */
    getMedicalBoardStatus(licenses) {
        if (!licenses || licenses.length === 0) return 'no_licenses';
        
        const expired = licenses.filter(/** @type {License} */ (license) => 
            license.status === 'expired' || new Date(license.expiration_date) <= new Date()
        );
        
        if (expired.length > 0) return 'violations';
        
        const expiringSoon = licenses.filter(/** @type {License} */ (license) => {
            const expirationDate = new Date(license.expiration_date);
            const ninetyDaysFromNow = new Date();
            ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
            return expirationDate <= ninetyDaysFromNow;
        });
        
        if (expiringSoon.length > 0) return 'attention_needed';
        
        return 'good_standing';
    }

    // Get compliance status
    /**
     * @param {number} score - Compliance score
     * @returns {string} Compliance status
     */
    getComplianceStatus(score) {
        if (score >= 95) return 'Excellent';
        if (score >= 85) return 'Good';
        if (score >= 75) return 'Fair';
        if (score >= 65) return 'Poor';
        return 'Critical';
    }

    // Get urgent issues
    /**
     * @param {Object} medicalBoard - Medical board compliance data
     * @param {Object} privacy - Privacy compliance data
     * @param {Object} reporting - Reporting compliance data
     * @param {Object} inspections - Inspection compliance data
     * @returns {Array} Array of urgent issues
     */
    getUrgentIssues(medicalBoard, privacy, reporting, inspections) {
        const allIssues = [
            ...(medicalBoard.issues || []),
            ...(privacy.issues || []),
            ...(reporting.issues || []),
            ...(inspections.issues || [])
        ];

        return allIssues
            .filter(issue => issue.priority === 'critical' || issue.priority === 'high')
            .sort((a, b) => {
                const priority = { critical: 4, high: 3, medium: 2, low: 1 };
                return priority[b.priority] - priority[a.priority];
            })
            .slice(0, 5);
    }

    // Generate Ohio-specific recommendations
    /**
     * @param {number} overallScore - Overall compliance score
     * @param {Object} breakdown - Compliance breakdown
     * @returns {Array} Array of recommendations
     */
    generateOhioRecommendations(overallScore, breakdown) {
        const recommendations = [];

        // Medical Board recommendations
        if (breakdown.medicalBoard.score < 90) {
            recommendations.push({
                priority: 'high',
                category: 'Medical Board',
                action: 'Review Ohio State Medical Board compliance requirements',
                cost: '$1,000 - $3,500',
                timeframe: '30-60 days',
                ohioSpecific: true
            });
        }

        // Data protection recommendations
        if (breakdown.privacy.score < 85) {
            recommendations.push({
                priority: 'high',
                category: 'Privacy',
                action: 'Implement Ohio Data Protection Act compliance',
                cost: '$2,000 - $5,500',
                timeframe: '45-90 days',
                ohioSpecific: true
            });
        }

        // DOH reporting recommendations
        if (breakdown.reporting.score < 90) {
            recommendations.push({
                priority: 'high',
                category: 'Reporting',
                action: 'Ensure Ohio DOH reporting compliance and deadlines',
                cost: '$1,500 - $4,500',
                timeframe: '30-45 days',
                ohioSpecific: true
            });
        }

        // CME recommendations
        if (breakdown.cme.score < 85) {
            recommendations.push({
                priority: 'medium',
                category: 'CME',
                action: 'Complete Ohio-specific CME requirements (opioid prescribing)',
                cost: '$600 - $1,500',
                timeframe: '60-120 days',
                ohioSpecific: true
            });
        }

        // OARRS recommendations
        if (breakdown.specific.oarrsStatus === 'non_compliant') {
            recommendations.push({
                priority: 'high',
                category: 'Prescription Monitoring',
                action: 'Enroll and comply with Ohio OARRS requirements',
                cost: '$300 - $800',
                timeframe: '30 days',
                ohioSpecific: true
            });
        }

        return recommendations.sort((a, b) => {
            const priority = { high: 3, medium: 2, low: 1 };
            return priority[b.priority] - priority[a.priority];
        });
    }

    // Get upcoming Ohio requirements
    /**
     * @param {number} daysAhead - Number of days ahead to look for requirements
     * @returns {Promise<Array>} Array of upcoming requirements
     */
    async getUpcomingRequirements(daysAhead = 30) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .rpc('get_upcoming_state_requirements', {
                    p_tenant_id: this.tenantId,
                    p_days_ahead: daysAhead
                });

            if (error) throw error;

            // Filter for Ohio-specific requirements and add Ohio context
            const ohRequirements = (data || [])
                .filter(req => req.state === this.stateCode)
                .map(req => ({
                    ...req,
                    ohioContext: this.getOhioContext(req.requirement_type)
                }));

            return ohRequirements;
        } catch (/** @type {any} */ error) {
            console.error('Error getting upcoming Ohio requirements:', error);
            return [];
        }
    }

    // Get Ohio-specific context for requirements
    /**
     * @param {string} requirementType - Type of requirement
     * @returns {Object} Ohio context information
     */
    getOhioContext(requirementType) {
        const contextMap = {
            'license_renewal': {
                agency: 'Ohio State Medical Board',
                deadline: '90 days before expiration',
                penalty: 'Practice prohibition',
                notes: 'Ohio requires early renewal submission'
            },
            'continuing_education': {
                agency: 'Ohio State Medical Board',
                deadline: 'Biennial renewal date',
                penalty: 'License suspension',
                notes: '50 hours over 2 years + 1 opioid prescribing'
            },
            'reporting_deadline': {
                agency: 'Ohio DOH',
                deadline: 'Varies by report type',
                penalty: 'Fines up to $2,500 per violation',
                notes: 'Moderate enforcement by Ohio Department of Health'
            }
        };

        return contextMap[requirementType] || {
            agency: 'Ohio Regulatory Agency',
            deadline: 'Varies',
            penalty: 'Varies',
            notes: 'Ohio-specific requirements apply'
        };
    }

    // Get Ohio dashboard data
    /**
     * @returns {Promise<Object>} Dashboard data
     */
    async getDashboardData() {
        try {
            const report = await this.generateStateReport();
            const upcoming = await this.getUpcomingRequirements(60);

            return {
                stateCode: this.stateCode,
                stateName: this.stateName,
                overallScore: report.overallScore,
                status: report.status,
                regulatoryBurden: this.regulatoryBurden,
                keyMetrics: {
                    medicalBoardStatus: report.breakdown.medicalBoard.boardStatus,
                    dataProtectionCompliance: report.ohioSpecific.dataProtectionCompliance,
                    oarrsCompliance: report.ohioSpecific.oarrsCompliance,
                    telemedicineCompliance: report.ohioSpecific.telemedicineCompliance,
                    opioidPrescribingCompliance: report.ohioSpecific.opioidPrescribingCompliance
                },
                upcomingDeadlines: upcoming.slice(0, 5),
                urgentIssues: report.urgentIssues.slice(0, 3),
                ohioAlerts: this.getOhioAlerts(report),
                lastUpdated: new Date().toISOString()
            };
        } catch (/** @type {any} */ error) {
            console.error('Error getting Ohio dashboard data:', error);
            return { error: error?.message || 'Unknown error' };
        }
    }

    // Get Ohio-specific alerts
    /**
     * @param {Object} report - Compliance report
     * @returns {Array} Array of alerts
     */
    getOhioAlerts(report) {
        const alerts = [];

        // Tier 2 regulatory burden alert
        if (report.overallScore < 80) {
            alerts.push({
                type: 'info',
                title: 'Tier 2 Regulatory Burden',
                message: 'Ohio has a moderate regulatory burden (1.05x) as our second Tier 2 state.',
                priority: 'low'
            });
        }

        // Data protection alert
        if (report.ohioSpecific.dataProtectionCompliance === 'non_compliant') {
            alerts.push({
                type: 'error',
                title: 'Data Protection Risk',
                message: 'Ohio Data Protection Act compliance required. Penalties up to $100,000 per violation.',
                priority: 'critical'
            });
        }

        // DOH inspection alert
        if (report.breakdown.inspections.monthsSinceLast > 24) {
            alerts.push({
                type: 'warning',
                title: 'Ohio DOH Inspection Due',
                message: 'Ohio inspections occur biennially. Prepare for potential inspection.',
                priority: 'medium'
            });
        }

        return alerts;
    }

    // Add Ohio compliance data
    /**
     * @param {Object} complianceData - Compliance data to add
     * @returns {Promise<Object>} Added compliance data
     */
    async addComplianceData(complianceData) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('state_specific_requirements')
                .insert([{
                    ...complianceData,
                    tenant_id: this.tenantId,
                    state_code: this.stateCode
                }])
                .select();

            if (error) throw error;
            return data[0];
        } catch (/** @type {any} */ error) {
            console.error('Error adding Ohio compliance data:', error);
            throw error;
        }
    }
}