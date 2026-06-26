/**
 * States API Routes
 * Handles state-specific compliance
 */

const express = require('express');
const Joi = require('joi');

const router = express.Router();
const { supabase } = require('../services/supabase-client');
const { validateSession } = require('../middleware/session-manager');

/**
 * GET /api/states/active
 * Get active states for current tenant
 */
router.get('/active', validateSession, async (req, res) => {
    try {
        const session = req.session;
        
        const { data: states, error } = await supabase
            .from('state_medical_licenses')
            .select('state_code, status, expiration_date')
            .eq('tenant_id', session.tenantId)
            .neq('status', 'expired');

        if (error) {
            console.error('Active states error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch active states'
            });
        }

        const uniqueStates = [...new Set(states?.map(s => s.state_code) || [])];
        
        res.json({
            success: true,
            data: uniqueStates
        });

    } catch (error) {
        console.error('Active states error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/states/compliance/:stateCode
 * Get compliance data for specific state
 */
router.get('/compliance/:stateCode', validateSession, async (req, res) => {
    try {
        const session = req.session;
        const { stateCode } = req.params;
        
        // Mock state compliance data
        const complianceData = {
            stateCode,
            stateName: getStateName(stateCode),
            overallScore: Math.random() * 20 + 80,
            requirements: [
                {
                    id: 'medical_license',
                    name: 'Medical License',
                    status: 'active',
                    dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 'continuing_education',
                    name: 'Continuing Education',
                    status: 'pending',
                    dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 'state_reporting',
                    name: 'State Reporting',
                    status: 'active',
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            ],
            lastUpdated: new Date().toISOString()
        };

        res.json({
            success: true,
            data: complianceData
        });

    } catch (error) {
        console.error('State compliance error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

function getStateName(code) {
    const stateNames = {
        'CA': 'California',
        'NY': 'New York',
        'TX': 'Texas',
        'FL': 'Florida',
        'IL': 'Illinois'
    };
    return stateNames[code] || code;
}

module.exports = router;
