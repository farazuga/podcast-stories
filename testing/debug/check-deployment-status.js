#!/usr/bin/env node

/**
 * Check if the latest navigation cleanup deployment is live
 */

const https = require('https');

function checkDeployment() {
    return new Promise((resolve) => {
        https.get('https://podcast-stories-production.up.railway.app/js/navigation.js', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const hasOldFunction = data.includes('customizeAdminNavigation()');
                const hasTeacherLinks = data.includes('teacherLinks');
                
                console.log('🚀 Deployment Status Check:');
                console.log('==================================');
                console.log(`customizeAdminNavigation: ${hasOldFunction ? '❌ Still present (old)' : '✅ Removed (deployed)'}`);
                console.log(`teacherLinks logic: ${hasTeacherLinks ? '❌ Still present (old)' : '✅ Removed (deployed)'}`);
                
                if (!hasOldFunction && !hasTeacherLinks) {
                    console.log('\n✅ DEPLOYMENT COMPLETE!');
                    console.log('The navigation cleanup has been successfully deployed.');
                    resolve(true);
                } else {
                    console.log('\n⏳ DEPLOYMENT PENDING');
                    console.log('Railway is still deploying the changes...');
                    resolve(false);
                }
            });
        }).on('error', (err) => {
            console.error('❌ Error checking deployment:', err.message);
            resolve(false);
        });
    });
}

async function main() {
    const startTime = Date.now();
    let deployed = false;
    let attempts = 0;
    
    console.log('🔍 Checking deployment status...\n');
    
    while (!deployed && attempts < 20) {
        attempts++;
        deployed = await checkDeployment();
        
        if (!deployed) {
            console.log(`\n⏰ Waiting 30 seconds before next check (attempt ${attempts}/20)...\n`);
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n⏱️  Total time: ${elapsed} seconds`);
    
    if (!deployed && attempts >= 20) {
        console.log('⚠️  Maximum attempts reached. Please check Railway dashboard.');
    }
}

// Run immediately
checkDeployment();