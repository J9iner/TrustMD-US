/**
 * TrustMD Backend Entry Point
 * Medical Compliance Logbook - Main API Server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import middleware and services
const errorHandler = require('./utils/error-handler');
const inputSanitizer = require('./utils/input-sanitizer');
const sessionManager = require('./middleware/session-manager');
const { initializeOAuth } = require('./utils/oauth-config');

// Import API routes
const authRoutes = require('./api/auth');
const complianceRoutes = require('./api/compliance');
const userRoutes = require('./api/users');
const riskRoutes = require('./api/risk');
const documentRoutes = require('./api/documents');
const oshaRoutes = require('./api/osha');
const stateRoutes = require('./api/states');
const paymentRoutes = require('./api/payments');
const emailRoutes = require('./api/emails');

const app = express();
const PORT = process.env.PORT || 3001;

// Session configuration for OAuth
const session = require('express-session');
app.use(session({
    secret: process.env.SESSION_SECRET || 'trustmd-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize OAuth middleware
initializeOAuth(app);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", process.env.SUPABASE_URL],
        },
    },
}));

// CORS configuration
app.use(cors({
    origin: ['https://trustmd.live', 'https://app.trustmd.live', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(inputSanitizer);

// Session management
app.use(sessionManager);

// Static files (serving frontend)
app.use(express.static(path.join(__dirname, '../../dist')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/osha', oshaRoutes);
app.use('/api/states', stateRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/emails', emailRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '2.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'TrustMD API',
        version: '2.0.0',
        description: 'Medical Compliance Logbook API',
        endpoints: {
            auth: '/api/auth',
            compliance: '/api/compliance',
            users: '/api/users',
            risk: '/api/risk',
            documents: '/api/documents',
            osha: '/api/osha',
            states: '/api/states',
            health: '/api/health'
        },
        documentation: 'https://trustmd.live/docs/api'
    });
});

// Frontend fallback (SPA routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`
🏥 TrustMD API Server Started Successfully!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📚 API Docs: http://localhost:${PORT}/api
🔗 Health Check: http://localhost:${PORT}/api/health
    `);
});

module.exports = app;
