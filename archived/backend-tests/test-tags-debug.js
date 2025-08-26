/**
 * DEBUG: Tag display issues investigation
 */

const puppeteer = require('puppeteer');

async function debugTagsIssue() {
    console.log('🏷️  DEBUGGING: Tag display issues');
    console.log('='.repeat(50));
    
    let browser;
    let page;
    
    try {
        browser = await puppeteer.launch({ headless: false, slowMo: 100 });
        page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });
        
        // Login
        console.log('🔐 Logging in...');
        await page.goto('https://podcast-stories-production.up.railway.app/index.html', { 
            waitUntil: 'networkidle0' 
        });
        
        const emailInput = await page.$('input[type="email"]');
        const usernameInput = await page.$('input[type="text"]');
        
        if (emailInput) {
            await page.type('input[type="email"]', 'admin@vidpod.com');
        } else if (usernameInput) {
            await page.type('input[type="text"]', 'admin');
        }
        
        await page.type('input[type="password"]', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        // Go to stories page
        console.log('📖 Loading stories page...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html', { 
            waitUntil: 'networkidle0' 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Debug tag data
        const tagAnalysis = await page.evaluate(() => {
            // Get story data from JavaScript
            const stories = window.allStories || window.filteredStories || [];
            const tags = window.allTags || [];
            
            // Analyze first few stories
            const sampleStories = stories.slice(0, 5).map(story => ({
                id: story.id,
                title: story.idea_title || story.title,
                tags: story.tags,
                tagType: typeof story.tags,
                tagLength: Array.isArray(story.tags) ? story.tags.length : 'not array'
            }));
            
            // Check DOM tag display
            const storyCards = Array.from(document.querySelectorAll('.story-card')).slice(0, 5);
            const domTagInfo = storyCards.map((card, index) => {
                const tagElements = card.querySelectorAll('.story-tags .tag');
                const tagTexts = Array.from(tagElements).map(el => el.textContent);
                const storyId = card.getAttribute('data-story-id');
                
                return {
                    cardIndex: index,
                    storyId: storyId,
                    tagElements: tagElements.length,
                    tagTexts: tagTexts,
                    rawHTML: card.querySelector('.story-tags')?.innerHTML || 'No tags section'
                };
            });
            
            return {
                totalStories: stories.length,
                totalTags: tags.length,
                sampleTags: tags.slice(0, 5),
                sampleStories: sampleStories,
                domTagInfo: domTagInfo,
                jsVariables: {
                    allStories: typeof window.allStories,
                    allTags: typeof window.allTags,
                    filteredStories: typeof window.filteredStories
                }
            };
        });
        
        console.log('📊 Tag Analysis Results:');
        console.log(`   Total stories: ${tagAnalysis.totalStories}`);
        console.log(`   Total tags: ${tagAnalysis.totalTags}`);
        console.log(`   JS variables: ${JSON.stringify(tagAnalysis.jsVariables)}`);
        
        console.log('\n🏷️  Available tags:');
        tagAnalysis.sampleTags.forEach((tag, i) => {
            console.log(`   ${i + 1}. ${tag.tag_name || tag.name || JSON.stringify(tag)}`);
        });
        
        console.log('\n📚 Sample stories with tags:');
        tagAnalysis.sampleStories.forEach((story, i) => {
            console.log(`   ${i + 1}. "${story.title}"`);
            console.log(`      Tags: ${JSON.stringify(story.tags)} (${story.tagType})`);
        });
        
        console.log('\n🎨 DOM tag display:');
        tagAnalysis.domTagInfo.forEach((info, i) => {
            console.log(`   Card ${i + 1} (Story ID: ${info.storyId}):`);
            console.log(`      Tag elements: ${info.tagElements}`);
            console.log(`      Tag texts: ${JSON.stringify(info.tagTexts)}`);
            console.log(`      HTML: ${info.rawHTML.substring(0, 200)}...`);
        });
        
        // Test the API directly
        console.log('\n🌐 Testing stories API directly...');
        
        const apiTest = await page.evaluate(async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('https://podcast-stories-production.up.railway.app/api/stories', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const stories = await response.json();
                    const sampleStory = stories[0];
                    
                    return {
                        success: true,
                        totalCount: stories.length,
                        sampleStory: {
                            id: sampleStory?.id,
                            title: sampleStory?.idea_title,
                            tags: sampleStory?.tags,
                            rawStory: JSON.stringify(sampleStory).substring(0, 500)
                        }
                    };
                } else {
                    return { success: false, error: response.status };
                }
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        console.log('\n📡 API Test Results:');
        if (apiTest.success) {
            console.log(`   Stories from API: ${apiTest.totalCount}`);
            console.log(`   Sample story tags: ${JSON.stringify(apiTest.sampleStory.tags)}`);
            console.log(`   Raw sample: ${apiTest.sampleStory.rawStory}...`);
        } else {
            console.log(`   API Error: ${apiTest.error}`);
        }
        
        // Keep browser open for inspection
        await new Promise(resolve => setTimeout(resolve, 5000));
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

debugTagsIssue().catch(console.error);