// TrustMD Template Export Fixer
// Batch script to fix ES6 exports in all state template files

const fs = require('fs');
const path = require('path');

// List of all state template files to fix
const templateFiles = [
    // Tier 1
    'compliance-templates/state-templates/tier1/california-template.js',
    'compliance-templates/state-templates/tier1/florida-template.js',
    'compliance-templates/state-templates/tier1/illinois-template.js',
    'compliance-templates/state-templates/tier1/new-york-template.js',
    'compliance-templates/state-templates/tier1/texas-template.js',
    
    // Tier 2
    'compliance-templates/state-templates/tier2/arizona-template.js',
    'compliance-templates/state-templates/tier2/georgia-template.js',
    'compliance-templates/state-templates/tier2/indiana-template.js',
    'compliance-templates/state-templates/tier2/maryland-template.js',
    'compliance-templates/state-templates/tier2/massachusetts-template.js',
    'compliance-templates/state-templates/tier2/michigan-template.js',
    'compliance-templates/state-templates/tier2/missouri-template.js',
    'compliance-templates/state-templates/tier2/new-jersey-template.js',
    'compliance-templates/state-templates/tier2/north-carolina-template.js',
    'compliance-templates/state-templates/tier2/ohio-template.js',
    'compliance-templates/state-templates/tier2/pennsylvania-template.js',
    'compliance-templates/state-templates/tier2/tennessee-template.js',
    'compliance-templates/state-templates/tier2/virginia-template.js',
    'compliance-templates/state-templates/tier2/washington-template.js',
    'compliance-templates/state-templates/tier2/wisconsin-template.js',
    
    // Tier 3
    'compliance-templates/state-templates/tier3/alabama-template.js',
    'compliance-templates/state-templates/tier3/arkansas-template.js',
    'compliance-templates/state-templates/tier3/colorado-template.js',
    'compliance-templates/state-templates/tier3/connecticut-template.js',
    'compliance-templates/state-templates/tier3/iowa-template.js',
    'compliance-templates/state-templates/tier3/kansas-template.js',
    'compliance-templates/state-templates/tier3/kentucky-template.js',
    'compliance-templates/state-templates/tier3/louisiana-template.js',
    'compliance-templates/state-templates/tier3/minnesota-template.js',
    'compliance-templates/state-templates/tier3/mississippi-template.js',
    'compliance-templates/state-templates/tier3/nevada-template.js',
    'compliance-templates/state-templates/tier3/new-mexico-template.js',
    'compliance-templates/state-templates/tier3/oklahoma-template.js',
    'compliance-templates/state-templates/tier3/oregon-template.js',
    'compliance-templates/state-templates/tier3/rhode-island-template.js',
    'compliance-templates/state-templates/tier3/south-carolina-template.js',
    'compliance-templates/state-templates/tier3/south-dakota-template.js',
    'compliance-templates/state-templates/tier3/utah-template.js',
    'compliance-templates/state-templates/tier3/west-virginia-template.js'
];

function fixTemplateFile(filePath) {
    try {
        console.log(`Fixing: ${filePath}`);
        
        // Read the file
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extract class name from the file
        const classMatch = content.match(/export default class (\w+)/);
        if (!classMatch) {
            console.log(`  ⚠️  No ES6 export found in ${filePath}`);
            return false;
        }
        
        const className = classMatch[1];
        
        // Remove ES6 export and replace with regular class declaration
        let fixedContent = content.replace(/export default class (\w+)/, 'class $1');
        
        // Remove the closing brace at the end and add proper exports
        fixedContent = fixedContent.replace(/\n}$/, '');
        
        // Add browser-compatible exports
        fixedContent += `

}

// Export for use in both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ${className};
} else {
    window.${className} = ${className};
}
`;
        
        // Write the fixed content back
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        
        console.log(`  ✅ Fixed ${className} in ${filePath}`);
        return true;
        
    } catch (error) {
        console.error(`  ❌ Error fixing ${filePath}:`, error.message);
        return false;
    }
}

// Fix all template files
console.log('🔧 Starting template export fixes...\n');

let fixedCount = 0;
let totalCount = templateFiles.length;

for (const file of templateFiles) {
    if (fixTemplateFile(file)) {
        fixedCount++;
    }
}

console.log(`\n🎉 Template export fixes complete!`);
console.log(`📊 Results: ${fixedCount}/${totalCount} files fixed`);

if (fixedCount === totalCount) {
    console.log('✅ All template files successfully fixed!');
} else {
    console.log(`⚠️  ${totalCount - fixedCount} files had issues or were already fixed`);
}

console.log('\n🚀 Template system should now work in browsers!');
