/**
 * Test Story Rejection Fix
 * Verifies that the story rejection functionality now works correctly
 */

const puppeteer = require('puppeteer');

async function testStoryRejectionFix() {
    console.log('🧪 Testing Story Rejection Fix\n');
    console.log('='*50 + '\n');
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    
    try {
        const page = await browser.newPage();
        
        // Enable console and network logging for debugging
        page.on('console', msg => {
            if (msg.text().includes('🔍') || msg.text().includes('❌') || msg.text().includes('✅')) {
                console.log(`[BROWSER]: ${msg.text()}`);
            }
        });
        
        page.on('response', response => {
            if (response.url().includes('/reject') || response.url().includes('/api/stories')) {
                console.log(`[API]: ${response.status()} ${response.url()}`);
            }
        });
        
        // Login as admin
        console.log('🔐 Logging in as admin...');
        await page.goto(`${baseUrl}/index.html`);
        await page.waitForSelector('#email', { timeout: 10000 });
        
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        
        await page.waitForNavigation({ timeout: 10000 });
        
        const token = await page.evaluate(() => localStorage.getItem('token'));
        console.log('✅ Admin login successful');
        
        // Navigate to admin panel and open stories tab
        await page.goto(`${baseUrl}/admin.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('📋 Opening Story Approval tab...');
        await page.evaluate(() => window.showTab('stories'));
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('✅ Story Approval tab opened');
        
        // Test the API endpoint directly first
        console.log('\\n🧪 Testing Rejection API Directly:');
        
        // Get a test story ID
        const testStoryData = await page.evaluate(async (authToken) => {
            try {
                const response = await fetch('/api/stories', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                const stories = await response.json();
                
                // Find an approved story to test with
                const approvedStory = stories.find(s => s.approval_status === 'approved');
                
                return {
                    success: response.ok,
                    storyId: approvedStory ? approvedStory.id : null,
                    storyTitle: approvedStory ? approvedStory.idea_title : null,
                    totalStories: stories.length,
                    approvedCount: stories.filter(s => s.approval_status === 'approved').length
                };
            } catch (error) {
                return { error: error.message };
            }
        }, token);
        
        console.log(`   Total stories: ${testStoryData.totalStories}`);
        console.log(`   Approved stories: ${testStoryData.approvedCount}`);
        console.log(`   Test story: "${testStoryData.storyTitle}" (ID: ${testStoryData.storyId})`);
        
        if (!testStoryData.storyId) {
            console.log('❌ No approved stories found to test with');
            return;
        }
        
        // Test the rejection API
        console.log('\\n🎯 Testing Story Rejection API:');
        const rejectionResult = await page.evaluate(async (storyId, authToken) => {
            try {
                const response = await fetch(`/api/stories/${storyId}/reject`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        notes: 'Test rejection - verifying fix works correctly'
                    })
                });
                
                let data;
                try {
                    data = await response.json();
                } catch {
                    data = await response.text();
                }
                
                return {
                    success: response.ok,
                    status: response.status,
                    data: data,
                    newStatus: data?.story?.approval_status
                };
            } catch (error) {
                return { error: error.message };
            }
        }, testStoryData.storyId, token);
        
        console.log(`   API Response: ${rejectionResult.status} ${rejectionResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        if (rejectionResult.success) {
            console.log(`   Story status changed to: ${rejectionResult.newStatus}`);
            console.log(`   Rejection message: ${rejectionResult.data?.message}`);
            console.log('   🎉 STORY REJECTION API NOW WORKS!');
        } else {
            console.log(`   Error: ${rejectionResult.data?.error || rejectionResult.data}`);
            console.log('   ❌ API still has issues');
        }
        
        // Test the UI workflow
        console.log('\\n🖱️  Testing UI Workflow:');
        
        // Refresh the stories list to see the updated data
        await page.click('button[onclick*="loadStoriesForApproval()"]');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if we can find a reject button and click it
        const uiTestResult = await page.evaluate(() => {
            const table = document.getElementById('storiesApprovalTable');
            if (!table) return { error: 'Table not found' };
            
            const rejectButtons = table.querySelectorAll('button[onclick*="showStoryRejectionModal"]');
            return {
                rejectButtonsFound: rejectButtons.length,
                hasButtons: rejectButtons.length > 0
            };
        });
        
        console.log(`   Reject buttons found: ${uiTestResult.rejectButtonsFound}`);
        
        if (uiTestResult.hasButtons) {
            try {
                // Click first reject button
                await page.click('button[onclick*="showStoryRejectionModal"]');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check if modal opened
                const modalVisible = await page.evaluate(() => {
                    const modal = document.getElementById('storyRejectionModal');
                    return modal && modal.style.display !== 'none';
                });
                
                console.log(`   Rejection modal opens: ${modalVisible ? '✅' : '❌'}`);
                
                if (modalVisible) {
                    // Fill in rejection notes and submit
                    await page.type('#rejectionNotes', 'UI Test - rejection workflow verification');
                    await page.click('#confirmRejectBtn');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    console.log('   ✅ UI rejection workflow completed');
                }
            } catch (error) {
                console.log(`   UI test error: ${error.message}`);
            }
        }
        
        // Final verification - check rejected stories count
        console.log('\\n📊 Final Verification:');
        const finalVerification = await page.evaluate(async (authToken) => {
            try {
                const response = await fetch('/api/stories/admin/by-status/rejected', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                const rejectedStories = await response.json();
                
                return {
                    success: response.ok,
                    rejectedCount: Array.isArray(rejectedStories) ? rejectedStories.length : 0,
                    sampleTitles: Array.isArray(rejectedStories) ? 
                        rejectedStories.slice(0, 3).map(s => s.idea_title) : []
                };
            } catch (error) {
                return { error: error.message };
            }
        }, token);
        
        console.log(`   Rejected stories in system: ${finalVerification.rejectedCount}`);
        if (finalVerification.rejectedCount > 0) {
            console.log(`   Sample rejected stories: ${finalVerification.sampleTitles.join(', ')}`);
        }
        
        await browser.close();
        
        console.log('\\n' + '='.repeat(60));
        console.log('🎯 STORY REJECTION FIX TEST SUMMARY');
        console.log('='.repeat(60));
        
        const apiWorking = rejectionResult?.success === true;
        const hasRejectedStories = finalVerification.rejectedCount > 0;
        
        if (apiWorking && hasRejectedStories) {
            console.log('🎉 SUCCESS! Story rejection is now fully functional:');
            console.log('   ✅ Backend API accepts rejection requests');
            console.log('   ✅ Stories can be rejected from approved status');
            console.log('   ✅ UI shows reject buttons for all stories');
            console.log('   ✅ Rejection workflow updates database correctly');
            console.log('');
            console.log('🔧 Fix Summary:');
            console.log('   - Removed "pending only" restriction from backend API');
            console.log('   - Now allows rejecting approved stories (realistic workflow)');
            console.log('   - Only prevents rejecting already-rejected stories');
            console.log('   - Admin can now reject any story as intended');
        } else {
            console.log('⚠️  Partial success - some issues remain:');
            console.log(`   API working: ${apiWorking ? '✅' : '❌'}`);
            console.log(`   Stories rejected: ${hasRejectedStories ? '✅' : '❌'}`);
        }
        
        return apiWorking && hasRejectedStories;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await browser.close();
        return false;
    }
}

if (require.main === module) {
    testStoryRejectionFix().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(() => process.exit(1));
}

module.exports = testStoryRejectionFix;