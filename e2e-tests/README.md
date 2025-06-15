# E2E Testing Setup

## Quick Start

1. **Start your application** (in separate terminal):
   ```bash
   npm run dev
   ```

2. **Run the comprehensive test suite**:
   ```bash
   npm run test:e2e
   ```

## Available Commands

```bash
# Run tests in headless mode (recommended)
npm run test:e2e

# Run tests with visual UI (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests step-by-step
npm run test:e2e:debug

# View last test report
npm run test:e2e:report
```

## What Gets Tested & Screenshot

The comprehensive test captures:

### 📸 **Screenshots Generated:**
- `final-01-login-page.png` - Initial login interface
- `final-02-filled-login.png` - Login form with credentials
- `final-03-phase-selection.png` - Main phase selection screen
- `final-04-[activity].png` - Each activity interface (demographics, intelligibility, comprehension, effort, training)
- `final-05-[activity]-interface.png` - Detailed view of each test interface
- `final-06-[activity]-started.png` - Active test sessions
- `final-08-responsive-[device].png` - Desktop/tablet/mobile views
- `final-10-time-bypassed.png` - Training interfaces (with time restrictions bypassed)
- `final-11-training-interface.png` - Training session details

### 🔄 **User Flows Tested:**
- ✅ Complete login process with real test user (`test_pretesta`)
- ✅ Phase selection navigation
- ✅ All test types: Intelligibility, Comprehension, Listening Effort
- ✅ Training interfaces (with time bypass)
- ✅ Audio player functionality
- ✅ Responsive design (desktop/tablet/mobile)
- ✅ Form interactions and validations

### 🚨 **Problem Detection:**
- Login failures
- Missing UI components
- Broken navigation
- API endpoint issues
- Responsive design problems
- Audio player malfunctions

## Test User Credentials

- **Username:** `test_pretesta`
- **Password:** `test1234`

## Prerequisites

- Application running on `http://localhost:3001` (frontend)
- Backend running on `http://localhost:28303`
- Test users initialized (should exist automatically)

## Troubleshooting

If tests fail:
1. Ensure `npm run dev` is running successfully
2. Check that both frontend (3001) and backend (28303) are accessible
3. Verify test user exists with: `curl -X POST http://localhost:28303/api/login -H "Content-Type: application/json" -d '{"userId":"test_pretesta","password":"test1234"}'`

## Screenshots Location

All screenshots are saved to: `screenshots/final-*.png`