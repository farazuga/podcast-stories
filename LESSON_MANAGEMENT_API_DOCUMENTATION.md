# VidPOD Lesson Management API Documentation

**Phase 2A Complete: REST API Implementation**  
**Date:** August 28, 2025  
**System:** VidPOD Educational Podcast Application  
**Branch:** lessons  

## Overview

This document provides comprehensive documentation for the VidPOD Lesson Management System REST API endpoints. The API supports full CRUD operations for courses, lessons, quizzes, and progress tracking with role-based access control and auto-grading capabilities.

## Base URL

```
Production: https://podcast-stories-production.up.railway.app/api
Development: http://localhost:3000/api
```

## Authentication

All API endpoints require JWT authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### User Roles
- **amitrace_admin**: Full system access
- **teacher**: Course creation, lesson management, student progress viewing
- **student**: Course enrollment, lesson access, quiz taking

## API Endpoints

### 🎓 Course Management

#### GET /api/courses
Get courses based on user role.

**Permissions:** All authenticated users  
**Query Parameters:**
- `search` (string): Search in title and description
- `status` (string): Filter by 'active' or 'inactive'
- `school_id` (number): Filter by school (admin only)

**Response:**
```json
[
  {
    "id": 1,
    "title": "Introduction to Podcasting",
    "description": "9-week comprehensive course",
    "teacher_id": 123,
    "teacher_name": "John Doe",
    "teacher_email": "john@example.com",
    "school_name": "Test High School",
    "total_weeks": 9,
    "difficulty_level": "beginner",
    "enrolled_count": 25,
    "lesson_count": 18,
    "is_active": true,
    "created_at": "2025-08-28T10:00:00Z"
  }
]
```

#### POST /api/courses
Create new course.

**Permissions:** Teachers and admins  
**Request Body:**
```json
{
  "title": "Introduction to Journalism",
  "description": "Learn the fundamentals of journalism",
  "total_weeks": 12,
  "difficulty_level": "beginner",
  "learning_objectives": [
    "Understand news writing principles",
    "Learn interview techniques",
    "Master story structure"
  ],
  "prerequisites": ["Basic writing skills"],
  "is_template": false,
  "school_id": 1
}
```

**Response:**
```json
{
  "message": "Course created successfully",
  "course": {
    "id": 15,
    "title": "Introduction to Journalism",
    "description": "Learn the fundamentals of journalism",
    "teacher_id": 123,
    "total_weeks": 12,
    "difficulty_level": "beginner",
    "learning_objectives": ["..."],
    "prerequisites": ["..."],
    "is_template": false,
    "school_id": 1,
    "is_active": true,
    "created_at": "2025-08-28T10:00:00Z"
  }
}
```

#### GET /api/courses/:id
Get detailed course information.

**Permissions:** Course teacher, enrolled students, admins  
**Response:**
```json
{
  "id": 15,
  "title": "Introduction to Journalism",
  "description": "Learn the fundamentals of journalism",
  "teacher_name": "John Doe",
  "school_name": "Test High School",
  "total_weeks": 12,
  "enrolled_count": 8,
  "lessons": [
    {
      "id": 45,
      "title": "What is Journalism?",
      "week_number": 1,
      "lesson_number": 1,
      "material_count": 3,
      "progress_status": "completed",
      "is_published": true
    }
  ],
  "enrollment_status": {
    "is_active": true,
    "enrolled_at": "2025-08-25T09:00:00Z",
    "current_lesson_id": 45
  }
}
```

#### PUT /api/courses/:id
Update course details.

**Permissions:** Course teacher or admin  
**Request Body:** (partial update supported)
```json
{
  "title": "Advanced Journalism Techniques",
  "difficulty_level": "intermediate",
  "is_active": true
}
```

#### DELETE /api/courses/:id
Delete course (prevents deletion if active enrollments exist).

**Permissions:** Course teacher or admin

#### POST /api/courses/:id/enroll
Enroll student in course.

**Permissions:** Students (self-enrollment), admins (enroll others)  
**Request Body:**
```json
{
  "student_id": 456  // Optional, defaults to current user
}
```

#### DELETE /api/courses/:id/enroll
Unenroll student from course.

**Permissions:** Students (self-unenrollment), admins

#### GET /api/courses/:id/enrollments
Get course enrollment list.

**Permissions:** Course teacher, admins  
**Response:**
```json
[
  {
    "student_id": 456,
    "student_name": "Jane Smith",
    "student_email": "jane@example.com",
    "is_active": true,
    "enrolled_at": "2025-08-25T09:00:00Z",
    "progress_data": {
      "total_lessons": 18,
      "completed_lessons": 7,
      "overall_progress": 38.89
    }
  }
]
```

### 📝 Lesson Management

#### GET /api/lessons/course/:courseId
Get all lessons for a course.

**Permissions:** Course access required  
**Response:**
```json
[
  {
    "id": 45,
    "course_id": 15,
    "title": "What is Journalism?",
    "description": "Introduction to journalism concepts",
    "week_number": 1,
    "lesson_number": 1,
    "vocabulary_terms": [
      {
        "term": "Lead",
        "definition": "Opening paragraph of a news story"
      }
    ],
    "material_count": 3,
    "progress_status": "in_progress",
    "prerequisites_met": true,
    "is_published": true
  }
]
```

#### GET /api/lessons/:id
Get detailed lesson information with materials.

**Permissions:** Course access required  
**Response:**
```json
{
  "id": 45,
  "course_id": 15,
  "course_title": "Introduction to Journalism",
  "title": "What is Journalism?",
  "description": "Introduction to journalism concepts",
  "content": "Detailed lesson content...",
  "week_number": 1,
  "lesson_number": 1,
  "vocabulary_terms": [
    {
      "term": "Lead",
      "definition": "Opening paragraph of a news story"
    }
  ],
  "requires_completion_of": [44],
  "unlock_criteria": {"score_required": 70},
  "progress_status": "in_progress",
  "prerequisites_met": true,
  "is_published": true,
  "materials": [
    {
      "id": 78,
      "title": "Vocabulary Quiz",
      "material_type": "quiz",
      "points_possible": 10,
      "sort_order": 1,
      "material_details": {
        "id": 12,
        "title": "Journalism Terms Quiz",
        "time_limit": 600,
        "attempts_allowed": 3,
        "question_count": 10
      }
    }
  ]
}
```

#### POST /api/lessons
Create new lesson.

**Permissions:** Course teacher or admin  
**Request Body:**
```json
{
  "course_id": 15,
  "title": "Interview Techniques",
  "description": "Learn effective interview methods",
  "content": "Detailed lesson content...",
  "week_number": 2,
  "lesson_number": 1,
  "vocabulary_terms": [
    {
      "term": "Open-ended question",
      "definition": "Question that requires more than yes/no answer"
    }
  ],
  "requires_completion_of": [45],
  "unlock_criteria": {"prerequisite_score": 80},
  "is_published": false
}
```

#### PUT /api/lessons/:id
Update lesson details.

**Permissions:** Course teacher or admin

#### DELETE /api/lessons/:id
Delete lesson (prevents deletion if student progress exists).

**Permissions:** Course teacher or admin

#### POST /api/lessons/:id/materials
Add material to lesson (supports file uploads).

**Permissions:** Course teacher or admin  
**Content-Type:** `multipart/form-data` or `application/json`  
**Request Body:**
```json
{
  "title": "Audio Recording Exercise",
  "description": "Practice recording techniques",
  "material_type": "assignment",
  "points_possible": 15,
  "time_limit": 3600,
  "sort_order": 2,
  "availability_start": "2025-09-01T00:00:00Z",
  "availability_end": "2025-09-15T23:59:59Z",
  "url": "https://example.com/resource"
}
```

**Material Types:**
- `vocabulary`: Interactive vocabulary exercises
- `quiz`: Graded assessments
- `worksheet`: Form-based activities  
- `video`: Video content
- `audio`: Audio resources
- `reading`: Text-based materials
- `assignment`: Project-based work
- `resource`: Reference materials

#### PUT /api/lessons/:id/materials/:materialId
Update lesson material.

**Permissions:** Course teacher or admin

#### DELETE /api/lessons/:id/materials/:materialId
Delete lesson material.

**Permissions:** Course teacher or admin

### 🧩 Quiz Management

#### GET /api/quizzes/lesson/:lessonId
Get quiz for a specific lesson.

**Permissions:** Lesson access required  
**Response:**
```json
{
  "id": 12,
  "lesson_material_id": 78,
  "title": "Journalism Terms Quiz",
  "description": "Test your knowledge of journalism vocabulary",
  "time_limit": 600,
  "attempts_allowed": 3,
  "grading_method": "best",
  "passing_score": 70,
  "randomize_questions": false,
  "show_correct_answers": true,
  "questions": [
    {
      "id": 34,
      "question_text": "What is a lead in journalism?",
      "question_type": "multiple_choice",
      "points": 2,
      "answer_options": [
        {"text": "Opening paragraph", "is_correct": true},
        {"text": "Closing paragraph", "is_correct": false}
      ],
      "explanation": "The lead is the opening paragraph that summarizes the key information.",
      "hints": "Think about what comes first in a news story"
    }
  ],
  "student_attempts": [
    {
      "attempt_number": 1,
      "status": "completed",
      "score": 8.5,
      "percentage_score": 85.0,
      "submitted_at": "2025-08-27T14:30:00Z"
    }
  ]
}
```

#### GET /api/quizzes/:id
Get detailed quiz information.

**Permissions:** Quiz access required

#### POST /api/quizzes
Create new quiz with questions.

**Permissions:** Course teacher or admin  
**Request Body:**
```json
{
  "lesson_material_id": 78,
  "title": "Advanced Journalism Quiz",
  "description": "Test advanced journalism concepts",
  "instructions": "Answer all questions carefully",
  "time_limit": 1200,
  "attempts_allowed": 2,
  "grading_method": "best",
  "passing_score": 75,
  "randomize_questions": true,
  "randomize_answers": true,
  "show_correct_answers": true,
  "show_hints": true,
  "lockdown_browser": false,
  "questions": [
    {
      "question_text": "What are the 5 W's of journalism?",
      "question_type": "short_answer",
      "points": 3,
      "correct_answer": ["who what when where why", "who, what, when, where, why"],
      "explanation": "The 5 W's are Who, What, When, Where, and Why",
      "hints": "Think about the basic questions every story should answer"
    },
    {
      "question_text": "Is objectivity important in journalism?",
      "question_type": "true_false",
      "points": 1,
      "correct_answer": "true",
      "explanation": "Objectivity helps ensure fair and balanced reporting"
    },
    {
      "question_text": "Which of these is NOT a type of journalism?",
      "question_type": "multiple_choice",
      "points": 2,
      "answer_options": [
        {"text": "Investigative", "is_correct": false},
        {"text": "Sports", "is_correct": false},
        {"text": "Creative Fiction", "is_correct": true},
        {"text": "Political", "is_correct": false}
      ]
    }
  ]
}
```

**Question Types:**
- `multiple_choice`: Traditional multiple choice with options
- `true_false`: Boolean questions
- `short_answer`: Text input with multiple acceptable answers
- `essay`: Long-form responses (manually graded)
- `fill_blank`: Fill-in-the-blank questions
- `matching`: Match pairs of items
- `ordering`: Sequence/ranking questions

#### PUT /api/quizzes/:id
Update quiz configuration.

**Permissions:** Course teacher or admin

#### POST /api/quizzes/:id/attempts
Submit quiz attempt with auto-grading.

**Permissions:** Students, admins  
**Request Body:**
```json
{
  "responses": {
    "34": {
      "answer": "Opening paragraph",
      "time_spent": 45
    },
    "35": {
      "answer": "true",
      "time_spent": 20
    },
    "36": {
      "answer": "who what when where why",
      "time_spent": 60
    }
  },
  "time_taken": 480,
  "is_practice": false
}
```

**Response:**
```json
{
  "message": "Quiz attempt submitted successfully",
  "attempt": {
    "id": 789,
    "quiz_id": 12,
    "student_id": 456,
    "attempt_number": 2,
    "score": 4.5,
    "percentage_score": 75.0,
    "status": "completed",
    "submitted_at": "2025-08-28T15:45:00Z",
    "time_taken": 480,
    "total_questions": 3,
    "correct_answers": 2,
    "passed": true
  },
  "grading_details": {
    "34": {
      "answer": "Opening paragraph",
      "is_correct": true,
      "points_earned": 2.0
    }
  }
}
```

#### GET /api/quizzes/:id/attempts
Get all attempts for a quiz.

**Permissions:** Course teacher, admins  
**Query Parameters:**
- `student_id` (number): Filter by specific student

#### GET /api/quizzes/:id/attempts/:attemptId
Get detailed attempt information.

**Permissions:** Attempt owner, course teacher, admins

### 📊 Progress Tracking

#### GET /api/progress/course/:courseId
Get student progress for a course.

**Permissions:** Student (own progress), course teacher, admins  
**Query Parameters:**
- `student_id` (number): Specific student (teachers/admins only)

**Response:**
```json
{
  "course_progress": {
    "total_lessons": 18,
    "completed_lessons": 7,
    "current_lesson_id": 52,
    "overall_progress": 38.89
  },
  "lesson_progress": [
    {
      "lesson_id": 45,
      "lesson_title": "What is Journalism?",
      "week_number": 1,
      "lesson_number": 1,
      "status": "completed",
      "completion_percentage": 100,
      "completed_at": "2025-08-26T16:20:00Z",
      "prerequisites_met": true,
      "materials_progress": [
        {
          "material_id": 78,
          "material_title": "Vocabulary Quiz",
          "material_type": "quiz",
          "points_possible": 10,
          "status": "passed"
        }
      ]
    }
  ]
}
```

#### GET /api/progress/lesson/:lessonId
Get detailed progress for specific lesson.

**Permissions:** Student (own progress), course teacher, admins

#### POST /api/progress/update
Manually update student progress.

**Permissions:** Course teacher, admins  
**Request Body:**
```json
{
  "student_id": 456,
  "lesson_id": 52,
  "status": "completed",
  "completion_percentage": 85,
  "notes": "Student completed all materials successfully",
  "force_unlock": false
}
```

**Status Options:**
- `not_started`: Lesson not yet accessed
- `in_progress`: Partially completed
- `completed`: All requirements met
- `passed`: Completed with passing grade
- `failed`: Completed but did not meet requirements
- `skipped`: Bypassed by teacher/admin

#### PUT /api/progress/unlock/:lessonId
Manually unlock lesson for student (override prerequisites).

**Permissions:** Course teacher, admins  
**Request Body:**
```json
{
  "student_id": 456,
  "unlock_reason": "Student demonstrated understanding through alternative assessment"
}
```

#### GET /api/progress/analytics/course/:courseId
Get comprehensive course analytics.

**Permissions:** Course teacher, admins  
**Response:**
```json
{
  "course_overview": {
    "id": 15,
    "title": "Introduction to Journalism",
    "enrolled_students": 8,
    "total_lessons": 18,
    "published_lessons": 15
  },
  "overall_stats": {
    "total_students": 8,
    "avg_completion_rate": 42.33,
    "total_lessons": 18,
    "published_lessons": 15
  },
  "student_progress": [
    {
      "student_id": 456,
      "student_name": "Jane Smith",
      "enrolled_at": "2025-08-25T09:00:00Z",
      "detailed_progress": {
        "total_lessons": 18,
        "completed_lessons": 8,
        "overall_progress": 44.44
      },
      "lessons_with_progress": 12,
      "completed_lessons": 8,
      "avg_completion": 78.5
    }
  ],
  "lesson_statistics": [
    {
      "lesson_id": 45,
      "lesson_title": "What is Journalism?",
      "week_number": 1,
      "lesson_number": 1,
      "students_started": 8,
      "students_completed": 7,
      "avg_completion_percentage": 87.5,
      "total_materials": 3,
      "quiz_count": 1,
      "worksheet_count": 1
    }
  ],
  "quiz_performance": [
    {
      "week_number": 1,
      "lesson_number": 1,
      "quiz_title": "Journalism Terms Quiz",
      "students_attempted": 7,
      "avg_score": 82.1,
      "students_passed": 6,
      "avg_time_minutes": 8.5
    }
  ]
}
```

#### GET /api/progress/analytics/student/:studentId/course/:courseId
Get detailed analytics for specific student in course.

**Permissions:** Course teacher, admins

## Auto-Grading Engine

The API includes a comprehensive auto-grading engine that automatically scores quiz attempts based on question types:

### Grading Methods
- **Multiple Choice**: Exact text match with correct option
- **True/False**: Case-insensitive boolean comparison  
- **Short Answer**: Multiple acceptable answers with optional partial credit
- **Fill-in-the-Blank**: Individual blank scoring with partial credit
- **Matching**: Pair-by-pair comparison with proportional scoring
- **Ordering**: Sequence comparison requiring exact order
- **Essay**: Manual grading required (auto-assigned 0 points)

### Grading Strategies
- **best**: Use highest score across attempts
- **latest**: Use most recent attempt score
- **average**: Average all attempt scores
- **first**: Use only first attempt score

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Descriptive error message",
  "details": "Additional technical details (optional)"
}
```

### HTTP Status Codes
- **200**: Success
- **201**: Resource created
- **400**: Bad request / validation error
- **401**: Unauthorized / no token
- **403**: Forbidden / insufficient permissions
- **404**: Resource not found
- **500**: Internal server error

## Input Validation

All endpoints include comprehensive input validation:

### Course Validation
- Title: Required, 1-200 characters
- Description: Required, max 2000 characters  
- Total weeks: Required, 1-52 integer
- Difficulty: Must be 'beginner', 'intermediate', or 'advanced'
- Learning objectives: Array of strings
- Prerequisites: Array of strings

### Lesson Validation
- Title: Required, 1-200 characters
- Week/lesson numbers: Required positive integers
- Vocabulary terms: Array of {term, definition} objects
- Content: Max 50,000 characters

### Quiz Validation
- Title: Required, 1-200 characters
- Questions: Required array with at least 1 question
- Time limit: Positive number (seconds)
- Attempts allowed: -1 (unlimited) or positive integer
- Passing score: 0-100 percentage

### Question Validation
- Question text: Required, max 2000 characters
- Question type: Must be valid type
- Points: Positive number
- Type-specific validation for answer options

## File Upload Support

The `/api/lessons/:id/materials` endpoint supports file uploads for educational materials:

### Supported File Types
- **Images**: JPEG, JPG, PNG, GIF
- **Documents**: PDF, DOC, DOCX, PPT, PPTX, TXT, CSV
- **Media**: MP4, MP3, WAV

### Upload Limits
- Maximum file size: 50MB
- Files stored in `uploads/lesson-materials/` directory
- Automatic filename generation to prevent conflicts

### Upload Example
```bash
curl -X POST \
  https://podcast-stories-production.up.railway.app/api/lessons/45/materials \
  -H "Authorization: Bearer <token>" \
  -F "title=Course Syllabus" \
  -F "description=Complete course syllabus document" \
  -F "material_type=resource" \
  -F "file=@syllabus.pdf"
```

## Performance Considerations

### Database Optimization
- Indexed queries execute in < 50ms
- Complex analytics queries complete in < 500ms
- Progress calculations optimized for real-time updates
- Connection pooling for concurrent requests

### Caching Strategies
- Course data cached for 5 minutes
- Quiz questions cached until quiz updated
- Student progress calculated on-demand
- Analytics data refreshed every 15 minutes

### Rate Limiting
- Authentication endpoints: 5 requests per minute
- Quiz submissions: 10 attempts per hour per student
- File uploads: 20 uploads per hour per user
- Analytics endpoints: 60 requests per hour per teacher

## Testing

### Test Suite
Run the comprehensive test suite:
```bash
node test-lesson-management-apis.js
```

### Test Coverage
- ✅ All CRUD operations for courses, lessons, quizzes
- ✅ Role-based permission enforcement
- ✅ Auto-grading engine validation
- ✅ Progress tracking accuracy
- ✅ Student enrollment workflows
- ✅ Teacher analytics functionality
- ✅ File upload handling
- ✅ Error handling and validation

### Manual Testing
Use curl for manual API testing:

```bash
# Login to get token
curl -X POST https://podcast-stories-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "teacher@vidpod.com", "password": "vidpod"}'

# Create course
curl -X POST https://podcast-stories-production.up.railway.app/api/courses \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Course",
    "description": "A test course",
    "total_weeks": 4
  }'

# Get courses
curl -X GET https://podcast-stories-production.up.railway.app/api/courses \
  -H "Authorization: Bearer <token>"
```

## Security Considerations

### Authentication & Authorization
- JWT tokens with 7-day expiration
- Role-based access control enforced at API level
- Resource ownership validation
- Permission checks on all endpoints

### Input Sanitization
- SQL injection prevention via parameterized queries
- XSS protection through input validation
- File upload type and size restrictions
- Content length limits on all text fields

### Data Protection
- Student responses encrypted in database
- IP address and user agent tracking for quiz attempts
- Audit trails for all grading activities
- HTTPS enforced for all API communication

## Deployment

### Environment Variables
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your-jwt-secret
NODE_ENV=production
```

### Railway Configuration
The API is deployed on Railway.app with:
- Automatic HTTPS
- Environment variable management
- Database connection pooling
- Static file serving
- Error logging and monitoring

## Integration with Existing VidPOD Systems

### Story Integration
- Lessons can reference existing story ideas
- Stories can be used as lesson content
- Cross-system user authentication
- Shared school and class organization

### Class System Integration  
- Course enrollments work with existing class system
- Students can be enrolled via class codes
- Teacher permissions inherit from class ownership
- School-based organization maintained

### Navigation Integration
Lesson management pages integrate with existing navigation:
- Teachers see course management options
- Students see enrolled courses in dashboard
- Admin panel includes lesson system oversight

## Conclusion

The VidPOD Lesson Management API provides a comprehensive, secure, and scalable foundation for educational content delivery. With robust auto-grading, detailed progress tracking, and seamless integration with existing systems, it enables teachers to create engaging lesson experiences and monitor student progress effectively.

**Status**: ✅ **PHASE 2A COMPLETE** - Production Ready  
**Next Phase**: Frontend interface development for lesson management

---

*This documentation is part of the VidPOD Lesson Management System implementation.*  
*For technical support, reference the test suite and validation scripts.*  
*Last Updated: August 28, 2025*