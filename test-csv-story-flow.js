const puppeteer = require('puppeteer');
const path = require('path');

async function testCSVStoryFlow() {
    console.log('🧪 Testing CSV Import and Story Viewing Flow');
    console.log('===========================================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 50,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('❌ Browser Error:', msg.text());
            } else if (msg.type() === 'warning') {
                console.warn('⚠️ Browser Warning:', msg.text());
            }
        });
        
        // Set viewport
        await page.setViewport({ width: 1400, height: 900 });
        
        console.log('1️⃣ Logging in as admin...\n');
        await page.goto('https://podcast-stories-production.up.railway.app/', { 
            waitUntil: 'networkidle2' 
        });
        
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        // Navigate to stories page
        console.log('2️⃣ Navigating to Browse Stories...\n');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html', {
            waitUntil: 'networkidle2'
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if stories loaded
        const storiesCheck = await page.evaluate(() => {
            const storyCards = document.querySelectorAll('.story-card');
            const firstStory = storyCards[0];
            
            if (firstStory) {
                const title = firstStory.querySelector('h3')?.textContent;
                const description = firstStory.querySelector('.story-description')?.textContent;
                const tags = Array.from(firstStory.querySelectorAll('.tag')).map(t => t.textContent);
                const storyId = firstStory.dataset.storyId || firstStory.getAttribute('onclick')?.match(/\d+/)?.[0];
                
                return {
                    found: true,
                    count: storyCards.length,
                    firstStory: {
                        title,
                        description,
                        tags,
                        id: storyId
                    }
                };
            }
            
            return { found: false, count: 0 };
        });
        
        console.log('📚 Stories Check:');
        console.log(`  Stories Found: ${storiesCheck.found ? '✅' : '❌'}`);
        console.log(`  Total Stories: ${storiesCheck.count}`);
        if (storiesCheck.firstStory) {
            console.log(`  First Story:`);
            console.log(`    Title: ${storiesCheck.firstStory.title}`);
            console.log(`    Description: ${storiesCheck.firstStory.description?.substring(0, 50)}...`);
            console.log(`    Tags: ${storiesCheck.firstStory.tags.join(', ')}`);
            console.log(`    ID: ${storiesCheck.firstStory.id}\n`);
        }
        
        // Click on first story
        if (storiesCheck.found && storiesCheck.firstStory.id) {
            console.log('3️⃣ Clicking on first story to view details...\n');
            
            await page.evaluate((storyId) => {
                const firstCard = document.querySelector('.story-card');
                if (firstCard) {
                    // Try to find and click the link or card
                    const link = firstCard.querySelector('a');
                    if (link) {
                        link.click();
                    } else {
                        window.location.href = `/story-detail.html?id=${storyId}`;
                    }
                }
            }, storiesCheck.firstStory.id);
            
            // Wait for navigation or error
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check current page
            const currentUrl = page.url();
            console.log(`  Current URL: ${currentUrl}`);
            
            // Check if we're still logged in
            const isLoggedIn = await page.evaluate(() => {
                return !!localStorage.getItem('token');
            });
            
            console.log(`  Still Logged In: ${isLoggedIn ? '✅' : '❌'}\n`);
            
            // Check story detail page
            if (currentUrl.includes('story-detail')) {
                const storyDetailCheck = await page.evaluate(() => {
                    const title = document.getElementById('storyTitle')?.textContent;
                    const description = document.getElementById('storyDescription')?.textContent;
                    const tags = Array.from(document.querySelectorAll('#storyTags .tag')).map(t => t.textContent);
                    const questions = Array.from(document.querySelectorAll('.question-text')).map(q => q.textContent);
                    const interviewees = Array.from(document.querySelectorAll('.person-title')).map(p => p.textContent);
                    const errorMessage = document.querySelector('.story-detail-card h2')?.textContent;
                    
                    return {
                        title,
                        description,
                        tags,
                        questions: questions.length,
                        interviewees,
                        hasError: errorMessage?.includes('Error') || errorMessage?.includes('Not Found'),
                        errorMessage
                    };
                });
                
                console.log('4️⃣ Story Detail Page Check:');
                if (storyDetailCheck.hasError) {
                    console.log(`  ❌ Error: ${storyDetailCheck.errorMessage}`);
                } else {
                    console.log(`  Title: ${storyDetailCheck.title ? '✅' : '❌'} ${storyDetailCheck.title || 'Missing'}`);
                    console.log(`  Description: ${storyDetailCheck.description ? '✅' : '❌'} ${storyDetailCheck.description?.substring(0, 50) || 'Missing'}...`);
                    console.log(`  Tags: ${storyDetailCheck.tags.length > 0 ? '✅' : '❌'} ${storyDetailCheck.tags.join(', ') || 'None'}`);
                    console.log(`  Questions: ${storyDetailCheck.questions > 0 ? '✅' : '❌'} ${storyDetailCheck.questions} questions`);
                    console.log(`  Interviewees: ${storyDetailCheck.interviewees.length > 0 ? '✅' : '❌'} ${storyDetailCheck.interviewees.join(', ') || 'None'}`);
                }
            } else if (currentUrl.includes('index.html') || currentUrl.includes('login')) {
                console.log('❌ ERROR: User was logged out!');
                console.log('   This should not happen when viewing stories.');
            }
        }
        
        // Take final screenshot
        await page.screenshot({ path: 'story-detail-test.png', fullPage: true });
        console.log('\n📸 Screenshot saved: story-detail-test.png');
        
    } catch (error) {
        console.error('🚨 Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testCSVStoryFlow().catch(console.error);