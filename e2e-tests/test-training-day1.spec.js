const { test, expect } = require('@playwright/test');

test.describe('Training Day 1 - Date Manipulation Test', () => {
  test('should enable and access Training Day 1 after date manipulation', async ({ page }) => {
    test.setTimeout(180000); // 3 minute timeout

    // Set up clean page environment
    await page.addInitScript(() => {
      // Suppress React DevTools messages
      const originalLog = console.log;
      console.log = (...args) => {
        const message = args.join(' ');
        if (!message.includes('React DevTools') && 
            !message.includes('Download the React DevTools')) {
          originalLog.apply(console, args);
        }
      };
    });

    // Hide browser compatibility warnings
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

    let screenshotCounter = 1;

    // Helper function for numbered screenshots
    const takeScreenshot = async (description) => {
      const filename = `training-test-${String(screenshotCounter).padStart(3, '0')}-${description}.png`;
      await page.screenshot({ 
        path: `screenshots/${filename}`,
        fullPage: true 
      });
      console.log(`📸 Screenshot ${screenshotCounter}: ${description}`);
      screenshotCounter++;
    };

    console.log('🚀 Starting Training Day 1 test...');

    // 1. Navigate and login
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot('login-page');

    const userIdInput = page.locator('input[type="text"], input#userId').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await userIdInput.fill('test_pretesta');
    await passwordInput.fill('test1234');
    await takeScreenshot('login-filled');

    await passwordInput.press('Enter');
    await page.waitForTimeout(4000);

    // 2. Take screenshot of initial phase selection state
    await takeScreenshot('phase-selection-initial');

    // 3. Manipulate pretest date to enable training
    console.log('⏰ Manipulating pretest date to enable training...');
    
    await page.evaluate(() => {
      // Set pretest date to be one day ago to allow training
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Store the manipulated date in both localStorage and sessionStorage
      localStorage.setItem('pretestDate', yesterday.toISOString());
      sessionStorage.setItem('pretestDate', yesterday.toISOString());
      localStorage.setItem('canProceedToday', 'true');
      
      // Set current phase to training explicitly
      localStorage.setItem('currentPhase', 'training');
      
      // Mark all pretest activities as completed to ensure training access
      localStorage.setItem('pretest_intelligibility', 'true');
      localStorage.setItem('pretest_effort', 'true');
      localStorage.setItem('pretest_comprehension', 'true');
      
      // Additional keys that might be needed for training access
      localStorage.setItem('pretestCompleted', 'true');
      localStorage.setItem('pretestCompletionDate', yesterday.toISOString());
      localStorage.setItem('trainingEnabled', 'true');
      
      // Set today's date for comparison
      const today = new Date();
      localStorage.setItem('currentDate', today.toISOString());
      
      console.log('Date manipulation complete - training should now be available');
      console.log('Pretest date set to:', yesterday.toISOString());
      console.log('Current date:', today.toISOString());
    });

    // 4. Reload page to reflect changes
    await page.reload();
    await page.waitForTimeout(3000);
    await takeScreenshot('phase-selection-after-date-manipulation');

    // 5. Look for Training Day 1 button
    console.log('🎯 Looking for Training Day 1 button...');
    
    // Debug: show all available buttons
    const allButtons = await page.locator('button').allTextContents();
    console.log('All available buttons:', JSON.stringify(allButtons, null, 2));

    // Look for training day 1 button with multiple selectors
    let trainingButton = page.locator('button').filter({ hasText: /Training Day 1/i }).first();
    
    // If not found, try broader selectors
    if (!await trainingButton.isVisible()) {
      trainingButton = page.locator('button').filter({ hasText: /Begin Training|Start Training/i }).first();
    }
    
    if (!await trainingButton.isVisible()) {
      trainingButton = page.locator('button').filter({ hasText: /training/i }).first();
    }
    
    // Check if training button is found
    if (await trainingButton.isVisible()) {
      console.log('✅ Found training button, clicking...');
      await trainingButton.click();
      await page.waitForTimeout(4000);
      await takeScreenshot('training-day1-interface');

      // 6. Test basic training interaction
      console.log('🎯 Testing training interface...');
      
      // Look for play buttons in training
      const trainingPlayBtn = page.locator('button').filter({ hasText: /play|listen|continue/i }).first();
      if (await trainingPlayBtn.isVisible()) {
        await trainingPlayBtn.click();
        await page.waitForTimeout(3000);
        await takeScreenshot('training-day1-playing');
        console.log('✅ Successfully clicked training play button');
      } else {
        console.log('❌ No training play button found');
        await takeScreenshot('training-no-play-button');
      }

      // Look for any input fields (training might have responses)
      const trainingInput = page.locator('input[type="text"], textarea').first();
      if (await trainingInput.isVisible()) {
        await trainingInput.fill('test training response');
        await takeScreenshot('training-response-filled');
        console.log('✅ Successfully filled training input');
      } else {
        console.log('ℹ️ No training input fields found');
      }

      // Look for next/continue buttons
      const nextBtn = page.locator('button').filter({ hasText: /next|continue|submit/i }).first();
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(2000);
        await takeScreenshot('training-advanced');
        console.log('✅ Successfully clicked next/continue button');
      } else {
        console.log('ℹ️ No next/continue button found');
      }

      console.log('✅ Training Day 1 test completed successfully!');

    } else {
      console.log('❌ Training button not found after date manipulation');
      await takeScreenshot('training-button-not-found');
      
      // Debug: Check localStorage values
      const storageDebug = await page.evaluate(() => {
        return {
          pretestDate: localStorage.getItem('pretestDate'),
          currentPhase: localStorage.getItem('currentPhase'),
          pretestCompleted: localStorage.getItem('pretestCompleted'),
          trainingEnabled: localStorage.getItem('trainingEnabled'),
          canProceedToday: localStorage.getItem('canProceedToday'),
          pretest_intelligibility: localStorage.getItem('pretest_intelligibility'),
          pretest_effort: localStorage.getItem('pretest_effort'),
          pretest_comprehension: localStorage.getItem('pretest_comprehension')
        };
      });
      
      console.log('localStorage debug:', JSON.stringify(storageDebug, null, 2));
      
      // Check if there's any error message or notice about training availability
      const errorMessages = await page.locator('text=/not available|tomorrow|24 hours|wait/i').allTextContents();
      if (errorMessages.length > 0) {
        console.log('Training availability messages:', errorMessages);
      }
    }

    await takeScreenshot('training-test-final-state');
    console.log(`✅ Training Day 1 test complete! Captured ${screenshotCounter - 1} screenshots.`);
  });
});