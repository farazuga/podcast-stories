# API Quick Reference

*For detailed information, see [TECHNICAL_REFERENCE.md](../TECHNICAL_REFERENCE.md)*

## Base URL
- Production: `https://podcast-stories-production.up.railway.app/api`
- Development: `http://localhost:3000/api`

## Authentication
All authenticated endpoints require:
```
Authorization: Bearer <jwt-token>
```

## Quick API List

### Authentication
```bash
# Login
curl -X POST $API_BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Register
curl -X POST $API_BASE/auth/register -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","password":"password123","name":"John Doe","role":"student"}'

# Verify Token
curl -H "Authorization: Bearer $TOKEN" $API_BASE/auth/verify
```

### Password Reset
```bash
# Request Reset
curl -X POST $API_BASE/password-reset/request -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'

# Verify Token
curl $API_BASE/password-reset/verify/your-token-here

# Reset Password
curl -X POST $API_BASE/password-reset/reset -H "Content-Type: application/json" \
  -d '{"token":"your-token-here","password":"newPassword123"}'
```

### Stories
```bash
# List Stories
curl -H "Authorization: Bearer $TOKEN" "$API_BASE/stories?page=1&limit=10"

# Create Story
curl -X POST $API_BASE/stories -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{
    "idea_title":"My Story",
    "idea_description":"Story description",
    "question_1":"What happened?",
    "tags":["Education"]
  }'

# Get Story by ID
curl -H "Authorization: Bearer $TOKEN" $API_BASE/stories/1

# Update Story
curl -X PUT $API_BASE/stories/1 -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"idea_title":"Updated Title"}'

# Delete Story (Admin only)
curl -X DELETE $API_BASE/stories/1 -H "Authorization: Bearer $TOKEN"
```

### Favorites
```bash
# Get User Favorites
curl -H "Authorization: Bearer $TOKEN" $API_BASE/favorites

# Add to Favorites
curl -X POST $API_BASE/favorites/1 -H "Authorization: Bearer $TOKEN"

# Remove from Favorites
curl -X DELETE $API_BASE/favorites/1 -H "Authorization: Bearer $TOKEN"

# Popular Stories
curl $API_BASE/favorites/popular?limit=5
```

### Classes
```bash
# Get User Classes
curl -H "Authorization: Bearer $TOKEN" $API_BASE/classes

# Create Class (Teachers only)
curl -X POST $API_BASE/classes -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{
    "class_name":"English 101",
    "subject":"English",
    "description":"Introduction to English"
  }'

# Join Class (Students only)
curl -X POST $API_BASE/classes/join -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"class_code":"AB12"}'
```

### Schools
```bash
# List All Schools
curl $API_BASE/schools

# Public Schools (for registration)
curl $API_BASE/schools/public

# Create School (Admin only)
curl -X POST $API_BASE/schools -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"school_name":"New School"}'
```

### Teacher Requests (Admin only)
```bash
# List Requests
curl -H "Authorization: Bearer $TOKEN" $API_BASE/teacher-requests

# Approve Request
curl -X PUT $API_BASE/teacher-requests/1/approve -H "Authorization: Bearer $TOKEN"

# Reject Request
curl -X PUT $API_BASE/teacher-requests/1/reject -H "Authorization: Bearer $TOKEN"
```

### Tags
```bash
# List Tags
curl $API_BASE/tags

# Create Tag (Admin only)
curl -X POST $API_BASE/tags -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"tag_name":"New Tag"}'
```

## Testing Workflow

### 1. Get Auth Token
```bash
# Set variables
API_BASE="https://podcast-stories-production.up.railway.app/api"

# Login and extract token
RESPONSE=$(curl -s -X POST $API_BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vidpod.com","password":"vidpod"}')

TOKEN=$(echo $RESPONSE | jq -r '.token')
echo "Token: $TOKEN"
```

### 2. Test API Endpoints
```bash
# Test protected endpoint
curl -H "Authorization: Bearer $TOKEN" $API_BASE/stories

# Create a story
curl -X POST $API_BASE/stories -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{
    "idea_title":"Test Story",
    "idea_description":"Testing API creation",
    "question_1":"How does this work?"
  }'
```

## Common Response Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Success |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid data |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Internal error |

## Error Response Format

```json
{
  "error": "Error description",
  "details": "Additional error details (optional)"
}
```

## Success Response Examples

### Login Success
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "student",
    "name": "John Doe",
    "school_id": 1
  }
}
```

### Story List Success
```json
{
  "stories": [
    {
      "id": 1,
      "idea_title": "Local Business Story",
      "idea_description": "Interview with local shop owner",
      "uploaded_by": 2,
      "uploaded_date": "2025-08-28T10:00:00Z",
      "is_approved": true,
      "tags": ["Business", "Community"],
      "interviewees": ["Jane Doe"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

## Environment Setup for Testing

### Local Testing
```bash
# Set local API base
export API_BASE="http://localhost:3000/api"
```

### Production Testing
```bash
# Set production API base
export API_BASE="https://podcast-stories-production.up.railway.app/api"
```

### Test Accounts
- **Admin**: `admin@vidpod.com / vidpod`
- **Teacher**: `teacher@vidpod.com / vidpod`
- **Student**: `student@vidpod.com / vidpod`

---

*For complete API documentation with detailed request/response schemas, see [TECHNICAL_REFERENCE.md](../TECHNICAL_REFERENCE.md)*