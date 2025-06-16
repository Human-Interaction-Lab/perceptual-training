const { test, expect } = require('@playwright/test');

test.describe('Working Phase Progression Testing', () => {
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

    // Helper to login and stay logged in
    const loginAndStayLoggedIn = async (page, userId) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const userIdInput = page.locator('input[type="text"], input#userId').first();
        const passwordInput = page.locator('input[type="password"]').first();

        await userIdInput.fill(userId);
        await passwordInput.fill('test1234');
        await passwordInput.press('Enter');
        await page.waitForTimeout(4000);

        // Verify we're logged in by checking for phase selection elements
        const isLoggedIn = await page.locator('button').filter({ hasText: /begin activity|play sample|locked/i }).first().isVisible();
        if (!isLoggedIn) {
            throw new Error(`Failed to login as ${userId}`);
        }
        
        console.log(`✅ Successfully logged in as ${userId}`);
        return true;
    };

    test('should capture pretest phase with demographics completed', async ({ page }) => {
        await setupCleanPage(page);
        
        // Login with user who has demographics completed
        await loginAndStayLoggedIn(page, 'test_pretesta');

        // Take screenshot of current state
        await page.screenshot({ 
            path: 'screenshots/phase-01-pretest-demographics-done.png',
            fullPage: true 
        });

        // Look for intelligibility test (should be available since demographics is done)
        const beginButton = page.locator('button').filter({ hasText: /begin activity/i }).first();
        if (await beginButton.isVisible()) {
            console.log('Found "Begin Activity" button - clicking...');
            await beginButton.click();
            await page.waitForTimeout(3000);
            
            await page.screenshot({ 
                path: 'screenshots/phase-02-intelligibility-test.png',
                fullPage: true 
            });

            // Look for audio interface
            const audioElements = [
                'audio',
                'button:has-text("Play")',
                'button:has-text("Listen")',
                '[class*="audio"]'
            ];

            for (const selector of audioElements) {
                if (await page.locator(selector).first().isVisible()) {
                    await page.screenshot({ 
                        path: 'screenshots/phase-03-audio-interface.png',
                        fullPage: true 
                    });
                    break;
                }
            }
        }
    });

    test('should simulate completing intelligibility and show next test', async ({ page, request }) => {
        await setupCleanPage(page);
        
        // Login first
        await loginAndStayLoggedIn(page, 'test_pretesta');

        // Get current token from localStorage
        const token = await page.evaluate(() => localStorage.getItem('token'));
        if (!token) {
            throw new Error('No authentication token found');
        }

        console.log('=== SIMULATING INTELLIGIBILITY TEST COMPLETION ===');

        // Complete intelligibility test via API (but stay on the page)
        try {
            const response = await request.post('http://localhost:28303/api/test-completed', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    phase: 'pretest',
                    testType: 'intelligibility',
                    completed: true
                }
            });
            
            if (response.ok()) {
                const result = await response.json();
                console.log('✅ Marked intelligibility as completed');
                
                // Navigate back to phase selection WITHOUT page.reload()
                // Instead, navigate to home or use a button
                const homeButton = page.locator('button').filter({ hasText: /back|home|phase selection/i });
                if (await homeButton.first().isVisible()) {
                    await homeButton.first().click();
                } else {
                    // Try navigating to root while preserving session
                    await page.goto('/', { waitUntil: 'networkidle' });
                }
                
                await page.waitForTimeout(3000);
                
                await page.screenshot({ 
                    path: 'screenshots/phase-04-after-intelligibility.png',
                    fullPage: true 
                });

                // Now look for the next available test
                const nextTestButtons = await page.locator('button').filter({ hasText: /begin activity|locked/i }).all();
                console.log(`Found ${nextTestButtons.length} test buttons after completing intelligibility`);
                
                // Try to click on the next available test
                for (let i = 0; i < nextTestButtons.length; i++) {
                    const buttonText = await nextTestButtons[i].textContent();
                    const isEnabled = await nextTestButtons[i].isEnabled();
                    console.log(`Button ${i}: "${buttonText}" (enabled: ${isEnabled})`);
                    
                    if (isEnabled && await nextTestButtons[i].isVisible()) {
                        await nextTestButtons[i].click();
                        await page.waitForTimeout(2000);
                        
                        await page.screenshot({ 
                            path: `screenshots/phase-05-next-test-${i}.png`,
                            fullPage: true 
                        });
                        break;
                    }
                }
                
            } else {
                console.log('❌ Failed to mark intelligibility as completed:', response.status());
            }
            
        } catch (error) {
            console.log('❌ Error completing intelligibility test:', error.message);
        }
    });

    test('should test completing all pretest activities in sequence', async ({ page, request }) => {
        await setupCleanPage(page);
        
        await loginAndStayLoggedIn(page, 'test_pretesta');

        const token = await page.evaluate(() => localStorage.getItem('token'));
        if (!token) {
            throw new Error('No authentication token found');
        }

        // Sequence of tests to complete
        const testSequence = [
            { testType: 'intelligibility', name: 'Speech Intelligibility' },
            { testType: 'effort', name: 'Listening Effort' },
            { testType: 'comprehension', name: 'Story Comprehension' }
        ];

        for (let i = 0; i < testSequence.length; i++) {
            const testInfo = testSequence[i];
            console.log(`\n=== COMPLETING ${testInfo.name.toUpperCase()} ===`);
            
            // Take screenshot of current state
            await page.screenshot({ 
                path: `screenshots/sequence-${i + 1}-before-${testInfo.testType}.png`,
                fullPage: true 
            });

            try {
                // Complete this test via API
                const response = await request.post('http://localhost:28303/api/test-completed', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    data: {
                        phase: 'pretest',
                        testType: testInfo.testType,
                        completed: true
                    }
                });
                
                if (response.ok()) {
                    console.log(`✅ Completed ${testInfo.testType}`);
                    
                    // Navigate back to main view (without reload)
                    await page.goto('/', { waitUntil: 'networkidle' });
                    await page.waitForTimeout(3000);
                    
                    await page.screenshot({ 
                        path: `screenshots/sequence-${i + 2}-after-${testInfo.testType}.png`,
                        fullPage: true 
                    });
                    
                } else {
                    console.log(`❌ Failed to complete ${testInfo.testType}`);
                }
                
            } catch (error) {
                console.log(`❌ Error completing ${testInfo.testType}:`, error.message);
            }
        }

        // After all pretest is complete, check if training is available
        console.log('\n=== CHECKING FOR TRAINING AVAILABILITY ===');
        
        // Look for training-related buttons
        const allButtons = await page.locator('button').all();
        console.log('All available buttons after completing pretest:');
        for (let i = 0; i < allButtons.length; i++) {
            const buttonText = await allButtons[i].textContent();
            const isVisible = await allButtons[i].isVisible();
            const isEnabled = await allButtons[i].isEnabled();
            if (isVisible && buttonText.trim()) {
                console.log(`  ${i}: "${buttonText.trim()}" (enabled: ${isEnabled})`);
            }
        }

        await page.screenshot({ 
            path: 'screenshots/sequence-final-all-pretest-complete.png',
            fullPage: true 
        });
    });

    test('should test responsive design at different completion states', async ({ page }) => {
        await setupCleanPage(page);
        
        await loginAndStayLoggedIn(page, 'test_pretesta');

        const viewports = [
            { width: 1920, height: 1080, name: 'desktop' },
            { width: 768, height: 1024, name: 'tablet' },
            { width: 375, height: 667, name: 'mobile' }
        ];

        for (const viewport of viewports) {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.waitForTimeout(500);
            
            await page.screenshot({ 
                path: `screenshots/responsive-pretest-${viewport.name}.png`,
                fullPage: true 
            });
        }

        // Reset to desktop
        await page.setViewportSize({ width: 1920, height: 1080 });
    });

    test.afterEach(async ({ page }) => {
        // Don't clear localStorage - this was causing the session loss!
        // Just wait for next test
        await page.waitForTimeout(500);
    });
});