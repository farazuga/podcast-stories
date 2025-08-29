const express = require('express');
const { Pool } = require('pg');
const { verifyToken, isTeacherOrAbove, hasAnyRole } = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// =============================================================================
// QUIZ MANAGEMENT API ROUTES
// =============================================================================

/**
 * GET /api/quizzes/lesson/:lessonId
 * Get quiz for a specific lesson
 */
router.get('/lesson/:lessonId', verifyToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check lesson access
    const hasAccess = await checkLessonAccess(userId, lessonId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied. You do not have access to this lesson.' });
    }

    // Get quiz directly linked to lesson
    const quizQuery = `
      SELECT 
        q.*,
        l.title as lesson_title,
        c.title as course_title
      FROM quizzes q
      JOIN lessons l ON q.lesson_id = l.id
      JOIN courses c ON l.course_id = c.id
      WHERE l.id = $1
    `;

    const quizResult = await pool.query(quizQuery, [lessonId]);

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'No quiz found for this lesson' });
    }

    const quiz = quizResult.rows[0];

    // Get questions (different view for students vs teachers)
    let questionsQuery;
    if (userRole === 'student') {
      // Students see questions without correct answers
      questionsQuery = `
        SELECT 
          id, quiz_id, question_text, question_type, points,
          answer_options - 'is_correct' as answer_options,
          explanation, hints, sort_order
        FROM quiz_questions 
        WHERE quiz_id = $1 
        ORDER BY sort_order, created_at
      `;
    } else {
      // Teachers/admins see full questions with answers
      questionsQuery = `
        SELECT * FROM quiz_questions 
        WHERE quiz_id = $1 
        ORDER BY sort_order, created_at
      `;
    }

    const questionsResult = await pool.query(questionsQuery, [quiz.id]);

    // For students, also get their attempt history
    let attempts = [];
    if (userRole === 'student') {
      const attemptsQuery = `
        SELECT 
          attempt_number, status, score, percentage_score, 
          started_at, submitted_at, time_taken,
          is_practice
        FROM quiz_attempts 
        WHERE quiz_id = $1 AND student_id = $2
        ORDER BY attempt_number DESC
      `;
      const attemptsResult = await pool.query(attemptsQuery, [quiz.id, userId]);
      attempts = attemptsResult.rows;
    }

    res.json({
      ...quiz,
      questions: questionsResult.rows,
      student_attempts: attempts
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

/**
 * GET /api/quizzes/:id
 * Get detailed quiz information
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get quiz details with lesson context
    const quizQuery = `
      SELECT 
        q.*,
        q.lesson_id,
        l.title as lesson_title,
        c.title as course_title,
        c.teacher_id
      FROM quizzes q
      JOIN lessons l ON q.lesson_id = l.id
      JOIN courses c ON l.course_id = c.id
      WHERE q.id = $1
    `;

    const quizResult = await pool.query(quizQuery, [id]);

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quiz = quizResult.rows[0];

    // Check access permissions
    const hasAccess = await checkLessonAccess(userId, quiz.lesson_id, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied. You do not have access to this quiz.' });
    }

    // Get questions with appropriate filtering
    let questionsQuery;
    if (userRole === 'student') {
      questionsQuery = `
        SELECT 
          id, quiz_id, question_text, question_type, points,
          answer_options - 'is_correct' as answer_options,
          explanation, hints, sort_order
        FROM quiz_questions 
        WHERE quiz_id = $1 
        ORDER BY sort_order, created_at
      `;
    } else {
      questionsQuery = `
        SELECT * FROM quiz_questions 
        WHERE quiz_id = $1 
        ORDER BY sort_order, created_at
      `;
    }

    const questionsResult = await pool.query(questionsQuery, [id]);

    // Get student attempt history if student
    let attempts = [];
    if (userRole === 'student') {
      const attemptsResult = await pool.query(
        `SELECT 
          attempt_number, status, score, percentage_score, 
          started_at, submitted_at, time_taken, is_practice
        FROM quiz_attempts 
        WHERE quiz_id = $1 AND student_id = $2
        ORDER BY attempt_number DESC`,
        [id, userId]
      );
      attempts = attemptsResult.rows;
    }

    res.json({
      ...quiz,
      questions: questionsResult.rows,
      student_attempts: attempts
    });
  } catch (error) {
    console.error('Error fetching quiz details:', error);
    res.status(500).json({ error: 'Failed to fetch quiz details' });
  }
});

/**
 * POST /api/quizzes
 * Create new quiz with questions
 */
router.post('/', verifyToken, isTeacherOrAbove, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      lesson_id,
      title,
      description,
      instructions,
      time_limit,
      attempts_allowed,
      grading_method,
      passing_score,
      randomize_questions,
      randomize_answers,
      show_correct_answers,
      show_hints,
      lockdown_browser,
      password,
      questions
    } = req.body;

    // Validation
    if (!lesson_id || !title) {
      return res.status(400).json({ 
        error: 'Lesson ID and title are required' 
      });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        error: 'At least one question is required' 
      });
    }

    // Check if user can create quiz for this lesson
    const lessonCheck = await client.query(
      `SELECT l.*, c.teacher_id 
       FROM lessons l 
       JOIN courses c ON l.course_id = c.id 
       WHERE l.id = $1`,
      [lesson_id]
    );
    
    if (lessonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const canCreate = 
      req.user.role === 'amitrace_admin' || 
      lessonCheck.rows[0].teacher_id === req.user.id;

    if (!canCreate) {
      return res.status(403).json({ error: 'Access denied. You can only create quizzes for your own courses.' });
    }

    // Check if quiz already exists for this lesson
    const existingQuiz = await client.query('SELECT id FROM quizzes WHERE lesson_id = $1', [lesson_id]);
    
    if (existingQuiz.rows.length > 0) {
      return res.status(400).json({ error: 'A quiz already exists for this lesson' });
    }

    // Create quiz
    const quizResult = await client.query(
      `INSERT INTO quizzes (
        lesson_id, title, description, time_limit, attempts_allowed, 
        grading_method, passing_score, randomize_questions, 
        show_correct_answers, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        lesson_id,
        title,
        description || '',
        time_limit || null,
        attempts_allowed || 3, // Use 3 as default instead of -1
        grading_method || 'best',
        passing_score || 70,
        randomize_questions || false,
        show_correct_answers || true,
        false // is_published defaults to false
      ]
    );

    const quizId = quizResult.rows[0].id;

    // Create questions
    const questionPromises = questions.map(async (question, index) => {
      const {
        question_text,
        question_type,
        answer_options,
        correct_answer,
        points,
        explanation,
        hints
      } = question;

      // Validate question
      if (!question_text || !question_type) {
        throw new Error(`Question ${index + 1}: Text and type are required`);
      }

      const validTypes = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank', 'matching', 'ordering'];
      if (!validTypes.includes(question_type)) {
        throw new Error(`Question ${index + 1}: Invalid question type`);
      }

      // Process answer options based on question type
      let processedOptions = answer_options;
      if (question_type === 'multiple_choice' && Array.isArray(answer_options)) {
        // Mark correct answer in options
        processedOptions = answer_options.map(option => ({
          ...option,
          is_correct: correct_answer ? option.text === correct_answer : option.is_correct || false
        }));
      } else if (question_type === 'true_false') {
        processedOptions = [
          { text: 'True', is_correct: correct_answer === 'true' || correct_answer === true },
          { text: 'False', is_correct: correct_answer === 'false' || correct_answer === false }
        ];
      } else if (question_type === 'short_answer') {
        // For short answer, store correct answers as array
        processedOptions = {
          correct_answers: Array.isArray(correct_answer) ? correct_answer : [correct_answer],
          case_sensitive: question.case_sensitive || false,
          partial_credit: question.partial_credit || false
        };
      }

      return client.query(
        `INSERT INTO quiz_questions (
          quiz_id, question_text, question_type, answer_options,
          points, explanation, hints, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          quizId,
          question_text,
          question_type,
          JSON.stringify(processedOptions),
          points || 1,
          explanation || '',
          hints || '',
          index
        ]
      );
    });

    const questionResults = await Promise.all(questionPromises);

    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Quiz created successfully',
      quiz: quizResult.rows[0],
      questions: questionResults.map(result => result.rows[0])
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating quiz:', error);
    res.status(500).json({ 
      error: 'Failed to create quiz',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/quizzes/:id
 * Update quiz configuration
 */
router.put('/:id', verifyToken, isTeacherOrAbove, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      title,
      description,
      instructions,
      time_limit,
      attempts_allowed,
      grading_method,
      passing_score,
      randomize_questions,
      randomize_answers,
      show_correct_answers,
      show_hints,
      lockdown_browser,
      password
    } = req.body;

    // Check permissions
    const quizCheck = await client.query(
      `SELECT q.*, c.teacher_id 
       FROM quizzes q
       JOIN lessons l ON q.lesson_id = l.id
       JOIN courses c ON l.course_id = c.id
       WHERE q.id = $1`,
      [id]
    );
    
    if (quizCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const canEdit = 
      req.user.role === 'amitrace_admin' || 
      quizCheck.rows[0].teacher_id === req.user.id;

    if (!canEdit) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCounter = 1;

    const updateFields = {
      title, description, instructions, time_limit, attempts_allowed,
      grading_method, passing_score, randomize_questions, randomize_answers,
      show_correct_answers, show_hints, lockdown_browser, password
    };

    for (const [field, value] of Object.entries(updateFields)) {
      if (value !== undefined) {
        updates.push(`${field} = $${paramCounter}`);
        values.push(value);
        paramCounter++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE quizzes SET ${updates.join(', ')} WHERE id = $${paramCounter} RETURNING *`;
    
    const result = await client.query(query, values);

    await client.query('COMMIT');
    
    res.json({
      message: 'Quiz updated successfully',
      quiz: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating quiz:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/quizzes/:id/attempts
 * Submit quiz attempt with auto-grading
 */
router.post('/:id/attempts', verifyToken, hasAnyRole(['student', 'admin', 'amitrace_admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const quizId = req.params.id;
    const studentId = req.body.student_id || req.user.id;
    const { responses, is_practice } = req.body;

    // Only admins can submit for other students
    if (studentId !== req.user.id && req.user.role !== 'amitrace_admin') {
      return res.status(403).json({ error: 'Access denied. You can only submit your own attempts.' });
    }

    // Get quiz details
    const quizQuery = await client.query(
      `SELECT q.*, q.lesson_id
       FROM quizzes q
       WHERE q.id = $1`,
      [quizId]
    );

    if (quizQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quiz = quizQuery.rows[0];

    // Check lesson access
    const hasAccess = await checkLessonAccess(studentId, quiz.lesson_id, req.user.role);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied. Student is not enrolled in this course.' });
    }

    // Check attempt limits
    if (!is_practice && quiz.attempts_allowed > 0) {
      const existingAttempts = await client.query(
        'SELECT COUNT(*) as count FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2 AND is_practice = false',
        [quizId, studentId]
      );

      if (parseInt(existingAttempts.rows[0].count) >= quiz.attempts_allowed) {
        return res.status(400).json({ 
          error: `Maximum attempts (${quiz.attempts_allowed}) reached for this quiz`
        });
      }
    }

    // Get next attempt number
    const attemptNumberQuery = await client.query(
      'SELECT COALESCE(MAX(attempt_number), 0) + 1 as next_attempt FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2',
      [quizId, studentId]
    );
    const attemptNumber = attemptNumberQuery.rows[0].next_attempt;

    // Get questions for grading
    const questionsQuery = await client.query(
      'SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY sort_order, created_at',
      [quizId]
    );
    const questions = questionsQuery.rows;

    // Auto-grade the attempt
    const gradingResult = await gradeQuizAttempt(questions, responses);

    // Calculate percentage score
    const percentageScore = gradingResult.totalPoints > 0 
      ? (gradingResult.earnedPoints / gradingResult.totalPoints) * 100 
      : 0;

    // Create attempt record
    const attemptResult = await client.query(
      `INSERT INTO quiz_attempts (
        quiz_id, student_id, attempt_number, responses, score, 
        percentage_score, status, started_at, submitted_at, 
        time_taken, is_practice, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        quizId,
        studentId,
        attemptNumber,
        JSON.stringify(gradingResult.detailedResponses),
        gradingResult.earnedPoints,
        percentageScore,
        'completed',
        new Date(Date.now() - (req.body.time_taken || 0) * 1000), // Estimate start time
        new Date(),
        req.body.time_taken || 0,
        is_practice || false,
        req.ip,
        req.get('User-Agent')
      ]
    );

    const attempt = attemptResult.rows[0];

    // Update student progress if not practice and quiz passed
    if (!is_practice && percentageScore >= quiz.passing_score) {
      try {
        await client.query('SELECT update_student_progress($1, $2)', [studentId, quiz.lesson_id]);
      } catch (progressError) {
        console.error('Warning: Failed to update student progress:', progressError.message);
      }
    }

    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Quiz attempt submitted successfully',
      attempt: {
        ...attempt,
        total_questions: questions.length,
        correct_answers: gradingResult.correctCount,
        passed: percentageScore >= quiz.passing_score
      },
      grading_details: quiz.show_correct_answers ? gradingResult.detailedResponses : null
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting quiz attempt:', error);
    res.status(500).json({ error: 'Failed to submit quiz attempt' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/quizzes/:id/attempts
 * Get all attempts for a quiz (teachers/admins only)
 */
router.get('/:id/attempts', verifyToken, isTeacherOrAbove, async (req, res) => {
  try {
    const { id: quizId } = req.params;
    const { student_id } = req.query;

    // Check permissions
    const quizCheck = await pool.query(
      `SELECT c.teacher_id 
       FROM quizzes q
       JOIN lessons l ON q.lesson_id = l.id
       JOIN courses c ON l.course_id = c.id
       WHERE q.id = $1`,
      [quizId]
    );
    
    if (quizCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const canView = 
      req.user.role === 'amitrace_admin' || 
      quizCheck.rows[0].teacher_id === req.user.id;

    if (!canView) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    let query = `
      SELECT 
        qa.*,
        u.name as student_name,
        u.email as student_email,
        u.student_id
      FROM quiz_attempts qa
      JOIN users u ON qa.student_id = u.id
      WHERE qa.quiz_id = $1
    `;

    const params = [quizId];

    if (student_id) {
      query += ` AND qa.student_id = $2`;
      params.push(student_id);
    }

    query += ` ORDER BY qa.submitted_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching quiz attempts:', error);
    res.status(500).json({ error: 'Failed to fetch quiz attempts' });
  }
});

/**
 * GET /api/quizzes/:id/attempts/:attemptId
 * Get detailed attempt information
 */
router.get('/:id/attempts/:attemptId', verifyToken, async (req, res) => {
  try {
    const { id: quizId, attemptId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get attempt with permission check
    let query = `
      SELECT 
        qa.*,
        u.name as student_name,
        u.email as student_email,
        q.title as quiz_title,
        q.show_correct_answers
      FROM quiz_attempts qa
      JOIN users u ON qa.student_id = u.id
      JOIN quizzes q ON qa.quiz_id = q.id
      WHERE qa.id = $1 AND qa.quiz_id = $2
    `;

    const attemptResult = await pool.query(query, [attemptId, quizId]);

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz attempt not found' });
    }

    const attempt = attemptResult.rows[0];

    // Check permissions - students can only see their own attempts
    if (userRole === 'student' && attempt.student_id !== userId) {
      return res.status(403).json({ error: 'Access denied. You can only view your own attempts.' });
    }

    // Check if teacher owns the quiz
    if (userRole === 'teacher') {
      const teacherCheck = await pool.query(
        `SELECT c.teacher_id 
         FROM quizzes q
         JOIN lessons l ON q.lesson_id = l.id
         JOIN courses c ON l.course_id = c.id
         WHERE q.id = $1`,
        [quizId]
      );
      
      if (teacherCheck.rows.length === 0 || teacherCheck.rows[0].teacher_id !== userId) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    }

    // Get questions for context
    const questionsResult = await pool.query(
      'SELECT id, question_text, question_type, points FROM quiz_questions WHERE quiz_id = $1 ORDER BY sort_order',
      [quizId]
    );

    res.json({
      ...attempt,
      questions: questionsResult.rows,
      show_answers: attempt.show_correct_answers || userRole !== 'student'
    });
  } catch (error) {
    console.error('Error fetching quiz attempt details:', error);
    res.status(500).json({ error: 'Failed to fetch attempt details' });
  }
});

// =============================================================================
// AUTO-GRADING ENGINE
// =============================================================================

/**
 * Grade a quiz attempt automatically
 */
async function gradeQuizAttempt(questions, responses) {
  let earnedPoints = 0;
  let totalPoints = 0;
  let correctCount = 0;
  const detailedResponses = {};

  for (const question of questions) {
    const questionId = question.id.toString();
    const studentResponse = responses[questionId];
    totalPoints += parseFloat(question.points);

    if (!studentResponse) {
      // No response provided
      detailedResponses[questionId] = {
        answer: null,
        is_correct: false,
        points_earned: 0,
        time_spent: 0
      };
      continue;
    }

    let isCorrect = false;
    let pointsEarned = 0;

    switch (question.question_type) {
      case 'multiple_choice':
        isCorrect = gradeMultipleChoice(question, studentResponse.answer);
        pointsEarned = isCorrect ? parseFloat(question.points) : 0;
        break;

      case 'true_false':
        isCorrect = gradeTrueFalse(question, studentResponse.answer);
        pointsEarned = isCorrect ? parseFloat(question.points) : 0;
        break;

      case 'short_answer':
        const shortAnswerResult = gradeShortAnswer(question, studentResponse.answer);
        isCorrect = shortAnswerResult.isCorrect;
        pointsEarned = shortAnswerResult.pointsEarned;
        break;

      case 'essay':
        // Essays require manual grading
        isCorrect = null;
        pointsEarned = 0; // Will be graded manually
        break;

      case 'fill_blank':
        const fillBlankResult = gradeFillBlank(question, studentResponse.answer);
        isCorrect = fillBlankResult.isCorrect;
        pointsEarned = fillBlankResult.pointsEarned;
        break;

      case 'matching':
        const matchingResult = gradeMatching(question, studentResponse.answer);
        isCorrect = matchingResult.isCorrect;
        pointsEarned = matchingResult.pointsEarned;
        break;

      case 'ordering':
        isCorrect = gradeOrdering(question, studentResponse.answer);
        pointsEarned = isCorrect ? parseFloat(question.points) : 0;
        break;

      default:
        console.warn(`Unknown question type: ${question.question_type}`);
    }

    if (isCorrect) {
      correctCount++;
    }

    earnedPoints += pointsEarned;

    detailedResponses[questionId] = {
      answer: studentResponse.answer,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      time_spent: studentResponse.time_spent || 0
    };
  }

  return {
    earnedPoints,
    totalPoints,
    correctCount,
    detailedResponses
  };
}

/**
 * Grade multiple choice questions
 */
function gradeMultipleChoice(question, studentAnswer) {
  const options = JSON.parse(question.answer_options);
  const correctOption = options.find(opt => opt.is_correct);
  return correctOption && correctOption.text === studentAnswer;
}

/**
 * Grade true/false questions
 */
function gradeTrueFalse(question, studentAnswer) {
  const options = JSON.parse(question.answer_options);
  const correctOption = options.find(opt => opt.is_correct);
  return correctOption && correctOption.text.toLowerCase() === studentAnswer.toLowerCase();
}

/**
 * Grade short answer questions
 */
function gradeShortAnswer(question, studentAnswer) {
  const answerConfig = JSON.parse(question.answer_options);
  const correctAnswers = answerConfig.correct_answers || [];
  const caseSensitive = answerConfig.case_sensitive || false;
  const partialCredit = answerConfig.partial_credit || false;

  const normalizedStudentAnswer = caseSensitive ? studentAnswer : studentAnswer.toLowerCase();

  for (const correctAnswer of correctAnswers) {
    const normalizedCorrectAnswer = caseSensitive ? correctAnswer : correctAnswer.toLowerCase();
    
    if (normalizedStudentAnswer === normalizedCorrectAnswer) {
      return { isCorrect: true, pointsEarned: parseFloat(question.points) };
    }
  }

  // Check for partial credit based on similarity
  if (partialCredit) {
    // Simple partial credit: if answer contains keywords, give partial points
    const keywords = correctAnswers[0].split(/\s+/);
    const matchedKeywords = keywords.filter(keyword => 
      normalizedStudentAnswer.includes(caseSensitive ? keyword : keyword.toLowerCase())
    );
    
    if (matchedKeywords.length > 0) {
      const partialScore = (matchedKeywords.length / keywords.length) * parseFloat(question.points);
      return { isCorrect: false, pointsEarned: partialScore };
    }
  }

  return { isCorrect: false, pointsEarned: 0 };
}

/**
 * Grade fill-in-the-blank questions
 */
function gradeFillBlank(question, studentAnswers) {
  const correctAnswers = JSON.parse(question.answer_options);
  let correctBlanks = 0;
  let totalBlanks = correctAnswers.length;

  for (let i = 0; i < totalBlanks; i++) {
    const studentAnswer = studentAnswers[i] || '';
    const correctAnswer = correctAnswers[i];
    
    if (Array.isArray(correctAnswer)) {
      // Multiple correct answers for this blank
      if (correctAnswer.some(answer => answer.toLowerCase() === studentAnswer.toLowerCase())) {
        correctBlanks++;
      }
    } else if (correctAnswer.toLowerCase() === studentAnswer.toLowerCase()) {
      correctBlanks++;
    }
  }

  const isCorrect = correctBlanks === totalBlanks;
  const pointsEarned = (correctBlanks / totalBlanks) * parseFloat(question.points);

  return { isCorrect, pointsEarned };
}

/**
 * Grade matching questions
 */
function gradeMatching(question, studentMatches) {
  const correctMatches = JSON.parse(question.answer_options);
  let correctCount = 0;
  const totalPairs = Object.keys(correctMatches).length;

  for (const [left, correctRight] of Object.entries(correctMatches)) {
    if (studentMatches[left] === correctRight) {
      correctCount++;
    }
  }

  const isCorrect = correctCount === totalPairs;
  const pointsEarned = (correctCount / totalPairs) * parseFloat(question.points);

  return { isCorrect, pointsEarned };
}

/**
 * Grade ordering questions
 */
function gradeOrdering(question, studentOrder) {
  const correctOrder = JSON.parse(question.answer_options);
  return JSON.stringify(correctOrder) === JSON.stringify(studentOrder);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if user has access to a lesson
 */
async function checkLessonAccess(userId, lessonId, userRole) {
  try {
    if (userRole === 'amitrace_admin') {
      return true;
    }

    const accessQuery = `
      SELECT 1
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE l.id = $1 AND (
        $2 = 'teacher' AND c.teacher_id = $3
        OR
        $2 = 'student' AND EXISTS (
          SELECT 1 FROM course_enrollments ce 
          WHERE ce.course_id = c.id AND ce.student_id = $3 AND ce.is_active = true
        )
      )
    `;

    const result = await pool.query(accessQuery, [lessonId, userRole, userId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking lesson access:', error);
    return false;
  }
}

module.exports = router;