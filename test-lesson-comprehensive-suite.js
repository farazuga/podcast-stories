#!/usr/bin/env node

/**
 * VidPOD Lesson Management System - Comprehensive Testing Suite Master Runner
 * 
 * This master test runner coordinates and executes all testing suites:
 * - Database schema and function testing
 * - API integration testing (29 endpoints)
 * - Frontend component and UI testing
 * - Teacher workflow testing (end-to-end)
 * - Student learning experience testing
 * - Security and compliance testing
 * - Performance and scalability testing
 * - Mobile device compatibility testing
 * - Educational compliance and accessibility testing
 * - VidPOD system integration testing
 * 
 * Run with: node test-lesson-comprehensive-suite.js [--suite=all|database|api|frontend|workflows|security]
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  BASE_URL: process.env.BASE_URL || 'https://podcast-stories-production.up.railway.app',
  TIMEOUT_PER_SUITE: 600000, // 10 minutes per suite
  PARALLEL_SUITES: process.env.PARALLEL_SUITES !== 'false',
  REPORT_PATH: './test-reports',
  SCREENSHOTS_PATH: './test-screenshots'
};

// Test suite definitions
const TEST_SUITES = {
  database: {
    name: 'Database Testing',
    file: 'test-lesson-database-comprehensive.js',
    description: 'Schema integrity, functions, and data consistency',
    category: 'infrastructure',
    priority: 1,
    estimated_duration: 120000 // 2 minutes
  },
  api: {
    name: 'API Integration Testing',
    file: 'test-lesson-api-integration.js', 
    description: 'All 29 lesson management API endpoints',
    category: 'backend',
    priority: 2,
    estimated_duration: 300000 // 5 minutes
  },
  frontend: {
    name: 'Frontend Component Testing',
    file: 'test-lesson-frontend-components.js',
    description: 'UI components, responsive design, accessibility',
    category: 'frontend',
    priority: 3,
    estimated_duration: 240000 // 4 minutes
  },
  teacher_workflows: {
    name: 'Teacher Workflow Testing',
    file: 'test-teacher-lesson-workflows.js',
    description: 'End-to-end teacher experiences and workflows',
    category: 'e2e',
    priority: 3,
    estimated_duration: 300000 // 5 minutes
  },
  student_experience: {
    name: 'Student Learning Experience',
    file: 'test-student-learning-experience.js',
    description: 'Complete student learning journey testing',
    category: 'e2e', 
    priority: 3,
    estimated_duration: 240000 // 4 minutes
  },
  security: {
    name: 'Security & Compliance Testing',
    file: 'test-lesson-security-compliance.js',
    description: 'RBAC, data privacy, COPPA/FERPA compliance',
    category: 'security',
    priority: 4,
    estimated_duration: 180000 // 3 minutes
  }
};

// Test results aggregation
let masterResults = {
  start_time: null,
  end_time: null,
  total_duration: 0,
  suites_run: 0,
  suites_passed: 0,
  suites_failed: 0,
  total_tests: 0,
  total_passed: 0,
  total_failed: 0,
  overall_score: 0,
  suite_results: [],
  performance_metrics: [],
  summary: {}
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

function logSuite(suiteName, status, details = '', duration = 0) {
  const statusSymbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'RUNNING' ? '🔄' : '⚠️';
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : status === 'RUNNING' ? 'blue' : 'yellow';
  
  log(`${statusSymbol} ${suiteName}`, statusColor);
  if (details) {
    log(`   ${details}`, 'cyan');
  }
  if (duration > 0) {
    log(`   Duration: ${Math.round(duration / 1000)}s`, 'magenta');
  }
}

// =============================================================================
// TEST SUITE EXECUTION
// =============================================================================

async function runTestSuite(suiteName, suiteConfig) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    logSuite(suiteName, 'RUNNING', `Starting ${suiteConfig.description}`);
    
    // Check if test file exists
    const testFile = path.join(__dirname, suiteConfig.file);
    
    fs.access(testFile).then(() => {
      const childProcess = spawn('node', [testFile], {
        stdio: 'pipe',
        env: {
          ...process.env,
          BASE_URL: CONFIG.BASE_URL,
          HEADLESS: 'true', // Force headless for CI/CD
          TIMEOUT: '30000'
        }
      });
      
      let stdout = '';
      let stderr = '';
      
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      // Set timeout for suite execution
      const timeout = setTimeout(() => {
        childProcess.kill('SIGTERM');
        const duration = Date.now() - startTime;
        
        resolve({
          suite: suiteName,
          status: 'TIMEOUT',
          duration,
          error: `Suite timed out after ${CONFIG.TIMEOUT_PER_SUITE / 1000}s`,
          stdout: stdout.substring(0, 1000),
          stderr: stderr.substring(0, 1000)
        });
      }, CONFIG.TIMEOUT_PER_SUITE);
      
      childProcess.on('close', (code) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        
        // Parse test results from stdout
        let testsRun = 0;
        let testsPassed = 0;
        let testsFailed = 0;
        
        // Look for test result patterns
        const passMatches = stdout.match(/✅|PASS/g);
        const failMatches = stdout.match(/❌|FAIL/g);
        const totalMatches = stdout.match(/Total tests?: (\d+)/i);
        const passedMatches = stdout.match(/(?:Tests )?passed: (\d+)/i);
        const failedMatches = stdout.match(/(?:Tests )?failed: (\d+)/i);
        
        if (totalMatches) testsRun = parseInt(totalMatches[1]);
        if (passedMatches) testsPassed = parseInt(passedMatches[1]);
        if (failedMatches) testsFailed = parseInt(failedMatches[1]);
        
        // Fallback to counting symbols
        if (testsRun === 0) {
          testsPassed = passMatches ? passMatches.length : 0;
          testsFailed = failMatches ? failMatches.length : 0;
          testsRun = testsPassed + testsFailed;
        }
        
        const status = code === 0 ? 'PASS' : 'FAIL';
        
        resolve({
          suite: suiteName,
          status,
          duration,
          exitCode: code,
          tests: {
            total: testsRun,
            passed: testsPassed,
            failed: testsFailed
          },
          stdout: stdout.substring(0, 2000), // Limit output size
          stderr: stderr.substring(0, 1000),
          config: suiteConfig
        });
      });
      
      childProcess.on('error', (error) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        
        resolve({
          suite: suiteName,
          status: 'ERROR',
          duration,
          error: error.message,
          stdout: stdout.substring(0, 1000),
          stderr: stderr.substring(0, 1000)
        });
      });
      
    }).catch((error) => {
      const duration = Date.now() - startTime;
      resolve({
        suite: suiteName,
        status: 'MISSING',
        duration,
        error: `Test file not found: ${suiteConfig.file}`,
        stdout: '',
        stderr: ''
      });
    });
  });
}

async function runTestSuites(suitesToRun) {
  log('\n🚀 Starting VidPOD Lesson Management Comprehensive Test Suite', 'bright');
  log('=' * 80, 'bright');
  log(`📡 Base URL: ${CONFIG.BASE_URL}`, 'cyan');
  log(`⚡ Parallel execution: ${CONFIG.PARALLEL_SUITES}`, 'cyan');
  log(`📊 Suites to run: ${suitesToRun.length}`, 'cyan');
  
  masterResults.start_time = new Date();
  const startTime = Date.now();
  
  // Ensure output directories exist
  await fs.mkdir(CONFIG.REPORT_PATH, { recursive: true }).catch(() => {});
  await fs.mkdir(CONFIG.SCREENSHOTS_PATH, { recursive: true }).catch(() => {});
  
  let suiteResults = [];
  
  if (CONFIG.PARALLEL_SUITES) {
    log('\n🔄 Running test suites in parallel...', 'bright');
    
    // Group suites by priority for staged parallel execution
    const priorityGroups = {};
    suitesToRun.forEach(suiteName => {
      const priority = TEST_SUITES[suiteName].priority;
      if (!priorityGroups[priority]) priorityGroups[priority] = [];
      priorityGroups[priority].push(suiteName);
    });
    
    // Execute priority groups sequentially, suites within groups in parallel
    for (const priority of Object.keys(priorityGroups).sort((a, b) => a - b)) {
      const group = priorityGroups[priority];
      log(`\n📋 Priority ${priority} suites: ${group.join(', ')}`, 'yellow');
      
      const groupPromises = group.map(suiteName => 
        runTestSuite(suiteName, TEST_SUITES[suiteName])
      );
      
      const groupResults = await Promise.all(groupPromises);
      suiteResults.push(...groupResults);
      
      // Log group completion
      const groupPassed = groupResults.filter(r => r.status === 'PASS').length;
      log(`   Priority ${priority} complete: ${groupPassed}/${group.length} passed`, 
        groupPassed === group.length ? 'green' : 'yellow');
    }
    
  } else {
    log('\n🔄 Running test suites sequentially...', 'bright');
    
    // Sort by priority
    const sortedSuites = suitesToRun.sort((a, b) => 
      TEST_SUITES[a].priority - TEST_SUITES[b].priority
    );
    
    for (const suiteName of sortedSuites) {
      const result = await runTestSuite(suiteName, TEST_SUITES[suiteName]);
      suiteResults.push(result);
      
      // Log intermediate result
      if (result.status === 'PASS') {
        logSuite(result.suite, 'PASS', 
          `${result.tests.passed}/${result.tests.total} tests passed`, result.duration);
      } else {
        logSuite(result.suite, result.status, 
          result.error || `${result.tests.failed}/${result.tests.total} tests failed`, result.duration);
      }
    }
  }
  
  masterResults.end_time = new Date();
  masterResults.total_duration = Date.now() - startTime;
  masterResults.suite_results = suiteResults;
  
  // Aggregate results
  masterResults.suites_run = suiteResults.length;
  masterResults.suites_passed = suiteResults.filter(r => r.status === 'PASS').length;
  masterResults.suites_failed = suiteResults.filter(r => r.status === 'FAIL' || r.status === 'ERROR' || r.status === 'TIMEOUT').length;
  
  masterResults.total_tests = suiteResults.reduce((sum, r) => sum + (r.tests?.total || 0), 0);
  masterResults.total_passed = suiteResults.reduce((sum, r) => sum + (r.tests?.passed || 0), 0);
  masterResults.total_failed = suiteResults.reduce((sum, r) => sum + (r.tests?.failed || 0), 0);
  
  // Calculate overall score (weighted by suite importance)
  let totalWeight = 0;
  let weightedScore = 0;
  
  suiteResults.forEach(result => {
    const weight = result.config ? (5 - result.config.priority) : 1; // Higher priority = higher weight
    totalWeight += weight;
    
    if (result.status === 'PASS') {
      weightedScore += weight * 100;
    } else if (result.status === 'FAIL' && result.tests) {
      const suiteScore = result.tests.total > 0 ? (result.tests.passed / result.tests.total) * 100 : 0;
      weightedScore += weight * suiteScore;
    }
  });
  
  masterResults.overall_score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  
  return suiteResults;
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

async function generateComprehensiveReport(suiteResults) {
  log('\n📊 COMPREHENSIVE TEST SUITE RESULTS', 'bright');
  log('=' * 80, 'bright');
  
  // Summary statistics
  log(`⏱️  Total execution time: ${Math.round(masterResults.total_duration / 1000)}s`, 'cyan');
  log(`📦 Test suites run: ${masterResults.suites_run}`, 'cyan');
  log(`✅ Suites passed: ${masterResults.suites_passed}`, 'green');
  log(`❌ Suites failed: ${masterResults.suites_failed}`, masterResults.suites_failed > 0 ? 'red' : 'green');
  log(`📈 Total tests: ${masterResults.total_tests}`, 'cyan');
  log(`🎯 Overall success rate: ${Math.round((masterResults.total_passed / masterResults.total_tests) * 100)}%`, 'magenta');
  log(`🏆 Overall quality score: ${masterResults.overall_score}/100`, 
    masterResults.overall_score >= 80 ? 'green' : masterResults.overall_score >= 60 ? 'yellow' : 'red');
  
  // Suite-by-suite breakdown
  log('\n📋 Test Suite Results:', 'bright');
  
  // Group by category
  const categories = {};
  suiteResults.forEach(result => {
    const category = result.config ? result.config.category : 'uncategorized';
    if (!categories[category]) categories[category] = [];
    categories[category].push(result);
  });
  
  Object.entries(categories).forEach(([category, results]) => {
    log(`\n   ${category.toUpperCase()}:`, 'bright');
    
    results.forEach(result => {
      const status = result.status;
      const statusColor = status === 'PASS' ? 'green' : 
                         status === 'FAIL' ? 'red' : 
                         status === 'TIMEOUT' ? 'yellow' : 'red';
      const duration = Math.round(result.duration / 1000);
      
      log(`     ${status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'} ${result.suite}: ${status}`, statusColor);
      
      if (result.tests && result.tests.total > 0) {
        log(`       Tests: ${result.tests.passed}/${result.tests.total} passed (${duration}s)`, 'cyan');
      } else {
        log(`       Duration: ${duration}s`, 'cyan');
      }
      
      if (result.error) {
        log(`       Error: ${result.error}`, 'red');
      }
      
      if (result.status !== 'PASS' && result.stderr) {
        const errorLines = result.stderr.split('\n').filter(line => 
          line.includes('Error') || line.includes('FAIL') || line.includes('✗')
        ).slice(0, 3);
        
        errorLines.forEach(line => {
          log(`       ${line.trim()}`, 'red');
        });
      }
    });
  });
  
  // Performance analysis
  log('\n⚡ Performance Analysis:', 'bright');
  const avgDuration = masterResults.total_duration / masterResults.suites_run;
  log(`   Average suite duration: ${Math.round(avgDuration / 1000)}s`, 'cyan');
  
  const slowestSuite = suiteResults.reduce((max, r) => r.duration > max.duration ? r : max, { duration: 0 });
  if (slowestSuite.duration > 0) {
    log(`   Slowest suite: ${slowestSuite.suite} (${Math.round(slowestSuite.duration / 1000)}s)`, 'cyan');
  }
  
  const fastestSuite = suiteResults.reduce((min, r) => r.duration < min.duration ? r : min, { duration: Infinity });
  if (fastestSuite.duration < Infinity) {
    log(`   Fastest suite: ${fastestSuite.suite} (${Math.round(fastestSuite.duration / 1000)}s)`, 'cyan');
  }
  
  // Quality gates
  log('\n🚪 Quality Gates Assessment:', 'bright');
  
  const qualityGates = [
    {
      name: 'Database Integrity',
      condition: () => {
        const dbResult = suiteResults.find(r => r.suite === 'database');
        return dbResult && dbResult.status === 'PASS';
      },
      critical: true
    },
    {
      name: 'API Functionality',
      condition: () => {
        const apiResult = suiteResults.find(r => r.suite === 'api');
        return apiResult && apiResult.status === 'PASS';
      },
      critical: true
    },
    {
      name: 'Security Compliance',
      condition: () => {
        const secResult = suiteResults.find(r => r.suite === 'security');
        return secResult && (secResult.status === 'PASS' || (secResult.tests && secResult.tests.passed >= secResult.tests.total * 0.8));
      },
      critical: true
    },
    {
      name: 'User Experience',
      condition: () => {
        const frontendResult = suiteResults.find(r => r.suite === 'frontend');
        const teacherResult = suiteResults.find(r => r.suite === 'teacher_workflows');
        const studentResult = suiteResults.find(r => r.suite === 'student_experience');
        
        const uxSuites = [frontendResult, teacherResult, studentResult].filter(Boolean);
        const passedUxSuites = uxSuites.filter(r => r.status === 'PASS');
        
        return passedUxSuites.length >= uxSuites.length * 0.7; // 70% of UX suites must pass
      },
      critical: false
    },
    {
      name: 'Overall System Quality',
      condition: () => masterResults.overall_score >= 75,
      critical: false
    }
  ];
  
  let criticalGatesFailed = 0;
  let totalGatesFailed = 0;
  
  qualityGates.forEach(gate => {
    const passed = gate.condition();
    const status = passed ? 'PASS' : 'FAIL';
    const color = passed ? 'green' : gate.critical ? 'red' : 'yellow';
    const symbol = passed ? '✅' : gate.critical ? '🚨' : '⚠️';
    
    log(`   ${symbol} ${gate.name}: ${status}`, color);
    
    if (!passed) {
      totalGatesFailed++;
      if (gate.critical) criticalGatesFailed++;
    }
  });
  
  // Failed tests summary
  const failedSuites = suiteResults.filter(r => r.status !== 'PASS');
  if (failedSuites.length > 0) {
    log('\n❌ Failed Test Suites:', 'bright');
    failedSuites.forEach(suite => {
      log(`   • ${suite.suite}: ${suite.status}`, 'red');
      if (suite.error) {
        log(`     ${suite.error}`, 'cyan');
      }
    });
  }
  
  // Generate JSON report
  const report = {
    timestamp: masterResults.start_time.toISOString(),
    duration: masterResults.total_duration,
    summary: {
      suites_run: masterResults.suites_run,
      suites_passed: masterResults.suites_passed,
      suites_failed: masterResults.suites_failed,
      total_tests: masterResults.total_tests,
      total_passed: masterResults.total_passed,
      total_failed: masterResults.total_failed,
      overall_score: masterResults.overall_score,
      success_rate: Math.round((masterResults.total_passed / masterResults.total_tests) * 100)
    },
    quality_gates: {
      critical_failed: criticalGatesFailed,
      total_failed: totalGatesFailed,
      assessment: criticalGatesFailed > 0 ? 'CRITICAL_FAILURE' : 
                  totalGatesFailed > 0 ? 'NEEDS_IMPROVEMENT' : 'PASSED'
    },
    suite_results: suiteResults.map(r => ({
      suite: r.suite,
      status: r.status,
      duration: r.duration,
      tests: r.tests,
      category: r.config?.category,
      priority: r.config?.priority,
      error: r.error
    })),
    performance_metrics: {
      average_duration: avgDuration,
      slowest_suite: slowestSuite.suite,
      fastest_suite: fastestSuite.suite,
      parallel_execution: CONFIG.PARALLEL_SUITES
    },
    environment: {
      base_url: CONFIG.BASE_URL,
      node_version: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    }
  };
  
  // Save comprehensive report
  try {
    await fs.writeFile(
      path.join(CONFIG.REPORT_PATH, 'comprehensive-test-report.json'),
      JSON.stringify(report, null, 2)
    );
    log(`\n📄 Comprehensive report saved to: ${CONFIG.REPORT_PATH}/comprehensive-test-report.json`, 'cyan');
  } catch (error) {
    log(`\n⚠️  Could not save comprehensive report: ${error.message}`, 'yellow');
  }
  
  // Final assessment
  if (criticalGatesFailed > 0) {
    log('\n🚨 CRITICAL QUALITY GATES FAILED!', 'red');
    log('   System is NOT ready for production deployment.', 'red');
    log('   Address critical issues before proceeding.', 'red');
  } else if (masterResults.overall_score >= 85 && totalGatesFailed === 0) {
    log('\n🏆 EXCELLENT! ALL QUALITY GATES PASSED!', 'green');
    log('   VidPOD Lesson Management System is ready for production.', 'green');
    log(`   Overall quality score: ${masterResults.overall_score}/100`, 'green');
  } else if (masterResults.overall_score >= 70) {
    log('\n✅ GOOD QUALITY - MINOR IMPROVEMENTS NEEDED', 'yellow');
    log('   System is mostly ready with some areas for improvement.', 'yellow');
    log(`   Overall quality score: ${masterResults.overall_score}/100`, 'yellow');
  } else {
    log('\n⚠️  QUALITY CONCERNS - SIGNIFICANT IMPROVEMENTS NEEDED', 'red');
    log('   Address identified issues before production deployment.', 'red');
    log(`   Overall quality score: ${masterResults.overall_score}/100`, 'red');
  }
  
  return report;
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const suiteFilter = args.find(arg => arg.startsWith('--suite='))?.split('=')[1];
  const helpRequested = args.includes('--help') || args.includes('-h');
  
  if (helpRequested) {
    console.log(`
VidPOD Lesson Management Comprehensive Test Suite

Usage: node test-lesson-comprehensive-suite.js [options]

Options:
  --suite=SUITE    Run specific test suite(s)
                   Options: all, database, api, frontend, teacher_workflows, 
                           student_experience, security
                   Multiple suites: --suite=database,api,security
  --help, -h       Show this help message

Examples:
  node test-lesson-comprehensive-suite.js                    # Run all suites
  node test-lesson-comprehensive-suite.js --suite=all       # Run all suites  
  node test-lesson-comprehensive-suite.js --suite=database  # Database only
  node test-lesson-comprehensive-suite.js --suite=api,security # API and Security

Available Test Suites:
${Object.entries(TEST_SUITES).map(([key, suite]) => 
  `  ${key.padEnd(20)} - ${suite.description}`
).join('\n')}
`);
    process.exit(0);
  }
  
  // Determine which suites to run
  let suitesToRun = Object.keys(TEST_SUITES);
  
  if (suiteFilter && suiteFilter !== 'all') {
    const requestedSuites = suiteFilter.split(',').map(s => s.trim());
    const validSuites = requestedSuites.filter(s => TEST_SUITES[s]);
    const invalidSuites = requestedSuites.filter(s => !TEST_SUITES[s]);
    
    if (invalidSuites.length > 0) {
      log(`Invalid test suites: ${invalidSuites.join(', ')}`, 'red');
      log(`Available suites: ${Object.keys(TEST_SUITES).join(', ')}`, 'yellow');
      process.exit(1);
    }
    
    suitesToRun = validSuites;
  }
  
  try {
    // Run test suites
    const suiteResults = await runTestSuites(suitesToRun);
    
    // Generate comprehensive report
    const report = await generateComprehensiveReport(suiteResults);
    
    // Determine exit code
    const criticalFailures = report.quality_gates.critical_failed;
    const overallScore = report.summary.overall_score;
    
    if (criticalFailures > 0) {
      process.exit(2); // Critical failures
    } else if (overallScore < 60) {
      process.exit(1); // Poor quality
    } else {
      process.exit(0); // Success
    }
    
  } catch (error) {
    log(`💥 Fatal error: ${error.message}`, 'red');
    console.error(error.stack);
    process.exit(3);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  log('\n\nReceived SIGINT, cleaning up...', 'yellow');
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\n\nReceived SIGTERM, cleaning up...', 'yellow');
  process.exit(143);
});

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  runTestSuites,
  generateComprehensiveReport,
  TEST_SUITES,
  CONFIG
};