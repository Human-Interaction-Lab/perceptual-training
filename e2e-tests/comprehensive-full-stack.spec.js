const { test, expect } = require('@playwright/test');

// Increase timeout for this comprehensive test
test.setTimeout(60000);

test.describe('Comprehensive Full-Stack Phase Testing', () => {
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

    // Helper to login and maintain session
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

    // Helper to create a test user via registration (if available)
    const createTestUser = async (page, userIdSuffix) => {
        const userId = `testuser_${userIdSuffix}_${Date.now()}`;
        
        await page.goto('http://localhost:3001/');
        await page.waitForLoadState('networkidle');
        
        // Look for registration option
        const createAccountButton = page.locator('button, a').filter({ hasText: /create account|register|sign up/i });
        
        if (await createAccountButton.first().isVisible()) {
            await createAccountButton.first().click();
            await page.waitForTimeout(1000);
            
            // Fill registration form
            const userIdInput = page.locator('input#userId, input[name="userId"]');
            const emailInput = page.locator('input[type="email"], input[name="email"]');
            const passwordInput = page.locator('input[type="password"]').first();
            
            if (await userIdInput.isVisible()) {
                await userIdInput.fill(userId);
            }
            if (await emailInput.isVisible()) {
                await emailInput.fill(`${userId}@test.com`);
            }
            if (await passwordInput.isVisible()) {
                await passwordInput.fill('test1234');
            }
            
            // Submit registration
            const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /create|register|submit/i });
            if (await submitButton.first().isVisible()) {
                await submitButton.first().click();
                await page.waitForTimeout(3000);
                return userId;
            }
        }
        
        return null;
    };

    test('should capture complete phase progression using new test user', async ({ page, request }) => {
        await setupCleanPage(page);
        
        console.log('=== COMPREHENSIVE PHASE PROGRESSION TEST ===');
        
        // Create a unique test user
        const timestamp = Date.now();
        const testUserId = `e2e_test_${timestamp}`;
        const testPassword = 'test1234';
        
        console.log(`Creating test user: ${testUserId}`);
        
        // Register new user
        await page.goto('http://localhost:3001/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Check if there's a create account option
        const createAccountButton = page.locator('button, a').filter({ hasText: /create account|register|sign up/i });
        
        let token = null;
        
        if (await createAccountButton.first().isVisible()) {
            console.log('Found create account option - registering new user');
            await createAccountButton.first().click();
            await page.waitForTimeout(1000);
            
            // Fill registration form
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
                await passwordInput.fill(testPassword);
            }
            if (await confirmPasswordInput.isVisible() && confirmPasswordInput !== passwordInput) {
                await confirmPasswordInput.fill(testPassword);
            }
            
            // Submit registration
            const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /create|register|submit/i });
            if (await submitButton.first().isVisible()) {
                await submitButton.first().click();
                await page.waitForTimeout(5000);
                
                // Check if we're now logged in
                token = await page.evaluate(() => localStorage.getItem('token'));
            }
        }
        
        // If registration didn't work or token not found, try login with existing user
        if (!token) {
            console.log('Registration failed or no account creation - trying existing user login');
            token = await loginUser(page, 'test_pretesta');
        }
        
        if (!token) {
            console.log('❌ Failed to login - taking login screenshot');
            await page.screenshot({ 
                path: 'screenshots/comprehensive-01-login-failed.png',
                fullPage: true 
            });
            return;
        }

        console.log('✅ Successfully logged in with token');

        // Take initial screenshot
        await page.screenshot({ 
            path: 'screenshots/comprehensive-01-initial-state.png',
            fullPage: true 
        });

        // Check current state and available activities
        const allButtons = await page.locator('button').all();
        console.log('\\nInitial available activities:');
        for (let i = 0; i < allButtons.length; i++) {
            const buttonText = await allButtons[i].textContent();
            const isVisible = await allButtons[i].isVisible();
            const isEnabled = await allButtons[i].isEnabled();
            if (isVisible && buttonText.trim()) {
                console.log(`  ${i}: "${buttonText.trim()}" (enabled: ${isEnabled})`);
            }
        }

        // Test sequence: Complete each activity and capture screenshots
        const activities = [
            { 
                phase: 'pretest', 
                testType: 'demographics', 
                name: 'Demographics',
                screenshotPrefix: 'demographics'
            },
            { 
                phase: 'pretest', 
                testType: 'intelligibility', 
                name: 'Speech Intelligibility',
                screenshotPrefix: 'intelligibility'
            },
            { 
                phase: 'pretest', 
                testType: 'effort', 
                name: 'Listening Effort',
                screenshotPrefix: 'effort'
            },
            { 
                phase: 'pretest', 
                testType: 'comprehension', 
                name: 'Story Comprehension',
                screenshotPrefix: 'comprehension'
            }
        ];

        let screenshotCounter = 2;

        for (const activity of activities) {
            console.log(`\\n=== TESTING ${activity.name.toUpperCase()} ===`);
            
            // Look for "Begin Activity" button (this is the standard text from PhaseSelection.js)
            const beginButton = page.locator('button').filter({ hasText: /begin activity/i }).first();

            if (await beginButton.isVisible() && await beginButton.isEnabled()) {
                console.log(`Found "Begin Activity" button for ${activity.name} - clicking...`);
                
                // Click the button and wait for navigation to the test interface
                await beginButton.click();
                
                // Wait for the navigation to complete - the URL should change or new elements should appear
                await page.waitForTimeout(4000);
                
                // Take screenshot of the test interface
                await page.screenshot({ 
                    path: `screenshots/comprehensive-${String(screenshotCounter).padStart(2, '0')}-${activity.screenshotPrefix}-interface.png`,
                    fullPage: true 
                });
                screenshotCounter++;

                // Look for specific test interface elements
                const interfaceElements = [
                    'audio',
                    'button:has-text("Play")',
                    'button:has-text("Start")', 
                    'button:has-text("Listen")',
                    'input[type="range"]',
                    'textarea',
                    'select',
                    'form input',
                    'input[type="text"]',
                    '[class*="audio"]',
                    '.audio-controls',
                    '[data-testid="audio"]'
                ];

                let foundInterface = false;
                for (const selector of interfaceElements) {
                    const element = page.locator(selector).first();
                    if (await element.isVisible()) {
                        console.log(`Found test interface element: ${selector}`);
                        await page.screenshot({ 
                            path: `screenshots/comprehensive-${String(screenshotCounter).padStart(2, '0')}-${activity.screenshotPrefix}-active.png`,
                            fullPage: true 
                        });
                        screenshotCounter++;
                        foundInterface = true;
                        
                        // If it's an audio element, try to interact with it
                        if (selector.includes('Play') || selector.includes('audio')) {
                            try {
                                await element.click({ timeout: 2000 });
                                await page.waitForTimeout(1000);
                                await page.screenshot({ 
                                    path: `screenshots/comprehensive-${String(screenshotCounter).padStart(2, '0')}-${activity.screenshotPrefix}-playing.png`,
                                    fullPage: true 
                                });
                                screenshotCounter++;
                            } catch (clickError) {
                                console.log(`Could not click ${selector}:`, clickError.message);
                            }
                        }
                        break;
                    }
                }

                if (!foundInterface) {
                    console.log(`No test interface elements found for ${activity.name} - may still be on selection page`);
                }

                // Navigate back to selection page for next test
                // Look for back/home buttons first
                const backButton = page.locator('button').filter({ hasText: /back|return|home|phase|selection/i }).first();
                if (await backButton.isVisible()) {
                    console.log('Found back button - clicking to return to selection');
                    await backButton.click();
                    await page.waitForTimeout(3000);
                } else {
                    // If no back button, navigate directly
                    console.log('No back button found - navigating to selection page');
                    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
                    await page.waitForTimeout(3000);
                }
            } else {
                console.log(`No "Begin Activity" button found for ${activity.name}`);
            }

            // Complete this activity via API to unlock next one
            try {
                console.log(`Completing ${activity.testType} via API...`);
                const response = await request.post('http://localhost:28303/api/test-completed', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    data: {
                        phase: activity.phase,
                        testType: activity.testType,
                        completed: true
                    }
                });
                
                if (response.ok()) {
                    console.log(`✅ Completed ${activity.testType}`);
                    
                    // Navigate back to see updated state 
                    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
                    await page.waitForTimeout(3000);
                    
                    await page.screenshot({ 
                        path: `screenshots/comprehensive-${String(screenshotCounter).padStart(2, '0')}-after-${activity.screenshotPrefix}.png`,
                        fullPage: true 
                    });
                    screenshotCounter++;
                    
                } else {
                    console.log(`❌ Failed to complete ${activity.testType}: ${response.status()}`);
                }
                
            } catch (error) {
                console.log(`❌ Error completing ${activity.testType}:`, error.message);
            }
        }

        // After all pretest complete, check for training availability
        console.log('\\n=== CHECKING TRAINING AVAILABILITY ===');
        await page.waitForTimeout(2000);
        
        const trainingButtons = page.locator('button').filter({ hasText: /training|day/i });
        const trainingCount = await trainingButtons.count();
        
        console.log(`Found ${trainingCount} training-related buttons`);
        
        if (trainingCount > 0) {
            const firstTrainingButton = trainingButtons.first();
            if (await firstTrainingButton.isVisible() && await firstTrainingButton.isEnabled()) {
                try {
                    await firstTrainingButton.click({ timeout: 5000 });
                    await page.waitForTimeout(2000);
                    
                    await page.screenshot({ 
                        path: `screenshots/comprehensive-${String(screenshotCounter).padStart(2, '0')}-training-interface.png`,
                        fullPage: true 
                    });
                    screenshotCounter++;
                } catch (error) {
                    console.log('⚠️ Training button click timed out, but continuing...');
                }
            }
        }

        // Take final state screenshot
        await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        await page.screenshot({ 
            path: `screenshots/comprehensive-${String(screenshotCounter).padStart(2, '0')}-final-state.png`,
            fullPage: true 
        });

        console.log(`\\n✅ Comprehensive test complete - captured ${screenshotCounter} screenshots`);
        
        // Cleanup: Remove test user if we created one
        if (testUserId.startsWith('e2e_test_')) {
            try {
                console.log(`Cleaning up test user: ${testUserId}`);
                // Note: You could add API call here to delete the test user if needed
            } catch (cleanupError) {
                console.log('Cleanup error (non-critical):', cleanupError.message);
            }
        }
    });

    test('should test responsive design across activities', async ({ page }) => {
        await setupCleanPage(page);
        
        const token = await loginUser(page, 'test_pretesta');
        
        if (!token) return;

        const viewports = [
            { width: 1920, height: 1080, name: 'desktop' },
            { width: 768, height: 1024, name: 'tablet' },
            { width: 375, height: 667, name: 'mobile' }
        ];

        for (const viewport of viewports) {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.waitForTimeout(500);
            
            await page.screenshot({ 
                path: `screenshots/responsive-main-${viewport.name}.png`,
                fullPage: true 
            });

            // Test first available activity in this viewport
            const firstButton = page.locator('button').filter({ 
                hasText: /demographics|intelligibility|effort|comprehension|training/i 
            }).first();

            if (await firstButton.isVisible() && await firstButton.isEnabled()) {
                await firstButton.click();
                await page.waitForTimeout(2000);
                
                await page.screenshot({ 
                    path: `screenshots/responsive-activity-${viewport.name}.png`,
                    fullPage: true 
                });

                // Go back
                const backButton = page.locator('button').filter({ hasText: /back|return|home/i });
                if (await backButton.first().isVisible()) {
                    await backButton.first().click();
                    await page.waitForTimeout(1000);
                }
            }
        }

        // Reset to desktop
        await page.setViewportSize({ width: 1920, height: 1080 });
    });

    test.afterEach(async ({ page }) => {
        // Preserve session for next test
        await page.waitForTimeout(500);
    });
});