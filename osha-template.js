// TrustMD OSHA Compliance Template
// Occupational Safety and Health Administration workplace safety compliance

export default class OSHAComplianceTemplate {
    constructor() {
        this.template = {
            id: 'osha-federal-v2024',
            name: 'OSHA Compliance',
            category: 'federal',
            subcategory: 'osha',
            version: '2024.1',
            lastUpdated: '2024-01-15',
            description: 'Occupational Safety and Health Administration workplace safety compliance',
            regulatoryReferences: [
                '29 CFR Part 1904 - Recording and Reporting Occupational Injuries and Illnesses',
                '29 CFR Part 1910 - Occupational Safety and Health Standards',
                '29 CFR Part 1926 - Construction Safety Standards',
                '29 CFR Part 1910.1030 - Bloodborne Pathogens Standard',
                '29 CFR Part 1910.1200 - Hazard Communication Standard'
            ],
            sections: [
                {
                    id: 'recordkeeping',
                    name: 'Recordkeeping',
                    weight: 0.30,
                    requirements: [
                        {
                            id: 'osha-300-log',
                            name: 'OSHA 300 Log',
                            description: 'Maintenance of OSHA 300 log for work-related injuries and illnesses',
                            mandatory: true,
                            evidenceRequired: ['OSHA 300 log', 'OSHA 300A summary', 'Annual posting documentation'],
                            automatedChecks: ['log_current', 'summary_posted'],
                            riskLevel: 'high',
                            points: 15
                        },
                        {
                            id: 'first-aid-logs',
                            name: 'First Aid Logs',
                            description: 'Documentation of first aid treatment',
                            mandatory: true,
                            evidenceRequired: ['First aid logs', 'Treatment records', 'Injury reports'],
                            automatedChecks: ['logs_maintained', 'records_complete'],
                            riskLevel: 'medium',
                            points: 10
                        },
                        {
                            id: 'injury-reporting',
                            name: 'Severe Injury Reporting',
                            description: 'Reporting of severe injuries to OSHA within 8 hours',
                            mandatory: true,
                            evidenceRequired: ['Severe injury reports', 'OSHA notification logs', 'Reporting procedures'],
                            automatedChecks: ['severe_injuries_reported', 'notifications_timely'],
                            riskLevel: 'critical',
                            points: 10
                        },
                        {
                            id: 'record-retention',
                            name: 'Record Retention',
                            description: 'Maintain OSHA records for required retention periods',
                            mandatory: true,
                            evidenceRequired: ['Record retention policy', 'Storage documentation', 'Retention schedule'],
                            automatedChecks: ['retention_policy_current', 'records_maintained'],
                            riskLevel: 'medium',
                            points: 5
                        }
                    ]
                },
                {
                    id: 'bloodborne-pathogens',
                    name: 'Bloodborne Pathogens',
                    weight: 0.25,
                    requirements: [
                        {
                            id: 'exposure-control-plan',
                            name: 'Exposure Control Plan',
                            description: 'Written exposure control plan for bloodborne pathogens',
                            mandatory: true,
                            evidenceRequired: ['ECP document', 'Annual review records', 'Employee exposure determination'],
                            automatedChecks: ['ecp_exists', 'review_current'],
                            riskLevel: 'high',
                            points: 15
                        },
                        {
                            id: 'hepatitis-vaccine',
                            name: 'Hepatitis B Vaccine',
                            description: 'Hepatitis B vaccination program',
                            mandatory: true,
                            evidenceRequired: ['Vaccine program documentation', 'Employee declination forms', 'Vaccination records'],
                            automatedChecks: ['vaccine_offered', 'declinations_documented'],
                            riskLevel: 'medium',
                            points: 10
                        },
                        {
                            id: 'post-exposure',
                            name: 'Post-Exposure Procedures',
                            description: 'Procedures for post-exposure incidents',
                            mandatory: true,
                            evidenceRequired: ['Post-exposure procedures', 'Medical evaluation records', 'Incident reports'],
                            automatedChecks: ['procedures_documented', 'evaluations_completed'],
                            riskLevel: 'high',
                            points: 10
                        },
                        {
                            id: 'universal-precautions',
                            name: 'Universal Precautions',
                            description: 'Universal precautions training and implementation',
                            mandatory: true,
                            evidenceRequired: ['Universal precautions policy', 'Training records', 'Implementation documentation'],
                            automatedChecks: ['precautions_trained', 'implementation_documented'],
                            riskLevel: 'medium',
                            points: 5
                        },
                        {
                            id: 'sharps-injury-log',
                            name: 'Sharps Injury Log',
                            description: 'Documentation of sharps injuries',
                            mandatory: true,
                            evidenceRequired: ['Sharps injury log', 'Injury reports', 'Follow-up documentation'],
                            automatedChecks: ['sharps_log_maintained', 'follow_up_documented'],
                            riskLevel: 'medium',
                            points: 5
                        }
                    ]
                },
                {
                    id: 'hazard-communication',
                    name: 'Hazard Communication',
                    weight: 0.20,
                    requirements: [
                        {
                            id: 'hazard-program',
                            name: 'Hazard Communication Program',
                            description: 'Written hazard communication program',
                            mandatory: true,
                            evidenceRequired: ['HazCom program', 'SDS inventory', 'Training records'],
                            automatedChecks: ['program_exists', 'sds_current'],
                            riskLevel: 'medium',
                            points: 10
                        },
                        {
                            id: 'sds-access',
                            name: 'SDS Access',
                            description: 'Safety Data Sheets readily accessible',
                            mandatory: true,
                            evidenceRequired: ['SDS inventory', 'Access location documentation', 'SDS availability verification'],
                            automatedChecks: ['sds_accessible', 'inventory_current'],
                            riskLevel: 'medium',
                            points: 5
                        },
                        {
                            id: 'container-labeling',
                            name: 'Container Labeling',
                            description: 'Proper labeling of hazardous chemical containers',
                            mandatory: true,
                            evidenceRequired: ['Labeling procedures', 'Label examples', 'Inspection records'],
                            automatedChecks: ['containers_labeled', 'procedures_documented'],
                            riskLevel: 'medium',
                            points: 5
                        },
                        {
                            id: 'employee-training',
                            name: 'Employee Training',
                            description: 'Training on hazardous chemicals',
                            mandatory: true,
                            evidenceRequired: ['Training materials', 'Attendance records', 'Competency assessments'],
                            automatedChecks: ['training_completed', 'attendance_tracked'],
                            riskLevel: 'medium',
                            points: 5
                        }
                    ]
                },
                {
                    id: 'training',
                    name: 'Training Programs',
                    weight: 0.15,
                    requirements: [
                        {
                            id: 'new-employee-training',
                            name: 'New Employee Training',
                            description: 'Initial safety training for new employees',
                            mandatory: true,
                            evidenceRequired: ['Training curriculum', 'Attendance records', 'Competency assessments'],
                            automatedChecks: ['training_completed', 'attendance_tracked'],
                            riskLevel: 'medium',
                            points: 10
                        },
                        {
                            id: 'annual-training',
                            name: 'Annual Refresher Training',
                            description: 'Annual safety training refreshers',
                            mandatory: true,
                            evidenceRequired: ['Annual training records', 'Training effectiveness evaluations'],
                            automatedChecks: ['annual_training_current'],
                            riskLevel: 'medium',
                            points: 5
                        },
                        {
                            id: 'training-documentation',
                            name: 'Training Documentation',
                            description: 'Comprehensive training records',
                            mandatory: true,
                            evidenceRequired: ['Training logs', 'Attendance sheets', 'Training materials', 'Certificates'],
                            automatedChecks: ['documentation_complete', 'records_maintained'],
                            riskLevel: 'low',
                            points: 3
                        },
                        {
                            id: 'job-specific-training',
                            name: 'Job-Specific Training',
                            description: 'Training specific to job hazards',
                            mandatory: true,
                            evidenceRequired: ['Job hazard analysis', 'Specific training materials', 'Job-specific records'],
                            automatedChecks: ['job_hazards_identified', 'specific_training_completed'],
                            riskLevel: 'medium',
                            points: 5
                        }
                    ]
                },
                {
                    id: 'emergency-preparedness',
                    name: 'Emergency Preparedness',
                    weight: 0.10,
                    requirements: [
                        {
                            id: 'emergency-plan',
                            name: 'Emergency Action Plan',
                            description: 'Written emergency action plan',
                            mandatory: true,
                            evidenceRequired: ['Emergency action plan', 'Drill records', 'Evacuation maps'],
                            automatedChecks: ['plan_exists', 'drills_conducted'],
                            riskLevel: 'medium',
                            points: 5
                        },
                        {
                            id: 'fire-extinguishers',
                            name: 'Fire Extinguishers',
                            description: 'Properly maintained fire extinguishers',
                            mandatory: true,
                            evidenceRequired: ['Extinguisher inspection records', 'Maintenance logs', 'Placement documentation'],
                            automatedChecks: ['extinguishers_inspected', 'maintenance_current'],
                            riskLevel: 'medium',
                            points: 3
                        },
                        {
                            id: 'emergency-exits',
                            name: 'Emergency Exits',
                            description: 'Clear and accessible emergency exits',
                            mandatory: true,
                            evidenceRequired: ['Exit inspection records', 'Exit signage documentation', 'Clearance verification'],
                            automatedChecks: ['exits_clear', 'signage_proper'],
                            riskLevel: 'medium',
                            points: 3
                        },
                        {
                            id: 'first-aid-kits',
                            name: 'First Aid Kits',
                            description: 'Adequately stocked first aid kits',
                            mandatory: true,
                            evidenceRequired: ['First aid kit inventory', 'Restocking records', 'Kit locations'],
                            automatedChecks: ['kits_stocked', 'locations_documented'],
                            riskLevel: 'medium',
                            points: 2
                        }
                    ]
                }
            ],
            scoring: {
                totalPoints: 100,
                passingScore: 85,
                criticalRequirements: [
                    'osha-300-log',
                    'injury-reporting',
                    'exposure-control-plan',
                    'post-exposure',
                    'hazard-program',
                    'new-employee-training',
                    'emergency-plan'
                ],
                automatedChecks: [
                    'log_current',
                    'summary_posted',
                    'severe_injuries_reported',
                    'ecp_exists',
                    'review_current',
                    'vaccine_offered',
                    'procedures_documented',
                    'program_exists',
                    'sds_current',
                    'sds_accessible',
                    'training_completed',
                    'attendance_tracked',
                    'plan_exists',
                    'drills_conducted',
                    'extinguishers_inspected',
                    'exits_clear',
                    'kits_stocked'
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

    // Get recordkeeping requirements
    getRecordkeepingRequirements() {
        return this.getRequirementsBySection('recordkeeping');
    }

    // Get bloodborne pathogens requirements
    getBloodbornePathogensRequirements() {
        return this.getRequirementsBySection('bloodborne-pathogens');
    }

    // Get hazard communication requirements
    getHazardCommunicationRequirements() {
        return this.getRequirementsBySection('hazard-communication');
    }

    // Get training requirements
    getTrainingRequirements() {
        return this.getRequirementsBySection('training');
    }

    // Get emergency preparedness requirements
    getEmergencyPreparednessRequirements() {
        return this.getRequirementsBySection('emergency-preparedness');
    }

    // Get industry-specific requirements
    getIndustrySpecificRequirements(industry) {
        const industryMap = {
            'healthcare': ['bloodborne-pathogens', 'hazard-communication'],
            'construction': ['emergency-preparedness', 'training'],
            'manufacturing': ['hazard-communication', 'training'],
            'general': ['recordkeeping', 'training', 'emergency-preparedness']
        };
        return industryMap[industry] || industryMap['general'];
    }
}
