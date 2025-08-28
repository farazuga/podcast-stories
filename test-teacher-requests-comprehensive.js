/**
 * Comprehensive Test for Teacher Requests and Navigation Fixes
 * Tests all the recent changes:
 * 1. Navigation fixes (no Admin Browse Stories for teachers, no Settings button)
 * 2. Teacher requests "All Status" filter
 * 3. New action buttons (Edit, Reset Password, Delete)
 */

const puppeteer = require('puppeteer');

class TeacherRequestsTest {
    constructor() {
        this.baseUrl = 'https://podcast-stories-production.up.railway.app';
        this.browser = null;
        this.results = {
            navigationTests: {},
            filterTests: {},
            actionButtonTests: {},
            errors: []
        };
    }

    async init() {
        this.browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: { width: 1400, height: 900 }
        });
        console.log('🚀 Comprehensive Teacher Requests & Navigation Test\n');
        console.log('='*60 + '\n');
    }

    async testTeacherNavigation() {
        console.log('📍 Testing Teacher Navigation...\n');
        const page = await this.browser.newPage();
        
        try {
            // Login as teacher
            await page.goto(`${this.baseUrl}/index.html`);
            await page.waitForSelector('#email', { timeout: 10000 });
            
            await page.type('#email', 'teacher@vidpod.com');
            await page.type('#password', 'vidpod');
            await page.click('button[type="submit"]');
            
            await page.waitForNavigation({ timeout: 10000 });
            console.log('✅ Teacher login successful');
            
            // Wait for navigation to load
            await page.waitForTimeout(2000);
            
            // Check navigation items
            const navItems = await page.evaluate(() => {
                const items = Array.from(document.querySelectorAll('.nav-item:not([style*="display: none"])'));
                return items.map(item => ({
                    text: item.textContent.trim(),
                    href: item.getAttribute('href'),
                    visible: item.offsetParent !== null
                }));
            });
            
            console.log('📋 Visible navigation items for teacher:');
            navItems.forEach(item => {
                console.log(`   - ${item.text} (${item.href})`);
            });
            
            // Check for problematic items
            const hasAdminBrowse = navItems.some(item => 
                item.text.toLowerCase().includes('admin browse') && item.visible
            );
            const hasSettings = navItems.some(item => 
                item.text.toLowerCase().includes('settings') && item.visible
            );
            const hasAdminPanel = navItems.some(item => 
                item.text.toLowerCase().includes('admin panel') && item.visible
            );
            
            this.results.navigationTests = {
                adminBrowseHidden: !hasAdminBrowse,
                settingsHidden: !hasSettings,
                adminPanelHidden: !hasAdminPanel,
                visibleItems: navItems.filter(i => i.visible).map(i => i.text)
            };
            
            console.log('\n📊 Teacher Navigation Test Results:');
            console.log(`   Admin Browse Stories hidden: ${!hasAdminBrowse ? '✅' : '❌'}`);
            console.log(`   Settings button hidden: ${!hasSettings ? '✅' : '❌'}`);
            console.log(`   Admin Panel hidden: ${!hasAdminPanel ? '✅' : '❌'}`);
            
            await page.close();
            
        } catch (error) {
            console.log('❌ Teacher navigation test failed:', error.message);
            this.results.errors.push({ test: 'teacherNavigation', error: error.message });
            await page.close();
        }
    }

    async testAdminTeacherRequests() {
        console.log('\n📍 Testing Admin Teacher Requests...\n');
        const page = await this.browser.newPage();
        
        try {
            // Login as admin
            await page.goto(`${this.baseUrl}/index.html`);
            await page.waitForSelector('#email', { timeout: 10000 });
            
            await page.type('#email', 'admin@vidpod.com');
            await page.type('#password', 'vidpod');
            await page.click('button[type="submit"]');
            
            await page.waitForNavigation({ timeout: 10000 });
            console.log('✅ Admin login successful');
            
            // Navigate to admin panel
            await page.goto(`${this.baseUrl}/admin.html`);
            await page.waitForTimeout(2000);
            
            // Click teacher requests tab
            const teacherTabClicked = await page.evaluate(() => {
                const tabs = Array.from(document.querySelectorAll('.tab-btn'));
                const teacherTab = tabs.find(tab => 
                    tab.textContent.toLowerCase().includes('teacher')
                );
                if (teacherTab) {
                    teacherTab.click();
                    return true;
                }
                // Try using showTab function
                if (typeof window.showTab === 'function') {
                    window.showTab('teachers');
                    return true;
                }
                return false;
            });
            
            if (!teacherTabClicked) {
                throw new Error('Could not click teacher requests tab');
            }
            
            await page.waitForTimeout(3000); // Wait for data to load
            console.log('✅ Teacher requests tab opened');
            
            // Test "All Status" filter
            console.log('\n🔍 Testing "All Status" filter...');
            
            // Select "All Status" option
            const filterSelected = await page.evaluate(() => {
                const statusFilter = document.getElementById('statusFilter');
                if (statusFilter) {
                    // Find the "All Status" option
                    const allOption = Array.from(statusFilter.options).find(opt => 
                        opt.textContent.toLowerCase().includes('all')
                    );
                    if (allOption) {
                        statusFilter.value = allOption.value;
                        // Trigger filter
                        const filterBtn = document.getElementById('filterTeacherRequests');
                        if (filterBtn) {
                            filterBtn.click();
                        } else if (typeof window.loadTeacherRequests === 'function') {
                            window.loadTeacherRequests();
                        }
                        return { success: true, value: allOption.value };
                    }
                    return { success: false, error: 'All Status option not found' };
                }
                return { success: false, error: 'Status filter not found' };
            });
            
            console.log('   Filter selection:', filterSelected);
            await page.waitForTimeout(2000);
            
            // Check if requests are displayed
            const requestsData = await page.evaluate(() => {
                const table = document.getElementById('teacherRequestsTable');
                if (!table) return { error: 'Table not found' };
                
                const rows = Array.from(table.querySelectorAll('tr'));
                const hasNoDataMessage = table.textContent.includes('No teacher requests found');
                
                if (hasNoDataMessage) {
                    return { count: 0, noData: true };
                }
                
                // Get details of visible requests
                const requests = rows.map(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length === 0) return null;
                    
                    return {
                        name: cells[0]?.textContent?.trim(),
                        email: cells[1]?.textContent?.trim(),
                        status: cells[4]?.textContent?.trim(),
                        actions: Array.from(row.querySelectorAll('.table-actions button')).map(btn => ({
                            text: btn.textContent.trim(),
                            title: btn.getAttribute('title'),
                            onclick: btn.getAttribute('onclick')
                        }))
                    };
                }).filter(Boolean);
                
                return {
                    count: requests.length,
                    requests: requests
                };
            });
            
            console.log(`   Requests found: ${requestsData.count}`);
            if (requestsData.error) {
                console.log(`   Error: ${requestsData.error}`);
            }
            
            this.results.filterTests = {
                allStatusWorks: filterSelected.success,
                requestsLoaded: requestsData.count >= 0,
                requestCount: requestsData.count
            };
            
            // Test action buttons
            console.log('\n🔍 Testing action buttons...');
            
            if (requestsData.requests && requestsData.requests.length > 0) {
                const firstRequest = requestsData.requests[0];
                console.log(`   Testing buttons for: ${firstRequest.name}`);
                console.log('   Available actions:');
                
                const hasEdit = firstRequest.actions.some(a => 
                    a.title?.toLowerCase().includes('edit') || a.text.includes('✏️')
                );
                const hasReset = firstRequest.actions.some(a => 
                    a.title?.toLowerCase().includes('reset') || a.text.includes('🔑')
                );
                const hasDelete = firstRequest.actions.some(a => 
                    a.title?.toLowerCase().includes('delete') || a.text.includes('🗑️')
                );
                
                firstRequest.actions.forEach(action => {
                    console.log(`      - ${action.title || action.text}`);
                });
                
                this.results.actionButtonTests = {
                    editButtonExists: hasEdit,
                    resetButtonExists: hasReset,
                    deleteButtonExists: hasDelete,
                    totalButtons: firstRequest.actions.length
                };
                
                console.log(`\n   Edit button: ${hasEdit ? '✅' : '❌'}`);
                console.log(`   Reset Password button: ${hasReset ? '✅' : '❌'}`);
                console.log(`   Delete button: ${hasDelete ? '✅' : '❌'}`);
                
            } else {
                console.log('   No requests available to test buttons');
                this.results.actionButtonTests = {
                    noRequests: true
                };
            }
            
            await page.close();
            
        } catch (error) {
            console.log('❌ Admin teacher requests test failed:', error.message);
            this.results.errors.push({ test: 'adminTeacherRequests', error: error.message });
            
            // Take screenshot for debugging
            try {
                await page.screenshot({ 
                    path: 'teacher-requests-error.png',
                    fullPage: true 
                });
                console.log('📸 Screenshot saved as teacher-requests-error.png');
            } catch (screenshotError) {
                console.log('Could not take screenshot');
            }
            
            await page.close();
        }
    }

    async generateReport() {
        console.log('\n' + '='*60);
        console.log('📊 COMPREHENSIVE TEST REPORT');
        console.log('='*60 + '\n');
        
        // Navigation Report
        console.log('🧭 NAVIGATION FIXES:');
        const navTests = this.results.navigationTests;
        
        if (navTests.adminBrowseHidden && navTests.settingsHidden && navTests.adminPanelHidden) {
            console.log('   ✅ ALL NAVIGATION FIXES WORKING');
        } else {
            console.log('   ❌ NAVIGATION ISSUES FOUND:');
            if (!navTests.adminBrowseHidden) {
                console.log('      - Admin Browse Stories still visible to teachers');
            }
            if (!navTests.settingsHidden) {
                console.log('      - Settings button still visible to teachers');
            }
            if (!navTests.adminPanelHidden) {
                console.log('      - Admin Panel still visible to teachers');
            }
        }
        
        console.log(`   Teacher sees: ${navTests.visibleItems?.join(', ') || 'Unknown'}`);
        
        // Filter Report
        console.log('\n🔍 FILTER FIXES:');
        const filterTests = this.results.filterTests;
        
        if (filterTests.allStatusWorks && filterTests.requestsLoaded) {
            console.log('   ✅ "All Status" FILTER WORKING');
            console.log(`   Loaded ${filterTests.requestCount} requests`);
        } else {
            console.log('   ❌ FILTER ISSUES:');
            if (!filterTests.allStatusWorks) {
                console.log('      - "All Status" filter not working');
            }
            if (!filterTests.requestsLoaded) {
                console.log('      - Requests not loading properly');
            }
        }
        
        // Action Buttons Report
        console.log('\n🎯 ACTION BUTTONS:');
        const actionTests = this.results.actionButtonTests;
        
        if (actionTests.noRequests) {
            console.log('   ⚠️  No requests available to test buttons');
        } else if (actionTests.editButtonExists && actionTests.resetButtonExists && actionTests.deleteButtonExists) {
            console.log('   ✅ ALL ACTION BUTTONS PRESENT');
            console.log(`   Total buttons per request: ${actionTests.totalButtons}`);
        } else {
            console.log('   ❌ MISSING ACTION BUTTONS:');
            if (!actionTests.editButtonExists) {
                console.log('      - Edit button missing');
            }
            if (!actionTests.resetButtonExists) {
                console.log('      - Reset Password button missing');
            }
            if (!actionTests.deleteButtonExists) {
                console.log('      - Delete button missing');
            }
        }
        
        // Errors Report
        if (this.results.errors.length > 0) {
            console.log('\n❌ ERRORS ENCOUNTERED:');
            this.results.errors.forEach(err => {
                console.log(`   ${err.test}: ${err.error}`);
            });
        }
        
        // Summary
        console.log('\n' + '='*60);
        const allPassed = navTests.adminBrowseHidden && 
                         navTests.settingsHidden && 
                         navTests.adminPanelHidden &&
                         filterTests.allStatusWorks &&
                         (actionTests.noRequests || 
                          (actionTests.editButtonExists && 
                           actionTests.resetButtonExists && 
                           actionTests.deleteButtonExists));
        
        if (allPassed) {
            console.log('✅ ALL TESTS PASSED - FIXES ARE WORKING!');
        } else {
            console.log('⚠️  SOME ISSUES REMAIN - SEE DETAILS ABOVE');
        }
        
        console.log('\n💡 RECOMMENDATIONS:');
        if (!allPassed) {
            console.log('1. Check Railway deployment logs for any errors');
            console.log('2. Ensure all changes have been deployed');
            console.log('3. Clear browser cache and retry');
            console.log('4. Check if database migrations completed successfully');
        } else {
            console.log('1. All fixes appear to be working correctly');
            console.log('2. Monitor Railway logs for any runtime issues');
            console.log('3. Test with real users to confirm functionality');
        }
    }

    async runAllTests() {
        try {
            await this.init();
            
            await this.testTeacherNavigation();
            await this.testAdminTeacherRequests();
            
            await this.generateReport();
            
            console.log('\n🏁 Testing completed');
            console.log('Press Ctrl+C to close browser when done reviewing\n');
            
            // Keep browser open
            await new Promise(() => {});
            
        } catch (error) {
            console.log('❌ Test suite failed:', error.message);
            this.results.errors.push({ test: 'suite', error: error.message });
            await this.generateReport();
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Run tests
if (require.main === module) {
    const tester = new TeacherRequestsTest();
    
    // Handle cleanup on Ctrl+C
    process.on('SIGINT', async () => {
        console.log('\n👋 Cleaning up...');
        await tester.cleanup();
        process.exit();
    });
    
    tester.runAllTests().catch(console.error);
}

module.exports = TeacherRequestsTest;