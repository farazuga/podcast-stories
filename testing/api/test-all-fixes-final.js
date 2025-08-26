#!/usr/bin/env node

/**
 * Canonical All Fixes Test Wrapper
 * This file redirects to the canonical backend all-fixes test
 */

console.log('🔗 Redirecting to canonical all-fixes test...\n');

// Import and run the canonical all-fixes test
const canonicalTest = require('./backend-tests/test-all-fixes.js');

// The canonical test is already executed when required
console.log('✅ Canonical all-fixes test completed');