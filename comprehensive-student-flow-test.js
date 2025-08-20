#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');

/**
 * COMPREHENSIVE STUDENT USER FLOW TESTING SUITE
 * 
 * Tests all major student workflows across multiple paths to systematically 
 * identify bugs and issues for debugging.
 */

class StudentFlowTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.bugs = [];
        this.testResults = [];
        this.credentials = {
            student: { email: 'student@vidpod.com', password: 'vidpod' },
            teacher: { email: 'teacher@vidpod.com', password: 'vidpod' },
            admin: { email: 'admin@vidpod.com', password: 'vidpod' }
        };
        this.baseURL = 'https://podcast-stories-production.up.railway.app';
    }

    async initialize() {
        console.log('🚀 INITIALIZING COMPREHENSIVE STUDENT FLOW TESTING');
        console.log('=' .repeat(80));
        
        this.browser = await puppeteer.launch({ 
            headless: false, 
            defaultViewport: null,
            args: ['--start-maximized', '--disable-web-security']
        });
        
        this.page = await this.browser.newPage();
        
        // Set up error tracking
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.addBug('CONSOLE_ERROR', `Console error: ${msg.text()}`);
            }
        });
        
        this.page.on('pageerror', error => {
            this.addBug('PAGE_ERROR', `Page error: ${error.message}`);
        });
        
        this.page.on('requestfailed', request => {
            this.addBug('REQUEST_FAILED', `Request failed: ${request.url()} - ${request.failure().errorText}`);
        });
    }

    addBug(category, description, severity = 'medium') {
        const bug = {
            id: `BUG_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            category,
            description,
            severity,
            timestamp: new Date().toISOString(),
            url: this.page.url(),
            testContext: this.currentTest || 'Unknown'
        };
        
        this.bugs.push(bug);
        console.log(`🐛 BUG FOUND [${severity.toUpperCase()}]: ${category} - ${description}`);
    }

    async addTestResult(testName, success, details = {}) {
        const result = {
            testName,
            success,
            timestamp: new Date().toISOString(),
            details,
            url: this.page.url(),
            bugs: this.bugs.filter(bug => bug.testContext === testName)
        };
        
        this.testResults.push(result);
        console.log(`${success ? '✅' : '❌'} ${testName}: ${success ? 'PASSED' : 'FAILED'}`);
        
        if (details.error) {
            this.addBug('TEST_FAILURE', `Test failed: ${details.error}`, 'high');
        }
    }

    async runAllTests() {
        try {
            // Phase 1: Authentication Flows
            await this.testAuthenticationFlows();
            
            // Phase 2: Navigation Flows  
            await this.testNavigationFlows();
            
            // Phase 3: Story Browsing Flows
            await this.testStoryBrowsingFlows();
            
            // Phase 4: Story Interaction Flows
            await this.testStoryInteractionFlows();
            
            // Phase 5: Class-related Flows
            await this.testClassFlows();
            
            // Phase 6: Mobile/Responsive Flows
            await this.testResponsiveFlows();
            
            // Phase 7: Error Handling Flows
            await this.testErrorHandlingFlows();
            
            // Phase 8: Performance Flows
            await this.testPerformanceFlows();
            
            await this.generateReport();
            
        } catch (error) {
            console.error('❌ Critical test suite error:', error.message);
            this.addBug('CRITICAL', `Test suite failure: ${error.message}`, 'critical');
        }
    }

    // ===== PHASE 1: AUTHENTICATION FLOWS =====
    async testAuthenticationFlows() {
        console.log('\n📝 PHASE 1: AUTHENTICATION FLOWS');
        console.log('-'.repeat(50));

        // Test 1.1: Valid Student Login
        this.currentTest = 'Student Login - Valid Credentials';
        try {
            await this.page.goto(`${this.baseURL}/`);
            await this.page.waitForSelector('#email', { timeout: 10000 });
            
            await this.page.type('#email', this.credentials.student.email);
            await this.page.type('#password', this.credentials.student.password);
            await this.page.click('button[type="submit"]');
            await this.page.waitForNavigation({ timeout: 15000 });
            
            const currentURL = this.page.url();
            const success = currentURL.includes('dashboard.html');
            
            await this.addTestResult(this.currentTest, success, {
                expectedURL: 'dashboard.html',
                actualURL: currentURL
            });
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }

        // Test 1.2: Invalid Login Attempt
        this.currentTest = 'Student Login - Invalid Credentials';
        try {
            await this.page.goto(`${this.baseURL}/`);
            await this.page.waitForSelector('#email');
            
            await this.page.type('#email', 'invalid@email.com');
            await this.page.type('#password', 'wrongpassword');
            await this.page.click('button[type="submit"]');
            
            // Wait for error message or stay on login page
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const currentURL = this.page.url();
            const hasErrorMessage = await this.page.evaluate(() => {
                return document.querySelector('.error, .notification, .alert') !== null;
            });
            
            const success = currentURL.includes('index.html') || hasErrorMessage;
            await this.addTestResult(this.currentTest, success, {
                stayedOnLogin: currentURL.includes('index.html'),
                showedError: hasErrorMessage
            });
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }

        // Test 1.3: Token Persistence
        this.currentTest = 'Token Persistence - Page Refresh';
        try {
            // Login first
            await this.loginAsStudent();
            
            // Refresh page
            await this.page.reload({ waitUntil: 'networkidle0' });
            
            const currentURL = this.page.url();
            const success = !currentURL.includes('index.html');
            
            await this.addTestResult(this.currentTest, success, {
                remainedLoggedIn: success,
                finalURL: currentURL
            });
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }

        // Test 1.4: Logout Functionality
        this.currentTest = 'Logout Functionality';
        try {
            await this.loginAsStudent();
            
            // Find and click logout
            const logoutButton = await this.page.$('a[href*="logout"], button[onclick*="logout"], .logout-btn');
            if (logoutButton) {
                await logoutButton.click();
                await this.page.waitForNavigation({ timeout: 10000 });
            } else {
                // Try clicking user menu then logout
                const userMenu = await this.page.$('.user-menu, .profile-dropdown, .nav-user');
                if (userMenu) {
                    await userMenu.click();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const logoutLink = await this.page.$('a[href*="logout"], .logout');
                    if (logoutLink) await logoutLink.click();
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            const currentURL = this.page.url();
            const success = currentURL.includes('index.html') || currentURL === `${this.baseURL}/`;
            
            await this.addTestResult(this.currentTest, success, {
                redirectedToLogin: success,
                finalURL: currentURL
            });
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }
    }

    // ===== PHASE 2: NAVIGATION FLOWS =====
    async testNavigationFlows() {
        console.log('\n🧭 PHASE 2: NAVIGATION FLOWS');
        console.log('-'.repeat(50));

        await this.loginAsStudent();

        // Test 2.1: Dashboard Navigation
        this.currentTest = 'Dashboard Navigation';
        try {
            await this.page.goto(`${this.baseURL}/dashboard.html`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const dashboardElements = await this.page.evaluate(() => {
                return {
                    hasHeader: !!document.querySelector('h1, .page-title, .dashboard-title'),
                    hasNavigation: !!document.querySelector('nav, .navigation, .menu'),
                    hasContent: !!document.querySelector('.story-card, .content, .main-content'),
                    pageTitle: document.title
                };
            });
            
            const success = dashboardElements.hasHeader && dashboardElements.hasContent;
            await this.addTestResult(this.currentTest, success, dashboardElements);
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }

        // Test 2.2: Stories Page Navigation
        this.currentTest = 'Stories Page Navigation';
        try {
            await this.page.goto(`${this.baseURL}/stories.html`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const storiesPageElements = await this.page.evaluate(() => {
                return {
                    hasStoriesGrid: !!document.querySelector('#storiesGrid, .stories-grid'),
                    hasSearchForm: !!document.querySelector('#searchForm, .search-section'),
                    hasViewControls: !!document.querySelector('.view-controls, #gridViewBtn'),
                    storiesLoaded: document.querySelectorAll('.story-card').length > 0,
                    pageTitle: document.title
                };
            });
            
            const success = storiesPageElements.hasStoriesGrid && storiesPageElements.hasSearchForm;
            await this.addTestResult(this.currentTest, success, storiesPageElements);
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }

        // Test 2.3: Deep Link Navigation
        this.currentTest = 'Deep Link Navigation';
        try {
            // Test direct URL access to stories page
            await this.page.goto(`${this.baseURL}/stories.html`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const currentURL = this.page.url();
            const success = currentURL.includes('stories.html');
            
            await this.addTestResult(this.currentTest, success, {
                accessedDirectly: success,
                finalURL: currentURL
            });
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }

        // Test 2.4: Browser Back/Forward
        this.currentTest = 'Browser Back/Forward Navigation';
        try {
            await this.page.goto(`${this.baseURL}/dashboard.html`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await this.page.goto(`${this.baseURL}/stories.html`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await this.page.goBack();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const backURL = this.page.url();
            
            await this.page.goForward();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const forwardURL = this.page.url();
            
            const success = backURL.includes('dashboard.html') && forwardURL.includes('stories.html');
            
            await this.addTestResult(this.currentTest, success, {
                backURL,
                forwardURL,
                backWorked: backURL.includes('dashboard.html'),
                forwardWorked: forwardURL.includes('stories.html')
            });
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }
    }

    // ===== PHASE 3: STORY BROWSING FLOWS =====
    async testStoryBrowsingFlows() {
        console.log('\n📚 PHASE 3: STORY BROWSING FLOWS');
        console.log('-'.repeat(50));

        await this.loginAsStudent();
        await this.page.goto(`${this.baseURL}/stories.html`);
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Test 3.1: Grid vs List View Toggle
        this.currentTest = 'Grid/List View Toggle';
        try {
            // Test grid view first
            const gridBtn = await this.page.$('#gridViewBtn');
            if (gridBtn) await gridBtn.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const gridState = await this.page.evaluate(() => {
                return {
                    hasGridClass: document.querySelector('.stories-grid') !== null,
                    gridBtnActive: document.querySelector('#gridViewBtn.active') !== null,
                    cardLayout: window.getComputedStyle(document.querySelector('.story-card') || {}).display
                };
            });
            
            // Test list view
            const listBtn = await this.page.$('#listViewBtn');
            if (listBtn) await listBtn.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const listState = await this.page.evaluate(() => {
                return {
                    hasListClass: document.querySelector('.stories-list') !== null,
                    listBtnActive: document.querySelector('#listViewBtn.active') !== null,
                    hasListCards: document.querySelectorAll('.story-card-list').length > 0
                };
            });
            
            const success = gridState.hasGridClass && listState.hasListCards;
            await this.addTestResult(this.currentTest, success, { gridState, listState });
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }

        // Test 3.2: Search Functionality
        this.currentTest = 'Search Functionality';
        try {
            const searchInput = await this.page.$('#searchKeywords');
            if (searchInput) {
                await searchInput.clear();
                await searchInput.type('test');
                
                const searchForm = await this.page.$('#searchForm');
                if (searchForm) {
                    await searchForm.submit();
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
            
            const searchResults = await this.page.evaluate(() => {
                return {
                    resultsCount: document.querySelectorAll('.story-card').length,
                    hasResults: document.querySelectorAll('.story-card').length > 0,
                    searchValue: document.querySelector('#searchKeywords')?.value || '',
                    noResultsShown: document.querySelector('#noResults')?.style.display !== 'none'
                };
            });
            
            const success = searchResults.hasResults || searchResults.noResultsShown;
            await this.addTestResult(this.currentTest, success, searchResults);
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }

        // Test 3.3: Sorting Functionality
        this.currentTest = 'Sorting Functionality';
        try {
            const sortSelect = await this.page.$('#sortBy');
            if (sortSelect) {
                // Test coverage date sorting
                await this.page.select('#sortBy', 'coverage_newest');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const sortingResult = await this.page.evaluate(() => {
                    const sortValue = document.querySelector('#sortBy').value;
                    const firstCard = document.querySelector('.story-card');
                    const hasDateInfo = firstCard ? !!firstCard.querySelector('.story-date-compact') : false;
                    
                    return {
                        sortValue,
                        sortedCorrectly: sortValue === 'coverage_newest',
                        hasDateInfo,
                        storiesCount: document.querySelectorAll('.story-card').length
                    };
                });
                
                const success = sortingResult.sortedCorrectly;
                await this.addTestResult(this.currentTest, success, sortingResult);
            } else {
                await this.addTestResult(this.currentTest, false, { error: 'Sort dropdown not found' });
            }
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }

        // Test 3.4: Filter Functionality
        this.currentTest = 'Filter Functionality';
        try {
            // Test date filter
            const startDateInput = await this.page.$('#searchStartDate');
            const endDateInput = await this.page.$('#searchEndDate');
            
            if (startDateInput && endDateInput) {
                await startDateInput.type('2024-01-01');
                await endDateInput.type('2024-12-31');
                
                const searchForm = await this.page.$('#searchForm');
                if (searchForm) {
                    await searchForm.submit();
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
            
            const filterResult = await this.page.evaluate(() => {
                return {
                    startDate: document.querySelector('#searchStartDate')?.value || '',
                    endDate: document.querySelector('#searchEndDate')?.value || '',
                    resultsCount: document.querySelectorAll('.story-card').length,
                    filtersApplied: true
                };
            });
            
            const success = filterResult.startDate && filterResult.endDate;
            await this.addTestResult(this.currentTest, success, filterResult);
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }
    }

    // ===== PHASE 4: STORY INTERACTION FLOWS =====
    async testStoryInteractionFlows() {
        console.log('\n❤️ PHASE 4: STORY INTERACTION FLOWS');
        console.log('-'.repeat(50));

        await this.loginAsStudent();
        await this.page.goto(`${this.baseURL}/stories.html`);
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Test 4.1: Story Detail View
        this.currentTest = 'Story Detail View';
        try {
            const firstStoryLink = await this.page.$('.story-card a, .story-card .view-btn, .story-title a');
            if (firstStoryLink) {
                await firstStoryLink.click();
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                const detailView = await this.page.evaluate(() => {
                    return {
                        currentURL: window.location.href,
                        hasStoryTitle: !!document.querySelector('h1, .story-title'),
                        hasStoryContent: !!document.querySelector('.story-description, .story-content'),
                        hasBackButton: !!document.querySelector('.back-btn, button[onclick*="back"]'),
                        pageTitle: document.title
                    };
                });
                
                const success = detailView.currentURL.includes('story-detail.html') || detailView.hasStoryTitle;
                await this.addTestResult(this.currentTest, success, detailView);
            } else {
                await this.addTestResult(this.currentTest, false, { error: 'No story links found' });
            }
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }

        // Test 4.2: Favorite/Unfavorite Functionality
        this.currentTest = 'Favorite Toggle Functionality';
        try {
            await this.page.goto(`${this.baseURL}/stories.html`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const favoriteButton = await this.page.$('.favorite-star, .favorite-btn, button[onclick*="favorite"]');
            if (favoriteButton) {
                // Get initial state
                const initialState = await this.page.evaluate((btn) => {
                    return {
                        favorited: btn.classList.contains('favorited') || btn.textContent.includes('⭐'),
                        buttonText: btn.textContent,
                        buttonExists: true
                    };
                }, favoriteButton);
                
                // Click favorite button
                await favoriteButton.click();
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const newState = await this.page.evaluate((btn) => {
                    return {
                        favorited: btn.classList.contains('favorited') || btn.textContent.includes('⭐'),
                        buttonText: btn.textContent,
                        changed: true
                    };
                }, favoriteButton);
                
                const success = initialState.favorited !== newState.favorited;
                await this.addTestResult(this.currentTest, success, { initialState, newState });
            } else {
                await this.addTestResult(this.currentTest, false, { error: 'No favorite button found' });
            }
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }

        // Test 4.3: Multi-Select Functionality
        this.currentTest = 'Multi-Select Functionality';
        try {
            await this.page.goto(`${this.baseURL}/stories.html`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Try to select multiple stories
            const checkboxes = await this.page.$$('.story-checkbox-compact input[type="checkbox"], .story-select-checkbox');
            if (checkboxes.length >= 2) {
                await checkboxes[0].click();
                await checkboxes[1].click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const selectionResult = await this.page.evaluate(() => {
                    const selectedCheckboxes = document.querySelectorAll('.story-select-checkbox:checked');
                    const bulkActionsBar = document.querySelector('#bulkActionsBar');
                    const selectedCount = document.querySelector('#selectedCount, #bulkSelectedCount');
                    
                    return {
                        selectedCount: selectedCheckboxes.length,
                        bulkActionsVisible: bulkActionsBar ? bulkActionsBar.style.display !== 'none' : false,
                        countDisplayed: selectedCount ? selectedCount.textContent : '',
                        multiSelectWorking: selectedCheckboxes.length > 1
                    };
                });
                
                const success = selectionResult.multiSelectWorking;
                await this.addTestResult(this.currentTest, success, selectionResult);
            } else {
                await this.addTestResult(this.currentTest, false, { error: 'Not enough checkboxes found for multi-select test' });
            }
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }

        // Test 4.4: Story Creation
        this.currentTest = 'Story Creation Flow';
        try {
            await this.page.goto(`${this.baseURL}/add-story.html`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const formElements = await this.page.evaluate(() => {
                return {
                    hasForm: !!document.querySelector('#storyForm, form'),
                    hasTitleField: !!document.querySelector('#ideaTitle, input[name="title"]'),
                    hasDescriptionField: !!document.querySelector('#ideaDescription, textarea[name="description"]'),
                    hasSubmitButton: !!document.querySelector('button[type="submit"], .submit-btn'),
                    pageTitle: document.title
                };
            });
            
            if (formElements.hasTitleField) {
                // Fill out basic form
                await this.page.type('#ideaTitle', 'Test Story from Automated Test');
                await this.page.type('#ideaDescription', 'This is a test story created during automated testing.');
                
                // Try to submit
                const submitBtn = await this.page.$('button[type="submit"]');
                if (submitBtn) {
                    await submitBtn.click();
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    const currentURL = this.page.url();
                    const success = currentURL.includes('dashboard.html') || currentURL.includes('stories.html');
                    
                    await this.addTestResult(this.currentTest, success, {
                        ...formElements,
                        submissionWorked: success,
                        finalURL: currentURL
                    });
                } else {
                    await this.addTestResult(this.currentTest, false, { error: 'Submit button not found' });
                }
            } else {
                await this.addTestResult(this.currentTest, false, { error: 'Form fields not found' });
            }
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }
    }

    // ===== PHASE 5: CLASS-RELATED FLOWS =====
    async testClassFlows() {
        console.log('\n🏫 PHASE 5: CLASS-RELATED FLOWS');
        console.log('-'.repeat(50));

        await this.loginAsStudent();

        // Test 5.1: Class Joining Flow
        this.currentTest = 'Class Joining Flow';
        try {
            // Look for class joining functionality
            await this.page.goto(`${this.baseURL}/dashboard.html`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const classElements = await this.page.evaluate(() => {
                return {
                    hasJoinClassBtn: !!document.querySelector('.join-class, button[onclick*="join"], .class-code'),
                    hasClassSection: !!document.querySelector('.classes, .my-classes, .class-list'),
                    hasClassInput: !!document.querySelector('input[placeholder*="class code"], #classCode'),
                    pageHasClasses: document.querySelectorAll('.class-card, .class-item').length > 0
                };
            });
            
            const success = classElements.hasJoinClassBtn || classElements.hasClassSection;
            await this.addTestResult(this.currentTest, success, classElements);
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }

        // Test 5.2: Class Information Display
        this.currentTest = 'Class Information Display';
        try {
            const classInfo = await this.page.evaluate(() => {
                const classCards = document.querySelectorAll('.class-card, .class-item');
                return {
                    classCount: classCards.length,
                    hasClassCards: classCards.length > 0,
                    firstClassHasName: classCards[0] ? !!classCards[0].querySelector('.class-name, h3') : false,
                    firstClassHasTeacher: classCards[0] ? !!classCards[0].querySelector('.teacher, .instructor') : false
                };
            });
            
            const success = classInfo.hasClassCards;
            await this.addTestResult(this.currentTest, success, classInfo);
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }
    }

    // ===== PHASE 6: RESPONSIVE/MOBILE FLOWS =====
    async testResponsiveFlows() {
        console.log('\n📱 PHASE 6: RESPONSIVE/MOBILE FLOWS');
        console.log('-'.repeat(50));

        await this.loginAsStudent();

        // Test 6.1: Mobile Layout
        this.currentTest = 'Mobile Layout Responsiveness';
        try {
            // Set mobile viewport
            await this.page.setViewport({ width: 375, height: 667 });
            await this.page.goto(`${this.baseURL}/stories.html`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const mobileLayout = await this.page.evaluate(() => {
                const container = document.querySelector('.container, .stories-container');
                const cards = document.querySelectorAll('.story-card');
                
                return {
                    containerWidth: container ? container.offsetWidth : 0,
                    cardsPerRow: cards.length > 0 ? Math.floor(container.offsetWidth / cards[0].offsetWidth) : 0,
                    hasNavigation: !!document.querySelector('nav, .navigation'),
                    navigationVisible: document.querySelector('nav')?.offsetHeight > 0,
                    viewportWidth: window.innerWidth
                };
            });
            
            const success = mobileLayout.viewportWidth <= 400 && mobileLayout.cardsPerRow <= 2;
            await this.addTestResult(this.currentTest, success, mobileLayout);
            
            // Reset to desktop
            await this.page.setViewport({ width: 1200, height: 800 });
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }

        // Test 6.2: Touch Interactions
        this.currentTest = 'Touch Interactions';
        try {
            // Simulate touch events
            const touchTest = await this.page.evaluate(() => {
                const firstCard = document.querySelector('.story-card');
                if (!firstCard) return { error: 'No story card found' };
                
                // Simulate touch events
                const touchStart = new TouchEvent('touchstart', {
                    touches: [{ clientX: 100, clientY: 100 }]
                });
                const touchEnd = new TouchEvent('touchend');
                
                firstCard.dispatchEvent(touchStart);
                firstCard.dispatchEvent(touchEnd);
                
                return {
                    touchEventsSupported: 'ontouchstart' in window,
                    cardExists: true,
                    touchSimulated: true
                };
            });
            
            const success = touchTest.touchEventsSupported;
            await this.addTestResult(this.currentTest, success, touchTest);
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }
    }

    // ===== PHASE 7: ERROR HANDLING FLOWS =====
    async testErrorHandlingFlows() {
        console.log('\n⚠️ PHASE 7: ERROR HANDLING FLOWS');
        console.log('-'.repeat(50));

        // Test 7.1: Network Failure Simulation
        this.currentTest = 'Network Failure Handling';
        try {
            await this.loginAsStudent();
            
            // Simulate offline
            await this.page.setOfflineMode(true);
            await this.page.goto(`${this.baseURL}/stories.html`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const offlineHandling = await this.page.evaluate(() => {
                return {
                    hasErrorMessage: !!document.querySelector('.error, .offline, .network-error'),
                    pageLoaded: document.readyState === 'complete',
                    hasRetryButton: !!document.querySelector('.retry, button[onclick*="reload"]')
                };
            });
            
            // Reset online mode
            await this.page.setOfflineMode(false);
            
            const success = offlineHandling.hasErrorMessage || !offlineHandling.pageLoaded;
            await this.addTestResult(this.currentTest, success, offlineHandling);
            
        } catch (error) {
            await this.page.setOfflineMode(false);
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }

        // Test 7.2: Invalid Form Submission
        this.currentTest = 'Invalid Form Submission';
        try {
            await this.page.goto(`${this.baseURL}/add-story.html`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Try to submit empty form
            const submitBtn = await this.page.$('button[type="submit"]');
            if (submitBtn) {
                await submitBtn.click();
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const validationHandling = await this.page.evaluate(() => {
                    return {
                        hasValidationErrors: !!document.querySelector('.error, .invalid, .validation-error'),
                        formSubmitted: window.location.href !== window.location.href, // Check if redirected
                        requiredFieldsHighlighted: !!document.querySelector('input:invalid, .required.error')
                    };
                });
                
                const success = validationHandling.hasValidationErrors || validationHandling.requiredFieldsHighlighted;
                await this.addTestResult(this.currentTest, success, validationHandling);
            } else {
                await this.addTestResult(this.currentTest, false, { error: 'Submit button not found' });
            }
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }
    }

    // ===== PHASE 8: PERFORMANCE FLOWS =====
    async testPerformanceFlows() {
        console.log('\n⚡ PHASE 8: PERFORMANCE FLOWS');
        console.log('-'.repeat(50));

        await this.loginAsStudent();

        // Test 8.1: Page Load Performance
        this.currentTest = 'Page Load Performance';
        try {
            const startTime = Date.now();
            
            await this.page.goto(`${this.baseURL}/stories.html`, { waitUntil: 'networkidle0' });
            
            const loadTime = Date.now() - startTime;
            
            const performanceMetrics = await this.page.evaluate(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                return {
                    loadEventEnd: navigation.loadEventEnd,
                    domContentLoaded: navigation.domContentLoadedEventEnd,
                    firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
                    storiesCount: document.querySelectorAll('.story-card').length
                };
            });
            
            const success = loadTime < 10000; // 10 seconds max
            await this.addTestResult(this.currentTest, success, {
                loadTime,
                ...performanceMetrics,
                acceptablePerformance: success
            });
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }

        // Test 8.2: Memory Usage
        this.currentTest = 'Memory Usage Test';
        try {
            // Get initial memory
            const initialMemory = await this.page.evaluate(() => {
                return performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                } : null;
            });
            
            // Perform memory-intensive operations
            for (let i = 0; i < 5; i++) {
                await this.page.reload();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            const finalMemory = await this.page.evaluate(() => {
                return performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                } : null;
            });
            
            const memoryIncrease = finalMemory && initialMemory ? 
                finalMemory.used - initialMemory.used : 0;
            
            const success = memoryIncrease < 50 * 1024 * 1024; // Less than 50MB increase
            
            await this.addTestResult(this.currentTest, success, {
                initialMemory,
                finalMemory,
                memoryIncrease,
                acceptableMemoryUsage: success
            });
            
        } catch (error) {
            await this.addTestResult(this.currentTest, false, { error: error.message });
        }
    }

    // ===== HELPER METHODS =====
    async loginAsStudent() {
        try {
            await this.page.goto(`${this.baseURL}/`);
            await this.page.waitForSelector('#email', { timeout: 10000 });
            
            await this.page.evaluate(() => {
                document.querySelector('#email').value = '';
                document.querySelector('#password').value = '';
            });
            
            await this.page.type('#email', this.credentials.student.email);
            await this.page.type('#password', this.credentials.student.password);
            await this.page.click('button[type="submit"]');
            await this.page.waitForNavigation({ timeout: 15000 });
            
        } catch (error) {
            this.addBug('LOGIN_HELPER', `Failed to login as student: ${error.message}`, 'high');
        }
    }

    async generateReport() {
        console.log('\n📊 GENERATING COMPREHENSIVE TEST REPORT');
        console.log('=' .repeat(80));
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(test => test.success).length;
        const failedTests = totalTests - passedTests;
        const successRate = ((passedTests / totalTests) * 100).toFixed(1);
        
        const criticalBugs = this.bugs.filter(bug => bug.severity === 'critical').length;
        const highBugs = this.bugs.filter(bug => bug.severity === 'high').length;
        const mediumBugs = this.bugs.filter(bug => bug.severity === 'medium').length;
        const lowBugs = this.bugs.filter(bug => bug.severity === 'low').length;
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate: parseFloat(successRate),
                totalBugs: this.bugs.length,
                bugBreakdown: { critical: criticalBugs, high: highBugs, medium: mediumBugs, low: lowBugs }
            },
            testResults: this.testResults,
            bugs: this.bugs,
            recommendations: this.generateRecommendations()
        };
        
        // Save detailed report
        fs.writeFileSync('comprehensive-test-report.json', JSON.stringify(report, null, 2));
        
        // Console summary
        console.log(`\n📊 TEST EXECUTION SUMMARY:`);
        console.log(`   Total Tests: ${totalTests}`);
        console.log(`   Passed: ${passedTests} ✅`);
        console.log(`   Failed: ${failedTests} ❌`);
        console.log(`   Success Rate: ${successRate}%`);
        
        console.log(`\n🐛 BUG SUMMARY:`);
        console.log(`   Total Bugs: ${this.bugs.length}`);
        console.log(`   Critical: ${criticalBugs} 🔴`);
        console.log(`   High: ${highBugs} 🟠`);
        console.log(`   Medium: ${mediumBugs} 🟡`);
        console.log(`   Low: ${lowBugs} 🟢`);
        
        console.log(`\n📁 Detailed report saved: comprehensive-test-report.json`);
        
        // Priority bugs for immediate attention
        const priorityBugs = this.bugs
            .filter(bug => bug.severity === 'critical' || bug.severity === 'high')
            .slice(0, 10);
            
        if (priorityBugs.length > 0) {
            console.log(`\n🚨 TOP PRIORITY BUGS FOR DEBUGGING:`);
            priorityBugs.forEach((bug, index) => {
                console.log(`   ${index + 1}. [${bug.severity.toUpperCase()}] ${bug.category}: ${bug.description}`);
            });
        }
        
        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Analyze bug patterns
        const bugCategories = {};
        this.bugs.forEach(bug => {
            bugCategories[bug.category] = (bugCategories[bug.category] || 0) + 1;
        });
        
        // Generate recommendations based on patterns
        if (bugCategories.CONSOLE_ERROR > 5) {
            recommendations.push({
                priority: 'high',
                category: 'JavaScript Errors',
                issue: 'Multiple console errors detected',
                solution: 'Review and fix JavaScript errors that may impact user experience'
            });
        }
        
        if (bugCategories.REQUEST_FAILED > 3) {
            recommendations.push({
                priority: 'high',
                category: 'Network Issues',
                issue: 'Multiple failed requests detected',
                solution: 'Investigate API endpoints and network connectivity issues'
            });
        }
        
        const failedAuthTests = this.testResults.filter(test => 
            test.testName.includes('Login') && !test.success).length;
        if (failedAuthTests > 0) {
            recommendations.push({
                priority: 'critical',
                category: 'Authentication',
                issue: 'Authentication flow issues detected',
                solution: 'Fix login, token persistence, and logout functionality immediately'
            });
        }
        
        const failedNavigationTests = this.testResults.filter(test => 
            test.testName.includes('Navigation') && !test.success).length;
        if (failedNavigationTests > 1) {
            recommendations.push({
                priority: 'medium',
                category: 'Navigation',
                issue: 'Navigation flow issues detected',
                solution: 'Review routing, deep linking, and browser navigation functionality'
            });
        }
        
        return recommendations;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Execute the comprehensive test suite
async function main() {
    const tester = new StudentFlowTester();
    
    try {
        await tester.initialize();
        await tester.runAllTests();
    } catch (error) {
        console.error('❌ Test suite execution failed:', error);
    } finally {
        await tester.cleanup();
    }
}

main().catch(console.error);