/**
 * Risk API Routes
 * Handles risk assessment and analysis
 */

const express = require('express');
const Joi = require('joi');

const router = express.Router();
const { supabase } = require('../services/supabase-client');
const { validateSession } = require('../middleware/session-manager');

/**
 * GET /api/risk/assessment
 * Get current risk assessment
 */
router.get('/assessment', validateSession, async (req, res) => {
    try {
        const session = req.session;
        
        // Mock risk assessment data
        const riskData = {
            overallRisk: 'medium',
            riskScore: 65,
            riskLevel: 'medium',
            factors: [
                {
                    name: 'Compliance Score',
                    score: 85,
                    severity: 'low',
                    weight: 0.3
                },
                {
                    name: 'OSHA Training',
                    score: 70,
                    severity: 'medium',
                    weight: 0.2
                },
                {
                    name: 'Document Status',
                    score: 60,
                    severity: 'medium',
                    weight: 0.25
                },
                {
                    name: 'Audit History',
                    score: 50,
                    severity: 'high',
                    weight: 0.25
                }
            ],
            recommendations: [
                'Complete OSHA training for all staff',
                'Update missing compliance documents',
                'Schedule internal audit',
                'Review and update policies'
            ],
            lastAssessed: new Date().toISOString()
        };

        res.json({
            success: true,
            data: riskData
        });

    } catch (error) {
        console.error('Risk assessment error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/risk/calculate
 * Calculate new risk assessment
 */
router.post('/calculate', validateSession, async (req, res) => {
    try {
        const session = req.session;
        const { factors } = req.body;

        // Mock risk calculation
        const totalScore = factors.reduce((acc, factor) => {
            return acc + (factor.score * factor.weight);
        }, 0);

        let riskLevel = 'low';
        if (totalScore < 40) riskLevel = 'low';
        else if (totalScore < 70) riskLevel = 'medium';
        else riskLevel = 'high';

        const assessment = {
            overallRisk: riskLevel,
            riskScore: Math.round(totalScore),
            riskLevel,
            factors: factors.map(f => ({
                ...f,
                severity: f.score < 40 ? 'high' : f.score < 70 ? 'medium' : 'low'
            })),
            recommendations: generateRecommendations(factors, riskLevel),
            lastAssessed: new Date().toISOString()
        };

        res.json({
            success: true,
            message: 'Risk assessment calculated successfully',
            data: assessment
        });

    } catch (error) {
        console.error('Risk calculation error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

function generateRecommendations(factors, riskLevel) {
    const recommendations = [];
    
    factors.forEach(factor => {
        if (factor.score < 60) {
            recommendations.push(`Improve ${factor.name} (current: ${factor.score})`);
        }
    });

    if (riskLevel === 'high') {
        recommendations.push('Immediate action required - high risk detected');
    } else if (riskLevel === 'medium') {
        recommendations.push('Schedule review within 30 days');
    } else {
        recommendations.push('Continue monitoring compliance');
    }

    return recommendations;
}

module.exports = router;
