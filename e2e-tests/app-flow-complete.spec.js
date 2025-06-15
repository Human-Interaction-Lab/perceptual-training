const { test, expect } = require('@playwright/test');

test.describe('Complete Perceptual Training App Flow', () => {
  let testUserId;

  test.beforeEach(async ({ page }) => {
    // Generate unique test user ID to avoid conflicts
    testUserId = `test_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full user journey with screenshots', async ({ page }) => {
    // 1. Take screenshot of initial login page
    await page.screenshot({ 
      path: 'screenshots/01-login-page.png',
      fullPage: true 
    });

    // Verify we're on the login page
    await expect(page).toHaveTitle(/Communication Training/i);
    await expect(page.locator('text=Login')).toBeVisible();

    // 2. Register a new user (assuming registration is available)
    const createAccountButton = page.locator('button, a').filter({ hasText: /create account|register|sign up/i });
    if (await createAccountButton.isVisible()) {
      await createAccountButton.click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: 'screenshots/02-registration-form.png',
        fullPage: true 
      });
    }

    // 3. Fill out login/registration form
    const userIdInput = page.locator('input#userId, input[name="userId"], input[placeholder*="User ID"]');
    await userIdInput.fill(testUserId);

    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('testpassword123');
    }

    // Check for email field if in registration mode
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill(`${testUserId}@test.com`);
    }

    // Take screenshot of filled form
    await page.screenshot({ 
      path: 'screenshots/03-filled-auth-form.png',
      fullPage: true 
    });

    // 4. Submit the form
    const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /login|create account|submit|continue/i });
    await submitButton.first().click();
    
    // Wait for navigation after login
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');

    // 5. Take screenshot after successful login
    await page.screenshot({ 
      path: 'screenshots/04-after-login.png',
      fullPage: true 
    });

    // 6. Look for phase selection or main dashboard
    const phaseSelectionElements = [
      'text=Phase Selection',
      'text=Select Phase',
      'text=Pretest',
      'text=Training',
      'text=Demographics',
      '[data-testid="phase-selection"]',
      '.phase-selection'
    ];

    let foundPhaseSelection = false;
    for (const selector of phaseSelectionElements) {
      if (await page.locator(selector).first().isVisible()) {
        foundPhaseSelection = true;
        break;
      }
    }

    if (foundPhaseSelection) {
      await page.screenshot({ 
        path: 'screenshots/05-phase-selection.png',
        fullPage: true 
      });

      // 7. Try to navigate to demographics if available
      const demographicsButton = page.locator('button, a').filter({ hasText: /demographics/i });
      if (await demographicsButton.first().isVisible()) {
        await demographicsButton.first().click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: 'screenshots/06-demographics-form.png',
          fullPage: true 
        });

        // Go back to phase selection
        const backButton = page.locator('button').filter({ hasText: /back|return/i });
        if (await backButton.first().isVisible()) {
          await backButton.first().click();
          await page.waitForTimeout(1000);
        }
      }

      // 8. Try different test types
      const testTypes = [
        { name: 'intelligibility', pattern: /intelligibility|speech/i },
        { name: 'comprehension', pattern: /comprehension|story/i },
        { name: 'listening-effort', pattern: /effort|listening/i },
        { name: 'pretest', pattern: /pretest|initial/i },
        { name: 'training', pattern: /training|practice/i }
      ];

      for (const testType of testTypes) {
        const testButton = page.locator('button, a').filter({ hasText: testType.pattern });
        if (await testButton.first().isVisible()) {
          await testButton.first().click();
          await page.waitForTimeout(2000);
          
          await page.screenshot({ 
            path: `screenshots/07-${testType.name}-interface.png`,
            fullPage: true 
          });

          // Look for audio player or test interface
          const audioPlayer = page.locator('audio, button').filter({ hasText: /play|audio|listen/i });
          if (await audioPlayer.first().isVisible()) {
            await page.screenshot({ 
              path: `screenshots/08-${testType.name}-audio-interface.png`,
              fullPage: true 
            });
          }

          // Go back
          const backButton = page.locator('button').filter({ hasText: /back|return|home/i });
          if (await backButton.first().isVisible()) {
            await backButton.first().click();
            await page.waitForTimeout(1000);
          }
        }
      }
    }

    // 9. Test responsive design
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: `screenshots/09-responsive-${viewport.name}.png`,
        fullPage: true 
      });
    }

    // Reset to desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 10. Test admin interface if available
    const adminLink = page.locator('a, button').filter({ hasText: /admin/i });
    if (await adminLink.first().isVisible()) {
      await adminLink.first().click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'screenshots/10-admin-interface.png',
        fullPage: true 
      });
    }
  });

  test('should handle error states and validation', async ({ page }) => {
    // Test empty form submission
    const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /login|submit/i });
    if (await submitButton.first().isVisible()) {
      await submitButton.first().click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'screenshots/11-validation-errors.png',
        fullPage: true 
      });
    }

    // Test invalid credentials
    const userIdInput = page.locator('input#userId, input[name="userId"]');
    if (await userIdInput.isVisible()) {
      await userIdInput.fill('invalid_user_12345');
      
      const passwordInput = page.locator('input[type="password"]');
      if (await passwordInput.first().isVisible()) {
        await passwordInput.first().fill('wrongpassword');
      }

      if (await submitButton.first().isVisible()) {
        await submitButton.first().click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: 'screenshots/12-invalid-credentials.png',
          fullPage: true 
        });
      }
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up test user data if needed
    try {
      // Clear localStorage for the test user
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch (error) {
      console.log('Cleanup error (non-critical):', error);
    }
  });
});