# E2E Testing Setup

## Quick Start

1. **Start your application** (in separate terminal):
   ```bash
   npm run dev
   ```

2. **Run the basic test suite**:
   ```bash
   npm run test:e2e
   ```

3. **Run comprehensive multi-phase testing** (shows all phases):
   ```bash
   npm run test:e2e:all-phases
   ```

## Available Commands

```bash
# Basic test with single user (fast)
npm run test:e2e

# Comprehensive test with all phases (recommended for full coverage)
npm run test:e2e:all-phases

# Interactive visual UI
npm run test:e2e:ui

# See browser during tests
npm run test:e2e:headed

# Debug tests step-by-step
npm run test:e2e:debug

# View last test report
npm run test:e2e:report

# Manual test user management (usually not needed)
npm run test:e2e:setup    # Create test users
npm run test:e2e:cleanup  # Remove test users
```

## What Gets Tested & Screenshot

The comprehensive test captures:

### 📸 **Screenshots Generated:**

**Basic Test (`npm run test:e2e`):**
- `final-01-login-page.png` - Initial login interface
- `final-02-filled-login.png` - Login form with credentials  
- `final-03-phase-selection.png` - Main phase selection screen
- `final-04-[activity].png` - Available activity interfaces
- `final-08-responsive-[device].png` - Desktop/tablet/mobile views

**Comprehensive Multi-Phase Test (`npm run test:e2e:all-phases`):**
- `phase-pretest-demographics-01-main.png` - Demographics form interface
- `phase-pretest-intelligibility-01-main.png` - Intelligibility test setup
- `phase-pretest-effort-01-main.png` - Listening effort test interface  
- `phase-pretest-comprehension-01-main.png` - Story comprehension tests
- `phase-training-selection-01-main.png` - Training day selection
- `phase-training-activity-01-main.png` - Active training session
- `phase-posttest1-01-main.png` - 1-week follow-up interface
- `phase-posttest2-01-main.png` - 1-month follow-up interface
- `progression-1-4-[phase].png` - User journey progression
- Plus detailed interface screenshots for each phase

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