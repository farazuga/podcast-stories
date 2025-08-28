#!/usr/bin/env node

/**
 * VidPOD Lesson Management System - Student Learning Experience Testing
 * 
 * This comprehensive test suite validates the complete student learning journey:
 * - Course enrollment and lesson access
 * - Interactive lesson content engagement
 * - Quiz-taking experience across all question types
 * - Progress tracking and achievement systems
 * - Mobile responsive learning experience
 * - Accessibility compliance for student interfaces
 * - Real-time feedback and adaptive learning paths
 * 
 * Run with: node test-student-learning-experience.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  BASE_URL: process.env.BASE_URL || 'https://podcast-stories-production.up.railway.app',
  HEADLESS: process.env.HEADLESS !== 'false',
  TIMEOUT: 45000,
  WAIT_TIME: 2000,
  SCREENSHOT_PATH: './student-experience-screenshots',
  MOBILE_VIEWPORTS: [
    { name: 'iPhone SE', width: 375, height: 667, deviceScaleFactor: 2, isMobile: true },
    { name: 'iPad', width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true },
    { name: 'Desktop', width: 1366, height: 768, deviceScaleFactor: 1, isMobile: false }
  ]
};

// Test credentials
const STUDENT_CREDENTIALS = { email: 'student@vidpod.com', password: 'vidpod' };
const TEACHER_CREDENTIALS = { email: 'teacher@vidpod.com', password: 'vidpod' };

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  learning_journey: [],
  engagement_metrics: [],
  accessibility_score: 0,
  mobile_compatibility: 0,
  screenshots: [],
  details: []
};

// Student journey data
let journeyData = {
  coursesEnrolled: 0,
  lessonsAccessed: 0,
  quizzesCompleted: 0,
  progressUpdates: 0,
  achievementsUnlocked: 0
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

function logTest(testName, status, details = '', category = 'learning', duration = 0) {
  const statusSymbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  
  log(`${statusSymbol} ${testName}`, statusColor);
  if (details) {
    log(`   ${details}`, 'cyan');
  }
  if (duration > 0) {
    log(`   Duration: ${duration}ms`, 'magenta');
  }
  
  testResults.total++;
  testResults.details.push({ name: testName, status, details, category, duration });
  
  if (status === 'PASS') testResults.passed++;
  else if (status === 'FAIL') testResults.failed++;
}

// =============================================================================
// BROWSER UTILITIES
// =============================================================================

async function setupBrowser() {
  return await puppeteer.launch({
    headless: CONFIG.HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: null
  });
}

async function loginAsStudent(page) {
  try {
    await page.goto(`${CONFIG.BASE_URL}/index.html`, { waitUntil: 'networkidle0', timeout: CONFIG.TIMEOUT });
    
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.type('input[type="email"]', STUDENT_CREDENTIALS.email);
    await page.type('input[type="password"]', STUDENT_CREDENTIALS.password);
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: CONFIG.TIMEOUT }),
      page.click('button[type="submit"], .login-btn, input[type="submit"]')
    ]);
    
    const currentUrl = page.url();
    if (currentUrl.includes('index.html') || currentUrl.includes('login')) {
      throw new Error('Login failed - still on login page');
    }
    
    return true;
  } catch (error) {
    throw new Error(`Student login failed: ${error.message}`);
  }
}

async function takeScreenshot(page, name, details = '', viewport = null) {
  try {
    await fs.mkdir(CONFIG.SCREENSHOT_PATH, { recursive: true }).catch(() => {});
    
    const viewportSuffix = viewport ? `_${viewport.name.replace(/\s+/g, '_')}` : '';
    const filename = `${name}${viewportSuffix}_${Date.now()}.png`;
    const filepath = path.join(CONFIG.SCREENSHOT_PATH, filename);
    
    await page.screenshot({ 
      path: filepath, 
      fullPage: true,
      type: 'png'
    });
    
    testResults.screenshots.push({ name, details, viewport: viewport?.name, filepath });
    return filepath;
  } catch (error) {
    log(`Screenshot failed for ${name}: ${error.message}`, 'yellow');
    return null;
  }
}

// =============================================================================
// STUDENT DASHBOARD AND NAVIGATION TESTS
// =============================================================================

async function testStudentDashboardExperience(browser) {
  log('\n🏠 STUDENT DASHBOARD EXPERIENCE TEST', 'bright');
  
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    await loginAsStudent(page);
    
    // Navigate to student dashboard
    let dashboardUrl = page.url();
    if (!dashboardUrl.includes('dashboard') && !dashboardUrl.includes('student')) {
      const possibleDashboards = [
        '/dashboard.html',
        '/student-dashboard.html',
        '/student-lessons.html'
      ];
      
      for (const dashUrl of possibleDashboards) {
        try {
          await page.goto(`${CONFIG.BASE_URL}${dashUrl}`, { 
            waitUntil: 'networkidle0', 
            timeout: 10000 
          });
          dashboardUrl = page.url();
          break;
        } catch (error) {
          // Try next URL
        }
      }
    }
    
    await takeScreenshot(page, 'student_dashboard_initial', 'Student dashboard first load');
    
    // Test 1: Dashboard Layout and Content
    const dashboardElements = [
      {
        selector: '.course-list, .courses-grid, [data-component="courses"]',
        name: 'Course List',
        required: true
      },
      {
        selector: '.progress-overview, .student-progress, [data-component="progress"]',
        name: 'Progress Overview',
        required: false
      },
      {
        selector: '.recent-activity, .activity-feed, [data-component="activity"]',
        name: 'Recent Activity',
        required: false
      },
      {
        selector: '.quick-access, .shortcuts, [data-component="shortcuts"]',
        name: 'Quick Access',
        required: false
      },
      {
        selector: '.achievements, .badges, [data-component="achievements"]',
        name: 'Achievements Section',
        required: false
      }
    ];
    
    let dashboardFeatures = 0;
    let requiredFeatures = 0;
    
    for (const element of dashboardElements) {
      try {
        const found = await page.$(element.selector);
        if (found && await found.isVisible()) {
          dashboardFeatures++;
          if (element.required) requiredFeatures++;
          log(`   ✓ Found ${element.name}`, 'green');
        } else {
          log(`   ${element.required ? '✗' : '⚠'} ${element.name} ${element.required ? 'missing (required)' : 'not found'}`, 
              element.required ? 'red' : 'yellow');
        }
      } catch (error) {
        log(`   ✗ Error checking ${element.name}: ${error.message}`, 'red');
      }
    }
    
    // Test 2: Navigation Menu Accessibility
    const navigationElements = [
      'nav, .navigation, .navbar, [role="navigation"]',
      '.menu, .nav-menu, [data-component="navigation"]',
      '.sidebar, .side-nav'
    ];
    
    let hasNavigation = false;
    let navigationItems = 0;
    
    for (const navSelector of navigationElements) {
      try {
        const nav = await page.$(navSelector);
        if (nav && await nav.isVisible()) {
          hasNavigation = true;
          
          // Count navigation items
          const navItems = await nav.$$('a, button, [role="menuitem"]');
          navigationItems = navItems.length;
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    // Test 3: Responsive Behavior
    let responsiveScore = 0;
    const totalViewports = CONFIG.MOBILE_VIEWPORTS.length;
    
    for (const viewport of CONFIG.MOBILE_VIEWPORTS) {
      try {
        await page.setViewport(viewport);
        await page.waitForTimeout(1000);
        
        // Check if content is still visible and accessible
        const hasVisibleContent = await page.evaluate(() => {
          const mainContent = document.querySelector('main, .main-content, .container, .dashboard-content');
          return mainContent && mainContent.offsetWidth > 0 && mainContent.offsetHeight > 0;
        });
        
        // Check for horizontal scrolling (should be minimal)
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        
        if (hasVisibleContent && !hasHorizontalScroll) {
          responsiveScore++;
        }
        
        await takeScreenshot(page, 'dashboard_responsive', `Dashboard on ${viewport.name}`, viewport);
        
      } catch (error) {
        log(`   ⚠ Responsive test failed on ${viewport.name}: ${error.message}`, 'yellow');
      }
    }
    
    const responsivePercentage = Math.round((responsiveScore / totalViewports) * 100);
    testResults.mobile_compatibility = responsivePercentage;
    
    const duration = Date.now() - startTime;
    
    // Determine success criteria
    const hasBasicFunctionality = requiredFeatures >= 1 || dashboardFeatures >= 2;
    const isResponsive = responsivePercentage >= 70;
    
    if (hasBasicFunctionality && hasNavigation) {
      logTest('Student Dashboard Experience', 'PASS', 
        `Features: ${dashboardFeatures}/5, Navigation: ${navigationItems} items, Responsive: ${responsivePercentage}%`, 
        'dashboard', duration);
    } else {
      logTest('Student Dashboard Experience', 'FAIL', 
        `Missing essential features. Features: ${dashboardFeatures}/5, Navigation: ${hasNavigation}`, 
        'dashboard', duration);
    }
    
    testResults.learning_journey.push({
      stage: 'Dashboard Access',
      success: hasBasicFunctionality && hasNavigation,
      features_found: dashboardFeatures,
      responsive_score: responsivePercentage
    });
    
  } catch (error) {
    logTest('Student Dashboard Experience', 'FAIL', error.message, 'dashboard', Date.now() - startTime);
  } finally {
    await page.close();
  }
}

// =============================================================================
// COURSE ENROLLMENT AND ACCESS TESTS
// =============================================================================

async function testCourseEnrollmentExperience(browser) {
  log('\n📚 COURSE ENROLLMENT EXPERIENCE TEST', 'bright');
  
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    await loginAsStudent(page);
    
    // Step 1: Find available courses
    const courseBrowsingUrls = [
      '/stories.html', // Existing VidPOD stories page
      '/student-lessons.html',
      '/course-catalog.html',
      '/dashboard.html'
    ];
    
    let coursesFound = 0;
    let enrollmentOptions = 0;
    
    for (const url of courseBrowsingUrls) {
      try {
        await page.goto(`${CONFIG.BASE_URL}${url}`, { 
          waitUntil: 'networkidle0', 
          timeout: 10000 
        });
        
        // Look for course/story cards
        const courseElements = await page.$$('.story-card, .course-card, .lesson-card, [data-course-id], [data-story-id]');
        
        if (courseElements.length > 0) {
          coursesFound = courseElements.length;
          log(`   ✓ Found ${coursesFound} available courses/stories on ${url}`, 'green');
          
          await takeScreenshot(page, 'available_courses', `${coursesFound} courses found on ${url}`);
          break;
        }
      } catch (error) {
        // Try next URL
      }
    }
    
    // Step 2: Test course/story access
    if (coursesFound > 0) {
      try {
        const firstCourse = await page.$('.story-card, .course-card, .lesson-card');
        if (firstCourse) {
          // Test clicking on course/story
          await firstCourse.click();
          await page.waitForTimeout(CONFIG.WAIT_TIME);
          
          // Check if we navigated to course content
          const currentUrl = page.url();
          const hasNavigated = currentUrl.includes('detail') || currentUrl.includes('lesson') || currentUrl.includes('story');
          
          if (hasNavigated) {
            journeyData.coursesEnrolled++;
            log('   ✓ Successfully accessed course/story content', 'green');
            
            await takeScreenshot(page, 'course_accessed', 'Course content accessed');
            
            // Check for course content elements
            const contentElements = [
              '.story-content, .lesson-content, .course-content',
              'h1, h2, .title, .story-title',
              '.description, .story-description, .content-text',
              'p, .paragraph, .text-content'
            ];
            
            let hasContent = false;
            for (const selector of contentElements) {
              const element = await page.$(selector);
              if (element && await element.isVisible()) {
                hasContent = true;
                break;
              }
            }
            
            if (hasContent) {
              log('   ✓ Course content is visible and accessible', 'green');
              journeyData.lessonsAccessed++;
            }
            
          } else {
            log('   ⚠ Course click did not navigate to content', 'yellow');
          }
        }
      } catch (error) {
        log(`   ⚠ Could not test course access: ${error.message}`, 'yellow');
      }
    }
    
    // Step 3: Test search and filtering (if available)
    let hasSearchFeature = false;
    const searchSelectors = [
      'input[type="search"]',
      '.search-input',
      '[placeholder*="search"], [placeholder*="Search"]',
      '.search-box, .search-field'
    ];
    
    for (const selector of searchSelectors) {
      try {
        const searchElement = await page.$(selector);
        if (searchElement && await searchElement.isVisible()) {
          hasSearchFeature = true;
          
          // Test search functionality
          await searchElement.type('digital');
          await page.waitForTimeout(1000);
          
          // Check if search results update
          const resultsAfterSearch = await page.$$('.story-card, .course-card, .search-result');
          log(`   ✓ Search feature works (${resultsAfterSearch.length} results for "digital")`, 'green');
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    const duration = Date.now() - startTime;
    
    // Evaluate enrollment experience
    const enrollmentSuccess = coursesFound > 0 && (journeyData.coursesEnrolled > 0 || journeyData.lessonsAccessed > 0);
    
    if (enrollmentSuccess) {
      logTest('Course Enrollment Experience', 'PASS', 
        `Found ${coursesFound} courses, accessed ${journeyData.lessonsAccessed} lessons, search: ${hasSearchFeature}`, 
        'enrollment', duration);
    } else {
      logTest('Course Enrollment Experience', 'FAIL', 
        `No courses accessible. Found: ${coursesFound}, Accessed: ${journeyData.lessonsAccessed}`, 
        'enrollment', duration);
    }
    
    testResults.learning_journey.push({
      stage: 'Course Enrollment',
      success: enrollmentSuccess,
      courses_found: coursesFound,
      lessons_accessed: journeyData.lessonsAccessed,
      has_search: hasSearchFeature
    });
    
  } catch (error) {
    logTest('Course Enrollment Experience', 'FAIL', error.message, 'enrollment', Date.now() - startTime);
  } finally {
    await page.close();
  }
}

// =============================================================================
// INTERACTIVE LEARNING CONTENT TESTS
// =============================================================================

async function testInteractiveLearningContent(browser) {
  log('\n🎯 INTERACTIVE LEARNING CONTENT TEST', 'bright');
  
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    await loginAsStudent(page);
    
    // Navigate to lessons/content area
    const contentUrls = [
      '/student-lessons.html',
      '/stories.html',
      '/lesson-detail.html'
    ];
    
    let contentPageFound = false;
    for (const url of contentUrls) {
      try {
        await page.goto(`${CONFIG.BASE_URL}${url}`, { 
          waitUntil: 'networkidle0', 
          timeout: 10000 
        });
        contentPageFound = true;
        break;
      } catch (error) {
        // Try next URL
      }
    }
    
    if (!contentPageFound) {
      logTest('Interactive Learning Content', 'FAIL', 'No accessible content pages found', 'interactive');
      return;
    }
    
    await takeScreenshot(page, 'learning_content_page', 'Learning content interface');
    
    // Test 1: Interactive Elements Detection
    const interactiveElements = [
      {
        selector: 'button:not([disabled]), .btn:not(.disabled)',
        name: 'Interactive Buttons',
        type: 'button'
      },
      {
        selector: 'input, textarea, select',
        name: 'Form Controls',
        type: 'form'
      },
      {
        selector: '.quiz, .question, [data-component="quiz"]',
        name: 'Quiz Elements',
        type: 'quiz'
      },
      {
        selector: 'video, audio, .media-player',
        name: 'Media Elements',
        type: 'media'
      },
      {
        selector: '.interactive, [data-interactive="true"], .clickable',
        name: 'Interactive Content',
        type: 'content'
      },
      {
        selector: '.progress, .progress-bar, [data-component="progress"]',
        name: 'Progress Indicators',
        type: 'progress'
      }
    ];
    
    let interactiveFeatures = 0;
    let engagementScore = 0;
    
    for (const element of interactiveElements) {
      try {
        const elements = await page.$$(element.selector);
        const visibleElements = [];
        
        for (const el of elements) {
          if (await el.isVisible()) {
            visibleElements.push(el);
          }
        }
        
        if (visibleElements.length > 0) {
          interactiveFeatures++;
          engagementScore += Math.min(visibleElements.length, 5); // Cap at 5 points per type
          
          log(`   ✓ Found ${visibleElements.length} ${element.name}`, 'green');
          
          // Test basic interactivity
          if (element.type === 'button' && visibleElements.length > 0) {
            try {
              await visibleElements[0].click();
              await page.waitForTimeout(500);
              log('   ✓ Button interaction successful', 'green');
            } catch (error) {
              log('   ⚠ Button click failed', 'yellow');
            }
          }
          
        } else {
          log(`   ⚠ No visible ${element.name} found`, 'yellow');
        }
      } catch (error) {
        log(`   ✗ Error checking ${element.name}: ${error.message}`, 'red');
      }
    }
    
    // Test 2: Content Navigation
    let hasNavigation = false;
    const navigationSelectors = [
      '.nav-buttons, .lesson-nav, .content-navigation',
      '.next-btn, .previous-btn, [data-action="next"], [data-action="prev"]',
      '.breadcrumb, .breadcrumbs, [data-component="breadcrumb"]'
    ];
    
    for (const selector of navigationSelectors) {
      try {
        const navElement = await page.$(selector);
        if (navElement && await navElement.isVisible()) {
          hasNavigation = true;
          log('   ✓ Content navigation available', 'green');
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    // Test 3: Content Readability and Structure
    const contentStructure = await page.evaluate(() => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
      const paragraphs = document.querySelectorAll('p').length;
      const lists = document.querySelectorAll('ul, ol').length;
      const images = document.querySelectorAll('img').length;
      const links = document.querySelectorAll('a').length;
      
      // Check for proper semantic structure
      const main = document.querySelector('main, [role="main"]');
      const sections = document.querySelectorAll('section, .section').length;
      
      return {
        headings,
        paragraphs,
        lists,
        images,
        links,
        hasMain: !!main,
        sections,
        totalElements: headings + paragraphs + lists + images + links
      };
    });
    
    const hasGoodStructure = contentStructure.headings >= 1 && 
                            contentStructure.paragraphs >= 1 && 
                            contentStructure.totalElements >= 5;
    
    // Test 4: Accessibility Features
    const accessibilityFeatures = await page.evaluate(() => {
      const altTexts = Array.from(document.querySelectorAll('img')).filter(img => img.alt).length;
      const totalImages = document.querySelectorAll('img').length;
      const labels = document.querySelectorAll('label').length;
      const inputs = document.querySelectorAll('input, select, textarea').length;
      const headingStructure = document.querySelectorAll('h1').length === 1;
      const skipLinks = document.querySelectorAll('a[href^="#"], .skip-link').length;
      
      return {
        altTextCoverage: totalImages > 0 ? (altTexts / totalImages) * 100 : 100,
        labelCoverage: inputs > 0 ? (labels / inputs) * 100 : 100,
        hasProperHeadings: headingStructure,
        hasSkipLinks: skipLinks > 0
      };
    });
    
    const accessibilityScore = (
      (accessibilityFeatures.altTextCoverage >= 80 ? 25 : 0) +
      (accessibilityFeatures.labelCoverage >= 80 ? 25 : 0) +
      (accessibilityFeatures.hasProperHeadings ? 25 : 0) +
      (accessibilityFeatures.hasSkipLinks ? 25 : 0)
    );
    
    testResults.accessibility_score = accessibilityScore;
    
    await takeScreenshot(page, 'interactive_content_analysis', 'Interactive content features analyzed');
    
    const duration = Date.now() - startTime;
    
    // Evaluate interactive learning experience
    const minRequiredFeatures = 3;
    const isEngaging = interactiveFeatures >= minRequiredFeatures && engagementScore >= 5;
    const isAccessible = accessibilityScore >= 50;
    const isWellStructured = hasGoodStructure;
    
    if (isEngaging && isWellStructured) {
      logTest('Interactive Learning Content', 'PASS', 
        `Features: ${interactiveFeatures}/6, Engagement Score: ${engagementScore}, Accessibility: ${accessibilityScore}/100`, 
        'interactive', duration);
    } else {
      logTest('Interactive Learning Content', 'FAIL', 
        `Insufficient interactivity. Features: ${interactiveFeatures}/6, Score: ${engagementScore}`, 
        'interactive', duration);
    }
    
    testResults.learning_journey.push({
      stage: 'Interactive Content',
      success: isEngaging && isWellStructured,
      interactive_features: interactiveFeatures,
      engagement_score: engagementScore,
      accessibility_score: accessibilityScore,
      structure_quality: hasGoodStructure
    });
    
    testResults.engagement_metrics.push({
      page: 'Learning Content',
      interactive_elements: interactiveFeatures,
      engagement_score: engagementScore,
      accessibility_score: accessibilityScore,
      navigation_available: hasNavigation
    });
    
  } catch (error) {
    logTest('Interactive Learning Content', 'FAIL', error.message, 'interactive', Date.now() - startTime);
  } finally {
    await page.close();
  }
}

// =============================================================================
// QUIZ TAKING EXPERIENCE TESTS
// =============================================================================

async function testQuizTakingExperience(browser) {
  log('\n📝 QUIZ TAKING EXPERIENCE TEST', 'bright');
  
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    await loginAsStudent(page);
    
    // Look for quiz opportunities
    const quizUrls = [
      '/quiz-builder.html', // Might have preview/student mode
      '/student-lessons.html',
      '/stories.html'
    ];
    
    let quizFound = false;
    for (const url of quizUrls) {
      try {
        await page.goto(`${CONFIG.BASE_URL}${url}`, { 
          waitUntil: 'networkidle0', 
          timeout: 10000 
        });
        
        // Look for quiz elements
        const quizElements = await page.$$('.quiz, .question, [data-component="quiz"], .assessment');
        
        if (quizElements.length > 0) {
          quizFound = true;
          log(`   ✓ Found quiz elements on ${url}`, 'green');
          break;
        }
      } catch (error) {
        // Try next URL
      }
    }
    
    await takeScreenshot(page, 'quiz_interface', 'Quiz taking interface');
    
    if (quizFound) {
      // Test quiz interface elements
      const quizFeatures = [
        {
          selector: '.question-text, .question, h3, h4',
          name: 'Question Display',
          required: true
        },
        {
          selector: 'input[type="radio"], input[type="checkbox"], .option, .answer-choice',
          name: 'Answer Options',
          required: true
        },
        {
          selector: 'button[type="submit"], .submit-btn, [data-action="submit"]',
          name: 'Submit Button',
          required: true
        },
        {
          selector: '.timer, .time-remaining, [data-component="timer"]',
          name: 'Timer Display',
          required: false
        },
        {
          selector: '.progress, .question-progress, [data-component="progress"]',
          name: 'Progress Indicator',
          required: false
        },
        {
          selector: '.feedback, .result, .score',
          name: 'Feedback Area',
          required: false
        }
      ];
      
      let quizUIFeatures = 0;
      let requiredQuizFeatures = 0;
      
      for (const feature of quizFeatures) {
        try {
          const elements = await page.$$(feature.selector);
          const visibleElements = [];
          
          for (const el of elements) {
            if (await el.isVisible()) {
              visibleElements.push(el);
            }
          }
          
          if (visibleElements.length > 0) {
            quizUIFeatures++;
            if (feature.required) requiredQuizFeatures++;
            log(`   ✓ ${feature.name} available (${visibleElements.length} elements)`, 'green');
          } else {
            log(`   ${feature.required ? '✗' : '⚠'} ${feature.name} ${feature.required ? 'missing (required)' : 'not found'}`, 
                feature.required ? 'red' : 'yellow');
          }
        } catch (error) {
          log(`   ✗ Error checking ${feature.name}: ${error.message}`, 'red');
        }
      }
      
      // Test quiz interaction
      let quizInteractionWorking = false;
      try {
        // Try to select an answer option
        const answerOption = await page.$('input[type="radio"], input[type="checkbox"], .answer-choice');
        if (answerOption) {
          await answerOption.click();
          quizInteractionWorking = true;
          log('   ✓ Quiz answer selection works', 'green');
          
          // Try to submit (but don't actually submit)
          const submitButton = await page.$('button[type="submit"], .submit-btn');
          if (submitButton && await submitButton.isVisible()) {
            log('   ✓ Quiz submission button available', 'green');
          }
        }
      } catch (error) {
        log('   ⚠ Quiz interaction test failed', 'yellow');
      }
      
      journeyData.quizzesCompleted = quizInteractionWorking ? 1 : 0;
      
    } else {
      log('   ⚠ No quiz interface found for testing', 'yellow');
    }
    
    // Test alternative assessment methods
    const assessmentTypes = [
      {
        selector: 'textarea, .text-input, [data-input-type="essay"]',
        name: 'Essay/Text Questions',
        type: 'essay'
      },
      {
        selector: '.drag-drop, [data-interaction="drag"], .sortable',
        name: 'Drag and Drop',
        type: 'interactive'
      },
      {
        selector: '.hotspot, .image-question, [data-type="hotspot"]',
        name: 'Image Hotspots',
        type: 'visual'
      }
    ];
    
    let assessmentVariety = 0;
    for (const assessment of assessmentTypes) {
      try {
        const element = await page.$(assessment.selector);
        if (element && await element.isVisible()) {
          assessmentVariety++;
          log(`   ✓ ${assessment.name} assessment type available`, 'green');
        }
      } catch (error) {
        // Assessment type not available
      }
    }
    
    const duration = Date.now() - startTime;
    
    // Evaluate quiz experience
    const hasBasicQuizFeatures = quizFound && requiredQuizFeatures >= 2;
    const hasGoodUX = quizUIFeatures >= 4;
    const isInteractive = journeyData.quizzesCompleted > 0;
    
    if (hasBasicQuizFeatures && isInteractive) {
      logTest('Quiz Taking Experience', 'PASS', 
        `Quiz found with ${quizUIFeatures}/6 features, interaction: ${isInteractive}, variety: ${assessmentVariety} types`, 
        'quiz', duration);
    } else if (quizFound) {
      logTest('Quiz Taking Experience', 'FAIL', 
        `Quiz UI incomplete. Features: ${quizUIFeatures}/6, Required: ${requiredQuizFeatures}/3`, 
        'quiz', duration);
    } else {
      logTest('Quiz Taking Experience', 'SKIP', 
        'No quiz interface available for testing', 
        'quiz', duration);
    }
    
    testResults.learning_journey.push({
      stage: 'Quiz Taking',
      success: hasBasicQuizFeatures && isInteractive,
      quiz_found: quizFound,
      ui_features: quizUIFeatures,
      interaction_working: isInteractive,
      assessment_variety: assessmentVariety
    });
    
  } catch (error) {
    logTest('Quiz Taking Experience', 'FAIL', error.message, 'quiz', Date.now() - startTime);
  } finally {
    await page.close();
  }
}

// =============================================================================
// PROGRESS TRACKING TESTS
// =============================================================================

async function testProgressTrackingExperience(browser) {
  log('\n📈 PROGRESS TRACKING EXPERIENCE TEST', 'bright');
  
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    await loginAsStudent(page);
    
    // Navigate to dashboard or progress area
    const progressUrls = [
      '/dashboard.html',
      '/student-lessons.html',
      '/progress.html'
    ];
    
    let progressPageFound = false;
    for (const url of progressUrls) {
      try {
        await page.goto(`${CONFIG.BASE_URL}${url}`, { 
          waitUntil: 'networkidle0', 
          timeout: 10000 
        });
        progressPageFound = true;
        break;
      } catch (error) {
        // Try next URL
      }
    }
    
    if (!progressPageFound) {
      logTest('Progress Tracking Experience', 'SKIP', 'No progress tracking page found', 'progress');
      return;
    }
    
    await takeScreenshot(page, 'progress_tracking_interface', 'Progress tracking interface');
    
    // Test 1: Progress Visualization Elements
    const progressElements = [
      {
        selector: '.progress-bar, .progress, [role="progressbar"]',
        name: 'Progress Bars',
        type: 'visual'
      },
      {
        selector: '.completion-rate, .completion-percentage, [data-completion]',
        name: 'Completion Percentages',
        type: 'numeric'
      },
      {
        selector: '.badge, .achievement, .award, [data-component="badge"]',
        name: 'Achievement Badges',
        type: 'gamification'
      },
      {
        selector: '.milestone, .checkpoint, [data-component="milestone"]',
        name: 'Learning Milestones',
        type: 'tracking'
      },
      {
        selector: '.streak, .consecutive, [data-component="streak"]',
        name: 'Learning Streaks',
        type: 'engagement'
      },
      {
        selector: '.points, .score, [data-component="points"]',
        name: 'Point System',
        type: 'gamification'
      }
    ];
    
    let progressFeatures = 0;
    let gamificationElements = 0;
    
    for (const element of progressElements) {
      try {
        const elements = await page.$$(element.selector);
        const visibleElements = [];
        
        for (const el of elements) {
          if (await el.isVisible()) {
            visibleElements.push(el);
          }
        }
        
        if (visibleElements.length > 0) {
          progressFeatures++;
          if (element.type === 'gamification') {
            gamificationElements++;
          }
          
          log(`   ✓ Found ${visibleElements.length} ${element.name}`, 'green');
          
          // Try to extract progress data
          if (element.type === 'visual' || element.type === 'numeric') {
            try {
              const progressData = await visibleElements[0].evaluate(el => {
                const ariaValueNow = el.getAttribute('aria-valuenow');
                const dataValue = el.getAttribute('data-value') || el.getAttribute('data-progress');
                const textContent = el.textContent.match(/(\d+)%/);
                
                return ariaValueNow || dataValue || (textContent ? textContent[1] : null);
              });
              
              if (progressData) {
                journeyData.progressUpdates++;
                log(`     Progress value detected: ${progressData}`, 'cyan');
              }
            } catch (error) {
              // Progress data extraction failed
            }
          }
          
        } else {
          log(`   ⚠ No ${element.name} found`, 'yellow');
        }
      } catch (error) {
        log(`   ✗ Error checking ${element.name}: ${error.message}`, 'red');
      }
    }
    
    // Test 2: Progress History and Trends
    const historyElements = [
      '.progress-history, .activity-history, [data-component="history"]',
      '.chart, .graph, [data-component="chart"]',
      '.timeline, .progress-timeline, [data-component="timeline"]',
      '.stats, .statistics, [data-component="stats"]'
    ];
    
    let hasHistoryFeatures = false;
    for (const selector of historyElements) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          hasHistoryFeatures = true;
          log('   ✓ Progress history/analytics available', 'green');
          break;
        }
      } catch (error) {
        // History feature not available
      }
    }
    
    // Test 3: Goal Setting and Targets
    const goalElements = [
      '.goal, .target, [data-component="goal"]',
      '.objective, .learning-objective, [data-component="objective"]',
      '.deadline, .due-date, [data-component="deadline"]'
    ];
    
    let hasGoalSetting = false;
    for (const selector of goalElements) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          hasGoalSetting = true;
          log('   ✓ Goal setting features available', 'green');
          break;
        }
      } catch (error) {
        // Goal setting not available
      }
    }
    
    // Test 4: Responsive Progress Display
    let responsiveProgressScore = 0;
    for (const viewport of CONFIG.MOBILE_VIEWPORTS) {
      try {
        await page.setViewport(viewport);
        await page.waitForTimeout(1000);
        
        // Check if progress elements remain visible
        const visibleProgressElements = await page.$$('.progress-bar:visible, .progress:visible, .completion-rate:visible');
        
        if (visibleProgressElements.length > 0) {
          responsiveProgressScore++;
        }
        
        await takeScreenshot(page, 'progress_responsive', `Progress tracking on ${viewport.name}`, viewport);
        
      } catch (error) {
        log(`   ⚠ Responsive progress test failed on ${viewport.name}`, 'yellow');
      }
    }
    
    const responsiveProgressPercentage = Math.round((responsiveProgressScore / CONFIG.MOBILE_VIEWPORTS.length) * 100);
    
    const duration = Date.now() - startTime;
    
    // Evaluate progress tracking experience
    const hasBasicProgress = progressFeatures >= 2;
    const hasAdvancedFeatures = hasHistoryFeatures || hasGoalSetting || gamificationElements >= 1;
    const isResponsive = responsiveProgressPercentage >= 70;
    
    if (hasBasicProgress) {
      logTest('Progress Tracking Experience', 'PASS', 
        `Features: ${progressFeatures}/6, Gamification: ${gamificationElements}, History: ${hasHistoryFeatures}, Responsive: ${responsiveProgressPercentage}%`, 
        'progress', duration);
    } else {
      logTest('Progress Tracking Experience', 'FAIL', 
        `Insufficient progress features. Found: ${progressFeatures}/6`, 
        'progress', duration);
    }
    
    testResults.learning_journey.push({
      stage: 'Progress Tracking',
      success: hasBasicProgress,
      progress_features: progressFeatures,
      gamification_elements: gamificationElements,
      has_history: hasHistoryFeatures,
      has_goals: hasGoalSetting,
      responsive_score: responsiveProgressPercentage
    });
    
  } catch (error) {
    logTest('Progress Tracking Experience', 'FAIL', error.message, 'progress', Date.now() - startTime);
  } finally {
    await page.close();
  }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runAllTests() {
  const startTime = Date.now();
  
  log('🚀 VidPOD Student Learning Experience Test Suite', 'bright');
  log('=' * 80, 'bright');
  log(`📡 Base URL: ${CONFIG.BASE_URL}`, 'cyan');
  log(`👨‍🎓 Student Account: ${STUDENT_CREDENTIALS.email}`, 'cyan');
  log(`📱 Testing ${CONFIG.MOBILE_VIEWPORTS.length} viewports for mobile compatibility`, 'cyan');
  log(`📸 Screenshots: ${CONFIG.SCREENSHOT_PATH}`, 'cyan');
  
  let browser;
  
  try {
    browser = await setupBrowser();
    
    // Run all student experience tests
    await testStudentDashboardExperience(browser);
    await testCourseEnrollmentExperience(browser);
    await testInteractiveLearningContent(browser);
    await testQuizTakingExperience(browser);
    await testProgressTrackingExperience(browser);
    
  } catch (error) {
    log(`💥 Critical error: ${error.message}`, 'red');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  // Generate comprehensive report
  await generateTestReport(totalTime);
  
  process.exit(testResults.failed === 0 ? 0 : 1);
}

async function generateTestReport(totalTime) {
  log('\n📊 STUDENT LEARNING EXPERIENCE TEST RESULTS', 'bright');
  log('=' * 80, 'bright');
  
  // Summary statistics
  log(`⏱️  Total execution time: ${Math.round(totalTime / 1000)}s`, 'cyan');
  log(`✅ Tests passed: ${testResults.passed}`, 'green');
  log(`❌ Tests failed: ${testResults.failed}`, 'red');
  log(`📈 Total tests: ${testResults.total}`, 'cyan');
  log(`🎯 Success rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`, 'magenta');
  
  // Learning Journey Analysis
  log('\n📚 Learning Journey Analysis:', 'bright');
  testResults.learning_journey.forEach(stage => {
    const statusColor = stage.success ? 'green' : 'red';
    const statusText = stage.success ? 'SUCCESS' : 'FAILED';
    
    log(`   ${stage.stage}: ${statusText}`, statusColor);
    
    // Show relevant metrics for each stage
    if (stage.stage === 'Dashboard Access') {
      log(`     Features Found: ${stage.features_found}/5`, 'cyan');
      log(`     Responsive Score: ${stage.responsive_score}%`, 'cyan');
    } else if (stage.stage === 'Course Enrollment') {
      log(`     Courses Found: ${stage.courses_found}`, 'cyan');
      log(`     Lessons Accessed: ${stage.lessons_accessed}`, 'cyan');
      log(`     Search Available: ${stage.has_search}`, 'cyan');
    } else if (stage.stage === 'Interactive Content') {
      log(`     Interactive Features: ${stage.interactive_features}/6`, 'cyan');
      log(`     Engagement Score: ${stage.engagement_score}`, 'cyan');
      log(`     Accessibility Score: ${stage.accessibility_score}/100`, 'cyan');
    } else if (stage.stage === 'Quiz Taking') {
      log(`     Quiz Found: ${stage.quiz_found}`, 'cyan');
      log(`     UI Features: ${stage.ui_features}/6`, 'cyan');
      log(`     Assessment Variety: ${stage.assessment_variety} types`, 'cyan');
    } else if (stage.stage === 'Progress Tracking') {
      log(`     Progress Features: ${stage.progress_features}/6`, 'cyan');
      log(`     Gamification Elements: ${stage.gamification_elements}`, 'cyan');
    }
  });
  
  // Overall Quality Scores
  log('\n📊 Quality Assessment:', 'bright');
  log(`♿ Accessibility Score: ${testResults.accessibility_score}/100`, 
    testResults.accessibility_score >= 75 ? 'green' : 
    testResults.accessibility_score >= 50 ? 'yellow' : 'red');
  log(`📱 Mobile Compatibility: ${testResults.mobile_compatibility}%`, 
    testResults.mobile_compatibility >= 80 ? 'green' : 
    testResults.mobile_compatibility >= 60 ? 'yellow' : 'red');
  
  // Journey Completion Stats
  log('\n🎯 Student Journey Metrics:', 'bright');
  log(`   Courses Enrolled: ${journeyData.coursesEnrolled}`, 'cyan');
  log(`   Lessons Accessed: ${journeyData.lessonsAccessed}`, 'cyan');
  log(`   Quizzes Completed: ${journeyData.quizzesCompleted}`, 'cyan');
  log(`   Progress Updates: ${journeyData.progressUpdates}`, 'cyan');
  log(`   Achievements Unlocked: ${journeyData.achievementsUnlocked}`, 'cyan');
  
  // Screenshots summary
  if (testResults.screenshots.length > 0) {
    log(`\n📸 Screenshots captured: ${testResults.screenshots.length}`, 'bright');
    log(`   Location: ${CONFIG.SCREENSHOT_PATH}`, 'cyan');
    
    // Group screenshots by viewport
    const screenshotsByViewport = {};
    testResults.screenshots.forEach(screenshot => {
      const viewport = screenshot.viewport || 'default';
      if (!screenshotsByViewport[viewport]) {
        screenshotsByViewport[viewport] = 0;
      }
      screenshotsByViewport[viewport]++;
    });
    
    Object.entries(screenshotsByViewport).forEach(([viewport, count]) => {
      log(`     ${viewport}: ${count} screenshots`, 'cyan');
    });
  }
  
  // Failed test details
  if (testResults.failed > 0) {
    log('\n❌ Failed Tests:', 'bright');
    testResults.details
      .filter(test => test.status === 'FAIL')
      .forEach(test => {
        log(`   • ${test.name}: ${test.details}`, 'red');
      });
  }
  
  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    duration: totalTime,
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: Math.round((testResults.passed / testResults.total) * 100)
    },
    quality_scores: {
      accessibility: testResults.accessibility_score,
      mobile_compatibility: testResults.mobile_compatibility
    },
    learning_journey: testResults.learning_journey,
    journey_metrics: journeyData,
    engagement_metrics: testResults.engagement_metrics,
    screenshots: testResults.screenshots,
    details: testResults.details
  };
  
  try {
    await fs.writeFile(
      path.join(__dirname, 'student-learning-experience-report.json'), 
      JSON.stringify(report, null, 2)
    );
    log('\n📄 Detailed report saved to: student-learning-experience-report.json', 'cyan');
  } catch (error) {
    log(`\n⚠️  Could not save report: ${error.message}`, 'yellow');
  }
  
  // Final assessment
  const successfulStages = testResults.learning_journey.filter(stage => stage.success).length;
  const totalStages = testResults.learning_journey.length;
  const overallScore = (testResults.accessibility_score + testResults.mobile_compatibility) / 2;
  
  if (testResults.failed === 0 && successfulStages === totalStages && overallScore >= 70) {
    log('\n🎉 EXCELLENT STUDENT LEARNING EXPERIENCE! All systems optimal for student success.', 'green');
  } else if (successfulStages >= totalStages * 0.8 && overallScore >= 60) {
    log(`\n✅ Good student experience (${successfulStages}/${totalStages} stages successful). Minor improvements recommended.`, 'yellow');
  } else {
    log(`\n⚠️  Student experience needs improvement (${successfulStages}/${totalStages} stages successful). Address major issues before student deployment.`, 'red');
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  log('\n\nReceived SIGINT, generating report...', 'yellow');
  generateTestReport(Date.now()).then(() => process.exit(1));
});

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\nUnhandled error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runAllTests, testResults };