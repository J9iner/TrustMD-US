/**
 * Documents API Routes
 * Handles document management and storage
 */

const express = require('express');
const Joi = require('joi');

const router = express.Router();
const { supabase } = require('../services/supabase-client');
const { validateSession } = require('../middleware/session-manager');

// Document categories
const DOCUMENT_CATEGORIES = {
    LICENSURE: 'licensure_documents',
    TRAINING: 'training_education_documents', 
    POLICY: 'policy_operational_documents',
    AUDIT: 'audit_inspection_documents',
    ACCREDITATION: 'accreditation_documents',
    FEDERAL: 'federal_compliance_documents'
};

// Supported file formats (including .xlsx for logbook compatibility)
const SUPPORTED_FORMATS = [
    'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',  // Documents
    'xlsx', 'xls', 'csv', 'json', 'xml',        // Data files (Excel for logbook tracking)
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'  // Images
];

/**
 * GET /api/documents/categories
 * Get available document categories
 */
router.get('/categories', (req, res) => {
    res.json({
        success: true,
        data: Object.values(DOCUMENT_CATEGORIES).map((category, index) => ({
            id: category,
            name: Object.keys(DOCUMENT_CATEGORIES)[index]
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase()),
            description: getCategoryDescription(category)
        }))
    });
});

/**
 * GET /api/documents/formats
 * Get supported file formats
 */
router.get('/formats', (req, res) => {
    res.json({
        success: true,
        data: {
            supported: SUPPORTED_FORMATS,
            maxSize: '10MB',
            note: 'Excel files (.xlsx, .xls) supported for compliance tracking and logbook data'
        }
    });
});

function getCategoryDescription(category) {
    const descriptions = {
        [DOCUMENT_CATEGORIES.LICENSURE]: 'Medical licenses, DEA registrations, state certifications',
        [DOCUMENT_CATEGORIES.TRAINING]: 'OSHA training, HIPAA training, continuing education certificates',
        [DOCUMENT_CATEGORIES.POLICY]: 'Practice policies, procedures, operational manuals',
        [DOCUMENT_CATEGORIES.AUDIT]: 'Audit reports, inspection results, compliance reviews',
        [DOCUMENT_CATEGORIES.ACCREDITATION]: 'Joint Commission, AAAHC, other accreditation documents',
        [DOCUMENT_CATEGORIES.FEDERAL]: 'Medicare, Medicaid, federal compliance documentation'
    };
    return descriptions[category] || 'Compliance documentation';
}

/**
 * GET /api/documents
 * Get documents for current user
 */
router.get('/', validateSession, async (req, res) => {
    try {
        const session = req.session;
        const { category, status } = req.query;
        
        let query = supabase
            .from('documents')
            .select('*')
            .eq('tenant_id', session.tenantId);
            
        if (category) query = query.eq('category', category);
        if (status) query = query.eq('status', status);
        
        const { data: documents, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Documents fetch error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch documents'
            });
        }

        res.json({
            success: true,
            data: documents || []
        });

    } catch (error) {
        console.error('Documents error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/documents
 * Upload new document
 */
router.post('/', validateSession, async (req, res) => {
    try {
        const session = req.session;
        const { title, category, description, documentType, fileName, fileSize } = req.body;

        // Validate category
        const validCategories = Object.values(DOCUMENT_CATEGORIES);
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid document category',
                validCategories
            });
        }

        // Validate file format (if provided)
        if (fileName) {
            const fileExtension = fileName.split('.').pop().toLowerCase();
            if (!SUPPORTED_FORMATS.includes(fileExtension)) {
                return res.status(400).json({
                    success: false,
                    error: 'Unsupported file format',
                    supportedFormats: SUPPORTED_FORMATS,
                    note: 'Excel files (.xlsx, .xls) are supported for compliance tracking'
                });
            }
        }

        // Validate file size (max 10MB)
        if (fileSize && fileSize > 10 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                error: 'File size exceeds 10MB limit',
                maxSize: '10MB'
            });
        }

        const { data, error } = await supabase
            .from('documents')
            .insert({
                tenant_id: session.tenantId,
                user_id: session.userId,
                title,
                category,
                description,
                document_type: documentType,
                file_name: fileName,
                file_size: fileSize,
                status: 'active',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Document creation error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to create document'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data
        });

    } catch (error) {
        console.error('Document creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
