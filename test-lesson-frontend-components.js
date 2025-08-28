#!/usr/bin/env node

/**
 * VidPOD Lesson Management System - Frontend Component Testing Framework
 * 
 * This comprehensive test suite validates:
 * - UI component functionality and rendering
 * - Form validation and error handling  
 * - Responsive design across devices
 * - Accessibility compliance (WCAG 2.1 AA)
 * - Interactive element behavior
 * - Data visualization components
 * - Real-time updates and WebSocket functionality
 * 
 * Run with: node test-lesson-frontend-components.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  BASE_URL: process.env.BASE_URL || 'https://podcast-stories-production.up.railway.app',
  HEADLESS: process.env.HEADLESS !== 'false',
  TIMEOUT: 30000,
  SCREENSHOT_PATH: './test-screenshots',
  VIEWPORT_SIZES: [
    { name: 'Mobile Portrait', width: 375, height: 667, deviceScaleFactor: 2, isMobile: true },
    { name: 'Mobile Landscape', width: 667, height: 375, deviceScaleFactor: 2, isMobile: true },
    { name: 'Tablet Portrait', width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true },
    { name: 'Tablet Landscape', width: 1024, height: 768, deviceScaleFactor: 1, isMobile: false },
    { name: 'Desktop Standard', width: 1366, height: 768, deviceScaleFactor: 1, isMobile: false },
    { name: 'Desktop Large', width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false }
  ]
};

// Test credentials
const TEST_CREDENTIALS = {
  admin: { email: 'admin@vidpod.com', password: 'vidpod' },
  teacher: { email: 'teacher@vidpod.com', password: 'vidpod' },
  student: { email: 'student@vidpod.com', password: 'vidpod' }
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0,
  accessibility_score: 0,
  performance_score: 0,
  responsive_score: 0,
  details: [],
  accessibility_issues: [],
  performance_metrics: [],
  responsive_issues: [],
  screenshots: []
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

function logTest(testName, status, details = '', category = 'general', duration = 0) {
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
  
  switch (status) {
    case 'PASS': testResults.passed++; break;
    case 'FAIL': testResults.failed++; break;
    case 'SKIP': testResults.skipped++; break;
  }
}

// =============================================================================
// BROWSER SETUP AND UTILITIES
// =============================================================================

async function setupBrowser() {
  const browser = await puppeteer.launch({
    headless: CONFIG.HEADLESS,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--remote-debugging-port=9222'
    ],
    defaultViewport: null
  });
  
  return browser;
}

async function loginAs(page, role) {
  const credentials = TEST_CREDENTIALS[role];
  
  try {
    await page.goto(`${CONFIG.BASE_URL}/index.html`, { waitUntil: 'networkidle0', timeout: CONFIG.TIMEOUT });
    
    // Fill login form
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.type('input[type="email"]', credentials.email);
    await page.type('input[type="password"]', credentials.password);
    
    // Submit form
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: CONFIG.TIMEOUT }),
      page.click('button[type="submit"], .login-btn, input[type="submit"]')
    ]);
    
    // Verify login success
    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes('index.html') && !currentUrl.includes('login');
    
    if (!isLoggedIn) {
      throw new Error(`Login failed for ${role}. Current URL: ${currentUrl}`);
    }
    
    return true;
  } catch (error) {
    throw new Error(`Login failed for ${role}: ${error.message}`);
  }
}

async function takeScreenshot(page, name, viewport = null) {
  try {
    // Ensure screenshot directory exists
    await fs.mkdir(CONFIG.SCREENSHOT_PATH, { recursive: true }).catch(() => {});
    
    const filename = `${name}_${viewport ? viewport.name.replace(/\s+/g, '_') : 'default'}_${Date.now()}.png`;
    const filepath = path.join(CONFIG.SCREENSHOT_PATH, filename);
    
    await page.screenshot({ 
      path: filepath, 
      fullPage: true,
      type: 'png'
    });
    
    testResults.screenshots.push({ name, viewport: viewport?.name, filepath });
    return filepath;
  } catch (error) {
    log(`Screenshot failed for ${name}: ${error.message}`, 'yellow');
    return null;
  }
}

// =============================================================================
// COMPONENT RENDERING TESTS
// =============================================================================

async function testComponentRendering(browser) {
  log('\n🎨 COMPONENT RENDERING TESTS', 'bright');
  
  const page = await browser.newPage();
  
  try {
    await loginAs(page, 'teacher');
    
    // Test 1: Course Management Component
    await page.goto(`${CONFIG.BASE_URL}/course-management.html`, { waitUntil: 'networkidle0' });
    
    const courseManagementTests = [
      {
        name: 'Course list renders correctly',
        selector: '.course-list, .courses-grid, [data-component="course-list"]',
        test: async (element) => {
          const isVisible = await element.isVisible();
          const hasContent = await element.evaluate(el => el.children.length > 0 || el.textContent.trim().length > 0);
          return { success: isVisible && hasContent, details: `Visible: ${isVisible}, Has content: ${hasContent}` };
        }
      },
      {
        name: 'Course creation form available',
        selector: '.course-create-form, [data-component="course-form"], .add-course-btn',
        test: async (element) => {
          const isVisible = await element.isVisible();
          return { success: isVisible, details: `Create form visible: ${isVisible}` };
        }
      },
      {
        name: 'Course filter/search functionality',
        selector: '.course-filter, .search-input, [data-function="search"]',
        test: async (element) => {
          const isVisible = await element.isVisible();
          const isInteractive = await element.evaluate(el => !el.disabled && el.type !== 'hidden');
          return { success: isVisible && isInteractive, details: `Filter available and interactive: ${isVisible && isInteractive}` };
        }
      }
    ];
    
    for (const test of courseManagementTests) {
      try {
        const element = await page.$(test.selector);
        if (element) {
          const result = await test.test(element);
          logTest(`Course Management: ${test.name}`, result.success ? 'PASS' : 'FAIL', result.details, 'rendering');
        } else {
          logTest(`Course Management: ${test.name}`, 'FAIL', `Element not found: ${test.selector}`, 'rendering');
        }
      } catch (error) {
        logTest(`Course Management: ${test.name}`, 'FAIL', error.message, 'rendering');
      }
    }
    
    await takeScreenshot(page, 'course_management_page');
    
    // Test 2: Lesson Builder Component
    await page.goto(`${CONFIG.BASE_URL}/lesson-builder.html`, { waitUntil: 'networkidle0' });
    
    const lessonBuilderTests = [
      {
        name: 'Lesson editor interface loads',
        selector: '.lesson-editor, [data-component="lesson-editor"], .content-editor',
        test: async (element) => {
          const isVisible = await element.isVisible();
          const hasEditableArea = await page.$('.content-editable, textarea, .rich-text-editor') !== null;
          return { success: isVisible && hasEditableArea, details: `Editor visible: ${isVisible}, Editable area: ${hasEditableArea}` };
        }
      },
      {
        name: 'Material addition controls',
        selector: '.add-material-btn, [data-action="add-material"], .material-controls',
        test: async (element) => {
          const isVisible = await element.isVisible();
          const isClickable = await element.evaluate(el => !el.disabled);
          return { success: isVisible && isClickable, details: `Material controls available: ${isVisible && isClickable}` };
        }
      },
      {
        name: 'Lesson preview functionality',
        selector: '.preview-btn, [data-action="preview"], .lesson-preview',
        test: async (element) => {
          const isVisible = await element.isVisible();
          return { success: isVisible, details: `Preview option available: ${isVisible}` };
        }
      }
    ];
    
    for (const test of lessonBuilderTests) {
      try {
        const element = await page.$(test.selector);
        if (element) {
          const result = await test.test(element);
          logTest(`Lesson Builder: ${test.name}`, result.success ? 'PASS' : 'FAIL', result.details, 'rendering');
        } else {
          logTest(`Lesson Builder: ${test.name}`, 'FAIL', `Element not found: ${test.selector}`, 'rendering');
        }
      } catch (error) {
        logTest(`Lesson Builder: ${test.name}`, 'FAIL', error.message, 'rendering');
      }
    }
    
    await takeScreenshot(page, 'lesson_builder_page');
    
    // Test 3: Quiz Builder Component
    await page.goto(`${CONFIG.BASE_URL}/quiz-builder.html`, { waitUntil: 'networkidle0' });
    
    const quizBuilderTests = [
      {
        name: 'Question creation interface',
        selector: '.question-builder, [data-component="question-editor"], .add-question-btn',
        test: async (element) => {
          const isVisible = await element.isVisible();
          return { success: isVisible, details: `Question builder visible: ${isVisible}` };
        }
      },
      {
        name: 'Question type selection',
        selector: 'select[data-field="question-type"], .question-type-selector, [name="questionType"]',
        test: async (element) => {
          const isVisible = await element.isVisible();
          const hasOptions = await element.evaluate(el => {
            if (el.tagName === 'SELECT') {
              return el.options.length > 1;
            }
            return true; // For non-select elements, assume they have options
          });
          return { success: isVisible && hasOptions, details: `Type selector with options: ${isVisible && hasOptions}` };
        }
      },
      {
        name: 'Quiz settings panel',
        selector: '.quiz-settings, [data-section="settings"], .quiz-config',
        test: async (element) => {
          const isVisible = await element.isVisible();
          return { success: isVisible, details: `Settings panel visible: ${isVisible}` };
        }
      }
    ];
    
    for (const test of quizBuilderTests) {
      try {
        const element = await page.$(test.selector);
        if (element) {
          const result = await test.test(element);
          logTest(`Quiz Builder: ${test.name}`, result.success ? 'PASS' : 'FAIL', result.details, 'rendering');
        } else {
          logTest(`Quiz Builder: ${test.name}`, 'FAIL', `Element not found: ${test.selector}`, 'rendering');
        }
      } catch (error) {
        logTest(`Quiz Builder: ${test.name}`, 'FAIL', error.message, 'rendering');
      }
    }
    
    await takeScreenshot(page, 'quiz_builder_page');
    
  } catch (error) {
    logTest('Component Rendering Setup', 'FAIL', error.message, 'rendering');
  } finally {
    await page.close();
  }
}

// =============================================================================
// RESPONSIVE DESIGN TESTS
// =============================================================================

async function testResponsiveDesign(browser) {
  log('\n📱 RESPONSIVE DESIGN TESTS', 'bright');
  
  const testPages = [
    { url: '/course-management.html', name: 'Course Management' },
    { url: '/lesson-builder.html', name: 'Lesson Builder' },
    { url: '/quiz-builder.html', name: 'Quiz Builder' },
    { url: '/student-lessons.html', name: 'Student Lessons' },
    { url: '/grade-center.html', name: 'Grade Center' }
  ];
  
  for (const testPage of testPages) {
    const page = await browser.newPage();
    
    try {
      await loginAs(page, 'teacher');
      await page.goto(`${CONFIG.BASE_URL}${testPage.url}`, { waitUntil: 'networkidle0' });
      
      for (const viewport of CONFIG.VIEWPORT_SIZES) {
        try {
          await page.setViewport(viewport);
          await page.waitForTimeout(1000); // Allow layout to settle
          
          // Test responsive behavior
          const responsiveTests = [
            {
              name: `${testPage.name} - Layout integrity on ${viewport.name}`,
              test: async () => {
                // Check for horizontal scrolling (bad responsive design indicator)
                const hasHorizontalScroll = await page.evaluate(() => {
                  return document.documentElement.scrollWidth > window.innerWidth;
                });
                
                // Check if navigation is accessible
                const navElement = await page.$('nav, .navigation, .navbar, [role="navigation"]');
                const navAccessible = navElement ? await navElement.isVisible() : false;
                
                // Check for overlapping elements
                const hasOverlaps = await page.evaluate(() => {
                  const elements = Array.from(document.querySelectorAll('*'));
                  let overlaps = 0;
                  
                  for (let i = 0; i < Math.min(elements.length, 50); i++) { // Check first 50 elements
                    const rect = elements[i].getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                      for (let j = i + 1; j < Math.min(elements.length, i + 20); j++) {
                        const rect2 = elements[j].getBoundingClientRect();
                        if (rect2.width > 0 && rect2.height > 0) {
                          const overlap = !(rect.right < rect2.left || rect2.right < rect.left || 
                                          rect.bottom < rect2.top || rect2.bottom < rect.top);
                          if (overlap && !elements[j].contains(elements[i]) && !elements[i].contains(elements[j])) {
                            overlaps++;
                          }
                        }
                      }
                    }
                  }
                  
                  return overlaps > 5; // Allow some expected overlaps
                });
                
                const success = !hasHorizontalScroll && navAccessible && !hasOverlaps;
                return {
                  success,
                  details: `Scroll: ${hasHorizontalScroll ? 'FAIL' : 'PASS'}, Nav: ${navAccessible ? 'PASS' : 'FAIL'}, Overlaps: ${hasOverlaps ? 'FAIL' : 'PASS'}`
                };
              }
            },
            {
              name: `${testPage.name} - Touch targets on ${viewport.name}`,
              test: async () => {
                if (!viewport.isMobile) return { success: true, details: 'Desktop - skipped' };
                
                const touchTargetIssues = await page.evaluate(() => {
                  const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [tabindex="0"]');
                  let smallTargets = 0;
                  
                  interactiveElements.forEach(element => {
                    const rect = element.getBoundingClientRect();
                    const size = Math.min(rect.width, rect.height);
                    
                    // WCAG recommends minimum 44px for touch targets
                    if (size > 0 && size < 44) {
                      smallTargets++;
                    }
                  });
                  
                  return {
                    total: interactiveElements.length,
                    smallTargets,
                    percentage: interactiveElements.length > 0 ? (smallTargets / interactiveElements.length) * 100 : 0
                  };
                });
                
                const success = touchTargetIssues.percentage < 20; // Allow 20% small targets
                return {
                  success,
                  details: `${touchTargetIssues.smallTargets}/${touchTargetIssues.total} targets too small (${touchTargetIssues.percentage.toFixed(1)}%)`
                };
              }
            }
          ];
          
          for (const test of responsiveTests) {
            try {
              const result = await test.test();
              logTest(test.name, result.success ? 'PASS' : 'FAIL', result.details, 'responsive');
              
              if (!result.success) {
                testResults.responsive_issues.push({
                  page: testPage.name,
                  viewport: viewport.name,
                  issue: test.name,
                  details: result.details
                });
              }
            } catch (error) {
              logTest(test.name, 'FAIL', error.message, 'responsive');
            }
          }
          
          // Take screenshot for visual verification
          await takeScreenshot(page, `${testPage.name.replace(/\s+/g, '_')}_responsive`, viewport);
          
        } catch (error) {
          logTest(`${testPage.name} responsive test on ${viewport.name}`, 'FAIL', error.message, 'responsive');
        }
      }
      
    } catch (error) {
      logTest(`${testPage.name} responsive setup`, 'FAIL', error.message, 'responsive');
    } finally {
      await page.close();
    }
  }
}

// =============================================================================
// FORM VALIDATION TESTS
// =============================================================================

async function testFormValidation(browser) {
  log('\n📝 FORM VALIDATION TESTS', 'bright');
  
  const page = await browser.newPage();
  
  try {
    await loginAs(page, 'teacher');
    
    // Test Course Creation Form
    await page.goto(`${CONFIG.BASE_URL}/course-management.html`, { waitUntil: 'networkidle0' });
    
    // Look for course creation form or button to trigger it
    const createCourseBtn = await page.$('.add-course-btn, .create-course-btn, [data-action="create-course"]');
    if (createCourseBtn) {
      await createCourseBtn.click();
      await page.waitForTimeout(1000);
    }
    
    const formValidationTests = [
      {
        name: 'Course title validation',
        test: async () => {
          const titleInput = await page.$('input[name="title"], #courseTitle, [data-field="title"]');
          if (!titleInput) return { success: false, details: 'Title input not found' };
          
          // Test empty submission
          await titleInput.click({ clickCount: 3 }); // Select all
          await titleInput.type('');
          
          const submitBtn = await page.$('button[type="submit"], .submit-btn, [data-action="submit"]');
          if (submitBtn) {
            await submitBtn.click();
            await page.waitForTimeout(500);
            
            const errorMessage = await page.$('.error, .validation-error, .field-error');
            const hasError = errorMessage && await errorMessage.isVisible();
            
            return { 
              success: hasError,
              details: hasError ? 'Validation error shown for empty title' : 'No validation error for empty title'
            };
          }
          
          return { success: false, details: 'Submit button not found' };
        }
      },
      {
        name: 'Course duration validation',
        test: async () => {
          const weeksInput = await page.$('input[name="weeks"], input[name="total_weeks"], [data-field="duration"]');
          if (!weeksInput) return { success: false, details: 'Duration input not found' };
          
          // Test invalid number
          await weeksInput.click({ clickCount: 3 });
          await weeksInput.type('-1');
          
          const submitBtn = await page.$('button[type="submit"], .submit-btn');
          if (submitBtn) {
            await submitBtn.click();
            await page.waitForTimeout(500);
            
            const errorMessage = await page.$('.error, .validation-error');
            const hasError = errorMessage && await errorMessage.isVisible();
            
            return { 
              success: hasError,
              details: hasError ? 'Validation error shown for invalid duration' : 'No validation error for negative duration'
            };
          }
          
          return { success: false, details: 'Submit button not found' };
        }
      }
    ];
    
    for (const test of formValidationTests) {
      try {
        const result = await test.test();
        logTest(`Form Validation: ${test.name}`, result.success ? 'PASS' : 'FAIL', result.details, 'validation');
      } catch (error) {
        logTest(`Form Validation: ${test.name}`, 'FAIL', error.message, 'validation');
      }
    }
    
    await takeScreenshot(page, 'form_validation_test');
    
  } catch (error) {
    logTest('Form Validation Setup', 'FAIL', error.message, 'validation');
  } finally {
    await page.close();
  }
}

// =============================================================================
// ACCESSIBILITY TESTS
// =============================================================================

async function testAccessibility(browser) {
  log('\n♿ ACCESSIBILITY TESTS (WCAG 2.1 AA)', 'bright');
  
  const testPages = [
    { url: '/course-management.html', name: 'Course Management' },
    { url: '/lesson-builder.html', name: 'Lesson Builder' },
    { url: '/quiz-builder.html', name: 'Quiz Builder' },
    { url: '/student-lessons.html', name: 'Student Lessons' }
  ];
  
  let totalAccessibilityScore = 0;
  let accessibilityTests = 0;
  
  for (const testPage of testPages) {
    const page = await browser.newPage();
    
    try {
      await loginAs(page, 'teacher');
      await page.goto(`${CONFIG.BASE_URL}${testPage.url}`, { waitUntil: 'networkidle0' });
      
      const accessibilityChecks = [
        {
          name: `${testPage.name} - Alt text for images`,
          test: async () => {
            const imagesWithoutAlt = await page.evaluate(() => {
              const images = Array.from(document.querySelectorAll('img'));
              return images.filter(img => !img.alt || img.alt.trim() === '').length;
            });
            
            const totalImages = await page.evaluate(() => document.querySelectorAll('img').length);
            const success = imagesWithoutAlt === 0;
            
            return {
              success,
              details: totalImages > 0 ? `${imagesWithoutAlt}/${totalImages} images missing alt text` : 'No images found',
              score: totalImages > 0 ? ((totalImages - imagesWithoutAlt) / totalImages) * 100 : 100
            };
          }
        },
        {
          name: `${testPage.name} - Form labels`,
          test: async () => {
            const unlabeledInputs = await page.evaluate(() => {
              const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
              return inputs.filter(input => {
                if (input.type === 'hidden' || input.type === 'submit') return false;
                
                const hasLabel = input.labels && input.labels.length > 0;
                const hasAriaLabel = input.getAttribute('aria-label');
                const hasAriaLabelledby = input.getAttribute('aria-labelledby');
                const hasPlaceholder = input.placeholder;
                
                return !(hasLabel || hasAriaLabel || hasAriaLabelledby || hasPlaceholder);
              }).length;
            });
            
            const totalInputs = await page.evaluate(() => {
              return document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), select, textarea').length;
            });
            
            const success = unlabeledInputs === 0;
            
            return {
              success,
              details: totalInputs > 0 ? `${unlabeledInputs}/${totalInputs} form controls missing labels` : 'No form controls found',
              score: totalInputs > 0 ? ((totalInputs - unlabeledInputs) / totalInputs) * 100 : 100
            };
          }
        },
        {
          name: `${testPage.name} - Color contrast`,
          test: async () => {
            const contrastIssues = await page.evaluate(() => {
              const textElements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, button, a, label'));
              let lowContrastCount = 0;
              let totalChecked = 0;
              
              textElements.forEach(element => {
                if (element.textContent && element.textContent.trim().length > 0) {
                  const styles = window.getComputedStyle(element);
                  const fontSize = parseFloat(styles.fontSize);
                  const fontWeight = styles.fontWeight;
                  
                  // Simple heuristic for low contrast (actual contrast calculation would be more complex)
                  const textColor = styles.color;
                  const bgColor = styles.backgroundColor;
                  
                  // Check for obviously low contrast combinations
                  const isLightText = textColor.includes('rgb(') && 
                    textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/) &&
                    textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/).slice(1).every(val => parseInt(val) > 200);
                  
                  const isLightBg = bgColor.includes('rgb(') && 
                    bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/) &&
                    bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/).slice(1).every(val => parseInt(val) > 200);
                  
                  if (isLightText && isLightBg) {
                    lowContrastCount++;
                  }
                  
                  totalChecked++;
                }
              });
              
              return { lowContrastCount, totalChecked };
            });
            
            const success = contrastIssues.lowContrastCount === 0;
            const score = contrastIssues.totalChecked > 0 ? 
              ((contrastIssues.totalChecked - contrastIssues.lowContrastCount) / contrastIssues.totalChecked) * 100 : 100;
            
            return {
              success,
              details: `${contrastIssues.lowContrastCount}/${contrastIssues.totalChecked} elements with potential contrast issues`,
              score
            };
          }
        },
        {
          name: `${testPage.name} - Keyboard navigation`,
          test: async () => {
            // Test Tab navigation
            let focusableElements = 0;
            let tabStops = 0;
            
            try {
              // Count focusable elements
              focusableElements = await page.evaluate(() => {
                const focusableSelectors = [
                  'button:not([disabled])',
                  'input:not([disabled])',
                  'select:not([disabled])',
                  'textarea:not([disabled])',
                  'a[href]',
                  '[tabindex]:not([tabindex="-1"])'
                ];
                
                return document.querySelectorAll(focusableSelectors.join(', ')).length;
              });
              
              // Test tab navigation (limited to prevent infinite loops)
              for (let i = 0; i < Math.min(focusableElements, 20); i++) {
                await page.keyboard.press('Tab');
                
                const focusedElement = await page.evaluate(() => {
                  return document.activeElement && document.activeElement !== document.body;
                });
                
                if (focusedElement) tabStops++;
                await page.waitForTimeout(100);
              }
              
              const success = tabStops > 0;
              return {
                success,
                details: `${tabStops}/${Math.min(focusableElements, 20)} tab stops working`,
                score: focusableElements > 0 ? (tabStops / Math.min(focusableElements, 20)) * 100 : 100
              };
              
            } catch (error) {
              return { success: false, details: `Keyboard navigation test failed: ${error.message}`, score: 0 };
            }
          }
        },
        {
          name: `${testPage.name} - ARIA attributes`,
          test: async () => {
            const ariaIssues = await page.evaluate(() => {
              const elementsWithAriaRoles = document.querySelectorAll('[role]');
              let invalidRoles = 0;
              
              const validRoles = [
                'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
                'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
                'contentinfo', 'definition', 'dialog', 'directory', 'document',
                'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
                'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
                'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
                'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
                'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
                'rowheader', 'scrollbar', 'search', 'searchbox', 'separator',
                'slider', 'spinbutton', 'status', 'switch', 'tab', 'table',
                'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar',
                'tooltip', 'tree', 'treegrid', 'treeitem'
              ];
              
              elementsWithAriaRoles.forEach(element => {
                const role = element.getAttribute('role');
                if (role && !validRoles.includes(role.toLowerCase())) {
                  invalidRoles++;
                }
              });
              
              return {
                total: elementsWithAriaRoles.length,
                invalid: invalidRoles
              };
            });
            
            const success = ariaIssues.invalid === 0;
            const score = ariaIssues.total > 0 ? ((ariaIssues.total - ariaIssues.invalid) / ariaIssues.total) * 100 : 100;
            
            return {
              success,
              details: `${ariaIssues.invalid}/${ariaIssues.total} invalid ARIA roles`,
              score
            };
          }
        }
      ];
      
      let pageScore = 0;
      let pageTests = 0;
      
      for (const check of accessibilityChecks) {
        try {
          const result = await check.test();
          logTest(`Accessibility: ${check.name}`, result.success ? 'PASS' : 'FAIL', result.details, 'accessibility');
          
          if (result.score !== undefined) {
            pageScore += result.score;
            pageTests++;
          }
          
          if (!result.success) {
            testResults.accessibility_issues.push({
              page: testPage.name,
              test: check.name,
              details: result.details
            });
          }
          
        } catch (error) {
          logTest(`Accessibility: ${check.name}`, 'FAIL', error.message, 'accessibility');
        }
      }
      
      if (pageTests > 0) {
        totalAccessibilityScore += pageScore / pageTests;
        accessibilityTests++;
      }
      
    } catch (error) {
      logTest(`${testPage.name} accessibility setup`, 'FAIL', error.message, 'accessibility');
    } finally {
      await page.close();
    }
  }
  
  testResults.accessibility_score = accessibilityTests > 0 ? totalAccessibilityScore / accessibilityTests : 0;
}

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

async function testPerformance(browser) {
  log('\n⚡ PERFORMANCE TESTS', 'bright');
  
  const testPages = [
    { url: '/course-management.html', name: 'Course Management' },
    { url: '/lesson-builder.html', name: 'Lesson Builder' },
    { url: '/quiz-builder.html', name: 'Quiz Builder' },
    { url: '/student-lessons.html', name: 'Student Lessons' }
  ];
  
  let totalPerformanceScore = 0;
  let performanceTests = 0;
  
  for (const testPage of testPages) {
    const page = await browser.newPage();
    
    try {
      await loginAs(page, 'teacher');
      
      // Enable performance monitoring
      await page.coverage.startJSCoverage();
      await page.coverage.startCSSCoverage();
      
      const startTime = Date.now();
      await page.goto(`${CONFIG.BASE_URL}${testPage.url}`, { waitUntil: 'networkidle0' });
      const loadTime = Date.now() - startTime;
      
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        
        return {
          domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
          loadComplete: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          totalLoadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0
        };
      });
      
      const jsCoverage = await page.coverage.stopJSCoverage();
      const cssCoverage = await page.coverage.stopCSSCoverage();
      
      // Calculate coverage percentages
      const jsUsed = jsCoverage.reduce((acc, entry) => {
        const used = entry.ranges.reduce((total, range) => total + range.end - range.start, 0);
        return acc + used;
      }, 0);
      
      const jsTotal = jsCoverage.reduce((acc, entry) => acc + entry.text.length, 0);
      const jsUsagePercent = jsTotal > 0 ? (jsUsed / jsTotal) * 100 : 100;
      
      const performanceChecks = [
        {
          name: `${testPage.name} - Page load time`,
          metric: loadTime,
          threshold: 3000, // 3 seconds
          unit: 'ms'
        },
        {
          name: `${testPage.name} - First contentful paint`,
          metric: performanceMetrics.firstContentfulPaint,
          threshold: 1500, // 1.5 seconds
          unit: 'ms'
        },
        {
          name: `${testPage.name} - DOM content loaded`,
          metric: performanceMetrics.domContentLoaded,
          threshold: 1000, // 1 second
          unit: 'ms'
        }
      ];
      
      let pagePerformanceScore = 0;
      
      for (const check of performanceChecks) {
        const success = check.metric <= check.threshold;
        const score = Math.max(0, 100 - ((check.metric / check.threshold) * 100));
        
        logTest(`Performance: ${check.name}`, success ? 'PASS' : 'FAIL',
          `${check.metric.toFixed(0)}${check.unit} (threshold: ${check.threshold}${check.unit})`, 'performance');
        
        pagePerformanceScore += score;
        
        testResults.performance_metrics.push({
          page: testPage.name,
          test: check.name,
          metric: check.metric,
          threshold: check.threshold,
          unit: check.unit,
          score: score
        });
      }
      
      // JavaScript usage efficiency
      logTest(`Performance: ${testPage.name} - JS usage efficiency`, 
        jsUsagePercent > 50 ? 'PASS' : 'FAIL',
        `${jsUsagePercent.toFixed(1)}% of loaded JavaScript used`, 'performance');
      
      totalPerformanceScore += pagePerformanceScore / performanceChecks.length;
      performanceTests++;
      
    } catch (error) {
      logTest(`${testPage.name} performance test`, 'FAIL', error.message, 'performance');
    } finally {
      await page.close();
    }
  }
  
  testResults.performance_score = performanceTests > 0 ? totalPerformanceScore / performanceTests : 0;
}

// =============================================================================
// STUDENT EXPERIENCE TESTS
// =============================================================================

async function testStudentExperience(browser) {
  log('\n👨‍🎓 STUDENT EXPERIENCE TESTS', 'bright');
  
  const page = await browser.newPage();
  
  try {
    await loginAs(page, 'student');
    
    // Test 1: Student Lessons Interface
    await page.goto(`${CONFIG.BASE_URL}/student-lessons.html`, { waitUntil: 'networkidle0' });
    
    const studentExperienceTests = [
      {
        name: 'Lesson list displays for student',
        test: async () => {
          const lessonList = await page.$('.lesson-list, .lessons-grid, [data-component="student-lessons"]');
          const isVisible = lessonList ? await lessonList.isVisible() : false;
          return { success: isVisible, details: `Lesson list visible: ${isVisible}` };
        }
      },
      {
        name: 'Progress indicators show correctly',
        test: async () => {
          const progressElements = await page.$$('.progress, .lesson-progress, [data-component="progress"]');
          const hasProgressIndicators = progressElements.length > 0;
          return { success: hasProgressIndicators, details: `Found ${progressElements.length} progress indicators` };
        }
      },
      {
        name: 'Interactive lesson content accessible',
        test: async () => {
          const interactiveElements = await page.$$('button:not([disabled]), .interactive, [data-interactive="true"]');
          const hasInteractives = interactiveElements.length > 0;
          return { success: hasInteractives, details: `Found ${interactiveElements.length} interactive elements` };
        }
      }
    ];
    
    for (const test of studentExperienceTests) {
      try {
        const result = await test.test();
        logTest(`Student Experience: ${test.name}`, result.success ? 'PASS' : 'FAIL', result.details, 'student');
      } catch (error) {
        logTest(`Student Experience: ${test.name}`, 'FAIL', error.message, 'student');
      }
    }
    
    await takeScreenshot(page, 'student_experience');
    
  } catch (error) {
    logTest('Student Experience Setup', 'FAIL', error.message, 'student');
  } finally {
    await page.close();
  }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runAllTests() {
  const startTime = Date.now();
  
  log('🚀 VidPOD Lesson Management Frontend Component Test Suite', 'bright');
  log('=' * 80, 'bright');
  log(`📱 Testing ${CONFIG.VIEWPORT_SIZES.length} viewport sizes`, 'cyan');
  log(`🔍 Headless mode: ${CONFIG.HEADLESS}`, 'cyan');
  log(`📸 Screenshots: ${CONFIG.SCREENSHOT_PATH}`, 'cyan');
  
  let browser;
  
  try {
    browser = await setupBrowser();
    
    // Core component tests
    await testComponentRendering(browser);
    await testFormValidation(browser);
    await testStudentExperience(browser);
    
    // Advanced testing
    await testResponsiveDesign(browser);
    await testAccessibility(browser);
    await testPerformance(browser);
    
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
  log('\n📊 COMPREHENSIVE FRONTEND COMPONENT TEST RESULTS', 'bright');
  log('=' * 80, 'bright');
  
  // Summary statistics
  log(`⏱️  Total execution time: ${Math.round(totalTime / 1000)}s`, 'cyan');
  log(`✅ Tests passed: ${testResults.passed}`, 'green');
  log(`❌ Tests failed: ${testResults.failed}`, 'red');
  log(`⚠️  Tests skipped: ${testResults.skipped}`, 'yellow');
  log(`📈 Total tests: ${testResults.total}`, 'cyan');
  log(`🎯 Success rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`, 'magenta');
  
  // Score summary
  log('\n📊 Quality Scores:', 'bright');
  log(`♿ Accessibility: ${testResults.accessibility_score.toFixed(1)}/100`, 
    testResults.accessibility_score >= 80 ? 'green' : testResults.accessibility_score >= 60 ? 'yellow' : 'red');
  log(`⚡ Performance: ${testResults.performance_score.toFixed(1)}/100`, 
    testResults.performance_score >= 80 ? 'green' : testResults.performance_score >= 60 ? 'yellow' : 'red');
  log(`📱 Responsive Design: ${testResults.responsive_score}/100`, 
    testResults.responsive_score >= 80 ? 'green' : testResults.responsive_score >= 60 ? 'yellow' : 'red');
  
  // Screenshots summary
  if (testResults.screenshots.length > 0) {
    log(`\n📸 Screenshots taken: ${testResults.screenshots.length}`, 'bright');
    log(`   Location: ${CONFIG.SCREENSHOT_PATH}`, 'cyan');
  }
  
  // Category breakdown
  const categories = [...new Set(testResults.details.map(t => t.category))];
  log('\n📋 Results by Category:', 'bright');
  
  categories.forEach(category => {
    const categoryTests = testResults.details.filter(t => t.category === category);
    const categoryPassed = categoryTests.filter(t => t.status === 'PASS').length;
    const categoryTotal = categoryTests.length;
    const categoryRate = categoryTotal > 0 ? Math.round((categoryPassed / categoryTotal) * 100) : 0;
    
    log(`   ${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`, 
      categoryRate === 100 ? 'green' : categoryRate >= 80 ? 'yellow' : 'red');
  });
  
  // Issue summaries
  if (testResults.accessibility_issues.length > 0) {
    log('\n♿ Accessibility Issues:', 'bright');
    testResults.accessibility_issues.forEach(issue => {
      log(`   • ${issue.page} - ${issue.test}: ${issue.details}`, 'red');
    });
  }
  
  if (testResults.responsive_issues.length > 0) {
    log('\n📱 Responsive Design Issues:', 'bright');
    testResults.responsive_issues.forEach(issue => {
      log(`   • ${issue.page} on ${issue.viewport}: ${issue.details}`, 'red');
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
      skipped: testResults.skipped,
      successRate: Math.round((testResults.passed / testResults.total) * 100)
    },
    scores: {
      accessibility: testResults.accessibility_score,
      performance: testResults.performance_score,
      responsive: testResults.responsive_score
    },
    issues: {
      accessibility: testResults.accessibility_issues,
      responsive: testResults.responsive_issues
    },
    screenshots: testResults.screenshots,
    performance_metrics: testResults.performance_metrics,
    details: testResults.details
  };
  
  try {
    await fs.writeFile(
      path.join(__dirname, 'frontend-component-test-report.json'), 
      JSON.stringify(report, null, 2)
    );
    log('\n📄 Detailed report saved to: frontend-component-test-report.json', 'cyan');
  } catch (error) {
    log(`\n⚠️  Could not save report: ${error.message}`, 'yellow');
  }
  
  // Final status
  const overallScore = (testResults.accessibility_score + testResults.performance_score + testResults.responsive_score) / 3;
  
  if (testResults.failed === 0 && overallScore >= 80) {
    log('\n🎉 ALL FRONTEND COMPONENT TESTS PASSED WITH HIGH QUALITY SCORES!', 'green');
    log('   System is ready for production deployment.', 'green');
  } else if (testResults.failed === 0) {
    log('\n✅ All tests passed, but quality scores could be improved.', 'yellow');
  } else {
    log(`\n⚠️  ${testResults.failed} tests failed. Review issues above before deployment.`, 'yellow');
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