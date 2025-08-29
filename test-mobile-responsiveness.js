/**
 * VidPOD Rundown System - Mobile Responsiveness Test
 * Phase 4: Mobile and tablet compatibility validation
 */

const puppeteer = require('puppeteer');

class MobileResponsivenessTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'https://podcast-stories-production.up.railway.app';
        this.results = [];
    }

    async init() {
        this.browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async testViewport(device, dimensions) {
        console.log(`📱 Testing ${device.name} (${dimensions.width}x${dimensions.height})`);
        
        await this.page.setViewport(dimensions);
        await this.page.goto(`${this.baseUrl}/rundowns.html`);
        
        // Wait for page to load
        try {
            await this.page.waitForSelector('body', { timeout: 10000 });
        } catch (error) {
            return {
                device: device.name,
                accessible: false,
                error: 'Page failed to load'
            };
        }

        // Test responsive elements
        const responsiveTest = await this.page.evaluate(() => {
            const results = {
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                navigation: {
                    visible: false,
                    hamburger: false
                },
                content: {
                    scrollable: document.body.scrollHeight > window.innerHeight,
                    overflowHidden: false
                },
                grid: {
                    responsive: false,
                    columns: 0
                }
            };

            // Check navigation
            const nav = document.querySelector('nav, .navigation');
            if (nav) {
                results.navigation.visible = nav.offsetParent !== null;
            }

            // Check for hamburger menu
            const hamburger = document.querySelector('.hamburger, .menu-toggle, .nav-toggle');
            if (hamburger) {
                results.navigation.hamburger = hamburger.offsetParent !== null;
            }

            // Check grid responsiveness
            const grid = document.querySelector('#rundownsGrid, .rundowns-grid');
            if (grid) {
                const computedStyle = window.getComputedStyle(grid);
                results.grid.responsive = computedStyle.display === 'grid' || computedStyle.display === 'flex';
                
                // Try to count columns
                if (computedStyle.gridTemplateColumns) {
                    results.grid.columns = computedStyle.gridTemplateColumns.split(' ').length;
                }
            }

            // Check for horizontal overflow
            results.content.overflowHidden = document.body.scrollWidth > window.innerWidth;

            return results;
        });

        const result = {
            device: device.name,
            dimensions,
            accessible: true,
            ...responsiveTest
        };

        // Assess mobile-friendliness
        result.mobileReady = this.assessMobileFriendliness(result, device);
        
        console.log(`   ${result.mobileReady ? '✅' : '❌'} Mobile Ready: ${result.mobileReady}`);
        console.log(`   📐 Grid: ${result.grid.responsive ? 'Responsive' : 'Not responsive'}`);
        console.log(`   🍔 Navigation: ${result.navigation.hamburger ? 'Has hamburger menu' : 'No hamburger menu'}`);
        console.log(`   📱 Overflow: ${result.content.overflowHidden ? 'Has horizontal overflow' : 'No horizontal overflow'}`);
        console.log('');

        return result;
    }

    assessMobileFriendliness(result, device) {
        const issues = [];

        // Check for horizontal overflow
        if (result.content.overflowHidden) {
            issues.push('Horizontal overflow detected');
        }

        // Check navigation on mobile
        if (device.mobile && !result.navigation.hamburger) {
            issues.push('No hamburger menu on mobile device');
        }

        // Check grid responsiveness
        if (!result.grid.responsive) {
            issues.push('Grid layout not responsive');
        }

        return issues.length === 0;
    }

    async runResponsivenessTests() {
        console.log('📱 VidPOD Rundown System - Mobile Responsiveness Testing\n');
        console.log(`🌐 Testing against: ${this.baseUrl}\n`);

        await this.init();

        const testDevices = [
            {
                name: 'iPhone SE',
                mobile: true,
                dimensions: { width: 375, height: 667 }
            },
            {
                name: 'iPhone 12 Pro',
                mobile: true,
                dimensions: { width: 390, height: 844 }
            },
            {
                name: 'iPad',
                mobile: false,
                tablet: true,
                dimensions: { width: 768, height: 1024 }
            },
            {
                name: 'iPad Pro',
                mobile: false,
                tablet: true,
                dimensions: { width: 1024, height: 1366 }
            },
            {
                name: 'Android Phone',
                mobile: true,
                dimensions: { width: 360, height: 640 }
            },
            {
                name: 'Desktop',
                mobile: false,
                dimensions: { width: 1280, height: 720 }
            }
        ];

        for (const device of testDevices) {
            try {
                const result = await this.testViewport(device, device.dimensions);
                this.results.push(result);
            } catch (error) {
                console.error(`❌ Error testing ${device.name}:`, error.message);
                this.results.push({
                    device: device.name,
                    accessible: false,
                    error: error.message
                });
            }
        }

        await this.cleanup();
        this.generateMobileReport();
    }

    generateMobileReport() {
        console.log('\n' + '='.repeat(70));
        console.log('📱 MOBILE RESPONSIVENESS TEST REPORT');
        console.log('='.repeat(70));

        const accessible = this.results.filter(r => r.accessible).length;
        const mobileReady = this.results.filter(r => r.mobileReady).length;
        const total = this.results.length;

        console.log(`📊 Devices Tested: ${total}`);
        console.log(`✅ Accessible: ${accessible}/${total} (${((accessible/total)*100).toFixed(1)}%)`);
        console.log(`📱 Mobile Ready: ${mobileReady}/${total} (${((mobileReady/total)*100).toFixed(1)}%)`);
        console.log('');

        // Device-specific results
        console.log('📱 DEVICE TEST RESULTS:');
        this.results.forEach(result => {
            const status = result.accessible ? 
                (result.mobileReady ? '✅ Ready' : '⚠️  Issues') : 
                '❌ Failed';
            console.log(`   ${result.device}: ${status}`);
            
            if (result.error) {
                console.log(`      Error: ${result.error}`);
            }
        });
        console.log('');

        // Mobile-specific analysis
        const mobileDevices = this.results.filter(r => r.accessible && (r.device.includes('iPhone') || r.device.includes('Android')));
        const tabletDevices = this.results.filter(r => r.accessible && r.device.includes('iPad'));

        console.log('📱 MOBILE ANALYSIS:');
        if (mobileDevices.length > 0) {
            const mobileReady = mobileDevices.filter(d => d.mobileReady).length;
            console.log(`   Mobile Ready: ${mobileReady}/${mobileDevices.length} devices`);
            
            const hasHamburger = mobileDevices.filter(d => d.navigation?.hamburger).length;
            console.log(`   Hamburger Menu: ${hasHamburger}/${mobileDevices.length} devices`);
            
            const noOverflow = mobileDevices.filter(d => !d.content?.overflowHidden).length;
            console.log(`   No Horizontal Overflow: ${noOverflow}/${mobileDevices.length} devices`);
        } else {
            console.log('   ❌ No mobile devices successfully tested');
        }
        console.log('');

        console.log('📟 TABLET ANALYSIS:');
        if (tabletDevices.length > 0) {
            const tabletReady = tabletDevices.filter(d => d.mobileReady).length;
            console.log(`   Tablet Ready: ${tabletReady}/${tabletDevices.length} devices`);
            
            const responsiveGrid = tabletDevices.filter(d => d.grid?.responsive).length;
            console.log(`   Responsive Grid: ${responsiveGrid}/${tabletDevices.length} devices`);
        } else {
            console.log('   ❌ No tablet devices successfully tested');
        }
        console.log('');

        // Overall assessment
        console.log('🎯 MOBILE READINESS ASSESSMENT:');
        const mobileReadyPercentage = (mobileReady / total) * 100;
        
        if (mobileReadyPercentage >= 80) {
            console.log('   🟢 MOBILE READY');
            console.log('   ✅ Good mobile responsiveness across devices');
            console.log('   📱 Suitable for mobile deployment');
        } else if (mobileReadyPercentage >= 60) {
            console.log('   🟡 PARTIALLY MOBILE READY');
            console.log('   ⚠️  Some mobile responsiveness issues');
            console.log('   🔧 Minor mobile improvements recommended');
        } else {
            console.log('   🔴 NOT MOBILE READY');
            console.log('   ❌ Significant mobile responsiveness issues');
            console.log('   📱 Mobile optimization required');
        }

        console.log('');
        console.log('📋 RECOMMENDATIONS:');
        if (mobileReadyPercentage < 80) {
            console.log('   🔧 Implement hamburger navigation for mobile devices');
            console.log('   📐 Improve grid responsiveness');
            console.log('   📱 Fix horizontal overflow issues');
            console.log('   🧪 Test on additional device sizes');
        } else {
            console.log('   ✅ Mobile responsiveness is good');
            console.log('   🔍 Consider testing on additional devices');
            console.log('   🎨 Fine-tune mobile user experience');
        }

        console.log('');
        console.log('📅 Mobile test completed:', new Date().toISOString());
        console.log('='.repeat(70));
    }
}

// Run mobile responsiveness tests
if (require.main === module) {
    const tester = new MobileResponsivenessTest();
    tester.runResponsivenessTests().catch(console.error);
}

module.exports = MobileResponsivenessTest;