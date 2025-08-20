# VidPOD Technical Documentation

*Comprehensive technical reference for the VidPOD application*

---

## 1. Application Overview

### Purpose
VidPOD is a web application for managing podcast story ideas in educational environments. It facilitates collaboration between teachers and students in creating and organizing story concepts for podcast production.

### Core Features
- Multi-tier user management (Amitrace Admins, Teachers, Students)
- Story idea database with metadata
- Class-based organization
- User favorites and analytics
- CSV import/export
- Email notifications
- Advanced search and filtering

### Tech Stack

**Backend:**
- Node.js with Express.js
- PostgreSQL database
- JWT authentication with bcrypt
- Nodemailer for emails
- Multer for file uploads

**Frontend:**
- Vanilla HTML5, CSS3, JavaScript (ES6+)
- CSS custom properties for theming
- Modular JavaScript with fetch API
- Responsive mobile-first design

**Infrastructure:**
- Railway.app hosting
- Nixpacks containerization
- Environment variable configuration

---

## 2. Project Structure

```
podcast-stories/
├── backend/
│   ├── server.js                     # Main Express server
│   ├── db/                          # Database schemas
│   ├── migrations/                  # Database migrations
│   ├── routes/                      # API endpoints
│   ├── middleware/                  # Auth middleware
│   ├── services/                    # Email services
│   └── frontend/                    # Served frontend files
│
├── frontend/
│   ├── *.html                       # Page templates
│   ├── css/styles.css               # Application styling
│   ├── js/*.js                      # JavaScript modules
│   └── includes/navigation.html     # Unified navigation
│
└── CLAUDE.md                        # This documentation
```

---

## 3. Database Schema

### Core Tables

#### users
- `id`: Primary key
- `email`: Primary login (unique)
- `username`: Optional legacy field
- `password`: Bcrypt hashed
- `role`: amitrace_admin | teacher | student
- `school_id`, `teacher_id`: Relationships
- `name`, `student_id`: Profile info

#### story_ideas
- `id`: Primary key
- `idea_title`, `idea_description`: Core content
- `question_1` through `question_6`: Interview questions
- `coverage_start_date`, `coverage_end_date`: Date range
- `uploaded_by`: User reference
- `is_approved`: Admin approval status

#### classes
- `id`: Primary key
- `class_name`, `subject`, `description`: Class info
- `class_code`: 4-character unique code
- `teacher_id`, `school_id`: Relationships
- `is_active`: Status flag

#### Supporting Tables
- `schools`: Institution management
- `user_favorites`: Story favorites
- `teacher_requests`: Approval workflow
- `tags`, `interviewees`: Content metadata
- `user_classes`: Student enrollments
- `story_tags`, `story_interviewees`: Junction tables

---

## 4. API Endpoints

### Authentication
- `POST /api/auth/login` - User login with email/username
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Token validation

### Stories
- `GET /api/stories` - List with filters
- `POST /api/stories` - Create story
- `PUT /api/stories/:id` - Update story
- `DELETE /api/stories/:id` - Delete (admin only)
- `POST /api/stories/import` - CSV import

### Favorites
- `GET /api/favorites` - User's favorites
- `POST /api/favorites/:storyId` - Add favorite
- `DELETE /api/favorites/:storyId` - Remove favorite
- `GET /api/favorites/popular` - Popular stories

### Classes
- `GET /api/classes` - User's classes
- `POST /api/classes` - Create class (teachers)
- `POST /api/classes/join` - Join with code (students)

### Admin
- `GET /api/teacher-requests` - Pending requests
- `PUT /api/teacher-requests/:id/approve` - Approve teacher
- `PUT /api/teacher-requests/:id/reject` - Reject teacher
- `GET /api/schools` - List schools
- `POST /api/schools` - Create school

---

## 5. Authentication & Authorization

### User Roles

**amitrace_admin:**
- Full system access
- Approve teachers
- Manage schools and tags
- Delete any content

**teacher:**
- Create/manage classes
- View student enrollments
- Create/edit stories
- Import CSV data

**student:**
- Join classes
- Create/edit own stories
- Favorite stories
- View approved content

### JWT Implementation
- HS256 algorithm
- 7-day expiration
- Stored in localStorage
- Bearer token in headers

---

## 6. Key Features

### Unified Navigation System
- Single navigation component across all pages
- Role-based menu visibility
- Mobile responsive hamburger menu
- CSV import restricted to admin only

### Story Management
- Rich metadata support
- Multi-select bulk operations
- Grid/list view toggle
- Advanced search and filters
- CSV import/export

### Class System
- 4-digit class codes
- Auto-generated unique codes
- Copy-to-clipboard functionality
- Student enrollment tracking

### Favorites System
- Heart icon toggle
- Real-time count updates
- Popular stories ranking
- Analytics integration

---

## 7. Deployment

### Environment Variables
```env
# Required
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
NODE_ENV=production

# Email (choose one method)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=app-password
# OR
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...

# Default admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password
ADMIN_EMAIL=admin@vidpod.com
```

### Railway Configuration
- Auto-deploy from GitHub
- Nixpacks build system
- PostgreSQL add-on
- Environment variables via dashboard

### Commands
```bash
# Development
npm run dev

# Production
npm start

# Database migrations
psql $DATABASE_URL < backend/migrations/[file].sql
```

---

## 8. Current Status

### Completed Features ✅
- Email-based authentication
- Three-tier role system
- Unified navigation
- Story approval workflow
- List view with multi-select
- Bulk operations (favorite, export, delete)
- Class code management
- Favorites system
- CSV import/export

### Test Accounts
```
admin@vidpod.com / vidpod (admin)
teacher@vidpod.com / vidpod (teacher)
student@vidpod.com / vidpod (student)
```

### Recent Updates
- Fixed duplicate section numbering
- Consolidated redundant information
- Streamlined implementation details
- Removed outdated debug sections
- Simplified troubleshooting guide

---

## 9. Development Guidelines

### Code Conventions
- ES6+ JavaScript standards
- Async/await for asynchronous code
- Parameterized SQL queries
- JWT bearer authentication
- Error handling with try/catch

### Testing
- Manual testing checklist
- API testing with curl
- Browser console debugging
- Network tab monitoring

### Common Tasks
1. **Add API endpoint:** Create route, add to server.js
2. **Database change:** Create migration, run on production
3. **New feature:** Update backend, frontend, test thoroughly
4. **Deploy:** Push to GitHub, Railway auto-deploys

---

## 10. Troubleshooting

### Common Issues

**Login Problems:**
- Clear localStorage
- Check email format
- Verify credentials

**API Errors:**
- Check network tab
- Verify token validity
- Test endpoint with curl

**Display Issues:**
- Clear browser cache
- Check console errors
- Verify data exists

### Debug Tools

#### Built-in Browser Tools
- Browser DevTools Console
- Network tab for API calls
- `localStorage` inspection
- Database queries via psql

#### Frontend Debug Pages
- `frontend/debug-admin.html` - Isolated admin panel testing
- `frontend/debug-api-test.html` - API connectivity testing
- `backend/frontend/debug-admin-live.html` - Live admin debugging
- `backend/frontend/admin-debug-live.html` - Admin functionality testing

#### Debug Scripts
- `debug-admin-simple.js` - Admin panel debugging
- `debug-browse-stories.js` - Story browsing debugging
- `debug-stories-page.js` - Stories page debugging
- `debug-story-approval.js` - Story approval workflow
- `debug-navigation-live.js` - Navigation system debugging
- `debug-teacher-class-creation.js` - Class creation debugging
- `backend/debug-email.js` - Email service debugging
- `backend/debug-favorites-api.js` - Favorites API debugging
- `backend/debug-tags-until-fixed.js` - Tags debugging

#### Testing Suites
- `test-navigation-all-pages-mcp.js` - MCP navigation testing with Puppeteer
- `test-admin-puppeteer.js` - Automated admin testing
- `test-csv-mcp.js` - CSV import testing
- `comprehensive-admin-test.js` - Complete admin functionality testing
- `test-bulk-functionality.js` - Bulk operations testing
- `test-multiselect-complete.js` - Multi-select feature testing

#### Debug Documentation
- `frontend/ADMIN_DEBUG_GUIDE.md` - Step-by-step admin debugging
- `DEBUG_SUMMARY.md` - Overall debugging summary
- `debug-phase1.md`, `debug-phase2.md`, `debug-phase4.md` - Phase-specific debugging
- `admin-panel-debug-report.md` - Admin panel issues and resolutions
- `story-approval-debug-final.md` - Story approval debugging guide

#### API Debug Route
- `backend/routes/debug.js` - Debug endpoints for development
- Provides direct database access for testing
- Test data creation utilities
- System health checks

---

*Last Updated: January 2025*  
*VidPOD Version: 2.1.0*