const puppeteer = require('puppeteer');

async function debugDeploymentPath() {
    console.log('🔍 DEBUGGING DEPLOYMENT FILE PATHS');
    console.log('===================================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 50,
        args: ['--no-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        console.log('1️⃣ Testing File Access Paths...\n');
        
        // Test different file paths that might be served
        const baseUrl = 'https://podcast-stories-production.up.railway.app';
        const testPaths = [
            `${baseUrl}/js/navigation.js`,
            `${baseUrl}/frontend/js/navigation.js`, 
            `${baseUrl}/backend/frontend/js/navigation.js`,
            `${baseUrl}/includes/navigation.html`,
            `${baseUrl}/frontend/includes/navigation.html`,
            `${baseUrl}/backend/frontend/includes/navigation.html`
        ];
        
        for (const testPath of testPaths) {
            const result = await page.evaluate(async (path) => {
                try {
                    const response = await fetch(path);
                    const content = await response.text();
                    return {
                        path: path,
                        status: response.status,
                        ok: response.ok,
                        contentLength: content.length,
                        hasAmitraceFix: content.includes('amitrace_admin'),
                        lastModified: response.headers.get('last-modified') || 'unknown',
                        contentPreview: content.substring(0, 200) + '...'
                    };
                } catch (error) {
                    return {
                        path: path,
                        error: error.message
                    };
                }
            }, testPath);
            
            console.log(`Path: ${result.path}`);
            if (result.error) {
                console.log(`  ❌ Error: ${result.error}`);
            } else {
                console.log(`  Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
                console.log(`  Content Length: ${result.contentLength} bytes`);
                console.log(`  Has amitrace_admin fix: ${result.hasAmitraceFix ? '✅' : '❌'}`);
                console.log(`  Last Modified: ${result.lastModified}`);
                if (testPath.includes('navigation.js') && result.ok) {
                    console.log(`  Preview: ${result.contentPreview}`);
                }
            }
            console.log('');
        }
        
        console.log('2️⃣ Checking Current File Content...\n');
        
        // Get the actual content being served
        const actualNavJs = await page.evaluate(async () => {
            const response = await fetch('https://podcast-stories-production.up.railway.app/js/navigation.js');
            const content = await response.text();
            
            // Check specific functions
            const checks = {
                hasAmitraceFix: content.includes("['admin', 'amitrace_admin'].includes(userRole)"),
                hasOldCode: content.includes("userRole === 'admin'"),
                hasValidationFix: content.includes("'amitrace_admin': {"),
                hasDeploymentMarker: content.includes('DEPLOYMENT VERSION: 2025-08-20'),
                adminLinksSection: content.substring(
                    content.indexOf('adminLinks.forEach'), 
                    content.indexOf('adminLinks.forEach') + 200
                ),
                validateSection: content.substring(
                    content.indexOf('validateRoleBasedAccess'), 
                    content.indexOf('validateRoleBasedAccess') + 500
                )
            };
            
            return checks;
        });
        
        console.log('Current navigation.js Analysis:');
        console.log(`  Has amitrace_admin fix: ${actualNavJs.hasAmitraceFix ? '✅' : '❌'}`);
        console.log(`  Still has old code: ${actualNavJs.hasOldCode ? '❌ YES' : '✅ NO'}`);
        console.log(`  Has validation fix: ${actualNavJs.hasValidationFix ? '✅' : '❌'}`);
        console.log(`  Has deployment marker: ${actualNavJs.hasDeploymentMarker ? '✅' : '❌'}`);
        
        console.log('\nAdminLinks Section:');
        console.log(`  ${actualNavJs.adminLinksSection}`);
        
        console.log('\nValidation Section Preview:');
        console.log(`  ${actualNavJs.validateSection.substring(0, 200)}...`);
        
        console.log('\n3️⃣ Testing Navigation HTML...\n');
        
        const actualNavHtml = await page.evaluate(async () => {
            const response = await fetch('https://podcast-stories-production.up.railway.app/includes/navigation.html');
            const content = await response.text();
            
            return {
                hasAmitraceFix: content.includes('data-role="admin,amitrace_admin"'),
                hasOldCode: content.includes('data-role="admin"') && !content.includes('data-role="admin,amitrace_admin"'),
                hasDeploymentMarker: content.includes('DEPLOYMENT VERSION: 2025-08-20'),
                adminElements: content.substring(
                    content.indexOf('Admin Panel'),
                    content.indexOf('Admin Panel') + 200
                )
            };
        });
        
        console.log('Current navigation.html Analysis:');
        console.log(`  Has amitrace_admin fix: ${actualNavHtml.hasAmitraceFix ? '✅' : '❌'}`);
        console.log(`  Still has old code: ${actualNavHtml.hasOldCode ? '❌ YES' : '✅ NO'}`);
        console.log(`  Has deployment marker: ${actualNavHtml.hasDeploymentMarker ? '✅' : '❌'}`);
        
        console.log('\nAdmin Elements Section:');
        console.log(`  ${actualNavHtml.adminElements}`);
        
        console.log('\n🎯 DEPLOYMENT PATH DIAGNOSIS:');
        console.log('==============================');
        
        if (!actualNavJs.hasAmitraceFix || !actualNavHtml.hasAmitraceFix) {
            console.log('❌ CONFIRMED: Railway is serving OLD files');
            console.log('   - Files with fixes exist locally but not deployed');
            console.log('   - Railway deployment process has issues');
            
            console.log('\nPossible causes:');
            console.log('1. Railway cache not invalidating');
            console.log('2. Build process not copying updated files');
            console.log('3. Different file paths being served');
            console.log('4. Railway serving from cached Docker layer');
            
        } else {
            console.log('✅ Files appear to be deployed correctly');
            console.log('   - Issue may be in JavaScript execution');
        }
        
    } catch (error) {
        console.error('🚨 Debug failed:', error.message);
    } finally {
        await browser.close();
    }
}

debugDeploymentPath().catch(console.error);