/**
 * Browser Date Formatting Test
 * Test how dates are being formatted in the actual browser environment
 */

import puppeteer from 'puppeteer';

const TEST_URL = 'https://podcast-stories-production.up.railway.app';

console.log('=== Browser Date Formatting Test ===\n');

class BrowserDateFormatTester {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async runTest() {
    try {
      console.log('🚀 Starting browser...');
      this.browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1280, height: 720 }
      });
      this.page = await this.browser.newPage();
      
      // Enable console logging
      this.page.on('console', msg => {
        console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
      });

      // Login first
      await this.login();
      
      // Test date formatting directly
      await this.testDateFormattingFunctions();
      
      // Fetch actual story data and test formatting
      await this.testActualStoryDates();

      console.log('\n🎉 Browser date formatting test completed');

    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  async login() {
    console.log('→ Logging in...');
    await this.page.goto(`${TEST_URL}/`, { waitUntil: 'networkidle0' });
    await this.page.type('#email', 'admin@vidpod.com');
    await this.page.type('#password', 'vidpod');
    await this.page.click('button[type="submit"]');
    await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('✅ Logged in');
  }

  async testDateFormattingFunctions() {
    console.log('\n🔧 Testing Date Formatting Functions');
    console.log('====================================');

    const formatTest = await this.page.evaluate(() => {
      const testDates = ['1954-03-05', '2024-04-01'];
      const results = {
        browserInfo: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timezoneOffset: new Date().getTimezoneOffset(),
          locale: navigator.language
        },
        tests: []
      };

      testDates.forEach(dateStr => {
        const test = {
          input: dateStr,
          formatDateSafeAvailable: typeof window.formatDateSafe === 'function',
          formatDateSafeResult: null,
          newDateObject: null,
          toLocaleDateString: null,
          manualFormat: null,
          jsIssues: []
        };

        // Test formatDateSafe if available
        if (typeof window.formatDateSafe === 'function') {
          try {
            test.formatDateSafeResult = window.formatDateSafe(dateStr);
          } catch (error) {
            test.jsIssues.push('formatDateSafe error: ' + error.message);
          }
        }

        // Test standard Date object
        try {
          const date = new Date(dateStr);
          test.newDateObject = {
            toString: date.toString(),
            toISOString: date.toISOString(),
            getFullYear: date.getFullYear(),
            getMonth: date.getMonth() + 1,
            getDate: date.getDate(),
            getTimezoneOffset: date.getTimezoneOffset()
          };
          test.toLocaleDateString = date.toLocaleDateString();
        } catch (error) {
          test.jsIssues.push('Date object error: ' + error.message);
        }

        // Test manual formatting (safe approach)
        try {
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            const year = parts[0];
            const month = parts[1].padStart(2, '0');
            const day = parts[2].padStart(2, '0');
            test.manualFormat = `${month}/${day}/${year}`;
          }
        } catch (error) {
          test.jsIssues.push('Manual format error: ' + error.message);
        }

        results.tests.push(test);
      });

      return results;
    });

    console.log('Browser Environment:');
    console.log(`  Timezone: ${formatTest.browserInfo.timezone}`);
    console.log(`  Timezone Offset: ${formatTest.browserInfo.timezoneOffset} minutes`);
    console.log(`  Locale: ${formatTest.browserInfo.locale}`);

    formatTest.tests.forEach((test, index) => {
      console.log(`\nTest ${index + 1}: "${test.input}"`);
      console.log(`  formatDateSafe available: ${test.formatDateSafeAvailable}`);
      console.log(`  formatDateSafe result: ${test.formatDateSafeResult}`);
      console.log(`  Manual format result: ${test.manualFormat}`);
      console.log(`  Date.toLocaleDateString(): ${test.toLocaleDateString}`);
      console.log(`  Date object components:`, test.newDateObject);
      
      if (test.jsIssues.length > 0) {
        console.log(`  Issues: ${test.jsIssues.join(', ')}`);
      }

      // Expected results
      const expected = test.input === '1954-03-05' ? '03/05/1954' : '04/01/2024';
      
      console.log(`  Expected: ${expected}`);
      if (test.formatDateSafeResult === expected) {
        console.log(`  ✅ formatDateSafe CORRECT`);
      } else {
        console.log(`  ❌ formatDateSafe WRONG - got "${test.formatDateSafeResult}"`);
      }
      
      if (test.manualFormat === expected) {
        console.log(`  ✅ Manual format CORRECT`);
      } else {
        console.log(`  ❌ Manual format WRONG - got "${test.manualFormat}"`);
      }
    });
  }

  async testActualStoryDates() {
    console.log('\n📊 Testing Actual Story Data');
    console.log('=============================');

    const storyTest = await this.page.evaluate(async () => {
      // Fetch stories from API
      const token = localStorage.getItem('token');
      if (!token) {
        return { error: 'No token found' };
      }

      try {
        const response = await fetch(`${window.API_URL}/stories?limit=50`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const stories = await response.json();
        
        const testStories = stories.filter(story => 
          story.idea_title && (
            story.idea_title.toLowerCase().includes('whale') ||
            story.idea_title.toLowerCase().includes('racoons')
          )
        );

        const results = [];
        
        testStories.forEach(story => {
          const result = {
            title: story.idea_title,
            rawDate: story.coverage_start_date,
            datePart: null,
            formatDateSafeResult: null,
            manualFormat: null,
            standardDateFormat: null
          };

          // Extract date part
          if (story.coverage_start_date) {
            result.datePart = story.coverage_start_date.split('T')[0];
            
            // Test formatDateSafe
            if (typeof window.formatDateSafe === 'function') {
              result.formatDateSafeResult = window.formatDateSafe(result.datePart);
            }
            
            // Manual formatting
            const parts = result.datePart.split('-');
            if (parts.length === 3) {
              const month = parts[1].padStart(2, '0');
              const day = parts[2].padStart(2, '0');
              const year = parts[0];
              result.manualFormat = `${month}/${day}/${year}`;
            }
            
            // Standard Date object
            const date = new Date(result.datePart);
            result.standardDateFormat = date.toLocaleDateString();
          }

          results.push(result);
        });

        return { results, totalStories: stories.length };
      } catch (error) {
        return { error: error.message };
      }
    });

    if (storyTest.error) {
      console.log(`❌ Error fetching stories: ${storyTest.error}`);
      return;
    }

    console.log(`→ Found ${storyTest.results.length} test stories out of ${storyTest.totalStories} total`);

    storyTest.results.forEach((story, index) => {
      console.log(`\nStory ${index + 1}: "${story.title}"`);
      console.log(`  Raw date: ${story.rawDate}`);
      console.log(`  Date part: ${story.datePart}`);
      console.log(`  formatDateSafe: ${story.formatDateSafeResult}`);
      console.log(`  Manual format: ${story.manualFormat}`);
      console.log(`  Standard Date: ${story.standardDateFormat}`);

      // Expected results
      const expected = story.title.toLowerCase().includes('whale') ? '03/05/1954' : '04/01/2024';
      console.log(`  Expected: ${expected}`);
      
      if (story.formatDateSafeResult === expected) {
        console.log(`  ✅ formatDateSafe is working correctly!`);
      } else {
        console.log(`  ❌ formatDateSafe is NOT working - showing "${story.formatDateSafeResult}"`);
      }
      
      if (story.manualFormat === expected) {
        console.log(`  ✅ Manual format is working correctly!`);
      } else {
        console.log(`  ❌ Manual format is NOT working - showing "${story.manualFormat}"`);
      }

      if (story.standardDateFormat === expected) {
        console.log(`  ✅ Standard Date format is correct (surprising!)`);
      } else {
        console.log(`  ⚠️ Standard Date format shows: "${story.standardDateFormat}" (timezone issue)`);
      }
    });
  }
}

// Run the test
const tester = new BrowserDateFormatTester();
tester.runTest().catch(console.error);