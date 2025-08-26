# API Testing

This directory contains all API endpoint testing for the VidPOD backend.

## Directory Structure

- **`backend-tests/`** - Backend API endpoint tests
- **`csv-tests/`** - CSV import/export API tests
- **`../api/`** - Main API tests (existing test suite)

## Test Categories

### Backend Tests
- Authentication endpoint testing
- CRUD operations for stories, users, tags
- Role-based access control verification
- API response validation
- Token comparison and validation

### CSV Tests
- CSV upload functionality
- Field mapping validation
- Import/export workflows
- Error handling for malformed CSV

## Running API Tests

```bash
# Run all API tests
npm run test:api

# Run backend API tests
node testing/api/backend-tests/test-api-comparison.js

# Run CSV tests
node testing/api/csv-tests/test-csv-upload.js
```

## Authentication

Most API tests require authentication. Use test credentials:
- Admin: admin@vidpod.com / vidpod
- Teacher: teacher@vidpod.com / vidpod
- Student: student@vidpod.com / vidpod

## Best Practices

- Always test with valid authentication tokens
- Verify response status codes and data structure
- Test error conditions and edge cases
- Clean up test data after execution
- Use environment variables for sensitive data