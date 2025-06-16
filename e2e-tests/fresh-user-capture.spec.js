const { test, expect } = require('@playwright/test');

// Simple test that starts servers and captures interfaces for a fresh user
test.setTimeout(120000);

test.describe('Fresh User Activity Capture', () => {
    let backendProcess = null;
    let frontendProcess = null;

    // Start both backend and frontend before all tests
    test.beforeAll(async ({ }, testInfo) => {
        console.log('🚀 Starting application servers...');
        
        const { spawn } = require('child_process');
        
        // Start backend
        backendProcess = spawn('npm', ['run', 'server'], {
            cwd: '/Users/tysonbarrett/Dev/perceptual-training',
            stdio: 'pipe',
            detached: false
        });

        // Start frontend
        frontendProcess = spawn('npm', ['run', 'client'], {
            cwd: '/Users/tysonbarrett/Dev/perceptual-training',
            stdio: 'pipe',
            detached: false
        });

        // Wait for servers to start
        await new Promise(resolve => setTimeout(resolve, 15000));
        console.log('✅ Servers started');
    });

    // Stop servers after all tests
    test.afterAll(async () => {
        console.log('🛑 Stopping servers...');
        
        if (backendProcess) {
            backendProcess.kill('SIGTERM');
        }
        if (frontendProcess) {
            frontendProcess.kill('SIGTERM');
        }
        
        console.log('✅ Servers stopped');
    });

    // Helper function to setup clean page
    const setupCleanPage = async (page) => {
        await page.addInitScript(() => {
            // Hide dev messages
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

    test('should capture fresh user activity progression', async ({ page }) => {
        await setupCleanPage(page);
        
        console.log('=== FRESH USER ACTIVITY CAPTURE ===');
        
        // Go to the app
        await page.goto('http://localhost:3001/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        // Take screenshot of login page
        await page.screenshot({ 
            path: 'screenshots/fresh-01-login-page.png',
            fullPage: true 
        });

        // Try to create new account or login
        const createAccountButton = page.locator('button, a').filter({ hasText: /create account|register|sign up/i });
        const timestamp = Date.now();
        const testUserId = `fresh_test_${timestamp}`;
        
        if (await createAccountButton.first().isVisible()) {
            console.log('Creating new account...');
            await createAccountButton.first().click();
            await page.waitForTimeout(1000);
            
            // Fill out registration
            const userIdInput = page.locator('input#userId, input[name="userId"]');
            const emailInput = page.locator('input[type="email"], input[name="email"]');
            const passwordInput = page.locator('input[type="password"]').first();
            const confirmPasswordInput = page.locator('input[type="password"]').last();
            
            if (await userIdInput.isVisible()) {
                await userIdInput.fill(testUserId);
            }
            if (await emailInput.isVisible()) {
                await emailInput.fill(`${testUserId}@test.com`);
            }
            if (await passwordInput.isVisible()) {
                await passwordInput.fill('test1234');
            }
            if (await confirmPasswordInput.isVisible() && confirmPasswordInput !== passwordInput) {
                await confirmPasswordInput.fill('test1234');
            }
            
            // Submit registration
            const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /create|register|submit/i });
            if (await submitButton.first().isVisible()) {
                await submitButton.first().click();
                await page.waitForTimeout(5000);
            }
        } else {
            // Try to login with existing user
            console.log('Attempting login with existing user...');
            const userIdInput = page.locator('input[type="text"], input#userId').first();
            const passwordInput = page.locator('input[type="password"]').first();

            await userIdInput.fill('test_pretesta');
            await passwordInput.fill('test1234');
            await passwordInput.press('Enter');
            await page.waitForTimeout(5000);
        }
        
        // Take screenshot after login attempt
        await page.screenshot({ 
            path: 'screenshots/fresh-02-after-login.png',
            fullPage: true 
        });

        let screenshotCounter = 3;
        
        // Look for any "Begin Activity" or similar buttons
        const activityButtons = await page.locator('button').filter({ 
            hasText: /begin|start|continue|demographics|intelligibility|effort|comprehension|training/i 
        }).all();
        
        console.log(`Found ${activityButtons.length} potential activity buttons`);
        
        // Test the first few available buttons
        for (let i = 0; i < Math.min(activityButtons.length, 3); i++) {
            const button = activityButtons[i];
            
            if (await button.isVisible() && await button.isEnabled()) {
                const buttonText = await button.textContent();
                console.log(`\\nTesting button: "${buttonText.trim()}"`);
                
                // Click button
                await button.click();
                await page.waitForTimeout(4000);
                
                // Take screenshot of interface
                await page.screenshot({ 
                    path: `screenshots/fresh-${String(screenshotCounter).padStart(2, '0')}-interface-${i + 1}.png`,
                    fullPage: true 
                });
                screenshotCounter++;

                // Look for interactive elements
                const playButton = page.locator('button').filter({ hasText: /play|listen|start/i }).first();
                if (await playButton.isVisible()) {
                    try {
                        await playButton.click({ timeout: 2000 });
                        await page.waitForTimeout(2000);
                        
                        await page.screenshot({ 
                            path: `screenshots/fresh-${String(screenshotCounter).padStart(2, '0')}-playing-${i + 1}.png`,
                            fullPage: true 
                        });
                        screenshotCounter++;
                    } catch (error) {
                        console.log('Could not click play button');
                    }
                }

                // Try form interactions
                const textInput = page.locator('input[type="text"], textarea').first();
                if (await textInput.isVisible()) {
                    await textInput.fill('Test response');
                    await page.waitForTimeout(1000);
                    
                    await page.screenshot({ 
                        path: `screenshots/fresh-${String(screenshotCounter).padStart(2, '0')}-input-${i + 1}.png`,
                        fullPage: true 
                    });
                    screenshotCounter++;
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
                
                // Only test first available button for thoroughness
                break;
            }
        }

        // Final screenshot
        await page.screenshot({ 
            path: `screenshots/fresh-${String(screenshotCounter).padStart(2, '0')}-final.png`,
            fullPage: true 
        });

        console.log(`\\n✅ Captured ${screenshotCounter} screenshots for fresh user workflow`);
    });
});