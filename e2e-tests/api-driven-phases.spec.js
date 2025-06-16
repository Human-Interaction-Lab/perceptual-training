const { test, expect } = require('@playwright/test');

test.describe('API-Driven Phase Testing', () => {
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

    // Helper to login and get what the backend actually returns
    const debugLogin = async (page, userId) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Intercept the login API call to see the response
        let loginResponse = null;
        page.on('response', async (response) => {
            if (response.url().includes('/api/login')) {
                try {
                    loginResponse = await response.json();
                    console.log(`Login response for ${userId}:`, JSON.stringify(loginResponse, null, 2));
                } catch (e) {
                    console.log('Could not parse login response:', e);
                }
            }
        });

        const userIdInput = page.locator('input[type="text"], input#userId').first();
        const passwordInput = page.locator('input[type="password"]').first();

        await userIdInput.fill(userId);
        await passwordInput.fill('test1234');
        await passwordInput.press('Enter');
        await page.waitForTimeout(4000);

        return loginResponse;
    };

    test('should debug existing test user state', async ({ page }) => {
        await setupCleanPage(page);
        
        console.log('=== DEBUGGING EXISTING TEST USER ===');
        const loginResponse = await debugLogin(page, 'test_pretesta');
        
        await page.screenshot({ 
            path: 'screenshots/debug-existing-user.png',
            fullPage: true 
        });

        // Check what buttons are actually visible
        const allButtons = await page.locator('button').all();
        console.log('\nVisible buttons:');
        for (let i = 0; i < allButtons.length; i++) {
            const buttonText = await allButtons[i].textContent();
            const isVisible = await allButtons[i].isVisible();
            const isEnabled = await allButtons[i].isEnabled();
            if (isVisible) {
                console.log(`  ${i}: "${buttonText}" (enabled: ${isEnabled})`);
            }
        }
    });

    test('should test modifying user state via API during test', async ({ page, request }) => {
        await setupCleanPage(page);

        // First login to get token
        console.log('=== TESTING API USER MODIFICATION ===');
        const loginResponse = await debugLogin(page, 'test_pretesta');
        
        if (loginResponse && loginResponse.token) {
            console.log('Got token, attempting to modify user state...');
            
            // Try to mark demographics as completed via API
            try {
                const markCompletedResponse = await request.post('http://localhost:28303/api/test-completed', {
                    headers: {
                        'Authorization': `Bearer ${loginResponse.token}`,
                        'Content-Type': 'application/json'
                    },
                    data: {
                        phase: 'pretest',
                        testType: 'demographics',
                        completed: true
                    }
                });
                
                const result = await markCompletedResponse.json();
                console.log('Mark completed response:', result);
                
                // Reload page to see changes
                await page.reload();
                await page.waitForTimeout(3000);
                
                await page.screenshot({ 
                    path: 'screenshots/debug-after-api-modify.png',
                    fullPage: true 
                });
                
            } catch (error) {
                console.log('Error modifying user state:', error);
            }
        }
    });

    test('should test creating new user via registration', async ({ page }) => {
        await setupCleanPage(page);
        
        console.log('=== TESTING USER REGISTRATION ===');
        
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Look for create account or register option
        const createAccountButton = page.locator('button, a').filter({ hasText: /create account|register|sign up/i });
        
        if (await createAccountButton.first().isVisible()) {
            console.log('Found create account option, testing registration...');
            await createAccountButton.first().click();
            await page.waitForTimeout(1000);
            
            await page.screenshot({ 
                path: 'screenshots/debug-registration-form.png',
                fullPage: true 
            });
            
            // Fill registration form
            const userId = `test_api_${Date.now()}`;
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
            
            await page.screenshot({ 
                path: 'screenshots/debug-registration-filled.png',
                fullPage: true 
            });
            
            // Submit registration
            const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /create|register|submit/i });
            if (await submitButton.first().isVisible()) {
                await submitButton.first().click();
                await page.waitForTimeout(3000);
                
                await page.screenshot({ 
                    path: 'screenshots/debug-registration-complete.png',
                    fullPage: true 
                });
                
                console.log(`Successfully registered new user: ${userId}`);
            }
        } else {
            console.log('No create account option found');
        }
    });

    test('should test different user states by manipulating existing user', async ({ page, request }) => {
        await setupCleanPage(page);
        
        // Login with existing user
        const loginResponse = await debugLogin(page, 'test_pretesta');
        
        if (!loginResponse || !loginResponse.token) {
            console.log('❌ Login failed, cannot test user state manipulation');
            return;
        }
        
        const token = loginResponse.token;
        const baseURL = 'http://localhost:28303';
        
        // Test different states by completing different activities
        const stateTests = [
            {
                name: 'demographics-completed',
                phase: 'pretest',
                testType: 'demographics',
                description: 'Demographics completed - should show intelligibility'
            },
            {
                name: 'intelligibility-completed', 
                phase: 'pretest',
                testType: 'intelligibility',
                description: 'Intelligibility completed - should show listening effort'
            },
            {
                name: 'effort-completed',
                phase: 'pretest', 
                testType: 'effort',
                description: 'Listening effort completed - should show comprehension'
            },
            {
                name: 'comprehension-completed',
                phase: 'pretest',
                testType: 'comprehension', 
                description: 'All pretest completed - should show training available'
            }
        ];
        
        for (const stateTest of stateTests) {
            console.log(`\n=== TESTING ${stateTest.name.toUpperCase()} ===`);
            
            try {
                // Mark this test as completed
                const response = await request.post(`${baseURL}/api/test-completed`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    data: {
                        phase: stateTest.phase,
                        testType: stateTest.testType,
                        completed: true
                    }
                });
                
                if (response.ok()) {
                    const result = await response.json();
                    console.log(`✅ Marked ${stateTest.testType} as completed`);
                    console.log('Updated completedTests:', result.completedTests);
                    
                    // Reload page to see new state
                    await page.reload();
                    await page.waitForTimeout(3000);
                    
                    await page.screenshot({ 
                        path: `screenshots/debug-state-${stateTest.name}.png`,
                        fullPage: true 
                    });
                    
                    // Check what new buttons are available
                    const buttons = await page.locator('button').filter({ hasText: /.+/ }).all();
                    console.log('Available buttons after completing', stateTest.testType, ':');
                    for (const button of buttons) {
                        const text = await button.textContent();
                        const isVisible = await button.isVisible();
                        const isEnabled = await button.isEnabled();
                        if (isVisible && isEnabled && text.trim()) {
                            console.log(`  • "${text.trim()}"`);
                        }
                    }
                    
                } else {
                    console.log(`❌ Failed to mark ${stateTest.testType} as completed:`, response.status());
                }
                
            } catch (error) {
                console.log(`❌ Error testing ${stateTest.name}:`, error.message);
            }
        }
    });

    test.afterEach(async ({ page }) => {
        // Clean up session data
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });
});