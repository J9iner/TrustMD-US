/**
 * OSHA Compliance API Routes
 * Handles OSHA training, compliance tracking, and reporting
 */

const express = require('express');
const Joi = require('joi');

const router = express.Router();
const { supabase } = require('../services/supabase-client');
const { validateSession } = require('../middleware/session-manager');
const { OSHAComplianceManager } = require('../models/osha-compliance');

// Validation schemas
const trainingRecordSchema = Joi.object({
    trainingRequirementId: Joi.string().uuid().required(),
    completionDate: Joi.date().required(),
    score: Joi.number().min(0).max(100),
    notes: Joi.string().max(1000),
    certificateUrl: Joi.string().uri().optional()
});

const injuryLogSchema = Joi.object({
    injuryDate: Joi.date().required(),
    employeeName: Joi.string().required(),
    treatmentType: Joi.string().valid('first_aid', 'medical_treatment', 'restricted_work', 'days_away').required(),
    description: Joi.string().required(),
    location: Joi.string().required(),
    finalOutcome: Joi.string().optional()
});

/**
 * GET /api/osha/compliance-score
 * Get OSHA compliance score for current tenant
 */
router.get('/compliance-score', validateSession, async (req, res) => {
    try {
        const session = req.session;
        
        // Initialize OSHA compliance manager
        const oshaManager = new OSHAComplianceManager({ supabase });
        await oshaManager.initialize(session.tenantId);
        
        // Calculate compliance score
        const complianceScore = oshaManager.calculateOSHAComplianceScore();
        
        res.json({
            success: true,
            data: complianceScore
        });

    } catch (error) {
        console.error('OSHA compliance score error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate OSHA compliance score'
        });
    }
});

/**
 * GET /api/osha/training-requirements
 * Get OSHA training requirements for tenant
 */
router.get('/training-requirements', validateSession, async (req, res) => {
    try {
        const session = req.session;
        
        const { data: requirements, error } = await supabase
            .from('osha_training_requirements')
            .select(`
                *,
                training_records:osha_training_records(
                    id, 
                    completion_date, 
                    score, 
                    user:users(id, full_name, email)
                )
            `)
            .eq('tenant_id', session.tenantId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Training requirements error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch training requirements'
            });
        }

        res.json({
            success: true,
            data: requirements
        });

    } catch (error) {
        console.error('Training requirements error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/osha/training-records
 * Add new OSHA training record
 */
router.post('/training-records', validateSession, async (req, res) => {
    try {
        const session = req.session;
        
        // Validate input
        const { error, value } = trainingRecordSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.details
            });
        }

        const { trainingRequirementId, completionDate, score, notes, certificateUrl } = value;

        // Check if training record already exists
        const { data: existingRecord } = await supabase
            .from('osha_training_records')
            .select('id')
            .eq('user_id', session.userId)
            .eq('training_requirement_id', trainingRequirementId)
            .single();

        if (existingRecord) {
            return res.status(409).json({
                success: false,
                error: 'Training record already exists for this requirement'
            });
        }

        // Create training record
        const { data: trainingRecord, error: insertError } = await supabase
            .from('osha_training_records')
            .insert({
                tenant_id: session.tenantId,
                user_id: session.userId,
                training_requirement_id: trainingRequirementId,
                completion_date: completionDate,
                score: score || null,
                notes: notes || null,
                certificate_url: certificateUrl || null,
                status: 'completed'
            })
            .select()
            .single();

        if (insertError) {
            console.error('Training record creation error:', insertError);
            return res.status(500).json({
                success: false,
                error: 'Failed to create training record'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Training record created successfully',
            data: trainingRecord
        });

    } catch (error) {
        console.error('Training record creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/osha/training-records
 * Get OSHA training records for user
 */
router.get('/training-records', validateSession, async (req, res) => {
    try {
        const session = req.session;
        
        const { data: records, error } = await supabase
            .from('osha_training_records')
            .select(`
                *,
                training_requirement:osha_training_requirements(*)
            `)
            .eq('user_id', session.userId)
            .eq('tenant_id', session.tenantId)
            .order('completion_date', { ascending: false });

        if (error) {
            console.error('Training records error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch training records'
            });
        }

        res.json({
            success: true,
            data: records
        });

    } catch (error) {
        console.error('Training records error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/osha/upcoming-training
 * Get upcoming OSHA training requirements
 */
router.get('/upcoming-training', validateSession, async (req, res) => {
    try {
        const session = req.session;
        
        // Initialize OSHA compliance manager
        const oshaManager = new OSHAComplianceManager({ supabase });
        await oshaManager.initialize(session.tenantId);
        
        // Get upcoming training
        const upcomingTraining = oshaManager.getUpcomingTraining();
        
        res.json({
            success: true,
            data: upcomingTraining
        });

    } catch (error) {
        console.error('Upcoming training error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch upcoming training'
        });
    }
});

/**
 * POST /api/osha/injury-log
 * Add new injury/illness record
 */
router.post('/injury-log', validateSession, async (req, res) => {
    try {
        const session = req.session;
        
        // Validate input
        const { error, value } = injuryLogSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.details
            });
        }

        const { injuryDate, employeeName, treatmentType, description, location, finalOutcome } = value;

        // Create injury log entry
        const { data: injuryRecord, error: insertError } = await supabase
            .from('osha_injury_illness_log')
            .insert({
                tenant_id: session.tenantId,
                user_id: session.userId,
                injury_date: injuryDate,
                employee_name: employeeName,
                treatment_type: treatmentType,
                description: description,
                location: location,
                final_outcome: finalOutcome || null,
                log_year: new Date(injuryDate).getFullYear(),
                created_by: session.userId
            })
            .select()
            .single();

        if (insertError) {
            console.error('Injury log creation error:', insertError);
            return res.status(500).json({
                success: false,
                error: 'Failed to create injury log entry'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Injury log entry created successfully',
            data: injuryRecord
        });

    } catch (error) {
        console.error('Injury log creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/osha/injury-log
 * Get injury/illness log for current year
 */
router.get('/injury-log', validateSession, async (req, res) => {
    try {
        const session = req.session;
        const currentYear = new Date().getFullYear();
        
        const { data: records, error } = await supabase
            .from('osha_injury_illness_log')
            .select('*')
            .eq('tenant_id', session.tenantId)
            .eq('log_year', currentYear)
            .order('injury_date', { ascending: false });

        if (error) {
            console.error('Injury log error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch injury log'
            });
        }

        res.json({
            success: true,
            data: records
        });

    } catch (error) {
        console.error('Injury log error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/osha/programs
 * Get OSHA programs for tenant
 */
router.get('/programs', validateSession, async (req, res) => {
    try {
        const session = req.session;
        
        const { data: programs, error } = await supabase
            .from('osha_programs')
            .select('*')
            .eq('tenant_id', session.tenantId)
            .eq('status', 'active')
            .order('program_type', { ascending: true });

        if (error) {
            console.error('OSHA programs error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch OSHA programs'
            });
        }

        res.json({
            success: true,
            data: programs
        });

    } catch (error) {
        console.error('OSHA programs error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/osha/report
 * Generate comprehensive OSHA compliance report
 */
router.get('/report', validateSession, async (req, res) => {
    try {
        const session = req.session;
        
        // Initialize OSHA compliance manager
        const oshaManager = new OSHAComplianceManager({ supabase });
        await oshaManager.initialize(session.tenantId);
        
        // Generate compliance report
        const report = oshaManager.generateComplianceReport();
        
        res.json({
            success: true,
            data: report
        });

    } catch (error) {
        console.error('OSHA report error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate OSHA report'
        });
    }
});

module.exports = router;
