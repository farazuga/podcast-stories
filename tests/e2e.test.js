const { test, expect } = require('@playwright/test');

const API_URL = 'https://podcast-stories-production.up.railway.app/api';

test.describe('Admin Workflow', () => {
  test('admin login and panel access', async ({ page }) => {
    // Navigate to login
    await page.goto('https://frontend-production-b75b.up.railway.app');
    
    // Login as admin
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('#loginButton');
    
    // Wait for redirect to admin panel
    await page.waitForURL('**/admin.html');
    
    // Test tab switching
    await page.click('[onclick="showTab(\'schools\')"]');
    await expect(page.locator('#schools')).toBeVisible();
    
    // Test teacher requests tab
    await page.click('[onclick="showTab(\'teacher-requests\')"]');
    await expect(page.locator('#teacher-requests')).toBeVisible();
  });
});

test.describe('Teacher Workflow', () => {
  test('teacher dashboard functionality', async ({ page }) => {
    // Login as teacher (assumes teacher account exists)
    await page.goto('https://frontend-production-b75b.up.railway.app');
    await page.fill('#username', 'teacher');
    await page.fill('#password', 'password');
    await page.click('#loginButton');
    
    await page.waitForURL('**/teacher-dashboard.html');
    
    // Test class creation
    await page.fill('#className', 'Test Automation Class');
    await page.fill('#subject', 'Computer Science');
    await page.fill('#description', 'Automated test class');
    await page.click('#createClassButton');
    
    // Wait for success message
    await expect(page.locator('.notification')).toContainText('successfully');
  });
});

test.describe('Student Workflow', () => {
  test('student registration and class joining', async ({ page }) => {
    await page.goto('https://frontend-production-b75b.up.railway.app/register-student.html');
    
    // Fill registration form
    await page.fill('#username', `student_${Date.now()}`);
    await page.fill('#password', 'password123');
    await page.fill('#email', `test_${Date.now()}@example.com`);
    await page.fill('#name', 'Test Student');
    await page.fill('#studentId', 'STU001');
    await page.fill('#teacherUsername', 'teacher');
    
    await page.click('#registerButton');
    
    // Should redirect to login
    await page.waitForURL('**/index.html');
  });
});

test.describe('API Tests', () => {
  test('admin API endpoints', async ({ request }) => {
    // Login to get token
    const loginResponse = await request.post(`${API_URL}/auth/login`, {
      data: {
        username: 'admin',
        password: 'admin123'
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    // Test protected endpoints
    const storiesResponse = await request.get(`${API_URL}/stories`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(storiesResponse.ok()).toBeTruthy();
    
    // Test schools endpoint
    const schoolsResponse = await request.get(`${API_URL}/schools`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(schoolsResponse.ok()).toBeTruthy();
  });
});