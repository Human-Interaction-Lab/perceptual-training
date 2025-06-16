const { test, expect } = require('@playwright/test');
const { createE2ETestUsers, cleanupE2ETestUsers } = require('./create-test-users');

// Test users for different phases
const testUsers = [
    { userId: 'e2e_pretest_demo', phase: 'pretest-demographics', description: 'Demographics form' },
    { userId: 'e2e_pretest_intel', phase: 'pretest-intelligibility', description: 'Intelligibility test interface' },
    { userId: 'e2e_pretest_effort', phase: 'pretest-effort', description: 'Listening effort test' },
    { userId: 'e2e_pretest_comp', phase: 'pretest-comprehension', description: 'Comprehension test and training access' },
    { userId: 'e2e_training_day1', phase: 'training-selection', description: 'Training day selection' },
    { userId: 'e2e_training_intel', phase: 'training-activity', description: 'Training activity interface' },
    { userId: 'e2e_posttest1', phase: 'posttest1', description: '1-week follow-up tests' },
    { userId: 'e2e_posttest2', phase: 'posttest2', description: '1-month follow-up tests' }
];

test.describe('Multi-Phase Comprehensive App Screenshots', () => {
    // Setup: Create test users before running tests
    test.beforeAll(async () => {
        console.log('🔧 Setting up E2E test users...');
        await createE2ETestUsers();
        console.log('✅ E2E test users created successfully');
    });

    // Cleanup: Remove test users after all tests
    test.afterAll(async () => {
        console.log('🧹 Cleaning up E2E test users...');
        await cleanupE2ETestUsers();
        console.log('✅ E2E test users cleaned up successfully');
    });

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

    // Test each user phase individually
    for (const testUser of testUsers) {
        test(`should capture ${testUser.phase} interface for ${testUser.userId}`, async ({ page }) => {
            await setupCleanPage(page);
            
            console.log(`Testing ${testUser.userId}: ${testUser.description}`);

            // Login with this specific test user
            await loginUser(page, testUser.userId);

            // Take screenshot of the main interface for this phase
            await page.screenshot({ 
                path: `screenshots/phase-${testUser.phase}-01-main.png`,
                fullPage: true 
            });

            // Phase-specific interactions
            switch (testUser.phase) {
                case 'pretest-demographics':
                    // Look for demographics button or form
                    const demoButton = page.locator('button').filter({ hasText: /demographics/i });
                    if (await demoButton.first().isVisible()) {
                        await demoButton.first().click();
                        await page.waitForTimeout(2000);
                        await page.screenshot({ 
                            path: `screenshots/phase-${testUser.phase}-02-form.png`,
                            fullPage: true 
                        });
                    }
                    break;

                case 'pretest-intelligibility':
                case 'pretest-effort':
                case 'pretest-comprehension':
                    // Look for available test buttons
                    const testButtons = page.locator('button').filter({ hasText: /intelligibility|effort|comprehension/i });
                    const visibleTests = await testButtons.all();
                    for (let i = 0; i < Math.min(visibleTests.length, 3); i++) {
                        if (await visibleTests[i].isVisible()) {
                            await visibleTests[i].click();
                            await page.waitForTimeout(2000);
                            
                            await page.screenshot({ 
                                path: `screenshots/phase-${testUser.phase}-0${i + 2}-test.png`,
                                fullPage: true 
                            });

                            // Look for audio player or test interface
                            const audioPlayer = page.locator('audio, button').filter({ hasText: /play|start|listen/i });
                            if (await audioPlayer.first().isVisible()) {
                                await page.screenshot({ 
                                    path: `screenshots/phase-${testUser.phase}-0${i + 3}-audio.png`,
                                    fullPage: true 
                                });
                            }

                            // Go back
                            const backButton = page.locator('button').filter({ hasText: /back|return/i });
                            if (await backButton.first().isVisible()) {
                                await backButton.first().click();
                                await page.waitForTimeout(1000);
                            }
                        }
                    }
                    break;

                case 'training-selection':
                    // Look for training day buttons
                    const trainingButtons = page.locator('button').filter({ hasText: /training|day/i });
                    if (await trainingButtons.first().isVisible()) {
                        await page.screenshot({ 
                            path: `screenshots/phase-${testUser.phase}-02-available.png`,
                            fullPage: true 
                        });
                        
                        await trainingButtons.first().click();
                        await page.waitForTimeout(2000);
                        await page.screenshot({ 
                            path: `screenshots/phase-${testUser.phase}-03-session.png`,
                            fullPage: true 
                        });
                    }
                    break;

                case 'training-activity':
                    // Show training in progress
                    const trainingActivity = page.locator('button').filter({ hasText: /training|continue|day/i });
                    if (await trainingActivity.first().isVisible()) {
                        await trainingActivity.first().click();
                        await page.waitForTimeout(2000);
                        await page.screenshot({ 
                            path: `screenshots/phase-${testUser.phase}-02-active.png`,
                            fullPage: true 
                        });
                    }
                    break;

                case 'posttest1':
                case 'posttest2':
                    // Look for posttest buttons
                    const posttestButtons = page.locator('button').filter({ hasText: /follow.?up|week|month|posttest/i });
                    if (await posttestButtons.first().isVisible()) {
                        await page.screenshot({ 
                            path: `screenshots/phase-${testUser.phase}-02-available.png`,
                            fullPage: true 
                        });
                        
                        await posttestButtons.first().click();
                        await page.waitForTimeout(2000);
                        await page.screenshot({ 
                            path: `screenshots/phase-${testUser.phase}-03-test.png`,
                            fullPage: true 
                        });
                    }
                    break;
            }

            // Test responsive design for key phases
            if (['training-selection', 'pretest-intelligibility', 'posttest1'].includes(testUser.phase)) {
                const viewports = [
                    { width: 768, height: 1024, name: 'tablet' },
                    { width: 375, height: 667, name: 'mobile' }
                ];

                for (const viewport of viewports) {
                    await page.setViewportSize({ width: viewport.width, height: viewport.height });
                    await page.waitForTimeout(500);
                    
                    await page.screenshot({ 
                        path: `screenshots/phase-${testUser.phase}-${viewport.name}.png`,
                        fullPage: true 
                    });
                }

                // Reset to desktop
                await page.setViewportSize({ width: 1920, height: 1080 });
            }

            console.log(`✅ Completed screenshots for ${testUser.userId}`);
        });
    }

    // Summary test showing progression through all phases
    test('should capture complete user journey progression', async ({ page }) => {
        await setupCleanPage(page);

        console.log('Creating progression summary...');

        // Quick snapshots of each phase
        for (let i = 0; i < Math.min(testUsers.length, 4); i++) {
            const user = testUsers[i];
            await loginUser(page, user.userId);
            
            await page.screenshot({ 
                path: `screenshots/progression-${i + 1}-${user.phase}.png`,
                fullPage: true 
            });

            // Logout by clearing storage
            await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            });
        }

        console.log('✅ Progression summary complete');
    });
});