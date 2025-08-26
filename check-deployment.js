/**
 * Check if deployment is ready by monitoring JS changes
 */

const https = require('https');

async function checkDeployment() {
    return new Promise((resolve, reject) => {
        https.get('https://podcast-stories-production.up.railway.app/js/navigation.js', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const hasTeacherLinks = data.includes('teacherLinks');
                const hasCustomizeAdminCall = data.includes('customizeAdminNavigation()');
                
                console.log(`📊 Deployment Status Check:`);
                console.log(`   teacherLinks logic present: ${hasTeacherLinks ? '❌ YES (old)' : '✅ NO (new)'}`);
                console.log(`   customizeAdminNavigation call: ${hasCustomizeAdminCall ? '❌ YES (old)' : '✅ NO (new)'}`);
                
                if (!hasTeacherLinks && !hasCustomizeAdminCall) {
                    console.log('🎉 DEPLOYMENT READY! New navigation logic is live.');
                    resolve(true);
                } else {
                    console.log('⏳ Deployment not ready yet, old code still served.');
                    resolve(false);
                }
            });
            res.on('error', reject);
        });
    });
}

async function waitForDeployment() {
    console.log('⏳ Waiting for Railway deployment to complete...\n');
    
    let attempts = 0;
    const maxAttempts = 20; // Max 10 minutes
    
    while (attempts < maxAttempts) {
        attempts++;
        console.log(`🔍 Check ${attempts}/${maxAttempts}:`);
        
        const isReady = await checkDeployment();
        
        if (isReady) {
            console.log('\n✅ Deployment complete! Ready to test.');
            return true;
        }
        
        console.log(`   Waiting 30 seconds before next check...\n`);
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    console.log('⚠️  Max attempts reached. Testing with current deployment state.');
    return false;
}

if (require.main === module) {
    waitForDeployment();
}

module.exports = { checkDeployment, waitForDeployment };