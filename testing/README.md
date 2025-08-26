# VidPOD Testing Directory

This directory contains all testing and debugging tools for the VidPOD application.

## Directory Structure

- **`e2e/`** - End-to-end tests using Puppeteer for browser automation
  - **`admin-panel-tests/`** - Admin-specific UI tests
  - **`user-flow-tests/`** - Complete user journey tests
- **`api/`** - Backend API endpoint tests
  - **`backend-tests/`** - Core API functionality
  - **`csv-tests/`** - CSV import/export testing
- **`integration/`** - Integration tests for complete workflows
- **`debug/`** - Debug scripts and troubleshooting tools
  - **`deployment-tests/`** - Deployment verification
- **`data/`** - Test data files (CSV, SQL, JSON)
- **`utils/`** - Reusable testing utilities and helpers

## Test Categories

### E2E Tests (Browser Automation)
- User journey testing
- Role-based access testing
- UI interaction testing

### API Tests
- Endpoint functionality testing
- Authentication testing
- Data validation testing

### Unit Tests
- Component testing
- Function testing
- Business logic testing

### Integration Tests
- Full workflow testing
- Cross-component testing
- Database integration testing

### Debug Tools
- Deployment verification
- Environment checking
- Issue-specific debugging

## Usage

See the main [Master Testing Guide](../docs/testing/master-testing-guide.md) for comprehensive testing documentation.