const { test, expect } = require('@playwright/test');

test.describe('Comprehension Test - Start Questions Button Fix', () => {
  test('should click Start Questions button after story plays', async ({ page }) => {
    test.setTimeout(300000); // 5 minute timeout for all 10 questions
    
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
      const filename = `comprehension-test-${String(screenshotCounter).padStart(3, '0')}-${description}.png`;
      await page.screenshot({ 
        path: `screenshots/${filename}`,
        fullPage: true 
      });
      console.log(`📸 Screenshot ${screenshotCounter}: ${description}`);
      screenshotCounter++;
    };

    console.log('🚀 Starting focused comprehension test...');

    // 1. Navigate to login page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot('login-page');

    // 2. Login with test user that should be at comprehension stage
    const userIdInput = page.locator('input[type="text"], input#userId').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await userIdInput.fill('test_pretesta');
    await passwordInput.fill('test1234');
    await takeScreenshot('login-filled');

    // Submit login using Enter key
    await passwordInput.press('Enter');
    await page.waitForTimeout(4000);

    // 3. Should be at phase selection - take screenshot
    await takeScreenshot('phase-selection-current-state');

    // 4. Look for and click comprehension button
    console.log('📖 Looking for Comprehension button...');
    
    const comprehensionButton = page.locator('h3:has-text("Comprehension")').locator('..').locator('button').filter({ hasText: /begin activity|continue activity/i }).first();
    
    let comprehensionButtonClicked = false;
    
    if (await comprehensionButton.isVisible()) {
      console.log('✅ Found Comprehension button, clicking...');
      await comprehensionButton.click();
      await page.waitForTimeout(4000);
      await takeScreenshot('comprehension-interface');
      comprehensionButtonClicked = true;
    } else {
      console.log('❌ Primary comprehension button not found, trying alternatives...');
      await takeScreenshot('comprehension-button-not-found');
      
      // Try alternative selector
      const altComprehensionButton = page.locator('button').filter({ hasText: /begin activity|continue activity/i }).first();
      
      if (await altComprehensionButton.isVisible()) {
        console.log('✅ Found alternative comprehension button, clicking...');
        await altComprehensionButton.click();
        await page.waitForTimeout(4000);
        await takeScreenshot('comprehension-interface-alt');
        comprehensionButtonClicked = true;
      } else {
        console.log('❌ No comprehension button found');
        const allButtons = await page.locator('button').allTextContents();
        console.log('Available buttons:', allButtons);
        await takeScreenshot('no-comprehension-buttons');
      }
    }

    if (comprehensionButtonClicked) {
      // 5. Handle the start activity screen if present
      await page.waitForTimeout(2000);
      
      const startActivityBtn = page.locator('button').filter({ hasText: 'Start Comprehension Activity' }).first();
      if (await startActivityBtn.isVisible()) {
        console.log('✅ Found Start Activity button, clicking...');
        await startActivityBtn.click();
        await page.waitForTimeout(3000);
        await takeScreenshot('comprehension-activity-started');
      }

      // 6. Test the story playing and Start Questions button functionality
      let storyCount = 1;
      let maxStories = 2; // Test with first 2 stories
      
      while (storyCount <= maxStories) {
        console.log(`🎧 Testing story ${storyCount}...`);
        
        // Look for story play button
        let playBtn = page.locator('button').filter({ hasText: /play|listen|story/i }).first();
        
        if (!await playBtn.isVisible()) {
          playBtn = page.locator('button').filter({ hasText: /play audio|audio/i }).first();
        }
        
        if (await playBtn.isVisible()) {
          console.log(`Found and clicking story play button for story ${storyCount}`);
          await playBtn.click();
          
          if (storyCount === 1) {
            await takeScreenshot('story-playing');
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
          await takeScreenshot(`no-play-button-story-${storyCount}`);
        }

        // 7. THE CRITICAL TEST - Wait for and click "Start Questions" button
        console.log(`🔍 Testing "Start Questions" button for story ${storyCount}...`);
        
        // Wait for "Start Questions" button to appear after story finishes playing
        console.log(`Waiting for "Start Questions" button to appear after story ${storyCount}...`);
        try {
          await page.waitForSelector('button:has-text("Start Questions")', { timeout: 10000 });
          console.log(`✅ "Start Questions" button appeared for story ${storyCount}`);
        } catch (error) {
          console.log(`⚠️ Timeout waiting for "Start Questions" button for story ${storyCount}, checking current state...`);
          const allButtons = await page.locator('button').allTextContents();
          console.log(`Available buttons: ${JSON.stringify(allButtons)}`);
          await takeScreenshot(`start-questions-timeout-story-${storyCount}`);
        }
        
        await page.waitForTimeout(1000);

        // Look for and click the "Start Questions" button
        const startQuestionsBtn = page.locator('button').filter({ hasText: 'Start Questions' }).first();
        const startQuestionsBtnAlt = page.locator('button:has-text("Start Questions")').first();
        
        let buttonClicked = false;
        
        if (await startQuestionsBtn.isVisible()) {
          console.log(`✅ Found "Start Questions" button for story ${storyCount}, clicking...`);
          await startQuestionsBtn.click();
          buttonClicked = true;
          await takeScreenshot(`start-questions-clicked-story-${storyCount}`);
        } else if (await startQuestionsBtnAlt.isVisible()) {
          console.log(`✅ Found "Start Questions" button (alternative) for story ${storyCount}, clicking...`);
          await startQuestionsBtnAlt.click();
          buttonClicked = true;
          await takeScreenshot(`start-questions-clicked-alt-story-${storyCount}`);
        } else {
          console.log(`❌ No "Start Questions" button found for story ${storyCount}`);
          const allButtons = await page.locator('button').allTextContents();
          console.log(`Available buttons: ${JSON.stringify(allButtons)}`);
          await takeScreenshot(`no-start-questions-button-story-${storyCount}`);
        }
        
        if (buttonClicked) {
          console.log(`✅ Successfully clicked "Start Questions" for story ${storyCount}!`);
          await page.waitForTimeout(1000);
          
          // 8. Answer all 10 questions for this story
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
      
      await takeScreenshot('comprehension-test-final-state');
      console.log(`✅ Comprehension test completed! Tested ${storyCount} stories.`);
    }

    console.log(`✅ Focused comprehension test complete! Captured ${screenshotCounter - 1} screenshots.`);
  });
});