// TrustMD DEA Compliance Template
// Drug Enforcement Administration registration and controlled substance compliance

export default class DEAComplianceTemplate {
    constructor() {
        this.template = {
            id: 'dea-federal-v2024',
            name: 'DEA Compliance',
            category: 'federal',
            subcategory: 'dea',
            version: '2024.1',
            lastUpdated: '2024-01-15',
            description: 'Drug Enforcement Administration registration and controlled substance compliance',
            regulatoryReferences: [
                '21 CFR Part 1300 - Controlled Substances',
                '21 CFR Part 1301 - Registration',
                '21 CFR Part 1304 - Prescriptions',
                '21 CFR Part 1305 - Recordkeeping and Reporting',
                '21 CFR Part 1311 - Security'
            ],
            sections: [
                {
                    id: 'registration',
                    name: 'DEA Registration',
                    weight: 0.30,
                    requirements: [
                        {
                            id: 'active-registration',
                            name: 'Active DEA Registration',
                            description: 'Current and valid DEA registration for all practitioners',
                            mandatory: true,
                            evidenceRequired: ['DEA certificate', 'Registration renewal documents', 'State license correlation'],
                            automatedChecks: ['registration_current', 'state_license_match'],
                            riskLevel: 'critical',
                            points: 20
                        },
                        {
                            id: 'registration-display',
                            name: 'Registration Display',
                            description: 'DEA registration displayed in public areas',
                            mandatory: true,
                            evidenceRequired: ['Display location photos', 'Registration visibility verification'],
                            automatedChecks: ['registration_displayed'],
                            riskLevel: 'medium',
                            points: 10
                        },
                        {
                            id: 'renewal-tracking',
                            name: 'Registration Renewal Tracking',
                            description: 'System for tracking DEA registration renewals',
                            mandatory: true,
                            evidenceRequired: ['Renewal tracking system', 'Renewal notifications', 'Renewal history'],
                            automatedChecks: ['renewal_tracked', 'notifications_sent'],
                            riskLevel: 'high',
                            points: 10
                        },
                        {
                            id: 'state-registration',
                            name: 'State Controlled Substance Registration',
                            description: 'State-level controlled substance registration where required',
                            mandatory: true,
                            evidenceRequired: ['State registration certificates', 'Registration correlation with DEA'],
                            automatedChecks: ['state_registration_current', 'correlation_verified'],
                            riskLevel: 'critical',
                            points: 15
                        }
                    ]
                },
                {
                    id: 'record-keeping',
                    name: 'Controlled Substance Records',
                    weight: 0.35,
                    requirements: [
                        {
                            id: 'inventory-records',
                            name: 'Biennial Inventory',
                            description: 'Complete biennial inventory of controlled substances',
                            mandatory: true,
                            evidenceRequired: ['Inventory forms', 'Schedule II-V inventories', 'Signature documentation'],
                            automatedChecks: ['inventory_current', 'all_schedules_included'],
                            riskLevel: 'high',
                            points: 15
                        },
                        {
                            id: 'dispensing-records',
                            name: 'Dispensing Records',
                            description: 'Accurate and complete dispensing records',
                            mandatory: true,
                            evidenceRequired: ['Dispensing logs', 'Patient records', 'DEA Form-222 documentation'],
                            automatedChecks: ['records_complete', 'form_222_used'],
                            riskLevel: 'high',
                            points: 15
                        },
                        {
                            id: 'theft-loss',
                            name: 'Theft and Loss Reporting',
                            description: 'Reporting of theft or loss of controlled substances',
                            mandatory: true,
                            evidenceRequired: ['Theft reports', 'DEA notifications', 'Law enforcement documentation'],
                            automatedChecks: ['theft_reported_timely', 'dea_notified'],
                            riskLevel: 'critical',
                            points: 10
                        },
                        {
                            id: 'record-retention',
                            name: 'Record Retention',
                            description: 'Maintain records for required retention periods',
                            mandatory: true,
                            evidenceRequired: ['Record retention policy', 'Storage documentation', 'Retention schedule'],
                            automatedChecks: ['retention_policy_current', 'records_maintained'],
                            riskLevel: 'medium',
                            points: 5
                        },
                        {
                            id: 'electronic-records',
                            name: 'Electronic Record System',
                            description: 'Electronic system for controlled substance tracking',
                            mandatory: false,
                            evidenceRequired: ['Electronic system documentation', 'System validation', 'Backup procedures'],
                            automatedChecks: ['electronic_system_active', 'backup_procedures_documented'],
                            riskLevel: 'medium',
                            points: 5
                        }
                    ]
                },
                {
                    id: 'prescribing',
                    name: 'Prescribing Practices',
                    weight: 0.25,
                    requirements: [
                        {
                            id: 'prescription-forms',
                            name: 'Official Prescription Forms',
                            description: 'Use of official DEA prescription forms for Schedule II',
                            mandatory: true,
                            evidenceRequired: ['Form-222 usage logs', 'Form accountability records'],
                            automatedChecks: ['form_222_used_properly'],
                            riskLevel: 'high',
                            points: 15
                        },
                        {
                            id: 'pmp-checks',
                            name: 'PDMP/PMP Checks',
                            description: 'Prescription drug monitoring program checks',
                            mandatory: true,
                            evidenceRequired: ['PMP query logs', 'Patient consent forms', 'Query documentation'],
                            automatedChecks: ['pmp_checked_before_prescribing'],
                            riskLevel: 'high',
                            points: 10
                        },
                        {
                            id: 'prescription-monitoring',
                            name: 'Prescription Monitoring',
                            description: 'Monitoring of controlled substance prescriptions',
                            mandatory: true,
                            evidenceRequired: ['Prescription monitoring logs', 'Suspicious activity reports', 'Review procedures'],
                            automatedChecks: ['monitoring_active', 'reviews_conducted'],
                            riskLevel: 'medium',
                            points: 5
                        },
                        {
                            id: 'patient-verification',
                            name: 'Patient Identity Verification',
                            description: 'Procedures for verifying patient identity',
                            mandatory: true,
                            evidenceRequired: ['Verification procedures', 'ID documentation requirements', 'Verification logs'],
                            automatedChecks: ['verification_procedures_documented', 'verification_completed'],
                            riskLevel: 'medium',
                            points: 5
                        }
                    ]
                },
                {
                    id: 'storage',
                    name: 'Storage and Security',
                    weight: 0.10,
                    requirements: [
                        {
                            id: 'secure-storage',
                            name: 'Secure Storage',
                            description: 'Locked storage for controlled substances',
                            mandatory: true,
                            evidenceRequired: ['Storage specifications', 'Access logs', 'Key control documentation'],
                            automatedChecks: ['storage_secured', 'access_logged'],
                            riskLevel: 'medium',
                            points: 5
                        },
                        {
                            id: 'alarm-systems',
                            name: 'Alarm Systems',
                            description: 'Alarm systems for controlled substance storage',
                            mandatory: false,
                            evidenceRequired: ['Alarm system documentation', 'Monitoring records', 'Test logs'],
                            automatedChecks: ['alarm_active', 'monitoring_active'],
                            riskLevel: 'medium',
                            points: 5
                        },
                        {
                            id: 'access-control',
                            name: 'Access Control',
                            description: 'Limited access to authorized personnel only',
                            mandatory: true,
                            evidenceRequired: ['Access control policies', 'Authorization lists', 'Access logs'],
                            automatedChecks: ['access_control_active', 'authorization_current'],
                            riskLevel: 'medium',
                            points: 5
                        },
                        {
                            id: 'security-assessments',
                            name: 'Security Assessments',
                            description: 'Regular security assessments of storage areas',
                            mandatory: true,
                            evidenceRequired: ['Security assessment reports', 'Vulnerability assessments', 'Remediation plans'],
                            automatedChecks: ['assessments_current', 'remediation_tracked'],
                            riskLevel: 'medium',
                            points: 5
                        }
                    ]
                }
            ],
            scoring: {
                totalPoints: 100,
                passingScore: 90,
                criticalRequirements: [
                    'active-registration',
                    'state-registration',
                    'inventory-records',
                    'dispensing-records',
                    'theft-loss',
                    'prescription-forms',
                    'pmp-checks'
                ],
                automatedChecks: [
                    'registration_current',
                    'state_license_match',
                    'state_registration_current',
                    'inventory_current',
                    'records_complete',
                    'theft_reported_timely',
                    'form_222_used_properly',
                    'pmp_checked_before_prescribing',
                    'storage_secured',
                    'access_logged'
                ]
            }
        };
    }

    // Get template
    getTemplate() {
        return this.template;
    }

    // Calculate score for this template
    calculateScore(complianceData) {
        // This would be implemented by the scoring engine
        // Placeholder for template-specific scoring logic if needed
        return null;
    }

    // Validate requirements
    validateRequirements(data) {
        // This would be implemented by the validation engine
        // Placeholder for template-specific validation logic if needed
        return null;
    }

    // Get automated checks
    getAutomatedChecks() {
        const checks = [];
        for (const section of this.template.sections) {
            for (const requirement of section.requirements) {
                if (requirement.automatedChecks) {
                    checks.push(...requirement.automatedChecks);
                }
            }
        }
        return [...new Set(checks)]; // Remove duplicates
    }

    // Get critical requirements
    getCriticalRequirements() {
        return this.template.scoring.criticalRequirements;
    }

    // Get sections
    getSections() {
        return this.template.sections;
    }

    // Get requirements by section
    getRequirementsBySection(sectionId) {
        const section = this.template.sections.find(s => s.id === sectionId);
        return section ? section.requirements : [];
    }

    // Get requirement by ID
    getRequirement(requirementId) {
        for (const section of this.template.sections) {
            const requirement = section.requirements.find(r => r.id === requirementId);
            if (requirement) return requirement;
        }
        return null;
    }

    // Get total points
    getTotalPoints() {
        return this.template.scoring.totalPoints;
    }

    // Get passing score
    getPassingScore() {
        return this.template.scoring.passingScore;
    }

    // Check if requirement is critical
    isCriticalRequirement(requirementId) {
        return this.template.scoring.criticalRequirements.includes(requirementId);
    }

    // Get evidence requirements
    getEvidenceRequirements(requirementId) {
        const requirement = this.getRequirement(requirementId);
        return requirement ? requirement.evidenceRequired : [];
    }

    // Get automated checks for requirement
    getAutomatedChecksForRequirement(requirementId) {
        const requirement = this.getRequirement(requirementId);
        return requirement ? requirement.automatedChecks : [];
    }

    // Get risk level for requirement
    getRiskLevel(requirementId) {
        const requirement = this.getRequirement(requirementId);
        return requirement ? requirement.riskLevel : null;
    }

    // Get points for requirement
    getRequirementPoints(requirementId) {
        const requirement = this.getRequirement(requirementId);
        return requirement ? requirement.points : 0;
    }

    // Get section weight
    getSectionWeight(sectionId) {
        const section = this.template.sections.find(s => s.id === sectionId);
        return section ? section.weight : 0;
    }

    // Get regulatory references
    getRegulatoryReferences() {
        return this.template.regulatoryReferences;
    }

    // Get template metadata
    getMetadata() {
        return {
            id: this.template.id,
            name: this.template.name,
            category: this.template.category,
            subcategory: this.template.subcategory,
            version: this.template.version,
            lastUpdated: this.template.lastUpdated,
            description: this.template.description
        };
    }

    // Get schedule-specific requirements
    getScheduleRequirements(schedule) {
        const scheduleMap = {
            'Schedule II': ['prescription-forms', 'form_222_used_properly'],
            'Schedule III': ['dispensing-records', 'records_complete'],
            'Schedule IV': ['dispensing-records', 'records_complete'],
            'Schedule V': ['dispensing-records', 'records_complete']
        };
        return scheduleMap[schedule] || [];
    }

    // Get storage requirements by schedule
    getStorageRequirements(schedule) {
        const baseRequirements = ['secure-storage', 'access-control'];
        if (['Schedule II', 'Schedule III'].includes(schedule)) {
            baseRequirements.push('alarm-systems');
        }
        return baseRequirements;
    }
}
