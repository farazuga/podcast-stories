# Debug Testing

This directory contains debugging tools and troubleshooting tests for the VidPOD application.

## Directory Structure

- **`deployment-tests/`** - Deployment verification and environment testing
- **`../debug/`** - Main debug tools (existing debug utilities)

## Test Categories

### Deployment Tests
- Production deployment verification
- Environment configuration validation
- Database connectivity testing
- API endpoint health checks

### Debug Tools
- Token validation and debugging
- Database schema verification
- JavaScript error tracking
- Performance monitoring

## Running Debug Tests

```bash
# Check deployment status
npm run debug:deployment

# Verify database connectivity
npm run debug:database

# Debug authentication issues
npm run debug:auth

# Run specific debug tests
node testing/debug/deployment-tests/test-live-deployment.js
```

## Debug Utilities

### Environment Verification
- Check environment variables
- Validate database connections
- Verify API endpoints
- Test email service configuration

### Troubleshooting Tools
- Token validation utilities
- Database query debugging
- Frontend error tracking
- Performance benchmarking

## Best Practices

- Use debug tools before creating new tests
- Document debugging findings
- Include comprehensive logging
- Test in both development and production environments
- Monitor for performance regressions