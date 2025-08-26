/**
 * Playwright Configuration for Rundown Creator E2E Tests
 * 
 * Configures test environment, browsers, and execution settings
 * for comprehensive end-to-end testing of the rundown creator.
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // Test directory
  testDir: './frontend/tests',
  
  // Global test timeout
  timeout: 30 * 1000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 5000
  },
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  // Global setup and teardown
  globalSetup: require.resolve('./frontend/tests/global-setup.js'),
  globalTeardown: require.resolve('./frontend/tests/global-teardown.js'),
  
  use: {
    // Base URL for your app
    baseURL: 'http://localhost:3001',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Accept downloads
    acceptDownloads: true,
    
    // Default timeout for actions
    actionTimeout: 10000,
    
    // Default timeout for navigation
    navigationTimeout: 30000
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    }
  ],

  // Run your local dev server before starting the tests
  webServer: [
    {
      command: 'npm start',
      cwd: './backend',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
        PORT: '3001'
      }
    },
    {
      command: 'npm start',
      cwd: '../../../backend', // Main VidPOD API
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
        PORT: '3000'
      }
    }
  ],

  // Test configuration
  testMatch: '**/*.test.js',
  
  // Output directory
  outputDir: './test-results/',
  
  // Maximum failures before stopping
  maxFailures: process.env.CI ? 10 : undefined
});