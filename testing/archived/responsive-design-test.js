#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const { VidPODTestSuite, BugTracker } = require('./comprehensive-test-suite');

/**
 * VidPOD Responsive Design Testing Suite
 * Comprehensive responsive design and cross-device compatibility testing
 * Ensures optimal user experience across all screen sizes and devices
 */

class ResponsiveDesignTest extends VidPODTestSuite {
    constructor() {
        super();
        this.testSuiteName = 'Responsive Design Testing';
        this.allCredentials = {
            admin: { email: 'admin@vidpod.com', password: 'vidpod' },
            teacher: { email: 'teacher@vidpod.com', password: 'vidpod' },
            student: { email: 'student@vidpod.com', password: 'vidpod' }
        };
        this.testResults.responsive = { 
            passed: 0, 
            failed: 0, 
            total: 0, 
            bugs: [],
            categories: {
                layoutAdaptation: { passed: 0, failed: 0 },
                navigationUsability: { passed: 0, failed: 0 },
                touchInterface: { passed: 0, failed: 0 },
                contentReadability: { passed: 0, failed: 0 },
                formUsability: { passed: 0, failed: 0 },
                imageResponsiveness: { passed: 0, failed: 0 },
                performanceOnMobile: { passed: 0, failed: 0 },
                crossBrowserCompatibility: { passed: 0, failed: 0 }
            }
        };
        this.deviceProfiles = this.getDeviceProfiles();
        this.responsiveMetrics = {
            devices: [],
            breakpoints: [],
            performance: [],
            accessibility: []
        };
    }

    getDeviceProfiles() {
        return {
            mobile: [
                { name: 'iPhone SE', width: 375, height: 667, deviceScaleFactor: 2, isMobile: true },
                { name: 'iPhone 12', width: 390, height: 844, deviceScaleFactor: 3, isMobile: true },
                { name: 'iPhone 12 Pro Max', width: 428, height: 926, deviceScaleFactor: 3, isMobile: true },
                { name: 'Samsung Galaxy S21', width: 384, height: 854, deviceScaleFactor: 2.75, isMobile: true },
                { name: 'Pixel 5', width: 393, height: 851, deviceScaleFactor: 2.75, isMobile: true }
            ],
            tablet: [
                { name: 'iPad Mini', width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true },
                { name: 'iPad Air', width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true },
                { name: 'iPad Pro 11"', width: 834, height: 1194, deviceScaleFactor: 2, isMobile: true },
                { name: 'Samsung Galaxy Tab', width: 800, height: 1280, deviceScaleFactor: 2, isMobile: true }
            ],
            desktop: [
                { name: 'Laptop 13"', width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false },
                { name: 'Desktop 1080p', width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false },
                { name: 'Desktop 1440p', width: 2560, height: 1440, deviceScaleFactor: 1, isMobile: false },
                { name: 'Ultrawide', width: 3440, height: 1440, deviceScaleFactor: 1, isMobile: false }
            ]
        };
    }

    async runResponsiveDesignTest() {
        console.log('🚀 RESPONSIVE DESIGN TESTING SUITE STARTING');
        console.log('Comprehensive responsive design and cross-device compatibility testing');
        console.log('=' .repeat(80));

        await this.initializeBrowser();

        try {
            // Phase 1: Multi-Device Layout Testing
            await this.testMultiDeviceLayouts();
            
            // Phase 2: Breakpoint Analysis
            await this.testResponsiveBreakpoints();
            
            // Phase 3: Touch Interface Testing
            await this.testTouchInterfaceUsability();
            
            // Phase 4: Navigation Adaptation
            await this.testNavigationAdaptation();
            
            // Phase 5: Content Readability
            await this.testContentReadabilityAcrossDevices();
            
            // Phase 6: Form Usability Testing
            await this.testFormUsabilityOnMobile();
            
            // Phase 7: Image and Media Responsiveness
            await this.testImageAndMediaResponsiveness();
            
            // Phase 8: Performance on Different Devices
            await this.testPerformanceAcrossDevices();
            
            // Phase 9: Accessibility Across Devices
            await this.testAccessibilityAcrossDevices();
            
            // Phase 10: Cross-Browser Responsive Testing
            await this.testCrossBrowserResponsiveness();

            // Generate comprehensive responsive design report
            const report = await this.generateResponsiveDesignReport();
            console.log('\n🏁 RESPONSIVE DESIGN TESTING COMPLETE');
            console.log(`📄 Responsive design report saved to: responsive-design-test-report.json`);
            
            return report;

        } finally {
            await this.closeBrowser();
        }
    }

    async testMultiDeviceLayouts() {
        console.log('\n📱 PHASE 1: Multi-Device Layout Testing');

        const testPages = ['/dashboard.html', '/stories.html', '/add-story.html', '/teacher-dashboard.html', '/admin.html'];
        
        for (const [deviceType, devices] of Object.entries(this.deviceProfiles)) {
            console.log(`\n   Testing ${deviceType} devices...`);
            
            for (const device of devices) {
                for (const page of testPages) {
                    const layoutTest = await this.testPageLayoutOnDevice(device, page);
                    
                    await this.recordResponsiveTestResult('layoutAdaptation', 
                        `${device.name} ${page} Layout`, 
                        layoutTest.success, 
                        layoutTest.details);

                    this.responsiveMetrics.devices.push({
                        device: device.name,
                        deviceType,
                        page,
                        ...layoutTest
                    });
                }
            }
        }
    }

    async testPageLayoutOnDevice(device, pagePath) {
        const page = await this.createTestPage();
        
        try {
            await page.setViewport({
                width: device.width,
                height: device.height,
                deviceScaleFactor: device.deviceScaleFactor,
                isMobile: device.isMobile
            });

            // Login based on page requirements
            const role = this.determineRoleForPage(pagePath);
            if (role) {
                await this.testLogin(page, role, '/dashboard.html');
            }

            await page.goto(`${this.apiUrl}${pagePath}`);
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Analyze layout adaptation
            const layoutAnalysis = await page.evaluate(() => {
                const body = document.body;
                const viewport = { width: window.innerWidth, height: window.innerHeight };
                
                // Check for horizontal overflow
                const hasHorizontalOverflow = body.scrollWidth > window.innerWidth;
                
                // Check for layout elements
                const elements = {
                    header: !!document.querySelector('header, .header, .page-header'),
                    navigation: !!document.querySelector('nav, .nav, .navigation'),
                    mainContent: !!document.querySelector('main, .main-content, .content'),
                    footer: !!document.querySelector('footer, .footer'),
                    sidebar: !!document.querySelector('.sidebar, .side-nav'),
                    cards: document.querySelectorAll('.card, .story-card, .class-card').length,
                    forms: document.querySelectorAll('form').length,
                    buttons: document.querySelectorAll('button, .btn').length
                };

                // Check responsive grid behavior
                const gridElements = document.querySelectorAll('.grid, .stories-grid, .stats-grid');
                const gridAdaptation = Array.from(gridElements).map(grid => ({
                    columns: window.getComputedStyle(grid).gridTemplateColumns,
                    gap: window.getComputedStyle(grid).gap,
                    width: grid.offsetWidth
                }));

                // Check text readability
                const textElements = document.querySelectorAll('h1, h2, h3, p, span');
                let tooSmallText = 0;
                textElements.forEach(el => {
                    const fontSize = parseInt(window.getComputedStyle(el).fontSize);
                    if (fontSize < 14) tooSmallText++;
                });

                // Check touch target sizes
                const interactiveElements = document.querySelectorAll('button, a, input, select, .clickable');
                let inadequateTouchTargets = 0;
                interactiveElements.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width < 44 || rect.height < 44) { // 44px is recommended minimum
                        inadequateTouchTargets++;
                    }
                });

                return {
                    viewport,
                    hasHorizontalOverflow,
                    elements,
                    gridAdaptation,
                    textReadability: {
                        totalTextElements: textElements.length,
                        tooSmallText
                    },
                    touchTargets: {
                        totalInteractive: interactiveElements.length,
                        inadequateSize: inadequateTouchTargets
                    }
                };
            });

            const success = this.evaluateLayoutSuccess(layoutAnalysis, device);
            
            await page.close();
            return {
                success,
                details: this.generateLayoutDetails(layoutAnalysis, success),
                metrics: layoutAnalysis
            };

        } catch (error) {
            await page.close();
            return { 
                success: false, 
                details: error.message,
                metrics: null 
            };
        }
    }

    determineRoleForPage(pagePath) {
        if (pagePath.includes('admin')) return 'admin';
        if (pagePath.includes('teacher')) return 'teacher';
        return 'student';
    }

    evaluateLayoutSuccess(analysis, device) {
        let score = 100;

        // Deduct points for layout issues
        if (analysis.hasHorizontalOverflow) score -= 30;
        if (!analysis.elements.header) score -= 10;
        if (!analysis.elements.mainContent) score -= 20;
        if (analysis.textReadability.tooSmallText > 0) score -= 15;
        if (device.isMobile && analysis.touchTargets.inadequateSize > 0) score -= 15;

        return score >= 70; // 70% threshold for success
    }

    generateLayoutDetails(analysis, success) {
        const issues = [];
        if (analysis.hasHorizontalOverflow) issues.push('horizontal overflow');
        if (!analysis.elements.header) issues.push('missing header');
        if (!analysis.elements.mainContent) issues.push('missing main content');
        if (analysis.textReadability.tooSmallText > 0) issues.push(`${analysis.textReadability.tooSmallText} small text elements`);
        if (analysis.touchTargets.inadequateSize > 0) issues.push(`${analysis.touchTargets.inadequateSize} small touch targets`);

        return success ? 
            `Layout adapted correctly (${analysis.viewport.width}x${analysis.viewport.height})` :
            `Layout issues: ${issues.join(', ')}`;
    }

    async testResponsiveBreakpoints() {
        console.log('\n📏 PHASE 2: Responsive Breakpoint Analysis');

        const breakpoints = [
            { name: 'Extra Small', width: 320, height: 568 },
            { name: 'Small Mobile', width: 375, height: 667 },
            { name: 'Large Mobile', width: 414, height: 896 },
            { name: 'Small Tablet', width: 768, height: 1024 },
            { name: 'Large Tablet', width: 1024, height: 1366 },
            { name: 'Small Desktop', width: 1280, height: 800 },
            { name: 'Large Desktop', width: 1920, height: 1080 },
            { name: 'Ultra Wide', width: 2560, height: 1440 }
        ];

        for (const breakpoint of breakpoints) {
            const breakpointTest = await this.testBreakpointBehavior(breakpoint);
            
            await this.recordResponsiveTestResult('layoutAdaptation', 
                `${breakpoint.name} Breakpoint`, 
                breakpointTest.success, 
                breakpointTest.details);

            this.responsiveMetrics.breakpoints.push({
                ...breakpoint,
                ...breakpointTest
            });
        }
    }

    async testBreakpointBehavior(breakpoint) {
        const page = await this.createTestPage();
        
        try {
            await page.setViewport({
                width: breakpoint.width,
                height: breakpoint.height
            });

            await this.testLogin(page, 'student', '/dashboard.html');
            await page.goto(`${this.apiUrl}/stories.html`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const breakpointAnalysis = await page.evaluate(() => {
                // Check CSS breakpoint behavior
                const styles = window.getComputedStyle(document.body);
                const containerElements = document.querySelectorAll('.container, .grid, .stories-grid');
                
                const containerBehavior = Array.from(containerElements).map(el => {
                    const computedStyle = window.getComputedStyle(el);
                    return {
                        display: computedStyle.display,
                        gridTemplateColumns: computedStyle.gridTemplateColumns,
                        flexDirection: computedStyle.flexDirection,
                        maxWidth: computedStyle.maxWidth,
                        padding: computedStyle.padding,
                        margin: computedStyle.margin
                    };
                });

                // Check navigation adaptation
                const nav = document.querySelector('nav, .navigation');
                const navAdaptation = nav ? {
                    display: window.getComputedStyle(nav).display,
                    flexDirection: window.getComputedStyle(nav).flexDirection,
                    position: window.getComputedStyle(nav).position
                } : null;

                // Check content flow
                const contentFlow = {
                    bodyOverflow: document.body.scrollWidth > window.innerWidth,
                    verticalScroll: document.body.scrollHeight > window.innerHeight,
                    visibleElements: document.querySelectorAll(':not([style*="display: none"])').length
                };

                return {
                    containerBehavior,
                    navAdaptation,
                    contentFlow
                };
            });

            const success = !breakpointAnalysis.contentFlow.bodyOverflow;
            
            await page.close();
            return {
                success,
                details: success ? 
                    `Breakpoint handled correctly at ${breakpoint.width}px` :
                    `Layout overflow at ${breakpoint.width}px`,
                analysis: breakpointAnalysis
            };

        } catch (error) {
            await page.close();
            return { 
                success: false, 
                details: error.message 
            };
        }
    }

    async testTouchInterfaceUsability() {
        console.log('\n👆 PHASE 3: Touch Interface Usability Testing');

        const mobileDevices = this.deviceProfiles.mobile.concat(this.deviceProfiles.tablet);
        
        for (const device of mobileDevices.slice(0, 3)) { // Test top 3 mobile devices
            const touchTest = await this.testTouchInteractions(device);
            
            await this.recordResponsiveTestResult('touchInterface', 
                `${device.name} Touch Usability`, 
                touchTest.success, 
                touchTest.details);
        }
    }

    async testTouchInteractions(device) {
        const page = await this.createTestPage();
        
        try {
            await page.setViewport({
                width: device.width,
                height: device.height,
                deviceScaleFactor: device.deviceScaleFactor,
                isMobile: device.isMobile
            });

            await this.testLogin(page, 'student', '/dashboard.html');
            await page.goto(`${this.apiUrl}/stories.html`);
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Test touch interactions
            const touchTest = await page.evaluate(async () => {
                const results = [];

                // Test tapping story cards
                const storyCards = document.querySelectorAll('.story-card');
                if (storyCards.length > 0) {
                    const card = storyCards[0];
                    const rect = card.getBoundingClientRect();
                    
                    // Simulate touch
                    const touchEvent = new TouchEvent('touchstart', {
                        touches: [{
                            clientX: rect.left + rect.width / 2,
                            clientY: rect.top + rect.height / 2
                        }]
                    });
                    
                    card.dispatchEvent(touchEvent);
                    results.push({ element: 'story-card', success: true });
                }

                // Test touch target sizes
                const interactiveElements = document.querySelectorAll('button, a, .favorite-btn, .clickable');
                let adequateTouchTargets = 0;
                interactiveElements.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width >= 44 && rect.height >= 44) {
                        adequateTouchTargets++;
                    }
                });

                results.push({
                    element: 'touch-targets',
                    total: interactiveElements.length,
                    adequate: adequateTouchTargets,
                    percentage: (adequateTouchTargets / interactiveElements.length) * 100
                });

                // Test swipe gestures (simulate)
                const container = document.querySelector('.stories-grid, .container');
                if (container) {
                    container.scrollLeft = 100; // Simulate horizontal scroll
                    results.push({ element: 'swipe-scroll', success: true });
                }

                return results;
            });

            const touchTargetPercentage = touchTest.find(t => t.element === 'touch-targets')?.percentage || 0;
            const success = touchTargetPercentage >= 80; // 80% of touch targets should be adequate

            await page.close();
            return {
                success,
                details: `${touchTargetPercentage.toFixed(1)}% adequate touch targets`,
                touchResults: touchTest
            };

        } catch (error) {
            await page.close();
            return { 
                success: false, 
                details: error.message 
            };
        }
    }

    async testNavigationAdaptation() {
        console.log('\n🧭 PHASE 4: Navigation Adaptation Testing');

        const testDevices = [
            this.deviceProfiles.mobile[0], // Mobile
            this.deviceProfiles.tablet[0], // Tablet  
            this.deviceProfiles.desktop[0] // Desktop
        ];

        for (const device of testDevices) {
            const navTest = await this.testNavigationOnDevice(device);
            
            await this.recordResponsiveTestResult('navigationUsability', 
                `${device.name} Navigation`, 
                navTest.success, 
                navTest.details);
        }
    }

    async testNavigationOnDevice(device) {
        const page = await this.createTestPage();
        
        try {
            await page.setViewport({
                width: device.width,
                height: device.height,
                deviceScaleFactor: device.deviceScaleFactor,
                isMobile: device.isMobile
            });

            await this.testLogin(page, 'student', '/dashboard.html');
            await new Promise(resolve => setTimeout(resolve, 2000));

            const navigationAnalysis = await page.evaluate(() => {
                const nav = document.querySelector('nav, .navigation, .nav-menu');
                if (!nav) return { hasNavigation: false };

                const navStyle = window.getComputedStyle(nav);
                const navLinks = nav.querySelectorAll('a, button, .nav-link');
                
                // Check if navigation is accessible
                const isVisible = navStyle.display !== 'none' && navStyle.visibility !== 'hidden';
                const isAccessible = nav.offsetHeight > 0 && nav.offsetWidth > 0;

                // Check navigation layout
                const navLayout = {
                    display: navStyle.display,
                    flexDirection: navStyle.flexDirection,
                    position: navStyle.position,
                    overflow: navStyle.overflow
                };

                // Check mobile menu behavior
                const hasMobileMenu = !!document.querySelector('.mobile-menu, .hamburger, [class*="menu-toggle"]');
                const hasOverflowMenu = navStyle.overflow === 'hidden' || navStyle.overflow === 'auto';

                // Check touch-friendly spacing
                let adequateSpacing = 0;
                navLinks.forEach(link => {
                    const rect = link.getBoundingClientRect();
                    if (rect.height >= 44) adequateSpacing++;
                });

                return {
                    hasNavigation: true,
                    isVisible,
                    isAccessible,
                    navLayout,
                    linkCount: navLinks.length,
                    adequateSpacing,
                    spacingPercentage: (adequateSpacing / navLinks.length) * 100,
                    hasMobileMenu,
                    hasOverflowMenu
                };
            });

            const success = navigationAnalysis.hasNavigation && 
                           navigationAnalysis.isVisible && 
                           navigationAnalysis.isAccessible &&
                           navigationAnalysis.spacingPercentage >= 80;

            await page.close();
            return {
                success,
                details: success ? 
                    `Navigation properly adapted (${navigationAnalysis.spacingPercentage.toFixed(1)}% adequate spacing)` :
                    `Navigation issues detected`,
                analysis: navigationAnalysis
            };

        } catch (error) {
            await page.close();
            return { 
                success: false, 
                details: error.message 
            };
        }
    }

    async testContentReadabilityAcrossDevices() {
        console.log('\n📖 PHASE 5: Content Readability Testing');

        const readabilityDevices = [
            this.deviceProfiles.mobile[0],
            this.deviceProfiles.tablet[0],
            this.deviceProfiles.desktop[0]
        ];

        for (const device of readabilityDevices) {
            const readabilityTest = await this.testContentReadability(device);
            
            await this.recordResponsiveTestResult('contentReadability', 
                `${device.name} Text Readability`, 
                readabilityTest.success, 
                readabilityTest.details);
        }
    }

    async testContentReadability(device) {
        const page = await this.createTestPage();
        
        try {
            await page.setViewport({
                width: device.width,
                height: device.height,
                deviceScaleFactor: device.deviceScaleFactor,
                isMobile: device.isMobile
            });

            await this.testLogin(page, 'student', '/dashboard.html');
            await page.goto(`${this.apiUrl}/stories.html`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const readabilityAnalysis = await page.evaluate(() => {
                const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, a, button');
                const readabilityData = {
                    totalElements: textElements.length,
                    fontSizes: {},
                    lineHeights: {},
                    colors: {},
                    readableElements: 0,
                    issueElements: []
                };

                textElements.forEach((el, index) => {
                    const styles = window.getComputedStyle(el);
                    const fontSize = parseInt(styles.fontSize);
                    const lineHeight = styles.lineHeight;
                    const color = styles.color;
                    const backgroundColor = styles.backgroundColor;

                    // Track font sizes
                    readabilityData.fontSizes[fontSize] = (readabilityData.fontSizes[fontSize] || 0) + 1;

                    // Check readability criteria
                    const isReadable = fontSize >= 14 && // Minimum font size
                                     el.textContent.trim().length > 0 && // Has content
                                     styles.visibility !== 'hidden' && // Is visible
                                     styles.display !== 'none'; // Is displayed

                    if (isReadable) {
                        readabilityData.readableElements++;
                    } else if (fontSize < 14 && el.textContent.trim().length > 0) {
                        readabilityData.issueElements.push({
                            tagName: el.tagName,
                            fontSize,
                            textContent: el.textContent.substring(0, 50)
                        });
                    }
                });

                // Calculate readability percentage
                readabilityData.readabilityPercentage = (readabilityData.readableElements / readabilityData.totalElements) * 100;

                // Check contrast (simplified)
                const bodyStyle = window.getComputedStyle(document.body);
                readabilityData.bodyContrast = {
                    color: bodyStyle.color,
                    backgroundColor: bodyStyle.backgroundColor
                };

                return readabilityData;
            });

            const success = readabilityAnalysis.readabilityPercentage >= 85;

            await page.close();
            return {
                success,
                details: `${readabilityAnalysis.readabilityPercentage.toFixed(1)}% readable elements (${readabilityAnalysis.issueElements.length} issues)`,
                analysis: readabilityAnalysis
            };

        } catch (error) {
            await page.close();
            return { 
                success: false, 
                details: error.message 
            };
        }
    }

    async testFormUsabilityOnMobile() {
        console.log('\n📝 PHASE 6: Mobile Form Usability Testing');

        const mobileDevice = this.deviceProfiles.mobile[0];
        const formTest = await this.testMobileFormUsability(mobileDevice);
        
        await this.recordResponsiveTestResult('formUsability', 
            'Mobile Form Usability', 
            formTest.success, 
            formTest.details);
    }

    async testMobileFormUsability(device) {
        const page = await this.createTestPage();
        
        try {
            await page.setViewport({
                width: device.width,
                height: device.height,
                deviceScaleFactor: device.deviceScaleFactor,
                isMobile: device.isMobile
            });

            await this.testLogin(page, 'student', '/dashboard.html');
            await page.goto(`${this.apiUrl}/add-story.html`);
            await new Promise(resolve => setTimeout(resolve, 3000));

            const formUsabilityAnalysis = await page.evaluate(() => {
                const forms = document.querySelectorAll('form');
                if (forms.length === 0) return { hasForms: false };

                const form = forms[0];
                const inputs = form.querySelectorAll('input, textarea, select');
                const buttons = form.querySelectorAll('button, [type="submit"]');
                
                let usabilityScore = 100;
                const issues = [];

                // Check input sizes
                inputs.forEach(input => {
                    const rect = input.getBoundingClientRect();
                    const styles = window.getComputedStyle(input);
                    
                    if (rect.height < 44) {
                        usabilityScore -= 10;
                        issues.push(`Input too small: ${rect.height}px height`);
                    }
                    
                    if (parseInt(styles.fontSize) < 16) {
                        usabilityScore -= 5;
                        issues.push(`Input font too small: ${styles.fontSize}`);
                    }
                });

                // Check button sizes
                buttons.forEach(button => {
                    const rect = button.getBoundingClientRect();
                    if (rect.height < 44 || rect.width < 44) {
                        usabilityScore -= 15;
                        issues.push(`Button too small: ${rect.width}x${rect.height}px`);
                    }
                });

                // Check form spacing
                const formRect = form.getBoundingClientRect();
                const formStyles = window.getComputedStyle(form);
                const padding = parseInt(formStyles.padding) || 0;
                
                if (padding < 16) {
                    usabilityScore -= 10;
                    issues.push(`Insufficient form padding: ${padding}px`);
                }

                return {
                    hasForms: true,
                    formCount: forms.length,
                    inputCount: inputs.length,
                    buttonCount: buttons.length,
                    usabilityScore: Math.max(0, usabilityScore),
                    issues
                };
            });

            const success = formUsabilityAnalysis.hasForms && formUsabilityAnalysis.usabilityScore >= 80;

            await page.close();
            return {
                success,
                details: success ? 
                    `Forms are mobile-friendly (score: ${formUsabilityAnalysis.usabilityScore})` :
                    `Form usability issues: ${formUsabilityAnalysis.issues.join(', ')}`,
                analysis: formUsabilityAnalysis
            };

        } catch (error) {
            await page.close();
            return { 
                success: false, 
                details: error.message 
            };
        }
    }

    async testImageAndMediaResponsiveness() {
        console.log('\n🖼️ PHASE 7: Image and Media Responsiveness Testing');

        const testDevice = this.deviceProfiles.mobile[0];
        const imageTest = await this.testImageResponsiveness(testDevice);
        
        await this.recordResponsiveTestResult('imageResponsiveness', 
            'Image Responsiveness', 
            imageTest.success, 
            imageTest.details);
    }

    async testImageResponsiveness(device) {
        const page = await this.createTestPage();
        
        try {
            await page.setViewport({
                width: device.width,
                height: device.height,
                deviceScaleFactor: device.deviceScaleFactor,
                isMobile: device.isMobile
            });

            await this.testLogin(page, 'student', '/dashboard.html');
            await page.goto(`${this.apiUrl}/index.html`); // Check background image
            await new Promise(resolve => setTimeout(resolve, 2000));

            const imageAnalysis = await page.evaluate(() => {
                const images = document.querySelectorAll('img');
                const backgroundElements = document.querySelectorAll('[style*="background-image"], .auth-container');
                
                let responsiveImages = 0;
                let overflowingImages = 0;
                
                images.forEach(img => {
                    const rect = img.getBoundingClientRect();
                    const naturalWidth = img.naturalWidth;
                    const displayWidth = rect.width;
                    
                    // Check if image scales appropriately
                    if (displayWidth <= window.innerWidth) {
                        responsiveImages++;
                    } else {
                        overflowingImages++;
                    }
                });

                // Check background images
                let responsiveBackgrounds = 0;
                backgroundElements.forEach(el => {
                    const styles = window.getComputedStyle(el);
                    const backgroundSize = styles.backgroundSize;
                    const backgroundPosition = styles.backgroundPosition;
                    
                    if (backgroundSize === 'cover' || backgroundSize === 'contain') {
                        responsiveBackgrounds++;
                    }
                });

                return {
                    totalImages: images.length,
                    responsiveImages,
                    overflowingImages,
                    backgroundElements: backgroundElements.length,
                    responsiveBackgrounds,
                    imageResponsivenessPercentage: images.length > 0 ? (responsiveImages / images.length) * 100 : 100
                };
            });

            const success = imageAnalysis.imageResponsivenessPercentage >= 90 && imageAnalysis.overflowingImages === 0;

            await page.close();
            return {
                success,
                details: `${imageAnalysis.imageResponsivenessPercentage.toFixed(1)}% responsive images, ${imageAnalysis.overflowingImages} overflowing`,
                analysis: imageAnalysis
            };

        } catch (error) {
            await page.close();
            return { 
                success: false, 
                details: error.message 
            };
        }
    }

    async testPerformanceAcrossDevices() {
        console.log('\n⚡ PHASE 8: Performance Across Different Devices');

        const performanceDevices = [
            this.deviceProfiles.mobile[0],
            this.deviceProfiles.tablet[0],
            this.deviceProfiles.desktop[0]
        ];

        for (const device of performanceDevices) {
            const performanceTest = await this.testDevicePerformance(device);
            
            await this.recordResponsiveTestResult('performanceOnMobile', 
                `${device.name} Performance`, 
                performanceTest.success, 
                performanceTest.details);

            this.responsiveMetrics.performance.push({
                device: device.name,
                ...performanceTest
            });
        }
    }

    async testDevicePerformance(device) {
        const page = await this.createTestPage();
        
        try {
            await page.setViewport({
                width: device.width,
                height: device.height,
                deviceScaleFactor: device.deviceScaleFactor,
                isMobile: device.isMobile
            });

            await this.testLogin(page, 'student', '/dashboard.html');

            const startTime = Date.now();
            await page.goto(`${this.apiUrl}/stories.html`);
            await page.waitForSelector('#storiesGrid', { timeout: 10000 });
            const loadTime = Date.now() - startTime;

            // Test scroll performance
            const scrollStartTime = Date.now();
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
                window.scrollTo(0, 0);
            });
            const scrollTime = Date.now() - scrollStartTime;

            // Mobile performance targets are more lenient
            const loadTarget = device.isMobile ? 5000 : 3000; // 5s for mobile, 3s for desktop
            const scrollTarget = device.isMobile ? 500 : 300;  // 500ms for mobile, 300ms for desktop

            const success = loadTime <= loadTarget && scrollTime <= scrollTarget;

            await page.close();
            return {
                success,
                details: `Load: ${loadTime}ms (target: ${loadTarget}ms), Scroll: ${scrollTime}ms`,
                metrics: { loadTime, scrollTime, loadTarget, scrollTarget }
            };

        } catch (error) {
            await page.close();
            return { 
                success: false, 
                details: error.message 
            };
        }
    }

    async testAccessibilityAcrossDevices() {
        console.log('\n♿ PHASE 9: Accessibility Across Devices');

        const accessibilityTest = await this.testAccessibilityFeatures();
        
        await this.recordResponsiveTestResult('contentReadability', 
            'Accessibility Features', 
            accessibilityTest.success, 
            accessibilityTest.details);
    }

    async testAccessibilityFeatures() {
        const page = await this.createTestPage();
        
        try {
            // Test on mobile viewport
            await page.setViewport({ width: 375, height: 667, isMobile: true });
            await this.testLogin(page, 'student', '/dashboard.html');
            await page.goto(`${this.apiUrl}/stories.html`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const accessibilityAnalysis = await page.evaluate(() => {
                // Check for alt text on images
                const images = document.querySelectorAll('img');
                let imagesWithAlt = 0;
                images.forEach(img => {
                    if (img.alt && img.alt.trim() !== '') imagesWithAlt++;
                });

                // Check for proper heading hierarchy
                const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                const headingStructure = Array.from(headings).map(h => h.tagName);

                // Check for focus indicators
                const focusableElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]');
                
                // Check for ARIA labels
                const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [role]');

                // Check color contrast (simplified)
                const bodyStyles = window.getComputedStyle(document.body);
                const hasHighContrast = bodyStyles.color !== bodyStyles.backgroundColor;

                return {
                    totalImages: images.length,
                    imagesWithAlt,
                    altTextPercentage: images.length > 0 ? (imagesWithAlt / images.length) * 100 : 100,
                    headingCount: headings.length,
                    headingStructure,
                    focusableElements: focusableElements.length,
                    elementsWithAria: elementsWithAria.length,
                    hasHighContrast
                };
            });

            const success = accessibilityAnalysis.altTextPercentage >= 80 && 
                           accessibilityAnalysis.headingCount > 0 &&
                           accessibilityAnalysis.hasHighContrast;

            await page.close();
            return {
                success,
                details: `${accessibilityAnalysis.altTextPercentage.toFixed(1)}% images have alt text, ${accessibilityAnalysis.headingCount} headings`,
                analysis: accessibilityAnalysis
            };

        } catch (error) {
            await page.close();
            return { 
                success: false, 
                details: error.message 
            };
        }
    }

    async testCrossBrowserResponsiveness() {
        console.log('\n🌐 PHASE 10: Cross-Browser Responsive Testing');

        // Note: Puppeteer uses Chromium, but we can test different user agents
        // and viewport behaviors to simulate different browsers
        const browserTests = [
            { name: 'Chrome Mobile', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1' },
            { name: 'Safari Mobile', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1' },
            { name: 'Edge Desktop', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59' }
        ];

        for (const browserTest of browserTests) {
            const compatibilityTest = await this.testBrowserCompatibility(browserTest);
            
            await this.recordResponsiveTestResult('crossBrowserCompatibility', 
                `${browserTest.name} Compatibility`, 
                compatibilityTest.success, 
                compatibilityTest.details);
        }
    }

    async testBrowserCompatibility(browserConfig) {
        const page = await this.createTestPage();
        
        try {
            await page.setUserAgent(browserConfig.userAgent);
            await page.setViewport({ width: 375, height: 667, isMobile: true });

            await this.testLogin(page, 'student', '/dashboard.html');
            await page.goto(`${this.apiUrl}/stories.html`);
            await new Promise(resolve => setTimeout(resolve, 3000));

            const compatibilityCheck = await page.evaluate(() => {
                // Check if core functionality works
                const hasStories = document.querySelectorAll('.story-card').length > 0;
                const hasNavigation = !!document.querySelector('nav, .navigation');
                const scriptsLoaded = typeof window.loadStories === 'function';
                const stylesApplied = window.getComputedStyle(document.body).fontSize !== '';

                // Check for JavaScript errors
                const noJSErrors = !document.body.textContent.includes('Error') &&
                                 !document.body.textContent.includes('undefined');

                return {
                    hasStories,
                    hasNavigation,
                    scriptsLoaded,
                    stylesApplied,
                    noJSErrors,
                    userAgent: navigator.userAgent
                };
            });

            const success = compatibilityCheck.hasStories && 
                           compatibilityCheck.hasNavigation && 
                           compatibilityCheck.scriptsLoaded && 
                           compatibilityCheck.noJSErrors;

            await page.close();
            return {
                success,
                details: success ? 
                    'Cross-browser compatibility confirmed' :
                    'Compatibility issues detected',
                analysis: compatibilityCheck
            };

        } catch (error) {
            await page.close();
            return { 
                success: false, 
                details: error.message 
            };
        }
    }

    async recordResponsiveTestResult(category, testName, success, details = '') {
        this.testResults.responsive.total++;
        this.testResults.responsive.categories[category].total = (this.testResults.responsive.categories[category].total || 0) + 1;
        
        if (success) {
            this.testResults.responsive.passed++;
            this.testResults.responsive.categories[category].passed++;
        } else {
            this.testResults.responsive.failed++;
            this.testResults.responsive.categories[category].failed++;
        }
        
        console.log(`   ${success ? '✅' : '❌'} ${testName}: ${details}`);
    }

    async generateResponsiveDesignReport() {
        const endTime = Date.now();
        const totalTime = endTime - this.startTime;
        
        const bugReport = this.bugTracker.generateReport();
        
        const successRate = this.testResults.responsive.total > 0 
            ? ((this.testResults.responsive.passed / this.testResults.responsive.total) * 100).toFixed(1)
            : 0;

        // Generate category success rates
        const categoryResults = {};
        for (const [category, data] of Object.entries(this.testResults.responsive.categories)) {
            const total = data.passed + data.failed;
            categoryResults[category] = {
                ...data,
                total,
                successRate: total > 0 ? ((data.passed / total) * 100).toFixed(1) : 0
            };
        }

        // Generate device compatibility matrix
        const deviceCompatibility = this.generateDeviceCompatibilityMatrix();

        const report = {
            metadata: {
                timestamp: new Date().toISOString(),
                duration: `${(totalTime / 1000).toFixed(1)}s`,
                testSuite: 'VidPOD Responsive Design Testing'
            },
            responsiveSummary: {
                totalTests: this.testResults.responsive.total,
                passed: this.testResults.responsive.passed,
                failed: this.testResults.responsive.failed,
                successRate: `${successRate}%`,
                devicesTestedCount: this.responsiveMetrics.devices.length,
                breakpointsTestedCount: this.responsiveMetrics.breakpoints.length
            },
            deviceCompatibility,
            categoryResults,
            detailedMetrics: this.responsiveMetrics,
            bugAnalysis: bugReport,
            recommendations: this.generateResponsiveRecommendations(successRate, categoryResults)
        };

        // Save detailed report
        await fs.writeFile(
            './responsive-design-test-report.json',
            JSON.stringify(report, null, 2)
        );

        console.log('\n📊 RESPONSIVE DESIGN TEST REPORT');
        console.log('=' .repeat(80));
        console.log(`📱 Responsive Success Rate: ${successRate}%`);
        console.log(`📋 Total Responsive Tests: ${this.testResults.responsive.total} (${this.testResults.responsive.passed} passed, ${this.testResults.responsive.failed} failed)`);
        console.log(`📱 Devices Tested: ${this.responsiveMetrics.devices.length}`);
        console.log(`📏 Breakpoints Tested: ${this.responsiveMetrics.breakpoints.length}`);
        
        console.log('\n📊 Responsive Category Performance:');
        for (const [category, data] of Object.entries(categoryResults)) {
            if (data.total > 0) {
                console.log(`   ${category}: ${data.successRate}% (${data.passed}/${data.total})`);
            }
        }

        console.log('\n📱 Device Type Compatibility:');
        Object.entries(deviceCompatibility).forEach(([deviceType, compatibility]) => {
            console.log(`   ${deviceType}: ${compatibility.successRate}% (${compatibility.passed}/${compatibility.total})`);
        });

        return report;
    }

    generateDeviceCompatibilityMatrix() {
        const deviceTypes = ['mobile', 'tablet', 'desktop'];
        const matrix = {};

        deviceTypes.forEach(deviceType => {
            const deviceTests = this.responsiveMetrics.devices.filter(d => d.deviceType === deviceType);
            const passed = deviceTests.filter(d => d.success).length;
            const total = deviceTests.length;

            matrix[deviceType] = {
                passed,
                failed: total - passed,
                total,
                successRate: total > 0 ? ((passed / total) * 100).toFixed(1) : 0
            };
        });

        return matrix;
    }

    generateResponsiveRecommendations(successRate, categoryResults) {
        const recommendations = [];

        if (successRate < 90) {
            recommendations.push('📱 Responsive design improvements needed - target 95%+ compatibility');
        }

        if (categoryResults.layoutAdaptation.successRate < 85) {
            recommendations.push('📐 Layout adaptation issues - review CSS grid and flexbox implementation');
        }

        if (categoryResults.touchInterface.successRate < 85) {
            recommendations.push('👆 Touch interface improvements needed - increase touch target sizes');
        }

        if (categoryResults.navigationUsability.successRate < 85) {
            recommendations.push('🧭 Navigation adaptation required - implement mobile-first navigation');
        }

        if (categoryResults.contentReadability.successRate < 85) {
            recommendations.push('📖 Content readability issues - review typography and spacing');
        }

        if (categoryResults.formUsability.successRate < 85) {
            recommendations.push('📝 Form usability improvements needed - optimize for mobile input');
        }

        if (categoryResults.performanceOnMobile.successRate < 80) {
            recommendations.push('⚡ Mobile performance optimization required - reduce load times');
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ Excellent responsive design! Consider progressive web app features');
        }

        return recommendations;
    }
}

// Export for use in other test files
module.exports = { ResponsiveDesignTest };

// Run if called directly
if (require.main === module) {
    const responsiveTest = new ResponsiveDesignTest();
    responsiveTest.runResponsiveDesignTest().catch(console.error);
}