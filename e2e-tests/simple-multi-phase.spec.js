const { test, expect } = require('@playwright/test');

test.describe('Simple Multi-Phase App Screenshots', () => {
    // Helper function to setup page and suppress dev messages
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

    // Helper function to login with a specific user
    const loginUser = async (page, userId) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const userIdInput = page.locator('input[type="text"], input#userId').first();
        const passwordInput = page.locator('input[type="password"]').first();

        await userIdInput.fill(userId);
        await passwordInput.fill('test1234');
        await passwordInput.press('Enter');
        await page.waitForTimeout(4000);
    };

    test('should capture pretest phase with existing user', async ({ page }) => {
        await setupCleanPage(page);
        
        // Use existing test user
        await loginUser(page, 'test_pretesta');

        // Take screenshot of phase selection
        await page.screenshot({ 
            path: 'screenshots/phase-pretest-main.png',
            fullPage: true 
        });

        // Try to access different pretest activities
        const activities = [
            { name: 'demographics', selector: 'button:has-text("Demographics")' },
            { name: 'intelligibility', selector: 'button:has-text("Speech Intelligibility")' },
            { name: 'comprehension', selector: 'button:has-text("Story Comprehension")' },
            { name: 'effort', selector: 'button:has-text("Listening Effort")' }
        ];

        for (const activity of activities) {
            const button = page.locator(activity.selector).first();
            if (await button.isVisible()) {
                console.log(`Testing ${activity.name} activity`);
                await button.click();
                await page.waitForTimeout(2000);
                
                await page.screenshot({ 
                    path: `screenshots/phase-pretest-${activity.name}.png`,
                    fullPage: true 
                });

                // Look for test interface elements
                const testElements = [
                    'audio',
                    'button:has-text("Play")',
                    'button:has-text("Start")',
                    'input[type="range"]',
                    'textarea',
                    'select'
                ];

                for (const selector of testElements) {
                    if (await page.locator(selector).first().isVisible()) {
                        await page.screenshot({ 
                            path: `screenshots/phase-pretest-${activity.name}-interface.png`,
                            fullPage: true 
                        });
                        break;
                    }
                }

                // Go back
                const backButton = page.locator('button:has-text("Back"), button:has-text("Return")').first();
                if (await backButton.isVisible()) {
                    await backButton.click();
                    await page.waitForTimeout(1000);
                }
            }
        }
    });

    test('should simulate training phase access', async ({ page }) => {
        await setupCleanPage(page);
        
        // Login with existing user
        await loginUser(page, 'test_pretesta');

        // Manipulate localStorage to simulate completed pretest and access to training
        await page.evaluate(() => {
            const userId = localStorage.getItem('userId');
            
            // Set pretest as completed and date in past
            const pretestDate = new Date();
            pretestDate.setDate(pretestDate.getDate() - 5);
            sessionStorage.setItem('pretestDate', pretestDate.toISOString());
            localStorage.setItem('pretestDate', pretestDate.toISOString());
            
            // Mark all pretest activities as completed
            localStorage.setItem('currentPhase', 'training');
            localStorage.setItem('canProceedToday', 'true');
            localStorage.setItem('trainingDay', '1');
            
            // Set completion flags
            const completedTests = {
                demographics: true,
                pretest_demographics: true,
                pretest_intelligibility: true,
                pretest_effort: true,
                pretest_comprehension: true
            };
            
            Object.keys(completedTests).forEach(key => {
                localStorage.setItem(key, 'true');
            });
        });

        // Reload to apply changes
        await page.reload();
        await page.waitForTimeout(3000);

        await page.screenshot({ 
            path: 'screenshots/phase-training-available.png',
            fullPage: true 
        });

        // Look for training options
        const trainingButton = page.locator('button').filter({ hasText: /training|day/i }).first();
        if (await trainingButton.isVisible()) {
            await trainingButton.click();
            await page.waitForTimeout(2000);
            
            await page.screenshot({ 
                path: 'screenshots/phase-training-session.png',
                fullPage: true 
            });

            // Look for training interface
            const trainingElements = [
                'audio',
                'button:has-text("Play")',
                'button:has-text("Listen")',
                '[class*="training"]',
                '[class*="audio-player"]'
            ];

            for (const selector of trainingElements) {
                if (await page.locator(selector).first().isVisible()) {
                    await page.screenshot({ 
                        path: 'screenshots/phase-training-interface.png',
                        fullPage: true 
                    });
                    break;
                }
            }
        }
    });

    test('should simulate posttest access', async ({ page }) => {
        await setupCleanPage(page);
        
        // Login with existing user
        await loginUser(page, 'test_pretesta');

        // Manipulate localStorage to simulate completed training and access to posttests
        await page.evaluate(() => {
            const userId = localStorage.getItem('userId');
            
            // Set dates to allow posttest access
            const pretestDate = new Date();
            pretestDate.setDate(pretestDate.getDate() - 20);
            sessionStorage.setItem('pretestDate', pretestDate.toISOString());
            
            const trainingCompletedDate = new Date();
            trainingCompletedDate.setDate(trainingCompletedDate.getDate() - 8);
            localStorage.setItem('trainingCompletedDate', trainingCompletedDate.toISOString());
            
            // Mark training as completed
            localStorage.setItem('currentPhase', 'posttest1');
            localStorage.setItem('trainingDay', '5');
            
            // Set all completion flags
            const completedTests = {
                demographics: true,
                pretest_demographics: true,
                pretest_intelligibility: true,
                pretest_effort: true,
                pretest_comprehension: true,
                training_day1: true,
                training_day2: true,
                training_day3: true,
                training_day4: true
            };
            
            Object.keys(completedTests).forEach(key => {
                localStorage.setItem(key, 'true');
            });
        });

        // Reload to apply changes
        await page.reload();
        await page.waitForTimeout(3000);

        await page.screenshot({ 
            path: 'screenshots/phase-posttest1-available.png',
            fullPage: true 
        });

        // Look for posttest options
        const posttestButton = page.locator('button').filter({ hasText: /follow.?up|week|posttest/i }).first();
        if (await posttestButton.isVisible()) {
            await posttestButton.click();
            await page.waitForTimeout(2000);
            
            await page.screenshot({ 
                path: 'screenshots/phase-posttest1-test.png',
                fullPage: true 
            });
        }

        // Also simulate posttest2 access
        await page.evaluate(() => {
            localStorage.setItem('currentPhase', 'posttest2');
            
            const posttest1Date = new Date();
            posttest1Date.setDate(posttest1Date.getDate() - 21);
            localStorage.setItem('posttest1CompletedDate', posttest1Date.toISOString());
        });

        await page.reload();
        await page.waitForTimeout(3000);

        await page.screenshot({ 
            path: 'screenshots/phase-posttest2-available.png',
            fullPage: true 
        });
    });

    test('should test responsive design across phases', async ({ page }) => {
        await setupCleanPage(page);
        
        await loginUser(page, 'test_pretesta');

        const viewports = [
            { width: 1920, height: 1080, name: 'desktop' },
            { width: 768, height: 1024, name: 'tablet' },
            { width: 375, height: 667, name: 'mobile' }
        ];

        for (const viewport of viewports) {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.waitForTimeout(500);
            
            await page.screenshot({ 
                path: `screenshots/responsive-phase-selection-${viewport.name}.png`,
                fullPage: true 
            });

            // Test one activity in responsive mode
            const demoButton = page.locator('button:has-text("Demographics")').first();
            if (await demoButton.isVisible()) {
                await demoButton.click();
                await page.waitForTimeout(1500);
                
                await page.screenshot({ 
                    path: `screenshots/responsive-demographics-${viewport.name}.png`,
                    fullPage: true 
                });

                const backButton = page.locator('button:has-text("Back")').first();
                if (await backButton.isVisible()) {
                    await backButton.click();
                    await page.waitForTimeout(1000);
                }
            }
        }

        // Reset to desktop
        await page.setViewportSize({ width: 1920, height: 1080 });
    });

    test.afterEach(async ({ page }) => {
        // Clean up localStorage
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });
});