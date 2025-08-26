# End-to-End Testing

This directory contains all end-to-end (e2e) tests using Puppeteer for browser automation.

## Directory Structure

- **`admin-panel-tests/`** - Tests specific to admin panel functionality
- **`user-flow-tests/`** - Tests covering complete user journeys across roles
- **`../e2e/`** - Main e2e tests (existing comprehensive test suite)

## Test Categories

### Admin Panel Tests
- Admin authentication and navigation
- Tab functionality and UI interactions
- Data loading and display verification
- JavaScript error detection

### User Flow Tests
- Cross-role security testing
- Complete user journey validation
- Role-specific functionality testing
- Multi-step workflow verification

## Running E2E Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run specific admin tests
node testing/e2e/admin-panel-tests/test-admin-panel.js

# Run user flow tests
node testing/e2e/user-flow-tests/test-all-roles.js
```

## Best Practices

- Use headless: false for debugging
- Include comprehensive error handling
- Take screenshots on failures
- Clean up test data after execution
- Use consistent test account credentials