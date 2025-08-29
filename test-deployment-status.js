/**
 * Test Deployment Status
 * Check if our navigation changes are live in production
 */

async function testDeploymentStatus() {
    console.log('🚀 Checking Deployment Status');
    console.log('============================\n');
    
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    
    try {
        // Test if our navigation.html changes are deployed
        console.log('1️⃣ Checking navigation.html deployment...');
        const navResponse = await fetch(`${baseUrl}/includes/navigation.html`);
        const navHTML = await navResponse.text();
        
        // Look for our specific changes
        const hasDashboardRole = navHTML.includes('data-page="dashboard" data-role="student,teacher,amitrace_admin"');
        const hasBrowseStoriesRole = navHTML.includes('data-page="stories" data-role="student,teacher,amitrace_admin"');
        
        console.log(`   Dashboard role attribute: ${hasDashboardRole ? '✅ DEPLOYED' : '❌ NOT DEPLOYED'}`);
        console.log(`   Browse Stories role attribute: ${hasBrowseStoriesRole ? '✅ DEPLOYED' : '❌ NOT DEPLOYED'}`);
        
        // Test if include-navigation.js changes are deployed
        console.log('\n2️⃣ Checking include-navigation.js deployment...');
        const jsResponse = await fetch(`${baseUrl}/js/include-navigation.js`);
        const jsContent = await jsResponse.text();
        
        const hasRemovedDuplicateCode = !jsContent.includes('document.querySelectorAll(\'[data-role]\').forEach(element => {');
        const hasSimplifiedComment = jsContent.includes('Role-based visibility will be handled by VidPODNav.updateRoleVisibility()');
        
        console.log(`   Removed duplicate role code: ${hasRemovedDuplicateCode ? '✅ DEPLOYED' : '❌ NOT DEPLOYED'}`);
        console.log(`   Simplified comment added: ${hasSimplifiedComment ? '✅ DEPLOYED' : '❌ NOT DEPLOYED'}`);
        
        // Overall deployment status
        const allDeployed = hasDashboardRole && hasBrowseStoriesRole && hasRemovedDuplicateCode && hasSimplifiedComment;
        
        console.log('\n' + '='.repeat(40));
        console.log('📊 DEPLOYMENT STATUS');
        console.log('='.repeat(40));
        
        if (allDeployed) {
            console.log('🎉 All navigation changes DEPLOYED successfully!');
            console.log('Navigation role-based visibility should now work correctly.');
        } else {
            console.log('⏳ Deployment in progress or failed.');
            console.log('Railway may still be deploying the changes.');
            console.log('Wait 2-3 minutes and test again.');
        }
        
        return allDeployed;
        
    } catch (error) {
        console.error('❌ Error checking deployment:', error.message);
        return false;
    }
}

// Run the test
testDeploymentStatus().catch(console.error);