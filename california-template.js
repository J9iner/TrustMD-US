// TrustMD California State Compliance Template
// California Medical Board and state-specific compliance requirements

class CaliforniaComplianceTemplate {
    constructor() {
        this.template = {
            id: 'california-state-v2024',
            name: 'California State Compliance',
            category: 'state',
            subcategory: 'ca',
            stateCode: 'CA',
            tier: 1,
            multiplier: 1.4,
            version: '2024.1',
            lastUpdated: '2024-01-15',
            description: 'California Medical Board and state-specific compliance requirements',
            regulatoryReferences: [
                'California Business and Professions Code',
                'California Health and Safety Code',
                'CCPA/CPRA Privacy Laws',
                'California Medical Board Regulations',
                'California Controlled Substances Act',
                'California Medical Marijuana Laws'
            ],
            sections: [
                {
                    id: 'medical-board',
                    name: 'Medical Board Requirements',
                    weight: 0.30,
                    requirements: [
                        {
                            id: 'ca-license',
                            name: 'California Medical License',
                            description: 'Active California medical license with appropriate specialty',
                            mandatory: true,
                            evidenceRequired: ['CA medical license', 'License verification', 'Renewal documentation'],
                            automatedChecks: ['license_current', 'license_verified'],
                            riskLevel: 'critical',
                            points: 20
                        },
                        {
                            id: 'continuing-education',
                            name: 'Continuing Medical Education',
                            description: '50 CME hours every 2 years including specific requirements',
                            mandatory: true,
                            evidenceRequired: ['CME certificates', 'Course completion records', 'CME tracking log'],
                            automatedChecks: ['cme_hours_met', 'specific_topics_completed'],
                            riskLevel: 'high',
                            points: 15
                        },
                        {
                            id: 'drug-enforcement',
                            name: 'California Drug Enforcement',
                            description: 'DEA and California controlled substance registration',
                            mandatory: true,
                            evidenceRequired: ['DEA registration', 'CA controlled substance license', 'CURES 2.0 compliance'],
                            automatedChecks: ['dea_current', 'ca_license_current', 'cures_compliant'],
                            riskLevel: 'critical',
                            points: 15
                        },
                        {
                            id: 'medical-board-fees',
                            name: 'Medical Board Fees',
                            description: 'Payment of required medical board fees',
                            mandatory: true,
                            evidenceRequired: ['Fee payment receipts', 'License renewal confirmation', 'Fee schedule'],
                            automatedChecks: ['fees_paid', 'renewal_current'],
                            riskLevel: 'medium',
                            points: 5
                        },
                        {
                            id: 'profile-verification',
                            name: 'Profile Verification',
                            description: 'California Medical Board profile verification',
                            mandatory: true,
                            evidenceRequired: ['Profile verification', 'Public profile screenshot', 'Verification date'],
                            automatedChecks: ['profile_verified', 'verification_current'],
                            riskLevel: 'medium',
                            points: 5
                        }
                    ]
                },
                {
                    id: 'privacy-compliance',
                    name: 'Privacy Compliance',
                    weight: 0.25,
                    requirements: [
                        {
                            id: 'ccpa-compliance',
                            name: 'CCPA/CPRA Compliance',
                            description: 'California Consumer Privacy Act compliance',
                            mandatory: true,
                            evidenceRequired: ['Privacy policy', 'Consumer rights procedures', 'Data breach procedures'],
                            automatedChecks: ['privacy_policy_current', 'rights_procedures_documented'],
                            riskLevel: 'high',
                            points: 15
                        },
                        {
                            id: 'data-breach',
                            name: 'Data Breach Notification',
                            description: 'California-specific data breach notification requirements',
                            mandatory: true,
                            evidenceRequired: ['Breach procedures', 'Notification templates', 'Timeline documentation'],
                            automatedChecks: ['breach_procedures_current', 'notification_templates_ready'],
                            riskLevel: 'high',
                            points: 10
                        },
                        {
                            id: 'consumer-rights',
                            name: 'Consumer Rights',
                            description: 'Procedures for handling consumer rights requests',
                            mandatory: true,
                            evidenceRequired: ['Rights request procedures', 'Response templates', 'Request tracking logs'],
                            automatedChecks: ['rights_procedures_documented', 'response_templates_available'],
                            riskLevel: 'medium',
                            points: 5
                        },
                        {
                            id: 'data-retention',
                            name: 'Data Retention Policy',
                            description: 'California-specific data retention requirements',
                            mandatory: true,
                            evidenceRequired: ['Data retention policy', 'Retention schedule', 'Deletion procedures'],
                            automatedChecks: ['retention_policy_current', 'schedule_documented'],
                            riskLevel: 'medium',
                            points: 5
                        }
                    ]
                },
                {
                    id: 'prescribing',
                    name: 'Prescribing Requirements',
                    weight: 0.25,
                    requirements: [
                        {
                            id: 'cures-checks',
                            name: 'CURES 2.0 PDMP Checks',
                            description: 'Mandatory PDMP checks before prescribing controlled substances',
                            mandatory: true,
                            evidenceRequired: ['CURES query logs', 'Patient consent forms', 'Query documentation'],
                            automatedChecks: ['cures_checked_before_prescribing', 'consent_documented'],
                            riskLevel: 'critical',
                            points: 15
                        },
                        {
                            id: 'antibiotic-stewardship',
                            name: 'Antibiotic Stewardship',
                            description: 'California antibiotic prescribing guidelines compliance',
                            mandatory: true,
                            evidenceRequired: ['Stewardship program', 'Guideline documentation', 'Prescribing audits'],
                            automatedChecks: ['stewardship_program_active', 'guidelines_followed'],
                            riskLevel: 'medium',
                            points: 10
                        },
                        {
                            id: 'opioid-guidelines',
                            name: 'Opioid Prescribing Guidelines',
                            description: 'California-specific opioid prescribing requirements',
                            mandatory: true,
                            evidenceRequired: ['Opioid guidelines', 'Prescribing protocols', 'Patient education materials'],
                            automatedChecks: ['guidelines_current', 'protocols_documented'],
                            riskLevel: 'high',
                            points: 10
                        },
                        {
                            id: 'electronic-prescribing',
                            name: 'Electronic Prescribing',
                            description: 'California e-prescribing requirements',
                            mandatory: true,
                            evidenceRequired: ['E-prescribing system', 'Certification documentation', 'Usage logs'],
                            automatedChecks: ['eprescribing_active', 'certification_current'],
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
                            id: 'seismic-compliance',
                            name: 'Seismic Safety Compliance',
                            description: 'Seismic safety requirements for medical facilities',
                            mandatory: true,
                            evidenceRequired: ['Seismic certification', 'Safety plans', 'Inspection reports'],
                            automatedChecks: ['seismic_certification_current', 'inspections_current'],
                            riskLevel: 'medium',
                            points: 10
                        },
                        {
                            id: 'accessibility',
                            name: 'Accessibility Compliance',
                            description: 'ADA and California accessibility requirements',
                            mandatory: true,
                            evidenceRequired: ['Accessibility audit', 'Modifications documentation', 'Compliance plan'],
                            automatedChecks: ['accessibility_compliant', 'modifications_documented'],
                            riskLevel: 'medium',
                            points: 10
                        },
                        {
                            id: 'facility-license',
                            name: 'Health Care Facility License',
                            description: 'California health care facility licensing',
                            mandatory: true,
                            evidenceRequired: ['Facility license', 'Inspection reports', 'Compliance documentation'],
                            automatedChecks: ['facility_license_current', 'inspections_current'],
                            riskLevel: 'high',
                            points: 10
                        },
                        {
                            id: 'emergency-preparedness',
                            name: 'Emergency Preparedness',
                            description: 'California-specific emergency preparedness requirements',
                            mandatory: true,
                            evidenceRequired: ['Emergency plans', 'Drill records', 'Disaster documentation'],
                            automatedChecks: ['plans_current', 'drills_conducted'],
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
                    'ca-license',
                    'drug-enforcement',
                    'cures-checks',
                    'facility-license'
                ],
                automatedChecks: [
                    'license_current',
                    'license_verified',
                    'cme_hours_met',
                    'dea_current',
                    'ca_license_current',
                    'cures_compliant',
                    'cures_checked_before_prescribing',
                    'consent_documented',
                    'privacy_policy_current',
                    'rights_procedures_documented',
                    'seismic_certification_current',
                    'facility_license_current',
                    'inspections_current'
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

    // Get California-specific requirements
    getCaliforniaSpecificRequirements() {
        return [
            'cures-checks',
            'ccpa-compliance',
            'seismic-compliance',
            'antibiotic-stewardship'
        ];
    }

    // Get CME requirements
    getCMERequirements() {
        return {
            totalHours: 50,
            renewalPeriod: '2 years',
            specificTopics: [
                'Pain Management (12 hours)',
                'Controlled Substances (8 hours)',
                'Ethics (1 hour)',
                'California Law (1 hour)'
            ]
        };
    }

    // Get prescribing requirements
    getPrescribingRequirements() {
        return {
            pdmpRequired: true,
            pdmpSystem: 'CURES 2.0',
            antibioticStewardship: true,
            opioidGuidelines: true,
            electronicPrescribing: true
        };
    }

    // Get privacy requirements
    getPrivacyRequirements() {
        return {
            ccpaCompliant: true,
            breachNotification: '15 days',
            consumerRights: true,
            dataRetention: '7 years',
            doNotSell: true
        };
    }

    // Get facility requirements
    getFacilityRequirements() {
        return {
            seismicCompliance: true,
            accessibilityCompliance: true,
            facilityLicense: true,
            emergencyPreparedness: true
        };
    }
}

// Export for use in both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CaliforniaComplianceTemplate;
} else {
    window.CaliforniaComplianceTemplate = CaliforniaComplianceTemplate;
}
