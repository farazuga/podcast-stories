#!/usr/bin/env node

/**
 * Rundown Loading Bug Test
 * Tests the rundown system to identify why rundowns are not loading
 */

const axios = require('axios');

console.log('🧪 Testing Rundown Loading Bug');
console.log('================================\n');

const API_BASE = 'https://podcast-stories-production.up.railway.app/api';
const testCredentials = {
    admin: { email: 'admin@vidpod.com', password: 'vidpod' },
    teacher: { email: 'teacher@vidpod.com', password: 'vidpod' },
    student: { email: 'student@vidpod.com', password: 'vidpod' }
};

let testResults = {
    passed: 0,
    failed: 0,
    issues: []
};

function logIssue(severity, message, details = null) {
    const issue = { severity, message, details, timestamp: new Date().toISOString() };
    testResults.issues.push(issue);
    
    const emoji = severity === 'HIGH' ? '🚨' : severity === 'MEDIUM' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} [${severity}] ${message}`);
    if (details) {
        console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
}

function testPassed(message) {
    console.log(`✅ ${message}`);
    testResults.passed++;
}

function testFailed(message, details = null) {
    console.log(`❌ ${message}`);
    if (details) console.log(`   Details: ${details}`);
    testResults.failed++;
}

async function getAuthToken(userType) {
    try {
        const credentials = testCredentials[userType];
        const response = await axios.post(`${API_BASE}/auth/login`, credentials);
        
        if (response.data.token) {
            testPassed(`${userType} authentication successful`);
            return response.data.token;
        } else {
            testFailed(`${userType} authentication failed - no token returned`);
            return null;
        }
    } catch (error) {
        testFailed(`${userType} authentication failed`, error.response?.data?.error || error.message);
        return null;
    }
}

async function testRundownAPI(token, userType) {
    try {
        console.log(`\n📝 Testing rundown API for ${userType}:`);
        
        // Test GET /api/rundowns
        const response = await axios.get(`${API_BASE}/rundowns`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.status === 200) {
            testPassed(`GET /api/rundowns returned status 200 for ${userType}`);
            
            if (Array.isArray(response.data)) {
                testPassed(`Response is an array with ${response.data.length} rundowns`);
                
                if (response.data.length > 0) {
                    console.log('   Sample rundown:', response.data[0]);
                } else {
                    logIssue('LOW', `No rundowns found for ${userType} - this may be expected`, {
                        userType,
                        responseLength: response.data.length
                    });
                }
            } else {
                logIssue('HIGH', `Invalid response format for ${userType} - expected array`, {
                    userType,
                    responseType: typeof response.data,
                    response: response.data
                });
            }
        } else {
            logIssue('HIGH', `Unexpected status code for ${userType}`, {
                userType,
                status: response.status,
                data: response.data
            });
        }
        
    } catch (error) {
        const errorData = error.response?.data;
        const status = error.response?.status;
        
        if (status === 403) {
            logIssue('MEDIUM', `Access denied for ${userType} - may be role restriction`, {
                userType,
                status,
                error: errorData?.error
            });
        } else if (status === 404) {
            logIssue('HIGH', `API endpoint not found for ${userType}`, {
                userType,
                status,
                error: errorData?.error
            });
        } else {
            logIssue('HIGH', `API request failed for ${userType}`, {
                userType,
                status,
                error: errorData?.error || error.message
            });
        }
    }
}

async function testDatabaseTables() {
    console.log('\n🗄️ Testing database schema:');
    
    // Test if we can access rundown data through debug endpoint
    try {
        const adminToken = await getAuthToken('admin');
        if (!adminToken) return;
        
        // Try to create a test rundown to verify tables exist
        const testRundown = {
            title: 'Test Rundown - Bug Detection',
            description: 'Testing database connectivity',
            scheduled_date: new Date().toISOString()
        };
        
        const response = await axios.post(`${API_BASE}/rundowns`, testRundown, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        if (response.status === 201) {
            testPassed('Database tables exist - test rundown created successfully');
            
            // Clean up - try to delete the test rundown
            try {
                await axios.delete(`${API_BASE}/rundowns/${response.data.id}`, {
                    headers: { Authorization: `Bearer ${adminToken}` }
                });
                testPassed('Test rundown cleaned up successfully');
            } catch (cleanupError) {
                logIssue('LOW', 'Could not clean up test rundown', {
                    rundownId: response.data.id,
                    error: cleanupError.message
                });
            }
        } else {
            logIssue('HIGH', 'Unexpected response when creating test rundown', {
                status: response.status,
                data: response.data
            });
        }
        
    } catch (error) {
        const errorData = error.response?.data;
        const status = error.response?.status;
        
        if (status === 400) {
            logIssue('MEDIUM', 'Validation error creating test rundown', {
                status,
                error: errorData?.error,
                details: 'May indicate missing required fields or validation issues'
            });
        } else if (status === 500) {
            logIssue('HIGH', 'Database error - tables may not exist', {
                status,
                error: errorData?.error,
                details: 'Possible missing migration or database connectivity issue'
            });
        } else {
            logIssue('HIGH', 'Unknown error testing database', {
                status,
                error: errorData?.error || error.message
            });
        }
    }
}

async function testFrontendConfiguration() {
    console.log('\n🌐 Testing frontend configuration:');
    
    try {
        // Test if the rundowns page is accessible
        const response = await axios.get('https://podcast-stories-production.up.railway.app/rundowns.html');
        
        if (response.status === 200) {
            testPassed('Rundowns page is accessible');
            
            // Check if the page includes necessary scripts
            const html = response.data;
            const requiredScripts = [
                'config.js',
                'rundown-utils.js',
                'rundowns.js'
            ];
            
            const missingScripts = requiredScripts.filter(script => !html.includes(script));
            
            if (missingScripts.length === 0) {
                testPassed('All required JavaScript files are included');
            } else {
                logIssue('HIGH', 'Missing required JavaScript files', {
                    missing: missingScripts,
                    required: requiredScripts
                });
            }
            
            // Check if API_URL configuration is set
            if (html.includes('API_URL')) {
                testPassed('API configuration is referenced in page');
            } else {
                logIssue('MEDIUM', 'API configuration may not be properly set', {
                    details: 'Could not find API_URL reference in HTML'
                });
            }
            
        } else {
            logIssue('HIGH', 'Rundowns page is not accessible', {
                status: response.status,
                details: 'Frontend page may not be deployed'
            });
        }
        
    } catch (error) {
        logIssue('HIGH', 'Cannot access rundowns frontend page', {
            error: error.message,
            details: 'Frontend may not be properly deployed'
        });
    }
}

async function runAllTests() {
    console.log('Starting comprehensive rundown loading tests...\n');
    
    // Test authentication for all user types
    console.log('1. Testing Authentication:');
    console.log('-------------------------');
    const tokens = {};
    for (const userType of ['admin', 'teacher', 'student']) {
        tokens[userType] = await getAuthToken(userType);
    }
    
    // Test API endpoints for each user type
    console.log('\n2. Testing API Endpoints:');
    console.log('--------------------------');
    for (const [userType, token] of Object.entries(tokens)) {
        if (token) {
            await testRundownAPI(token, userType);
        }
    }
    
    // Test database connectivity
    await testDatabaseTables();
    
    // Test frontend configuration
    await testFrontendConfiguration();
    
    // Generate report
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    console.log(`✅ Tests Passed: ${testResults.passed}`);
    console.log(`❌ Tests Failed: ${testResults.failed}`);
    
    if (testResults.issues.length > 0) {
        console.log(`\n🐛 Issues Found: ${testResults.issues.length}`);
        console.log('Issues by severity:');
        
        const severityCounts = testResults.issues.reduce((acc, issue) => {
            acc[issue.severity] = (acc[issue.severity] || 0) + 1;
            return acc;
        }, {});
        
        Object.entries(severityCounts).forEach(([severity, count]) => {
            const emoji = severity === 'HIGH' ? '🚨' : severity === 'MEDIUM' ? '⚠️' : 'ℹ️';
            console.log(`   ${emoji} ${severity}: ${count}`);
        });
        
        console.log('\n📋 Detailed Issues:');
        testResults.issues.forEach((issue, index) => {
            const emoji = issue.severity === 'HIGH' ? '🚨' : issue.severity === 'MEDIUM' ? '⚠️' : 'ℹ️';
            console.log(`${index + 1}. ${emoji} [${issue.severity}] ${issue.message}`);
            if (issue.details) {
                console.log(`   ${JSON.stringify(issue.details, null, 2)}`);
            }
        });
    }
    
    // Generate fix recommendations
    console.log('\n🔧 Fix Recommendations:');
    console.log('=======================');
    
    const highPriorityIssues = testResults.issues.filter(i => i.severity === 'HIGH');
    if (highPriorityIssues.length > 0) {
        console.log('HIGH PRIORITY FIXES NEEDED:');
        highPriorityIssues.forEach((issue, index) => {
            console.log(`${index + 1}. ${issue.message}`);
        });
    } else {
        console.log('✅ No high-priority issues found');
    }
    
    const mediumPriorityIssues = testResults.issues.filter(i => i.severity === 'MEDIUM');
    if (mediumPriorityIssues.length > 0) {
        console.log('\nMEDIUM PRIORITY IMPROVEMENTS:');
        mediumPriorityIssues.forEach((issue, index) => {
            console.log(`${index + 1}. ${issue.message}`);
        });
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Address any HIGH priority issues first');
    console.log('2. Verify rundown database tables exist (run migration if needed)');
    console.log('3. Test rundown creation/loading in browser');
    console.log('4. Check browser console for JavaScript errors');
    console.log('5. Verify user permissions for rundown access');
    
    return testResults.issues.filter(i => i.severity === 'HIGH').length === 0;
}

// Run the tests
runAllTests()
    .then(success => {
        if (success) {
            console.log('\n🎉 All critical tests passed! Rundowns should be working.');
            process.exit(0);
        } else {
            console.log('\n🚨 Critical issues found that prevent rundowns from working.');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('\n💥 Test execution failed:', error);
        process.exit(1);
    });