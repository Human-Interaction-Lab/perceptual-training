const { test, expect } = require('@playwright/test');
const ScreenshotHelper = require('./screenshot-helper');

test.describe('Complete Screenshot Journey - All Application Screens', () => {
  test('should capture every screen and state throughout the complete user journey', async ({ page }) => {
    const screenshots = new ScreenshotHelper(page, 'complete-journey');
    
    console.log('🚀 Starting complete screenshot journey test...');
    
    // Set up clean environment for consistent screenshots
    await screenshots.setupCleanEnvironment();

    // 1. Initial Navigation
    await page.goto('/');
    await screenshots.waitForStability();
    await screenshots.takeScreenshot('01-initial-load');

    // 2. Login Process
    console.log('🔐 Capturing login process...');
    await screenshots.takeScreenshot('02-login-page');
    
    // Login form interaction
    const userIdInput = page.locator('input[type="text"], input#userId').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await userIdInput.fill('test_pretesta');
    await screenshots.takeScreenshot('03-login-username-filled');
    
    await passwordInput.fill('test1234');
    await screenshots.takeScreenshot('04-login-password-filled');
    
    // Submit login
    await passwordInput.press('Enter');
    await page.waitForTimeout(4000);
    await screenshots.takeScreenshot('05-login-submitted');

    // 3. Initial Phase Selection
    console.log('📊 Capturing phase selection states...');
    await screenshots.takeScreenshot('06-phase-selection-initial');
    
    // Take responsive screenshots of the main interface
    await screenshots.takeResponsiveScreenshots('phase-selection-initial');

    // 4. Demographics Section
    console.log('📋 Capturing demographics workflow...');
    
    // Look for demographics button
    const demographicsButton = page.locator('button').filter({ hasText: /demographics|background/i }).first();
    if (await demographicsButton.isVisible()) {
      await screenshots.takeScreenshot('07-demographics-button-visible');
      
      await demographicsButton.click();
      await page.waitForTimeout(3000);
      await screenshots.takeScreenshot('08-demographics-form-loaded');
      
      // Capture demographics form details
      await screenshots.takeElementScreenshot('form', 'demographics-form-element');
      
      // Fill out form step by step
      const ageInput = page.locator('input[name="age"], input#age').first();
      if (await ageInput.isVisible()) {
        await ageInput.fill('25');
        await screenshots.takeScreenshot('09-demographics-age-filled');
      }

      const genderSelect = page.locator('select[name="gender"], select#gender').first();
      if (await genderSelect.isVisible()) {
        await genderSelect.selectOption('Male');
        await screenshots.takeScreenshot('10-demographics-gender-selected');
      }

      // Look for additional form fields
      const educationField = page.locator('select[name="education"], input[name="education"]').first();
      if (await educationField.isVisible()) {
        if (await educationField.evaluate(el => el.tagName.toLowerCase()) === 'select') {
          await educationField.selectOption({ index: 1 });
        } else {
          await educationField.fill('Bachelor\'s degree');
        }
        await screenshots.takeScreenshot('11-demographics-education-filled');
      }

      const languageField = page.locator('select[name="language"], input[name="language"]').first();
      if (await languageField.isVisible()) {
        if (await languageField.evaluate(el => el.tagName.toLowerCase()) === 'select') {
          await languageField.selectOption('English');
        } else {
          await languageField.fill('English');
        }
        await screenshots.takeScreenshot('12-demographics-language-filled');
      }

      // Submit demographics
      const submitButton = page.locator('button').filter({ hasText: /submit|continue|next/i }).first();
      if (await submitButton.isVisible()) {
        await screenshots.takeScreenshot('13-demographics-ready-to-submit');
        await submitButton.click();
        await page.waitForTimeout(3000);
        await screenshots.takeScreenshot('14-demographics-submitted');
      }
    }

    // 5. Return to Phase Selection After Demographics
    await page.goto('/');
    await page.waitForTimeout(3000);
    await screenshots.takeScreenshot('15-phase-selection-post-demographics');

    // 6. Intelligibility Test Complete Workflow
    console.log('🎧 Capturing intelligibility test workflow...');
    
    const intelligibilityButton = page.locator('button').filter({ hasText: /intelligibility|begin activity/i }).first();
    if (await intelligibilityButton.isVisible()) {
      await screenshots.takeScreenshot('16-intelligibility-button-available');
      
      await intelligibilityButton.click();
      await page.waitForTimeout(4000);
      await screenshots.takeScreenshot('17-intelligibility-interface-loaded');
      
      // Capture interface elements
      await screenshots.takeElementScreenshot('.test-interface, .audio-interface', 'intelligibility-interface-element');
      
      // Test instructions
      const instructions = page.locator('h1, h2, p').filter({ hasText: /instruction|type|listen/i });
      if (await instructions.first().isVisible()) {
        await screenshots.takeScreenshot('18-intelligibility-instructions');
      }

      // Audio controls
      const playButton = page.locator('button').filter({ hasText: /play|listen/i }).first();
      if (await playButton.isVisible()) {
        await screenshots.takeScreenshot('19-intelligibility-play-button');
        await playButton.click();
        await page.waitForTimeout(2000);
        await screenshots.takeScreenshot('20-intelligibility-audio-playing');
      }

      // Response input
      const responseInput = page.locator('input[type="text"], textarea').first();
      if (await responseInput.isVisible()) {
        await screenshots.takeScreenshot('21-intelligibility-response-field');
        await responseInput.fill('test response phrase');
        await screenshots.takeScreenshot('22-intelligibility-response-entered');
      }

      // Submit and continue
      const submitBtn = page.locator('button').filter({ hasText: /submit|continue|next/i }).first();
      if (await submitBtn.isVisible()) {
        await screenshots.takeScreenshot('23-intelligibility-ready-to-submit');
        await submitBtn.click();
        await page.waitForTimeout(2000);
        await screenshots.takeScreenshot('24-intelligibility-submitted');
      }

      // Navigation back
      const backButton = page.locator('button').filter({ hasText: /back|return|home|phase/i }).first();
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForTimeout(3000);
      } else {
        await page.goto('/');
        await page.waitForTimeout(3000);
      }
      await screenshots.takeScreenshot('25-back-to-phase-selection');
    }

    // 7. Listening Effort Test Complete Workflow
    console.log('📊 Capturing listening effort test workflow...');
    
    const effortButton = page.locator('button').filter({ hasText: /effort|begin activity/i }).first();
    if (await effortButton.isVisible()) {
      await screenshots.takeScreenshot('26-effort-button-available');
      
      await effortButton.click();
      await page.waitForTimeout(4000);
      await screenshots.takeScreenshot('27-effort-interface-loaded');
      
      // Capture effort-specific interface
      const effortInterface = page.locator('.effort-interface, .rating-interface');
      if (await effortInterface.first().isVisible()) {
        await screenshots.takeElementScreenshot('.effort-interface, .rating-interface', 'effort-interface-element');
      }

      // Audio playback
      const playBtn = page.locator('button').filter({ hasText: /play|listen/i }).first();
      if (await playBtn.isVisible()) {
        await screenshots.takeScreenshot('28-effort-play-button');
        await playBtn.click();
        await page.waitForTimeout(2000);
        await screenshots.takeScreenshot('29-effort-audio-playing');
      }

      // Word input (if applicable)
      const wordInput = page.locator('input[type="text"]').first();
      if (await wordInput.isVisible()) {
        await wordInput.fill('word');
        await screenshots.takeScreenshot('30-effort-word-entered');
      }

      // Rating slider
      const slider = page.locator('input[type="range"], [role="slider"]').first();
      if (await slider.isVisible()) {
        await screenshots.takeScreenshot('31-effort-slider-available');
        await slider.click();
        await screenshots.takeScreenshot('32-effort-slider-interacted');
      }

      // Submit effort test
      const submitBtn = page.locator('button').filter({ hasText: /submit|continue|next/i }).first();
      if (await submitBtn.isVisible()) {
        await screenshots.takeScreenshot('33-effort-ready-to-submit');
        await submitBtn.click();
        await page.waitForTimeout(2000);
        await screenshots.takeScreenshot('34-effort-submitted');
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
      await screenshots.takeScreenshot('35-back-after-effort');
    }

    // 8. Comprehension Test Complete Workflow
    console.log('📖 Capturing comprehension test workflow...');
    
    const comprehensionButton = page.locator('button').filter({ hasText: /comprehension|begin activity/i }).first();
    if (await comprehensionButton.isVisible()) {
      await screenshots.takeScreenshot('36-comprehension-button-available');
      
      await comprehensionButton.click();
      await page.waitForTimeout(4000);
      await screenshots.takeScreenshot('37-comprehension-interface-loaded');
      
      // Story introduction
      const storyTitle = page.locator('h1, h2, h3').filter({ hasText: /story|comprehension/i });
      if (await storyTitle.first().isVisible()) {
        await screenshots.takeScreenshot('38-comprehension-story-title');
      }

      // Story playback
      const playBtn = page.locator('button').filter({ hasText: /play|listen|story/i }).first();
      if (await playBtn.isVisible()) {
        await screenshots.takeScreenshot('39-comprehension-play-button');
        await playBtn.click();
        await page.waitForTimeout(3000);
        await screenshots.takeScreenshot('40-comprehension-story-playing');
      }

      // Questions section
      const questions = page.locator('input[type="radio"], .question');
      if (await questions.first().isVisible()) {
        await screenshots.takeScreenshot('41-comprehension-questions-visible');
        
        // Answer first question
        const firstRadio = page.locator('input[type="radio"]').first();
        if (await firstRadio.isVisible()) {
          await firstRadio.click();
          await screenshots.takeScreenshot('42-comprehension-first-answer-selected');
        }
      }

      // Submit comprehension
      const submitBtn = page.locator('button').filter({ hasText: /submit|continue|next/i }).first();
      if (await submitBtn.isVisible()) {
        await screenshots.takeScreenshot('43-comprehension-ready-to-submit');
        await submitBtn.click();
        await page.waitForTimeout(2000);
        await screenshots.takeScreenshot('44-comprehension-submitted');
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
      await screenshots.takeScreenshot('45-back-after-comprehension');
    }

    // 9. Phase Selection After All Pretests
    await screenshots.takeScreenshot('46-phase-selection-all-pretests-complete');

    // 10. Manipulate Date for Training Access
    console.log('⏰ Manipulating dates to enable training...');
    
    await page.evaluate(() => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      localStorage.setItem('pretestDate', yesterday.toISOString());
      sessionStorage.setItem('pretestDate', yesterday.toISOString());
      localStorage.setItem('canProceedToday', 'true');
      localStorage.setItem('currentPhase', 'training');
    });

    await page.reload();
    await page.waitForTimeout(3000);
    await screenshots.takeScreenshot('47-training-enabled-after-date-manipulation');

    // 11. Training Day 1 Complete Workflow
    console.log('🎯 Capturing training day 1 workflow...');
    
    const trainingButton = page.locator('button').filter({ hasText: /training|day 1|begin training/i }).first();
    if (await trainingButton.isVisible()) {
      await screenshots.takeScreenshot('48-training-day1-button-available');
      
      await trainingButton.click();
      await page.waitForTimeout(4000);
      await screenshots.takeScreenshot('49-training-day1-interface-loaded');
      
      // Training introduction
      const trainingIntro = page.locator('h1, h2, p').filter({ hasText: /training|day 1/i });
      if (await trainingIntro.first().isVisible()) {
        await screenshots.takeScreenshot('50-training-day1-introduction');
      }

      // Training content interaction
      const trainingPlayBtn = page.locator('button').filter({ hasText: /play|listen|continue|start/i }).first();
      if (await trainingPlayBtn.isVisible()) {
        await screenshots.takeScreenshot('51-training-day1-play-button');
        await trainingPlayBtn.click();
        await page.waitForTimeout(3000);
        await screenshots.takeScreenshot('52-training-day1-content-playing');
      }

      // Training progression
      const nextBtn = page.locator('button').filter({ hasText: /next|continue/i }).first();
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(2000);
        await screenshots.takeScreenshot('53-training-day1-progressed');
      }

      // Post-training intelligibility test
      const postTrainingTest = page.locator('h2, h3').filter({ hasText: /intelligibility|test/i }).first();
      if (await postTrainingTest.isVisible()) {
        await screenshots.takeScreenshot('54-training-day1-post-test-interface');
        
        const testPlayBtn = page.locator('button').filter({ hasText: /play/i }).first();
        if (await testPlayBtn.isVisible()) {
          await testPlayBtn.click();
          await page.waitForTimeout(2000);
          await screenshots.takeScreenshot('55-training-day1-post-test-playing');
        }

        const testInput = page.locator('input[type="text"]').first();
        if (await testInput.isVisible()) {
          await testInput.fill('training test response');
          await screenshots.takeScreenshot('56-training-day1-post-test-response');
        }

        const testSubmitBtn = page.locator('button').filter({ hasText: /submit|continue/i }).first();
        if (await testSubmitBtn.isVisible()) {
          await testSubmitBtn.click();
          await page.waitForTimeout(2000);
          await screenshots.takeScreenshot('57-training-day1-post-test-submitted');
        }
      }

      // Return to phase selection
      const backButton = page.locator('button').filter({ hasText: /back|return|home|phase/i }).first();
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForTimeout(3000);
      } else {
        await page.goto('/');
        await page.waitForTimeout(3000);
      }
      await screenshots.takeScreenshot('58-back-after-training-day1');
    }

    // 12. Final States and UI Components
    console.log('🎨 Capturing final states and UI components...');
    
    await screenshots.takeScreenshot('59-final-phase-selection-state');
    
    // Test responsive design at final state
    await screenshots.takeResponsiveScreenshots('final-state');

    // Capture all UI components
    await screenshots.screenshotAllComponents();

    // Test admin interface (if available)
    const adminButton = page.locator('button, a').filter({ hasText: /admin/i }).first();
    if (await adminButton.isVisible()) {
      await adminButton.click();
      await page.waitForTimeout(2000);
      await screenshots.takeScreenshot('60-admin-interface');
    }

    // Test practice audio interface
    const practiceAudioBtn = page.locator('button').filter({ hasText: /play sample audio/i }).first();
    if (await practiceAudioBtn.isVisible()) {
      await screenshots.takeScreenshot('61-practice-audio-available');
      await practiceAudioBtn.click();
      await page.waitForTimeout(3000);
      await screenshots.takeScreenshot('62-practice-audio-interaction');
    }

    // 13. Generate comprehensive report
    const report = screenshots.generateReport();
    
    console.log(`\n✅ Complete screenshot journey finished!`);
    console.log(`📊 Total screenshots captured: ${report.totalScreenshots}`);
    console.log(`📁 All screenshots saved in screenshots/ directory`);

    // Verify core functionality
    await expect(page.locator('h1')).toContainText('Communication Training Progress');
  });

  test('should capture error states and edge cases', async ({ page }) => {
    const screenshots = new ScreenshotHelper(page, 'error-states');
    await screenshots.setupCleanEnvironment();

    console.log('🔍 Capturing error states and edge cases...');

    // Invalid login attempt
    await page.goto('/');
    await screenshots.waitForStability();
    
    const userIdInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await userIdInput.fill('invalid_user');
    await passwordInput.fill('wrong_password');
    await screenshots.takeScreenshot('01-invalid-login-attempt');
    
    await passwordInput.press('Enter');
    await page.waitForTimeout(2000);
    await screenshots.takeScreenshot('02-invalid-login-result');

    // Test audio failure scenarios
    await page.addInitScript(() => {
      // Mock audio failure
      window.Audio = function() {
        return {
          play: () => Promise.reject(new Error('Audio playback failed')),
          addEventListener: () => {},
          removeEventListener: () => {},
          pause: () => {},
          load: () => {}
        };
      };
    });

    // Login with valid credentials
    await userIdInput.clear();
    await passwordInput.clear();
    await userIdInput.fill('test_pretesta');
    await passwordInput.fill('test1234');
    await passwordInput.press('Enter');
    await page.waitForTimeout(3000);

    // Test audio error handling
    const practiceAudioBtn = page.locator('button').filter({ hasText: /play sample audio/i }).first();
    if (await practiceAudioBtn.isVisible()) {
      await practiceAudioBtn.click();
      await page.waitForTimeout(3000);
      await screenshots.takeScreenshot('03-audio-error-state');
    }

    // Test network failure scenarios (mock)
    await page.route('**/api/**', route => route.abort());
    await page.reload();
    await page.waitForTimeout(2000);
    await screenshots.takeScreenshot('04-network-error-state');

    const errorReport = screenshots.generateReport();
    console.log(`✅ Error states captured: ${errorReport.totalScreenshots} screenshots`);
  });

  test.afterEach(async ({ page }) => {
    // Clean up
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });
});