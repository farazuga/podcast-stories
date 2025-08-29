/**
 * Quiz System Data Layer Test
 * Test database connectivity and create sample data if needed
 */

const { Pool } = require('pg');

class QuizDataTest {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async testDatabaseSchema() {
        console.log('🗄️ Testing Database Schema...\n');

        try {
            // Test 1: Check if required tables exist
            const tablesQuery = `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('courses', 'lessons', 'quizzes', 'quiz_questions', 'quiz_attempts', 'schools')
                ORDER BY table_name;
            `;
            
            const tablesResult = await this.pool.query(tablesQuery);
            console.log('📋 Required Tables:');
            tablesResult.rows.forEach(row => {
                console.log(`  ✅ ${row.table_name}`);
            });
            
            const requiredTables = ['courses', 'lessons', 'quizzes', 'quiz_questions', 'quiz_attempts', 'schools'];
            const existingTables = tablesResult.rows.map(row => row.table_name);
            const missingTables = requiredTables.filter(table => !existingTables.includes(table));
            
            if (missingTables.length > 0) {
                console.log('\n❌ Missing Tables:');
                missingTables.forEach(table => console.log(`  ❌ ${table}`));
                return false;
            }

            // Test 2: Check schools table columns
            const schoolsColumnsQuery = `
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'schools' 
                ORDER BY ordinal_position;
            `;
            
            const schoolsColumns = await this.pool.query(schoolsColumnsQuery);
            console.log('\n📋 Schools Table Columns:');
            schoolsColumns.rows.forEach(row => {
                console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });

            // Test 3: Check courses table columns
            const coursesColumnsQuery = `
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'courses' 
                ORDER BY ordinal_position;
            `;
            
            const coursesColumns = await this.pool.query(coursesColumnsQuery);
            console.log('\n📋 Courses Table Columns:');
            coursesColumns.rows.forEach(row => {
                console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });

            return true;

        } catch (error) {
            console.log('❌ Database schema test failed:', error.message);
            return false;
        }
    }

    async createSampleData() {
        console.log('\n🌱 Creating Sample Data for Testing...\n');

        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Get teacher user ID
            const teacherResult = await client.query(
                "SELECT id FROM users WHERE role = 'teacher' LIMIT 1"
            );

            if (teacherResult.rows.length === 0) {
                console.log('❌ No teacher found - cannot create sample data');
                return false;
            }

            const teacherId = teacherResult.rows[0].id;
            console.log(`📝 Using Teacher ID: ${teacherId}`);

            // Get a school ID
            const schoolResult = await client.query(
                "SELECT id FROM schools LIMIT 1"
            );

            const schoolId = schoolResult.rows.length > 0 ? schoolResult.rows[0].id : null;
            console.log(`🏫 Using School ID: ${schoolId || 'None'}`);

            // Create sample course
            const courseInsert = `
                INSERT INTO courses (title, description, teacher_id, school_id, total_weeks, is_active, learning_objectives)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (teacher_id, title) DO UPDATE SET
                    description = EXCLUDED.description,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, title;
            `;

            const courseValues = [
                'Introduction to Podcasting - Quiz Test',
                'A comprehensive course designed to test the quiz system functionality',
                teacherId,
                schoolId,
                9,
                true,
                JSON.stringify([
                    'Understand podcast production workflow',
                    'Learn audio editing techniques',
                    'Master storytelling skills'
                ])
            ];

            const courseResult = await client.query(courseInsert, courseValues);
            const courseId = courseResult.rows[0].id;
            console.log(`✅ Course created/updated: ${courseResult.rows[0].title} (ID: ${courseId})`);

            // Create sample lessons
            const lessonInserts = [
                {
                    title: 'Week 1: Introduction to Podcasting',
                    description: 'Learn the basics of podcast production and planning',
                    week_number: 1,
                    content: 'Introduction to the world of podcasting, understanding different formats and target audiences.'
                },
                {
                    title: 'Week 2: Pre-Production Planning',
                    description: 'Planning your podcast episodes and content strategy',
                    week_number: 2,
                    content: 'How to plan episodes, research topics, and prepare interview questions.'
                },
                {
                    title: 'Week 3: Recording Techniques',
                    description: 'Learn proper recording techniques and equipment usage',
                    week_number: 3,
                    content: 'Microphone selection, recording environments, and audio capture best practices.'
                }
            ];

            const lessonIds = [];
            
            for (const lesson of lessonInserts) {
                const lessonQuery = `
                    INSERT INTO lessons (course_id, title, description, week_number, content, learning_objectives, is_published)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (course_id, week_number) DO UPDATE SET
                        title = EXCLUDED.title,
                        description = EXCLUDED.description,
                        content = EXCLUDED.content,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING id, title;
                `;

                const lessonValues = [
                    courseId,
                    lesson.title,
                    lesson.description,
                    lesson.week_number,
                    lesson.content,
                    JSON.stringify(['Learn basic concepts', 'Apply practical skills', 'Complete exercises']),
                    true
                ];

                const lessonResult = await client.query(lessonQuery, lessonValues);
                lessonIds.push(lessonResult.rows[0].id);
                console.log(`✅ Lesson created/updated: ${lessonResult.rows[0].title} (ID: ${lessonResult.rows[0].id})`);
            }

            // Create sample quiz for the first lesson
            const quizInsert = `
                INSERT INTO quizzes (lesson_id, title, description, time_limit, attempts_allowed, grading_method, passing_score, is_published)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT DO NOTHING
                RETURNING id, title;
            `;

            const quizValues = [
                lessonIds[0], // First lesson
                'Introduction to Podcasting Quiz',
                'Test your understanding of basic podcasting concepts',
                30, // 30 minutes
                3,  // 3 attempts allowed
                'best', // best score grading
                70, // 70% passing score
                true
            ];

            const quizResult = await client.query(quizInsert, quizValues);
            
            if (quizResult.rows.length > 0) {
                const quizId = quizResult.rows[0].id;
                console.log(`✅ Quiz created: ${quizResult.rows[0].title} (ID: ${quizId})`);

                // Create sample quiz questions
                const questions = [
                    {
                        question_text: 'What is the primary purpose of pre-production planning in podcasting?',
                        question_type: 'multiple_choice',
                        points: 2,
                        answer_options: JSON.stringify([
                            { text: 'To save time during recording', is_correct: true },
                            { text: 'To make the podcast longer', is_correct: false },
                            { text: 'To add more advertisements', is_correct: false },
                            { text: 'To increase production costs', is_correct: false }
                        ]),
                        explanation: 'Pre-production planning helps organize content and saves time during actual recording sessions.'
                    },
                    {
                        question_text: 'True or False: Audio quality is not important for podcast success.',
                        question_type: 'true_false',
                        points: 1,
                        answer_options: JSON.stringify([
                            { text: 'True', is_correct: false },
                            { text: 'False', is_correct: true }
                        ]),
                        explanation: 'Audio quality is crucial for podcast success as poor audio can drive listeners away.'
                    },
                    {
                        question_text: 'Name one essential piece of equipment for podcast recording.',
                        question_type: 'short_answer',
                        points: 2,
                        answer_options: JSON.stringify({
                            correct_answers: ['microphone', 'mic', 'headphones', 'computer', 'recording software'],
                            case_sensitive: false,
                            partial_credit: true
                        }),
                        explanation: 'Essential equipment includes microphones, headphones, computers, and recording software.'
                    }
                ];

                for (let i = 0; i < questions.length; i++) {
                    const questionQuery = `
                        INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, answer_options, explanation, sort_order)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT DO NOTHING
                        RETURNING id;
                    `;

                    const questionValues = [
                        quizId,
                        questions[i].question_text,
                        questions[i].question_type,
                        questions[i].points,
                        questions[i].answer_options,
                        questions[i].explanation,
                        i
                    ];

                    const questionResult = await client.query(questionQuery, questionValues);
                    if (questionResult.rows.length > 0) {
                        console.log(`  ✅ Question ${i + 1} created (${questions[i].question_type})`);
                    }
                }
            } else {
                console.log('ℹ️  Quiz already exists for this lesson');
            }

            await client.query('COMMIT');
            console.log('\n✅ Sample data creation completed successfully!');
            return true;

        } catch (error) {
            await client.query('ROLLBACK');
            console.log('❌ Sample data creation failed:', error.message);
            console.log('   Details:', error.detail || 'No additional details');
            return false;
        } finally {
            client.release();
        }
    }

    async testDataCounts() {
        console.log('\n📊 Checking Data Counts...\n');

        try {
            const tables = ['courses', 'lessons', 'quizzes', 'quiz_questions', 'quiz_attempts'];
            
            for (const table of tables) {
                const countResult = await this.pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = countResult.rows[0].count;
                console.log(`  ${table}: ${count} records`);
            }

            return true;
        } catch (error) {
            console.log('❌ Data count test failed:', error.message);
            return false;
        }
    }

    async cleanup() {
        await this.pool.end();
    }

    async runTests() {
        try {
            console.log('🚀 Starting Quiz System Data Layer Tests...\n');
            
            // Test database schema
            const schemaOk = await this.testDatabaseSchema();
            if (!schemaOk) {
                console.log('❌ Schema test failed - cannot continue');
                return false;
            }

            // Create sample data
            await this.createSampleData();

            // Check final data counts
            await this.testDataCounts();

            console.log('\n🎯 Data Layer Tests Complete!');
            return true;

        } catch (error) {
            console.log('❌ Data layer tests failed:', error.message);
            return false;
        } finally {
            await this.cleanup();
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new QuizDataTest();
    tester.runTests()
        .then(result => {
            if (result) {
                console.log('\n✅ All data layer tests passed!');
                process.exit(0);
            } else {
                console.log('\n❌ Data layer tests failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 Critical error:', error);
            process.exit(1);
        });
}

module.exports = QuizDataTest;