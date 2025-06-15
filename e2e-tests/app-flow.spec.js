const { test, expect } = require('@playwright/test');

test.describe('Perceptual Training App Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load homepage and take initial screenshot', async ({ page }) => {
    // Take screenshot of the initial page load
    await page.screenshot({ 
      path: 'screenshots/01-homepage-initial.png',
      fullPage: true 
    });

    // Verify the page loaded correctly
    await expect(page).toHaveTitle(/Communication Training/i);
    
    // Check for key elements
    const welcomeSection = page.locator('[data-testid="welcome-section"], .welcome-section, h1, .app-title');
    await expect(welcomeSection.first()).toBeVisible();
  });

  test('should navigate through user registration flow', async ({ page }) => {
    // Look for user ID input or registration form
    const userIdInput = page.locator('input[type="text"]').first();
    if (await userIdInput.isVisible()) {
      await userIdInput.fill('test-user-' + Date.now());
      
      // Take screenshot of filled form
      await page.screenshot({ 
        path: 'screenshots/02-user-registration.png',
        fullPage: true 
      });

      // Look for submit/continue button
      const continueButton = page.locator('button').filter({ hasText: /continue|submit|start|next/i });
      if (await continueButton.first().isVisible()) {
        await continueButton.first().click();
        await page.waitForTimeout(1000);
        
        // Take screenshot after submission
        await page.screenshot({ 
          path: 'screenshots/03-after-registration.png',
          fullPage: true 
        });
      }
    }
  });

  test('should capture training session interface', async ({ page }) => {
    // Try to navigate to training session
    const trainingButton = page.locator('button').filter({ hasText: /training|start|begin/i });
    if (await trainingButton.first().isVisible()) {
      await trainingButton.first().click();
      await page.waitForTimeout(2000);
      
      // Take screenshot of training interface
      await page.screenshot({ 
        path: 'screenshots/04-training-interface.png',
        fullPage: true 
      });
    }
  });

  test('should capture audio player interface', async ({ page }) => {
    // Look for audio elements or player controls
    const audioPlayer = page.locator('audio, [data-testid*="audio"], [class*="audio"], .audio-player');
    if (await audioPlayer.first().isVisible()) {
      await page.screenshot({ 
        path: 'screenshots/05-audio-player.png',
        fullPage: true 
      });
    }
  });

  test('should test different phases and activities', async ({ page }) => {
    // Look for phase selection
    const phaseSelection = page.locator('[data-testid="phase-selection"], .phase-selection, button').filter({ hasText: /phase|activity/i });
    const phaseButtons = await phaseSelection.all();
    
    for (let i = 0; i < Math.min(phaseButtons.length, 3); i++) {
      if (await phaseButtons[i].isVisible()) {
        await phaseButtons[i].click();
        await page.waitForTimeout(1000);
        
        // Take screenshot of each phase
        await page.screenshot({ 
          path: `screenshots/06-phase-${i + 1}.png`,
          fullPage: true 
        });
        
        // Go back if there's a back button
        const backButton = page.locator('button').filter({ hasText: /back|return/i });
        if (await backButton.first().isVisible()) {
          await backButton.first().click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should capture different test types', async ({ page }) => {
    const testTypes = [
      'intelligibility',
      'comprehension', 
      'listening-effort',
      'training'
    ];

    for (const testType of testTypes) {
      // Look for test-specific elements or buttons
      const testButton = page.locator(`[data-testid*="${testType}"], button`).filter({ hasText: new RegExp(testType, 'i') });
      if (await testButton.first().isVisible()) {
        await testButton.first().click();
        await page.waitForTimeout(1500);
        
        // Take screenshot of test interface
        await page.screenshot({ 
          path: `screenshots/07-${testType}-test.png`,
          fullPage: true 
        });
        
        // Navigate back
        const backButton = page.locator('button').filter({ hasText: /back|return|home/i });
        if (await backButton.first().isVisible()) {
          await backButton.first().click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should capture responsive design at different viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: `screenshots/08-responsive-${viewport.name}.png`,
        fullPage: true 
      });
    }
  });

  test('should capture error states and edge cases', async ({ page }) => {
    // Test with invalid user ID
    const userIdInput = page.locator('input[type="text"]').first();
    if (await userIdInput.isVisible()) {
      await userIdInput.fill('');
      
      const submitButton = page.locator('button').filter({ hasText: /submit|continue/i });
      if (await submitButton.first().isVisible()) {
        await submitButton.first().click();
        await page.waitForTimeout(500);
        
        // Capture error state
        await page.screenshot({ 
          path: 'screenshots/09-error-empty-input.png',
          fullPage: true 
        });
      }
    }
  });
});

test.describe('Admin Interface Tests', () => {
  test('should capture admin login flow', async ({ page }) => {
    await page.goto('/');
    
    // Look for admin login link or button
    const adminLink = page.locator('a, button').filter({ hasText: /admin/i });
    if (await adminLink.first().isVisible()) {
      await adminLink.first().click();
      await page.waitForTimeout(1000);
      
      // Take screenshot of admin login page
      await page.screenshot({ 
        path: 'screenshots/10-admin-login.png',
        fullPage: true 
      });
    }
  });
});