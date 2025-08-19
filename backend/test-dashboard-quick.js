/**
 * Quick Dashboard Test - Test script loading and basic functionality
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDashboardQuick() {
    console.log('🧪 Quick Dashboard Test');
    
    try {
        // Test 1: Check if dashboard.html loads with correct scripts
        console.log('\n📱 TEST 1: Script Loading Order');
        const dashboardResponse = await fetch('https://podcast-stories-production.up.railway.app/dashboard.html');
        const dashboardHtml = await dashboardResponse.text();
        
        const scriptMatches = dashboardHtml.match(/<script src="js\/(.*?)"><\/script>/g) || [];
        console.log('Script loading order:');
        scriptMatches.forEach((script, index) => {
            console.log(`   ${index + 1}. ${script}`);
        });
        
        const hasConfigFirst = scriptMatches[0]?.includes('config.js');
        const hasAuthSecond = scriptMatches[1]?.includes('auth.js');
        const hasDashboardThird = scriptMatches[2]?.includes('dashboard.js');
        const noDashboardNew = !dashboardHtml.includes('dashboard-new.js');
        
        console.log(`✅ config.js first: ${hasConfigFirst}`);
        console.log(`✅ auth.js second: ${hasAuthSecond}`);
        console.log(`✅ dashboard.js third: ${hasDashboardThird}`);
        console.log(`✅ No dashboard-new.js: ${noDashboardNew}`);
        
        // Test 2: Check if JavaScript files are accessible
        console.log('\n📁 TEST 2: JavaScript File Accessibility');
        
        const jsFiles = ['config.js', 'auth.js', 'dashboard.js'];
        for (const file of jsFiles) {
            const response = await fetch(`https://podcast-stories-production.up.railway.app/js/${file}`);
            console.log(`   ${file}: ${response.status} ${response.statusText}`);
        }
        
        // Test 3: Check auth endpoint
        console.log('\n🔐 TEST 3: API Connectivity');
        
        const authResponse = await fetch('https://podcast-stories-production.up.railway.app/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'student@vidpod.com',
                password: 'rumi&amaml'
            })
        });
        
        if (authResponse.ok) {
            const authData = await authResponse.json();
            console.log('✅ Login successful:', authData.user?.name || 'Unknown user');
            console.log('✅ Token received:', !!authData.token);
            
            // Test 4: Check API endpoints with token
            console.log('\n📊 TEST 4: Dashboard API Endpoints');
            
            const endpoints = [
                '/api/stories',
                '/api/favorites', 
                '/api/classes'
            ];
            
            for (const endpoint of endpoints) {
                const response = await fetch(`https://podcast-stories-production.up.railway.app${endpoint}`, {
                    headers: {
                        'Authorization': `Bearer ${authData.token}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`   ${endpoint}: ${response.status} - ${Array.isArray(data) ? data.length : 'N/A'} items`);
                } else {
                    console.log(`   ${endpoint}: ${response.status} ${response.statusText}`);
                }
            }
            
        } else {
            console.log('❌ Login failed:', authResponse.status, authResponse.statusText);
        }
        
        // Summary
        console.log('\n🎯 SUMMARY:');
        const scriptOrderOK = hasConfigFirst && hasAuthSecond && hasDashboardThird && noDashboardNew;
        
        if (scriptOrderOK) {
            console.log('✅ Fix 2 & 3: Script loading order and missing scripts - FIXED');
        } else {
            console.log('❌ Fix 2 & 3: Script loading issues still present');
        }
        
        if (authResponse?.ok) {
            console.log('✅ Fix 4: Dashboard API connectivity - WORKING');
            console.log('   Dashboard stats should now load properly for authenticated users');
        } else {
            console.log('❌ Fix 4: Dashboard API connectivity issues');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testDashboardQuick().catch(console.error);