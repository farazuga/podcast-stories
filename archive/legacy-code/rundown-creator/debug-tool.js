#!/usr/bin/env node

/**
 * VidPOD Rundown Creator - Comprehensive Debug Tool
 * 
 * Automated debugging and validation tool for the rundown creator system.
 * Performs comprehensive health checks, validates configurations, and 
 * provides detailed diagnostic information.
 * 
 * Usage: node debug-tool.js [--mode=dev|prod] [--verbose] [--fix]
 */

const axios = require('axios');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  rundownCreatorUrl: process.env.RUNDOWN_CREATOR_URL || 'http://localhost:3001',
  vidpodApiUrl: process.env.VIDPOD_API_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL,
  mode: process.argv.includes('--mode=prod') ? 'production' : 'development',
  verbose: process.argv.includes('--verbose'),
  fix: process.argv.includes('--fix'),
  testUsers: {
    admin: { email: 'admin@vidpod.com', password: 'rumi&amaml' },
    teacher: { email: 'teacher@vidpod.com', password: 'rumi&amaml' },
    student: { email: 'student@vidpod.com', password: 'rumi&amaml' }
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Utility functions
const log = (message, color = 'white') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logSection = (title) => {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`${title}`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');
};

const logResult = (test, passed, message = '') => {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? 'green' : 'red';
  log(`${status} ${test} ${message}`, color);
};

const logInfo = (message) => log(`ℹ️  ${message}`, 'blue');
const logWarning = (message) => log(`⚠️  ${message}`, 'yellow');
const logError = (message) => log(`❌ ${message}`, 'red');

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

const recordResult = (test, passed, message = '', critical = false) => {
  results.total++;
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
    if (critical) {
      results.details.push({ test, passed, message, critical });
    }
  }
  logResult(test, passed, message);
};

// Main debug functions
async function checkEnvironment() {
  logSection('Environment Configuration Check');
  
  // Check Node.js version
  const nodeVersion = process.version;
  const isValidNode = parseInt(nodeVersion.slice(1)) >= 16;
  recordResult('Node.js Version', isValidNode, `v${nodeVersion}`, true);
  
  // Check required environment variables
  const requiredEnvVars = ['DATABASE_URL'];
  for (const envVar of requiredEnvVars) {
    const exists = !!process.env[envVar];
    recordResult(`Environment Variable: ${envVar}`, exists, exists ? '✓' : 'Missing', true);
  }
  
  // Check optional environment variables
  const optionalEnvVars = ['VIDPOD_API_URL', 'JWT_SECRET', 'PORT'];
  for (const envVar of optionalEnvVars) {
    const exists = !!process.env[envVar];
    if (exists) {
      logInfo(`${envVar}: ${envVar === 'JWT_SECRET' ? '[HIDDEN]' : process.env[envVar]}`);
    } else {
      logWarning(`${envVar}: Not set (will use default)`);
      results.warnings++;
    }
  }
  
  // Check file structure
  const requiredFiles = [
    'backend/server.js',
    'backend/routes/rundowns.js',
    'backend/routes/segments.js',
    'backend/routes/integration.js',
    'backend/middleware/auth-proxy.js',
    'backend/db/schema.sql',
    'frontend/index.html',
    'package.json'
  ];
  
  for (const file of requiredFiles) {
    const exists = fs.existsSync(path.join(__dirname, file));
    recordResult(`File Structure: ${file}`, exists);
  }
}

async function checkDatabaseConnection() {
  logSection('Database Connection and Schema Check');
  
  if (!config.databaseUrl) {
    recordResult('Database Connection', false, 'DATABASE_URL not set', true);
    return;
  }
  
  try {
    const pool = new Pool({ connectionString: config.databaseUrl });
    
    // Test basic connection
    const result = await pool.query('SELECT version()');
    recordResult('Database Connection', true, 'Connected successfully');
    
    if (config.verbose) {
      logInfo(`PostgreSQL Version: ${result.rows[0].version}`);
    }
    
    // Check for rundown creator tables
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE 'rundown_app_%'
      ORDER BY table_name
    `;
    
    const tables = await pool.query(tableQuery);
    const expectedTables = ['rundown_app_rundowns', 'rundown_app_segments', 'rundown_app_stories'];
    
    for (const expectedTable of expectedTables) {
      const exists = tables.rows.some(row => row.table_name === expectedTable);
      recordResult(`Database Table: ${expectedTable}`, exists, '', true);
    }
    
    // Check table structures
    if (tables.rows.length > 0) {
      for (const table of tables.rows) {
        const columnQuery = `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `;
        
        const columns = await pool.query(columnQuery, [table.table_name]);
        logInfo(`${table.table_name}: ${columns.rows.length} columns`);
        
        if (config.verbose) {
          columns.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
          });
        }
      }
    }
    
    // Check test users
    const userQuery = `
      SELECT id, email, role, created_at 
      FROM users 
      WHERE email IN ($1, $2, $3)
    `;
    
    const testUserEmails = Object.values(config.testUsers).map(u => u.email);
    const users = await pool.query(userQuery, testUserEmails);
    
    for (const email of testUserEmails) {
      const exists = users.rows.some(row => row.email === email);
      recordResult(`Test User: ${email}`, exists);
    }
    
    // Check data counts
    if (tables.rows.length > 0) {
      for (const table of tables.rows) {
        try {
          const countResult = await pool.query(`SELECT COUNT(*) FROM ${table.table_name}`);
          const count = countResult.rows[0].count;
          logInfo(`${table.table_name}: ${count} records`);
        } catch (error) {
          logWarning(`Could not count records in ${table.table_name}: ${error.message}`);
        }
      }
    }
    
    await pool.end();
    
  } catch (error) {
    recordResult('Database Connection', false, error.message, true);
  }
}

async function checkServiceHealth() {
  logSection('Service Health Check');
  
  // Check VidPOD API
  try {
    const response = await axios.get(`${config.vidpodApiUrl}/api/health`, { timeout: 5000 });
    recordResult('VidPOD API Health', response.status === 200, `Status: ${response.status}`);
    
    if (config.verbose && response.data) {
      logInfo(`VidPOD API Response: ${JSON.stringify(response.data, null, 2)}`);
    }
  } catch (error) {
    recordResult('VidPOD API Health', false, `Error: ${error.message}`, true);
  }
  
  // Check Rundown Creator API
  try {
    const response = await axios.get(`${config.rundownCreatorUrl}/health`, { timeout: 5000 });
    recordResult('Rundown Creator Health', response.status === 200, `Status: ${response.status}`);
    
    if (config.verbose && response.data) {
      logInfo(`Rundown Creator Response: ${JSON.stringify(response.data, null, 2)}`);
    }
  } catch (error) {
    recordResult('Rundown Creator Health', false, `Error: ${error.message}`, true);
  }
  
  // Check database health endpoint
  try {
    const response = await axios.get(`${config.rundownCreatorUrl}/health/db`, { timeout: 5000 });
    recordResult('Database Health Endpoint', response.status === 200, `Status: ${response.status}`);
  } catch (error) {
    recordResult('Database Health Endpoint', false, `Error: ${error.message}`);
  }
}

async function checkAuthentication() {
  logSection('Authentication Flow Check');
  
  for (const [role, credentials] of Object.entries(config.testUsers)) {
    try {
      // Test login with VidPOD API
      const loginResponse = await axios.post(`${config.vidpodApiUrl}/api/auth/login`, {
        email: credentials.email,
        password: credentials.password
      }, { timeout: 5000 });
      
      const loginSuccess = loginResponse.status === 200 && loginResponse.data.token;
      recordResult(`Login: ${role}`, loginSuccess);
      
      if (loginSuccess) {
        const token = loginResponse.data.token;
        
        // Test token verification
        try {
          const verifyResponse = await axios.get(`${config.vidpodApiUrl}/api/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000
          });
          
          recordResult(`Token Verification: ${role}`, verifyResponse.status === 200);
        } catch (error) {
          recordResult(`Token Verification: ${role}`, false, error.message);
        }
        
        // Test auth proxy with rundown creator
        try {
          const proxyResponse = await axios.get(`${config.rundownCreatorUrl}/api/rundowns`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000
          });
          
          recordResult(`Auth Proxy: ${role}`, proxyResponse.status === 200);
          
          if (config.verbose) {
            logInfo(`${role} rundowns: ${proxyResponse.data.rundowns?.length || 0} found`);
          }
        } catch (error) {
          recordResult(`Auth Proxy: ${role}`, false, error.message);
        }
      }
      
    } catch (error) {
      recordResult(`Login: ${role}`, false, error.message);
    }
  }
}

async function checkCoreFeatures() {
  logSection('Core Features Check');
  
  // Get student token for testing
  let studentToken = null;
  try {
    const loginResponse = await axios.post(`${config.vidpodApiUrl}/api/auth/login`, {
      email: config.testUsers.student.email,
      password: config.testUsers.student.password
    });
    
    if (loginResponse.status === 200 && loginResponse.data.token) {
      studentToken = loginResponse.data.token;
    }
  } catch (error) {
    logWarning(`Could not get student token for feature testing: ${error.message}`);
    return;
  }
  
  if (!studentToken) {
    logWarning('No student token available - skipping feature tests');
    return;
  }
  
  const authHeaders = { Authorization: `Bearer ${studentToken}` };
  
  // Test rundown CRUD
  try {
    // Create rundown
    const createResponse = await axios.post(`${config.rundownCreatorUrl}/api/rundowns`, {
      title: 'Debug Test Rundown',
      description: 'Created by debug tool for testing'
    }, { headers: authHeaders, timeout: 5000 });
    
    const createSuccess = createResponse.status === 201;
    recordResult('Create Rundown', createSuccess);
    
    if (createSuccess) {
      const rundownId = createResponse.data.rundown.id;
      
      // Read rundown
      try {
        const readResponse = await axios.get(`${config.rundownCreatorUrl}/api/rundowns/${rundownId}`, {
          headers: authHeaders,
          timeout: 5000
        });
        recordResult('Read Rundown', readResponse.status === 200);
      } catch (error) {
        recordResult('Read Rundown', false, error.message);
      }
      
      // Update rundown
      try {
        const updateResponse = await axios.put(`${config.rundownCreatorUrl}/api/rundowns/${rundownId}`, {
          title: 'Updated Debug Test Rundown'
        }, { headers: authHeaders, timeout: 5000 });
        recordResult('Update Rundown', updateResponse.status === 200);
      } catch (error) {
        recordResult('Update Rundown', false, error.message);
      }
      
      // Test segment creation
      try {
        const segmentResponse = await axios.post(`${config.rundownCreatorUrl}/api/segments/${rundownId}`, {
          segment_type: 'intro',
          title: 'Test Segment',
          duration: 120
        }, { headers: authHeaders, timeout: 5000 });
        recordResult('Create Segment', segmentResponse.status === 201);
      } catch (error) {
        recordResult('Create Segment', false, error.message);
      }
      
      // Test story integration
      try {
        const storiesResponse = await axios.get(`${config.rundownCreatorUrl}/api/integration/stories`, {
          headers: authHeaders,
          timeout: 5000
        });
        recordResult('Story Integration', storiesResponse.status === 200);
        
        if (config.verbose) {
          logInfo(`Available stories: ${storiesResponse.data.stories?.length || 0}`);
        }
      } catch (error) {
        recordResult('Story Integration', false, error.message);
      }
      
      // Clean up - delete test rundown
      if (config.fix) {
        try {
          await axios.delete(`${config.rundownCreatorUrl}/api/rundowns/${rundownId}`, {
            headers: authHeaders,
            timeout: 5000
          });
          logInfo('Test rundown cleaned up');
        } catch (error) {
          logWarning(`Could not clean up test rundown: ${error.message}`);
        }
      }
    }
  } catch (error) {
    recordResult('Create Rundown', false, error.message);
  }
}

async function checkFrontendAssets() {
  logSection('Frontend Assets Check');
  
  try {
    // Check main page
    const response = await axios.get(config.rundownCreatorUrl, { timeout: 5000 });
    recordResult('Frontend Loading', response.status === 200);
    
    if (response.status === 200) {
      const html = response.data;
      
      // Check for required elements
      const hasTitle = html.includes('<title>') && html.includes('VidPOD');
      recordResult('Page Title', hasTitle);
      
      const hasVidPodBranding = html.includes('VidPOD') || html.includes('📻');
      recordResult('VidPOD Branding', hasVidPodBranding);
      
      const hasRundownView = html.includes('rundownsView') || html.includes('rundown');
      recordResult('Rundown View Elements', hasRundownView);
      
      const hasStylesheet = html.includes('.css') || html.includes('<style>');
      recordResult('Stylesheet Loading', hasStylesheet);
      
      const hasJavaScript = html.includes('.js') || html.includes('<script>');
      recordResult('JavaScript Loading', hasJavaScript);
    }
  } catch (error) {
    recordResult('Frontend Loading', false, error.message, true);
  }
  
  // Check CSS file
  try {
    const cssResponse = await axios.get(`${config.rundownCreatorUrl}/css/rundown-styles.css`, { timeout: 5000 });
    recordResult('CSS File', cssResponse.status === 200);
  } catch (error) {
    recordResult('CSS File', false, 'Could not load CSS');
  }
  
  // Check JavaScript files
  const jsFiles = ['config.js', 'rundowns.js', 'segments.js', 'stories.js', 'app.js'];
  for (const jsFile of jsFiles) {
    try {
      const jsResponse = await axios.get(`${config.rundownCreatorUrl}/js/${jsFile}`, { timeout: 5000 });
      recordResult(`JS File: ${jsFile}`, jsResponse.status === 200);
    } catch (error) {
      recordResult(`JS File: ${jsFile}`, false, 'Could not load');
    }
  }
}

async function performanceCheck() {
  logSection('Performance Check');
  
  if (!config.databaseUrl) {
    logWarning('Skipping database performance check - no DATABASE_URL');
    return;
  }
  
  try {
    const pool = new Pool({ connectionString: config.databaseUrl });
    
    // Check connection pool
    logInfo(`Database pool - max: ${pool.options.max}, idle timeout: ${pool.options.idleTimeoutMillis}ms`);
    
    // Check for indexes
    const indexQuery = `
      SELECT schemaname, tablename, indexname, indexdef
      FROM pg_indexes 
      WHERE tablename LIKE 'rundown_app_%'
      ORDER BY tablename, indexname
    `;
    
    const indexes = await pool.query(indexQuery);
    logInfo(`Database indexes found: ${indexes.rows.length}`);
    
    if (config.verbose) {
      indexes.rows.forEach(index => {
        console.log(`  ${index.tablename}.${index.indexname}`);
      });
    }
    
    // Check for slow queries (if pg_stat_statements available)
    try {
      const slowQueryCheck = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'pg_stat_statements'
        ) as has_pg_stat_statements
      `);
      
      if (slowQueryCheck.rows[0].has_pg_stat_statements) {
        const slowQueries = await pool.query(`
          SELECT query, calls, mean_time 
          FROM pg_stat_statements 
          WHERE query LIKE '%rundown_app_%' 
          AND mean_time > 100
          ORDER BY mean_time DESC 
          LIMIT 5
        `);
        
        if (slowQueries.rows.length > 0) {
          logWarning(`Found ${slowQueries.rows.length} slow queries`);
          if (config.verbose) {
            slowQueries.rows.forEach(q => {
              console.log(`  ${q.mean_time.toFixed(2)}ms avg: ${q.query.substring(0, 60)}...`);
            });
          }
        } else {
          logInfo('No slow queries detected');
        }
      }
    } catch (error) {
      logInfo('pg_stat_statements not available for performance monitoring');
    }
    
    await pool.end();
  } catch (error) {
    logWarning(`Performance check failed: ${error.message}`);
  }
}

async function generateReport() {
  logSection('Debug Report Summary');
  
  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
  
  log(`\nTest Results:`);
  log(`  Total Tests: ${results.total}`, 'blue');
  log(`  Passed: ${results.passed}`, 'green');
  log(`  Failed: ${results.failed}`, 'red');
  log(`  Warnings: ${results.warnings}`, 'yellow');
  log(`  Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : 'red');
  
  if (results.details.length > 0) {
    log(`\nCritical Issues:`, 'red');
    results.details.forEach(detail => {
      if (detail.critical && !detail.passed) {
        log(`  ❌ ${detail.test}: ${detail.message}`, 'red');
      }
    });
  }
  
  // Recommendations
  log(`\nRecommendations:`, 'cyan');
  
  if (results.failed > 0) {
    log(`  • Fix failed tests before deployment`, 'yellow');
  }
  
  if (results.warnings > 0) {
    log(`  • Review warnings for potential issues`, 'yellow');
  }
  
  if (passRate < 80) {
    log(`  • System may not be ready for production use`, 'red');
  } else if (passRate >= 95) {
    log(`  • System appears healthy and ready for use`, 'green');
  }
  
  // Save report to file
  const reportData = {
    timestamp: new Date().toISOString(),
    environment: config.mode,
    results: results,
    config: {
      rundownCreatorUrl: config.rundownCreatorUrl,
      vidpodApiUrl: config.vidpodApiUrl,
      databaseUrl: config.databaseUrl ? '[CONFIGURED]' : '[NOT SET]'
    }
  };
  
  const reportPath = path.join(__dirname, `debug-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  log(`\nDetailed report saved to: ${reportPath}`, 'blue');
}

// Main execution
async function main() {
  log(`🔍 VidPOD Rundown Creator Debug Tool`, 'cyan');
  log(`Mode: ${config.mode}`, 'blue');
  log(`Rundown Creator: ${config.rundownCreatorUrl}`, 'blue');
  log(`VidPOD API: ${config.vidpodApiUrl}`, 'blue');
  
  try {
    await checkEnvironment();
    await checkDatabaseConnection();
    await checkServiceHealth();
    await checkAuthentication();
    await checkCoreFeatures();
    await checkFrontendAssets();
    await performanceCheck();
    await generateReport();
    
  } catch (error) {
    logError(`Debug tool crashed: ${error.message}`);
    if (config.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
  
  // Exit with error code if critical tests failed
  const criticalFailures = results.details.filter(d => d.critical && !d.passed).length;
  if (criticalFailures > 0) {
    log(`\n❌ ${criticalFailures} critical test(s) failed`, 'red');
    process.exit(1);
  } else {
    log(`\n✅ Debug check completed successfully`, 'green');
    process.exit(0);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  log('\n\nDebug tool interrupted by user', 'yellow');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`);
  if (config.verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});

// Run the debug tool
if (require.main === module) {
  main();
}

module.exports = { main, config, results };