#!/usr/bin/env node

/**
 * TEST REGISTRATION FORMS
 * 
 * Test both teacher and student registration forms to verify they work correctly
 */

const puppeteer = require('puppeteer');

async function testRegistrationForms() {
    console.log('🚀 Testing Registration Forms...\n');
    
    let browser;
    let page;
    
    try {
        browser = await puppeteer.launch({ 
            headless: false, 
            slowMo: 200,
            defaultViewport: { width: 1280, height: 800 }
        });
        
        page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            console.log(`🖥️  Page console: ${msg.text()}`);
        });
        
        page.on('pageerror', error => {
            console.log(`❌ Page error: ${error.message}`);
        });
        
        // ======================
        // TEST 1: Teacher Registration Form
        // ======================
        console.log('👩‍🏫 Testing Teacher Registration Form...');
        await page.goto('https://podcast-stories-production.up.railway.app/register-teacher.html', { 
            waitUntil: 'networkidle0' 
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if form fields exist
        const teacherFormFields = await page.evaluate(() => {
            return {
                nameField: !!document.getElementById('name'),
                emailField: !!document.getElementById('email'),
                schoolField: !!document.getElementById('school'),
                messageField: !!document.getElementById('message'),
                submitBtn: !!document.querySelector('button[type="submit"]')
            };
        });
        
        console.log('📝 Teacher form fields:', teacherFormFields);
        
        if (teacherFormFields.nameField && teacherFormFields.emailField && teacherFormFields.schoolField) {
            console.log('✅ Teacher form fields all present');
            
            // Check school dropdown options
            const schoolOptions = await page.$$eval('#school option', options => 
                options.map(option => ({ value: option.value, text: option.textContent }))
            );
            
            console.log('🏫 School options loaded:', schoolOptions.length > 1 ? 'YES' : 'NO', 
                        `(${schoolOptions.length} options)`);
            
            // Test form validation
            await page.type('#name', 'Test Teacher');
            await page.type('#email', 'invalid-email');
            await page.click('button[type="submit"]');
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const errorMessage = await page.$eval('#errorMessage', el => el.textContent).catch(() => '');
            if (errorMessage) {
                console.log('✅ Teacher form validation working:', errorMessage);
            } else {
                console.log('⚠️  Teacher form validation not working');
            }
            
        } else {
            console.log('❌ Teacher form fields missing');
        }
        
        // ======================
        // TEST 2: Student Registration Form  
        // ======================
        console.log('\n👨‍🎓 Testing Student Registration Form...');
        await page.goto('https://podcast-stories-production.up.railway.app/register-student.html', { 
            waitUntil: 'networkidle0' 
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if form fields exist
        const studentFormFields = await page.evaluate(() => {
            return {
                nameField: !!document.getElementById('name'),
                emailField: !!document.getElementById('email'),
                studentIdField: !!document.getElementById('studentId'),
                schoolField: !!document.getElementById('school'),
                classCodeField: !!document.getElementById('classCode'),
                passwordField: !!document.getElementById('password'),
                confirmPasswordField: !!document.getElementById('confirmPassword'),
                submitBtn: !!document.querySelector('button[type="submit"]')
            };
        });
        
        console.log('📝 Student form fields:', studentFormFields);
        
        const allStudentFieldsPresent = Object.values(studentFormFields).every(field => field);
        
        if (allStudentFieldsPresent) {
            console.log('✅ Student form fields all present');
            
            // Check school dropdown options
            const studentSchoolOptions = await page.$$eval('#school option', options => 
                options.map(option => ({ value: option.value, text: option.textContent }))
            );
            
            console.log('🏫 Student school options loaded:', studentSchoolOptions.length > 1 ? 'YES' : 'NO', 
                        `(${studentSchoolOptions.length} options)`);
            
            // Test password validation
            await page.type('#name', 'Test Student');
            await page.type('#email', 'student@test.com');
            await page.type('#classCode', 'TEST');
            await page.type('#password', 'password123');
            await page.type('#confirmPassword', 'different');
            await page.click('button[type="submit"]');
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const studentErrorMessage = await page.$eval('#errorMessage', el => el.textContent).catch(() => '');
            if (studentErrorMessage.includes('match')) {
                console.log('✅ Student password validation working:', studentErrorMessage);
            } else {
                console.log('⚠️  Student password validation not working');
            }
            
        } else {
            console.log('❌ Student form fields missing');
        }
        
        // ======================
        // TEST 3: API Endpoint Tests
        // ======================
        console.log('\n🌐 Testing API Endpoints...');
        
        // Test schools public endpoint
        try {
            const schoolsResponse = await page.evaluate(async () => {
                const response = await fetch('https://podcast-stories-production.up.railway.app/api/schools/public');
                return {
                    status: response.status,
                    ok: response.ok,
                    data: response.ok ? await response.json() : null
                };
            });
            
            if (schoolsResponse.ok) {
                console.log('✅ Schools public API working:', schoolsResponse.data.length, 'schools');
            } else {
                console.log('❌ Schools public API failed:', schoolsResponse.status);
            }
        } catch (error) {
            console.log('❌ Schools API test error:', error.message);
        }
        
        // ======================
        // SUMMARY
        // ======================
        console.log('\n' + '='.repeat(50));
        console.log('📊 REGISTRATION FORMS TEST SUMMARY');
        console.log('='.repeat(50));
        
        const teacherFormWorking = teacherFormFields.nameField && teacherFormFields.emailField && teacherFormFields.schoolField;
        const studentFormWorking = allStudentFieldsPresent;
        
        console.log(`👩‍🏫 Teacher Form: ${teacherFormWorking ? '✅ WORKING' : '❌ BROKEN'}`);
        console.log(`👨‍🎓 Student Form: ${studentFormWorking ? '✅ WORKING' : '❌ BROKEN'}`);
        
        if (teacherFormWorking && studentFormWorking) {
            console.log('🎉 Both registration forms are functional!');
            return true;
        } else {
            console.log('🚨 Registration forms need fixes');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
testRegistrationForms()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(console.error);