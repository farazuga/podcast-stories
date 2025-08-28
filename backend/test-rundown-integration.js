#!/usr/bin/env node

/**
 * VidPOD Rundown System Integration Test
 * Tests that all rundown system components are properly integrated
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 VidPOD Rundown System Integration Test');
console.log('=========================================\n');

// Test results tracking
const results = {
    passed: 0,
    failed: 0,
    warnings: 0
};

function testPassed(message) {
    console.log(`✅ ${message}`);
    results.passed++;
}

function testFailed(message) {
    console.log(`❌ ${message}`);
    results.failed++;
}

function testWarning(message) {
    console.log(`⚠️  ${message}`);
    results.warnings++;
}

function fileExists(filePath) {
    return fs.existsSync(filePath);
}

function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        return null;
    }
}

console.log('1. 🗄️  Database Migration Files');
console.log('--------------------------------');

const migrationFile = path.join(__dirname, 'migrations', '014_create_rundown_system.sql');
if (fileExists(migrationFile)) {
    testPassed('Migration file exists: 014_create_rundown_system.sql');
    
    const content = readFile(migrationFile);
    if (content && content.includes('CREATE TABLE IF NOT EXISTS rundowns')) {
        testPassed('Migration contains rundowns table definition');
    } else {
        testFailed('Migration missing rundowns table definition');
    }
    
    if (content && content.includes('CREATE TABLE IF NOT EXISTS rundown_segments')) {
        testPassed('Migration contains rundown_segments table definition');
    } else {
        testFailed('Migration missing rundown_segments table definition');
    }
    
    if (content && content.includes('CREATE TABLE IF NOT EXISTS rundown_talent')) {
        testPassed('Migration contains rundown_talent table definition');
    } else {
        testFailed('Migration missing rundown_talent table definition');
    }
    
    if (content && content.includes('CREATE TABLE IF NOT EXISTS rundown_stories')) {
        testPassed('Migration contains rundown_stories table definition');
    } else {
        testFailed('Migration missing rundown_stories table definition');
    }
} else {
    testFailed('Migration file missing: 014_create_rundown_system.sql');
}

console.log('\n2. 🛠️  Backend API Routes');
console.log('------------------------');

const routeFiles = [
    'routes/rundowns.js',
    'routes/rundown-segments.js',
    'routes/rundown-talent.js',
    'routes/rundown-stories.js'
];

routeFiles.forEach(routeFile => {
    const filePath = path.join(__dirname, routeFile);
    if (fileExists(filePath)) {
        testPassed(`Route file exists: ${routeFile}`);
        
        const content = readFile(filePath);
        if (content && content.includes('router.get(') && content.includes('router.post(')) {
            testPassed(`Route file has GET/POST endpoints: ${routeFile}`);
        } else {
            testWarning(`Route file may be missing endpoints: ${routeFile}`);
        }
    } else {
        testFailed(`Route file missing: ${routeFile}`);
    }
});

console.log('\n3. 🎨 Frontend Interface Files');
console.log('------------------------------');

const frontendFiles = [
    'frontend/rundowns.html',
    'frontend/css/rundown.css',
    'frontend/js/rundowns.js',
    'frontend/js/rundown-segments.js',
    'frontend/js/rundown-talent.js',
    'frontend/js/rundown-stories.js',
    'frontend/js/rundown-utils.js'
];

frontendFiles.forEach(frontendFile => {
    const filePath = path.join(__dirname, frontendFile);
    if (fileExists(filePath)) {
        testPassed(`Frontend file exists: ${frontendFile}`);
        
        const content = readFile(filePath);
        if (frontendFile.endsWith('.html') && content && content.includes('rundown')) {
            testPassed(`HTML file contains rundown content: ${frontendFile}`);
        }
        if (frontendFile.endsWith('.css') && content && content.includes('.rundown')) {
            testPassed(`CSS file contains rundown styles: ${frontendFile}`);
        }
        if (frontendFile.endsWith('.js') && content && content.includes('rundown')) {
            testPassed(`JS file contains rundown logic: ${frontendFile}`);
        }
    } else {
        testFailed(`Frontend file missing: ${frontendFile}`);
    }
});

console.log('\n4. 🔗 Integration Points');
console.log('------------------------');

// Check server.js integration
const serverFile = path.join(__dirname, 'server.js');
if (fileExists(serverFile)) {
    const serverContent = readFile(serverFile);
    if (serverContent && serverContent.includes("require('./routes/rundowns')")) {
        testPassed('Server.js includes rundown routes import');
    } else {
        testFailed('Server.js missing rundown routes import');
    }
    
    if (serverContent && serverContent.includes("app.use('/api/rundowns'")) {
        testPassed('Server.js includes rundown routes middleware');
    } else {
        testFailed('Server.js missing rundown routes middleware');
    }
} else {
    testFailed('Server.js file not found');
}

// Check navigation integration
const navFile = path.join(__dirname, 'frontend', 'includes', 'navigation.html');
if (fileExists(navFile)) {
    const navContent = readFile(navFile);
    if (navContent && navContent.includes('/rundowns.html')) {
        testPassed('Navigation includes rundown link');
    } else {
        testWarning('Navigation may be missing rundown link');
    }
} else {
    testWarning('Navigation file not found (may use different structure)');
}

// Check stories page integration
const storiesHtmlFile = path.join(__dirname, 'frontend', 'stories.html');
if (fileExists(storiesHtmlFile)) {
    const storiesContent = readFile(storiesHtmlFile);
    if (storiesContent && storiesContent.includes('rundown-utils.js')) {
        testPassed('Stories.html includes rundown utilities');
    } else {
        testWarning('Stories.html may be missing rundown integration');
    }
} else {
    testWarning('Stories.html file not found');
}

// Check stories.js integration
const storiesJsFile = path.join(__dirname, 'frontend', 'js', 'stories.js');
if (fileExists(storiesJsFile)) {
    const storiesJsContent = readFile(storiesJsFile);
    if (storiesJsContent && storiesJsContent.includes('addToRundown')) {
        testPassed('Stories.js includes rundown functionality');
    } else {
        testWarning('Stories.js may be missing rundown integration');
    }
} else {
    testWarning('Stories.js file not found');
}

// Check migration runner integration
const migrationRunnerFile = path.join(__dirname, 'routes', 'run-migration.js');
if (fileExists(migrationRunnerFile)) {
    const migrationContent = readFile(migrationRunnerFile);
    if (migrationContent && migrationContent.includes('rundown-system')) {
        testPassed('Migration runner includes rundown system endpoint');
    } else {
        testWarning('Migration runner may be missing rundown endpoint');
    }
} else {
    testWarning('Migration runner file not found');
}

console.log('\n5. 📦 Dependencies');
console.log('------------------');

const packageFile = path.join(__dirname, 'package.json');
if (fileExists(packageFile)) {
    const packageContent = readFile(packageFile);
    try {
        const packageJson = JSON.parse(packageContent);
        if (packageJson.dependencies && packageJson.dependencies.pdfkit) {
            testPassed('Package.json includes pdfkit dependency');
        } else {
            testWarning('Package.json may be missing pdfkit dependency');
        }
    } catch (error) {
        testFailed('Package.json is malformed');
    }
} else {
    testFailed('Package.json file not found');
}

console.log('\n📊 Test Summary');
console.log('===============');
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`⚠️  Warnings: ${results.warnings}`);

const totalTests = results.passed + results.failed;
const successRate = totalTests > 0 ? Math.round((results.passed / totalTests) * 100) : 0;

console.log(`\n🎯 Success Rate: ${successRate}% (${results.passed}/${totalTests})`);

if (results.failed === 0) {
    console.log('\n🎉 All critical tests passed! Rundown system appears to be properly integrated.');
} else if (results.failed <= 2) {
    console.log('\n⚠️  Minor issues detected. Rundown system mostly integrated.');
} else {
    console.log('\n🚨 Multiple issues detected. Rundown system may need additional work.');
}

if (results.warnings > 0) {
    console.log(`\n💡 ${results.warnings} warnings found. These may indicate missing integrations that need attention.`);
}

console.log('\n🔧 Next Steps:');
console.log('- Run database migration: GET /api/migration/rundown-system');
console.log('- Test rundown creation in browser');
console.log('- Verify story integration from stories page');
console.log('- Check PDF export functionality');

process.exit(results.failed > 0 ? 1 : 0);