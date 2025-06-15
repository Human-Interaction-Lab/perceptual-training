# E2E Testing with Playwright

This document explains how to use the automated end-to-end testing setup for the Perceptual Training App.

## Setup Complete ✅

- **Playwright** installed and configured
- **Headless Chrome** (and Firefox/Safari) browsers installed
- **Screenshot functionality** enabled
- **Test scripts** added to package.json

## Available Commands

```bash
# Run all E2E tests in headless mode
npm run test:e2e

# Run tests with visual UI (interactive mode)
npm run test:e2e:ui

# Run tests in headed mode (see browser window)
npm run test:e2e:headed

# Run tests in debug mode (step through tests)
npm run test:e2e:debug
```

## What Gets Tested & Screenshot

The automated tests will:

### 📸 **Screenshot Capture Points:**
1. **Homepage Initial Load** - `screenshots/01-homepage-initial.png`
2. **User Registration Flow** - `screenshots/02-user-registration.png`
3. **After Registration** - `screenshots/03-after-registration.png`
4. **Training Interface** - `screenshots/04-training-interface.png`
5. **Audio Player Interface** - `screenshots/05-audio-player.png`
6. **Different Phases** - `screenshots/06-phase-{1,2,3}.png`
7. **Test Types** - `screenshots/07-{intelligibility,comprehension,listening-effort,training}-test.png`
8. **Responsive Design** - `screenshots/08-responsive-{desktop,tablet,mobile}.png`
9. **Error States** - `screenshots/09-error-empty-input.png`
10. **Admin Interface** - `screenshots/10-admin-login.png`

### 🔄 **User Flow Testing:**
- Complete user registration process
- Navigation through different training phases
- Audio player functionality
- Different test types (intelligibility, comprehension, listening effort)
- Admin interface access
- Error handling and validation
- Responsive design across devices

### 🎯 **Activity Testing:**
- Intelligibility tests
- Comprehension tests  
- Listening effort assessments
- Training sessions
- Phase progression
- Data collection verification

## Running Your First Test

1. **Start your application** (in another terminal):
   ```bash
   npm run dev
   ```

2. **Run the E2E tests**:
   ```bash
   npm run test:e2e
   ```

3. **View results**:
   - Screenshots saved to `screenshots/` directory
   - HTML report opens automatically
   - Test results displayed in terminal

## Advanced Usage

### Custom Test Runs
```bash
# Run specific test file
npx playwright test e2e-tests/app-flow.spec.js

# Run tests on specific browser
npx playwright test --project=chromium

# Generate and view HTML report
npx playwright show-report
```

### Test Configuration
Edit `playwright.config.js` to:
- Change screenshot settings
- Add more browsers
- Modify timeout values
- Configure test parallelization

### Adding New Tests
1. Create new `.spec.js` files in `e2e-tests/` directory
2. Use the existing `app-flow.spec.js` as a template
3. Add screenshot calls: `await page.screenshot({ path: 'screenshots/my-test.png' })`

## Continuous Integration
The tests are configured to run automatically in CI environments with:
- 2 retries on failure
- Single worker (non-parallel)
- Trace collection on first retry

## Screenshots Organization
All screenshots are saved with descriptive names:
- `01-10` prefix for ordering
- Descriptive names for easy identification
- Full page screenshots by default
- Organized by test flow sequence

This setup provides comprehensive automated testing without requiring manual user interaction for each test run.