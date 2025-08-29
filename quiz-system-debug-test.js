/**
 * Quiz System Debug Test
 * Focused testing to identify specific issues with quiz system
 */

const puppeteer = require('puppeteer');

class QuizDebugger {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseURL = 'https://podcast-stories-production.up.railway.app';
    }

    async initialize() {
        console.log('🔧 Starting Quiz System Debug Test...\n');
        
        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        
        // Capture network responses for debugging
        this.page.on('response', response => {
            if (response.url().includes('/api/')) {
                console.log(`📡 ${response.request().method()} ${response.url()} → ${response.status()}`);
            }
        });

        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ Browser Error:', msg.text());
            }
        });
    }

    async authenticate() {
        console.log('🔐 Authenticating as teacher...');
        
        await this.page.goto(`${this.baseURL}/`, { waitUntil: 'networkidle2' });
        
        await this.page.waitForSelector('#email');
        await this.page.type('#email', 'teacher@vidpod.com');
        await this.page.type('#password', 'vidpod');
        
        await this.page.click('button[type="submit"]');
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        const currentURL = this.page.url();
        return !currentURL.includes('index.html') && !currentURL.endsWith('/');
    }

    async debugDataLayer() {
        console.log('\n🗄️ Debugging Database Layer...');
        
        const dataCheck = await this.page.evaluate(async (baseURL) => {
            const token = localStorage.getItem('token');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            const tests = [];

            // Test 1: Check if courses exist
            try {
                const coursesRes = await fetch(`${baseURL}/api/courses`, { headers });
                const coursesData = await coursesRes.json();
                tests.push({
                    name: 'Courses API',
                    status: coursesRes.status,
                    success: coursesRes.ok,
                    dataCount: coursesData && Array.isArray(coursesData) ? coursesData.length : 0,
                    data: coursesData
                });
            } catch (error) {
                tests.push({
                    name: 'Courses API',
                    status: 'ERROR',
                    error: error.message
                });
            }

            // Test 2: Check if lessons exist
            try {
                const lessonsRes = await fetch(`${baseURL}/api/lessons`, { headers });
                const lessonsData = await lessonsRes.json();
                tests.push({
                    name: 'Lessons API',
                    status: lessonsRes.status,
                    success: lessonsRes.ok,
                    dataCount: lessonsData && Array.isArray(lessonsData) ? lessonsData.length : 0,
                    data: lessonsData
                });
            } catch (error) {
                tests.push({
                    name: 'Lessons API',
                    status: 'ERROR',
                    error: error.message
                });
            }

            // Test 3: Try to create a course first
            try {
                const courseData = {
                    title: 'Test Course for Quiz System',
                    description: 'Automated test course for quiz functionality verification',
                    max_weeks: 9,
                    learning_objectives: ['Test objective 1', 'Test objective 2']
                };

                const createCourseRes = await fetch(`${baseURL}/api/courses`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(courseData)
                });

                const courseResult = await createCourseRes.json();
                tests.push({
                    name: 'Course Creation',
                    status: createCourseRes.status,
                    success: createCourseRes.ok,
                    data: courseResult
                });
            } catch (error) {
                tests.push({
                    name: 'Course Creation',
                    status: 'ERROR',
                    error: error.message
                });
            }

            return tests;
        }, this.baseURL);

        dataCheck.forEach(test => {
            console.log(`  ${test.success ? '✅' : '❌'} ${test.name}: ${test.status}${test.dataCount !== undefined ? ` (${test.dataCount} items)` : ''}`);
            if (test.error) {
                console.log(`      Error: ${test.error}`);
            }
            if (test.data && !test.success && test.data.error) {
                console.log(`      Server Error: ${test.data.error}`);
            }
        });

        return dataCheck;
    }

    async debugQuizCreationFlow() {
        console.log('\n📝 Debugging Quiz Creation Flow...');

        const creationFlow = await this.page.evaluate(async (baseURL) => {
            const token = localStorage.getItem('token');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            const tests = [];

            // Step 1: Get courses first
            try {
                const coursesRes = await fetch(`${baseURL}/api/courses`, { headers });
                const courses = await coursesRes.json();
                
                if (coursesRes.ok && courses && courses.length > 0) {
                    // Step 2: Create a lesson for the course
                    const lessonData = {
                        course_id: courses[0].id,
                        title: 'Test Lesson for Quiz',
                        description: 'Automated test lesson',
                        week_number: 1,
                        content: 'Test lesson content',
                        is_published: true
                    };

                    const createLessonRes = await fetch(`${baseURL}/api/lessons`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(lessonData)
                    });

                    const lessonResult = await createLessonRes.json();
                    tests.push({
                        name: 'Lesson Creation',
                        status: createLessonRes.status,
                        success: createLessonRes.ok,
                        data: lessonResult
                    });

                    if (createLessonRes.ok && lessonResult.id) {
                        // Step 3: Create quiz for the lesson
                        const quizData = {
                            lesson_id: lessonResult.id,
                            title: 'Debug Test Quiz',
                            description: 'Automated debug quiz',
                            time_limit: 30,
                            attempts_allowed: 3,
                            questions: [
                                {
                                    question_text: 'What is 2+2?',
                                    question_type: 'multiple_choice',
                                    points: 1,
                                    answer_options: [
                                        { text: '3', is_correct: false },
                                        { text: '4', is_correct: true },
                                        { text: '5', is_correct: false }
                                    ]
                                }
                            ]
                        };

                        const createQuizRes = await fetch(`${baseURL}/api/quizzes`, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify(quizData)
                        });

                        const quizResult = await createQuizRes.json();
                        tests.push({
                            name: 'Quiz Creation',
                            status: createQuizRes.status,
                            success: createQuizRes.ok,
                            data: quizResult
                        });
                    }
                } else {
                    tests.push({
                        name: 'Prerequisites',
                        status: 'FAIL',
                        success: false,
                        error: 'No courses available to create lesson/quiz'
                    });
                }
            } catch (error) {
                tests.push({
                    name: 'Flow Error',
                    status: 'ERROR',
                    error: error.message
                });
            }

            return tests;
        }, this.baseURL);

        creationFlow.forEach(test => {
            console.log(`  ${test.success ? '✅' : '❌'} ${test.name}: ${test.status}`);
            if (test.error) {
                console.log(`      Error: ${test.error}`);
            }
            if (test.data && !test.success && test.data.error) {
                console.log(`      Server Error: ${test.data.error}`);
            }
        });

        return creationFlow;
    }

    async debugAuthenticationAndPermissions() {
        console.log('\n🔐 Debugging Authentication & Permissions...');

        const authCheck = await this.page.evaluate(async () => {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            
            return {
                hasToken: !!token,
                tokenLength: token ? token.length : 0,
                userInfo: user,
                userRole: user.role,
                userId: user.id
            };
        });

        console.log(`  Token Present: ${authCheck.hasToken ? '✅' : '❌'}`);
        console.log(`  Token Length: ${authCheck.tokenLength} chars`);
        console.log(`  User Role: ${authCheck.userRole || 'None'}`);
        console.log(`  User ID: ${authCheck.userId || 'None'}`);

        return authCheck;
    }

    async runDebugTests() {
        try {
            await this.initialize();
            
            const authenticated = await this.authenticate();
            if (!authenticated) {
                console.log('❌ Authentication failed - cannot proceed with tests');
                return false;
            }

            await this.debugAuthenticationAndPermissions();
            const dataResults = await this.debugDataLayer();
            const flowResults = await this.debugQuizCreationFlow();

            const summary = {
                authentication: authenticated,
                dataLayer: dataResults.some(t => t.success),
                quizFlow: flowResults.some(t => t.success)
            };

            console.log('\n🎯 DEBUG SUMMARY:');
            console.log(`  Authentication: ${summary.authentication ? '✅' : '❌'}`);
            console.log(`  Data Layer: ${summary.dataLayer ? '✅' : '❌'}`);
            console.log(`  Quiz Flow: ${summary.quizFlow ? '✅' : '❌'}`);

            return summary;

        } catch (error) {
            console.log('❌ Debug test failed:', error.message);
            return false;
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// Run debug tests
if (require.main === module) {
    const quizDebugger = new QuizDebugger();
    quizDebugger.runDebugTests()
        .then(result => {
            console.log('\n✅ Debug tests completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Debug failed:', error);
            process.exit(1);
        });
}

module.exports = QuizDebugger;