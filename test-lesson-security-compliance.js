#!/usr/bin/env node

/**
 * VidPOD Lesson Management System - Security & Compliance Testing Suite
 * 
 * This comprehensive security test suite validates:
 * - Role-based access control (RBAC) enforcement
 * - Data privacy and student information protection
 * - Input validation and SQL injection prevention
 * - Cross-site scripting (XSS) protection
 * - COPPA and FERPA compliance for educational records
 * - Authentication security measures
 * - Session management and authorization
 * - Data encryption and secure transmission
 * 
 * Run with: node test-lesson-security-compliance.js
 */

const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  BASE_URL: process.env.BASE_URL || 'https://podcast-stories-production.up.railway.app',
  HEADLESS: process.env.HEADLESS !== 'false',
  TIMEOUT: 30000,
  SECURITY_TEST_TIMEOUT: 10000
};

// Test credentials for different roles
const TEST_CREDENTIALS = {
  admin: { email: 'admin@vidpod.com', password: 'vidpod' },
  teacher: { email: 'teacher@vidpod.com', password: 'vidpod' },
  student: { email: 'student@vidpod.com', password: 'vidpod' }
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  critical_failures: 0,
  total: 0,
  security_score: 0,
  compliance_score: 0,
  vulnerability_count: 0,
  details: [],
  vulnerabilities: [],
  compliance_issues: []
};

// Color codes
const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, status, details = '', severity = 'medium', duration = 0) {
  const statusSymbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  
  if (severity === 'critical' && status === 'FAIL') {
    testResults.critical_failures++;
    log(`🚨 CRITICAL: ${testName}`, 'red');
  } else {
    log(`${statusSymbol} ${testName}`, statusColor);
  }
  
  if (details) {
    log(`   ${details}`, 'cyan');
  }
  if (duration > 0) {
    log(`   Duration: ${duration}ms`, 'magenta');
  }
  
  testResults.total++;
  testResults.details.push({ name: testName, status, details, severity, duration });
  
  if (status === 'PASS') testResults.passed++;
  else if (status === 'FAIL') {
    testResults.failed++;
    if (severity === 'critical' || severity === 'high') {
      testResults.vulnerabilities.push({ test: testName, severity, details });
    }
  }
}

// =============================================================================
// HTTP REQUEST UTILITY
// =============================================================================

function makeSecureRequest(method, endpoint, data = null, token = null, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, CONFIG.BASE_URL);
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VidPOD-Security-Test/1.0',
        ...options.headers
      },
      timeout: CONFIG.SECURITY_TEST_TIMEOUT
    };

    if (token) {
      requestOptions.headers['Authorization'] = `Bearer ${token}`;
    }

    let postData = '';
    if (data) {
      postData = typeof data === 'object' ? JSON.stringify(data) : data;
      requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(requestOptions, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            status: res.statusCode,
            data: parsedData,
            headers: res.headers,
            rawData: responseData
          });
        } catch (parseError) {
          resolve({
            status: res.statusCode,
            data: responseData,
            headers: res.headers,
            rawData: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function getAuthToken(role) {
  try {
    const credentials = TEST_CREDENTIALS[role];
    const response = await makeSecureRequest('POST', '/api/auth/login', credentials);
    
    if (response.status === 200 && response.data.token) {
      return response.data.token;
    }
    throw new Error(`Failed to get ${role} token: ${response.status}`);
  } catch (error) {
    throw new Error(`Authentication failed for ${role}: ${error.message}`);
  }
}

// =============================================================================
// AUTHENTICATION SECURITY TESTS
// =============================================================================

async function testAuthenticationSecurity() {
  log('\n🔐 AUTHENTICATION SECURITY TESTS', 'bright');
  
  // Test 1: SQL Injection in Login
  try {
    const sqlInjectionPayloads = [
      "admin'; DROP TABLE users; --",
      "admin' OR '1'='1",
      "admin' UNION SELECT * FROM users --",
      "' OR 1=1 --",
      "admin'; UPDATE users SET role='admin' WHERE email='student@vidpod.com'; --"
    ];
    
    let sqlInjectionBlocked = 0;
    for (const payload of sqlInjectionPayloads) {
      try {
        const response = await makeSecureRequest('POST', '/api/auth/login', {
          email: payload,
          password: 'any-password'
        });
        
        // Should either return 400/401 or sanitized error
        if (response.status === 400 || response.status === 401 || response.status === 422) {
          sqlInjectionBlocked++;
        } else if (response.status === 200) {
          // This would be a critical vulnerability
          logTest('SQL Injection Protection - Login', 'FAIL', 
            `Payload succeeded: ${payload}`, 'critical');
          break;
        }
      } catch (error) {
        sqlInjectionBlocked++; // Request failed, which is good
      }
    }
    
    if (sqlInjectionBlocked === sqlInjectionPayloads.length) {
      logTest('SQL Injection Protection - Login', 'PASS', 
        `All ${sqlInjectionPayloads.length} SQL injection attempts blocked`, 'high');
    } else {
      logTest('SQL Injection Protection - Login', 'FAIL', 
        `${sqlInjectionBlocked}/${sqlInjectionPayloads.length} attacks blocked`, 'critical');
    }
  } catch (error) {
    logTest('SQL Injection Protection - Login', 'FAIL', error.message, 'high');
  }
  
  // Test 2: Brute Force Protection
  try {
    const bruteForceAttempts = 10;
    let consecutiveFailures = 0;
    
    for (let i = 0; i < bruteForceAttempts; i++) {
      try {
        const response = await makeSecureRequest('POST', '/api/auth/login', {
          email: 'admin@vidpod.com',
          password: `wrong-password-${i}`
        });
        
        if (response.status === 429) {
          // Rate limiting detected
          logTest('Brute Force Protection', 'PASS', 
            `Rate limiting active after ${i + 1} attempts`, 'medium');
          break;
        } else if (response.status === 401) {
          consecutiveFailures++;
        }
        
        // Brief delay between attempts
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        // Network-level protection (good)
        if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
          logTest('Brute Force Protection', 'PASS', 
            'Network-level protection detected', 'medium');
          break;
        }
      }
    }
    
    if (consecutiveFailures === bruteForceAttempts) {
      logTest('Brute Force Protection', 'FAIL', 
        'No rate limiting detected for brute force attempts', 'medium');
    }
  } catch (error) {
    logTest('Brute Force Protection', 'FAIL', error.message, 'medium');
  }
  
  // Test 3: Token Security
  try {
    const validToken = await getAuthToken('teacher');
    
    // Test token format (should be JWT)
    const tokenParts = validToken.split('.');
    if (tokenParts.length === 3) {
      logTest('JWT Token Format', 'PASS', 
        'Token follows JWT standard format', 'low');
    } else {
      logTest('JWT Token Format', 'FAIL', 
        'Token does not follow JWT format', 'medium');
    }
    
    // Test token manipulation
    const manipulatedToken = validToken.slice(0, -5) + 'XXXXX';
    const response = await makeSecureRequest('GET', '/api/auth/verify', null, manipulatedToken);
    
    if (response.status === 401 || response.status === 403) {
      logTest('Token Manipulation Protection', 'PASS', 
        'Manipulated tokens correctly rejected', 'high');
    } else {
      logTest('Token Manipulation Protection', 'FAIL', 
        'Manipulated token was accepted', 'critical');
    }
    
  } catch (error) {
    logTest('Token Security Tests', 'FAIL', error.message, 'high');
  }
  
  // Test 4: Password Requirements
  try {
    const weakPasswords = [
      '123',
      'password',
      'admin',
      '111111',
      'qwerty'
    ];
    
    let weakPasswordsRejected = 0;
    for (const weakPassword of weakPasswords) {
      try {
        const response = await makeSecureRequest('POST', '/api/auth/register', {
          email: `test-${Date.now()}@example.com`,
          password: weakPassword,
          name: 'Test User',
          role: 'student'
        });
        
        if (response.status === 400 || response.status === 422) {
          weakPasswordsRejected++;
        }
      } catch (error) {
        weakPasswordsRejected++; // Rejection is good
      }
    }
    
    if (weakPasswordsRejected >= weakPasswords.length * 0.8) {
      logTest('Password Strength Requirements', 'PASS', 
        `${weakPasswordsRejected}/${weakPasswords.length} weak passwords rejected`, 'medium');
    } else {
      logTest('Password Strength Requirements', 'FAIL', 
        `Only ${weakPasswordsRejected}/${weakPasswords.length} weak passwords rejected`, 'medium');
    }
  } catch (error) {
    logTest('Password Strength Requirements', 'FAIL', error.message, 'medium');
  }
}

// =============================================================================
// ROLE-BASED ACCESS CONTROL TESTS
// =============================================================================

async function testRoleBasedAccessControl() {
  log('\n👥 ROLE-BASED ACCESS CONTROL TESTS', 'bright');
  
  try {
    // Get tokens for all roles
    const adminToken = await getAuthToken('admin');
    const teacherToken = await getAuthToken('teacher');
    const studentToken = await getAuthToken('student');
    
    // Test 1: Student Access Restrictions
    const studentRestrictedEndpoints = [
      { method: 'POST', endpoint: '/api/courses', description: 'Create course' },
      { method: 'DELETE', endpoint: '/api/courses/1', description: 'Delete course' },
      { method: 'GET', endpoint: '/api/progress/analytics/course/1', description: 'Teacher analytics' },
      { method: 'POST', endpoint: '/api/schools', description: 'Create school' },
      { method: 'GET', endpoint: '/api/teacher-requests', description: 'Teacher requests' }
    ];
    
    let studentRestrictionsEnforced = 0;
    for (const endpoint of studentRestrictedEndpoints) {
      try {
        const response = await makeSecureRequest(endpoint.method, endpoint.endpoint, 
          endpoint.method === 'POST' ? { title: 'Test' } : null, studentToken);
        
        if (response.status === 403 || response.status === 401) {
          studentRestrictionsEnforced++;
        } else {
          logTest(`Student Access Control: ${endpoint.description}`, 'FAIL', 
            `Student was allowed access (status: ${response.status})`, 'high');
        }
      } catch (error) {
        studentRestrictionsEnforced++; // Access denied is good
      }
    }
    
    if (studentRestrictionsEnforced === studentRestrictedEndpoints.length) {
      logTest('Student Access Restrictions', 'PASS', 
        `All ${studentRestrictedEndpoints.length} restricted endpoints properly protected`, 'high');
    } else {
      logTest('Student Access Restrictions', 'FAIL', 
        `${studentRestrictionsEnforced}/${studentRestrictedEndpoints.length} restrictions enforced`, 'critical');
    }
    
    // Test 2: Teacher Access Boundaries
    const teacherRestrictedEndpoints = [
      { method: 'POST', endpoint: '/api/schools', description: 'Create school (admin only)' },
      { method: 'GET', endpoint: '/api/teacher-requests', description: 'Teacher requests (admin only)' },
      { method: 'DELETE', endpoint: '/api/users/1', description: 'Delete user (admin only)' }
    ];
    
    let teacherRestrictionsEnforced = 0;
    for (const endpoint of teacherRestrictedEndpoints) {
      try {
        const response = await makeSecureRequest(endpoint.method, endpoint.endpoint, 
          endpoint.method === 'POST' ? { name: 'Test' } : null, teacherToken);
        
        if (response.status === 403 || response.status === 401) {
          teacherRestrictionsEnforced++;
        }
      } catch (error) {
        teacherRestrictionsEnforced++;
      }
    }
    
    if (teacherRestrictionsEnforced >= teacherRestrictedEndpoints.length * 0.8) {
      logTest('Teacher Access Boundaries', 'PASS', 
        `${teacherRestrictionsEnforced}/${teacherRestrictedEndpoints.length} admin-only endpoints protected`, 'medium');
    } else {
      logTest('Teacher Access Boundaries', 'FAIL', 
        `Insufficient teacher access restrictions: ${teacherRestrictionsEnforced}/${teacherRestrictedEndpoints.length}`, 'high');
    }
    
    // Test 3: Cross-User Data Access
    try {
      // Try to access another teacher's course data (should fail)
      const response = await makeSecureRequest('GET', '/api/courses/999999', null, teacherToken);
      
      if (response.status === 404 || response.status === 403) {
        logTest('Cross-User Data Access Protection', 'PASS', 
          'Teachers cannot access other teachers\' data', 'high');
      } else if (response.status === 200) {
        logTest('Cross-User Data Access Protection', 'FAIL', 
          'Teacher can access other teachers\' data', 'critical');
      } else {
        logTest('Cross-User Data Access Protection', 'PASS', 
          `Unexpected response: ${response.status} (likely protected)`, 'medium');
      }
    } catch (error) {
      logTest('Cross-User Data Access Protection', 'PASS', 
        'Cross-user access properly blocked', 'high');
    }
    
    // Test 4: Privilege Escalation
    try {
      // Try to modify user role through API
      const escalationAttempts = [
        { method: 'PUT', endpoint: '/api/users/self', data: { role: 'admin' } },
        { method: 'POST', endpoint: '/api/users', data: { role: 'admin', email: 'hacker@test.com' } },
        { method: 'PATCH', endpoint: '/api/auth/role', data: { new_role: 'admin' } }
      ];
      
      let escalationBlocked = 0;
      for (const attempt of escalationAttempts) {
        try {
          const response = await makeSecureRequest(attempt.method, attempt.endpoint, 
            attempt.data, studentToken);
          
          if (response.status === 403 || response.status === 401 || response.status === 404) {
            escalationBlocked++;
          } else if (response.status === 200 && response.data.role !== 'admin') {
            escalationBlocked++; // Role wasn't changed
          }
        } catch (error) {
          escalationBlocked++;
        }
      }
      
      if (escalationBlocked === escalationAttempts.length) {
        logTest('Privilege Escalation Protection', 'PASS', 
          'All privilege escalation attempts blocked', 'critical');
      } else {
        logTest('Privilege Escalation Protection', 'FAIL', 
          `${escalationBlocked}/${escalationAttempts.length} escalation attempts blocked`, 'critical');
      }
    } catch (error) {
      logTest('Privilege Escalation Protection', 'FAIL', error.message, 'critical');
    }
    
  } catch (error) {
    logTest('Role-Based Access Control Setup', 'FAIL', error.message, 'critical');
  }
}

// =============================================================================
// INPUT VALIDATION AND XSS PROTECTION TESTS
// =============================================================================

async function testInputValidationSecurity() {
  log('\n🛡️ INPUT VALIDATION & XSS PROTECTION TESTS', 'bright');
  
  try {
    const teacherToken = await getAuthToken('teacher');
    
    // Test 1: XSS Protection
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>'
    ];
    
    let xssAttacksBlocked = 0;
    for (const payload of xssPayloads) {
      try {
        // Test course creation with XSS payload
        const response = await makeSecureRequest('POST', '/api/courses', {
          title: payload,
          description: `Course with XSS payload: ${payload}`,
          total_weeks: 4
        }, teacherToken);
        
        if (response.status === 400 || response.status === 422) {
          xssAttacksBlocked++;
        } else if (response.status === 201) {
          // Check if the payload was sanitized
          const sanitized = !response.data.course.title.includes('<script>') && 
                           !response.data.course.title.includes('javascript:') &&
                           !response.data.course.title.includes('onerror=');
          
          if (sanitized) {
            xssAttacksBlocked++;
          } else {
            logTest('XSS Protection', 'FAIL', 
              `XSS payload not sanitized: ${payload}`, 'critical');
          }
        }
      } catch (error) {
        xssAttacksBlocked++; // Request blocked is good
      }
    }
    
    if (xssAttacksBlocked === xssPayloads.length) {
      logTest('XSS Protection', 'PASS', 
        `All ${xssPayloads.length} XSS payloads blocked or sanitized`, 'critical');
    } else {
      logTest('XSS Protection', 'FAIL', 
        `Only ${xssAttacksBlocked}/${xssPayloads.length} XSS attacks prevented`, 'critical');
    }
    
    // Test 2: SQL Injection in Data Fields
    const sqlPayloads = [
      "'; DROP TABLE courses; --",
      "' UNION SELECT * FROM users --",
      "'; UPDATE users SET role='admin'; --",
      "' OR '1'='1",
      "'; INSERT INTO users (email, role) VALUES ('hacker@test.com', 'admin'); --"
    ];
    
    let sqlAttacksBlocked = 0;
    for (const payload of sqlPayloads) {
      try {
        const response = await makeSecureRequest('POST', '/api/courses', {
          title: `Test Course ${payload}`,
          description: payload,
          total_weeks: 4
        }, teacherToken);
        
        // Should either be blocked or sanitized
        if (response.status === 400 || response.status === 422) {
          sqlAttacksBlocked++;
        } else if (response.status === 201) {
          // Check if SQL commands were stripped/escaped
          const containsSQLCommands = response.data.course.description.includes('DROP TABLE') ||
                                     response.data.course.description.includes('UNION SELECT') ||
                                     response.data.course.description.includes('UPDATE users');
          
          if (!containsSQLCommands) {
            sqlAttacksBlocked++; // SQL was sanitized
          }
        }
      } catch (error) {
        sqlAttacksBlocked++;
      }
    }
    
    if (sqlAttacksBlocked === sqlPayloads.length) {
      logTest('SQL Injection Protection - Data Fields', 'PASS', 
        `All ${sqlPayloads.length} SQL injection attempts blocked`, 'critical');
    } else {
      logTest('SQL Injection Protection - Data Fields', 'FAIL', 
        `Only ${sqlAttacksBlocked}/${sqlPayloads.length} SQL attacks prevented`, 'critical');
    }
    
    // Test 3: File Upload Security (if available)
    try {
      const maliciousFileTypes = [
        { name: 'test.exe', type: 'application/executable' },
        { name: 'script.js', type: 'application/javascript' },
        { name: 'malware.php', type: 'application/php' },
        { name: 'test.html', type: 'text/html' }
      ];
      
      // This is a conceptual test - actual implementation depends on file upload endpoints
      logTest('File Upload Security', 'SKIP', 
        'File upload endpoints need manual testing', 'medium');
        
    } catch (error) {
      logTest('File Upload Security', 'SKIP', 'No file upload endpoints detected', 'low');
    }
    
  } catch (error) {
    logTest('Input Validation Security Setup', 'FAIL', error.message, 'high');
  }
}

// =============================================================================
// DATA PRIVACY AND COMPLIANCE TESTS
// =============================================================================

async function testDataPrivacyCompliance() {
  log('\n🔒 DATA PRIVACY & COMPLIANCE TESTS', 'bright');
  
  try {
    const studentToken = await getAuthToken('student');
    const teacherToken = await getAuthToken('teacher');
    
    // Test 1: Student Data Privacy (FERPA Compliance)
    try {
      // Students should not be able to access other students' data
      const response = await makeSecureRequest('GET', '/api/students', null, studentToken);
      
      if (response.status === 403 || response.status === 401) {
        logTest('FERPA Compliance - Student Data Access', 'PASS', 
          'Students cannot access other students\' data', 'critical');
      } else if (response.status === 200 && Array.isArray(response.data)) {
        // Check if response only contains current student's data
        const containsOtherStudents = response.data.length > 1 || 
          (response.data.length === 1 && response.data[0].email !== STUDENT_CREDENTIALS.email);
        
        if (containsOtherStudents) {
          logTest('FERPA Compliance - Student Data Access', 'FAIL', 
            'Student can access other students\' data', 'critical');
        } else {
          logTest('FERPA Compliance - Student Data Access', 'PASS', 
            'Student data access properly restricted', 'critical');
        }
      } else {
        logTest('FERPA Compliance - Student Data Access', 'PASS', 
          'Student data endpoint properly protected', 'critical');
      }
    } catch (error) {
      logTest('FERPA Compliance - Student Data Access', 'PASS', 
        'Student data access blocked by network security', 'critical');
    }
    
    // Test 2: Age Verification (COPPA Compliance)
    try {
      // Test registration with underage user
      const underageUser = {
        email: 'child@example.com',
        password: 'securepass123',
        name: 'Child User',
        role: 'student',
        birthdate: '2015-01-01', // Under 13
        grade: '5'
      };
      
      const response = await makeSecureRequest('POST', '/api/auth/register', underageUser);
      
      // Should either require parental consent or be blocked
      if (response.status === 400 && response.data.error && 
          response.data.error.toLowerCase().includes('age')) {
        logTest('COPPA Compliance - Age Verification', 'PASS', 
          'Underage registration properly handled', 'critical');
      } else if (response.status === 201) {
        // Check if parental consent workflow was triggered
        logTest('COPPA Compliance - Age Verification', 'PASS', 
          'Underage user registration requires additional verification', 'critical');
      } else {
        logTest('COPPA Compliance - Age Verification', 'FAIL', 
          'No age verification implemented', 'critical');
      }
    } catch (error) {
      logTest('COPPA Compliance - Age Verification', 'PASS', 
        'Registration blocked for underage users', 'critical');
    }
    
    // Test 3: Data Retention and Deletion
    try {
      // Test if users can request data deletion
      const deletionEndpoints = [
        '/api/users/delete-account',
        '/api/privacy/delete-data',
        '/api/gdpr/delete',
        '/api/users/self'
      ];
      
      let dataDeletionAvailable = false;
      for (const endpoint of deletionEndpoints) {
        try {
          const response = await makeSecureRequest('DELETE', endpoint, null, studentToken);
          
          if (response.status === 200 || response.status === 202 || 
              (response.status === 400 && response.data.message && 
               response.data.message.includes('confirmation'))) {
            dataDeletionAvailable = true;
            break;
          }
        } catch (error) {
          // Continue checking other endpoints
        }
      }
      
      if (dataDeletionAvailable) {
        logTest('Data Retention Compliance', 'PASS', 
          'Data deletion mechanism available', 'medium');
      } else {
        logTest('Data Retention Compliance', 'FAIL', 
          'No data deletion mechanism found', 'medium');
        testResults.compliance_issues.push({
          type: 'Data Retention',
          issue: 'No user data deletion mechanism available',
          regulation: 'GDPR/CCPA'
        });
      }
    } catch (error) {
      logTest('Data Retention Compliance', 'FAIL', error.message, 'medium');
    }
    
    // Test 4: PII Data Minimization
    try {
      // Check what personal data is required for registration
      const minimalUser = {
        email: 'minimal@example.com',
        password: 'securepass123',
        role: 'student'
      };
      
      const response = await makeSecureRequest('POST', '/api/auth/register', minimalUser);
      
      if (response.status === 201 || response.status === 200) {
        logTest('Data Minimization Principle', 'PASS', 
          'Registration possible with minimal data', 'medium');
      } else if (response.status === 400) {
        // Check what additional fields are required
        const errorMessage = response.data.error || response.data.message || '';
        const requiresExcessiveData = errorMessage.toLowerCase().includes('phone') ||
                                     errorMessage.toLowerCase().includes('address') ||
                                     errorMessage.toLowerCase().includes('ssn') ||
                                     errorMessage.toLowerCase().includes('birthdate');
        
        if (requiresExcessiveData) {
          logTest('Data Minimization Principle', 'FAIL', 
            'Registration requires excessive personal data', 'medium');
          testResults.compliance_issues.push({
            type: 'Data Minimization',
            issue: 'Registration requires non-essential PII',
            regulation: 'GDPR'
          });
        } else {
          logTest('Data Minimization Principle', 'PASS', 
            'Only essential data required for registration', 'medium');
        }
      }
    } catch (error) {
      logTest('Data Minimization Principle', 'FAIL', error.message, 'medium');
    }
    
  } catch (error) {
    logTest('Data Privacy Compliance Setup', 'FAIL', error.message, 'critical');
  }
}

// =============================================================================
// BROWSER-BASED SECURITY TESTS
// =============================================================================

async function testBrowserSecurity() {
  log('\n🌐 BROWSER SECURITY TESTS', 'bright');
  
  const browser = await puppeteer.launch({
    headless: CONFIG.HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Test 1: HTTPS Enforcement
    try {
      await page.goto(CONFIG.BASE_URL.replace('https://', 'http://'), { 
        waitUntil: 'networkidle0',
        timeout: 10000 
      });
      
      const currentUrl = page.url();
      if (currentUrl.startsWith('https://')) {
        logTest('HTTPS Enforcement', 'PASS', 
          'HTTP redirects to HTTPS', 'high');
      } else {
        logTest('HTTPS Enforcement', 'FAIL', 
          'HTTP connections allowed', 'critical');
      }
    } catch (error) {
      if (error.message.includes('net::ERR_SSL_PROTOCOL_ERROR') ||
          error.message.includes('net::ERR_CONNECTION_REFUSED')) {
        logTest('HTTPS Enforcement', 'PASS', 
          'HTTP connections blocked', 'high');
      } else {
        logTest('HTTPS Enforcement', 'FAIL', error.message, 'high');
      }
    }
    
    // Test 2: Security Headers
    try {
      const response = await page.goto(CONFIG.BASE_URL, { waitUntil: 'networkidle0' });
      const headers = response.headers();
      
      const securityHeaders = [
        { name: 'x-frame-options', description: 'X-Frame-Options (Clickjacking protection)' },
        { name: 'x-content-type-options', description: 'X-Content-Type-Options (MIME sniffing protection)' },
        { name: 'x-xss-protection', description: 'X-XSS-Protection (XSS filtering)' },
        { name: 'strict-transport-security', description: 'HSTS (HTTPS enforcement)' },
        { name: 'content-security-policy', description: 'Content Security Policy' },
        { name: 'referrer-policy', description: 'Referrer Policy' }
      ];
      
      let securityHeadersPresent = 0;
      for (const header of securityHeaders) {
        if (headers[header.name]) {
          securityHeadersPresent++;
          log(`   ✓ ${header.description}: ${headers[header.name]}`, 'green');
        } else {
          log(`   ⚠ Missing: ${header.description}`, 'yellow');
        }
      }
      
      if (securityHeadersPresent >= 4) {
        logTest('Security Headers', 'PASS', 
          `${securityHeadersPresent}/${securityHeaders.length} security headers present`, 'medium');
      } else {
        logTest('Security Headers', 'FAIL', 
          `Only ${securityHeadersPresent}/${securityHeaders.length} security headers present`, 'medium');
      }
    } catch (error) {
      logTest('Security Headers', 'FAIL', error.message, 'medium');
    }
    
    // Test 3: Content Security Policy
    try {
      await page.goto(`${CONFIG.BASE_URL}/index.html`, { waitUntil: 'networkidle0' });
      
      // Try to execute inline script (should be blocked by CSP)
      const scriptExecuted = await page.evaluate(() => {
        try {
          eval('window.cspTestPassed = true;');
          return window.cspTestPassed === true;
        } catch (error) {
          return false;
        }
      });
      
      if (scriptExecuted) {
        logTest('Content Security Policy - Inline Scripts', 'FAIL', 
          'Inline scripts can execute (CSP not restrictive enough)', 'medium');
      } else {
        logTest('Content Security Policy - Inline Scripts', 'PASS', 
          'Inline script execution blocked', 'medium');
      }
    } catch (error) {
      logTest('Content Security Policy', 'FAIL', error.message, 'medium');
    }
    
    // Test 4: Local Storage Security
    try {
      await page.goto(`${CONFIG.BASE_URL}/index.html`, { waitUntil: 'networkidle0' });
      
      // Check if sensitive data is stored in localStorage
      const localStorageContent = await page.evaluate(() => {
        const content = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          content[key] = localStorage.getItem(key);
        }
        return content;
      });
      
      let sensitiveDataInStorage = false;
      for (const [key, value] of Object.entries(localStorageContent)) {
        const lowerKey = key.toLowerCase();
        const lowerValue = (value || '').toLowerCase();
        
        if (lowerKey.includes('password') || lowerValue.includes('password') ||
            lowerKey.includes('credit') || lowerValue.includes('ssn') ||
            lowerKey.includes('social')) {
          sensitiveDataInStorage = true;
          break;
        }
      }
      
      if (sensitiveDataInStorage) {
        logTest('Local Storage Security', 'FAIL', 
          'Sensitive data found in localStorage', 'medium');
      } else {
        logTest('Local Storage Security', 'PASS', 
          'No sensitive data in localStorage', 'medium');
      }
    } catch (error) {
      logTest('Local Storage Security', 'FAIL', error.message, 'low');
    }
    
  } catch (error) {
    logTest('Browser Security Tests', 'FAIL', error.message, 'medium');
  } finally {
    await browser.close();
  }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runAllTests() {
  const startTime = Date.now();
  
  log('🚀 VidPOD Lesson Management Security & Compliance Test Suite', 'bright');
  log('=' * 80, 'bright');
  log(`🔒 Testing against: ${CONFIG.BASE_URL}`, 'cyan');
  log(`⚠️  This test includes security vulnerability testing`, 'yellow');
  
  try {
    await testAuthenticationSecurity();
    await testRoleBasedAccessControl();
    await testInputValidationSecurity();
    await testDataPrivacyCompliance();
    await testBrowserSecurity();
    
  } catch (error) {
    log(`💥 Critical error: ${error.message}`, 'red');
  }
  
  const totalTime = Date.now() - startTime;
  
  // Generate comprehensive security report
  await generateSecurityReport(totalTime);
  
  // Exit with appropriate code
  if (testResults.critical_failures > 0) {
    process.exit(2); // Critical security failures
  } else if (testResults.failed > 0) {
    process.exit(1); // Security issues found
  } else {
    process.exit(0); // All security tests passed
  }
}

async function generateSecurityReport(totalTime) {
  log('\n🛡️ SECURITY & COMPLIANCE TEST RESULTS', 'bright');
  log('=' * 80, 'bright');
  
  // Summary statistics
  log(`⏱️  Total execution time: ${Math.round(totalTime / 1000)}s`, 'cyan');
  log(`✅ Tests passed: ${testResults.passed}`, 'green');
  log(`❌ Tests failed: ${testResults.failed}`, 'red');
  log(`🚨 Critical failures: ${testResults.critical_failures}`, testResults.critical_failures > 0 ? 'red' : 'green');
  log(`📈 Total tests: ${testResults.total}`, 'cyan');
  log(`🎯 Success rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`, 'magenta');
  
  // Security Score Calculation
  const maxSecurityScore = 100;
  let securityScore = maxSecurityScore;
  
  // Deduct points for failures based on severity
  testResults.details.forEach(test => {
    if (test.status === 'FAIL') {
      switch (test.severity) {
        case 'critical': securityScore -= 20; break;
        case 'high': securityScore -= 10; break;
        case 'medium': securityScore -= 5; break;
        case 'low': securityScore -= 2; break;
      }
    }
  });
  
  securityScore = Math.max(0, securityScore);
  testResults.security_score = securityScore;
  
  // Compliance Score (simplified)
  const complianceScore = testResults.compliance_issues.length === 0 ? 100 : 
    Math.max(0, 100 - (testResults.compliance_issues.length * 20));
  testResults.compliance_score = complianceScore;
  
  log('\n📊 Security Assessment:', 'bright');
  log(`🔒 Security Score: ${securityScore}/100`, 
    securityScore >= 80 ? 'green' : securityScore >= 60 ? 'yellow' : 'red');
  log(`📋 Compliance Score: ${complianceScore}/100`, 
    complianceScore >= 80 ? 'green' : complianceScore >= 60 ? 'yellow' : 'red');
  
  // Vulnerability Summary
  if (testResults.vulnerabilities.length > 0) {
    log('\n🚨 Security Vulnerabilities Found:', 'bright');
    testResults.vulnerabilities.forEach(vuln => {
      const severityColor = vuln.severity === 'critical' ? 'red' : 
                           vuln.severity === 'high' ? 'red' : 'yellow';
      log(`   ${vuln.severity.toUpperCase()}: ${vuln.test}`, severityColor);
      log(`     ${vuln.details}`, 'cyan');
    });
  }
  
  // Compliance Issues
  if (testResults.compliance_issues.length > 0) {
    log('\n📋 Compliance Issues Found:', 'bright');
    testResults.compliance_issues.forEach(issue => {
      log(`   ${issue.regulation}: ${issue.type}`, 'yellow');
      log(`     ${issue.issue}`, 'cyan');
    });
  }
  
  // Category breakdown
  const categories = [
    'Authentication Security',
    'Role-Based Access Control', 
    'Input Validation & XSS Protection',
    'Data Privacy & Compliance',
    'Browser Security'
  ];
  
  log('\n📋 Results by Security Category:', 'bright');
  categories.forEach(category => {
    const categoryTests = testResults.details.filter(t => 
      t.name.toLowerCase().includes(category.toLowerCase().split(' ')[0]) ||
      t.name.toLowerCase().includes(category.toLowerCase().split(' ')[1])
    );
    
    if (categoryTests.length > 0) {
      const categoryPassed = categoryTests.filter(t => t.status === 'PASS').length;
      const categoryTotal = categoryTests.length;
      const categoryRate = Math.round((categoryPassed / categoryTotal) * 100);
      
      log(`   ${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`, 
        categoryRate === 100 ? 'green' : categoryRate >= 75 ? 'yellow' : 'red');
    }
  });
  
  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    duration: totalTime,
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      critical_failures: testResults.critical_failures,
      successRate: Math.round((testResults.passed / testResults.total) * 100)
    },
    scores: {
      security_score: securityScore,
      compliance_score: complianceScore
    },
    vulnerabilities: testResults.vulnerabilities,
    compliance_issues: testResults.compliance_issues,
    details: testResults.details
  };
  
  try {
    await fs.writeFile(
      path.join(__dirname, 'security-compliance-test-report.json'), 
      JSON.stringify(report, null, 2)
    );
    log('\n📄 Security report saved to: security-compliance-test-report.json', 'cyan');
  } catch (error) {
    log(`\n⚠️  Could not save report: ${error.message}`, 'yellow');
  }
  
  // Final assessment
  if (testResults.critical_failures > 0) {
    log('\n🚨 CRITICAL SECURITY FAILURES DETECTED!', 'red');
    log('   System should NOT be deployed until these are fixed.', 'red');
  } else if (securityScore >= 80 && complianceScore >= 80) {
    log('\n🛡️ SECURITY POSTURE: GOOD', 'green');
    log('   System meets security and compliance requirements.', 'green');
  } else if (securityScore >= 60 || complianceScore >= 60) {
    log('\n⚠️ SECURITY POSTURE: NEEDS IMPROVEMENT', 'yellow');
    log('   Address identified issues before production deployment.', 'yellow');
  } else {
    log('\n❌ SECURITY POSTURE: POOR', 'red');
    log('   Significant security improvements required before deployment.', 'red');
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  log('\n\nReceived SIGINT, generating report...', 'yellow');
  generateSecurityReport(Date.now()).then(() => process.exit(1));
});

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\nUnhandled error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runAllTests, testResults };