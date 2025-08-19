/**
 * Test CSV Upload Functionality
 * 
 * This test verifies that CSV upload is working properly after fixing
 * the field name mismatch between frontend and backend.
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testCSVUpload() {
    console.log('🧪 Testing CSV Upload Functionality...');
    
    try {
        // Step 1: Login to get authentication token
        console.log('\n🔐 Step 1: Authenticating...');
        
        const loginResponse = await fetch('https://podcast-stories-production.up.railway.app/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@vidpod.com',
                password: 'rumi&amaml'
            })
        });
        
        if (!loginResponse.ok) {
            const loginError = await loginResponse.text();
            console.log('❌ Login failed:', loginResponse.status, loginError);
            console.log('Note: This test requires valid credentials to proceed.');
            return false;
        }
        
        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login successful');
        
        // Step 2: Create test CSV content
        console.log('\n📝 Step 2: Creating test CSV...');
        
        const csvContent = `idea_title,idea_description,question_1,question_2,question_3,question_4,question_5,question_6,coverage_start_date,coverage_end_date,tags,interviewees
"Test CSV Story Upload","A test story uploaded via CSV to verify functionality","What is the main issue?","How does this affect students?","What solutions are proposed?","Who are the stakeholders?","What is the timeline?","What are the expected outcomes?","2025-01-01","2025-01-31","Education,Testing","Principal,Teachers"`;
        
        const csvFilePath = path.join(__dirname, 'test-upload.csv');
        fs.writeFileSync(csvFilePath, csvContent);
        console.log('✅ Test CSV created:', csvFilePath);
        
        // Step 3: Test CSV upload with correct field name
        console.log('\n📤 Step 3: Testing CSV upload...');
        
        const formData = new FormData();
        formData.append('csv', fs.createReadStream(csvFilePath), {
            filename: 'test-upload.csv',
            contentType: 'text/csv'
        });
        
        const uploadResponse = await fetch('https://podcast-stories-production.up.railway.app/api/stories/import', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            },
            body: formData
        });
        
        console.log(`Upload response status: ${uploadResponse.status}`);
        
        if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            console.log('✅ CSV upload successful!');
            console.log(`   Imported: ${result.imported} stories`);
            console.log(`   Message: ${result.message}`);
            
            if (result.imported > 0) {
                console.log('🎉 CSV upload functionality is working correctly!');
            } else {
                console.log('⚠️  Upload succeeded but no stories were imported');
            }
            
        } else {
            const errorText = await uploadResponse.text();
            console.log('❌ CSV upload failed:', uploadResponse.status);
            console.log('Error details:', errorText);
            
            // Check if it's a field name mismatch
            if (errorText.includes('No file uploaded')) {
                console.log('💡 This suggests the field name mismatch issue may still exist');
            }
        }
        
        // Step 4: Clean up
        console.log('\n🧹 Step 4: Cleaning up...');
        if (fs.existsSync(csvFilePath)) {
            fs.unlinkSync(csvFilePath);
            console.log('✅ Test CSV file deleted');
        }
        
        return uploadResponse.ok;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

// Additional function to test CSV format validation
async function testCSVFormat() {
    console.log('\n📋 CSV FORMAT REQUIREMENTS:');
    console.log('The CSV file should include the following columns in this order:');
    console.log('1. idea_title (required)');
    console.log('2. idea_description');
    console.log('3. question_1 through question_6');
    console.log('4. coverage_start_date (YYYY-MM-DD format)');
    console.log('5. coverage_end_date (YYYY-MM-DD format)');
    console.log('6. tags (comma-separated)');
    console.log('7. interviewees (comma-separated)');
    
    console.log('\n📄 Example CSV content:');
    console.log('idea_title,idea_description,question_1,...');
    console.log('"My Story Title","Description here","What is the issue?",...');
}

// Run the tests
async function runTests() {
    console.log('🎯 CSV UPLOAD TEST SUITE');
    console.log('='.repeat(50));
    
    await testCSVFormat();
    
    const success = await testCSVUpload();
    
    console.log('\n' + '='.repeat(50));
    console.log(`🏁 CSV Upload Test Result: ${success ? 'SUCCESS ✅' : 'FAILED ❌'}`);
    
    if (success) {
        console.log('✅ CSV upload is working correctly');
        console.log('✅ Field name mismatch has been resolved');
        console.log('✅ Users can now upload CSV files successfully');
    } else {
        console.log('❌ CSV upload issues remain - check error details above');
    }
    
    process.exit(success ? 0 : 1);
}

runTests().catch(console.error);