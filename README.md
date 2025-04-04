# Perceptual Learning Application

Application for data collection for PL study, which includes three phases:

1. Pretest
2. Training (4 days)
3. Posttests (1-week and 1-month follow-up)

## Usage

The application consists of a frontend (React) and backend (Node.js/Express) component.

## Setting Up Test Users

The application has built-in test users for development and testing:

- `test_pretest`: A user who is ready to start the pretest (no tests completed yet)
- `test_training`: A user who is on training day 1
- `test_training2`: A user who is on training day 2
- `test_posttest`: A user who has completed all training and is ready for posttest1
- And several other test users with varying levels of completion

### Test User Progress Reset

The application **automatically clears localStorage progress data** for test users when they've been recently reinitialized. This happens when:

1. Backend is restarted or the initializeUsers script runs
2. A test user logs in within 10 minutes of initialization
3. The system detects a "fresh initialization" flag

This ensures test users always start with a clean slate when the backend is reinitialized, without requiring manual intervention.

#### Manual Cleanup

If you need to manually clear progress data:

1. Visit `/clear-test-users.html` in your browser
2. Click the "Clear Test User Progress" button
3. The page will clear all localStorage items for test users

This manual option is available as a fallback, but is usually not needed since the system handles test user reset automatically.
