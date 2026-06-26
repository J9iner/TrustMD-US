// TrustMD Illinois State Compliance Template
// Illinois Department of Financial and Professional Regulation compliance

class IllinoisComplianceTemplate {
    constructor() {
        this.template = {
            id: 'illinois-state-v2024',
            name: 'Illinois State Compliance',
            category: 'state',
            subcategory: 'il',
            stateCode: 'IL',
            tier: 1,
            multiplier: 1.4,
            version: '2024.1',
            lastUpdated: '2024-01-15',
            description: 'Illinois Department of Financial and Professional Regulation compliance',
            regulatoryReferences: [
                'Illinois Medical Practice Act',
                'Illinois Administrative Code',
                'IL PDMP (PMP)',
                'IDFPR Regulations',
                'Illinois Controlled Substances Act',
                'Illinois Medical Marijuana Program'
            ],
            sections: [
                {
                    id: 'licensure-il',
                    name: 'Medical Licensure',
                    weight: 0.30,
                    requirements: [
                        {
                            id: 'il-license',
                            name: 'Illinois Medical License',
                            description: 'Active Illinois medical license',
                            mandatory: true,
                            evidenceRequired: ['IL medical license', 'License verification', 'Renewal documentation'],
                            automatedChecks: ['license_current', 'license_verified'],
                            riskLevel: 'critical',
                            points: 20
                        },
                        {
                            id: 'cme-illinois',
                            name: 'Illinois CME Requirements',
                            description: '150 CME hours every 3 years including specific requirements',
                            mandatory: true,
                            evidenceRequired: ['CME certificates', 'Illinois-specific courses', 'CME tracking'],
                            automatedChecks: ['cme_hours_met', 'illinois_requirements_completed'],
                            riskLevel: 'high',
                            points: 15
                        },
                        {
                            id: 'controlled-substance-il',
                            name: 'Illinois Controlled Substance Registration',
                            description: 'Illinois controlled substance registration',
                            mandatory: true,
                            evidenceRequired: ['IL controlled substance registration', 'DEA registration', 'PMP compliance'],
                            automatedChecks: ['il_registration_current', 'dea_current', 'pmp_compliant'],
                            riskLevel: 'critical',
                            points: 15
                        },
                        {
                            id: 'license-verification',
                            name: 'License Verification',
                            description: 'Illinois medical license verification',
                            mandatory: true,
                            evidenceRequired: ['License verification', 'IDFPR profile', 'Verification date'],
                            automatedChecks: ['license_verified', 'profile_current'],
                            riskLevel: 'medium',
                            points: 5
                        },
                        {
                            id: 'professional-conduct',
                            name: 'Professional Conduct',
                            description: 'Compliance with Illinois professional conduct standards',
                            mandatory: true,
                            evidenceRequired: ['Conduct policies', 'Training records', 'Compliance documentation'],
                            automatedChecks: ['conduct_policies_current', 'training_completed'],
                            riskLevel: 'medium',
                            points: 5
                        }
                    ]
                },
                {
                    id: 'prescribing-il',
                    name: 'Prescribing Requirements',
                    weight: 0.30,
                    requirements: [
                        {
                            id: 'pmp-checks',
                            name: 'Illinois PMP Checks',
                            description: 'Mandatory Illinois PMP checks before prescribing',
                            mandatory: true,
                            evidenceRequired: ['PMP query logs', 'Patient consent', 'Query documentation'],
                            automatedChecks: ['pmp_checked_before_prescribing', 'consent_documented'],
                            riskLevel: 'critical',
                            points: 20
                        },
                        {
                            id: 'opioid-guidelines',
                            name: 'Opioid Prescribing Guidelines',
                            description: 'Illinois opioid prescribing guidelines compliance',
                            mandatory: true,
                            evidenceRequired: ['Guideline documentation', 'Prescribing protocols', 'Compliance audits'],
                            automatedChecks: ['guidelines_followed', 'protocols_current'],
                            riskLevel: 'high',
                            points: 10
                        },
                        {
                            id: 'electronic-prescribing',
                            name: 'Electronic Prescribing',
                            description: 'Illinois e-prescribing requirements',
                            mandatory: true,
                            evidenceRequired: ['E-prescribing system', 'Certification documentation', 'Usage logs'],
                            automatedChecks: ['eprescribing_active', 'certification_current'],
                            riskLevel: 'medium',
                            points: 10
                        },
                        {
                            id: 'prescription-monitoring',
                            name: 'Prescription Monitoring',
                            description: 'Ongoing prescription monitoring requirements',
                            mandatory: true,
                            evidenceRequired: ['Monitoring logs', 'Review procedures', 'Alert documentation'],
                            automatedChecks: ['monitoring_active', 'reviews_conducted'],
                            riskLevel: 'medium',
                            points: 5
                        }
                    ]
                },
                {
                    id: 'documentation-il',
                    name: 'Documentation Requirements',
                    weight: 0.20,
                    requirements: [
                        {
                            id: 'electronic-records',
                            name: 'Electronic Medical Records',
                            description: 'Illinois electronic medical record requirements',
                            mandatory: true,
                            evidenceRequired: ['EMR system certification', 'Record templates', 'Security documentation'],
                            automatedChecks: ['emr_certified', 'templates_current', 'security_compliant'],
                            riskLevel: 'medium',
                            points: 10
                        },
                        {
                            id: 'informed-consent',
                            name: 'Informed Consent Documentation',
                            description: 'Illinois-specific informed consent requirements',
                            mandatory: true,
                            evidenceRequired: ['Consent forms', 'Documentation samples', 'Process verification'],
                            automatedChecks: ['consent_forms_current', 'process_verified'],
                            riskLevel: 'medium',
                            points: 10
                        },
                        {
                            id: 'record-retention',
                            name: 'Record Retention',
                            description: 'Illinois medical record retention requirements',
                            mandatory: true,
                            evidenceRequired: ['Retention policy', 'Storage documentation', 'Retention schedule'],
                            automatedChecks: ['retention_policy_current', 'records_maintained'],
                            riskLevel: 'medium',
                            points: 5
                        },
                        {
                            id: 'patient-records',
                            name: 'Patient Record Standards',
                            description: 'Illinois patient record documentation standards',
                            mandatory: true,
                            evidenceRequired: ['Record standards', 'Documentation samples', 'Audit results'],
                            automatedChecks: ['records_compliant', 'standards_current'],
                            riskLevel: 'medium',
                            points: 5
                        }
                    ]
                },
                {
                    id: 'facility-il',
                    name: 'Facility Requirements',
                    weight: 0.20,
                    requirements: [
                        {
                            id: 'facility-license-il',
                            name: 'Health Care Facility License',
                            description: 'Illinois health care facility licensing',
                            mandatory: true,
                            evidenceRequired: ['Facility license', 'Inspection reports', 'Compliance documentation'],
                            automatedChecks: ['facility_license_current', 'inspections_current'],
                            riskLevel: 'high',
                            points: 15
                        },
                        {
                            id: 'emergency-preparedness-il',
                            name: 'Emergency Preparedness',
                            description: 'Illinois emergency preparedness requirements',
                            mandatory: true,
                            evidenceRequired: ['Emergency plans', 'Drill records', 'Disaster documentation'],
                            automatedChecks: ['plans_current', 'drills_conducted'],
                            riskLevel: 'medium',
                            points: 10
                        },
                        {
                            id: 'facility-standards',
                            name: 'Facility Standards',
                            description: 'Illinois facility physical standards compliance',
                            mandatory: true,
                            evidenceRequired: ['Facility inspection', 'Standards compliance', 'Deficiency correction'],
                            automatedChecks: ['facility_compliant', 'inspections_current'],
                            riskLevel: 'medium',
                            points: 5
                        },
                        {
                            id: 'safety-requirements',
                            name: 'Safety Requirements',
                            description: 'Illinois facility safety requirements',
                            mandatory: true,
                            evidenceRequired: ['Safety plans', 'Inspection reports', 'Training records'],
                            automatedChecks: ['safety_plans_current', 'training_completed'],
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
                    'il-license',
                    'controlled-substance-il',
                    'pmp-checks',
                    'facility-license-il'
                ],
                automatedChecks: [
                    'license_current',
                    'license_verified',
                    'cme_hours_met',
                    'illinois_requirements_completed',
                    'il_registration_current',
                    'dea_current',
                    'pmp_compliant',
                    'pmp_checked_before_prescribing',
                    'consent_documented',
                    'guidelines_followed',
                    'protocols_current',
                    'eprescribing_active',
                    'certification_current',
                    'emr_certified',
                    'templates_current',
                    'security_compliant',
                    'consent_forms_current',
                    'process_verified',
                    'facility_license_current',
                    'inspections_current',
                    'plans_current',
                    'drills_conducted'
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
            stateCode: this.template.stateCode,
            tier: this.template.tier,
            multiplier: this.template.multiplier,
            version: this.template.version,
            lastUpdated: this.template.lastUpdated,
            description: this.template.description
        };
    }

    // Get Illinois-specific requirements
    getIllinoisSpecificRequirements() {
        return [
            'pmp-checks',
            'electronic-records',
            'informed-consent',
            'emr_certification'
        ];
    }

    // Get CME requirements
    getCMERequirements() {
        return {
            totalHours: 150,
            renewalPeriod: '3 years',
            specificTopics: [
                'Medical Jurisprudence (40 hours)',
                'Controlled Substances (30 hours)',
                'Pain Management (20 hours)',
                'Ethics (20 hours)',
                'Patient Safety (20 hours)',
                'Illinois Law (20 hours)'
            ]
        };
    }

    // Get prescribing requirements
    getPrescribingRequirements() {
        return {
            pdmpRequired: true,
            pdmpSystem: 'Illinois PMP',
            opioidGuidelines: true,
            electronicPrescribing: true,
            prescriptionMonitoring: true
        };
    }

    // Get documentation requirements
    getDocumentationRequirements() {
        return {
            electronicRecords: true,
            informedConsent: true,
            recordRetention: true,
            patientRecordStandards: true
        };
    }

    // Get facility requirements
    getFacilityRequirements() {
        return {
            facilityLicense: true,
            emergencyPreparedness: true,
            facilityStandards: true,
            safetyRequirements: true
        };
    }
}

// Export for use in both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IllinoisComplianceTemplate;
} else {
    window.IllinoisComplianceTemplate = IllinoisComplianceTemplate;
}
