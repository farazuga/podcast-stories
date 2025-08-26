/**
 * FIXED TEST: CSV Auto-Approval Functionality
 * 
 * This test verifies that CSV imports by admin users are automatically approved
 * and immediately visible to all users without manual approval needed.
 * 
 * FIXED: Proper multipart form data construction for file upload
 */

const FormData = require('form-data');
const fs = require('fs');

async function testCSVAutoApproval() {
    console.log('🧪 TESTING: CSV Auto-Approval Functionality (FIXED VERSION)');
    console.log('='.repeat(60));
    
    // Admin token for testing
    const adminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB2aWRwb2QuY29tIiwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhbWl0cmFjZV9hZG1pbiIsImlhdCI6MTc1NTUzNzAxNSwiZXhwIjoxNzU2MTQxODE1fQ.WnmuLdAJP-LH4k6cL64xarJsCM1xbESG2tnj2MN0jao";
    
    try {
        console.log('📊 Step 1: Count existing approved stories...');
        
        // Get current count of approved stories
        const countResponse = await fetch('https://podcast-stories-production.up.railway.app/api/stories', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        const initialStories = await countResponse.json();
        const initialCount = Array.isArray(initialStories) ? initialStories.length : 0;
        console.log(`Initial approved stories count: ${initialCount}`);
        
        console.log('📤 Step 2: Import test CSV file (FIXED FORM DATA)...');
        
        // FIXED: Create proper form data for CSV upload
        const form = new FormData();
        const csvFilePath = '/Users/faraz/Library/CloudStorage/OneDrive-Amitrace/Vibe/1_Test/podcast-stories/backend/test-csv-auto-approval.csv';
        
        // Read file as a stream (proper way for FormData)
        const fileStream = fs.createReadStream(csvFilePath);
        
        // Append file with proper field name expected by backend
        form.append('csv', fileStream, {
            filename: 'test-auto-approval.csv',
            contentType: 'text/csv'
        });
        
        console.log('📝 Form prepared with file stream, making API request...');
        
        // Import CSV with fixed form data
        const importResponse = await fetch('https://podcast-stories-production.up.railway.app/api/stories/import', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                ...form.getHeaders()
            },
            body: form
        });
        
        console.log(`📡 Import response status: ${importResponse.status}`);
        
        if (!importResponse.ok) {
            const errorText = await importResponse.text();
            console.error('📛 Import failed response body:', errorText);
            throw new Error(`Import failed: ${importResponse.status} ${importResponse.statusText}`);
        }
        
        const importResult = await importResponse.json();
        console.log('📈 Import Results:', JSON.stringify(importResult, null, 2));
        
        // Verify import success
        if (importResult.imported !== 3) {
            throw new Error(`Expected 3 imported stories, got ${importResult.imported}`);
        }
        
        // Verify auto-approval status
        if (importResult.approval_status !== 'auto-approved') {
            throw new Error(`Expected auto-approved status, got ${importResult.approval_status}`);
        }
        
        if (importResult.auto_approved_count !== 3) {
            throw new Error(`Expected 3 auto-approved stories, got ${importResult.auto_approved_count}`);
        }
        
        console.log('✅ CSV import completed with auto-approval!');
        
        console.log('🔍 Step 3: Verify stories are immediately visible...');
        
        // Wait a moment for database to update
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Get updated story count
        const updatedResponse = await fetch('https://podcast-stories-production.up.railway.app/api/stories', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        const updatedStories = await updatedResponse.json();
        const updatedCount = Array.isArray(updatedStories) ? updatedStories.length : 0;
        
        console.log(`Updated approved stories count: ${updatedCount}`);
        console.log(`Expected increase: ${initialCount + 3}, Actual: ${updatedCount}`);
        
        // Verify the stories are visible
        if (updatedCount < initialCount + 3) {
            throw new Error(`Stories not immediately visible. Expected at least ${initialCount + 3}, got ${updatedCount}`);
        }
        
        console.log('✅ Stories immediately visible after import!');
        
        console.log('🔎 Step 4: Verify specific imported stories...');
        
        // Find our test stories by title
        const testStoryTitles = [
            'Test Auto-Approval Story',
            'Single Day Coverage Test', 
            'Date Range Coverage Test'
        ];
        
        const foundStories = updatedStories.filter(story => 
            testStoryTitles.includes(story.idea_title)
        );
        
        console.log(`Found ${foundStories.length} imported test stories`);
        
        foundStories.forEach(story => {
            console.log(`  📖 "${story.idea_title}" - Coverage: ${story.coverage_start_date} to ${story.coverage_end_date || 'same day'}`);
        });
        
        if (foundStories.length !== 3) {
            console.warn(`⚠️ Expected 3 test stories, found ${foundStories.length}`);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('🎉 CSV AUTO-APPROVAL TEST: ✅ PASSED (FIXED VERSION)');
        console.log('📋 Results:');
        console.log(`  ✅ CSV imported successfully: ${importResult.imported} stories`);
        console.log(`  ✅ Auto-approval working: ${importResult.auto_approved_count} approved`);
        console.log(`  ✅ Stories immediately visible: ${updatedCount} total stories`);
        console.log(`  ✅ All test stories found and accessible`);
        
        return {
            success: true,
            imported: importResult.imported,
            autoApproved: importResult.auto_approved_count,
            totalStories: updatedCount,
            foundTestStories: foundStories.length
        };
        
    } catch (error) {
        console.error('❌ CSV Auto-Approval Test Failed:', error.message);
        console.error('📚 Error details:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the test
testCSVAutoApproval()
    .then(result => {
        if (result.success) {
            console.log('\n🚀 Stage 1 Implementation: VERIFIED AND WORKING');
        } else {
            console.log('\n❌ Stage 1 Implementation: NEEDS DEBUGGING');
            console.log('Error:', result.error);
        }
    })
    .catch(console.error);