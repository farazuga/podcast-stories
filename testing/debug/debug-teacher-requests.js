/**
 * Comprehensive Teacher Request System Debug Script
 * Tests the complete workflow from database to UI display
 */

const puppeteer = require('puppeteer');

class TeacherRequestDebugger {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'https://podcast-stories-production.up.railway.app';
        this.adminCredentials = {
            email: 'admin@vidpod.com',
            password: 'vidpod'
        };
        this.results = {
            authentication: null,
            apiConnectivity: null,
            domElements: null,
            tabNavigation: null,
            dataLoading: null,
            jsErrors: []
        };
    }

    async init() {
        console.log('🔍 Teacher Request Debugger - Initializing...\n');
        
        this.browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: { width: 1200, height: 800 }
        });
        this.page = await this.browser.newPage();
        
        // Listen for console errors
        this.page.on('console', (msg) => {
            if (msg.type() === 'error') {
                this.results.jsErrors.push(msg.text());
                console.log('❌ JavaScript Error:', msg.text());
            } else if (msg.text().includes('Teacher Requests Debug')) {
                console.log('🔍', msg.text());
            }
        });

        // Listen for failed network requests
        this.page.on('requestfailed', (req) => {
            console.log('❌ Network Request Failed:', req.url());
        });
    }

    async testAdminAuthentication() {
        console.log('🔐 Testing admin authentication...');
        
        try {
            // Navigate to login page
            await this.page.goto(`${this.baseUrl}/index.html`);
            await this.page.waitForSelector('#email', { timeout: 5000 });
            
            // Fill login form
            await this.page.type('#email', this.adminCredentials.email);
            await this.page.type('#password', this.adminCredentials.password);
            await this.page.click('button[type="submit"]');
            
            // Wait for redirect
            await this.page.waitForNavigation({ timeout: 10000 });
            
            // Check if we're on admin page
            const currentUrl = this.page.url();
            const isAdminPage = currentUrl.includes('admin.html');
            
            // Verify token exists
            const token = await this.page.evaluate(() => localStorage.getItem('token'));
            const user = await this.page.evaluate(() => JSON.parse(localStorage.getItem('user') || '{}'));
            
            this.results.authentication = {
                success: isAdminPage && token,
                currentUrl,
                tokenExists: !!token,
                userRole: user.role
            };
            
            console.log('✅ Authentication result:', this.results.authentication);
            return this.results.authentication.success;
            
        } catch (error) {
            console.log('❌ Authentication failed:', error.message);
            this.results.authentication = { success: false, error: error.message };
            return false;
        }
    }

    async testAPIConnectivity() {
        console.log('\n🌐 Testing API connectivity...');
        
        try {
            // Test teacher requests API directly
            const apiResponse = await this.page.evaluate(async () => {
                const token = localStorage.getItem('token');
                const response = await fetch(`${window.API_URL}/teacher-requests`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                return {
                    status: response.status,
                    ok: response.ok,
                    statusText: response.statusText,
                    data: response.ok ? await response.json() : await response.text(),
                    headers: Object.fromEntries(response.headers.entries())
                };
            });
            
            this.results.apiConnectivity = {
                success: apiResponse.ok,
                response: apiResponse
            };
            
            console.log('📊 API Response:', {
                status: apiResponse.status,
                ok: apiResponse.ok,
                dataCount: Array.isArray(apiResponse.data) ? apiResponse.data.length : 'N/A'
            });
            
            if (Array.isArray(apiResponse.data)) {
                console.log('📋 Teacher Requests Found:', apiResponse.data.length);
                apiResponse.data.forEach((request, index) => {
                    console.log(`   ${index + 1}. ${request.name} (${request.email}) - ${request.status}`);
                });
            }
            
            return this.results.apiConnectivity.success;
            
        } catch (error) {
            console.log('❌ API connectivity test failed:', error.message);
            this.results.apiConnectivity = { success: false, error: error.message };
            return false;
        }
    }

    async testDOMElements() {
        console.log('\n🏗️ Testing DOM elements...');
        
        try {
            // Check if we're on admin page
            await this.page.waitForSelector('.admin-tabs', { timeout: 5000 });
            
            const domCheck = await this.page.evaluate(() => {
                const elements = {
                    teachersTab: document.querySelector('.tab-btn[data-tab="teachers"]'),
                    teachersTabContent: document.getElementById('teachers-tab'),
                    statusFilter: document.getElementById('statusFilter'),
                    teacherRequestsTable: document.getElementById('teacherRequestsTable'),
                    filterButton: document.querySelector('button[onclick="loadTeacherRequests()"]'),
                    showTabFunction: typeof window.showTab === 'function',
                    loadTeacherRequestsFunction: typeof window.loadTeacherRequests === 'function'
                };
                
                return {
                    teachersTabExists: !!elements.teachersTab,
                    teachersTabContentExists: !!elements.teachersTabContent,
                    statusFilterExists: !!elements.statusFilter,
                    teacherRequestsTableExists: !!elements.teacherRequestsTable,
                    filterButtonExists: !!elements.filterButton,
                    showTabFunctionExists: elements.showTabFunction,
                    loadTeacherRequestsFunctionExists: elements.loadTeacherRequestsFunction,
                    teachersTabText: elements.teachersTab?.textContent,
                    teachersTabOnclick: elements.teachersTab?.onclick?.toString()
                };
            });
            
            this.results.domElements = domCheck;
            
            console.log('🔍 DOM Elements Check:');
            Object.entries(domCheck).forEach(([key, value]) => {
                const status = value ? '✅' : '❌';
                console.log(`   ${status} ${key}: ${value}`);
            });
            
            return Object.values(domCheck).every(v => v === true);
            
        } catch (error) {
            console.log('❌ DOM elements test failed:', error.message);
            this.results.domElements = { success: false, error: error.message };
            return false;
        }
    }

    async testTabNavigation() {
        console.log('\n📑 Testing tab navigation...');
        
        try {
            // Click on teachers tab
            await this.page.click('.tab-btn[data-tab="teachers"]');
            
            // Wait a moment for tab to load
            await this.page.waitForTimeout(2000);
            
            // Check if teachers tab is active
            const tabState = await this.page.evaluate(() => {
                const teachersTab = document.getElementById('teachers-tab');
                const tabButton = document.querySelector('.tab-btn[data-tab="teachers"]');
                
                return {
                    tabContentActive: teachersTab?.classList.contains('active'),
                    tabButtonActive: tabButton?.classList.contains('active'),
                    tabContentVisible: teachersTab?.style.display !== 'none'
                };
            });
            
            this.results.tabNavigation = tabState;
            
            console.log('📑 Tab Navigation State:');
            Object.entries(tabState).forEach(([key, value]) => {
                const status = value ? '✅' : '❌';
                console.log(`   ${status} ${key}: ${value}`);
            });
            
            return tabState.tabContentActive;
            
        } catch (error) {
            console.log('❌ Tab navigation test failed:', error.message);
            this.results.tabNavigation = { success: false, error: error.message };
            return false;
        }
    }

    async testDataLoading() {
        console.log('\n📊 Testing data loading...');
        
        try {
            // Ensure we're on teachers tab
            await this.page.click('.tab-btn[data-tab="teachers"]');
            await this.page.waitForTimeout(3000);
            
            // Check statistics
            const stats = await this.page.evaluate(() => {
                return {
                    pending: document.getElementById('pendingTeacherRequests')?.textContent,
                    approved: document.getElementById('approvedTeacherRequests')?.textContent,
                    rejected: document.getElementById('rejectedTeacherRequests')?.textContent,
                    total: document.getElementById('totalTeacherRequests')?.textContent
                };
            });
            
            // Check table content
            const tableContent = await this.page.evaluate(() => {
                const table = document.getElementById('teacherRequestsTable');
                if (!table) return null;
                
                const rows = table.querySelectorAll('tr');
                const rowData = Array.from(rows).map(row => {
                    const cells = row.querySelectorAll('td');
                    return Array.from(cells).map(cell => cell.textContent.trim());
                });
                
                return {
                    rowCount: rows.length,
                    isEmpty: table.innerHTML.includes('No teacher requests found'),
                    hasData: rowData.length > 0 && !table.innerHTML.includes('No teacher requests found'),
                    rowData: rowData.slice(0, 3) // First 3 rows for debugging
                };
            });
            
            this.results.dataLoading = {
                stats,
                table: tableContent
            };
            
            console.log('📊 Statistics loaded:', stats);
            console.log('📋 Table state:', {
                rowCount: tableContent?.rowCount || 0,
                hasData: tableContent?.hasData || false,
                isEmpty: tableContent?.isEmpty || false
            });
            
            if (tableContent?.rowData && tableContent.rowData.length > 0) {
                console.log('📋 Sample table data:');
                tableContent.rowData.forEach((row, index) => {
                    if (row.length > 0) {
                        console.log(`   Row ${index + 1}: ${row.join(' | ')}`);
                    }
                });
            }
            
            return tableContent?.hasData || false;
            
        } catch (error) {
            console.log('❌ Data loading test failed:', error.message);
            this.results.dataLoading = { success: false, error: error.message };
            return false;
        }
    }

    async testCompleteWorkflow() {
        console.log('\n🔄 Testing complete teacher request workflow...');
        
        try {
            // Create a test teacher request first (if needed)
            const hasExistingRequests = await this.page.evaluate(async () => {
                const token = localStorage.getItem('token');
                const response = await fetch(`${window.API_URL}/teacher-requests`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                return data.length > 0;
            });
            
            if (!hasExistingRequests) {
                console.log('ℹ️ No existing teacher requests found. The admin can manually test by having a teacher submit a request first.');
            }
            
            // Test the complete UI workflow
            await this.page.click('.tab-btn[data-tab="teachers"]');
            await this.page.waitForTimeout(2000);
            
            // Test status filter
            await this.page.select('#statusFilter', 'pending');
            await this.page.click('button[onclick="loadTeacherRequests()"]');
            await this.page.waitForTimeout(2000);
            
            // Check if filter worked
            const afterFilter = await this.page.evaluate(() => {
                const table = document.getElementById('teacherRequestsTable');
                return {
                    hasContent: table && !table.innerHTML.includes('No teacher requests found'),
                    innerHTML: table?.innerHTML.substring(0, 200) // First 200 chars for debugging
                };
            });
            
            console.log('🔍 After filter test:', afterFilter);
            
            return true;
            
        } catch (error) {
            console.log('❌ Complete workflow test failed:', error.message);
            return false;
        }
    }

    async generateReport() {
        console.log('\n📋 TEACHER REQUEST DEBUG REPORT');
        console.log('===============================\n');
        
        console.log('🔐 Authentication:', this.results.authentication?.success ? 'PASS ✅' : 'FAIL ❌');
        console.log('🌐 API Connectivity:', this.results.apiConnectivity?.success ? 'PASS ✅' : 'FAIL ❌');
        console.log('🏗️ DOM Elements:', this.results.domElements ? 'PASS ✅' : 'FAIL ❌');
        console.log('📑 Tab Navigation:', this.results.tabNavigation?.tabContentActive ? 'PASS ✅' : 'FAIL ❌');
        console.log('📊 Data Loading:', this.results.dataLoading?.table?.hasData ? 'PASS ✅' : 'FAIL ❌');
        
        if (this.results.jsErrors.length > 0) {
            console.log('\n❌ JavaScript Errors Found:');
            this.results.jsErrors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        } else {
            console.log('\n✅ No JavaScript errors detected');
        }
        
        // Specific recommendations
        console.log('\n🔧 RECOMMENDATIONS:');
        
        if (!this.results.authentication?.success) {
            console.log('   - Check admin credentials and login process');
        }
        
        if (!this.results.apiConnectivity?.success) {
            console.log('   - Verify teacher-requests API endpoint is accessible');
            console.log('   - Check authentication token and permissions');
        }
        
        if (!this.results.tabNavigation?.tabContentActive) {
            console.log('   - Check showTab() function implementation');
            console.log('   - Verify tab button onclick attributes');
        }
        
        if (!this.results.dataLoading?.table?.hasData) {
            console.log('   - Check if teacher requests exist in database');
            console.log('   - Verify loadTeacherRequests() function execution');
            console.log('   - Check displayTeacherRequests() function');
        }
        
        console.log('\n🏁 Debug session completed');
    }

    async runFullTest() {
        try {
            await this.init();
            
            const authSuccess = await this.testAdminAuthentication();
            if (!authSuccess) {
                console.log('❌ Stopping tests - authentication failed');
                await this.generateReport();
                return;
            }
            
            await this.testAPIConnectivity();
            await this.testDOMElements();
            await this.testTabNavigation();
            await this.testDataLoading();
            await this.testCompleteWorkflow();
            
            await this.generateReport();
            
        } catch (error) {
            console.log('❌ Test execution failed:', error.message);
        } finally {
            if (this.browser) {
                // Keep browser open for manual inspection
                console.log('\n👀 Browser kept open for manual inspection');
                console.log('   Press Ctrl+C to close when done');
                
                // Wait for user to close manually
                await new Promise(() => {});
            }
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Run the debug test
const debugger = new TeacherRequestDebugger();

// Handle cleanup on exit
process.on('SIGINT', async () => {
    console.log('\n👋 Cleaning up...');
    await debugger.cleanup();
    process.exit();
});

debugger.runFullTest().catch(console.error);