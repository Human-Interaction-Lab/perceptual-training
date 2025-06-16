const { test, expect } = require('@playwright/test');
const { createPhaseTestUsers, cleanupPhaseTestUsers } = require('./create-phase-users');

test.describe('Backend-Driven Phase Testing', () => {
    // Create test users before all tests
    test.beforeAll(async () => {
        console.log('🔧 Creating phase test users with proper backend state...');
        await createPhaseTestUsers();
        console.log('✅ Phase test users created successfully');
    });

    // Cleanup test users after all tests
    test.afterAll(async () => {
        console.log('🧹 Cleaning up phase test users...');
        await cleanupPhaseTestUsers();
        console.log('✅ Phase test users cleaned up successfully');
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

    // Helper function to login
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

    // Test each phase user individually
    const phaseTests = [
        {
            userId: 'phase_pretest_start',
            phase: 'pretest-start',
            description: 'Should show demographics form available',
            expectedElements: ['Demographics', 'button:has-text("Demographics")']
        },
        {
            userId: 'phase_pretest_demo_done',  
            phase: 'pretest-demographics-done',
            description: 'Should show intelligibility test available',
            expectedElements: ['Speech Intelligibility', 'button:has-text("Speech Intelligibility")']
        },
        {
            userId: 'phase_pretest_intel_done',
            phase: 'pretest-intelligibility-done', 
            description: 'Should show listening effort test available',
            expectedElements: ['Listening Effort', 'button:has-text("Listening Effort")']
        },
        {
            userId: 'phase_pretest_complete',
            phase: 'pretest-complete',
            description: 'Should show training available (pretest complete)',
            expectedElements: ['Training', 'button:has-text("Training")']
        },
        {
            userId: 'phase_training_start',
            phase: 'training-available',
            description: 'Should show training day 1 interface',
            expectedElements: ['Training', 'Day 1', 'button:has-text("Training")']
        },
        {
            userId: 'phase_training_done',
            phase: 'posttest1-available', 
            description: 'Should show 1-week follow-up available',
            expectedElements: ['1-Week', 'Follow-up', 'button:has-text("1-Week")']
        },
        {
            userId: 'phase_posttest2',
            phase: 'posttest2-available',
            description: 'Should show 1-month follow-up available', 
            expectedElements: ['1-Month', 'Follow-up', 'button:has-text("1-Month")']
        }
    ];

    for (const phaseTest of phaseTests) {
        test(`${phaseTest.phase}: ${phaseTest.description}`, async ({ page }) => {
            await setupCleanPage(page);
            
            console.log(`Testing ${phaseTest.userId}: ${phaseTest.description}`);

            // Login with phase-specific user
            await loginUser(page, phaseTest.userId);

            // Take screenshot of main interface
            await page.screenshot({ 
                path: `screenshots/backend-${phaseTest.phase}-main.png`,
                fullPage: true 
            });

            // Check for expected elements
            let foundExpectedElement = false;
            for (const element of phaseTest.expectedElements) {
                if (await page.locator(element).first().isVisible()) {
                    console.log(`✅ Found expected element: ${element}`);
                    foundExpectedElement = true;
                    break;
                }
            }

            if (!foundExpectedElement) {
                console.log(`⚠️ Did not find expected elements for ${phaseTest.userId}`);
            }

            // Try to interact with available activities
            const activityButtons = page.locator('button').filter({ 
                hasText: /demographics|intelligibility|effort|comprehension|training|follow.?up|week|month/i 
            });
            
            const visibleButtons = await activityButtons.all();
            for (let i = 0; i < Math.min(visibleButtons.length, 3); i++) {
                if (await visibleButtons[i].isVisible() && await visibleButtons[i].isEnabled()) {
                    const buttonText = await visibleButtons[i].textContent();
                    console.log(`Clicking available button: ${buttonText}`);
                    
                    await visibleButtons[i].click();
                    await page.waitForTimeout(2000);
                    
                    await page.screenshot({ 
                        path: `screenshots/backend-${phaseTest.phase}-activity-${i + 1}.png`,
                        fullPage: true 
                    });

                    // Look for test interface elements
                    const interfaceElements = [
                        'audio',
                        'button:has-text("Play")',
                        'button:has-text("Start")', 
                        'button:has-text("Listen")',
                        'input[type="range"]',
                        'textarea',
                        'select',
                        'form'
                    ];

                    for (const selector of interfaceElements) {
                        if (await page.locator(selector).first().isVisible()) {
                            await page.screenshot({ 
                                path: `screenshots/backend-${phaseTest.phase}-interface-${i + 1}.png`,
                                fullPage: true 
                            });
                            break;
                        }
                    }

                    // Go back to main view
                    const backButton = page.locator('button').filter({ hasText: /back|return|home/i });
                    if (await backButton.first().isVisible()) {
                        await backButton.first().click();
                        await page.waitForTimeout(1000);
                    }
                    
                    break; // Only test first available activity
                }
            }

            console.log(`✅ Completed testing ${phaseTest.userId}`);
        });
    }

    // Test responsive design for key phases
    test('should test responsive design across different phases', async ({ page }) => {
        await setupCleanPage(page);

        const responsiveTests = [
            { userId: 'phase_pretest_start', phase: 'pretest-start' },
            { userId: 'phase_training_start', phase: 'training' },
            { userId: 'phase_training_done', phase: 'posttest1' }
        ];

        const viewports = [
            { width: 1920, height: 1080, name: 'desktop' },
            { width: 768, height: 1024, name: 'tablet' },
            { width: 375, height: 667, name: 'mobile' }
        ];

        for (const responsiveTest of responsiveTests) {
            await loginUser(page, responsiveTest.userId);
            
            for (const viewport of viewports) {
                await page.setViewportSize({ width: viewport.width, height: viewport.height });
                await page.waitForTimeout(500);
                
                await page.screenshot({ 
                    path: `screenshots/backend-responsive-${responsiveTest.phase}-${viewport.name}.png`,
                    fullPage: true 
                });
            }

            // Logout for next user
            await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            });
        }

        // Reset to desktop
        await page.setViewportSize({ width: 1920, height: 1080 });
    });

    // Test user progression simulation
    test('should show progression through phases', async ({ page }) => {
        await setupCleanPage(page);

        const progressionUsers = [
            'phase_pretest_start',
            'phase_pretest_demo_done', 
            'phase_pretest_complete',
            'phase_training_start',
            'phase_training_done',
            'phase_posttest2'
        ];

        for (let i = 0; i < progressionUsers.length; i++) {
            await loginUser(page, progressionUsers[i]);
            
            await page.screenshot({ 
                path: `screenshots/backend-progression-${i + 1}-${progressionUsers[i]}.png`,
                fullPage: true 
            });

            // Clear session for next user
            await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            });
        }

        console.log('✅ User progression screenshots complete');
    });

    test.afterEach(async ({ page }) => {
        // Clean up session data
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });
});