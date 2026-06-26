// TrustMD Development Server
// Simple server to start the API for front-end development

const TrustMDAPIServer = require('./api-server.js');

// Development server configuration
const DEV_CONFIG = {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost',
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:3000'],
        credentials: true
    },
    logging: {
        level: 'debug',
        timestamp: true
    }
};

// Initialize and start the development server
async function startDevServer() {
    console.log('🚀 Starting TrustMD Development Server...');
    console.log(`📍 Server will run on http://${DEV_CONFIG.host}:${DEV_CONFIG.port}`);
    console.log('🔧 Development mode enabled');
    
    try {
        // Initialize the API server
        const apiServer = new TrustMDAPIServer();
        
        // Mock dependencies for development
        const mockDependencies = {
            supabaseClient: {
                from: (table) => ({
                    select: () => Promise.resolve({ data: [], error: null }),
                    insert: () => Promise.resolve({ data: {}, error: null }),
                    update: () => Promise.resolve({ data: {}, error: null }),
                    delete: () => Promise.resolve({ data: {}, error: null })
                })
            },
            phiProtection: {
                scanForPHI: () => Promise.resolve({ containsPHI: false, authorized: true })
            },
            riskEngine: {
                calculateRisk: () => Promise.resolve({ score: 25, level: 'low' })
            },
            evidenceVault: {
                storeDocument: () => Promise.resolve({ id: 'doc-123', url: '/documents/doc-123' })
            }
        };
        
        // Initialize with mock dependencies
        const initResult = await apiServer.initialize(mockDependencies);
        
        if (initResult.success) {
            console.log('✅ API Server initialized successfully');
            console.log('📋 Available endpoints:');
            initResult.endpoints.forEach(endpoint => {
                console.log(`   ${endpoint.method.toUpperCase()} ${endpoint.path}`);
            });
            
            // Create a simple HTTP server
            const http = require('http');
            const url = require('url');
            
            const server = http.createServer(async (req, res) => {
                // Enable CORS
                res.setHeader('Access-Control-Allow-Origin', DEV_CONFIG.cors.origin.join(', '));
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-ID');
                res.setHeader('Access-Control-Allow-Credentials', 'true');
                
                // Handle preflight requests
                if (req.method === 'OPTIONS') {
                    res.writeHead(200);
                    res.end();
                    return;
                }
                
                // Parse URL
                const parsedUrl = url.parse(req.url, true);
                const path = parsedUrl.pathname;
                const method = req.method;
                
                // Create mock request object
                const mockReq = {
                    method,
                    path,
                    query: parsedUrl.query,
                    headers: req.headers,
                    body: await parseRequestBody(req),
                    user: { tenantId: 'dev-tenant' }
                };
                
                // Create mock response object
                const mockRes = {
                    statusCode: 200,
                    headers: {},
                    writeHead: (statusCode, headers) => {
                        res.statusCode = statusCode;
                        Object.assign(res.getHeaders(), headers || {});
                    },
                    getHeaders: () => res.getHeaders ? res.getHeaders() : {},
                    end: (data) => {
                        res.end(data);
                    }
                };
                
                // Handle request
                const result = await apiServer.handleRequest(mockReq, mockRes);
                
                // Send response
                if (result.statusCode) {
                    res.writeHead(result.statusCode, result.headers);
                }
                res.end(result.body || '{}');
            });
            
            // Start listening
            server.listen(DEV_CONFIG.port, DEV_CONFIG.host, () => {
                console.log(`🎉 TrustMD Development Server is running!`);
                console.log(`🌐 Server: http://${DEV_CONFIG.host}:${DEV_CONFIG.port}`);
                console.log(`📚 API Documentation: http://${DEV_CONFIG.host}:${DEV_CONFIG.port}/states`);
                console.log(`🔍 Health Check: http://${DEV_CONFIG.host}:${DEV_CONFIG.port}/health`);
                console.log('');
                console.log('🚀 Available Development Endpoints:');
                console.log('   GET  /states - List all 50 states');
                console.log('   GET  /states/:stateCode - Get state details');
                console.log('   GET  /states/:stateCode/regulations - Get state regulations');
                console.log('   POST /states/:stateCode/validate - Validate compliance');
                console.log('   GET  /states/:stateCode/report - Generate compliance report');
                console.log('   GET  /states/comparison - Compare multiple states');
                console.log('   GET  /states/analytics - Get states analytics');
                console.log('');
                console.log('💡 Example Usage:');
                console.log('   curl http://localhost:3001/states');
                console.log('   curl http://localhost:3001/states/CA');
                console.log('   curl http://localhost:3001/states/CA/regulations');
                console.log('');
                console.log('🔧 Press Ctrl+C to stop the server');
            });
            
            // Handle graceful shutdown
            process.on('SIGINT', () => {
                console.log('\n🛑 Shutting down TrustMD Development Server...');
                server.close(() => {
                    console.log('✅ Server stopped gracefully');
                    process.exit(0);
                });
            });
            
        } else {
            console.error('❌ Failed to initialize API Server:', initResult.error);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Failed to start development server:', error);
        process.exit(1);
    }
}

// Helper function to parse request body
function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(error);
            }
        });
        
        req.on('error', reject);
    });
}

// Start the development server
if (require.main === module) {
    startDevServer();
}

module.exports = { startDevServer, DEV_CONFIG };
