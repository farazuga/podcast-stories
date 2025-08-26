/**
 * End-to-End Tests for Rundown Creator Frontend
 * 
 * Comprehensive Playwright tests covering the complete user workflow
 * from authentication through rundown creation, segment management,
 * and approval workflows.
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const VIDPOD_API_URL = 'http://localhost:3000';

// Test data
const TEST_USERS = {
  student: {
    email: 'student@vidpod.com',
    password: 'rumi&amaml',
    role: 'student'
  },
  teacher: {
    email: 'teacher@vidpod.com',
    password: 'rumi&amaml',
    role: 'teacher'
  },
  admin: {
    email: 'admin@vidpod.com',
    password: 'rumi&amaml',
    role: 'amitrace_admin'
  }
};

// Helper functions
async function loginUser(page, userType) {
  const user = TEST_USERS[userType];
  
  await page.goto(BASE_URL);
  
  // Check if already logged in by looking for rundown content
  const isLoggedIn = await page.locator('#rundownsView').isVisible().catch(() => false);
  
  if (!isLoggedIn) {
    // Assume we're redirected to main VidPOD login
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect back to rundown creator
    await page.waitForURL(BASE_URL + '**');
  }
  
  // Wait for the app to initialize
  await page.waitForSelector('#rundownsView', { state: 'visible' });
}

async function createTestRundown(page, title = 'Test Rundown') {
  await page.click('#createRundownBtn');
  await page.waitForSelector('#createView.active');
  
  await page.fill('#rundownTitle', title);
  await page.fill('#rundownDescription', 'A test rundown for e2e testing');
  
  await page.click('#saveRundownBtn');
  await page.waitForSelector('.notification.success', { timeout: 5000 });
  
  return title;
}

async function addTestSegment(page, segmentTitle = 'Test Segment') {
  await page.click('#addSegmentBtn');
  await page.waitForSelector('#segmentModal.active');
  
  await page.selectOption('#segmentType', 'intro');
  await page.fill('#segmentTitle', segmentTitle);
  await page.fill('#segmentDuration', '2'); // 2 minutes
  await page.fill('#segmentNotes', 'Test segment notes');
  
  await page.click('#segmentForm button[type="submit"]');
  await page.waitForSelector('.notification.success', { timeout: 5000 });
  
  // Wait for modal to close
  await page.waitForSelector('#segmentModal:not(.active)');
}

test.describe('Rundown Creator E2E Tests', () => {
  
  test.describe('Authentication and Navigation', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Should be redirected to main VidPOD login
      await expect(page).toHaveURL(/localhost:3000/);
    });

    test('should allow authenticated student to access rundown creator', async ({ page }) => {
      await loginUser(page, 'student');
      
      await expect(page).toHaveURL(BASE_URL);
      await expect(page.locator('#rundownsView')).toBeVisible();
      await expect(page.locator('h2')).toContainText('My Rundowns');
    });

    test('should show correct navigation for different user roles', async ({ page }) => {
      await loginUser(page, 'teacher');
      
      // Teachers should see analytics nav
      await expect(page.locator('#navAnalytics')).toBeVisible();
    });
  });

  test.describe('Rundown Management', () => {
    test('should create a new rundown successfully', async ({ page }) => {
      await loginUser(page, 'student');
      
      const rundownTitle = 'E2E Test Rundown';
      await createTestRundown(page, rundownTitle);
      
      // Should be in edit view
      await expect(page.locator('#createView')).toHaveClass(/active/);
      await expect(page.locator('#rundownTitle')).toHaveValue(rundownTitle);
      
      // Should show success notification
      await expect(page.locator('.notification.success')).toBeVisible();
    });

    test('should enforce rundown title requirement', async ({ page }) => {
      await loginUser(page, 'student');
      
      await page.click('#createRundownBtn');
      await page.waitForSelector('#createView.active');
      
      // Try to save without title
      await page.click('#saveRundownBtn');
      
      // Should show validation error
      await expect(page.locator('.notification.error')).toBeVisible();
      await expect(page.locator('#rundownTitle:invalid')).toBeVisible();
    });

    test('should display rundown list with correct information', async ({ page }) => {
      await loginUser(page, 'student');
      
      // Create a test rundown first
      await createTestRundown(page, 'Display Test Rundown');
      
      // Go back to list
      await page.click('#backToListBtn');
      await page.waitForSelector('#rundownsView.active');
      
      // Should show the rundown in the list
      await expect(page.locator('.rundown-card')).toContainText('Display Test Rundown');
      await expect(page.locator('.status-badge.draft')).toBeVisible();
    });

    test('should allow editing existing rundown', async ({ page }) => {
      await loginUser(page, 'student');
      
      // Create and then edit a rundown
      await createTestRundown(page, 'Edit Test Rundown');
      
      const newTitle = 'Updated Test Rundown';
      await page.fill('#rundownTitle', newTitle);
      await page.click('#saveRundownBtn');
      
      await expect(page.locator('.notification.success')).toBeVisible();
      await expect(page.locator('#rundownTitle')).toHaveValue(newTitle);
    });
  });

  test.describe('Segment Management', () => {
    test('should add segments to rundown', async ({ page }) => {
      await loginUser(page, 'student');
      
      await createTestRundown(page, 'Segment Test Rundown');
      await addTestSegment(page, 'Intro Segment');
      
      // Should show segment in list
      await expect(page.locator('.segment-item')).toContainText('Intro Segment');
      await expect(page.locator('.segment-type')).toContainText('Intro');
      await expect(page.locator('.segment-item')).toContainText('2:00');
    });

    test('should validate segment form', async ({ page }) => {
      await loginUser(page, 'student');
      
      await createTestRundown(page, 'Validation Test');
      
      await page.click('#addSegmentBtn');
      await page.waitForSelector('#segmentModal.active');
      
      // Try to submit without title
      await page.click('#segmentForm button[type="submit"]');
      
      await expect(page.locator('#segmentTitle:invalid')).toBeVisible();
    });

    test('should handle different segment types correctly', async ({ page }) => {
      await loginUser(page, 'student');
      
      await createTestRundown(page, 'Segment Types Test');
      
      await page.click('#addSegmentBtn');
      await page.waitForSelector('#segmentModal.active');
      
      // Test guest segment type
      await page.selectOption('#segmentType', 'interview');
      await page.fill('#segmentTitle', 'Guest Interview');
      
      // Guest fields should be visible
      await expect(page.locator('#guestFields')).toBeVisible();
      
      await page.fill('#guestName', 'John Doe');
      await page.check('#isRemote');
      
      await page.click('#segmentForm button[type="submit"]');
      await page.waitForSelector('.notification.success');
      
      // Should show guest info in segment
      await expect(page.locator('.segment-item')).toContainText('John Doe');
      await expect(page.locator('.segment-item')).toContainText('Remote');
    });

    test('should support drag and drop reordering', async ({ page }) => {
      await loginUser(page, 'student');
      
      await createTestRundown(page, 'Reorder Test');
      
      // Add two segments
      await addTestSegment(page, 'First Segment');
      await addTestSegment(page, 'Second Segment');
      
      // Get segment elements
      const segments = page.locator('.segment-item');
      await expect(segments).toHaveCount(2);
      
      // Verify initial order
      await expect(segments.first()).toContainText('First Segment');
      await expect(segments.last()).toContainText('Second Segment');
      
      // Drag second segment to first position
      const firstSegment = segments.first();
      const secondSegment = segments.last();
      
      await secondSegment.dragTo(firstSegment);
      
      // Wait for reorder to complete
      await page.waitForTimeout(1000);
      
      // Verify new order
      const reorderedSegments = page.locator('.segment-item');
      await expect(reorderedSegments.first()).toContainText('Second Segment');
      await expect(reorderedSegments.last()).toContainText('First Segment');
    });

    test('should duplicate segments', async ({ page }) => {
      await loginUser(page, 'student');
      
      await createTestRundown(page, 'Duplicate Test');
      await addTestSegment(page, 'Original Segment');
      
      // Click duplicate button
      await page.click('.duplicate-segment-btn');
      await page.waitForSelector('.notification.success');
      
      // Should have two segments
      const segments = page.locator('.segment-item');
      await expect(segments).toHaveCount(2);
      await expect(page.locator('.segment-item')).toContainText('Copy');
    });

    test('should delete segments with confirmation', async ({ page }) => {
      await loginUser(page, 'student');
      
      await createTestRundown(page, 'Delete Test');
      await addTestSegment(page, 'Segment to Delete');
      
      // Mock the confirm dialog
      page.on('dialog', dialog => dialog.accept());
      
      await page.click('.delete-segment-btn');
      await page.waitForSelector('.notification.success');
      
      // Should have no segments
      await expect(page.locator('#emptySegments')).toBeVisible();
    });
  });

  test.describe('Story Integration', () => {
    test('should open story browser modal', async ({ page }) => {
      await loginUser(page, 'student');
      
      await createTestRundown(page, 'Story Test');
      
      await page.click('#addStoryBtn');
      await page.waitForSelector('#storyModal.active');
      
      await expect(page.locator('#storiesBrowser')).toBeVisible();
    });

    test('should search stories', async ({ page }) => {
      await loginUser(page, 'student');
      
      await createTestRundown(page, 'Story Search Test');
      
      await page.click('#addStoryBtn');
      await page.waitForSelector('#storyModal.active');
      
      await page.fill('#storySearchInput', 'test');
      await page.click('#storySearchBtn');
      
      // Should trigger search (exact results depend on test data)
      await page.waitForTimeout(1000);
    });
  });

  test.describe('Workflow and Approval', () => {
    test('should submit rundown for review', async ({ page }) => {
      await loginUser(page, 'student');
      
      await createTestRundown(page, 'Submission Test');
      await addTestSegment(page, 'Test Segment');
      
      await page.click('#submitRundownBtn');
      await page.waitForSelector('.notification.success');
      
      // Submit button should be hidden
      await expect(page.locator('#submitRundownBtn')).toBeHidden();
      
      // Status should update
      await expect(page.locator('.status-badge.submitted')).toBeVisible();
    });

    test('should show approval actions for teachers', async ({ page }) => {
      await loginUser(page, 'teacher');
      
      // Should see approval buttons on submitted rundowns
      const submittedCards = page.locator('.rundown-card .status-badge.submitted').first();
      if (await submittedCards.isVisible()) {
        const card = submittedCards.locator('xpath=ancestor::div[@class="rundown-card"]');
        await expect(card.locator('.approve-btn')).toBeVisible();
        await expect(card.locator('.reject-btn')).toBeVisible();
      }
    });
  });

  test.describe('Export Functionality', () => {
    test('should export approved rundowns', async ({ page }) => {
      await loginUser(page, 'student');
      
      // Look for approved rundowns
      const approvedCards = page.locator('.rundown-card .status-badge.approved').first();
      if (await approvedCards.isVisible()) {
        const card = approvedCards.locator('xpath=ancestor::div[@class="rundown-card"]');
        await expect(card.locator('.export-btn')).toBeVisible();
        
        // Test export button click (don't actually download in test)
        await card.locator('.export-btn').click();
        // Would normally handle download in a real test
      }
    });
  });

  test.describe('Responsive Design and Accessibility', () => {
    test('should be responsive on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      await loginUser(page, 'student');
      
      // Navigation should still work
      await expect(page.locator('.nav-link')).toBeVisible();
      
      // Cards should stack properly
      await expect(page.locator('.rundown-card')).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      await loginUser(page, 'student');
      
      // Test keyboard shortcuts
      await page.keyboard.press('Control+n');
      await page.waitForSelector('#createView.active');
      
      await page.keyboard.press('Escape');
      await page.waitForSelector('#rundownsView.active');
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await loginUser(page, 'student');
      
      // Check for proper accessibility attributes
      await expect(page.locator('button[aria-label]')).toHaveCount('>= 1');
      await expect(page.locator('main')).toHaveAttribute('role', 'main');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await loginUser(page, 'student');
      
      // Simulate network failure
      await page.route('**/api/rundowns', route => route.abort());
      
      await page.reload();
      
      // Should show error message
      await expect(page.locator('.notification.error')).toBeVisible();
    });

    test('should handle malformed data', async ({ page }) => {
      await loginUser(page, 'student');
      
      await createTestRundown(page, 'Error Test');
      
      // Try to add segment with invalid duration
      await page.click('#addSegmentBtn');
      await page.waitForSelector('#segmentModal.active');
      
      await page.fill('#segmentTitle', 'Invalid Segment');
      await page.fill('#segmentDuration', 'invalid'); // Non-numeric duration
      
      await page.click('#segmentForm button[type="submit"]');
      
      // Should handle validation error
      await expect(page.locator('#segmentDuration:invalid')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await loginUser(page, 'student');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should handle large number of rundowns', async ({ page }) => {
      await loginUser(page, 'student');
      
      // If there are many rundowns, they should still render efficiently
      const rundownCards = page.locator('.rundown-card');
      const count = await rundownCards.count();
      
      if (count > 20) {
        // Should still be responsive with many cards
        await expect(page.locator('#rundownsGrid')).toBeVisible();
      }
    });
  });

  test.describe('Local Storage and State', () => {
    test('should persist filters in local storage', async ({ page }) => {
      await loginUser(page, 'student');
      
      // Set a filter
      await page.selectOption('#statusFilter', 'draft');
      await page.fill('#searchInput', 'test');
      
      // Reload page
      await page.reload();
      await page.waitForSelector('#rundownsView.active');
      
      // Filters should be restored
      await expect(page.locator('#statusFilter')).toHaveValue('draft');
      await expect(page.locator('#searchInput')).toHaveValue('test');
    });

    test('should handle offline mode', async ({ page }) => {
      await loginUser(page, 'student');
      
      // Simulate going offline
      await page.context().setOffline(true);
      
      // Should show offline notification
      await expect(page.locator('.notification.warning')).toContainText('offline');
      
      // Go back online
      await page.context().setOffline(false);
      
      // Should show online notification
      await expect(page.locator('.notification.success')).toContainText('restored');
    });
  });
});

// Cleanup after all tests
test.afterAll(async () => {
  // Any cleanup needed
  console.log('E2E tests completed');
});