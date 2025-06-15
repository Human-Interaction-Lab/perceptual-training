const { test, expect } = require('@playwright/test');

test.describe('App Navigation with Simulated Login', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Simulate a logged-in user by setting localStorage
    await page.evaluate(() => {
      const testUserId = `test_user_${Date.now()}`;
      const mockToken = 'mock_jwt_token_for_testing';
      
      // Set authentication data
      localStorage.setItem('userId', testUserId);
      localStorage.setItem('token', mockToken);
      
      // Set demographics as completed to skip that step
      localStorage.setItem('demographicsCompleted', 'true');
      localStorage.setItem(`demographicsCompleted_${testUserId}`, 'true');
      
      // Set current phase
      localStorage.setItem('currentPhase', 'pretest');
      localStorage.setItem('currentTestType', 'intelligibility');
    });
    
    // Reload the page to trigger the authenticated state
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should capture phase selection interface', async ({ page }) => {
    // Wait for the app to load in authenticated state
    await page.waitForTimeout(2000);
    
    // Take screenshot of main interface (should show phase selection)
    await page.screenshot({ 
      path: 'screenshots/authenticated-01-main-interface.png',
      fullPage: true 
    });

    // Look for and capture different UI elements
    const phaseButtons = page.locator('button').filter({ hasText: /pretest|training|posttest|intelligibility|comprehension|effort/i });
    const visibleButtons = await phaseButtons.all();
    
    if (visibleButtons.length > 0) {
      await page.screenshot({ 
        path: 'screenshots/authenticated-02-phase-buttons.png',
        fullPage: true 
      });

      // Try clicking on different phases
      for (let i = 0; i < Math.min(visibleButtons.length, 3); i++) {
        try {
          if (await visibleButtons[i].isVisible()) {
            await visibleButtons[i].click();
            await page.waitForTimeout(1500);
            
            await page.screenshot({ 
              path: `screenshots/authenticated-03-phase-${i + 1}.png`,
              fullPage: true 
            });

            // Look for test interface elements
            const testInterface = page.locator('[class*="test"], [class*="audio"], [class*="training"]');
            if (await testInterface.first().isVisible()) {
              await page.screenshot({ 
                path: `screenshots/authenticated-04-test-interface-${i + 1}.png`,
                fullPage: true 
              });
            }

            // Go back if possible
            const backButton = page.locator('button').filter({ hasText: /back|return|home/i });
            if (await backButton.first().isVisible()) {
              await backButton.first().click();
              await page.waitForTimeout(1000);
            }
          }
        } catch (error) {
          console.log(`Error with button ${i}:`, error.message);
        }
      }
    }
  });

  test('should capture audio and training interfaces', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Try to find and interact with audio elements
    const audioElements = page.locator('audio, [data-testid*="audio"], button').filter({ hasText: /play|audio|listen|start/i });
    
    if (await audioElements.first().isVisible()) {
      await page.screenshot({ 
        path: 'screenshots/authenticated-05-audio-interface.png',
        fullPage: true 
      });
    }

    // Look for training-specific elements
    const trainingElements = page.locator('[class*="training"], [data-testid*="training"]');
    if (await trainingElements.first().isVisible()) {
      await page.screenshot({ 
        path: 'screenshots/authenticated-06-training-interface.png',
        fullPage: true 
      });
    }

    // Look for form inputs (rating scales, text inputs, etc.)
    const formInputs = page.locator('input[type="range"], input[type="text"], textarea, select');
    if (await formInputs.first().isVisible()) {
      await page.screenshot({ 
        path: 'screenshots/authenticated-07-form-inputs.png',
        fullPage: true 
      });
    }
  });

  test('should test different viewport sizes for authenticated user', async ({ page }) => {
    await page.waitForTimeout(2000);

    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-auth' },
      { width: 768, height: 1024, name: 'tablet-auth' },
      { width: 375, height: 667, name: 'mobile-auth' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: `screenshots/authenticated-08-${viewport.name}.png`,
        fullPage: true 
      });
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });
});