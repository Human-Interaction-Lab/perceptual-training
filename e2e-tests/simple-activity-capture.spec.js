const { test, expect } = require('@playwright/test');

// Increase timeout for this comprehensive test
test.setTimeout(90000);

test.describe('Simple Activity Interface Capture', () => {
    let backendProcess = null;
    let frontendProcess = null;

    // Start both backend and frontend before all tests
    test.beforeAll(async ({ }, testInfo) => {
        console.log('🚀 Starting full application stack...');
        
        // Start backend
        console.log('Starting backend server...');
        const { spawn } = require('child_process');
        
        backendProcess = spawn('npm', ['run', 'server'], {
            cwd: '/Users/tysonbarrett/Dev/perceptual-training',
            stdio: 'pipe',
            detached: false
        });

        // Start frontend
        console.log('Starting frontend server...');
        frontendProcess = spawn('npm', ['run', 'client'], {
            cwd: '/Users/tysonbarrett/Dev/perceptual-training',
            stdio: 'pipe',
            detached: false
        });

        // Wait for servers to start
        console.log('Waiting for servers to start...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        console.log('✅ Application stack started');
    });

    // Stop servers after all tests
    test.afterAll(async () => {
        console.log('🛑 Stopping application stack...');
        
        if (backendProcess) {
            backendProcess.kill('SIGTERM');
        }
        if (frontendProcess) {
            frontendProcess.kill('SIGTERM');
        }
        
        console.log('✅ Application stack stopped');
    });

    // Helper function to setup clean page
    const setupCleanPage = async (page) => {
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
    };

    // Helper to login
    const loginUser = async (page, userId) => {
        await page.goto('http://localhost:3001/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const userIdInput = page.locator('input[type="text"], input#userId').first();
        const passwordInput = page.locator('input[type="password"]').first();

        await userIdInput.fill(userId);
        await passwordInput.fill('test1234');
        await passwordInput.press('Enter');
        await page.waitForTimeout(4000);

        // Return authentication token
        const token = await page.evaluate(() => localStorage.getItem('token'));
        return token;
    };

    test('should capture all available activity interfaces', async ({ page }) => {
        await setupCleanPage(page);
        
        console.log('=== SIMPLE ACTIVITY INTERFACE CAPTURE ===');
        
        // Login with existing test user
        const token = await loginUser(page, 'test_pretesta');
        
        if (!token) {
            console.log('❌ Failed to login');
            return;
        }

        console.log('✅ Successfully logged in');

        // Take initial screenshot
        await page.screenshot({ 
            path: 'screenshots/simple-01-main-interface.png',
            fullPage: true 
        });

        let screenshotCounter = 2;

        // Find all "Begin Activity" buttons and capture each interface
        const beginButtons = await page.locator('button').filter({ hasText: /begin activity/i }).all();
        console.log(`Found ${beginButtons.length} "Begin Activity" buttons`);

        for (let i = 0; i < beginButtons.length; i++) {
            const button = beginButtons[i];
            
            if (await button.isVisible() && await button.isEnabled()) {
                // Get button context to identify what activity this is
                const buttonContainer = button.locator('xpath=ancestor::div[contains(@class, "Card") or contains(@class, "card")][1]');
                const containerText = await buttonContainer.textContent();
                console.log(`\\nTesting activity ${i + 1}: ${containerText.substring(0, 50)}...`);
                
                // Click button and navigate to activity
                await button.click();
                await page.waitForTimeout(5000);
                
                // Take screenshot of the activity interface
                await page.screenshot({ 
                    path: `screenshots/simple-${String(screenshotCounter).padStart(2, '0')}-activity-${i + 1}-interface.png`,
                    fullPage: true 
                });
                screenshotCounter++;

                // Look for and interact with common interface elements
                const playButton = page.locator('button').filter({ hasText: /play|listen|start/i }).first();
                if (await playButton.isVisible()) {
                    try {
                        console.log('Found play button - clicking...');
                        await playButton.click({ timeout: 3000 });
                        await page.waitForTimeout(2000);
                        
                        await page.screenshot({ 
                            path: `screenshots/simple-${String(screenshotCounter).padStart(2, '0')}-activity-${i + 1}-playing.png`,
                            fullPage: true 
                        });
                        screenshotCounter++;
                    } catch (playError) {
                        console.log('Could not click play button:', playError.message);
                    }
                }

                // Look for form elements and try to interact
                const textInput = page.locator('input[type="text"], textarea').first();
                if (await textInput.isVisible()) {
                    try {
                        console.log('Found text input - entering sample text...');
                        await textInput.fill('Sample response for testing');
                        await page.waitForTimeout(1000);
                        
                        await page.screenshot({ 
                            path: `screenshots/simple-${String(screenshotCounter).padStart(2, '0')}-activity-${i + 1}-filled.png`,
                            fullPage: true 
                        });
                        screenshotCounter++;
                    } catch (inputError) {
                        console.log('Could not interact with input:', inputError.message);
                    }
                }

                // Look for range sliders (effort test)
                const rangeSlider = page.locator('input[type="range"]').first();
                if (await rangeSlider.isVisible()) {
                    try {
                        console.log('Found range slider - adjusting...');
                        await rangeSlider.fill('3');
                        await page.waitForTimeout(1000);
                        
                        await page.screenshot({ 
                            path: `screenshots/simple-${String(screenshotCounter).padStart(2, '0')}-activity-${i + 1}-slider.png`,
                            fullPage: true 
                        });
                        screenshotCounter++;
                    } catch (sliderError) {
                        console.log('Could not interact with slider:', sliderError.message);
                    }
                }

                // Look for radio buttons (comprehension test)
                const radioButton = page.locator('input[type="radio"]').first();
                if (await radioButton.isVisible()) {
                    try {
                        console.log('Found radio button - selecting...');
                        await radioButton.click();
                        await page.waitForTimeout(1000);
                        
                        await page.screenshot({ 
                            path: `screenshots/simple-${String(screenshotCounter).padStart(2, '0')}-activity-${i + 1}-selected.png`,
                            fullPage: true 
                        });
                        screenshotCounter++;
                    } catch (radioError) {
                        console.log('Could not interact with radio button:', radioError.message);
                    }
                }

                // Navigate back to main interface
                console.log('Navigating back to main interface...');
                const backButton = page.locator('button').filter({ hasText: /back|return|home/i }).first();
                if (await backButton.isVisible()) {
                    await backButton.click();
                    await page.waitForTimeout(3000);
                } else {
                    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
                    await page.waitForTimeout(3000);
                }
                
                // Take screenshot after returning
                await page.screenshot({ 
                    path: `screenshots/simple-${String(screenshotCounter).padStart(2, '0')}-back-to-main.png`,
                    fullPage: true 
                });
                screenshotCounter++;
                
                // Only test the first available activity for now
                break;
            }
        }

        // Test training interface if available
        console.log('\\n=== TESTING TRAINING ===');
        const trainingButtons = await page.locator('button').filter({ 
            hasText: /training|begin training/i 
        }).all();
        
        for (const trainingButton of trainingButtons) {
            if (await trainingButton.isVisible() && await trainingButton.isEnabled()) {
                console.log('Found training button - testing...');
                await trainingButton.click();
                await page.waitForTimeout(5000);
                
                await page.screenshot({ 
                    path: `screenshots/simple-${String(screenshotCounter).padStart(2, '0')}-training-interface.png`,
                    fullPage: true 
                });
                screenshotCounter++;
                
                // Navigate back
                const backButton = page.locator('button').filter({ hasText: /back|return/i }).first();
                if (await backButton.isVisible()) {
                    await backButton.click();
                    await page.waitForTimeout(3000);
                } else {
                    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
                    await page.waitForTimeout(3000);
                }
                break;
            }
        }

        // Final screenshot
        await page.screenshot({ 
            path: `screenshots/simple-${String(screenshotCounter).padStart(2, '0')}-final.png`,
            fullPage: true 
        });

        console.log(`\\n✅ Simple activity capture complete - captured ${screenshotCounter} screenshots`);
    });
});