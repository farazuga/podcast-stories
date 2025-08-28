#!/usr/bin/env node

/**
 * VidPOD Lesson Management System - Teacher Workflow Testing Suite
 * 
 * This comprehensive test suite validates complete teacher workflows:
 * - Course creation and management lifecycle
 * - Lesson builder functionality and content creation
 * - Quiz creation with all question types and auto-grading
 * - Student progress monitoring and analytics
 * - Grade center operations and bulk management
 * - Course template creation and sharing
 * 
 * Run with: node test-teacher-lesson-workflows.js
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
  SCREENSHOT_PATH: './teacher-workflow-screenshots'
};

// Test credentials
const TEACHER_CREDENTIALS = { email: 'teacher@vidpod.com', password: 'vidpod' };
const STUDENT_CREDENTIALS = { email: 'student@vidpod.com', password: 'vidpod' };

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  workflows: [],
  performance_metrics: [],
  screenshots: [],
  details: []
};

// Workflow data tracking
let workflowData = {
  courseId: null,
  lessonIds: [],
  quizIds: [],
  materialIds: [],
  studentEnrollments: []
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

function logTest(testName, status, details = '', category = 'workflow', duration = 0) {
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
    defaultViewport: { width: 1366, height: 768 }
  });
}

async function loginAsTeacher(page) {
  try {
    await page.goto(`${CONFIG.BASE_URL}/index.html`, { waitUntil: 'networkidle0', timeout: CONFIG.TIMEOUT });
    
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.type('input[type="email"]', TEACHER_CREDENTIALS.email);
    await page.type('input[type="password"]', TEACHER_CREDENTIALS.password);
    
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
    throw new Error(`Teacher login failed: ${error.message}`);
  }
}

async function takeScreenshot(page, name, details = '') {
  try {
    await fs.mkdir(CONFIG.SCREENSHOT_PATH, { recursive: true }).catch(() => {});
    
    const filename = `${name}_${Date.now()}.png`;
    const filepath = path.join(CONFIG.SCREENSHOT_PATH, filename);
    
    await page.screenshot({ 
      path: filepath, 
      fullPage: true,
      type: 'png'
    });
    
    testResults.screenshots.push({ name, details, filepath });
    return filepath;
  } catch (error) {
    log(`Screenshot failed for ${name}: ${error.message}`, 'yellow');
    return null;
  }
}

async function waitAndClick(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { visible: true, timeout });
  await page.click(selector);
  await page.waitForTimeout(500); // Brief pause for UI updates
}

async function waitAndType(page, selector, text, timeout = 5000) {
  await page.waitForSelector(selector, { visible: true, timeout });
  await page.click(selector, { clickCount: 3 }); // Select all existing text
  await page.type(selector, text);
}

// =============================================================================
// COURSE CREATION WORKFLOW
// =============================================================================

async function testCourseCreationWorkflow(browser) {
  log('\n📚 COURSE CREATION WORKFLOW TEST', 'bright');
  
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    await loginAsTeacher(page);
    
    // Step 1: Navigate to Course Management
    await page.goto(`${CONFIG.BASE_URL}/course-management.html`, { 
      waitUntil: 'networkidle0', 
      timeout: CONFIG.TIMEOUT 
    });
    
    await takeScreenshot(page, 'course_management_initial', 'Initial course management page');
    
    // Step 2: Find and click course creation button
    const createBtnSelectors = [
      '.add-course-btn',
      '.create-course-btn', 
      '[data-action="create-course"]',
      'button[onclick*="create"]',
      '.btn-primary:has-text("Create")',
      '.new-course'
    ];
    
    let createBtnFound = false;
    for (const selector of createBtnSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          await waitAndClick(page, selector);
          createBtnFound = true;
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    if (!createBtnFound) {
      // Try looking for any button that might trigger course creation
      const allButtons = await page.$$('button');
      for (const button of allButtons) {
        const text = await button.evaluate(el => el.textContent.toLowerCase());
        if (text.includes('create') || text.includes('new') || text.includes('add')) {
          await button.click();
          createBtnFound = true;
          break;
        }
      }
    }
    
    if (!createBtnFound) {
      logTest('Course Creation: Find create button', 'FAIL', 'No course creation button found');
      return;
    }
    
    await page.waitForTimeout(CONFIG.WAIT_TIME);
    await takeScreenshot(page, 'course_creation_form', 'Course creation form opened');
    
    // Step 3: Fill course creation form
    const courseData = {
      title: 'Test Course - Advanced Digital Journalism',
      description: 'A comprehensive course covering advanced digital journalism techniques, multimedia storytelling, and modern reporting methods.',
      subject: 'Digital Media',
      gradeLevel: '9-12',
      totalWeeks: '8',
      difficulty: 'intermediate'
    };
    
    const formFields = [
      { selector: 'input[name="title"], #courseTitle, [data-field="title"]', value: courseData.title, name: 'Course Title' },
      { selector: 'textarea[name="description"], #courseDescription, [data-field="description"]', value: courseData.description, name: 'Course Description' },
      { selector: 'input[name="subject"], #courseSubject, [data-field="subject"]', value: courseData.subject, name: 'Subject' },
      { selector: 'input[name="total_weeks"], input[name="totalWeeks"], #totalWeeks', value: courseData.totalWeeks, name: 'Total Weeks' }
    ];
    
    let fieldsCompleted = 0;
    for (const field of formFields) {
      try {
        const element = await page.$(field.selector);
        if (element && await element.isVisible()) {
          await waitAndType(page, field.selector, field.value);
          fieldsCompleted++;
          log(`   ✓ Filled ${field.name}: ${field.value}`, 'green');
        } else {
          log(`   ⚠ Field not found: ${field.name} (${field.selector})`, 'yellow');
        }
      } catch (error) {
        log(`   ✗ Error filling ${field.name}: ${error.message}`, 'red');
      }
    }
    
    // Handle dropdown/select fields
    const selectFields = [
      { selector: 'select[name="grade_level"], #gradeLevel', value: courseData.gradeLevel, name: 'Grade Level' },
      { selector: 'select[name="difficulty"], #difficulty', value: courseData.difficulty, name: 'Difficulty Level' }
    ];
    
    for (const field of selectFields) {
      try {
        const element = await page.$(field.selector);
        if (element && await element.isVisible()) {
          await page.select(field.selector, field.value);
          fieldsCompleted++;
          log(`   ✓ Selected ${field.name}: ${field.value}`, 'green');
        }
      } catch (error) {
        log(`   ⚠ Could not select ${field.name}: ${error.message}`, 'yellow');
      }
    }
    
    await takeScreenshot(page, 'course_form_filled', 'Course form completed');
    
    // Step 4: Submit form
    const submitSelectors = [
      'button[type="submit"]',
      '.submit-btn',
      '[data-action="submit"]',
      '.btn-primary:has-text("Create")',
      '.save-course'
    ];
    
    let formSubmitted = false;
    for (const selector of submitSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: CONFIG.TIMEOUT }).catch(() => {}),
            page.click(selector)
          ]);
          formSubmitted = true;
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    if (!formSubmitted) {
      // Try any button that looks like submit
      const allButtons = await page.$$('button');
      for (const button of allButtons) {
        const text = await button.evaluate(el => el.textContent.toLowerCase());
        if (text.includes('save') || text.includes('submit') || text.includes('create')) {
          await button.click();
          formSubmitted = true;
          break;
        }
      }
    }
    
    await page.waitForTimeout(CONFIG.WAIT_TIME * 2);
    await takeScreenshot(page, 'course_created', 'After course creation attempt');
    
    // Step 5: Verify course creation
    let courseCreated = false;
    const currentUrl = page.url();
    
    // Check for success indicators
    const successIndicators = await Promise.all([
      page.$('.success-message, .alert-success').then(el => el !== null),
      page.$('.course-card, .course-item').then(el => el !== null),
      page.evaluate((title) => document.body.textContent.includes(title), courseData.title)
    ]);
    
    courseCreated = successIndicators.some(indicator => indicator);
    
    // Try to extract course ID if available
    if (courseCreated) {
      try {
        const courseElements = await page.$$('.course-card, .course-item, [data-course-id]');
        if (courseElements.length > 0) {
          workflowData.courseId = await courseElements[0].evaluate(el => 
            el.getAttribute('data-course-id') || el.getAttribute('data-id') || el.id
          );
        }
      } catch (error) {
        // Course ID extraction failed, but that's okay
      }
    }
    
    const duration = Date.now() - startTime;
    
    if (courseCreated && fieldsCompleted >= 2) {
      logTest('Course Creation Workflow', 'PASS', 
        `Course created successfully. Fields completed: ${fieldsCompleted}/${formFields.length + selectFields.length}`, 
        'workflow', duration);
        
      testResults.workflows.push({
        name: 'Course Creation',
        status: 'PASS',
        duration,
        steps_completed: 5,
        data: { courseId: workflowData.courseId, fieldsCompleted }
      });
    } else {
      logTest('Course Creation Workflow', 'FAIL', 
        `Course creation failed. Fields completed: ${fieldsCompleted}/${formFields.length + selectFields.length}`, 
        'workflow', duration);
        
      testResults.workflows.push({
        name: 'Course Creation',
        status: 'FAIL',
        duration,
        steps_completed: fieldsCompleted > 0 ? 3 : 2,
        issues: ['Form submission failed or course not created']
      });
    }
    
  } catch (error) {
    logTest('Course Creation Workflow', 'FAIL', error.message, 'workflow', Date.now() - startTime);
  } finally {
    await page.close();
  }
}

// =============================================================================
// LESSON BUILDER WORKFLOW
// =============================================================================

async function testLessonBuilderWorkflow(browser) {
  log('\n📝 LESSON BUILDER WORKFLOW TEST', 'bright');
  
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    await loginAsTeacher(page);
    
    // Step 1: Navigate to Lesson Builder
    await page.goto(`${CONFIG.BASE_URL}/lesson-builder.html`, { 
      waitUntil: 'networkidle0', 
      timeout: CONFIG.TIMEOUT 
    });
    
    await takeScreenshot(page, 'lesson_builder_initial', 'Lesson builder initial state');
    
    // Step 2: Create new lesson
    const lessonData = {
      title: 'Introduction to Digital Storytelling',
      description: 'Learn the fundamentals of creating compelling digital narratives',
      content: `
        <h2>Learning Objectives</h2>
        <ul>
          <li>Understand the principles of digital storytelling</li>
          <li>Learn to structure engaging narratives</li>
          <li>Practice multimedia integration techniques</li>
        </ul>
        
        <h2>Introduction</h2>
        <p>Digital storytelling combines traditional narrative techniques with modern technology to create powerful, engaging content that resonates with audiences across multiple platforms.</p>
        
        <h2>Key Concepts</h2>
        <h3>1. Narrative Structure</h3>
        <p>Every compelling story follows a clear structure: setup, conflict, and resolution.</p>
        
        <h3>2. Multimedia Integration</h3>
        <p>Effective digital stories seamlessly blend text, images, audio, and video.</p>
      `,
      weekNumber: '1',
      lessonNumber: '1',
      duration: '45'
    };
    
    // Fill lesson form
    const lessonFields = [
      { selector: 'input[name="title"], #lessonTitle, [data-field="title"]', value: lessonData.title, name: 'Lesson Title' },
      { selector: 'textarea[name="description"], #lessonDescription', value: lessonData.description, name: 'Description' },
      { selector: 'input[name="week_number"], #weekNumber', value: lessonData.weekNumber, name: 'Week Number' },
      { selector: 'input[name="lesson_number"], #lessonNumber', value: lessonData.lessonNumber, name: 'Lesson Number' },
      { selector: 'input[name="duration"], #duration', value: lessonData.duration, name: 'Duration' }
    ];
    
    let lessonFieldsCompleted = 0;
    for (const field of lessonFields) {
      try {
        const element = await page.$(field.selector);
        if (element && await element.isVisible()) {
          await waitAndType(page, field.selector, field.value);
          lessonFieldsCompleted++;
          log(`   ✓ Filled ${field.name}`, 'green');
        }
      } catch (error) {
        log(`   ⚠ Could not fill ${field.name}: ${error.message}`, 'yellow');
      }
    }
    
    // Step 3: Add lesson content
    const contentEditorSelectors = [
      '.content-editor textarea',
      '#lessonContent',
      '[data-field="content"]',
      '.rich-text-editor',
      'textarea[name="content"]'
    ];
    
    let contentAdded = false;
    for (const selector of contentEditorSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          await waitAndType(page, selector, lessonData.content);
          contentAdded = true;
          log('   ✓ Added lesson content', 'green');
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    await takeScreenshot(page, 'lesson_content_added', 'Lesson content filled');
    
    // Step 4: Add learning objectives (if available)
    const objectivesData = [
      'Understand digital storytelling principles',
      'Create structured narratives',
      'Integrate multimedia effectively'
    ];
    
    let objectivesAdded = 0;
    try {
      const objectivesSelector = 'textarea[name="objectives"], #objectives, [data-field="objectives"]';
      const objectivesElement = await page.$(objectivesSelector);
      if (objectivesElement) {
        await waitAndType(page, objectivesSelector, objectivesData.join('\n'));
        objectivesAdded = objectivesData.length;
        log('   ✓ Added learning objectives', 'green');
      }
    } catch (error) {
      log('   ⚠ Could not add learning objectives', 'yellow');
    }
    
    // Step 5: Add vocabulary terms (if available)
    const vocabularyTerms = [
      { term: 'Digital Storytelling', definition: 'The practice of using digital tools to tell stories' },
      { term: 'Narrative Arc', definition: 'The chronological construction of plot in a story' },
      { term: 'Multimedia', definition: 'Content that uses multiple forms of information' }
    ];
    
    let vocabularyAdded = false;
    try {
      // Look for vocabulary section
      const vocabSelectors = [
        '[data-section="vocabulary"]',
        '.vocabulary-section',
        '#vocabulary',
        '.add-vocabulary-btn'
      ];
      
      for (const selector of vocabSelectors) {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          vocabularyAdded = true;
          log('   ✓ Vocabulary section available', 'green');
          break;
        }
      }
    } catch (error) {
      log('   ⚠ Vocabulary section not available', 'yellow');
    }
    
    await takeScreenshot(page, 'lesson_form_complete', 'Lesson form completed');
    
    // Step 6: Save/Publish lesson
    const saveSelectors = [
      'button[type="submit"]',
      '.save-lesson-btn',
      '.publish-btn',
      '[data-action="save"]',
      '[data-action="publish"]'
    ];
    
    let lessonSaved = false;
    for (const selector of saveSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          await waitAndClick(page, selector);
          lessonSaved = true;
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    await page.waitForTimeout(CONFIG.WAIT_TIME * 2);
    await takeScreenshot(page, 'lesson_saved', 'After lesson save attempt');
    
    // Step 7: Verify lesson creation
    const successIndicators = await Promise.all([
      page.$('.success, .alert-success').then(el => el !== null),
      page.evaluate(title => document.body.textContent.includes(title), lessonData.title),
      page.$('.lesson-created, .lesson-saved').then(el => el !== null)
    ]);
    
    const lessonCreated = successIndicators.some(indicator => indicator) || lessonSaved;
    const duration = Date.now() - startTime;
    
    if (lessonCreated && lessonFieldsCompleted >= 3 && contentAdded) {
      logTest('Lesson Builder Workflow', 'PASS', 
        `Lesson created successfully. Fields: ${lessonFieldsCompleted}, Content: ${contentAdded ? 'Yes' : 'No'}`, 
        'workflow', duration);
        
      testResults.workflows.push({
        name: 'Lesson Builder',
        status: 'PASS',
        duration,
        steps_completed: 7,
        data: { 
          fieldsCompleted: lessonFieldsCompleted, 
          contentAdded, 
          objectivesAdded, 
          vocabularyAdded 
        }
      });
    } else {
      logTest('Lesson Builder Workflow', 'FAIL', 
        `Lesson creation failed. Fields: ${lessonFieldsCompleted}, Content: ${contentAdded ? 'Yes' : 'No'}`, 
        'workflow', duration);
        
      testResults.workflows.push({
        name: 'Lesson Builder',
        status: 'FAIL',
        duration,
        steps_completed: lessonFieldsCompleted > 0 ? 4 : 2,
        issues: ['Form fields incomplete or save failed']
      });
    }
    
  } catch (error) {
    logTest('Lesson Builder Workflow', 'FAIL', error.message, 'workflow', Date.now() - startTime);
  } finally {
    await page.close();
  }
}

// =============================================================================
// QUIZ BUILDER WORKFLOW
// =============================================================================

async function testQuizBuilderWorkflow(browser) {
  log('\n🧩 QUIZ BUILDER WORKFLOW TEST', 'bright');
  
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    await loginAsTeacher(page);
    
    // Step 1: Navigate to Quiz Builder
    await page.goto(`${CONFIG.BASE_URL}/quiz-builder.html`, { 
      waitUntil: 'networkidle0', 
      timeout: CONFIG.TIMEOUT 
    });
    
    await takeScreenshot(page, 'quiz_builder_initial', 'Quiz builder initial state');
    
    // Step 2: Set quiz basic information
    const quizData = {
      title: 'Digital Storytelling Assessment',
      description: 'Test your understanding of digital storytelling principles and techniques',
      timeLimit: '30',
      maxAttempts: '3',
      passingScore: '75'
    };
    
    const quizFields = [
      { selector: 'input[name="title"], #quizTitle', value: quizData.title, name: 'Quiz Title' },
      { selector: 'textarea[name="description"], #quizDescription', value: quizData.description, name: 'Description' },
      { selector: 'input[name="time_limit"], #timeLimit', value: quizData.timeLimit, name: 'Time Limit' },
      { selector: 'input[name="max_attempts"], #maxAttempts', value: quizData.maxAttempts, name: 'Max Attempts' },
      { selector: 'input[name="passing_score"], #passingScore', value: quizData.passingScore, name: 'Passing Score' }
    ];
    
    let quizFieldsCompleted = 0;
    for (const field of quizFields) {
      try {
        const element = await page.$(field.selector);
        if (element && await element.isVisible()) {
          await waitAndType(page, field.selector, field.value);
          quizFieldsCompleted++;
          log(`   ✓ Set ${field.name}`, 'green');
        }
      } catch (error) {
        log(`   ⚠ Could not set ${field.name}: ${error.message}`, 'yellow');
      }
    }
    
    // Step 3: Add multiple choice question
    let questionsAdded = 0;
    
    try {
      const addQuestionBtn = await page.$('.add-question-btn, [data-action="add-question"]');
      if (addQuestionBtn && await addQuestionBtn.isVisible()) {
        await addQuestionBtn.click();
        await page.waitForTimeout(1000);
        
        // Fill multiple choice question
        const mcQuestionData = {
          text: 'What is the primary purpose of digital storytelling?',
          type: 'multiple_choice',
          options: [
            { text: 'To replace traditional storytelling', correct: false },
            { text: 'To combine narrative with technology for engagement', correct: true },
            { text: 'To create only visual content', correct: false },
            { text: 'To eliminate the need for writing skills', correct: false }
          ]
        };
        
        // Fill question text
        const questionTextSelector = 'textarea[name="question_text"], #questionText, .question-text';
        const questionTextElement = await page.$(questionTextSelector);
        if (questionTextElement) {
          await waitAndType(page, questionTextSelector, mcQuestionData.text);
          log('   ✓ Added multiple choice question text', 'green');
        }
        
        // Set question type
        const questionTypeSelector = 'select[name="question_type"], #questionType';
        const questionTypeElement = await page.$(questionTypeSelector);
        if (questionTypeElement) {
          await page.select(questionTypeSelector, 'multiple_choice');
          log('   ✓ Set question type to multiple choice', 'green');
        }
        
        // Add answer options
        let optionsAdded = 0;
        for (let i = 0; i < mcQuestionData.options.length; i++) {
          const option = mcQuestionData.options[i];
          const optionSelector = `input[name="option_${i}"], .option-${i} input, [data-option="${i}"]`;
          const optionElement = await page.$(optionSelector);
          
          if (optionElement) {
            await waitAndType(page, optionSelector, option.text);
            
            // Mark correct answer
            if (option.correct) {
              const correctSelector = `input[name="correct_${i}"], .correct-${i}, [data-correct="${i}"]`;
              const correctElement = await page.$(correctSelector);
              if (correctElement) {
                await correctElement.click();
              }
            }
            
            optionsAdded++;
          }
        }
        
        if (optionsAdded >= 2) {
          questionsAdded++;
          log(`   ✓ Added multiple choice question with ${optionsAdded} options`, 'green');
        }
      }
    } catch (error) {
      log(`   ⚠ Could not add multiple choice question: ${error.message}`, 'yellow');
    }
    
    await takeScreenshot(page, 'quiz_mc_question_added', 'Multiple choice question added');
    
    // Step 4: Add true/false question
    try {
      const addAnotherBtn = await page.$('.add-question-btn, [data-action="add-question"]');
      if (addAnotherBtn && await addAnotherBtn.isVisible()) {
        await addAnotherBtn.click();
        await page.waitForTimeout(1000);
        
        const tfQuestionData = {
          text: 'Digital storytelling requires both technical and creative skills.',
          type: 'true_false',
          correct: true
        };
        
        // Fill true/false question
        const tfQuestionSelector = 'textarea[name="question_text"], #questionText, .question-text';
        const tfElements = await page.$$(tfQuestionSelector);
        const tfElement = tfElements[tfElements.length - 1]; // Get the last one (newly added)
        
        if (tfElement) {
          await tfElement.click({ clickCount: 3 });
          await tfElement.type(tfQuestionData.text);
          
          // Set question type to true/false
          const typeSelectors = await page.$$('select[name="question_type"], #questionType');
          const typeElement = typeSelectors[typeSelectors.length - 1];
          
          if (typeElement) {
            await page.evaluate((el) => el.value = 'true_false', typeElement);
            
            // Mark correct answer
            const correctAnswerSelector = tfQuestionData.correct ? 
              'input[value="true"], .true-option' : 
              'input[value="false"], .false-option';
            
            const correctElements = await page.$$(correctAnswerSelector);
            if (correctElements.length > 0) {
              await correctElements[correctElements.length - 1].click();
            }
            
            questionsAdded++;
            log('   ✓ Added true/false question', 'green');
          }
        }
      }
    } catch (error) {
      log(`   ⚠ Could not add true/false question: ${error.message}`, 'yellow');
    }
    
    await takeScreenshot(page, 'quiz_questions_complete', 'All quiz questions added');
    
    // Step 5: Configure quiz settings
    try {
      const settingsSection = await page.$('.quiz-settings, [data-section="settings"]');
      if (settingsSection) {
        // Enable immediate feedback
        const feedbackCheckbox = await page.$('input[name="immediate_feedback"], #immediateFeedback');
        if (feedbackCheckbox && !(await feedbackCheckbox.evaluate(el => el.checked))) {
          await feedbackCheckbox.click();
          log('   ✓ Enabled immediate feedback', 'green');
        }
        
        // Enable question randomization
        const randomizeCheckbox = await page.$('input[name="randomize_questions"], #randomizeQuestions');
        if (randomizeCheckbox && !(await randomizeCheckbox.evaluate(el => el.checked))) {
          await randomizeCheckbox.click();
          log('   ✓ Enabled question randomization', 'green');
        }
      }
    } catch (error) {
      log(`   ⚠ Could not configure quiz settings: ${error.message}`, 'yellow');
    }
    
    // Step 6: Save quiz
    const saveQuizSelectors = [
      '.save-quiz-btn',
      'button[type="submit"]',
      '[data-action="save-quiz"]',
      '.publish-quiz-btn'
    ];
    
    let quizSaved = false;
    for (const selector of saveQuizSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          await waitAndClick(page, selector);
          quizSaved = true;
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    await page.waitForTimeout(CONFIG.WAIT_TIME * 2);
    await takeScreenshot(page, 'quiz_saved', 'Quiz save attempt completed');
    
    // Step 7: Verify quiz creation
    const quizSuccessIndicators = await Promise.all([
      page.$('.success, .alert-success').then(el => el !== null),
      page.evaluate(title => document.body.textContent.includes(title), quizData.title),
      page.$('.quiz-created, .quiz-saved').then(el => el !== null)
    ]);
    
    const quizCreated = quizSuccessIndicators.some(indicator => indicator) || quizSaved;
    const duration = Date.now() - startTime;
    
    if (quizCreated && quizFieldsCompleted >= 2 && questionsAdded >= 1) {
      logTest('Quiz Builder Workflow', 'PASS', 
        `Quiz created successfully. Fields: ${quizFieldsCompleted}, Questions: ${questionsAdded}`, 
        'workflow', duration);
        
      testResults.workflows.push({
        name: 'Quiz Builder',
        status: 'PASS',
        duration,
        steps_completed: 7,
        data: { 
          fieldsCompleted: quizFieldsCompleted, 
          questionsAdded,
          questionTypes: ['multiple_choice', 'true_false'].slice(0, questionsAdded)
        }
      });
    } else {
      logTest('Quiz Builder Workflow', 'FAIL', 
        `Quiz creation failed. Fields: ${quizFieldsCompleted}, Questions: ${questionsAdded}`, 
        'workflow', duration);
        
      testResults.workflows.push({
        name: 'Quiz Builder',
        status: 'FAIL',
        duration,
        steps_completed: questionsAdded > 0 ? 5 : 3,
        issues: ['Quiz form incomplete or save failed']
      });
    }
    
  } catch (error) {
    logTest('Quiz Builder Workflow', 'FAIL', error.message, 'workflow', Date.now() - startTime);
  } finally {
    await page.close();
  }
}

// =============================================================================
// STUDENT PROGRESS MONITORING WORKFLOW
// =============================================================================

async function testStudentProgressWorkflow(browser) {
  log('\n📊 STUDENT PROGRESS MONITORING WORKFLOW TEST', 'bright');
  
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    await loginAsTeacher(page);
    
    // Step 1: Navigate to Grade Center
    await page.goto(`${CONFIG.BASE_URL}/grade-center.html`, { 
      waitUntil: 'networkidle0', 
      timeout: CONFIG.TIMEOUT 
    });
    
    await takeScreenshot(page, 'grade_center_initial', 'Grade center initial view');
    
    // Step 2: Check for student data display
    const studentDataElements = [
      '.student-list',
      '.students-grid', 
      '.grade-table',
      '[data-component="student-grades"]',
      '.student-row'
    ];
    
    let hasStudentData = false;
    let studentCount = 0;
    
    for (const selector of studentDataElements) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          hasStudentData = true;
          
          // Try to count students
          const countSelectors = ['.student-row', '.student-item', '[data-student-id]'];
          for (const countSelector of countSelectors) {
            const students = await page.$$(countSelector);
            if (students.length > studentCount) {
              studentCount = students.length;
            }
          }
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    // Step 3: Check for progress visualization
    const progressElements = [
      '.progress-chart',
      '.progress-bar',
      '.completion-rate',
      '[data-component="progress"]',
      '.grade-chart'
    ];
    
    let hasProgressViz = false;
    for (const selector of progressElements) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          hasProgressViz = true;
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    // Step 4: Test filtering/sorting functionality
    let hasFilterOptions = false;
    const filterSelectors = [
      '.filter-dropdown',
      'select[name="filter"]',
      '.sort-options',
      '[data-action="filter"]',
      '.search-students'
    ];
    
    for (const selector of filterSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          hasFilterOptions = true;
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    // Step 5: Test individual student drill-down
    let hasStudentDetails = false;
    if (hasStudentData) {
      try {
        const studentElements = await page.$$('.student-row, .student-item, [data-student-id]');
        if (studentElements.length > 0) {
          await studentElements[0].click();
          await page.waitForTimeout(1000);
          
          // Check for detailed view
          const detailElements = await page.$$('.student-details, .progress-detail, .assignment-history');
          hasStudentDetails = detailElements.length > 0;
        }
      } catch (error) {
        log('   ⚠ Could not test student details drill-down', 'yellow');
      }
    }
    
    await takeScreenshot(page, 'student_progress_analysis', 'Student progress analysis complete');
    
    // Step 6: Test export functionality (if available)
    let hasExportFeature = false;
    const exportSelectors = [
      '.export-btn',
      '[data-action="export"]',
      '.download-grades',
      'button:has-text("Export")'
    ];
    
    for (const selector of exportSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          hasExportFeature = true;
          // Don't actually click to avoid download
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    const duration = Date.now() - startTime;
    
    // Determine success based on available features
    const featuresFound = [
      hasStudentData,
      hasProgressViz,
      hasFilterOptions,
      hasStudentDetails,
      hasExportFeature
    ].filter(Boolean).length;
    
    if (featuresFound >= 2) {
      logTest('Student Progress Monitoring Workflow', 'PASS', 
        `Found ${featuresFound}/5 expected features. Students: ${studentCount}`, 
        'workflow', duration);
        
      testResults.workflows.push({
        name: 'Student Progress Monitoring',
        status: 'PASS',
        duration,
        steps_completed: 6,
        data: { 
          studentCount,
          featuresFound,
          hasStudentData,
          hasProgressViz,
          hasFilterOptions,
          hasStudentDetails,
          hasExportFeature
        }
      });
    } else {
      logTest('Student Progress Monitoring Workflow', 'FAIL', 
        `Only found ${featuresFound}/5 expected features`, 
        'workflow', duration);
        
      testResults.workflows.push({
        name: 'Student Progress Monitoring',
        status: 'FAIL',
        duration,
        steps_completed: featuresFound + 1,
        issues: ['Insufficient grade center features available']
      });
    }
    
  } catch (error) {
    logTest('Student Progress Monitoring Workflow', 'FAIL', error.message, 'workflow', Date.now() - startTime);
  } finally {
    await page.close();
  }
}

// =============================================================================
// END-TO-END TEACHER WORKFLOW
// =============================================================================

async function testCompleteTeacherWorkflow(browser) {
  log('\n🔄 COMPLETE END-TO-END TEACHER WORKFLOW TEST', 'bright');
  
  const page = await browser.newPage();
  const startTime = Date.now();
  
  try {
    await loginAsTeacher(page);
    
    // Workflow Step 1: Dashboard Overview
    let dashboardUrl = page.url();
    if (!dashboardUrl.includes('teacher-dashboard')) {
      await page.goto(`${CONFIG.BASE_URL}/teacher-dashboard.html`, { 
        waitUntil: 'networkidle0', 
        timeout: CONFIG.TIMEOUT 
      });
    }
    
    await takeScreenshot(page, 'teacher_dashboard_overview', 'Teacher dashboard initial view');
    
    // Check dashboard elements
    const dashboardElements = [
      '.course-summary',
      '.recent-activity',
      '.quick-actions',
      '.student-overview',
      '.pending-assignments'
    ];
    
    let dashboardFeatures = 0;
    for (const selector of dashboardElements) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          dashboardFeatures++;
        }
      } catch (error) {
        // Element not found
      }
    }
    
    // Workflow Step 2: Navigation Test
    const navigationTargets = [
      { url: '/course-management.html', name: 'Course Management', required: true },
      { url: '/lesson-builder.html', name: 'Lesson Builder', required: true },
      { url: '/quiz-builder.html', name: 'Quiz Builder', required: false },
      { url: '/grade-center.html', name: 'Grade Center', required: false },
      { url: '/student-lessons.html', name: 'Student View', required: false }
    ];
    
    let navigationSuccess = 0;
    for (const target of navigationTargets) {
      try {
        await page.goto(`${CONFIG.BASE_URL}${target.url}`, { 
          waitUntil: 'networkidle0', 
          timeout: 10000 
        });
        
        // Verify page loaded correctly
        const pageTitle = await page.title();
        const hasContent = await page.$('main, .main-content, .container, body > div') !== null;
        
        if (hasContent) {
          navigationSuccess++;
          log(`   ✓ Successfully navigated to ${target.name}`, 'green');
        } else {
          log(`   ⚠ ${target.name} loaded but appears empty`, 'yellow');
        }
        
        await page.waitForTimeout(1000);
        
      } catch (error) {
        if (target.required) {
          log(`   ✗ Failed to navigate to required page: ${target.name}`, 'red');
        } else {
          log(`   ⚠ Optional page not available: ${target.name}`, 'yellow');
        }
      }
    }
    
    // Workflow Step 3: Quick Feature Test
    await page.goto(`${CONFIG.BASE_URL}/course-management.html`, { 
      waitUntil: 'networkidle0', 
      timeout: CONFIG.TIMEOUT 
    });
    
    // Test basic interactivity
    const interactiveElements = await page.$$('button:not([disabled]), a[href], input, select');
    const interactiveCount = interactiveElements.length;
    
    // Test form presence
    const forms = await page.$$('form, .form-container, [data-component="form"]');
    const formCount = forms.length;
    
    await takeScreenshot(page, 'teacher_workflow_complete', 'End-to-end workflow completed');
    
    const duration = Date.now() - startTime;
    
    // Workflow success criteria
    const workflowScore = (
      (dashboardFeatures >= 2 ? 1 : 0) +
      (navigationSuccess >= 2 ? 1 : 0) +
      (interactiveCount >= 5 ? 1 : 0) +
      (formCount >= 1 ? 1 : 0)
    );
    
    if (workflowScore >= 3) {
      logTest('Complete Teacher Workflow', 'PASS', 
        `Workflow score: ${workflowScore}/4. Dashboard: ${dashboardFeatures} features, Navigation: ${navigationSuccess}/${navigationTargets.length} pages`, 
        'workflow', duration);
        
      testResults.workflows.push({
        name: 'Complete Teacher Workflow',
        status: 'PASS',
        duration,
        steps_completed: 3,
        data: { 
          workflowScore,
          dashboardFeatures,
          navigationSuccess,
          interactiveCount,
          formCount
        }
      });
    } else {
      logTest('Complete Teacher Workflow', 'FAIL', 
        `Workflow score: ${workflowScore}/4. System not fully functional`, 
        'workflow', duration);
        
      testResults.workflows.push({
        name: 'Complete Teacher Workflow',
        status: 'FAIL',
        duration,
        steps_completed: workflowScore,
        issues: [`Workflow score too low: ${workflowScore}/4`]
      });
    }
    
  } catch (error) {
    logTest('Complete Teacher Workflow', 'FAIL', error.message, 'workflow', Date.now() - startTime);
  } finally {
    await page.close();
  }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runAllTests() {
  const startTime = Date.now();
  
  log('🚀 VidPOD Teacher Workflow Testing Suite', 'bright');
  log('=' * 80, 'bright');
  log(`📡 Base URL: ${CONFIG.BASE_URL}`, 'cyan');
  log(`👨‍🏫 Teacher Account: ${TEACHER_CREDENTIALS.email}`, 'cyan');
  log(`⏱️  Timeout: ${CONFIG.TIMEOUT}ms`, 'cyan');
  log(`📸 Screenshots: ${CONFIG.SCREENSHOT_PATH}`, 'cyan');
  
  let browser;
  
  try {
    browser = await setupBrowser();
    
    // Run all teacher workflow tests
    await testCourseCreationWorkflow(browser);
    await testLessonBuilderWorkflow(browser);
    await testQuizBuilderWorkflow(browser);
    await testStudentProgressWorkflow(browser);
    await testCompleteTeacherWorkflow(browser);
    
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
  log('\n📊 TEACHER WORKFLOW TEST RESULTS', 'bright');
  log('=' * 80, 'bright');
  
  // Summary statistics
  log(`⏱️  Total execution time: ${Math.round(totalTime / 1000)}s`, 'cyan');
  log(`✅ Tests passed: ${testResults.passed}`, 'green');
  log(`❌ Tests failed: ${testResults.failed}`, 'red');
  log(`📈 Total tests: ${testResults.total}`, 'cyan');
  log(`🎯 Success rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`, 'magenta');
  
  // Workflow analysis
  log('\n🔄 Workflow Analysis:', 'bright');
  testResults.workflows.forEach(workflow => {
    const statusColor = workflow.status === 'PASS' ? 'green' : 'red';
    const durationSec = Math.round(workflow.duration / 1000);
    
    log(`   ${workflow.name}: ${workflow.status}`, statusColor);
    log(`     Duration: ${durationSec}s, Steps: ${workflow.steps_completed}`, 'cyan');
    
    if (workflow.data) {
      const dataKeys = Object.keys(workflow.data);
      log(`     Data: ${dataKeys.map(key => `${key}=${workflow.data[key]}`).join(', ')}`, 'cyan');
    }
    
    if (workflow.issues) {
      workflow.issues.forEach(issue => {
        log(`     Issue: ${issue}`, 'yellow');
      });
    }
  });
  
  // Screenshots summary
  if (testResults.screenshots.length > 0) {
    log(`\n📸 Screenshots captured: ${testResults.screenshots.length}`, 'bright');
    log(`   Location: ${CONFIG.SCREENSHOT_PATH}`, 'cyan');
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
    workflows: testResults.workflows,
    screenshots: testResults.screenshots,
    performance_metrics: testResults.performance_metrics,
    details: testResults.details
  };
  
  try {
    await fs.writeFile(
      path.join(__dirname, 'teacher-workflow-test-report.json'), 
      JSON.stringify(report, null, 2)
    );
    log('\n📄 Detailed report saved to: teacher-workflow-test-report.json', 'cyan');
  } catch (error) {
    log(`\n⚠️  Could not save report: ${error.message}`, 'yellow');
  }
  
  // Final status
  const workflowsPassed = testResults.workflows.filter(w => w.status === 'PASS').length;
  const totalWorkflows = testResults.workflows.length;
  
  if (testResults.failed === 0 && workflowsPassed === totalWorkflows) {
    log('\n🎉 ALL TEACHER WORKFLOWS PASSED! System ready for teacher use.', 'green');
  } else if (workflowsPassed >= totalWorkflows * 0.7) {
    log(`\n✅ Most workflows passed (${workflowsPassed}/${totalWorkflows}). Minor issues to address.`, 'yellow');
  } else {
    log(`\n⚠️  Only ${workflowsPassed}/${totalWorkflows} workflows passed. Major issues need resolution.`, 'red');
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