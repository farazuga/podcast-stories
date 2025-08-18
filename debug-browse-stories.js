const puppeteer = require('puppeteer');

async function debugBrowseStories() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    console.log('🔍 Debugging Admin Browse Stories Functionality...\n');
    
    try {
        // Login as admin
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'rumi&amaml');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('✅ Logged in as admin');
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('🔍 Looking for Browse Stories button...');
        
        // Find the browse stories button
        const browseStoriesButton = await page.evaluate(() => {
            // Look for different possible selectors
            const buttons = document.querySelectorAll('button, a, .btn');
            const browseButton = Array.from(buttons).find(btn => 
                btn.textContent.toLowerCase().includes('browse stories') ||
                btn.textContent.toLowerCase().includes('browse') ||
                btn.getAttribute('onclick')?.includes('stories') ||
                btn.href?.includes('stories')
            );
            
            if (browseButton) {
                return {
                    found: true,
                    text: browseButton.textContent,
                    tag: browseButton.tagName,
                    onclick: browseButton.getAttribute('onclick'),
                    href: browseButton.href,
                    id: browseButton.id,
                    className: browseButton.className
                };
            }
            
            return { found: false };
        });
        
        if (browseStoriesButton.found) {
            console.log('✅ Browse Stories button found:');
            console.log(`   Text: "${browseStoriesButton.text}"`);
            console.log(`   Tag: ${browseStoriesButton.tag}`);
            console.log(`   Onclick: ${browseStoriesButton.onclick}`);
            console.log(`   Href: ${browseStoriesButton.href}`);
            console.log(`   ID: ${browseStoriesButton.id}`);
            console.log(`   Classes: ${browseStoriesButton.className}`);
            
            // Click the button and monitor what happens
            console.log('\n🖱️ Clicking Browse Stories button...');
            
            // Set up navigation listener
            let navigationOccurred = false;
            page.on('framenavigated', () => {
                navigationOccurred = true;
            });
            
            // Set up console monitoring
            const consoleMessages = [];
            page.on('console', msg => {
                consoleMessages.push(`${msg.type()}: ${msg.text()}`);
            });
            
            // Set up error monitoring
            const errors = [];
            page.on('pageerror', error => {
                errors.push(error.message);
            });
            
            // Click the button
            if (browseStoriesButton.onclick) {
                // Execute onclick function
                await page.evaluate((onclick) => {
                    eval(onclick);
                }, browseStoriesButton.onclick);
            } else if (browseStoriesButton.href) {
                // Navigate to href
                await page.goto(browseStoriesButton.href);
                navigationOccurred = true;
            } else {
                // Try to click the element
                await page.evaluate(() => {
                    const buttons = document.querySelectorAll('button, a, .btn');
                    const browseButton = Array.from(buttons).find(btn => 
                        btn.textContent.toLowerCase().includes('browse stories') ||
                        btn.textContent.toLowerCase().includes('browse')
                    );
                    if (browseButton) {
                        browseButton.click();
                    }
                });
            }
            
            // Wait for potential changes
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log('\n📊 Post-click Analysis:');
            console.log(`Navigation occurred: ${navigationOccurred}`);
            console.log(`Current URL: ${page.url()}`);
            
            if (consoleMessages.length > 0) {
                console.log('Console messages:');
                consoleMessages.forEach(msg => console.log(`  ${msg}`));
            }
            
            if (errors.length > 0) {
                console.log('JavaScript errors:');
                errors.forEach(err => console.log(`  ${err}`));
            }
            
            // Check current page content
            const pageAnalysis = await page.evaluate(() => {
                const title = document.title;
                const url = window.location.href;
                
                // Look for stories content
                const storyElements = document.querySelectorAll('[data-story-id], .story-card, .story-item, #storiesContainer, #story-grid');
                const loadingElements = document.querySelectorAll('.loading, .spinner, [id*="loading"]');
                const errorElements = document.querySelectorAll('.error, .error-message, [class*="error"]');
                
                // Check if we're on stories page
                const isStoriesPage = url.includes('stories.html') || title.includes('Stories');
                
                return {
                    title,
                    url,
                    isStoriesPage,
                    storyElementsFound: storyElements.length,
                    loadingElementsFound: loadingElements.length,
                    errorElementsFound: errorElements.length,
                    bodyHTML: document.body.innerHTML.substring(0, 500) + '...'
                };
            });
            
            console.log('\n📄 Current Page State:');
            console.log(`Title: ${pageAnalysis.title}`);
            console.log(`URL: ${pageAnalysis.url}`);
            console.log(`Is Stories Page: ${pageAnalysis.isStoriesPage}`);
            console.log(`Story elements found: ${pageAnalysis.storyElementsFound}`);
            console.log(`Loading elements found: ${pageAnalysis.loadingElementsFound}`);
            console.log(`Error elements found: ${pageAnalysis.errorElementsFound}`);
            
            if (pageAnalysis.isStoriesPage) {
                console.log('\n✅ Successfully navigated to stories page');
                
                // Check if stories are loading
                if (pageAnalysis.storyElementsFound === 0) {
                    console.log('⚠️ No story elements found on stories page');
                    
                    // Try to trigger story loading
                    console.log('🔄 Attempting to trigger story loading...');
                    
                    const storyLoadResult = await page.evaluate(() => {
                        // Try different story loading functions
                        const loadFunctions = [
                            'loadStories',
                            'loadStoriesGrid', 
                            'fetchStories',
                            'displayStories',
                            'initStories'
                        ];
                        
                        const results = {};
                        loadFunctions.forEach(func => {
                            if (typeof window[func] === 'function') {
                                try {
                                    window[func]();
                                    results[func] = 'called successfully';
                                } catch (error) {
                                    results[func] = `error: ${error.message}`;
                                }
                            } else {
                                results[func] = 'function not found';
                            }
                        });
                        
                        return results;
                    });
                    
                    console.log('Story loading attempts:');
                    Object.entries(storyLoadResult).forEach(([func, result]) => {
                        console.log(`  ${func}: ${result}`);
                    });
                    
                    // Wait and check again
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    const finalCheck = await page.evaluate(() => {
                        const storyElements = document.querySelectorAll('[data-story-id], .story-card, .story-item');
                        return {
                            storyCount: storyElements.length,
                            storyHTML: storyElements.length > 0 ? 
                                Array.from(storyElements).slice(0, 2).map(el => el.outerHTML.substring(0, 200)).join('\n') :
                                'No stories found'
                        };
                    });
                    
                    console.log(`\nFinal story count: ${finalCheck.storyCount}`);
                    if (finalCheck.storyCount > 0) {
                        console.log('✅ Stories loaded successfully!');
                    } else {
                        console.log('❌ Stories still not loading');
                        console.log('Sample HTML:', finalCheck.storyHTML);
                    }
                }
            } else {
                console.log('❌ Did not navigate to stories page');
                console.log('Current page body preview:', pageAnalysis.bodyHTML);
            }
            
        } else {
            console.log('❌ Browse Stories button not found');
            
            // List all buttons/links on the page
            const allButtons = await page.evaluate(() => {
                const buttons = document.querySelectorAll('button, a, .btn');
                return Array.from(buttons).map(btn => ({
                    text: btn.textContent.trim(),
                    tag: btn.tagName,
                    href: btn.href,
                    onclick: btn.getAttribute('onclick'),
                    id: btn.id,
                    className: btn.className
                })).filter(btn => btn.text.length > 0);
            });
            
            console.log('\n📋 All available buttons/links:');
            allButtons.forEach((btn, index) => {
                console.log(`${index + 1}. "${btn.text}" (${btn.tag})`);
                if (btn.href) console.log(`   href: ${btn.href}`);
                if (btn.onclick) console.log(`   onclick: ${btn.onclick}`);
                if (btn.id) console.log(`   id: ${btn.id}`);
                if (btn.className) console.log(`   class: ${btn.className}`);
                console.log('');
            });
        }
        
        console.log('\n🔍 Browser staying open for manual inspection...');
        
        // Keep browser open for manual inspection
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

debugBrowseStories().catch(console.error);