/**
 * Quick Date Fix Verification Test
 * Test that the fixes are working correctly
 */

import puppeteer from 'puppeteer';

const TEST_URL = 'https://podcast-stories-production.up.railway.app';

console.log('=== Date Fix Verification Test ===\n');

class DateFixVerifier {
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
      
      // Login
      await this.login();
      
      // Test date formatting
      await this.testDateFormatting();

      console.log('\n🎉 Date fix verification completed');

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

  async testDateFormatting() {
    console.log('\n🔧 Testing Fixed Date Formatting');
    console.log('================================');

    const result = await this.page.evaluate(async () => {
      // Check if formatDateSafe is available
      const formatDateSafeAvailable = typeof window.formatDateSafe === 'function';
      
      if (!formatDateSafeAvailable) {
        return { error: 'formatDateSafe function not available' };
      }

      // Test the function directly
      const testResults = [];
      const testDates = ['1954-03-05', '2024-04-01'];
      
      testDates.forEach(dateStr => {
        const result = window.formatDateSafe(dateStr);
        const expected = dateStr === '1954-03-05' ? '03/05/1954' : '04/01/2024';
        testResults.push({
          input: dateStr,
          output: result,
          expected: expected,
          correct: result === expected
        });
      });

      // Fetch actual story data
      const token = localStorage.getItem('token');
      let storyResults = [];
      
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

        testStories.forEach(story => {
          const datePart = story.coverage_start_date.split('T')[0];
          const formatted = window.formatDateSafe(datePart);
          const expected = story.idea_title.toLowerCase().includes('whale') ? '03/05/1954' : '04/01/2024';
          
          storyResults.push({
            title: story.idea_title,
            rawDate: story.coverage_start_date,
            datePart: datePart,
            formatted: formatted,
            expected: expected,
            correct: formatted === expected
          });
        });
      } catch (error) {
        storyResults.push({ error: error.message });
      }

      return {
        formatDateSafeAvailable: true,
        functionTests: testResults,
        storyTests: storyResults
      };
    });

    if (result.error) {
      console.log(`❌ ${result.error}`);
      return;
    }

    console.log('✅ formatDateSafe function is available');
    
    console.log('\n📋 Function Tests:');
    result.functionTests.forEach((test, index) => {
      console.log(`  Test ${index + 1}: ${test.input} → ${test.output}`);
      console.log(`    Expected: ${test.expected}`);
      console.log(`    Result: ${test.correct ? '✅ CORRECT' : '❌ WRONG'}`);
    });

    console.log('\n📊 Actual Story Tests:');
    result.storyTests.forEach((test, index) => {
      if (test.error) {
        console.log(`  Error: ${test.error}`);
        return;
      }
      
      console.log(`  Story ${index + 1}: "${test.title}"`);
      console.log(`    Raw: ${test.rawDate}`);
      console.log(`    Date Part: ${test.datePart}`);
      console.log(`    Formatted: ${test.formatted}`);
      console.log(`    Expected: ${test.expected}`);
      console.log(`    Result: ${test.correct ? '✅ CORRECT' : '❌ WRONG'}`);
    });

    // Summary
    const allFunctionTestsPass = result.functionTests.every(t => t.correct);
    const allStoryTestsPass = result.storyTests.every(t => !t.error && t.correct);

    console.log('\n' + '='.repeat(50));
    console.log('VERIFICATION SUMMARY:');
    console.log(`Function tests: ${allFunctionTestsPass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Story tests: ${allStoryTestsPass ? '✅ PASS' : '❌ FAIL'}`);
    
    if (allFunctionTestsPass && allStoryTestsPass) {
      console.log('🎉 ALL TESTS PASSED - Date display is now working correctly!');
      console.log('✅ CSV dates "3/5/54" and "4/1/24" now display as "03/05/1954" and "04/01/2024"');
      console.log('✅ No more timezone offset issues');
    } else {
      console.log('❌ Some tests failed - further investigation needed');
    }
  }
}

// Run the test
const verifier = new DateFixVerifier();
verifier.runTest().catch(console.error);