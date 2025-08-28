/**
 * Lesson Management System Input Validation Utilities
 * Provides comprehensive validation for all lesson management API endpoints
 */

// =============================================================================
// COURSE VALIDATION
// =============================================================================

/**
 * Validate course creation/update data
 */
function validateCourseData(courseData, isUpdate = false) {
  const errors = [];
  const {
    title,
    description,
    total_weeks,
    difficulty_level,
    learning_objectives,
    prerequisites,
    is_template,
    school_id
  } = courseData;

  // Required field validation (only for creation)
  if (!isUpdate) {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      errors.push('Title is required and must be a non-empty string');
    }
    
    if (!description || typeof description !== 'string') {
      errors.push('Description is required and must be a string');
    }
    
    if (!total_weeks || typeof total_weeks !== 'number') {
      errors.push('Total weeks is required and must be a number');
    }
  }

  // Field-specific validation
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      errors.push('Title must be a non-empty string');
    } else if (title.length > 200) {
      errors.push('Title must be 200 characters or less');
    }
  }

  if (description !== undefined) {
    if (typeof description !== 'string') {
      errors.push('Description must be a string');
    } else if (description.length > 2000) {
      errors.push('Description must be 2000 characters or less');
    }
  }

  if (total_weeks !== undefined) {
    if (typeof total_weeks !== 'number' || !Number.isInteger(total_weeks)) {
      errors.push('Total weeks must be an integer');
    } else if (total_weeks < 1 || total_weeks > 52) {
      errors.push('Total weeks must be between 1 and 52');
    }
  }

  if (difficulty_level !== undefined) {
    const validLevels = ['beginner', 'intermediate', 'advanced'];
    if (!validLevels.includes(difficulty_level)) {
      errors.push(`Difficulty level must be one of: ${validLevels.join(', ')}`);
    }
  }

  if (learning_objectives !== undefined) {
    if (!Array.isArray(learning_objectives)) {
      errors.push('Learning objectives must be an array');
    } else {
      learning_objectives.forEach((obj, index) => {
        if (typeof obj !== 'string' || obj.trim().length === 0) {
          errors.push(`Learning objective ${index + 1} must be a non-empty string`);
        }
      });
    }
  }

  if (prerequisites !== undefined) {
    if (!Array.isArray(prerequisites)) {
      errors.push('Prerequisites must be an array');
    } else {
      prerequisites.forEach((req, index) => {
        if (typeof req !== 'string' || req.trim().length === 0) {
          errors.push(`Prerequisite ${index + 1} must be a non-empty string`);
        }
      });
    }
  }

  if (is_template !== undefined && typeof is_template !== 'boolean') {
    errors.push('is_template must be a boolean');
  }

  if (school_id !== undefined && school_id !== null) {
    if (typeof school_id !== 'number' || !Number.isInteger(school_id)) {
      errors.push('School ID must be an integer');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// =============================================================================
// LESSON VALIDATION
// =============================================================================

/**
 * Validate lesson creation/update data
 */
function validateLessonData(lessonData, isUpdate = false) {
  const errors = [];
  const {
    course_id,
    title,
    description,
    content,
    week_number,
    lesson_number,
    vocabulary_terms,
    requires_completion_of,
    unlock_criteria,
    is_published
  } = lessonData;

  // Required field validation (only for creation)
  if (!isUpdate) {
    if (!course_id || typeof course_id !== 'number') {
      errors.push('Course ID is required and must be a number');
    }
    
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      errors.push('Title is required and must be a non-empty string');
    }
    
    if (!week_number || typeof week_number !== 'number') {
      errors.push('Week number is required and must be a number');
    }
    
    if (!lesson_number || typeof lesson_number !== 'number') {
      errors.push('Lesson number is required and must be a number');
    }
  }

  // Field-specific validation
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      errors.push('Title must be a non-empty string');
    } else if (title.length > 200) {
      errors.push('Title must be 200 characters or less');
    }
  }

  if (description !== undefined) {
    if (typeof description !== 'string') {
      errors.push('Description must be a string');
    } else if (description.length > 2000) {
      errors.push('Description must be 2000 characters or less');
    }
  }

  if (content !== undefined) {
    if (typeof content !== 'string') {
      errors.push('Content must be a string');
    } else if (content.length > 50000) {
      errors.push('Content must be 50000 characters or less');
    }
  }

  if (week_number !== undefined) {
    if (typeof week_number !== 'number' || !Number.isInteger(week_number)) {
      errors.push('Week number must be an integer');
    } else if (week_number < 1) {
      errors.push('Week number must be at least 1');
    }
  }

  if (lesson_number !== undefined) {
    if (typeof lesson_number !== 'number' || !Number.isInteger(lesson_number)) {
      errors.push('Lesson number must be an integer');
    } else if (lesson_number < 1) {
      errors.push('Lesson number must be at least 1');
    }
  }

  if (vocabulary_terms !== undefined) {
    const vocabValidation = validateVocabularyTerms(vocabulary_terms);
    if (!vocabValidation.isValid) {
      errors.push(...vocabValidation.errors);
    }
  }

  if (requires_completion_of !== undefined) {
    if (!Array.isArray(requires_completion_of)) {
      errors.push('requires_completion_of must be an array');
    } else {
      requires_completion_of.forEach((lessonId, index) => {
        if (typeof lessonId !== 'number' || !Number.isInteger(lessonId)) {
          errors.push(`Prerequisite lesson ${index + 1} must be an integer`);
        }
      });
    }
  }

  if (unlock_criteria !== undefined) {
    if (typeof unlock_criteria !== 'object' || unlock_criteria === null) {
      errors.push('Unlock criteria must be an object');
    }
  }

  if (is_published !== undefined && typeof is_published !== 'boolean') {
    errors.push('is_published must be a boolean');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate vocabulary terms array
 */
function validateVocabularyTerms(vocabularyTerms) {
  const errors = [];

  if (!Array.isArray(vocabularyTerms)) {
    errors.push('Vocabulary terms must be an array');
    return { isValid: false, errors };
  }

  vocabularyTerms.forEach((term, index) => {
    if (typeof term !== 'object' || term === null) {
      errors.push(`Vocabulary term ${index + 1} must be an object`);
      return;
    }

    if (!term.term || typeof term.term !== 'string' || term.term.trim().length === 0) {
      errors.push(`Vocabulary term ${index + 1} must have a non-empty term field`);
    }

    if (!term.definition || typeof term.definition !== 'string' || term.definition.trim().length === 0) {
      errors.push(`Vocabulary term ${index + 1} must have a non-empty definition field`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

// =============================================================================
// LESSON MATERIAL VALIDATION
// =============================================================================

/**
 * Validate lesson material data
 */
function validateLessonMaterialData(materialData) {
  const errors = [];
  const {
    title,
    description,
    material_type,
    points_possible,
    time_limit,
    sort_order,
    availability_start,
    availability_end,
    url
  } = materialData;

  // Required fields
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('Title is required and must be a non-empty string');
  }

  if (!material_type || typeof material_type !== 'string') {
    errors.push('Material type is required');
  }

  // Field-specific validation
  if (title && title.length > 200) {
    errors.push('Title must be 200 characters or less');
  }

  if (description !== undefined) {
    if (typeof description !== 'string') {
      errors.push('Description must be a string');
    } else if (description.length > 1000) {
      errors.push('Description must be 1000 characters or less');
    }
  }

  if (material_type) {
    const validTypes = ['vocabulary', 'quiz', 'worksheet', 'video', 'audio', 'reading', 'assignment', 'resource'];
    if (!validTypes.includes(material_type)) {
      errors.push(`Material type must be one of: ${validTypes.join(', ')}`);
    }
  }

  if (points_possible !== undefined) {
    if (typeof points_possible !== 'number' || points_possible < 0) {
      errors.push('Points possible must be a non-negative number');
    }
  }

  if (time_limit !== undefined && time_limit !== null) {
    if (typeof time_limit !== 'number' || time_limit <= 0) {
      errors.push('Time limit must be a positive number');
    }
  }

  if (sort_order !== undefined) {
    if (typeof sort_order !== 'number' || !Number.isInteger(sort_order)) {
      errors.push('Sort order must be an integer');
    }
  }

  if (availability_start !== undefined && availability_start !== null) {
    const startDate = new Date(availability_start);
    if (isNaN(startDate.getTime())) {
      errors.push('Availability start must be a valid date');
    }
  }

  if (availability_end !== undefined && availability_end !== null) {
    const endDate = new Date(availability_end);
    if (isNaN(endDate.getTime())) {
      errors.push('Availability end must be a valid date');
    }
  }

  if (url !== undefined && url !== null) {
    if (typeof url !== 'string' || url.trim().length === 0) {
      errors.push('URL must be a non-empty string if provided');
    } else {
      try {
        new URL(url);
      } catch (urlError) {
        errors.push('URL must be a valid URL');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// =============================================================================
// QUIZ VALIDATION
// =============================================================================

/**
 * Validate quiz creation/update data
 */
function validateQuizData(quizData, isUpdate = false) {
  const errors = [];
  const {
    lesson_material_id,
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
  } = quizData;

  // Required field validation (only for creation)
  if (!isUpdate) {
    if (!lesson_material_id || typeof lesson_material_id !== 'number') {
      errors.push('Lesson material ID is required and must be a number');
    }
    
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      errors.push('Title is required and must be a non-empty string');
    }
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      errors.push('At least one question is required');
    }
  }

  // Field-specific validation
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      errors.push('Title must be a non-empty string');
    } else if (title.length > 200) {
      errors.push('Title must be 200 characters or less');
    }
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push('Description must be a string');
    } else if (description.length > 2000) {
      errors.push('Description must be 2000 characters or less');
    }
  }

  if (time_limit !== undefined && time_limit !== null) {
    if (typeof time_limit !== 'number' || time_limit <= 0) {
      errors.push('Time limit must be a positive number');
    }
  }

  if (attempts_allowed !== undefined) {
    if (typeof attempts_allowed !== 'number' || !Number.isInteger(attempts_allowed)) {
      errors.push('Attempts allowed must be an integer');
    } else if (attempts_allowed < -1) {
      errors.push('Attempts allowed must be -1 (unlimited) or a positive number');
    }
  }

  if (grading_method !== undefined) {
    const validMethods = ['best', 'latest', 'average', 'first'];
    if (!validMethods.includes(grading_method)) {
      errors.push(`Grading method must be one of: ${validMethods.join(', ')}`);
    }
  }

  if (passing_score !== undefined) {
    if (typeof passing_score !== 'number' || passing_score < 0 || passing_score > 100) {
      errors.push('Passing score must be a number between 0 and 100');
    }
  }

  // Boolean field validation
  const booleanFields = {
    randomize_questions,
    randomize_answers,
    show_correct_answers,
    show_hints,
    lockdown_browser
  };

  Object.entries(booleanFields).forEach(([field, value]) => {
    if (value !== undefined && typeof value !== 'boolean') {
      errors.push(`${field} must be a boolean`);
    }
  });

  if (password !== undefined && password !== null) {
    if (typeof password !== 'string') {
      errors.push('Password must be a string');
    } else if (password.length > 100) {
      errors.push('Password must be 100 characters or less');
    }
  }

  // Validate questions if provided
  if (questions !== undefined) {
    const questionValidation = validateQuizQuestions(questions);
    if (!questionValidation.isValid) {
      errors.push(...questionValidation.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate quiz questions array
 */
function validateQuizQuestions(questions) {
  const errors = [];

  if (!Array.isArray(questions)) {
    errors.push('Questions must be an array');
    return { isValid: false, errors };
  }

  if (questions.length === 0) {
    errors.push('At least one question is required');
    return { isValid: false, errors };
  }

  questions.forEach((question, index) => {
    const questionErrors = validateQuizQuestion(question, index + 1);
    if (!questionErrors.isValid) {
      errors.push(...questionErrors.errors);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate individual quiz question
 */
function validateQuizQuestion(question, questionNumber) {
  const errors = [];
  const {
    question_text,
    question_type,
    answer_options,
    correct_answer,
    points,
    explanation,
    hints
  } = question;

  // Required fields
  if (!question_text || typeof question_text !== 'string' || question_text.trim().length === 0) {
    errors.push(`Question ${questionNumber}: Question text is required and must be a non-empty string`);
  }

  if (!question_type || typeof question_type !== 'string') {
    errors.push(`Question ${questionNumber}: Question type is required`);
  }

  // Field-specific validation
  if (question_text && question_text.length > 2000) {
    errors.push(`Question ${questionNumber}: Question text must be 2000 characters or less`);
  }

  if (question_type) {
    const validTypes = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank', 'matching', 'ordering'];
    if (!validTypes.includes(question_type)) {
      errors.push(`Question ${questionNumber}: Question type must be one of: ${validTypes.join(', ')}`);
    } else {
      // Type-specific validation
      const typeValidation = validateQuestionByType(question, questionNumber);
      if (!typeValidation.isValid) {
        errors.push(...typeValidation.errors);
      }
    }
  }

  if (points !== undefined) {
    if (typeof points !== 'number' || points <= 0) {
      errors.push(`Question ${questionNumber}: Points must be a positive number`);
    }
  }

  if (explanation !== undefined && explanation !== null) {
    if (typeof explanation !== 'string') {
      errors.push(`Question ${questionNumber}: Explanation must be a string`);
    } else if (explanation.length > 1000) {
      errors.push(`Question ${questionNumber}: Explanation must be 1000 characters or less`);
    }
  }

  if (hints !== undefined && hints !== null) {
    if (typeof hints !== 'string') {
      errors.push(`Question ${questionNumber}: Hints must be a string`);
    } else if (hints.length > 500) {
      errors.push(`Question ${questionNumber}: Hints must be 500 characters or less`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate question based on its type
 */
function validateQuestionByType(question, questionNumber) {
  const errors = [];
  const { question_type, answer_options, correct_answer } = question;

  switch (question_type) {
    case 'multiple_choice':
      if (!Array.isArray(answer_options) || answer_options.length < 2) {
        errors.push(`Question ${questionNumber}: Multiple choice questions must have at least 2 options`);
      } else {
        const hasCorrect = answer_options.some(opt => opt.is_correct || opt.text === correct_answer);
        if (!hasCorrect) {
          errors.push(`Question ${questionNumber}: Multiple choice questions must have at least one correct answer`);
        }
        
        answer_options.forEach((option, optIndex) => {
          if (!option.text || typeof option.text !== 'string') {
            errors.push(`Question ${questionNumber}, Option ${optIndex + 1}: Option text is required`);
          }
        });
      }
      break;

    case 'true_false':
      if (correct_answer === undefined || (correct_answer !== true && correct_answer !== false && correct_answer !== 'true' && correct_answer !== 'false')) {
        errors.push(`Question ${questionNumber}: True/false questions must have a correct answer of true or false`);
      }
      break;

    case 'short_answer':
      if (!correct_answer || (typeof correct_answer !== 'string' && !Array.isArray(correct_answer))) {
        errors.push(`Question ${questionNumber}: Short answer questions must have correct answer(s)`);
      }
      break;

    case 'essay':
      // Essays don't require correct answers as they're manually graded
      break;

    case 'fill_blank':
      if (!Array.isArray(correct_answer) || correct_answer.length === 0) {
        errors.push(`Question ${questionNumber}: Fill in the blank questions must have an array of correct answers`);
      }
      break;

    case 'matching':
      if (!answer_options || typeof answer_options !== 'object') {
        errors.push(`Question ${questionNumber}: Matching questions must have answer options object`);
      }
      break;

    case 'ordering':
      if (!Array.isArray(correct_answer) || correct_answer.length < 2) {
        errors.push(`Question ${questionNumber}: Ordering questions must have at least 2 items to order`);
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// =============================================================================
// PROGRESS VALIDATION
// =============================================================================

/**
 * Validate student progress update data
 */
function validateProgressData(progressData) {
  const errors = [];
  const {
    student_id,
    lesson_id,
    status,
    completion_percentage,
    notes,
    force_unlock
  } = progressData;

  // Required fields
  if (!student_id || typeof student_id !== 'number') {
    errors.push('Student ID is required and must be a number');
  }

  if (!lesson_id || typeof lesson_id !== 'number') {
    errors.push('Lesson ID is required and must be a number');
  }

  // Optional field validation
  if (status !== undefined) {
    const validStatuses = ['not_started', 'in_progress', 'completed', 'passed', 'failed', 'skipped'];
    if (!validStatuses.includes(status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }
  }

  if (completion_percentage !== undefined) {
    if (typeof completion_percentage !== 'number' || completion_percentage < 0 || completion_percentage > 100) {
      errors.push('Completion percentage must be a number between 0 and 100');
    }
  }

  if (notes !== undefined && notes !== null) {
    if (typeof notes !== 'string') {
      errors.push('Notes must be a string');
    } else if (notes.length > 2000) {
      errors.push('Notes must be 2000 characters or less');
    }
  }

  if (force_unlock !== undefined && typeof force_unlock !== 'boolean') {
    errors.push('Force unlock must be a boolean');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate quiz attempt data
 */
function validateQuizAttemptData(attemptData) {
  const errors = [];
  const { responses, is_practice, time_taken } = attemptData;

  // Required fields
  if (!responses || typeof responses !== 'object') {
    errors.push('Responses are required and must be an object');
  }

  // Optional field validation
  if (is_practice !== undefined && typeof is_practice !== 'boolean') {
    errors.push('is_practice must be a boolean');
  }

  if (time_taken !== undefined) {
    if (typeof time_taken !== 'number' || time_taken < 0) {
      errors.push('Time taken must be a non-negative number');
    }
  }

  // Validate responses structure
  if (responses && typeof responses === 'object') {
    Object.entries(responses).forEach(([questionId, response]) => {
      if (!response || typeof response !== 'object') {
        errors.push(`Response for question ${questionId} must be an object`);
        return;
      }

      if (response.answer === undefined) {
        errors.push(`Response for question ${questionId} must include an answer`);
      }

      if (response.time_spent !== undefined && typeof response.time_spent !== 'number') {
        errors.push(`Time spent for question ${questionId} must be a number`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  validateCourseData,
  validateLessonData,
  validateVocabularyTerms,
  validateLessonMaterialData,
  validateQuizData,
  validateQuizQuestions,
  validateQuizQuestion,
  validateProgressData,
  validateQuizAttemptData
};