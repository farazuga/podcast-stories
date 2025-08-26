/**
 * Verify Date Display Test
 * Final verification that imported CSV dates display correctly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://podcast-stories-production.up.railway.app/api';

console.log('=== CSV Date Display Verification ===\n');

class DateDisplayVerifier {
  constructor() {
    this.token = null;
  }

  async runVerification() {
    try {
      console.log('Step 1: Authentication');
      await this.authenticate();
      
      console.log('\nStep 2: Fetch imported stories');
      const stories = await this.fetchTestStories();
      
      console.log('\nStep 3: Verify date formatting');
      await this.verifyDateFormatting(stories);
      
      console.log('\n🎉 Date display verification completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Verification failed:', error.message);
      process.exit(1);
    }
  }

  async authenticate() {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@vidpod.com', password: 'vidpod' })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Auth failed: ${data.error}`);
    
    this.token = data.token;
    console.log('✅ Authentication successful');
  }

  async fetchTestStories() {
    const response = await fetch(`${API_URL}/stories?limit=50`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    if (!response.ok) throw new Error(`Failed to fetch stories: ${response.status}`);
    
    const stories = await response.json();
    const testStories = stories.filter(story => 
      story.idea_title && (
        story.idea_title.trim().toLowerCase().includes('whale') ||
        story.idea_title.trim().toLowerCase().includes('racoons')
      )
    );

    console.log(`✅ Found ${testStories.length} test stories`);
    
    testStories.forEach(story => {
      console.log(`   - "${story.idea_title}" (ID: ${story.id})`);
      console.log(`     Raw date: ${story.coverage_start_date}`);
    });

    return testStories;
  }

  async verifyDateFormatting(stories) {
    // Load date utilities
    const dateUtilsPath = path.join(__dirname, 'backend/frontend/js/date-utils.js');
    const dateUtilsCode = fs.readFileSync(dateUtilsPath, 'utf8');
    const module = { exports: {} };
    eval(dateUtilsCode);
    const { formatDateSafe } = module.exports;

    const expectedResults = {
      'whale': { originalCsv: '3/5/54', expectedDisplay: '03/05/1954', dbFormat: '1954-03-05' },
      'racoons': { originalCsv: '4/1/24', expectedDisplay: '04/01/2024', dbFormat: '2024-04-01' }
    };

    let allPassed = true;

    console.log('Testing date display formatting:');
    console.log('================================');

    for (const story of stories) {
      const title = story.idea_title.trim();
      const rawDate = story.coverage_start_date;
      
      console.log(`\nStory: "${title}"`);
      console.log(`  Database date: ${rawDate}`);
      
      // Extract YYYY-MM-DD part (remove timezone)
      const datePart = rawDate.split('T')[0];
      console.log(`  Date part: ${datePart}`);
      
      // Format for display
      const displayDate = formatDateSafe(datePart);
      console.log(`  Display date: ${displayDate}`);
      
      // Find expected result
      const expectedKey = Object.keys(expectedResults).find(key => 
        title.toLowerCase().includes(key.toLowerCase())
      );
      
      if (expectedKey) {
        const expected = expectedResults[expectedKey];
        console.log(`  Expected: ${expected.expectedDisplay} (from CSV "${expected.originalCsv}")`);
        
        if (displayDate === expected.expectedDisplay) {
          console.log('  ✅ PASS - Date displays correctly');
        } else {
          console.log(`  ❌ FAIL - Expected "${expected.expectedDisplay}", got "${displayDate}"`);
          allPassed = false;
        }
        
        // Verify database storage is correct
        if (datePart === expected.dbFormat) {
          console.log('  ✅ Database storage correct');
        } else {
          console.log(`  ❌ Database storage incorrect - Expected "${expected.dbFormat}", got "${datePart}"`);
          allPassed = false;
        }
      } else {
        console.log('  ⚠️ No expected result defined');
      }
    }

    console.log('\n' + '='.repeat(50));
    if (allPassed) {
      console.log('🎉 ALL DATE TESTS PASSED');
      console.log('✅ CSV dates "3/5/54" and "4/1/24" are displaying correctly');
      console.log('✅ No timezone offset issues detected');
      console.log('✅ Database storage format is correct');
    } else {
      console.log('❌ SOME DATE TESTS FAILED');
      throw new Error('Date formatting verification failed');
    }
  }
}

// Run verification
const verifier = new DateDisplayVerifier();
verifier.runVerification();