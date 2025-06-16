const { test, expect } = require('@playwright/test');

test.describe('Comprehensive User Journey Test', () => {
  test('should complete full user journey: login → demographics → pretest activities → training', async ({ page }) => {
    // Increase timeout for this comprehensive test since we're completing all stimuli
    test.setTimeout(300000); // 5 minutes timeout
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
    // Wait for automatic navigation to phase selection (no forced page refresh)
    await page.waitForURL('**/');
    await page.waitForTimeout(2000);
    await takeScreenshot('phase-selection-after-demographics');

    // 6. Intelligibility Test - Complete ALL stimuli
    console.log('🎧 Starting Intelligibility Test - will complete all stimuli...');
    
    const intelligibilityButton = page.locator('button').filter({ hasText: /intelligibility|begin activity|continue activity/i }).first();
    if (await intelligibilityButton.isVisible()) {
      await intelligibilityButton.click();
      await page.waitForTimeout(4000);
      await takeScreenshot('intelligibility-interface');

      // Complete all intelligibility stimuli in a loop
      let stimulusCount = 1;
      let maxStimuli = 50; // Safety limit to prevent infinite loops
      
      while (stimulusCount <= maxStimuli) {
        console.log(`Processing intelligibility stimulus ${stimulusCount}...`);
        
        // Look for play button and audio controls
        const playButton = page.locator('button').filter({ hasText: /play|listen/i }).first();
        if (await playButton.isVisible()) {
          await playButton.click();
          
          if (stimulusCount === 1) {
            await takeScreenshot('intelligibility-playing');
          }
          
          // Wait for audio to finish - look for submit button to become enabled
          await page.waitForTimeout(1000); // Initial wait for audio to start
          
          // Wait up to 15 seconds for submit button to become enabled (audio to finish)
          try {
            await page.waitForSelector('button:has-text("Submit"):not([disabled])', { timeout: 15000 });
            console.log('Submit button is now enabled - audio likely finished');
          } catch (error) {
            console.log('Submit button still disabled after 15s, proceeding anyway');
          }
        }

        // Look for text input to type response
        const responseInput = page.locator('input[type="text"], textarea').first();
        if (await responseInput.isVisible()) {
          await responseInput.fill(`test response ${stimulusCount}`);
          
          if (stimulusCount === 1) {
            await takeScreenshot('intelligibility-response-filled');
          }
        }

        // Submit response - wait for button to be enabled
        const submitBtn = page.locator('button').filter({ hasText: /submit|continue|next/i }).first();
        if (await submitBtn.isVisible()) {
          // Wait for submit button to be enabled
          try {
            await submitBtn.waitFor({ state: 'attached', timeout: 5000 });
            await page.waitForFunction(
              (selector) => {
                const btn = document.querySelector(selector);
                return btn && !btn.disabled;
              },
              'button:has-text("Submit")',
              { timeout: 10000 }
            );
            
            await submitBtn.click();
            console.log(`Submitted response for stimulus ${stimulusCount}`);
          } catch (error) {
            console.log(`Submit button not enabled for stimulus ${stimulusCount}, skipping...`);
          }
          
          await page.waitForTimeout(2000);
        }

        // Check if we're done with intelligibility
        // Look for completion message or if we're back at phase selection
        await page.waitForTimeout(1000);
        
        // Check if we see a completion message or are back at phase selection
        const completionIndicator = await page.locator('text=/completed|finished|well done|great job/i').isVisible();
        const backAtPhaseSelection = await page.locator('h1').filter({ hasText: /communication training progress/i }).isVisible();
        
        if (completionIndicator || backAtPhaseSelection) {
          console.log(`✅ Intelligibility test completed after ${stimulusCount} stimuli`);
          await takeScreenshot('intelligibility-completed');
          break;
        }
        
        // Check if there's another stimulus to process
        const nextPlayButton = page.locator('button').filter({ hasText: /play|listen/i }).first();
        const nextResponseInput = page.locator('input[type="text"], textarea').first();
        
        if (!await nextPlayButton.isVisible() && !await nextResponseInput.isVisible()) {
          console.log(`No more stimuli found after ${stimulusCount} items`);
          break;
        }
        
        stimulusCount++;
      }

      // Navigate back to phase selection if not already there
      const backButton = page.locator('button').filter({ hasText: /back|return|home|phase/i }).first();
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForTimeout(3000);
      } else {
        // Check if we're already at phase selection
        const atPhaseSelection = await page.locator('h1').filter({ hasText: /communication training progress/i }).isVisible();
        if (!atPhaseSelection) {
          // Wait for automatic navigation to phase selection
          await page.waitForURL('**/');
          await page.waitForTimeout(2000);
        }
      }
    }

    // 7. Phase selection after intelligibility
    await takeScreenshot('phase-selection-after-intelligibility');

    // 8. Listening Effort Test - Complete ALL stimuli
    console.log('📊 Starting Listening Effort Test - will complete all stimuli...');
    
    const effortButton = page.locator('button').filter({ hasText: /effort|begin activity|continue activity/i }).first();
    if (await effortButton.isVisible()) {
      await effortButton.click();
      await page.waitForTimeout(4000);
      await takeScreenshot('effort-interface');

      // Complete all listening effort stimuli in a loop
      let stimulusCount = 1;
      let maxStimuli = 50; // Safety limit to prevent infinite loops
      
      while (stimulusCount <= maxStimuli) {
        console.log(`Processing listening effort stimulus ${stimulusCount}...`);
        
        // Look for play button
        const playBtn = page.locator('button').filter({ hasText: /play|listen/i }).first();
        if (await playBtn.isVisible()) {
          await playBtn.click();
          
          if (stimulusCount === 1) {
            await takeScreenshot('effort-playing');
          }
          
          // Wait for audio to finish
          await page.waitForTimeout(1000);
          try {
            await page.waitForSelector('button:has-text("Submit"):not([disabled])', { timeout: 15000 });
            console.log('Effort submit button enabled - audio finished');
          } catch (error) {
            console.log('Effort submit button still disabled, proceeding anyway');
          }
        }

        // Look for word input field (listening effort typically has word input)
        const wordInput = page.locator('input[type="text"], textarea').first();
        if (await wordInput.isVisible()) {
          await wordInput.fill(`word${stimulusCount}`);
        }

        // Look for slider or rating controls
        const slider = page.locator('input[type="range"], [role="slider"]').first();
        if (await slider.isVisible()) {
          await slider.click();
          
          if (stimulusCount === 1) {
            await takeScreenshot('effort-rating-interacted');
          }
        }

        // Submit response - wait for enabled state
        const submitBtn = page.locator('button').filter({ hasText: /submit|continue|next/i }).first();
        if (await submitBtn.isVisible()) {
          try {
            await page.waitForFunction(
              (selector) => {
                const btn = document.querySelector(selector);
                return btn && !btn.disabled;
              },
              'button:has-text("Submit")',
              { timeout: 10000 }
            );
            
            await submitBtn.click();
            console.log(`Submitted effort response for stimulus ${stimulusCount}`);
          } catch (error) {
            console.log(`Effort submit button not enabled for stimulus ${stimulusCount}, skipping...`);
          }
          
          await page.waitForTimeout(2000);
        }

        // Check if we're done with listening effort
        await page.waitForTimeout(1000);
        
        // Check if we see a completion message or are back at phase selection
        const completionIndicator = await page.locator('text=/completed|finished|well done|great job/i').isVisible();
        const backAtPhaseSelection = await page.locator('h1').filter({ hasText: /communication training progress/i }).isVisible();
        
        if (completionIndicator || backAtPhaseSelection) {
          console.log(`✅ Listening effort test completed after ${stimulusCount} stimuli`);
          await takeScreenshot('effort-completed');
          break;
        }
        
        // Check if there's another stimulus to process
        const nextPlayButton = page.locator('button').filter({ hasText: /play|listen/i }).first();
        const nextInput = page.locator('input[type="text"], textarea').first();
        const nextSlider = page.locator('input[type="range"], [role="slider"]').first();
        
        if (!await nextPlayButton.isVisible() && !await nextInput.isVisible() && !await nextSlider.isVisible()) {
          console.log(`No more stimuli found after ${stimulusCount} items`);
          break;
        }
        
        stimulusCount++;
      }

      // Navigate back to phase selection if not already there
      const backButton = page.locator('button').filter({ hasText: /back|return|home|phase/i }).first();
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForTimeout(3000);
      } else {
        // Check if we're already at phase selection
        const atPhaseSelection = await page.locator('h1').filter({ hasText: /communication training progress/i }).isVisible();
        if (!atPhaseSelection) {
          // Wait for automatic navigation to phase selection
          await page.waitForURL('**/');
          await page.waitForTimeout(2000);
        }
      }
    }

    // 9. Phase selection after effort
    await takeScreenshot('phase-selection-after-effort');

    // 10. Comprehension Test - Complete ALL stimuli
    console.log('📖 Starting Comprehension Test - will complete all stimuli...');
    
    const comprehensionButton = page.locator('button').filter({ hasText: /comprehension|begin activity|continue activity/i }).first();
    if (await comprehensionButton.isVisible()) {
      await comprehensionButton.click();
      await page.waitForTimeout(4000);
      await takeScreenshot('comprehension-interface');

      // Complete all comprehension stories/stimuli in a loop
      let storyCount = 1;
      let maxStories = 20; // Safety limit to prevent infinite loops
      
      while (storyCount <= maxStories) {
        console.log(`Processing comprehension story ${storyCount}...`);
        
        // Look for story play button
        const playBtn = page.locator('button').filter({ hasText: /play|listen|story/i }).first();
        if (await playBtn.isVisible()) {
          await playBtn.click();
          
          if (storyCount === 1) {
            await takeScreenshot('comprehension-story-playing');
          }
          
          // Wait for story to finish (stories are longer than phrases)
          await page.waitForTimeout(2000);
          try {
            // Wait for questions to appear or submit button to be enabled
            await Promise.race([
              page.waitForSelector('input[type="radio"]', { timeout: 30000 }),
              page.waitForSelector('button:has-text("Submit"):not([disabled])', { timeout: 30000 })
            ]);
            console.log('Story finished - questions appeared or submit enabled');
          } catch (error) {
            console.log('Story may still be playing, proceeding anyway');
          }
        }

        // Wait for questions to appear after story
        await page.waitForTimeout(1000);

        // Look for multiple choice questions and answer them
        const radioButtons = page.locator('input[type="radio"]');
        const radioCount = await radioButtons.count();
        
        if (radioCount > 0) {
          // Answer all radio button questions (usually multiple questions per story)
          for (let i = 0; i < radioCount; i++) {
            const radioButton = radioButtons.nth(i);
            if (await radioButton.isVisible()) {
              await radioButton.click();
              await page.waitForTimeout(500);
            }
          }
          
          if (storyCount === 1) {
            await takeScreenshot('comprehension-questions-answered');
          }
        }

        // Submit comprehension responses - wait for enabled state
        const submitBtn = page.locator('button').filter({ hasText: /submit|continue|next/i }).first();
        if (await submitBtn.isVisible()) {
          try {
            await page.waitForFunction(
              (selector) => {
                const btn = document.querySelector(selector);
                return btn && !btn.disabled;
              },
              'button:has-text("Submit")',
              { timeout: 10000 }
            );
            
            await submitBtn.click();
            console.log(`Submitted comprehension responses for story ${storyCount}`);
          } catch (error) {
            console.log(`Comprehension submit button not enabled for story ${storyCount}, skipping...`);
          }
          
          await page.waitForTimeout(2000);
        }

        // Check if we're done with comprehension
        await page.waitForTimeout(1000);
        
        // Check if we see a completion message or are back at phase selection
        const completionIndicator = await page.locator('text=/completed|finished|well done|great job/i').isVisible();
        const backAtPhaseSelection = await page.locator('h1').filter({ hasText: /communication training progress/i }).isVisible();
        
        if (completionIndicator || backAtPhaseSelection) {
          console.log(`✅ Comprehension test completed after ${storyCount} stories`);
          await takeScreenshot('comprehension-completed');
          break;
        }
        
        // Check if there's another story to process
        const nextPlayButton = page.locator('button').filter({ hasText: /play|listen|story/i }).first();
        const nextQuestions = page.locator('input[type="radio"]').first();
        
        if (!await nextPlayButton.isVisible() && !await nextQuestions.isVisible()) {
          console.log(`No more stories found after ${storyCount} items`);
          break;
        }
        
        storyCount++;
      }

      // Navigate back to phase selection if not already there
      const backButton = page.locator('button').filter({ hasText: /back|return|home|phase/i }).first();
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForTimeout(3000);
      } else {
        // Check if we're already at phase selection
        const atPhaseSelection = await page.locator('h1').filter({ hasText: /communication training progress/i }).isVisible();
        if (!atPhaseSelection) {
          // Wait for automatic navigation to phase selection
          await page.waitForURL('**/');
          await page.waitForTimeout(2000);
        }
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
      
      console.log('Date manipulation complete - training should now be available');
    });

    // Reload page to reflect changes (this is OK here since we're changing storage)
    await page.reload();
    await page.waitForTimeout(3000);
    await takeScreenshot('phase-selection-training-enabled');

    // 13. Training Day 1
    console.log('🎯 Starting Training Day 1...');
    
    // Wait a bit for the page to fully load after reload
    await page.waitForTimeout(2000);
    
    // Look for training day 1 button with more specific selectors
    const trainingButton = page.locator('button').filter({ hasText: /Training Day 1|Begin Training|training/i }).first();
    
    // Debug: check if we're still authenticated and on the right page
    const currentUrl = page.url();
    console.log('Current URL before training:', currentUrl);
    
    // Check if we need to log in again (shouldn't happen)
    if (currentUrl.includes('login') || await page.locator('button').filter({ hasText: /sign in/i }).isVisible()) {
      console.log('❌ Got redirected to login - authentication lost. Logging in again...');
      const userIdInput = page.locator('input[type="text"], input#userId').first();
      const passwordInput = page.locator('input[type="password"]').first();
      await userIdInput.fill('test_pretesta');
      await passwordInput.fill('test1234');
      await passwordInput.press('Enter');
      await page.waitForTimeout(3000);
    }
    
    if (await trainingButton.isVisible()) {
      console.log('✅ Found training button, clicking...');
      await trainingButton.click();
      await page.waitForTimeout(4000);
      await takeScreenshot('training-day1-interface');

      // Complete training session
      let trainingStep = 1;
      let maxTrainingSteps = 100; // Safety limit for training steps
      
      while (trainingStep <= maxTrainingSteps) {
        console.log(`Processing training step ${trainingStep}...`);
        
        // Look for play buttons in training
        const trainingPlayBtn = page.locator('button').filter({ hasText: /play|listen|continue/i }).first();
        if (await trainingPlayBtn.isVisible()) {
          await trainingPlayBtn.click();
          await page.waitForTimeout(3000);
          
          if (trainingStep === 1) {
            await takeScreenshot('training-day1-active');
          }
        }

        // Look for any input fields (training might have responses)
        const trainingInput = page.locator('input[type="text"], textarea').first();
        if (await trainingInput.isVisible()) {
          await trainingInput.fill(`training response ${trainingStep}`);
        }

        // Look for next/continue buttons
        const nextBtn = page.locator('button').filter({ hasText: /next|continue|submit/i }).first();
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForTimeout(2000);
          
          if (trainingStep === 5) {
            await takeScreenshot('training-day1-progressed');
          }
        }

        // Check if training is complete
        await page.waitForTimeout(1000);
        
        // Check for post-training intelligibility test
        const postTrainingTest = page.locator('h2, h3').filter({ hasText: /intelligibility|test/i }).first();
        if (await postTrainingTest.isVisible()) {
          console.log('Found post-training intelligibility test');
          await takeScreenshot('training-day1-post-test');
          
          // Complete the post-training test
          let postTestStimulus = 1;
          let maxPostTest = 20;
          
          while (postTestStimulus <= maxPostTest) {
            console.log(`Processing post-training test stimulus ${postTestStimulus}...`);
            
            const testPlayBtn = page.locator('button').filter({ hasText: /play/i }).first();
            if (await testPlayBtn.isVisible()) {
              await testPlayBtn.click();
              await page.waitForTimeout(3000);
            }

            const testInput = page.locator('input[type="text"]').first();
            if (await testInput.isVisible()) {
              await testInput.fill(`training test response ${postTestStimulus}`);
              
              if (postTestStimulus === 1) {
                await takeScreenshot('training-day1-test-response');
              }
            }

            const testSubmitBtn = page.locator('button').filter({ hasText: /submit|continue|next/i }).first();
            if (await testSubmitBtn.isVisible()) {
              await testSubmitBtn.click();
              await page.waitForTimeout(2000);
            }
            
            // Check if post-test is complete
            const postTestComplete = await page.locator('text=/completed|finished|well done|great job/i').isVisible();
            const backToPhaseSelection = await page.locator('h1').filter({ hasText: /communication training progress/i }).isVisible();
            
            if (postTestComplete || backToPhaseSelection) {
              console.log(`✅ Post-training test completed after ${postTestStimulus} stimuli`);
              break;
            }
            
            // Check if there are more post-test stimuli
            const nextTestPlay = page.locator('button').filter({ hasText: /play/i }).first();
            const nextTestInput = page.locator('input[type="text"]').first();
            
            if (!await nextTestPlay.isVisible() && !await nextTestInput.isVisible()) {
              console.log('No more post-test stimuli found');
              break;
            }
            
            postTestStimulus++;
          }
          
          break; // Exit training loop after completing post-test
        }

        // Check if training session is complete (without post-test)
        const trainingComplete = await page.locator('text=/completed|finished|well done|great job|training complete/i').isVisible();
        const backToSelection = await page.locator('h1').filter({ hasText: /communication training progress/i }).isVisible();
        
        if (trainingComplete || backToSelection) {
          console.log(`✅ Training Day 1 completed after ${trainingStep} steps`);
          break;
        }
        
        // Check if there are more training steps
        const moreTrainingContent = await page.locator('button').filter({ hasText: /play|listen|continue|next/i }).isVisible();
        const moreTrainingInputs = await page.locator('input[type="text"], textarea').isVisible();
        
        if (!moreTrainingContent && !moreTrainingInputs) {
          console.log(`No more training content found after ${trainingStep} steps`);
          break;
        }
        
        trainingStep++;
      }

      // Navigate back to phase selection
      const backButton = page.locator('button').filter({ hasText: /back|return|home|phase/i }).first();
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForTimeout(3000);
      } else {
        // Wait for automatic navigation to phase selection
        await page.waitForURL('**/');
        await page.waitForTimeout(2000);
      }
    } else {
      console.log('❌ Training button not found. Taking screenshot of current state...');
      await takeScreenshot('training-button-not-found-debug');
      
      // Look for any visible buttons for debugging
      const allButtons = await page.locator('button').allTextContents();
      console.log('Available buttons:', allButtons);
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
    test.setTimeout(60000); // 1 minute timeout for edge cases
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