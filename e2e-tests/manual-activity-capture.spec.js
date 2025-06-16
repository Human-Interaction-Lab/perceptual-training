const { test } = require('@playwright/test');

test.setTimeout(180000);

test.describe('Manual Activity Interface Capture', () => {
    
    // Helper function to setup clean page
    const setupCleanPage = async (page) => {
        await page.addInitScript(() => {
            const originalLog = console.log;
            console.log = (...args) => {
                const message = args.join(' ');
                if (!message.includes('React DevTools')) {
                    originalLog.apply(console, args);
                }
            };
        });

        await page.addStyleTag({
            content: `
                .bg-yellow-100, [class*="bg-yellow"], .border-yellow-500, [class*="border-yellow"] {
                    display: none !important;
                }
            `
        });
    };

    test('should manually capture each activity interface with running servers', async ({ page }) => {
        await setupCleanPage(page);
        
        console.log('=== MANUAL ACTIVITY INTERFACE CAPTURE ===');
        console.log('This test assumes servers are already running on localhost:3001 and localhost:28303');
        
        // Go to the app 
        await page.goto('http://localhost:3001/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        // Try to login with existing user
        console.log('Attempting login...');
        const userIdInput = page.locator('input[type="text"], input#userId').first();
        const passwordInput = page.locator('input[type="password"]').first();

        await userIdInput.fill('test_pretesta');
        await passwordInput.fill('test1234');
        await passwordInput.press('Enter');
        await page.waitForTimeout(5000);
        
        // Take screenshot of main interface
        await page.screenshot({ 
            path: 'screenshots/manual-01-main-interface.png',
            fullPage: true 
        });

        let screenshotCounter = 2;

        // Find all "Begin Activity" buttons
        const beginButtons = await page.locator('button').filter({ hasText: /begin activity/i }).all();
        console.log(`Found ${beginButtons.length} "Begin Activity" buttons`);

        // Test each button one by one
        for (let i = 0; i < beginButtons.length; i++) {
            const button = beginButtons[i];
            
            if (await button.isVisible() && await button.isEnabled()) {
                // Find the parent card to get context
                const card = button.locator('xpath=ancestor::*[contains(@class, "Card") or contains(@class, "card")][1]');
                let activityName = `activity-${i + 1}`;
                
                try {
                    const cardText = await card.textContent();
                    if (cardText.toLowerCase().includes('intellig')) {
                        activityName = 'intelligibility';
                    } else if (cardText.toLowerCase().includes('effort')) {
                        activityName = 'effort';
                    } else if (cardText.toLowerCase().includes('comprehension')) {
                        activityName = 'comprehension';
                    } else if (cardText.toLowerCase().includes('demograph')) {
                        activityName = 'demographics';
                    }
                    console.log(`\\nTesting ${activityName}: ${cardText.substring(0, 50)}...`);
                } catch (e) {
                    console.log(`\\nTesting button ${i + 1}...`);
                }
                
                // Click the button
                await button.click();
                await page.waitForTimeout(6000); // Wait longer for interface to load
                
                // Take screenshot of interface
                await page.screenshot({ 
                    path: `screenshots/manual-${String(screenshotCounter).padStart(2, '0')}-${activityName}-interface.png`,
                    fullPage: true 
                });
                screenshotCounter++;

                // Try to interact with common elements
                // 1. Audio controls
                const playButton = page.locator('button').filter({ hasText: /play|listen|start/i }).first();
                if (await playButton.isVisible()) {
                    try {
                        console.log('Clicking play button...');
                        await playButton.click({ timeout: 3000 });
                        await page.waitForTimeout(2000);
                        
                        await page.screenshot({ 
                            path: `screenshots/manual-${String(screenshotCounter).padStart(2, '0')}-${activityName}-playing.png`,
                            fullPage: true 
                        });
                        screenshotCounter++;
                    } catch (error) {
                        console.log('Could not click play button');
                    }
                }

                // 2. Text input (intelligibility test)
                const textInput = page.locator('input[type="text"]:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])').first();
                if (await textInput.isVisible()) {
                    try {
                        console.log('Filling text input...');
                        await textInput.fill('This is a test response for the activity');
                        await page.waitForTimeout(1000);
                        
                        await page.screenshot({ 
                            path: `screenshots/manual-${String(screenshotCounter).padStart(2, '0')}-${activityName}-text-filled.png`,
                            fullPage: true 
                        });
                        screenshotCounter++;
                    } catch (error) {
                        console.log('Could not fill text input');
                    }
                }

                // 3. Range slider (effort test)
                const rangeSlider = page.locator('input[type="range"]').first();
                if (await rangeSlider.isVisible()) {
                    try {
                        console.log('Adjusting range slider...');
                        await rangeSlider.fill('3');
                        await page.waitForTimeout(1000);
                        
                        await page.screenshot({ 
                            path: `screenshots/manual-${String(screenshotCounter).padStart(2, '0')}-${activityName}-slider-set.png`,
                            fullPage: true 
                        });
                        screenshotCounter++;
                    } catch (error) {
                        console.log('Could not adjust slider');
                    }
                }

                // 4. Radio buttons (comprehension test)
                const radioButtons = await page.locator('input[type="radio"]').all();
                if (radioButtons.length > 0) {
                    try {
                        console.log('Selecting radio button...');
                        await radioButtons[0].click();
                        await page.waitForTimeout(1000);
                        
                        await page.screenshot({ 
                            path: `screenshots/manual-${String(screenshotCounter).padStart(2, '0')}-${activityName}-radio-selected.png`,
                            fullPage: true 
                        });
                        screenshotCounter++;
                    } catch (error) {
                        console.log('Could not select radio button');
                    }
                }

                // Navigate back to main interface
                console.log('Navigating back...');
                const backButton = page.locator('button').filter({ hasText: /back|return|home|phase|selection/i }).first();
                
                if (await backButton.isVisible()) {
                    await backButton.click();
                    await page.waitForTimeout(4000);
                } else {
                    console.log('No back button found, navigating directly to root');
                    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
                    await page.waitForTimeout(4000);
                }
                
                // Take screenshot after returning
                await page.screenshot({ 
                    path: `screenshots/manual-${String(screenshotCounter).padStart(2, '0')}-back-to-main.png`,
                    fullPage: true 
                });
                screenshotCounter++;

                console.log(`Completed testing ${activityName}`);
            }
        }

        // Test training if available
        console.log('\\nLooking for training options...');
        const trainingButtons = await page.locator('button').filter({ 
            hasText: /training|begin training|day 1|day 2|day 3|day 4/i 
        }).all();
        
        for (const trainingButton of trainingButtons) {
            if (await trainingButton.isVisible() && await trainingButton.isEnabled()) {
                const buttonText = await trainingButton.textContent();
                console.log(`Testing training: ${buttonText}`);
                
                await trainingButton.click();
                await page.waitForTimeout(6000);
                
                await page.screenshot({ 
                    path: `screenshots/manual-${String(screenshotCounter).padStart(2, '0')}-training-interface.png`,
                    fullPage: true 
                });
                screenshotCounter++;
                
                // Look for training elements
                const trainingPlayButton = page.locator('button').filter({ hasText: /listen|play|continue|next/i }).first();
                if (await trainingPlayButton.isVisible()) {
                    try {
                        await trainingPlayButton.click({ timeout: 3000 });
                        await page.waitForTimeout(2000);
                        
                        await page.screenshot({ 
                            path: `screenshots/manual-${String(screenshotCounter).padStart(2, '0')}-training-active.png`,
                            fullPage: true 
                        });
                        screenshotCounter++;
                    } catch (error) {
                        console.log('Could not interact with training interface');
                    }
                }
                
                // Navigate back
                const backButton = page.locator('button').filter({ hasText: /back|return|home/i }).first();
                if (await backButton.isVisible()) {
                    await backButton.click();
                    await page.waitForTimeout(3000);
                } else {
                    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
                    await page.waitForTimeout(3000);
                }
                
                break; // Only test first available training
            }
        }

        // Final screenshot
        await page.screenshot({ 
            path: `screenshots/manual-${String(screenshotCounter).padStart(2, '0')}-final.png`,
            fullPage: true 
        });

        console.log(`\\n✅ Manual activity capture complete - generated ${screenshotCounter} screenshots`);
        console.log('Note: This test requires servers to be running manually');
    });
});