# Podcast Stories Database

A web application for managing podcast story ideas with user authentication, tagging, and CSV import functionality.

## Features

- **User Authentication**: Admin and User roles with JWT authentication
- **Story Management**: Create, view, edit, and delete story ideas
- **Advanced Search**: Filter by keywords, tags, dates, and interviewees
- **Tag Management**: Admin-controlled tagging system
- **CSV Import**: Bulk upload story ideas via CSV files
- **People Management**: Track interviewees for each story
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- Bcrypt for password hashing
- Multer for file uploads
- CSV parser for imports

### Frontend
- HTML5, CSS3, JavaScript
- Responsive grid layouts
- Fetch API for backend communication
- Local storage for authentication

## Project Structure

```
podcast-stories/
├── backend/
│   ├── server.js              # Main server file
│   ├── package.json           # Dependencies
│   ├── .env.example          # Environment variables template
│   ├── db/
│   │   └── schema.sql        # Database schema
│   ├── routes/
│   │   ├── auth.js           # Authentication endpoints
│   │   ├── stories.js        # Story CRUD endpoints
│   │   └── tags.js           # Tag management endpoints
│   └── middleware/
│       └── auth.js           # JWT verification middleware
├── frontend/
│   ├── index.html            # Login page
│   ├── register.html         # User registration
│   ├── dashboard.html        # Main dashboard
│   ├── add-story.html        # Add/edit story form
│   ├── story-detail.html     # Story details view
│   ├── admin.html            # Admin panel
│   ├── css/
│   │   └── styles.css        # All CSS styles
│   └── js/
│       ├── auth.js           # Authentication functions
│       ├── dashboard.js      # Dashboard functionality
│       ├── stories.js        # Story form handling
│       ├── admin.js          # Admin panel features
│       └── story-detail.js   # Story detail view
└── README.md
```

## Setup Instructions

### 1. Database Setup

1. Create a PostgreSQL database
2. Run the schema from `backend/db/schema.sql`

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from template:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your database credentials:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/podcast_stories
   JWT_SECRET=your-secret-key-here
   PORT=3000
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   ADMIN_EMAIL=admin@podcaststories.com
   ADMIN_SCHOOL=Podcast Central
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup

1. Open `frontend/js/auth.js` and update the API_URL if needed
2. Serve the frontend files using a web server
3. For development, you can use:
   ```bash
   # Using Python 3
   cd frontend
   python -m http.server 8000
   
   # Using Node.js
   npx serve frontend
   ```

### 4. Access the Application

- Frontend: http://localhost:8000
- Backend API: http://localhost:3000

## Default Admin Account

- Username: `admin`
- Password: `admin123`

## Database Schema

### Users Table
- id, username, password, email, school, role, created_at

### Story Ideas Table
- id, idea_title, idea_description, question_1-6, coverage dates, uploaded_by, uploaded_date

### Interviewees Table
- id, name (normalized for searchability)

### Tags Table
- id, tag_name, created_by (admin-managed)

### Junction Tables
- story_tags (many-to-many: stories ↔ tags)
- story_interviewees (many-to-many: stories ↔ interviewees)

## CSV Import Format

Your CSV file should include these columns:

- `idea_title` (required)
- `idea_description`
- `question_1` through `question_6`
- `coverage_start_date` (YYYY-MM-DD format)
- `coverage_end_date` (YYYY-MM-DD format, optional)
- `tags` (comma-separated list)
- `interviewees` (comma-separated list)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Token verification

### Stories
- `GET /api/stories` - Get all stories (with filters)
- `GET /api/stories/:id` - Get single story
- `POST /api/stories` - Create new story
- `PUT /api/stories/:id` - Update story
- `DELETE /api/stories/:id` - Delete story (admin only)
- `POST /api/stories/import` - Import CSV

### Tags
- `GET /api/tags` - Get all tags
- `POST /api/tags` - Create tag (admin only)
- `PUT /api/tags/:id` - Update tag (admin only)
- `DELETE /api/tags/:id` - Delete tag (admin only)

## Deployment

### Railway Deployment

1. Push your code to GitHub
2. Connect your GitHub repository to Railway
3. Add a PostgreSQL database service
4. Set environment variables in Railway dashboard
5. Deploy the backend service
6. For frontend, you can use Railway's static site hosting or any CDN

### Environment Variables for Production

- `DATABASE_URL` - Railway PostgreSQL connection string
- `JWT_SECRET` - Strong random string
- `NODE_ENV=production`
- `PORT` - Railway will set this automatically

## Features in Detail

### User Roles
- **Admin**: Can delete stories, manage tags, access admin panel
- **User**: Can create and view all stories, edit own stories

### Search & Filtering
- Keyword search in titles and descriptions
- Filter by multiple tags
- Date range filtering
- Search by interviewee names
- Combine multiple filters

### Story Management
- Rich story details with up to 6 interview questions
- Multiple interviewee tracking
- Date range coverage planning
- Tag-based categorization

### Admin Features
- Tag management (create, edit, delete)
- Story moderation (delete any story)
- System statistics
- Recent activity monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.