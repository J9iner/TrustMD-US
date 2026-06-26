/**
 * Compliance API Routes
 * Handles compliance tracking and reporting
 */

const express = require('express');
const Joi = require('joi');

const router = express.Router();
const { supabase } = require('../services/supabase-client');
const { validateSession } = require('../middleware/session-manager');

/**
 * GET /api/compliance/overview
 * Get compliance overview for current tenant
 */
router.get('/overview', validateSession, async (req, res) => {
    try {
        const session = req.session;
        
        // Get compliance scores
        const { data: scores, error: scoresError } = await supabase
            .from('compliance_scores')
            .select('*')
            .eq('tenant_id', session.tenantId)
            .order('calculated_at', { ascending: false })
            .limit(10);

        if (scoresError) {
            console.error('Compliance scores error:', scoresError);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch compliance scores'
            });
        }

        // Calculate overall score
        const latestScore = scores?.[0];
        const overallScore = latestScore?.score || 85; // Default score
        
        // Get compliance categories
        const { data: categories, error: categoriesError } = await supabase
            .from('compliance_categories')
            .select('*')
            .eq('tenant_id', session.tenantId);

        if (categoriesError) {
            console.error('Categories error:', categoriesError);
        }

        // Get user compliance status
        const { data: userCompliance, error: userError } = await supabase
            .from('user_compliance')
            .select('*')
            .eq('user_id', session.userId)
            .eq('status', 'pending');

        if (userError) {
            console.error('User compliance error:', userError);
        }

        const complianceData = {
            overallScore,
            breakdown: {
                hipaa: Math.random() * 20 + 80, // Mock data
                osha: Math.random() * 20 + 80,
                dea: Math.random() * 20 + 80,
                medicare: Math.random() * 20 + 80,
                state: Math.random() * 20 + 80
            },
            pendingItems: userCompliance?.length || 0,
            lastUpdated: latestScore?.calculated_at || new Date().toISOString()
        };

        res.json({
            success: true,
            data: complianceData
        });

    } catch (error) {
        console.error('Compliance overview error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/compliance/upcoming
 * Get upcoming compliance requirements
 */
router.get('/upcoming', validateSession, async (req, res) => {
    try {
        const session = req.session;
        
        const { data: requirements, error } = await supabase
            .from('user_compliance')
            .select(`
                *,
                requirement:compliance_requirements(id, name, description, category, priority)
            `)
            .eq('user_id', session.userId)
            .eq('status', 'pending')
            .lte('due_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
            .order('due_date', { ascending: true })
            .limit(10);

        if (error) {
            console.error('Upcoming requirements error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch upcoming requirements'
            });
        }

        const formattedRequirements = requirements.map(req => ({
            id: req.id,
            title: req.requirement?.name || 'Unknown Requirement',
            description: req.requirement?.description || '',
            category: req.requirement?.category || 'general',
            priority: req.requirement?.priority || 'medium',
            dueDate: req.due_date,
            status: req.status
        }));

        res.json({
            success: true,
            data: formattedRequirements
        });

    } catch (error) {
        console.error('Upcoming requirements error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/compliance/update
 * Update compliance status
 */
router.post('/update', validateSession, async (req, res) => {
    try {
        const session = req.session;
        const { complianceId, status, notes } = req.body;

        const { data, error } = await supabase
            .from('user_compliance')
            .update({
                status,
                notes: notes || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', complianceId)
            .eq('user_id', session.userId)
            .select()
            .single();

        if (error) {
            console.error('Compliance update error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update compliance status'
            });
        }

        res.json({
            success: true,
            message: 'Compliance status updated successfully',
            data
        });

    } catch (error) {
        console.error('Compliance update error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
