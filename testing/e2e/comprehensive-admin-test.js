#!/usr/bin/env node

/**
 * Canonical Admin Comprehensive Test Wrapper
 * This file redirects to the canonical admin comprehensive test
 */

console.log('🔗 Redirecting to canonical admin comprehensive test...\n');

// Import and run the canonical comprehensive admin test
const canonicalTest = require('./admin-panel-tests/admin-comprehensive-test.js');

// The canonical test is already executed when required
console.log('✅ Canonical admin comprehensive test completed');