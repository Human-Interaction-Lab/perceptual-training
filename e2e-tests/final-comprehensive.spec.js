const { test, expect } = require('@playwright/test');

test.describe('Comprehensive App Screenshots', () => {
  test('should capture complete app workflow with real login', async ({ page }) => {
    // Enable logging for debugging (but filter out dev messages)
    page.on('console', msg => {
      const text = msg.text();
      if ((text.includes('API') || text.includes('login') || text.includes('phase')) && 
          !text.includes('React DevTools') && 
          !text.includes('Download the React DevTools')) {
        console.log('PAGE:', text);
      }
    });

    // Suppress browser compatibility warning and dev messages
    await page.addInitScript(() => {
      // Override console.log to suppress React DevTools message
      const originalLog = console.log;
      console.log = (...args) => {
        const message = args.join(' ');
        if (!message.includes('React DevTools') && 
            !message.includes('Download the React DevTools')) {
          originalLog.apply(console, args);
        }
      };

      // Set user agent to Chrome to avoid browser warning
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        writable: false
      });
    });

    // Add CSS to hide browser compatibility warning
    await page.addStyleTag({
      content: `
        /* Hide browser compatibility warning */
        .bg-yellow-100,
        [class*="bg-yellow"],
        .border-yellow-500,
        [class*="border-yellow"] {
          display: none !important;
        }
        
        /* Hide any warning banners */
        div:has(svg[viewBox="0 0 20 20"]) {
          display: none !important;
        }
      `
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 1. Initial login page
    await page.screenshot({ path: 'screenshots/final-01-login-page.png', fullPage: true });

    // 2. Login with working approach (Enter key)
    const userIdInput = page.locator('input[type="text"], input#userId').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await userIdInput.fill('test_pretesta');
    await passwordInput.fill('test1234');
    
    await page.screenshot({ path: 'screenshots/final-02-filled-login.png', fullPage: true });

    // Use Enter key to submit (this works!)
    await passwordInput.press('Enter');
    await page.waitForTimeout(4000);
    
    // 3. Phase selection page
    await page.screenshot({ path: 'screenshots/final-03-phase-selection.png', fullPage: true });

    // 4. Try to navigate to different phases/activities
    const activities = [
      { name: 'demographics', selectors: ['button:has-text("Demographics")', 'text=Demographics'] },
      { name: 'pretest-intelligibility', selectors: ['button:has-text("Speech Intelligibility")', 'button:has-text("Intelligibility")'] },
      { name: 'pretest-comprehension', selectors: ['button:has-text("Story Comprehension")', 'button:has-text("Comprehension")'] },
      { name: 'pretest-effort', selectors: ['button:has-text("Listening Effort")', 'button:has-text("Effort")'] },
      { name: 'training', selectors: ['button:has-text("Training")', 'button:has-text("Day 1")'] }
    ];

    for (const activity of activities) {
      for (const selector of activity.selectors) {
        const button = page.locator(selector).first();
        if (await button.isVisible()) {
          console.log(`Clicking ${activity.name}: ${selector}`);
          await button.click();
          await page.waitForTimeout(2000);
          
          // Screenshot the activity page
          await page.screenshot({ 
            path: `screenshots/final-04-${activity.name}.png`,
            fullPage: true 
          });

          // Look for specific interface elements
          const interfaces = [
            'audio',
            'button:has-text("Play")',
            'button:has-text("Start")',
            'input[type="range"]',
            'textarea',
            'select',
            '[class*="audio-player"]',
            '[class*="test-interface"]'
          ];

          for (const interfaceSelector of interfaces) {
            if (await page.locator(interfaceSelector).first().isVisible()) {
              await page.screenshot({ 
                path: `screenshots/final-05-${activity.name}-interface.png`,
                fullPage: true 
              });
              break;
            }
          }

          // Try to start/interact with the activity
          const actionButtons = [
            'button:has-text("Start")',
            'button:has-text("Begin")',
            'button:has-text("Continue")',
            'button:has-text("Next")'
          ];

          for (const actionSelector of actionButtons) {
            const actionButton = page.locator(actionSelector).first();
            if (await actionButton.isVisible()) {
              await actionButton.click();
              await page.waitForTimeout(2000);
              
              await page.screenshot({ 
                path: `screenshots/final-06-${activity.name}-started.png`,
                fullPage: true 
              });
              break;
            }
          }

          // Go back to phase selection
          const backSelectors = [
            'button:has-text("Back")',
            'button:has-text("Return")',
            'button:has-text("Home")',
            'button:has-text("Phase Selection")'
          ];

          for (const backSelector of backSelectors) {
            const backButton = page.locator(backSelector).first();
            if (await backButton.isVisible()) {
              await backButton.click();
              await page.waitForTimeout(1500);
              break;
            }
          }

          await page.screenshot({ 
            path: `screenshots/final-07-back-to-phases.png`,
            fullPage: true 
          });
          
          break; // Found and interacted with this activity
        }
      }
    }

    // 5. Test responsive design
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: `screenshots/final-08-responsive-${viewport.name}.png`,
        fullPage: true 
      });
    }

    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 6. Try admin interface
    const adminButton = page.locator('button:has-text("Admin")').first();
    if (await adminButton.isVisible()) {
      await adminButton.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'screenshots/final-09-admin-interface.png',
        fullPage: true 
      });
    }

    console.log('✅ Successfully captured comprehensive app screenshots!');
  });

  test('should test specific training scenarios with time bypass', async ({ page }) => {
    // Apply same suppressions for this test
    await page.addInitScript(() => {
      const originalLog = console.log;
      console.log = (...args) => {
        const message = args.join(' ');
        if (!message.includes('React DevTools') && 
            !message.includes('Download the React DevTools')) {
          originalLog.apply(console, args);
        }
      };

      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        writable: false
      });
    });

    await page.addStyleTag({
      content: `
        .bg-yellow-100, [class*="bg-yellow"], .border-yellow-500, [class*="border-yellow"] {
          display: none !important;
        }
        div:has(svg[viewBox="0 0 20 20"]) {
          display: none !important;
        }
      `
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Login
    const userIdInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await userIdInput.fill('test_pretesta');
    await passwordInput.fill('test1234');
    await passwordInput.press('Enter');
    await page.waitForTimeout(3000);

    // Bypass time restrictions
    await page.evaluate(() => {
      const userId = localStorage.getItem('userId');
      
      // Set pretest date to allow training
      const pretestDate = new Date();
      pretestDate.setDate(pretestDate.getDate() - 5);
      sessionStorage.setItem('pretestDate', pretestDate.toISOString());
      localStorage.setItem('pretestDate', pretestDate.toISOString());
      
      // Set training completion to allow posttests
      const trainingDate = new Date();
      trainingDate.setDate(trainingDate.getDate() - 10);
      localStorage.setItem('trainingCompletedDate', trainingDate.toISOString());
      
      localStorage.setItem('currentPhase', 'training');
      localStorage.setItem('canProceedToday', 'true');
    });

    await page.reload();
    await page.waitForTimeout(2000);

    await page.screenshot({ 
      path: 'screenshots/final-10-time-bypassed.png',
      fullPage: true 
    });

    // Try training activities
    const trainingButton = page.locator('button').filter({ hasText: /training|day/i }).first();
    if (await trainingButton.isVisible()) {
      await trainingButton.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'screenshots/final-11-training-interface.png',
        fullPage: true 
      });
    }

    console.log('✅ Successfully captured training scenarios!');
  });

  test.afterEach(async ({ page }) => {
    // Clean up
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });
});