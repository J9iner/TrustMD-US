// TrustMD Pennsylvania State Compliance Template
// Pennsylvania State Board of Medicine and Department of Health compliance

class PennsylvaniaComplianceTemplate {
    constructor() {
        this.template = {
            id: 'pennsylvania-state-v2024',
            name: 'Pennsylvania State Compliance',
            category: 'state',
            subcategory: 'pa',
            stateCode: 'PA',
            tier: 2,
            multiplier: 1.3,
            version: '2024.1',
            lastUpdated: '2024-01-15',
            description: 'Pennsylvania Medical Board and Department of State compliance',
            regulatoryReferences: [
                'Pennsylvania Medical Practice Act',
                'Pennsylvania Administrative Code',
                'Pennsylvania Prescription Drug Monitoring Program (PDMP)',
                'Pennsylvania Department of State Regulations'
            ],
            sections: [
                {
                    id: 'medical-licensure',
                    name: 'Medical Licensure',
                    weight: 0.30,
                    requirements: [
                        {
                            id: 'pa-license',
                            name: 'Pennsylvania Medical License',
                            description: 'Active Pennsylvania medical license',
                            mandatory: true,
                            evidenceRequired: ['PA medical license', 'License verification', 'Renewal documentation'],
                            automatedChecks: ['license_current', 'license_verified'],
                            riskLevel: 'critical',
                            points: 20
                        },
                        {
                            id: 'cme-pennsylvania',
                            name: 'Pennsylvania CME Requirements',
                            description: '100 CME hours every 2 years',
                            mandatory: true,
                            evidenceRequired: ['CME certificates', 'Course completion records', 'CME tracking log'],
                            automatedChecks: ['cme_hours_met', 'specific_topics_completed'],
                            riskLevel: 'high',
                            points: 15
                        },
                        {
                            id: 'controlled-substance-pa',
                            name: 'Pennsylvania Controlled Substance Registration',
                            description: 'Pennsylvania controlled substance registration',
                            mandatory: true,
                            evidenceRequired: ['PA controlled substance registration', 'DEA registration', 'PDMP compliance'],
                            automatedChecks: ['pa_registration_current', 'dea_current', 'pdmp_compliant'],
                            riskLevel: 'critical',
                            points: 15
                        },
                        {
                            id: 'license-renewal',
                            name: 'License Renewal Requirements',
                            description: 'Biennial license renewal requirements',
                            mandatory: true,
                            evidenceRequired: ['Renewal application', 'Fee payment records', 'Continuing education'],
                            automatedChecks: ['renewal_current', 'fees_paid', 'cme_current'],
                            riskLevel: 'high',
                            points: 10
                        },
                        {
                            id: 'professional-conduct',
                            name: 'Professional Conduct',
                            description: 'Compliance with PA professional conduct standards',
                            mandatory: true,
                            evidenceRequired: ['Conduct policies', 'Training records', 'Compliance documentation'],
                            automatedChecks: ['conduct_policies_current', 'training_completed'],
                            riskLevel: 'medium',
                            points: 5
                        }
                    ]
                },
                {
                    id: 'prescribing',
                    name: 'Prescribing Requirements',
                    weight: 0.30,
                    requirements: [
                        {
                            id: 'pdmp-checks',
                            name: 'Pennsylvania PDMP Checks',
                            description: 'Mandatory Pennsylvania PDMP checks before prescribing',
                            mandatory: true,
                            evidenceRequired: ['PDMP query logs', 'Patient consent forms', 'Query documentation'],
                            automatedChecks: ['pdmp_checked_before_prescribing', 'consent_documented'],
                            riskLevel: 'critical',
                            points: 20
                        },
                        {
                            id: 'opioid-guidelines',
                            name: 'Opioid Prescribing Guidelines',
                            description: 'Pennsylvania-specific opioid prescribing requirements',
                            mandatory: true,
                            evidenceRequired: ['Opioid guidelines', 'Prescribing protocols', 'Patient education materials'],
                            automatedChecks: ['guidelines_current', 'protocols_documented'],
                            riskLevel: 'high',
                            points: 15
                        },
                        {
                            id: 'electronic-prescribing',
                            name: 'Electronic Prescribing',
                            description: 'Pennsylvania e-prescribing requirements',
                            mandatory: true,
                            evidenceRequired: ['E-prescribing system', 'Certification documentation', 'Usage logs'],
                            automatedChecks: ['eprescribing_active', 'certification_current'],
                            riskLevel: 'high',
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
                    id: 'documentation',
                    name: 'Documentation Requirements',
                    weight: 0.20,
                    requirements: [
                        {
                            id: 'medical-records',
                            name: 'Medical Record Standards',
                            description: 'Pennsylvania-specific medical record documentation standards',
                            mandatory: true,
                            evidenceRequired: ['Record templates', 'Documentation samples', 'Audit results'],
                            automatedChecks: ['records_compliant', 'templates_current'],
                            riskLevel: 'medium',
                            points: 10
                        },
                        {
                            id: 'informed-consent',
                            name: 'Informed Consent Documentation',
                            description: 'Pennsylvania-specific consent requirements',
                            mandatory: true,
                            evidenceRequired: ['Consent forms', 'Documentation samples', 'Process verification'],
                            automatedChecks: ['consent_forms_current', 'process_verified'],
                            riskLevel: 'medium',
                            points: 10
                        },
                        {
                            id: 'record-retention',
                            name: 'Record Retention',
                            description: 'Pennsylvania medical record retention requirements',
                            mandatory: true,
                            evidenceRequired: ['Retention policy', 'Storage documentation', 'Retention schedule'],
                            automatedChecks: ['retention_policy_current', 'records_maintained'],
                            riskLevel: 'medium',
                            points: 5
                        },
                        {
                            id: 'patient-rights',
                            name: 'Patient Rights Documentation',
                            description: 'Pennsylvania patient rights and responsibilities',
                            mandatory: true,
                            evidenceRequired: ['Patient rights policies', 'Disclosure forms', 'Rights documentation'],
                            automatedChecks: ['rights_policies_current', 'disclosure_documented'],
                            riskLevel: 'medium',
                            points: 5
                        }
                    ]
                },
                {
                    id: 'facility',
                    name: 'Facility Requirements',
                    weight: 0.20,
                    requirements: [
                        {
                            id: 'facility-license-pa',
                            name: 'Health Care Facility License',
                            description: 'Pennsylvania health care facility licensing',
                            mandatory: true,
                            evidenceRequired: ['Facility license', 'Inspection reports', 'Compliance documentation'],
                            automatedChecks: ['facility_license_current', 'inspections_current'],
                            riskLevel: 'high',
                            points: 15
                        },
                        {
                            id: 'safety-standards',
                            name: 'Safety Standards',
                            description: 'Pennsylvania facility safety requirements',
                            mandatory: true,
                            evidenceRequired: ['Safety plans', 'Inspection reports', 'Training records'],
                            automatedChecks: ['safety_plans_current', 'inspections_current'],
                            riskLevel: 'medium',
                            points: 10
                        },
                        {
                            id: 'accessibility',
                            name: 'Accessibility Compliance',
                            description: 'ADA and Pennsylvania accessibility requirements',
                            mandatory: true,
                            evidenceRequired: ['Accessibility audit', 'Modifications documentation', 'Compliance plan'],
                            automatedChecks: ['accessibility_compliant', 'modifications_documented'],
                            riskLevel: 'medium',
                            points: 10
                        },
                        {
                            id: 'emergency-preparedness',
                            name: 'Emergency Preparedness',
                            description: 'Pennsylvania emergency preparedness requirements',
                            mandatory: true,
                            evidenceRequired: ['Emergency plans', 'Drill records', 'Preparedness documentation'],
                            automatedChecks: ['plans_current', 'drills_conducted'],
                            riskLevel: 'medium',
                            points: 5
                        }
                    ]
                }
            ],
            scoring: {
                totalPoints: 100,
                passingScore: 88,
                criticalRequirements: [
                    'pa-license',
                    'controlled-substance-pa',
                    'pdmp-checks',
                    'facility-license-pa'
                ],
                automatedChecks: [
                    'license_current',
                    'license_verified',
                    'cme_hours_met',
                    'pa_registration_current',
                    'dea_current',
                    'pdmp_compliant',
                    'pdmp_checked_before_prescribing',
                    'consent_documented',
                    'guidelines_current',
                    'protocols_documented',
                    'eprescribing_active',
                    'certification_current',
                    'facility_license_current',
                    'inspections_current',
                    'safety_plans_current',
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
        // This would be implemented by scoring engine
        // Placeholder for template-specific scoring logic if needed
        return null;
    }

    // Validate requirements
    validateRequirements(data) {
        // This would be implemented by validation engine
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

    // Get Pennsylvania-specific requirements
    getPennsylvaniaSpecificRequirements() {
        return [
            'pdmp-checks',
            'cme-pennsylvania',
            'opioid-guidelines',
            'electronic-prescribing'
        ];
    }

    // Get CME requirements
    getCMERequirements() {
        return {
            totalHours: 100,
            renewalPeriod: '2 years',
            specificTopics: [
                'Medical Jurisprudence (20 hours)',
                'Patient Safety (15 hours)',
                'Opioid Prescribing (15 hours)',
                'Controlled Substances (10 hours)',
                'Ethics (10 hours)',
                'Pain Management (10 hours)',
                'Infectious Diseases (10 hours)',
                'Domestic Violence (2 hours)',
                'Child Abuse Recognition (2 hours)',
                'Prescription Drug Monitoring (6 hours)'
            ]
        };
    }

    // Get prescribing requirements
    getPrescribingRequirements() {
        return {
            pdmpRequired: true,
            pdmpSystem: 'Pennsylvania PDMP',
            electronicPrescribing: true,
            opioidGuidelines: true,
            prescriptionMonitoring: true
        };
    }

    // Get documentation requirements
    getDocumentationRequirements() {
        return {
            medicalRecordStandards: true,
            informedConsent: true,
            recordRetention: true,
            patientRights: true
        };
    }

    // Get facility requirements
    getFacilityRequirements() {
        return {
            facilityLicense: true,
            safetyStandards: true,
            accessibilityCompliant: true,
            emergencyPreparedness: true
        };
    }
}

// Export for use in both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PennsylvaniaComplianceTemplate;
} else {
    window.PennsylvaniaComplianceTemplate = PennsylvaniaComplianceTemplate;
}
