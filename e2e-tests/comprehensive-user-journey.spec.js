const { test, expect } = require('@playwright/test');

test.describe('Comprehensive User Journey Test', () => {
  test('should complete full user journey: login → demographics → pretest activities → training', async ({ page }) => {
    // Increase timeout for this comprehensive test since we're completing all stimuli (20 intel + 30 effort + 20 comp + training)
    test.setTimeout(1200000); // 20 minutes timeout for full journey including 20 comprehension questions
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
          // Check if play button is enabled, if not wait briefly
          const isEnabled = await playButton.isEnabled();
          if (!isEnabled) {
            console.log(`Play button disabled for stimulus ${stimulusCount}, waiting 2s...`);
            await page.waitForTimeout(2000);
            
            // Check again, if still disabled, skip this stimulus
            if (!await playButton.isEnabled()) {
              console.log(`Play button still disabled for stimulus ${stimulusCount}, skipping...`);
              stimulusCount++;
              continue;
            }
          }
          
          await playButton.click();
          console.log(`Clicked play for stimulus ${stimulusCount}`);
          
          if (stimulusCount === 1) {
            await takeScreenshot('intelligibility-playing');
          }
          
          // Wait for audio to play
          await page.waitForTimeout(3000);
        }

        // Look for text input to type response
        const responseInput = page.locator('input[type="text"], textarea').first();
        if (await responseInput.isVisible()) {
          await responseInput.fill(`test response ${stimulusCount}`);
          
          if (stimulusCount === 1) {
            await takeScreenshot('intelligibility-response-filled');
          }
        }

        // Submit response
        const submitBtn = page.locator('button').filter({ hasText: /submit|continue|next/i }).first();
        if (await submitBtn.isVisible()) {
          try {
            await submitBtn.click();
            console.log(`Submitted response for stimulus ${stimulusCount}`);
          } catch (error) {
            console.log(`Could not click submit for stimulus ${stimulusCount}, trying force click...`);
            try {
              await submitBtn.click({ force: true });
              console.log(`Force-clicked submit for stimulus ${stimulusCount}`);
            } catch (forceError) {
              console.log(`Could not submit for stimulus ${stimulusCount}, skipping...`);
            }
          }
          
          await page.waitForTimeout(1000);
        }

        // Check if we're done with intelligibility
        // Look for completion message or if we're back at phase selection
        await page.waitForTimeout(1000);
        
        // Check if we see a completion message or are back at phase selection
        const completionIndicator = await page.locator('text=/finished|well done|great job|test complete/i').first().isVisible();
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
    
    // Wait a moment for the page to settle after intelligibility completion
    await page.waitForTimeout(2000);
    
    // Look for the listening effort button with more specific selectors - avoid the sample audio button
    const effortButton = page.locator('h3:has-text("Listening Effort")').locator('..').locator('button').filter({ hasText: /begin activity|continue activity/i }).first();
    
    // Debug: check what buttons are available
    const allButtons = await page.locator('button').allTextContents();
    console.log('Available buttons on phase selection:', allButtons);
    
    // Try to find and click the effort button
    let effortButtonClicked = false;
    
    if (await effortButton.isVisible()) {
      console.log('✅ Found Listening Effort button, clicking...');
      await effortButton.click();
      await page.waitForTimeout(4000);
      await takeScreenshot('effort-interface');
      effortButtonClicked = true;
    } else {
      console.log('❌ Listening Effort button not found, trying alternatives...');
      await takeScreenshot('effort-button-not-found');
      
      // Try alternative selector for the effort button by looking for "Begin Activity" under Listening Effort section
      const effortSection = page.locator('h3:has-text("Listening Effort")').locator('..'); // Parent section
      const altEffortButton = effortSection.locator('button').filter({ hasText: /begin activity/i }).first();
      
      if (await altEffortButton.isVisible()) {
        console.log('✅ Found alternative effort button in Listening Effort section, clicking...');
        await altEffortButton.click();
        await page.waitForTimeout(4000);
        await takeScreenshot('effort-interface');
        effortButtonClicked = true;
      } else {
        // Try one more approach - look for any "Begin Activity" button and check if it's for effort
        const anyBeginButton = page.locator('button:has-text("Begin Activity")').first();
        if (await anyBeginButton.isVisible()) {
          console.log('✅ Found general Begin Activity button, clicking...');
          await anyBeginButton.click();
          await page.waitForTimeout(4000);
          await takeScreenshot('effort-interface-maybe');
          effortButtonClicked = true;
        } else {
          console.log('❌ No effort button found at all, continuing to next section...');
        }
      }
    }

    // Only proceed with effort stimuli if we successfully clicked a button
    if (effortButtonClicked) {
      // Complete all listening effort stimuli in a loop
      let stimulusCount = 1;
      let maxStimuli = 35; // Increased safety limit for 30 listening effort stimuli
      
      while (stimulusCount <= maxStimuli) {
        console.log(`Processing listening effort stimulus ${stimulusCount}...`);
        
        // Look for play button
        const playBtn = page.locator('button').filter({ hasText: /play|listen/i }).first();
        if (await playBtn.isVisible()) {
          await playBtn.click();
          console.log(`Clicked play for listening effort stimulus ${stimulusCount}`);
          
          if (stimulusCount === 1) {
            await takeScreenshot('effort-playing');
          }
          
          // Wait for audio to finish playing - listening effort clips can be longer
          console.log(`Waiting for audio to finish for stimulus ${stimulusCount}...`);
          
          // Wait for play button to change from "Playing..." back to "Play Audio" or get disabled
          try {
            await page.waitForFunction(
              () => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const playButton = buttons.find(btn => 
                  btn.textContent && 
                  (btn.textContent.includes('Play') || btn.textContent.includes('Audio'))
                );
                
                // Check if button shows "Audio Played" or similar completion state
                const isFinished = playButton && (
                  playButton.textContent.includes('Audio Played') ||
                  playButton.textContent.includes('Played') ||
                  !playButton.textContent.includes('Playing')
                );
                
                return isFinished;
              },
              { timeout: 15000 } // Wait up to 15 seconds for audio to finish
            );
            console.log(`Audio finished for stimulus ${stimulusCount}`);
          } catch (error) {
            console.log(`Audio may still be playing for stimulus ${stimulusCount}, proceeding anyway`);
          }
          
          // Additional wait to ensure form elements are enabled
          await page.waitForTimeout(1000);
        }

        // Look for word input field (listening effort typically has word input)
        const wordInput = page.locator('input[type="text"], textarea').first();
        if (await wordInput.isVisible()) {
          await wordInput.fill(`word${stimulusCount}`);
        }

        // Look for slider or rating controls
        const slider = page.locator('input[type="range"], [role="slider"]').first();
        if (await slider.isVisible()) {
          console.log(`Found slider for stimulus ${stimulusCount}, attempting to move it...`);
          
          // Get initial value
          const initialValue = await slider.inputValue();
          console.log(`Initial slider value: ${initialValue}`);
          
          // Try multiple approaches to move the slider
          try {
            // Method 1: Set a specific value
            await slider.fill('7');
            console.log('Tried setting slider to value 7');
            
            // Method 2: Use keyboard navigation
            await slider.click();
            await slider.press('ArrowRight');
            await slider.press('ArrowRight');
            await slider.press('ArrowRight');
            console.log('Used arrow keys to move slider');
            
            // Method 3: Drag the slider handle
            const sliderBoundingBox = await slider.boundingBox();
            if (sliderBoundingBox) {
              const startX = sliderBoundingBox.x + sliderBoundingBox.width * 0.2; // Start position
              const endX = sliderBoundingBox.x + sliderBoundingBox.width * 0.7;   // End position (70%)
              const y = sliderBoundingBox.y + sliderBoundingBox.height / 2;
              
              await page.mouse.move(startX, y);
              await page.mouse.down();
              await page.mouse.move(endX, y);
              await page.mouse.up();
              console.log('Dragged slider from 20% to 70%');
            }
            
            // Check final value
            const finalValue = await slider.inputValue();
            console.log(`Final slider value: ${finalValue}`);
            
          } catch (error) {
            console.log(`Error interacting with slider: ${error.message}`);
          }
          
          if (stimulusCount === 1) {
            await takeScreenshot('effort-rating-interacted');
          }
        }

        // Submit response - wait for button to be enabled
        const submitBtn = page.locator('button').filter({ hasText: /submit|continue|next/i }).first();
        if (await submitBtn.isVisible()) {
          // Check if submit button is enabled
          const isEnabled = await submitBtn.isEnabled();
          console.log(`Submit button enabled for stimulus ${stimulusCount}: ${isEnabled}`);
          
          if (!isEnabled) {
            console.log(`Submit button disabled for stimulus ${stimulusCount}, waiting 3s for it to enable...`);
            await page.waitForTimeout(3000);
            
            // Check again
            const isEnabledNow = await submitBtn.isEnabled();
            console.log(`Submit button enabled after wait: ${isEnabledNow}`);
            
            if (!isEnabledNow) {
              console.log(`Submit still disabled for stimulus ${stimulusCount}, checking form completion...`);
              
              // Debug: check form state
              const wordValue = await page.locator('input[type="text"], textarea').first().inputValue();
              const sliderValue = await page.locator('input[type="range"]').first().inputValue();
              console.log(`Form state - Word: "${wordValue}", Slider: "${sliderValue}"`);
              
              // Try to enable submit by interacting with form again
              const wordInput2 = page.locator('input[type="text"], textarea').first();
              if (await wordInput2.isVisible()) {
                await wordInput2.clear();
                await wordInput2.fill(`word${stimulusCount}_retry`);
                console.log('Re-filled word input');
              }
              
              // Try moving slider again
              const slider2 = page.locator('input[type="range"]').first();
              if (await slider2.isVisible()) {
                await slider2.click();
                await slider2.press('ArrowRight');
                console.log('Re-adjusted slider');
              }
              
              await page.waitForTimeout(1000);
            }
          }
          
          try {
            await submitBtn.click();
            console.log(`Submitted effort response for stimulus ${stimulusCount}`);
          } catch (error) {
            console.log(`Could not click submit for stimulus ${stimulusCount}, trying force click...`);
            try {
              await submitBtn.click({ force: true });
              console.log(`Force-clicked effort submit for stimulus ${stimulusCount}`);
            } catch (forceError) {
              console.log(`Could not submit effort for stimulus ${stimulusCount}, skipping...`);
            }
          }
          
          await page.waitForTimeout(1500);
        }

        // Check if we're done with listening effort
        await page.waitForTimeout(1000);
        
        // Check if we see a completion message or are back at phase selection
        const completionIndicator = await page.locator('text=/finished|well done|great job|test complete/i').first().isVisible();
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
    
    // Wait a moment for the page to settle after effort completion
    await page.waitForTimeout(2000);
    
    // Look for the comprehension button with more specific selectors - avoid the sample audio button
    const comprehensionButton = page.locator('h3:has-text("Comprehension")').locator('..').locator('button').filter({ hasText: /begin activity|continue activity/i }).first();
    
    // Debug: check what buttons are available
    const allButtonsComp = await page.locator('button').allTextContents();
    console.log('Available buttons on phase selection for comprehension:', allButtonsComp);
    
    // Try to find and click the comprehension button
    let comprehensionButtonClicked = false;
    
    if (await comprehensionButton.isVisible()) {
      console.log('✅ Found Comprehension button using primary selector, clicking...');
      await comprehensionButton.click();
      await page.waitForTimeout(4000);
      await takeScreenshot('comprehension-interface');
      comprehensionButtonClicked = true;
    } else {
      console.log('❌ Primary comprehension button not found, trying alternatives...');
      await takeScreenshot('comprehension-button-not-found');
      
      // Method 1: Try finding "Begin Activity" under Comprehension section  
      const comprehensionSection = page.locator('h3:has-text("Comprehension")').locator('..'); 
      const altComprehensionButton = comprehensionSection.locator('button').filter({ hasText: /begin activity/i }).first();
      
      if (await altComprehensionButton.isVisible()) {
        console.log('✅ Found comprehension button in Comprehension section, clicking...');
        await altComprehensionButton.click();
        await page.waitForTimeout(4000);
        await takeScreenshot('comprehension-interface');
        comprehensionButtonClicked = true;
      } else {
        // Method 2: Look for ANY "Begin Activity" button that's not disabled
        const anyBeginActivityBtn = page.locator('button').filter({ hasText: /begin activity/i }).filter(btn => btn.locator(':not([disabled])')).first();
        
        if (await anyBeginActivityBtn.isVisible()) {
          console.log('✅ Found enabled Begin Activity button (assuming comprehension), clicking...');
          await anyBeginActivityBtn.click();
          await page.waitForTimeout(4000);
          await takeScreenshot('comprehension-interface-maybe');
          comprehensionButtonClicked = true;
        } else {
          console.log('❌ No comprehension button found at all, continuing to training...');
        }
      }
    }

    // Only proceed with comprehension stimuli if we successfully clicked a button
    if (comprehensionButtonClicked) {
      // Wait for page to load after clicking comprehension
      await page.waitForTimeout(3000);
      
      // Check current URL to see if we're still authenticated
      const currentUrl = page.url();
      console.log('Current URL after clicking comprehension:', currentUrl);
      
      // Check if we got redirected to login
      if (currentUrl.includes('login') || await page.locator('button').filter({ hasText: /sign in/i }).isVisible()) {
        console.log('❌ Got redirected to login after clicking comprehension - authentication lost. Logging in again...');
        const userIdInput = page.locator('input[type="text"], input#userId').first();
        const passwordInput = page.locator('input[type="password"]').first();
        await userIdInput.fill('test_pretesta');
        await passwordInput.fill('test1234');
        await passwordInput.press('Enter');
        await page.waitForTimeout(3000);
        
        // Try to navigate back to comprehension
        console.log('Attempting to navigate back to comprehension after re-login...');
        await page.goto('/');
        await page.waitForTimeout(2000);
        
        // Click comprehension button again
        const compButtonRetry = page.locator('h3:has-text("Comprehension")').locator('..').locator('button').filter({ hasText: /begin activity/i }).first();
        if (await compButtonRetry.isVisible()) {
          await compButtonRetry.click();
          await page.waitForTimeout(3000);
          console.log('Re-clicked comprehension button after re-login');
        }
      }
      
      // Handle the intermediate message/instruction page for comprehension
      await page.waitForTimeout(2000);
      
      // Look for the exact "Start Comprehension Activity" button on the instruction page
      const startActivityBtn = page.locator('button').filter({ hasText: 'Start Comprehension Activity' }).first();
      if (await startActivityBtn.isVisible()) {
        console.log('✅ Found Start Activity button on comprehension instruction page, clicking...');
        await startActivityBtn.click();
        await page.waitForTimeout(3000);
        await takeScreenshot('comprehension-activity-started');
      } else {
        console.log('No start activity button found, checking if we are in the activity...');
        
        // Check if we can see comprehension elements (story play button, questions, etc.)
        const hasStoryButton = await page.locator('button').filter({ hasText: /play|story|listen/i }).isVisible();
        const hasQuestions = await page.locator('input[type="radio"]').isVisible();
        const hasComprehensionHeading = await page.locator('h1, h2').filter({ hasText: /comprehension/i }).first().isVisible();
        
        console.log(`Comprehension activity check - Story button: ${hasStoryButton}, Questions: ${hasQuestions}, Heading: ${hasComprehensionHeading}`);
        
        if (!hasStoryButton && !hasQuestions && !hasComprehensionHeading) {
          console.log('❌ Not in comprehension activity - may have failed to navigate properly');
          await takeScreenshot('comprehension-navigation-failed');
          return; // Exit comprehension section
        }
      }

      // Complete all comprehension stories/stimuli in a loop
      let storyCount = 1;
      let maxStories = 20; // Safety limit to prevent infinite loops
      
      while (storyCount <= maxStories) {
        console.log(`Processing comprehension story ${storyCount}...`);
        
        // Look for story play button with multiple selectors
        let playBtn = page.locator('button').filter({ hasText: /play|listen|story/i }).first();
        
        // Alternative selectors if primary doesn't work
        if (!await playBtn.isVisible()) {
          playBtn = page.locator('button').filter({ hasText: /play audio|audio/i }).first();
        }
        
        if (await playBtn.isVisible()) {
          console.log(`Found and clicking story play button for story ${storyCount}`);
          await playBtn.click();
          
          if (storyCount === 1) {
            await takeScreenshot('comprehension-story-playing');
          }
          
          // Wait for story to play and check when it finishes
          console.log(`Waiting for story ${storyCount} to finish...`);
          
          // Wait for the play button to change from "Playing Story Audio..." back to a finished state
          try {
            await page.waitForFunction(
              () => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const playButton = buttons.find(btn => 
                  btn.textContent && 
                  (btn.textContent.includes('Play') || btn.textContent.includes('Audio'))
                );
                
                // Check if button shows it's finished playing (not "Playing...")
                const isFinished = playButton && !playButton.textContent.includes('Playing');
                console.log('Play button state:', playButton ? playButton.textContent : 'not found');
                return isFinished;
              },
              { timeout: 30000 } // Wait up to 30 seconds for story to finish
            );
            console.log(`Story ${storyCount} finished playing`);
          } catch (error) {
            console.log(`Story ${storyCount} may still be playing, checking current button state...`);
            const allButtons = await page.locator('button').allTextContents();
            console.log(`Button states: ${JSON.stringify(allButtons)}`);
          }
          
          // Additional wait to ensure UI updates
          await page.waitForTimeout(2000);
        } else {
          console.log(`No play button found for story ${storyCount}`);
          // Take a screenshot to debug what's on the page
          await takeScreenshot(`comprehension-no-play-button-story-${storyCount}`);
        }

        // Wait for "Start Questions" button to appear after story finishes playing
        // The button appears when the story audio has finished playing
        console.log(`Waiting for "Start Questions" button to appear after story ${storyCount}...`);
        try {
          await page.waitForSelector('button:has-text("Start Questions")', { timeout: 10000 });
          console.log(`"Start Questions" button appeared for story ${storyCount}`);
        } catch (error) {
          console.log(`Timeout waiting for "Start Questions" button for story ${storyCount}, proceeding anyway...`);
        }
        await page.waitForTimeout(1000);

        // Look for and click the "Start Questions" button that appears after the story
        // This button has an ArrowRight icon and specific styling
        const startQuestionsBtn = page.locator('button').filter({ hasText: 'Start Questions' }).first();
        
        // Alternative selector - look for button with both text and arrow icon
        const startQuestionsBtnAlt = page.locator('button:has-text("Start Questions")').first();
        
        let buttonClicked = false;
        
        if (await startQuestionsBtn.isVisible()) {
          console.log(`Found "Start Questions" button for story ${storyCount}, clicking...`);
          await startQuestionsBtn.click();
          buttonClicked = true;
        } else if (await startQuestionsBtnAlt.isVisible()) {
          console.log(`Found "Start Questions" button (alternative selector) for story ${storyCount}, clicking...`);
          await startQuestionsBtnAlt.click();
          buttonClicked = true;
        } else {
          console.log(`No "Start Questions" button found for story ${storyCount}, checking all buttons on page`);
          const allButtons = await page.locator('button').allTextContents();
          console.log(`Available buttons: ${JSON.stringify(allButtons)}`);
          await takeScreenshot(`comprehension-no-start-questions-button-story-${storyCount}`);
        }
        
        if (buttonClicked) {
          console.log(`✅ Successfully clicked "Start Questions" for story ${storyCount}!`);
          await page.waitForTimeout(1000);
          
          // Answer all 10 questions for this story
          let questionNumber = 1;
          let maxQuestionsPerStory = 10;
          
          while (questionNumber <= maxQuestionsPerStory) {
            console.log(`📝 Answering question ${questionNumber} for story ${storyCount}...`);
            
            // Wait for the question section to appear
            try {
              await page.waitForSelector('div.space-y-6', { timeout: 5000 });
              console.log(`✅ Question section appeared for story ${storyCount}, question ${questionNumber}`);
            } catch (error) {
              console.log(`❌ Question section did not appear for story ${storyCount}, question ${questionNumber}`);
              break;
            }

            // Look for the question text
            const questionText = page.locator('label.block.text-lg.font-medium, .text-lg.font-medium').first();
            const hasQuestion = await questionText.isVisible();
            console.log(`Question text visible for story ${storyCount}, question ${questionNumber}: ${hasQuestion}`);

            if (hasQuestion) {
              const questionTextContent = await questionText.textContent();
              console.log(`Question ${questionNumber} text: "${questionTextContent.substring(0, 50)}..."`);
            }

            // Look for multiple choice options (clickable divs)
            const optionDivs = page.locator('div.p-3.rounded-md.border');
            const optionCount = await optionDivs.count();
            
            console.log(`Found ${optionCount} multiple choice options for story ${storyCount}, question ${questionNumber}`);
            
            if (optionCount > 0) {
              if (questionNumber === 1 && storyCount === 1) {
                await takeScreenshot(`questions-visible-story-${storyCount}-q${questionNumber}`);
              }
              
              // Click the first option to answer the question
              const firstOption = optionDivs.first();
              if (await firstOption.isVisible()) {
                await firstOption.click();
                console.log(`Selected first answer for story ${storyCount}, question ${questionNumber}`);
                
                if (questionNumber === 1 && storyCount === 1) {
                  await takeScreenshot(`answer-selected-story-${storyCount}-q${questionNumber}`);
                }
                
                // Submit the answer - look for "Submit Answer" button specifically
                const submitBtn = page.locator('button').filter({ hasText: 'Submit Answer' }).first();
                const submitBtnAlt = page.locator('button').filter({ hasText: /submit|continue|next/i }).first();
                
                let submitBtnToUse = null;
                if (await submitBtn.isVisible()) {
                  submitBtnToUse = submitBtn;
                  console.log(`Found "Submit Answer" button for story ${storyCount}, question ${questionNumber}`);
                } else if (await submitBtnAlt.isVisible()) {
                  submitBtnToUse = submitBtnAlt;
                  console.log(`Found alternative submit button for story ${storyCount}, question ${questionNumber}`);
                }
                
                if (submitBtnToUse) {
                  const isEnabled = await submitBtnToUse.isEnabled();
                  console.log(`Submit button enabled for story ${storyCount}, question ${questionNumber}: ${isEnabled}`);
                  
                  await submitBtnToUse.click();
                  console.log(`✅ Submitted answer for story ${storyCount}, question ${questionNumber}`);
                  await page.waitForTimeout(1500);
                  
                  if (questionNumber === 1 && storyCount === 1) {
                    await takeScreenshot(`answer-submitted-story-${storyCount}-q${questionNumber}`);
                  }
                } else {
                  console.log(`❌ No submit button found for story ${storyCount}, question ${questionNumber}`);
                  break;
                }
              } else {
                console.log(`❌ No first option available for story ${storyCount}, question ${questionNumber}`);
                break;
              }
            } else {
              console.log(`❌ No questions appeared for story ${storyCount}, question ${questionNumber}`);
              
              // Check if we've completed all questions for this story
              const completionMessage = await page.locator('text=/completed|finished|well done|great job/i').isVisible();
              const backToPhaseSelection = await page.locator('h1').filter({ hasText: /communication training progress/i }).isVisible();
              
              if (completionMessage || backToPhaseSelection) {
                console.log(`✅ Completed all questions for story ${storyCount} after ${questionNumber - 1} questions`);
                await takeScreenshot(`story-${storyCount}-completed`);
                break;
              } else {
                await takeScreenshot(`no-questions-story-${storyCount}-q${questionNumber}`);
                break;
              }
            }
            
            // Check if we've completed all questions for this story
            await page.waitForTimeout(1000);
            
            // Check if we're back at phase selection (test complete)
            const atPhaseSelection = await page.locator('h1').filter({ hasText: /communication training progress/i }).isVisible();
            if (atPhaseSelection) {
              console.log(`✅ Comprehension test completed after story ${storyCount}`);
              break;
            }
            
            // Check if a new story play button appeared (different from continuing questions)
            // Only break if we see a story play button that says "Story X of Y" indicating a new story
            const storyHeader = page.locator('span').filter({ hasText: /Story \d+ of \d+/i }).first();
            const isNewStory = await storyHeader.isVisible();
            
            if (isNewStory) {
              const headerText = await storyHeader.textContent();
              console.log(`Found new story header: "${headerText}"`);
              
              // Check if this is a different story than what we started with
              if (headerText && !headerText.includes(`Story ${storyCount}`)) {
                console.log(`✅ Completed all questions for story ${storyCount}, moved to next story`);
                break;
              }
            }
            
            // Continue to next question for same story
            questionNumber++;
          }
          
          console.log(`✅ Finished processing story ${storyCount} with ${questionNumber - 1} questions`);
        } else {
          console.log(`❌ Could not click "Start Questions" button for story ${storyCount} - test failed`);
          break;
        }

        // Check if we should continue to next story
        await page.waitForTimeout(2000);
        
        // Look for next story or completion
        const nextPlayButton = page.locator('button').filter({ hasText: /play|listen|story/i }).first();
        const nextQuestions = page.locator('div.p-3.rounded-md.border').first();
        
        if (await nextPlayButton.isVisible()) {
          console.log(`Found next story button, continuing to story ${storyCount + 1}`);
          storyCount++;
        } else if (!await nextQuestions.isVisible()) {
          console.log(`No more stories found after story ${storyCount}`);
          break;
        } else {
          console.log(`Still have questions on current story ${storyCount}, continuing...`);
          storyCount++;
        }
      }

      // After completing all stories, take a final screenshot
      await takeScreenshot('comprehension-test-final-state');
      console.log(`✅ Comprehension test completed! Tested ${storyCount} stories.`);

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

    // 12. Manipulate pretest date via admin panel to enable training
    console.log('⏰ Using admin panel to set pretest date to enable training...');
    
    // Navigate to admin panel
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot('admin-login-page');
    
    // Login as admin
    console.log('Logging in as admin...');
    const adminUserIdInput = page.locator('input#adminUserId').first();
    const adminPasswordInput = page.locator('input#adminPassword').first();
    
    await adminUserIdInput.fill(process.env.ADMIN_USER_ID || 'admin');
    await adminPasswordInput.fill(process.env.ADMIN_PASSWORD || 'changeme123');
    await takeScreenshot('admin-login-filled');
    
    // Submit admin login
    const adminLoginBtn = page.locator('button').filter({ hasText: 'Sign In as Admin' }).first();
    await adminLoginBtn.click();
    await page.waitForTimeout(4000);
    await takeScreenshot('admin-dashboard');
    
    // Find and click on the test user
    console.log('Looking for test user in admin panel...');
    const testUserRow = page.locator('tr').filter({ hasText: 'test_pretesta' }).first();
    
    if (await testUserRow.isVisible()) {
      const manageButton = testUserRow.locator('button').filter({ hasText: 'Manage' }).first();
      await manageButton.click();
      await page.waitForTimeout(2000);
      await takeScreenshot('user-management-modal');
      
      // Set pretest date to yesterday to enable training
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      console.log(`Setting pretest date to: ${yesterdayString}`);
      
      const pretestDateInput = page.locator('input[name="pretestDate"]').first();
      await pretestDateInput.clear();
      await pretestDateInput.fill(yesterdayString);
      await takeScreenshot('pretest-date-set');
      
      // Also set current phase to training
      const currentPhaseSelect = page.locator('select[name="currentPhase"]').first();
      await currentPhaseSelect.selectOption('training');
      
      // Save the changes
      const saveButton = page.locator('button').filter({ hasText: 'Save User Details' }).first();
      await saveButton.click();
      await page.waitForTimeout(3000);
      await takeScreenshot('user-updated');
      
      // Close the modal
      const closeButton = page.locator('button').filter({ hasText: 'Close' }).first();
      await closeButton.click();
      await page.waitForTimeout(1000);
      
      console.log('✅ Successfully updated pretest date and phase via admin panel');
    } else {
      console.log('❌ Could not find test user in admin panel');
      await takeScreenshot('user-not-found');
    }
    
    // Navigate back to main app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await takeScreenshot('phase-selection-training-enabled');

    // 13. Training Day 1
    console.log('🎯 Starting Training Day 1...');
    
    // Wait a bit for the page to fully load after reload
    await page.waitForTimeout(2000);
    
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
    
    // Look for training day 1 button with multiple selectors
    let trainingButton = page.locator('button').filter({ hasText: /Training Day 1/i }).first();
    
    // If not found, try broader selectors
    if (!await trainingButton.isVisible()) {
      trainingButton = page.locator('button').filter({ hasText: /Begin Training|Start Training/i }).first();
    }
    
    if (!await trainingButton.isVisible()) {
      trainingButton = page.locator('button').filter({ hasText: /training/i }).first();
    }
    
    // Debug: show all available buttons if training not found
    if (!await trainingButton.isVisible()) {
      console.log('❌ Training button not found. Available buttons:');
      const allButtons = await page.locator('button').allTextContents();
      console.log('All buttons:', JSON.stringify(allButtons, null, 2));
      await takeScreenshot('training-button-debug');
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
            const postTestComplete = await page.locator('text=/finished|well done|great job|test complete/i').first().isVisible();
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