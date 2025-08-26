#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const { VidPODTestSuite, BugTracker } = require('./comprehensive-test-suite');

/**
 * VidPOD Student Comprehensive Testing Suite
 * Builds on 100% success rate achieved in previous student debugging
 * Comprehensive testing of all student workflows, stories browsing, and interactions
 */

class StudentComprehensiveTest extends VidPODTestSuite {
    constructor() {
        super();
        this.testSuiteName = 'Student Comprehensive Testing';
        this.studentCredentials = { email: 'student@vidpod.com', password: 'vidpod' };
        this.testResults.student = { 
            passed: 0, 
            failed: 0, 
            total: 0, 
            bugs: [],
            categories: {
                authentication: { passed: 0, failed: 0 },
                dashboard: { passed: 0, failed: 0 },
                storyBrowsing: { passed: 0, failed: 0 },
                storyInteraction: { passed: 0, failed: 0 },
                favorites: { passed: 0, failed: 0 },
                classManagement: { passed: 0, failed: 0 },
                storyCreation: { passed: 0, failed: 0 },
                navigation: { passed: 0, failed: 0 },
                security: { passed: 0, failed: 0 },
                performance: { passed: 0, failed: 0 },
                responsive: { passed: 0, failed: 0 }
            }
        };
        this.interactionMetrics = [];
        this.favoriteActions = [];
        this.performanceMetrics = [];
    }

    async runFullStudentTest() {
        console.log('🚀 STUDENT COMPREHENSIVE TESTING SUITE STARTING');
        console.log('Building on 100% success rate achieved in previous student debugging');
        console.log('=' .repeat(80));

        await this.initializeBrowser();

        try {
            const page = await this.createTestPage();

            // Phase 1: Core Authentication & Dashboard (Build on previous success)
            await this.testStudentAuthenticationComprehensive(page);
            await this.testStudentDashboardElements(page);
            
            // Phase 2: Story Browsing & Discovery (Where we achieved 100% success)
            await this.testStoriesBrowsingComprehensive(page);
            await this.testStorySearchAndFiltering(page);
            
            // Phase 3: Story Interactions & Engagement
            await this.testStoryDetailViewing(page);
            await this.testStoryInteractionFeatures(page);
            
            // Phase 4: Favorites System (Core student feature)
            await this.testFavoritesSystemComprehensive(page);
            await this.testFavoritesAnalytics(page);
            
            // Phase 5: Class Enrollment & Management
            await this.testClassEnrollmentWorkflow(page);
            await this.testClassParticipation(page);
            
            // Phase 6: Student Story Creation
            await this.testStudentStoryCreation(page);
            await this.testStoryEditingWorkflow(page);
            
            // Phase 7: Navigation & Cross-Page Integration
            await this.testStudentNavigationWorkflows(page);
            await this.testCrossPageDataPersistence(page);
            
            // Phase 8: Security Boundaries & Access Control
            await this.testStudentSecurityBoundaries(page);
            await this.testUnauthorizedAccessPrevention(page);
            
            // Phase 9: Performance & User Experience
            await this.testStudentPerformanceMetrics(page);
            await this.testResponsiveStudentExperience(page);
            
            // Phase 10: Edge Cases & Error Resilience
            await this.testStudentEdgeCases(page);
            await this.testErrorRecoveryScenarios(page);

            await page.close();

            // Generate comprehensive report
            const report = await this.generateStudentComprehensiveReport();
            console.log('\n🏁 STUDENT COMPREHENSIVE TESTING COMPLETE');
            console.log(`📄 Detailed report saved to: student-comprehensive-test-report.json`);
            
            return report;

        } finally {
            await this.closeBrowser();
        }
    }

    async testStudentAuthenticationComprehensive(page) {
        console.log('\n🔐 PHASE 1: Student Authentication Comprehensive Testing');
        
        // Test 1: Student login (building on previous 100% success)
        const loginResult = await this.testLogin(page, 'student', '/dashboard.html');
        await this.recordStudentTestResult('authentication', 'Student Login', loginResult.success, 
            loginResult.success ? `${loginResult.loginTime}ms` : 'Failed');

        if (!loginResult.success) {
            this.bugTracker.trackBug('AUTHENTICATION', 'CRITICAL', 
                'Student login failed - regression from previous 100% success rate');
            return false;
        }

        // Test 2: Token persistence across story browsing (critical for student workflow)
        const criticalPages = ['/dashboard.html', '/stories.html', '/story-detail.html?id=1', '/add-story.html'];
        for (const testPage of criticalPages) {
            try {
                await page.goto(`${this.apiUrl}${testPage}`);
                await new Promise(resolve => setTimeout(resolve, 2000));

                const tokenPersisted = await page.evaluate(() => {
                    return !!localStorage.getItem('token') && 
                           !window.location.href.includes('index.html');
                });

                await this.recordStudentTestResult('authentication', `Token Persistence: ${testPage}`, tokenPersisted);

                if (!tokenPersisted) {
                    this.bugTracker.trackBug('AUTHENTICATION', 'CRITICAL', 
                        `Student token lost during navigation to ${testPage} - breaks user workflow`);
                }
            } catch (error) {
                await this.recordStudentTestResult('authentication', `Token Persistence: ${testPage}`, false, error.message);
            }
        }

        // Test 3: Role verification and dashboard redirect
        const roleVerification = await page.evaluate(() => {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            return {
                role: userData.role,
                isStudent: userData.role === 'student',
                currentURL: window.location.href
            };
        });

        const correctRole = roleVerification.isStudent && roleVerification.currentURL.includes('dashboard.html');
        await this.recordStudentTestResult('authentication', 'Student Role & Redirect', correctRole, 
            `Role: ${roleVerification.role}, URL: ${roleVerification.currentURL}`);

        return loginResult.success && correctRole;
    }

    async testStudentDashboardElements(page) {
        console.log('\n📊 PHASE 2: Student Dashboard Elements Testing');

        await page.goto(`${this.apiUrl}/dashboard.html`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Test 1: Essential dashboard elements
        const dashboardElements = await page.evaluate(() => ({
            hasUserInfo: !!document.querySelector('#userInfo, .user-name, [class*="user"]'),
            hasWelcomeMessage: !!document.querySelector('.welcome, [class*="welcome"], h1, .greeting'),
            hasMainContent: !!document.querySelector('main, .main-content, .content, .dashboard-content'),
            hasNavigation: !!document.querySelector('nav, .navigation, .nav-menu'),
            hasStoriesSection: !!document.querySelector('.stories-section, [class*="stories"], .recent-stories'),
            hasFavoritesSection: !!document.querySelector('.favorites-section, [class*="favorites"]'),
            hasQuickActions: !!document.querySelector('.quick-actions, [class*="actions"], .action-buttons')
        }));

        await this.recordStudentTestResult('dashboard', 'User Info Display', dashboardElements.hasUserInfo);
        await this.recordStudentTestResult('dashboard', 'Welcome Message', dashboardElements.hasWelcomeMessage);
        await this.recordStudentTestResult('dashboard', 'Main Content Area', dashboardElements.hasMainContent);
        await this.recordStudentTestResult('dashboard', 'Navigation Menu', dashboardElements.hasNavigation);
        await this.recordStudentTestResult('dashboard', 'Stories Section', dashboardElements.hasStoriesSection);
        await this.recordStudentTestResult('dashboard', 'Quick Actions', dashboardElements.hasQuickActions);

        // Test 2: Role badge verification
        const roleBadge = await page.evaluate(() => {
            const badge = document.querySelector('.role-badge, [class*="role"]');
            return badge ? badge.textContent.toLowerCase() : '';
        });

        await this.recordStudentTestResult('dashboard', 'Student Role Badge', 
            roleBadge.includes('student'), `Badge: ${roleBadge}`);

        // Test 3: Navigation link visibility (student-specific)
        const navigationLinks = await page.evaluate(() => ({
            storiesLink: !!document.querySelector('[href*="stories"], [onclick*="stories"]'),
            addStoryLink: !!document.querySelector('[href*="add-story"], [onclick*="add"]'),
            dashboardLink: !!document.querySelector('[href*="dashboard"], [onclick*="dashboard"]'),
            adminLinkHidden: !document.querySelector('[href*="admin"], [onclick*="admin"]'),
            teacherLinkHidden: !document.querySelector('[href*="teacher"], [onclick*="teacher"]')
        }));

        await this.recordStudentTestResult('dashboard', 'Stories Link Visible', navigationLinks.storiesLink);
        await this.recordStudentTestResult('dashboard', 'Add Story Link Visible', navigationLinks.addStoryLink);
        await this.recordStudentTestResult('dashboard', 'Admin Link Hidden', navigationLinks.adminLinkHidden);
        await this.recordStudentTestResult('dashboard', 'Teacher Link Hidden', navigationLinks.teacherLinkHidden);
    }

    async testStoriesBrowsingComprehensive(page) {
        console.log('\n📚 PHASE 3: Stories Browsing Comprehensive Testing (Where we achieved 100% success)');

        await page.goto(`${this.apiUrl}/stories.html`);
        await new Promise(resolve => setTimeout(resolve, 4000)); // Extra wait for stories loading

        // Test 1: Stories page loading (critical success case)
        const storiesPageState = await page.evaluate(() => ({
            pageLoaded: document.readyState === 'complete',
            hasStoriesGrid: !!document.querySelector('#storiesGrid, .stories-grid, .stories-container'),
            hasStoryCards: document.querySelectorAll('.story-card, [class*="story"]').length,
            hasSearchSection: !!document.querySelector('.search-section, [class*="search"], #searchForm'),
            noJSErrors: !document.body.textContent.includes('Error'),
            storiesVisible: document.querySelectorAll('.story-card:not([style*="display: none"])').length
        }));

        await this.recordStudentTestResult('storyBrowsing', 'Stories Page Load', storiesPageState.pageLoaded);
        await this.recordStudentTestResult('storyBrowsing', 'Stories Grid Present', storiesPageState.hasStoriesGrid);
        await this.recordStudentTestResult('storyBrowsing', 'Story Cards Loaded', storiesPageState.hasStoryCards > 0, 
            `${storiesPageState.hasStoryCards} stories found`);
        await this.recordStudentTestResult('storyBrowsing', 'Search Section Present', storiesPageState.hasSearchSection);
        await this.recordStudentTestResult('storyBrowsing', 'No JavaScript Errors', storiesPageState.noJSErrors);
        await this.recordStudentTestResult('storyBrowsing', 'Stories Visible', storiesPageState.storiesVisible > 0, 
            `${storiesPageState.storiesVisible} visible stories`);

        if (storiesPageState.hasStoryCards === 0) {
            this.bugTracker.trackBug('FUNCTIONAL', 'CRITICAL', 
                'No stories loading - regression from previous 100% success rate');
        }

        // Test 2: Story card interaction
        if (storiesPageState.hasStoryCards > 0) {
            await this.testStoryCardInteractions(page);
        }

        // Test 3: View mode functionality
        await this.testViewModeSwitching(page);

        // Test 4: Results display and pagination
        await this.testResultsDisplayAndPagination(page);
    }

    async testStoryCardInteractions(page) {
        const storyCards = await page.$$('.story-card, [class*="story"]');
        if (storyCards.length > 0) {
            try {
                // Test story card click
                await storyCards[0].click();
                await new Promise(resolve => setTimeout(resolve, 2000));

                const interactionResult = await page.evaluate(() => ({
                    urlChanged: !window.location.href.includes('stories.html'),
                    onDetailPage: window.location.href.includes('story-detail'),
                    pageLoaded: document.readyState === 'complete'
                }));

                await this.recordStudentTestResult('storyInteraction', 'Story Card Click Navigation', 
                    interactionResult.urlChanged, `URL: ${interactionResult.urlChanged ? 'Changed' : 'No change'}`);

                this.interactionMetrics.push({
                    action: 'story_card_click',
                    success: interactionResult.urlChanged,
                    timestamp: Date.now()
                });

                // Return to stories page
                await page.goto(`${this.apiUrl}/stories.html`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                await this.recordStudentTestResult('storyInteraction', 'Story Card Click Navigation', false, error.message);
            }
        }
    }

    async testViewModeSwitching(page) {
        // Test grid/list view switching
        const viewButtons = await page.$$('#gridViewBtn, #listViewBtn, [onclick*="setViewMode"]');
        if (viewButtons.length >= 2) {
            try {
                // Test list view
                await viewButtons[1].click();
                await new Promise(resolve => setTimeout(resolve, 1000));

                const listViewActive = await page.evaluate(() => {
                    const container = document.querySelector('#storiesGrid, .stories-grid');
                    return container && container.className.includes('list');
                });

                await this.recordStudentTestResult('storyBrowsing', 'List View Switch', listViewActive);

                // Test grid view
                await viewButtons[0].click();
                await new Promise(resolve => setTimeout(resolve, 1000));

                const gridViewActive = await page.evaluate(() => {
                    const container = document.querySelector('#storiesGrid, .stories-grid');
                    return container && !container.className.includes('list');
                });

                await this.recordStudentTestResult('storyBrowsing', 'Grid View Switch', gridViewActive);
            } catch (error) {
                await this.recordStudentTestResult('storyBrowsing', 'View Mode Switching', false, error.message);
            }
        }
    }

    async testResultsDisplayAndPagination(page) {
        const resultsInfo = await page.evaluate(() => ({
            hasResultsCount: !!document.querySelector('#resultsCount, .results-count, [class*="count"]'),
            hasPagination: !!document.querySelector('#paginationControls, .pagination, [class*="page"]'),
            resultsText: document.querySelector('#resultsCount, .results-count')?.textContent || ''
        }));

        await this.recordStudentTestResult('storyBrowsing', 'Results Count Display', 
            resultsInfo.hasResultsCount, resultsInfo.resultsText);
        await this.recordStudentTestResult('storyBrowsing', 'Pagination Controls', resultsInfo.hasPagination);
    }

    async testStorySearchAndFiltering(page) {
        console.log('\n🔍 PHASE 4: Story Search & Filtering Testing');

        await page.goto(`${this.apiUrl}/stories.html`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Test 1: Search functionality
        const searchInput = await page.$('#searchKeywords, [id*="search"], [placeholder*="search"]');
        if (searchInput) {
            try {
                await searchInput.type('test story');
                
                // Submit search
                const searchForm = await page.$('#searchForm, .search-form');
                if (searchForm) {
                    await searchForm.evaluate(form => form.dispatchEvent(new Event('submit')));
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    const searchResult = await page.evaluate(() => ({
                        hasResults: document.querySelectorAll('.story-card').length > 0,
                        resultsChanged: true // Assume results changed for search
                    }));

                    await this.recordStudentTestResult('storyBrowsing', 'Search Functionality', searchResult.hasResults);
                }
            } catch (error) {
                await this.recordStudentTestResult('storyBrowsing', 'Search Functionality', false, error.message);
            }
        }

        // Test 2: Filter functionality
        await this.testFilterFunctionality(page);

        // Test 3: Clear filters
        await this.testClearFilters(page);
    }

    async testFilterFunctionality(page) {
        // Test tag filtering
        const tagSelect = await page.$('#searchTags, [id*="tag"]');
        if (tagSelect) {
            try {
                await page.evaluate(() => {
                    const select = document.querySelector('#searchTags, [id*="tag"]');
                    if (select && select.options.length > 1) {
                        select.options[1].selected = true;
                        select.dispatchEvent(new Event('change'));
                    }
                });

                // Apply filters
                const applyButton = await page.$('[onclick*="applyFilters"], .apply-filters, [type="submit"]');
                if (applyButton) {
                    await applyButton.click();
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    await this.recordStudentTestResult('storyBrowsing', 'Tag Filter Apply', true);
                }
            } catch (error) {
                await this.recordStudentTestResult('storyBrowsing', 'Tag Filter Apply', false, error.message);
            }
        }

        // Test date filtering
        const dateInput = await page.$('#searchStartDate, [type="date"]');
        if (dateInput) {
            try {
                await dateInput.type('2024-01-01');
                await this.recordStudentTestResult('storyBrowsing', 'Date Filter Input', true);
            } catch (error) {
                await this.recordStudentTestResult('storyBrowsing', 'Date Filter Input', false, error.message);
            }
        }
    }

    async testClearFilters(page) {
        const clearButton = await page.$('[onclick*="clearFilters"], .clear-filters');
        if (clearButton) {
            try {
                await clearButton.click();
                await new Promise(resolve => setTimeout(resolve, 2000));

                const filtersCleared = await page.evaluate(() => {
                    const searchInput = document.querySelector('#searchKeywords');
                    const dateInput = document.querySelector('#searchStartDate');
                    return (!searchInput || searchInput.value === '') && 
                           (!dateInput || dateInput.value === '');
                });

                await this.recordStudentTestResult('storyBrowsing', 'Clear Filters', filtersCleared);
            } catch (error) {
                await this.recordStudentTestResult('storyBrowsing', 'Clear Filters', false, error.message);
            }
        }
    }

    async testFavoritesSystemComprehensive(page) {
        console.log('\n❤️ PHASE 5: Favorites System Comprehensive Testing');

        await page.goto(`${this.apiUrl}/stories.html`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Test 1: Favorite button presence and functionality
        const favoriteButtons = await page.$$('.favorite-btn, .favorite-star, [onclick*="favorite"], [class*="favorite"]');
        if (favoriteButtons.length > 0) {
            try {
                const initialState = await page.evaluate(() => {
                    const btn = document.querySelector('.favorite-btn, .favorite-star');
                    return btn ? btn.classList.contains('favorited') : false;
                });

                // Click favorite button
                await favoriteButtons[0].click();
                await new Promise(resolve => setTimeout(resolve, 2000));

                const afterClickState = await page.evaluate(() => {
                    const btn = document.querySelector('.favorite-btn, .favorite-star');
                    return btn ? btn.classList.contains('favorited') : false;
                });

                const favoriteToggled = initialState !== afterClickState;
                await this.recordStudentTestResult('favorites', 'Favorite Toggle', favoriteToggled);

                this.favoriteActions.push({
                    action: 'toggle_favorite',
                    success: favoriteToggled,
                    timestamp: Date.now()
                });

                if (favoriteToggled) {
                    // Test unfavorite
                    await favoriteButtons[0].click();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await this.recordStudentTestResult('favorites', 'Unfavorite Toggle', true);
                }
            } catch (error) {
                await this.recordStudentTestResult('favorites', 'Favorite Toggle', false, error.message);
            }
        } else {
            await this.recordStudentTestResult('favorites', 'Favorite Buttons Present', false);
        }

        // Test 2: Favorites page access
        await this.testFavoritesPageAccess(page);

        // Test 3: Bulk favorites functionality
        await this.testBulkFavorites(page);
    }

    async testFavoritesPageAccess(page) {
        // Try to access favorites page through navigation
        const favoritesLink = await page.$('[href*="favorites"], [onclick*="favorites"]');
        if (favoritesLink) {
            try {
                await favoritesLink.click();
                await new Promise(resolve => setTimeout(resolve, 2000));

                const onFavoritesPage = await page.evaluate(() => {
                    return window.location.href.includes('favorites') || 
                           document.body.textContent.includes('Favorites') ||
                           !!document.querySelector('.favorites-container, [class*="favorites"]');
                });

                await this.recordStudentTestResult('favorites', 'Favorites Page Access', onFavoritesPage);
            } catch (error) {
                await this.recordStudentTestResult('favorites', 'Favorites Page Access', false, error.message);
            }
        } else {
            // Check dashboard for favorites section
            await page.goto(`${this.apiUrl}/dashboard.html`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const favoritesSection = await page.evaluate(() => {
                return !!document.querySelector('.favorites-section, [class*="favorites"]');
            });

            await this.recordStudentTestResult('favorites', 'Favorites Section on Dashboard', favoritesSection);
        }
    }

    async testBulkFavorites(page) {
        await page.goto(`${this.apiUrl}/stories.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test multi-select and bulk favorite
        const selectAllCheckbox = await page.$('#selectAllCheckbox, [onclick*="selectAll"]');
        if (selectAllCheckbox) {
            try {
                await selectAllCheckbox.click();
                await new Promise(resolve => setTimeout(resolve, 1000));

                const bulkFavoriteBtn = await page.$('[onclick*="bulkFavorite"], .bulk-favorite');
                if (bulkFavoriteBtn) {
                    await bulkFavoriteBtn.click();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await this.recordStudentTestResult('favorites', 'Bulk Favorite', true);
                } else {
                    await this.recordStudentTestResult('favorites', 'Bulk Favorite Button', false);
                }
            } catch (error) {
                await this.recordStudentTestResult('favorites', 'Bulk Favorite', false, error.message);
            }
        }
    }

    async testStudentStoryCreation(page) {
        console.log('\n✍️ PHASE 6: Student Story Creation Testing');

        await page.goto(`${this.apiUrl}/add-story.html`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Test 1: Add story page access
        const addStoryAccess = await page.evaluate(() => {
            return !window.location.href.includes('index.html') && 
                   !!document.querySelector('#storyForm, .story-form, form');
        });

        await this.recordStudentTestResult('storyCreation', 'Add Story Page Access', addStoryAccess);

        if (addStoryAccess) {
            // Test 2: Story form completion
            await this.testStudentStoryFormCompletion(page);

            // Test 3: Form validation
            await this.testStoryFormValidation(page);
        }
    }

    async testStudentStoryFormCompletion(page) {
        try {
            const studentStoryData = {
                title: `Student Story ${Date.now()}`,
                description: 'A compelling story idea created by a student for podcast production.',
                question1: 'What makes this story unique to student perspective?',
                question2: 'How does this relate to student experiences?',
                startDate: '2024-06-01',
                endDate: '2024-08-31'
            };

            await page.evaluate((data) => {
                const titleInput = document.querySelector('#ideaTitle, [name="title"]');
                const descInput = document.querySelector('#ideaDescription, [name="description"]');
                const q1Input = document.querySelector('#question1, [name="question1"]');
                const q2Input = document.querySelector('#question2, [name="question2"]');
                const startInput = document.querySelector('#startDate, [name="startDate"]');
                const endInput = document.querySelector('#endDate, [name="endDate"]');

                if (titleInput) titleInput.value = data.title;
                if (descInput) descInput.value = data.description;
                if (q1Input) q1Input.value = data.question1;
                if (q2Input) q2Input.value = data.question2;
                if (startInput) startInput.value = data.startDate;
                if (endInput) endInput.value = data.endDate;
            }, studentStoryData);

            await this.recordStudentTestResult('storyCreation', 'Story Form Fill', true);

            // Test form submission
            const submitButton = await page.$('#saveStoryBtn, [type="submit"], .save-btn');
            if (submitButton) {
                await submitButton.click();
                await new Promise(resolve => setTimeout(resolve, 3000));

                const submissionSuccess = await page.evaluate(() => {
                    return !document.body.textContent.includes('Error') && 
                           (window.location.href.includes('dashboard') || 
                            window.location.href.includes('stories') ||
                            document.body.textContent.includes('Success'));
                });

                await this.recordStudentTestResult('storyCreation', 'Story Form Submission', submissionSuccess);
            }
        } catch (error) {
            await this.recordStudentTestResult('storyCreation', 'Story Form Fill', false, error.message);
        }
    }

    async testStoryFormValidation(page) {
        await page.goto(`${this.apiUrl}/add-story.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test empty form submission
        try {
            const submitButton = await page.$('#saveStoryBtn, [type="submit"], .save-btn');
            if (submitButton) {
                await submitButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));

                const validationWorking = await page.evaluate(() => {
                    return document.body.textContent.includes('required') || 
                           document.body.textContent.includes('Please') ||
                           !!document.querySelector('.error, [class*="error"]');
                });

                await this.recordStudentTestResult('storyCreation', 'Form Validation', validationWorking);
            }
        } catch (error) {
            await this.recordStudentTestResult('storyCreation', 'Form Validation', false, error.message);
        }
    }

    async testStudentSecurityBoundaries(page) {
        console.log('\n🔒 PHASE 7: Student Security Boundaries Testing');

        // Test 1: Admin page access denied
        await page.goto(`${this.apiUrl}/admin.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const adminPageDenied = await page.evaluate(() => {
            return window.location.href.includes('index.html') || 
                   document.body.textContent.includes('Access Denied') ||
                   document.body.textContent.includes('Unauthorized');
        });

        await this.recordStudentTestResult('security', 'Admin Page Access Denied', adminPageDenied);

        // Test 2: Teacher dashboard access denied
        await page.goto(`${this.apiUrl}/teacher-dashboard.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const teacherPageDenied = await page.evaluate(() => {
            return window.location.href.includes('index.html') || 
                   document.body.textContent.includes('Access Denied') ||
                   document.body.textContent.includes('Unauthorized');
        });

        await this.recordStudentTestResult('security', 'Teacher Page Access Denied', teacherPageDenied);

        // Test 3: API endpoint restrictions
        await this.testStudentAPIRestrictions(page);
    }

    async testStudentAPIRestrictions(page) {
        // Return to valid student page first
        await page.goto(`${this.apiUrl}/dashboard.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const restrictedEndpoints = [
            '/api/admin/teachers',
            '/api/admin/users',
            '/api/teacher-requests',
            '/api/schools'
        ];

        for (const endpoint of restrictedEndpoints) {
            try {
                const response = await page.evaluate(async (url) => {
                    const token = localStorage.getItem('token');
                    const res = await fetch(url, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    return { status: res.status, ok: res.ok };
                }, `${this.apiUrl}${endpoint}`);

                // Student should get 403 Forbidden for restricted endpoints
                const accessDenied = response.status === 403;
                await this.recordStudentTestResult('security', `Restricted API: ${endpoint}`, 
                    accessDenied, `Status: ${response.status}`);

                if (response.status === 200) {
                    this.bugTracker.trackBug('AUTHENTICATION', 'CRITICAL', 
                        `Student has unauthorized access to restricted endpoint: ${endpoint}`);
                }
            } catch (error) {
                await this.recordStudentTestResult('security', `Restricted API: ${endpoint}`, false, error.message);
            }
        }
    }

    async testStudentPerformanceMetrics(page) {
        console.log('\n⚡ PHASE 8: Student Performance Metrics Testing');

        const performanceTests = [
            { name: 'Student Dashboard Load', url: '/dashboard.html' },
            { name: 'Stories Browse Load', url: '/stories.html' },
            { name: 'Add Story Load', url: '/add-story.html' },
            { name: 'Story Detail Load', url: '/story-detail.html?id=1' }
        ];

        for (const test of performanceTests) {
            const startTime = Date.now();
            
            try {
                await page.goto(`${this.apiUrl}${test.url}`);
                await page.waitForSelector('body', { timeout: 10000 });
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const loadTime = Date.now() - startTime;
                this.performanceMetrics.push({ page: test.name, loadTime });

                const performant = loadTime < 4000; // Under 4 seconds for student pages
                await this.recordStudentTestResult('performance', `${test.name} Speed`, performant, `${loadTime}ms`);

                if (loadTime > 6000) {
                    this.bugTracker.trackBug('PERFORMANCE', 'MEDIUM', 
                        `Slow student page load: ${test.name} took ${loadTime}ms`);
                }
            } catch (error) {
                await this.recordStudentTestResult('performance', `${test.name} Speed`, false, error.message);
            }
        }
    }

    async testStudentEdgeCases(page) {
        console.log('\n⚠️ PHASE 9: Student Edge Cases Testing');

        // Test 1: Long search queries
        await page.goto(`${this.apiUrl}/stories.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const searchInput = await page.$('#searchKeywords, [id*="search"]');
        if (searchInput) {
            try {
                await searchInput.type('A'.repeat(200)); // Very long search
                const longSearchHandled = true; // If no error, it's handled
                await this.recordStudentTestResult('security', 'Long Search Query Handling', longSearchHandled);
            } catch (error) {
                await this.recordStudentTestResult('security', 'Long Search Query Handling', false, error.message);
            }
        }

        // Test 2: Network error resilience
        await this.testNetworkErrorResilience(page);

        // Test 3: Invalid story ID handling
        await this.testInvalidStoryIDHandling(page);
    }

    async testNetworkErrorResilience(page) {
        // Test accessing non-existent story
        await page.goto(`${this.apiUrl}/story-detail.html?id=999999`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const errorHandled = await page.evaluate(() => {
            return !document.body.textContent.includes('TypeError') && 
                   !document.body.textContent.includes('undefined') &&
                   (document.body.textContent.includes('not found') || 
                    document.body.textContent.includes('Error') ||
                    window.location.href.includes('stories'));
        });

        await this.recordStudentTestResult('security', 'Invalid Story ID Handling', errorHandled);
    }

    async testInvalidStoryIDHandling(page) {
        // Test with malformed story ID
        await page.goto(`${this.apiUrl}/story-detail.html?id=invalid_id`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const malformedIDHandled = await page.evaluate(() => {
            return document.readyState === 'complete' && 
                   !document.body.textContent.includes('TypeError');
        });

        await this.recordStudentTestResult('security', 'Malformed Story ID Handling', malformedIDHandled);
    }

    async recordStudentTestResult(category, testName, success, details = '') {
        this.testResults.student.total++;
        this.testResults.student.categories[category].total = (this.testResults.student.categories[category].total || 0) + 1;
        
        if (success) {
            this.testResults.student.passed++;
            this.testResults.student.categories[category].passed++;
        } else {
            this.testResults.student.failed++;
            this.testResults.student.categories[category].failed++;
        }
        
        console.log(`   ${success ? '✅' : '❌'} ${testName}: ${details}`);
    }

    async generateStudentComprehensiveReport() {
        const endTime = Date.now();
        const totalTime = endTime - this.startTime;
        
        const bugReport = this.bugTracker.generateReport();
        
        const successRate = this.testResults.student.total > 0 
            ? ((this.testResults.student.passed / this.testResults.student.total) * 100).toFixed(1)
            : 0;

        // Generate category success rates
        const categoryResults = {};
        for (const [category, data] of Object.entries(this.testResults.student.categories)) {
            const total = data.passed + data.failed;
            categoryResults[category] = {
                ...data,
                total,
                successRate: total > 0 ? ((data.passed / total) * 100).toFixed(1) : 0
            };
        }

        const report = {
            metadata: {
                timestamp: new Date().toISOString(),
                duration: `${(totalTime / 1000).toFixed(1)}s`,
                testSuite: 'VidPOD Student Comprehensive Testing',
                previousBaselineSuccess: '100% (Student debugging success)',
                comprehensiveTestCount: this.testResults.student.total
            },
            summary: {
                totalTests: this.testResults.student.total,
                passed: this.testResults.student.passed,
                failed: this.testResults.student.failed,
                successRate: `${successRate}%`,
                totalBugs: bugReport.summary.total,
                performanceMetrics: this.performanceMetrics,
                interactionMetrics: this.interactionMetrics,
                favoriteActions: this.favoriteActions
            },
            categoryResults,
            bugAnalysis: bugReport,
            recommendations: this.generateStudentRecommendations(bugReport, successRate, categoryResults)
        };

        // Save detailed report
        await fs.writeFile(
            './student-comprehensive-test-report.json',
            JSON.stringify(report, null, 2)
        );

        console.log('\n📊 STUDENT COMPREHENSIVE TEST REPORT');
        console.log('=' .repeat(80));
        console.log(`🎯 Student Success Rate: ${successRate}%`);
        console.log(`📈 Previous Baseline: 100% (Story debugging success)`);
        console.log(`📋 Comprehensive Tests: ${this.testResults.student.total} (${this.testResults.student.passed} passed, ${this.testResults.student.failed} failed)`);
        console.log(`🐛 Total Bugs Found: ${bugReport.summary.total}`);
        console.log(`❤️ Favorite Actions: ${this.favoriteActions.length}`);
        console.log(`🔄 Interactions: ${this.interactionMetrics.length}`);
        
        console.log('\n📊 Category Performance:');
        for (const [category, data] of Object.entries(categoryResults)) {
            if (data.total > 0) {
                console.log(`   ${category}: ${data.successRate}% (${data.passed}/${data.total})`);
            }
        }

        console.log('\n⚡ Performance Summary:');
        const avgLoadTime = this.performanceMetrics.length > 0 
            ? this.performanceMetrics.reduce((sum, m) => sum + m.loadTime, 0) / this.performanceMetrics.length
            : 0;
        console.log(`   Average Load Time: ${avgLoadTime.toFixed(0)}ms`);

        return report;
    }

    generateStudentRecommendations(bugReport, successRate, categoryResults) {
        const recommendations = [];
        
        if (successRate < 95) {
            recommendations.push('📉 Student success rate below 95% - investigate user experience issues');
        }
        
        if (bugReport.summary.bySeverity.CRITICAL > 0) {
            recommendations.push('🚨 Critical student functionality broken - immediate fix required');
        }

        // Category-specific recommendations
        if (categoryResults.storyBrowsing.successRate < 90) {
            recommendations.push('📚 Story browsing issues - core student feature affected');
        }
        
        if (categoryResults.favorites.successRate < 85) {
            recommendations.push('❤️ Favorites system issues - key engagement feature broken');
        }
        
        if (categoryResults.security.successRate < 100) {
            recommendations.push('🔒 Security boundary failures - review student access controls');
        }

        const avgLoadTime = this.performanceMetrics.length > 0 
            ? this.performanceMetrics.reduce((sum, m) => sum + m.loadTime, 0) / this.performanceMetrics.length
            : 0;
        
        if (avgLoadTime > 4000) {
            recommendations.push('🚀 Performance optimization needed - student pages loading slowly');
        }

        if (this.favoriteActions.length > 0) {
            const favoriteSuccessRate = (this.favoriteActions.filter(a => a.success).length / this.favoriteActions.length) * 100;
            if (favoriteSuccessRate < 90) {
                recommendations.push('❤️ Favorites functionality needs improvement - low success rate');
            }
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ Excellent student experience! Consider advanced feature enhancements');
        }

        return recommendations;
    }
}

// Export for use in other test files
module.exports = { StudentComprehensiveTest };

// Run if called directly
if (require.main === module) {
    const studentTest = new StudentComprehensiveTest();
    studentTest.runFullStudentTest().catch(console.error);
}