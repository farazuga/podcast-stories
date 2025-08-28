/**
 * Debug Story Rejection Issue
 * Tests the complete story rejection workflow to identify where it fails
 */

const puppeteer = require('puppeteer');

async function debugStoryRejection() {
    console.log('🔍 Debugging Story Rejection Issue\n');
    
    const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            console.log(`[BROWSER]: ${msg.text()}`);
        });
        
        // Enable network logging
        page.on('response', response => {
            if (response.url().includes('/api/stories')) {
                console.log(`[API]: ${response.status()} ${response.url()}`);
            }
        });
        
        // Login as admin
        console.log('🔐 Logging in as admin...');
        await page.goto(`${baseUrl}/index.html`);
        await page.waitForSelector('#email', { timeout: 10000 });
        
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ timeout: 10000 });
        
        const token = await page.evaluate(() => localStorage.getItem('token'));
        console.log('✅ Admin token obtained');
        
        // Go to admin panel
        await page.goto(`${baseUrl}/admin.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Open stories tab
        console.log('📋 Opening Story Approval tab...');
        await page.evaluate(() => window.showTab('stories'));
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check current story statuses
        console.log('\n📊 Analyzing Story Data:');
        const storyAnalysis = await page.evaluate(() => {
            const table = document.getElementById('storiesApprovalTable');
            if (!table) return { error: 'Table not found' };
            
            const rows = Array.from(table.querySelectorAll('tr'));
            const stories = [];
            
            rows.forEach((row, index) => {
                if (index === 0) return; // Skip header
                const cells = row.querySelectorAll('td');
                if (cells.length >= 5) {
                    stories.push({
                        id: cells[0]?.textContent?.trim(),
                        title: cells[2]?.textContent?.trim(),
                        status: cells[4]?.textContent?.trim(),
                        hasRejectButton: row.querySelector('button[onclick*="showStoryRejectionModal"]') !== null
                    });
                }
            });
            
            return { stories, totalCount: stories.length };
        });
        
        if (storyAnalysis.error) {
            console.log('❌ Error analyzing stories:', storyAnalysis.error);
            return;
        }
        
        console.log(`   Total stories loaded: ${storyAnalysis.totalCount}`);
        storyAnalysis.stories.forEach((story, index) => {
            console.log(`   ${index + 1}. "${story.title}" - Status: ${story.status} - Has Reject Button: ${story.hasRejectButton ? '✅' : '❌'}`);
        });
        
        // Test API endpoints directly
        console.log('\n🧪 Testing API Endpoints:');
        
        // Test getting all stories
        const allStoriesTest = await page.evaluate(async (authToken) => {
            try {
                const response = await fetch('/api/stories', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                const data = await response.json();
                return {
                    success: response.ok,
                    status: response.status,
                    count: Array.isArray(data) ? data.length : 0,
                    statuses: Array.isArray(data) ? [...new Set(data.map(s => s.approval_status))] : []
                };
            } catch (error) {
                return { error: error.message };
            }
        }, token);
        
        console.log(`   All Stories API: ${allStoriesTest.success ? '✅' : '❌'} - Count: ${allStoriesTest.count} - Statuses: ${allStoriesTest.statuses?.join(', ')}`);
        
        // Test rejection API with a real story
        if (storyAnalysis.stories.length > 0) {
            const testStoryId = storyAnalysis.stories[0].id;
            console.log(`\n🧪 Testing Rejection API with Story ID: ${testStoryId}`);
            
            const rejectionTest = await page.evaluate(async (storyId, authToken) => {
                try {
                    const response = await fetch(`/api/stories/${storyId}/reject`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            notes: 'Test rejection for debugging'
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
                        data: data
                    };
                } catch (error) {
                    return { error: error.message };
                }
            }, testStoryId, token);
            
            console.log(`   Rejection API Response: ${rejectionTest.status} ${rejectionTest.success ? '✅' : '❌'}`);
            console.log(`   Response data: ${JSON.stringify(rejectionTest.data)}`);
            
            // Analyze the specific error
            if (!rejectionTest.success && rejectionTest.data?.error) {
                console.log(`   🎯 ROOT CAUSE IDENTIFIED: ${rejectionTest.data.error}`);
                
                if (rejectionTest.data.error.includes('pending status')) {
                    console.log('\n🔧 ISSUE ANALYSIS:');
                    console.log('   - The rejection API only accepts stories in "pending" status');
                    console.log('   - All stories in the system are "approved"');
                    console.log('   - This means rejection functionality cannot work');
                    console.log('   - Backend needs to be modified to allow rejecting "approved" stories');
                }
            }
        }
        
        // Test UI interaction (if there are reject buttons)
        const hasRejectButtons = storyAnalysis.stories.some(s => s.hasRejectButton);
        if (hasRejectButtons) {
            console.log('\n🖱️  Testing UI Interaction:');
            try {
                // Click the first reject button
                await page.click('button[onclick*="showStoryRejectionModal"]');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const modalVisible = await page.evaluate(() => {
                    const modal = document.getElementById('storyRejectionModal');
                    return modal ? modal.style.display !== 'none' : false;
                });
                
                console.log(`   Rejection modal opens: ${modalVisible ? '✅' : '❌'}`);
                
                if (modalVisible) {
                    // Test form submission
                    await page.type('#rejectionNotes', 'Test rejection notes');
                    await page.click('#confirmRejectBtn');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    console.log('   ✅ UI interaction test completed');
                }
            } catch (error) {
                console.log(`   ❌ UI interaction failed: ${error.message}`);
            }
        } else {
            console.log('\n❌ No reject buttons found in UI - this indicates frontend issue');
        }
        
        await browser.close();
        
        console.log('\n' + '='.repeat(60));
        console.log('🎯 STORY REJECTION DEBUGGING SUMMARY');
        console.log('='.repeat(60));
        console.log('✅ Analysis completed');
        
        if (rejectionTest && rejectionTest.data?.error?.includes('pending status')) {
            console.log('🔧 SOLUTION REQUIRED:');
            console.log('   1. Modify backend to allow rejecting "approved" stories');
            console.log('   2. Or add logic to change stories to "pending" before rejection');
            console.log('   3. Update business logic to match intended workflow');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await browser.close();
    }
}

debugStoryRejection().catch(console.error);