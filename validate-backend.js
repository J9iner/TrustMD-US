/**
 * Backend Structure Validator
 * Checks if all required files are present and properly structured
 */

const fs = require('fs');
const path = require('path');

class BackendValidator {
    constructor() {
        this.requiredFiles = {
            'src/backend/index.js': 'Main server entry point',
            'src/backend/api/auth.js': 'Authentication routes',
            'src/backend/api/compliance.js': 'Compliance routes',
            'src/backend/api/users.js': 'User management routes',
            'src/backend/api/risk.js': 'Risk assessment routes',
            'src/backend/api/documents.js': 'Document management routes',
            'src/backend/api/osha.js': 'OSHA compliance routes',
            'src/backend/api/states.js': 'State compliance routes',
            'src/backend/middleware/session-manager.js': 'Session management middleware',
            'src/backend/utils/error-handler.js': 'Error handling utilities',
            'src/backend/utils/input-sanitizer.js': 'Input sanitization',
            'src/backend/utils/rbac-compatibility-browser.js': 'RBAC utilities',
            'src/backend/services/supabase-client.js': 'Database client',
            'src/backend/models/risk-engine-algorithm.js': 'Risk assessment engine',
            'src/backend/models/state-specific-compliance-framework.js': 'State compliance framework',
            'src/backend/models/compliance-templates.js': 'Compliance templates',
            'src/backend/models/reporting-engine.js': 'Reporting engine',
            'src/backend/models/script.js': 'Backend initialization script'
        };
        
        this.requiredDirectories = [
            'src/backend',
            'src/backend/api',
            'src/backend/middleware',
            'src/backend/utils',
            'src/backend/services',
            'src/backend/models'
        ];
    }
    
    validate() {
        console.log('🔍 Validating TrustMD Backend Structure...\n');
        
        let allPassed = true;
        
        // Check directories
        console.log('📁 Checking Directories:');
        for (const dir of this.requiredDirectories) {
            const exists = fs.existsSync(dir);
            const status = exists ? '✅' : '❌';
            console.log(`  ${status} ${dir}`);
            if (!exists) allPassed = false;
        }
        
        console.log('\n📄 Checking Required Files:');
        for (const [file, description] of Object.entries(this.requiredFiles)) {
            const exists = fs.existsSync(file);
            const status = exists ? '✅' : '❌';
            console.log(`  ${status} ${file} - ${description}`);
            if (!exists) allPassed = false;
        }
        
        console.log('\n🔧 Checking File Contents:');
        
        // Check main server file
        if (fs.existsSync('src/backend/index.js')) {
            const content = fs.readFileSync('src/backend/index.js', 'utf8');
            const hasExpress = content.includes('express');
            const hasRoutes = content.includes('app.use(\'/api/');
            console.log(`  ${hasExpress ? '✅' : '❌'} Express.js setup`);
            console.log(`  ${hasRoutes ? '✅' : '❌'} API routes configured`);
            if (!hasExpress || !hasRoutes) allPassed = false;
        }
        
        // Check API routes
        const apiFiles = [
            'src/backend/api/auth.js',
            'src/backend/api/compliance.js',
            'src/backend/api/osha.js'
        ];
        
        for (const file of apiFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                const hasRouter = content.includes('express.Router()');
                const hasSupabase = content.includes('supabase');
                console.log(`  ${hasRouter ? '✅' : '❌'} ${path.basename(file)} - Router setup`);
                console.log(`  ${hasSupabase ? '✅' : '❌'} ${path.basename(file)} - Database integration`);
                if (!hasRouter || !hasSupabase) allPassed = false;
            }
        }
        
        // Check models
        const modelFiles = [
            'src/backend/models/risk-engine-algorithm.js',
            'src/backend/models/state-specific-compliance-framework.js'
        ];
        
        for (const file of modelFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                const hasClass = content.includes('class ');
                console.log(`  ${hasClass ? '✅' : '❌'} ${path.basename(file)} - Class structure`);
                if (!hasClass) allPassed = false;
            }
        }
        
        console.log('\n📋 Validation Summary:');
        if (allPassed) {
            console.log('✅ All backend structure validations passed!');
            console.log('🎉 TrustMD backend is properly structured and ready for deployment.');
        } else {
            console.log('❌ Some validations failed. Please review the issues above.');
        }
        
        return allPassed;
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new BackendValidator();
    validator.validate();
}

module.exports = BackendValidator;
