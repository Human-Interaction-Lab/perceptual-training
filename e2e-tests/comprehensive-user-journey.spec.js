const { test, expect } = require('@playwright/test');

test.describe('Comprehensive User Journey Test', () => {
  test('should complete full user journey: login → demographics → pretest activities → training', async ({ page }) => {
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

      // Set user agent to Chrome to avoid browser warnings
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        writable: false
      });
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
      const filename = `journey-${String(screenshotCounter).padStart(3, '0')}-${description}.png`;
      await page.screenshot({ 
        path: `screenshots/${filename}`,
        fullPage: true 
      });
      console.log(`📸 Screenshot ${screenshotCounter}: ${description}`);
      screenshotCounter++;
    };

    console.log('🚀 Starting comprehensive user journey test...');

    // 1. Navigate to login page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot('login-page');

    // 2. Login with test user
    const userIdInput = page.locator('input[type="text"], input#userId').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await userIdInput.fill('test_pretesta');
    await passwordInput.fill('test1234');
    await takeScreenshot('login-filled');

    // Submit login using Enter key
    await passwordInput.press('Enter');
    await page.waitForTimeout(4000);

    // 3. Phase selection page after login
    await takeScreenshot('phase-selection-initial');

    // 4. Demographics section
    console.log('📋 Starting Demographics...');
    
    // Look for demographics button/card
    const demographicsButton = page.locator('button').filter({ hasText: /demographics|background/i }).first();
    if (await demographicsButton.isVisible()) {
      await demographicsButton.click();
      await page.waitForTimeout(3000);
      await takeScreenshot('demographics-form');

      // Fill out demographics form (basic interaction)
      const ageInput = page.locator('input[name="age"], input#age').first();
      if (await ageInput.isVisible()) {
        await ageInput.fill('25');
      }

      const genderSelect = page.locator('select[name="gender"], select#gender').first();
      if (await genderSelect.isVisible()) {
        await genderSelect.selectOption('Male');
      }

      // Look for submit button
      const submitButton = page.locator('button').filter({ hasText: /submit|continue|next/i }).first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(3000);
      }

      await takeScreenshot('demographics-completed');
    }

    // 5. Return to phase selection after demographics
    await page.goto('/');
    await page.waitForTimeout(3000);
    await takeScreenshot('phase-selection-after-demographics');

    // 6. Intelligibility Test
    console.log('🎧 Starting Intelligibility Test...');
    
    const intelligibilityButton = page.locator('button').filter({ hasText: /intelligibility|begin activity/i }).first();
    if (await intelligibilityButton.isVisible()) {
      await intelligibilityButton.click();
      await page.waitForTimeout(4000);
      await takeScreenshot('intelligibility-interface');

      // Look for play button and audio controls
      const playButton = page.locator('button').filter({ hasText: /play|listen/i }).first();
      if (await playButton.isVisible()) {
        await playButton.click();
        await page.waitForTimeout(2000);
        await takeScreenshot('intelligibility-playing');
      }

      // Look for text input to type response
      const responseInput = page.locator('input[type="text"], textarea').first();
      if (await responseInput.isVisible()) {
        await responseInput.fill('test response');
        await takeScreenshot('intelligibility-response-filled');
      }

      // Submit response
      const submitBtn = page.locator('button').filter({ hasText: /submit|continue|next/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }

      // Navigate back to phase selection
      const backButton = page.locator('button').filter({ hasText: /back|return|home|phase/i }).first();
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForTimeout(3000);
      } else {
        await page.goto('/');
        await page.waitForTimeout(3000);
      }
    }

    // 7. Phase selection after intelligibility
    await takeScreenshot('phase-selection-after-intelligibility');

    // 8. Listening Effort Test
    console.log('📊 Starting Listening Effort Test...');
    
    const effortButton = page.locator('button').filter({ hasText: /effort|begin activity/i }).first();
    if (await effortButton.isVisible()) {
      await effortButton.click();
      await page.waitForTimeout(4000);
      await takeScreenshot('effort-interface');

      // Look for play button
      const playBtn = page.locator('button').filter({ hasText: /play|listen/i }).first();
      if (await playBtn.isVisible()) {
        await playBtn.click();
        await page.waitForTimeout(2000);
        await takeScreenshot('effort-playing');
      }

      // Look for slider or rating controls
      const slider = page.locator('input[type="range"], [role="slider"]').first();
      if (await slider.isVisible()) {
        await slider.click();
        await takeScreenshot('effort-rating-interacted');
      }

      // Submit response
      const submitBtn = page.locator('button').filter({ hasText: /submit|continue|next/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }

      // Navigate back
      const backButton = page.locator('button').filter({ hasText: /back|return|home|phase/i }).first();
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForTimeout(3000);
      } else {
        await page.goto('/');
        await page.waitForTimeout(3000);
      }
    }

    // 9. Phase selection after effort
    await takeScreenshot('phase-selection-after-effort');

    // 10. Comprehension Test
    console.log('📖 Starting Comprehension Test...');
    
    const comprehensionButton = page.locator('button').filter({ hasText: /comprehension|begin activity/i }).first();
    if (await comprehensionButton.isVisible()) {
      await comprehensionButton.click();
      await page.waitForTimeout(4000);
      await takeScreenshot('comprehension-interface');

      // Look for story play button
      const playBtn = page.locator('button').filter({ hasText: /play|listen|story/i }).first();
      if (await playBtn.isVisible()) {
        await playBtn.click();
        await page.waitForTimeout(3000);
        await takeScreenshot('comprehension-story-playing');
      }

      // Look for multiple choice questions
      const radioButton = page.locator('input[type="radio"]').first();
      if (await radioButton.isVisible()) {
        await radioButton.click();
        await takeScreenshot('comprehension-question-answered');
      }

      // Submit comprehension test
      const submitBtn = page.locator('button').filter({ hasText: /submit|continue|next/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }

      // Navigate back
      const backButton = page.locator('button').filter({ hasText: /back|return|home|phase/i }).first();
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForTimeout(3000);
      } else {
        await page.goto('/');
        await page.waitForTimeout(3000);
      }
    }

    // 11. Phase selection after all pretest activities
    await takeScreenshot('phase-selection-after-all-pretests');

    // 12. Manipulate pretest date to enable training
    console.log('⏰ Manipulating pretest date to enable training...');
    
    await page.evaluate(() => {
      // Set pretest date to be one day ago to allow training
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      localStorage.setItem('pretestDate', yesterday.toISOString());
      sessionStorage.setItem('pretestDate', yesterday.toISOString());
      localStorage.setItem('canProceedToday', 'true');
      
      // Set current phase to training
      localStorage.setItem('currentPhase', 'training');
      
      console.log('Date manipulation complete - training should now be available');
    });

    // Reload page to reflect changes
    await page.reload();
    await page.waitForTimeout(3000);
    await takeScreenshot('phase-selection-training-enabled');

    // 13. Training Day 1
    console.log('🎯 Starting Training Day 1...');
    
    const trainingButton = page.locator('button').filter({ hasText: /training|day 1|begin training/i }).first();
    if (await trainingButton.isVisible()) {
      await trainingButton.click();
      await page.waitForTimeout(4000);
      await takeScreenshot('training-day1-interface');

      // Interact with training interface
      const trainingPlayBtn = page.locator('button').filter({ hasText: /play|listen|continue/i }).first();
      if (await trainingPlayBtn.isVisible()) {
        await trainingPlayBtn.click();
        await page.waitForTimeout(3000);
        await takeScreenshot('training-day1-active');
      }

      // Look for training content or next buttons
      const nextBtn = page.locator('button').filter({ hasText: /next|continue/i }).first();
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(2000);
        await takeScreenshot('training-day1-progressed');
      }

      // Check if there's an intelligibility test after training
      const postTrainingTest = page.locator('h2, h3').filter({ hasText: /intelligibility|test/i }).first();
      if (await postTrainingTest.isVisible()) {
        await takeScreenshot('training-day1-post-test');
        
        // Interact with post-training test
        const testPlayBtn = page.locator('button').filter({ hasText: /play/i }).first();
        if (await testPlayBtn.isVisible()) {
          await testPlayBtn.click();
          await page.waitForTimeout(2000);
        }

        const testInput = page.locator('input[type="text"]').first();
        if (await testInput.isVisible()) {
          await testInput.fill('training test response');
          await takeScreenshot('training-day1-test-response');
        }

        const testSubmitBtn = page.locator('button').filter({ hasText: /submit|continue/i }).first();
        if (await testSubmitBtn.isVisible()) {
          await testSubmitBtn.click();
          await page.waitForTimeout(2000);
        }
      }

      // Navigate back to phase selection
      const backButton = page.locator('button').filter({ hasText: /back|return|home|phase/i }).first();
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForTimeout(3000);
      } else {
        await page.goto('/');
        await page.waitForTimeout(3000);
      }
    }

    // 14. Final phase selection state
    await takeScreenshot('phase-selection-final-state');

    // 15. Test responsive design - capture at different viewport sizes
    console.log('📱 Testing responsive design...');
    
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      await takeScreenshot(`responsive-${viewport.name}`);
    }

    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 16. Test admin interface (if available)
    const adminButton = page.locator('button, a').filter({ hasText: /admin/i }).first();
    if (await adminButton.isVisible()) {
      await adminButton.click();
      await page.waitForTimeout(2000);
      await takeScreenshot('admin-interface');
    }

    console.log(`✅ Comprehensive user journey test complete! Captured ${screenshotCounter - 1} screenshots.`);

    // Verify key elements are present
    await expect(page.locator('h1')).toContainText('Communication Training Progress');
  });

  test('should test error handling and edge cases', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    let screenshotCounter = 1;
    
    const takeScreenshot = async (description) => {
      const filename = `edge-case-${String(screenshotCounter).padStart(3, '0')}-${description}.png`;
      await page.screenshot({ 
        path: `screenshots/${filename}`,
        fullPage: true 
      });
      screenshotCounter++;
    };

    // Test invalid login
    await takeScreenshot('invalid-login-test');
    const userIdInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await userIdInput.fill('invalid_user');
    await passwordInput.fill('wrong_password');
    await passwordInput.press('Enter');
    await page.waitForTimeout(2000);
    await takeScreenshot('invalid-login-result');

    // Test audio failure scenarios
    await page.addInitScript(() => {
      // Mock audio failure
      const originalAudio = window.Audio;
      window.Audio = function() {
        const audio = new originalAudio();
        audio.play = () => Promise.reject(new Error('Audio playback failed'));
        return audio;
      };
    });

    // Try to access application with valid login
    await userIdInput.clear();
    await passwordInput.clear();
    await userIdInput.fill('test_pretesta');
    await passwordInput.fill('test1234');
    await passwordInput.press('Enter');
    await page.waitForTimeout(3000);

    // Test practice audio with mocked failure
    const practiceAudioBtn = page.locator('button').filter({ hasText: /play sample audio/i }).first();
    if (await practiceAudioBtn.isVisible()) {
      await practiceAudioBtn.click();
      await page.waitForTimeout(3000);
      await takeScreenshot('audio-error-handling');
    }

    console.log(`✅ Edge case testing complete! Captured ${screenshotCounter - 1} additional screenshots.`);
  });

  test.afterEach(async ({ page }) => {
    // Clean up any stored data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });
});