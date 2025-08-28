/* VidPOD Lesson Management JavaScript Utilities */
/* Provides API integration, progress calculation, and form validation for lesson system */

// Extend the global VidPOD configuration
window.VidPOD = window.VidPOD || {};
window.VidPOD.Lessons = {
    // API base URL from main config
    apiUrl: '/api',
    
    // Cache for frequently accessed data
    cache: {
        courses: null,
        currentCourse: null,
        currentLesson: null,
        userProgress: null
    },
    
    // Question types for quiz builder
    questionTypes: {
        'multiple_choice': { 
            name: 'Multiple Choice', 
            icon: '☑️',
            description: 'Single correct answer from multiple options'
        },
        'multiple_select': { 
            name: 'Multiple Select', 
            icon: '☑️',
            description: 'Multiple correct answers from options'
        },
        'true_false': { 
            name: 'True/False', 
            icon: '✅',
            description: 'Simple true or false question'
        },
        'short_answer': { 
            name: 'Short Answer', 
            icon: '📝',
            description: 'Brief text response'
        },
        'essay': { 
            name: 'Essay', 
            icon: '📄',
            description: 'Long form written response'
        },
        'matching': { 
            name: 'Matching', 
            icon: '🔗',
            description: 'Match items from two lists'
        },
        'fill_blank': { 
            name: 'Fill in the Blank', 
            icon: '📋',
            description: 'Complete sentence with missing words'
        }
    }
};

// API Helper Functions
VidPOD.Lessons.api = {
    // Generic API request with authentication
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const response = await fetch(`${VidPOD.Lessons.apiUrl}${endpoint}`, {
            ...defaultOptions,
            ...options
        });

        if (response.status === 401) {
            // Token expired, redirect to login
            localStorage.removeItem('token');
            window.location.href = '/index.html';
            return;
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Network error' }));
            throw new Error(error.message || 'Request failed');
        }

        return response.json();
    },

    // Course Management APIs
    courses: {
        async getAll(filters = {}) {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            
            const query = params.toString();
            return VidPOD.Lessons.api.request(`/courses${query ? '?' + query : ''}`);
        },

        async getById(id) {
            return VidPOD.Lessons.api.request(`/courses/${id}`);
        },

        async create(courseData) {
            return VidPOD.Lessons.api.request('/courses', {
                method: 'POST',
                body: JSON.stringify(courseData)
            });
        },

        async update(id, courseData) {
            return VidPOD.Lessons.api.request(`/courses/${id}`, {
                method: 'PUT',
                body: JSON.stringify(courseData)
            });
        },

        async delete(id) {
            return VidPOD.Lessons.api.request(`/courses/${id}`, {
                method: 'DELETE'
            });
        },

        async enroll(courseId) {
            return VidPOD.Lessons.api.request(`/courses/${courseId}/enroll`, {
                method: 'POST'
            });
        },

        async unenroll(courseId) {
            return VidPOD.Lessons.api.request(`/courses/${courseId}/unenroll`, {
                method: 'DELETE'
            });
        }
    },

    // Lesson Management APIs
    lessons: {
        async getByCourse(courseId) {
            return VidPOD.Lessons.api.request(`/lessons?course_id=${courseId}`);
        },

        async getById(id) {
            return VidPOD.Lessons.api.request(`/lessons/${id}`);
        },

        async create(lessonData) {
            return VidPOD.Lessons.api.request('/lessons', {
                method: 'POST',
                body: JSON.stringify(lessonData)
            });
        },

        async update(id, lessonData) {
            return VidPOD.Lessons.api.request(`/lessons/${id}`, {
                method: 'PUT',
                body: JSON.stringify(lessonData)
            });
        },

        async delete(id) {
            return VidPOD.Lessons.api.request(`/lessons/${id}`, {
                method: 'DELETE'
            });
        },

        async markComplete(lessonId) {
            return VidPOD.Lessons.api.request(`/progress/lessons/${lessonId}/complete`, {
                method: 'POST'
            });
        }
    },

    // Quiz Management APIs
    quizzes: {
        async getByLesson(lessonId) {
            return VidPOD.Lessons.api.request(`/quizzes?lesson_id=${lessonId}`);
        },

        async getById(id) {
            return VidPOD.Lessons.api.request(`/quizzes/${id}`);
        },

        async create(quizData) {
            return VidPOD.Lessons.api.request('/quizzes', {
                method: 'POST',
                body: JSON.stringify(quizData)
            });
        },

        async update(id, quizData) {
            return VidPOD.Lessons.api.request(`/quizzes/${id}`, {
                method: 'PUT',
                body: JSON.stringify(quizData)
            });
        },

        async delete(id) {
            return VidPOD.Lessons.api.request(`/quizzes/${id}`, {
                method: 'DELETE'
            });
        },

        async submit(quizId, answers) {
            return VidPOD.Lessons.api.request(`/quizzes/${quizId}/submit`, {
                method: 'POST',
                body: JSON.stringify({ answers })
            });
        },

        async getAttempts(quizId) {
            return VidPOD.Lessons.api.request(`/quizzes/${quizId}/attempts`);
        }
    },

    // Progress Tracking APIs
    progress: {
        async getCourseProgress(courseId) {
            return VidPOD.Lessons.api.request(`/progress/courses/${courseId}`);
        },

        async getUserProgress() {
            return VidPOD.Lessons.api.request('/progress/user');
        },

        async getStudentsProgress(courseId) {
            return VidPOD.Lessons.api.request(`/progress/courses/${courseId}/students`);
        }
    }
};

// Progress Calculation Utilities
VidPOD.Lessons.progress = {
    calculateCourseProgress(lessons, userProgress) {
        if (!lessons.length) return 0;
        
        const completedLessons = lessons.filter(lesson => {
            const progress = userProgress.find(p => p.lesson_id === lesson.id);
            return progress && progress.completed;
        });
        
        return Math.round((completedLessons.length / lessons.length) * 100);
    },

    calculateLessonProgress(lesson, userProgress) {
        const progress = userProgress.find(p => p.lesson_id === lesson.id);
        return progress ? progress.progress_percentage : 0;
    },

    getNextUnlockedLesson(lessons, userProgress) {
        // Find the first lesson that's not completed or the first lesson
        for (let lesson of lessons) {
            const progress = userProgress.find(p => p.lesson_id === lesson.id);
            if (!progress || !progress.completed) {
                // Check if prerequisites are met
                if (this.arePrerequisitesMet(lesson, lessons, userProgress)) {
                    return lesson;
                }
            }
        }
        return null;
    },

    arePrerequisitesMet(lesson, allLessons, userProgress) {
        if (!lesson.prerequisites || lesson.prerequisites.length === 0) {
            return true;
        }

        return lesson.prerequisites.every(prereqId => {
            const progress = userProgress.find(p => p.lesson_id === prereqId);
            return progress && progress.completed;
        });
    },

    getGradeColor(score) {
        if (score >= 90) return 'excellent';
        if (score >= 80) return 'good';
        if (score >= 70) return 'needs-improvement';
        return 'incomplete';
    },

    getGradeText(score) {
        if (score >= 90) return 'Excellent';
        if (score >= 80) return 'Good';
        if (score >= 70) return 'Needs Improvement';
        return 'Incomplete';
    }
};

// Form Validation Utilities
VidPOD.Lessons.validation = {
    validateCourse(courseData) {
        const errors = {};

        if (!courseData.title || courseData.title.trim().length < 3) {
            errors.title = 'Course title must be at least 3 characters';
        }

        if (!courseData.description || courseData.description.trim().length < 10) {
            errors.description = 'Course description must be at least 10 characters';
        }

        if (!courseData.total_weeks || courseData.total_weeks < 1 || courseData.total_weeks > 52) {
            errors.total_weeks = 'Course must be between 1 and 52 weeks';
        }

        return errors;
    },

    validateLesson(lessonData) {
        const errors = {};

        if (!lessonData.title || lessonData.title.trim().length < 3) {
            errors.title = 'Lesson title must be at least 3 characters';
        }

        if (!lessonData.content || lessonData.content.trim().length < 20) {
            errors.content = 'Lesson content must be at least 20 characters';
        }

        if (lessonData.week_number < 1 || lessonData.week_number > 52) {
            errors.week_number = 'Week number must be between 1 and 52';
        }

        return errors;
    },

    validateQuiz(quizData) {
        const errors = {};

        if (!quizData.title || quizData.title.trim().length < 3) {
            errors.title = 'Quiz title must be at least 3 characters';
        }

        if (!quizData.questions || quizData.questions.length === 0) {
            errors.questions = 'Quiz must have at least one question';
        }

        if (quizData.time_limit && (quizData.time_limit < 1 || quizData.time_limit > 300)) {
            errors.time_limit = 'Time limit must be between 1 and 300 minutes';
        }

        return errors;
    },

    validateQuestion(questionData) {
        const errors = {};

        if (!questionData.question_text || questionData.question_text.trim().length < 5) {
            errors.question_text = 'Question text must be at least 5 characters';
        }

        if (!questionData.question_type) {
            errors.question_type = 'Question type is required';
        }

        // Validate based on question type
        if (['multiple_choice', 'multiple_select'].includes(questionData.question_type)) {
            if (!questionData.options || questionData.options.length < 2) {
                errors.options = 'Multiple choice questions must have at least 2 options';
            }
        }

        if (!questionData.correct_answer && questionData.question_type !== 'essay') {
            errors.correct_answer = 'Correct answer is required';
        }

        return errors;
    }
};

// UI Helper Functions
VidPOD.Lessons.ui = {
    showLoading(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.innerHTML = '<div class="loading-spinner"></div>';
        }
    },

    hideLoading(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            const spinner = element.querySelector('.loading-spinner');
            if (spinner) spinner.remove();
        }
    },

    showError(message, container = 'errorContainer') {
        const errorDiv = document.getElementById(container) || this.createErrorContainer();
        errorDiv.innerHTML = `
            <div class="alert alert-danger">
                <strong>Error:</strong> ${message}
            </div>
        `;
        errorDiv.scrollIntoView({ behavior: 'smooth' });
    },

    showSuccess(message, container = 'successContainer') {
        const successDiv = document.getElementById(container) || this.createSuccessContainer();
        successDiv.innerHTML = `
            <div class="alert alert-success">
                <strong>Success:</strong> ${message}
            </div>
        `;
        successDiv.scrollIntoView({ behavior: 'smooth' });
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            successDiv.innerHTML = '';
        }, 5000);
    },

    createErrorContainer() {
        const container = document.createElement('div');
        container.id = 'errorContainer';
        container.className = 'mb-3';
        document.querySelector('.container').prepend(container);
        return container;
    },

    createSuccessContainer() {
        const container = document.createElement('div');
        container.id = 'successContainer';
        container.className = 'mb-3';
        document.querySelector('.container').prepend(container);
        return container;
    },

    createProgressBar(percentage, className = '') {
        return `
            <div class="progress-bar ${className}">
                <div class="progress-bar-fill" style="width: ${percentage}%"></div>
            </div>
        `;
    },

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    formatTime(minutes) {
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}min`;
    },

    formatScore(score) {
        return Math.round(score * 10) / 10;
    },

    truncateText(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
};

// Rich Text Editor Functionality
VidPOD.Lessons.richEditor = {
    create(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        container.innerHTML = `
            <div class="rich-editor">
                <div class="editor-toolbar">
                    <button type="button" class="editor-btn" data-command="bold" title="Bold">
                        <strong>B</strong>
                    </button>
                    <button type="button" class="editor-btn" data-command="italic" title="Italic">
                        <em>I</em>
                    </button>
                    <button type="button" class="editor-btn" data-command="underline" title="Underline">
                        <u>U</u>
                    </button>
                    <button type="button" class="editor-btn" data-command="insertOrderedList" title="Ordered List">
                        1.
                    </button>
                    <button type="button" class="editor-btn" data-command="insertUnorderedList" title="Bullet List">
                        •
                    </button>
                    <button type="button" class="editor-btn" data-command="createLink" title="Insert Link">
                        🔗
                    </button>
                </div>
                <div class="editor-content" contenteditable="true" data-placeholder="Start typing your content..."></div>
            </div>
        `;

        const toolbar = container.querySelector('.editor-toolbar');
        const content = container.querySelector('.editor-content');

        // Add event listeners
        toolbar.addEventListener('click', (e) => {
            if (e.target.classList.contains('editor-btn')) {
                e.preventDefault();
                const command = e.target.dataset.command;
                
                if (command === 'createLink') {
                    const url = prompt('Enter URL:');
                    if (url) {
                        document.execCommand(command, false, url);
                    }
                } else {
                    document.execCommand(command, false, null);
                }
                
                content.focus();
            }
        });

        // Handle placeholder
        content.addEventListener('focus', () => {
            if (content.textContent.trim() === '') {
                content.classList.add('focused');
            }
        });

        content.addEventListener('blur', () => {
            content.classList.remove('focused');
        });

        return {
            getContent: () => content.innerHTML,
            setContent: (html) => content.innerHTML = html,
            focus: () => content.focus()
        };
    }
};

// Quiz Builder Utilities
VidPOD.Lessons.quizBuilder = {
    currentQuiz: {
        title: '',
        description: '',
        time_limit: null,
        max_attempts: 1,
        questions: []
    },

    addQuestion(type = 'multiple_choice') {
        const question = {
            id: Date.now(),
            question_type: type,
            question_text: '',
            options: type.includes('multiple') ? ['', '', '', ''] : [],
            correct_answer: '',
            points: 1,
            explanation: ''
        };

        this.currentQuiz.questions.push(question);
        return question;
    },

    removeQuestion(questionId) {
        this.currentQuiz.questions = this.currentQuiz.questions.filter(
            q => q.id !== questionId
        );
    },

    updateQuestion(questionId, updates) {
        const question = this.currentQuiz.questions.find(q => q.id === questionId);
        if (question) {
            Object.assign(question, updates);
        }
    },

    renderQuestionEditor(question) {
        const typeConfig = VidPOD.Lessons.questionTypes[question.question_type];
        
        let optionsHtml = '';
        if (['multiple_choice', 'multiple_select'].includes(question.question_type)) {
            optionsHtml = `
                <div class="form-group">
                    <label class="form-label lesson">Answer Options</label>
                    <div class="answer-options" data-question-id="${question.id}">
                        ${question.options.map((option, index) => `
                            <div class="answer-option">
                                <input type="${question.question_type === 'multiple_choice' ? 'radio' : 'checkbox'}" 
                                       name="correct_${question.id}" value="${index}">
                                <input type="text" class="form-control lesson" 
                                       placeholder="Option ${index + 1}" 
                                       value="${option}"
                                       onchange="VidPOD.Lessons.quizBuilder.updateQuestionOption(${question.id}, ${index}, this.value)">
                                <button type="button" class="btn btn-sm btn-danger" 
                                        onclick="VidPOD.Lessons.quizBuilder.removeOption(${question.id}, ${index})">×</button>
                            </div>
                        `).join('')}
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm mt-2" 
                            onclick="VidPOD.Lessons.quizBuilder.addOption(${question.id})">Add Option</button>
                </div>
            `;
        }

        return `
            <div class="question-item" data-question-id="${question.id}">
                <div class="question-header">
                    <span class="question-number">Question ${this.currentQuiz.questions.indexOf(question) + 1}</span>
                    <span class="question-type-badge">${typeConfig.name}</span>
                    <button type="button" class="btn btn-sm btn-danger" 
                            onclick="VidPOD.Lessons.quizBuilder.removeQuestion(${question.id})">Remove</button>
                </div>
                
                <div class="form-group">
                    <label class="form-label lesson">Question Text</label>
                    <textarea class="form-control lesson" rows="3" 
                              placeholder="Enter your question..."
                              onchange="VidPOD.Lessons.quizBuilder.updateQuestion(${question.id}, {question_text: this.value})">${question.question_text}</textarea>
                </div>
                
                ${optionsHtml}
                
                <div class="form-group">
                    <label class="form-label lesson">Points</label>
                    <input type="number" class="form-control lesson" min="1" max="10" 
                           value="${question.points}"
                           onchange="VidPOD.Lessons.quizBuilder.updateQuestion(${question.id}, {points: parseInt(this.value)})">
                </div>
                
                <div class="form-group">
                    <label class="form-label lesson">Explanation (Optional)</label>
                    <textarea class="form-control lesson" rows="2" 
                              placeholder="Explain the correct answer..."
                              onchange="VidPOD.Lessons.quizBuilder.updateQuestion(${question.id}, {explanation: this.value})">${question.explanation}</textarea>
                </div>
            </div>
        `;
    },

    addOption(questionId) {
        const question = this.currentQuiz.questions.find(q => q.id === questionId);
        if (question && question.options) {
            question.options.push('');
            this.renderQuizBuilder();
        }
    },

    removeOption(questionId, optionIndex) {
        const question = this.currentQuiz.questions.find(q => q.id === questionId);
        if (question && question.options && question.options.length > 2) {
            question.options.splice(optionIndex, 1);
            this.renderQuizBuilder();
        }
    },

    updateQuestionOption(questionId, optionIndex, value) {
        const question = this.currentQuiz.questions.find(q => q.id === questionId);
        if (question && question.options) {
            question.options[optionIndex] = value;
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Set up global error handling
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        VidPOD.Lessons.ui.showError('An unexpected error occurred. Please try again.');
    });

    // Verify authentication on lesson pages
    const token = localStorage.getItem('token');
    if (!token && !window.location.pathname.includes('index.html')) {
        window.location.href = '/index.html';
        return;
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VidPOD.Lessons;
}