/**
 * Users API Routes
 * Handles user management and profile operations
 */

const express = require('express');
const Joi = require('joi');

const router = express.Router();
const { supabase } = require('../services/supabase-client');
const { validateSession } = require('../middleware/session-manager');

/**
 * GET /api/users/profile
 * Get user profile
 */
router.get('/profile', validateSession, async (req, res) => {
    try {
        const session = req.session;
        
        const { data: user, error } = await supabase
            .from('users')
            .select(`
                *,
                tenant:tenants(id, name, practice_type, state)
            `)
            .eq('id', session.userId)
            .single();

        if (error) {
            console.error('Profile fetch error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch user profile'
            });
        }

        // Remove sensitive data
        const { password_hash, ...safeUser } = user;

        res.json({
            success: true,
            data: safeUser
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put('/profile', validateSession, async (req, res) => {
    try {
        const session = req.session;
        const { fullName, department, phone } = req.body;

        const { data, error } = await supabase
            .from('users')
            .update({
                full_name: fullName,
                department,
                phone,
                updated_at: new Date().toISOString()
            })
            .eq('id', session.userId)
            .select()
            .single();

        if (error) {
            console.error('Profile update error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update profile'
            });
        }

        const { password_hash, ...safeData } = data;

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: safeData
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
