// tests/models/prefixed-tests.test.js
const { mongoose } = require('../setup');
const User = require('../../models/User');
const testConfig = require('../../utils/testConfig');

describe('Prefixed Test Tracking', () => {
    let testUser;

    beforeEach(async () => {
        await User.deleteMany({});

        testUser = new User({
            userId: 'testuser123',
            email: 'test@example.com',
            password: 'password123',
            speaker: 'GraceNorman',
            currentPhase: 'pretest'
        });

        await testUser.save();
    });

    afterAll(async () => {
        await User.deleteMany({});
    });

    describe('Test Completion Methods', () => {
        it('should mark tests as completed with phase prefix', async () => {
            // Mark a test as completed
            testUser.markTestCompleted('pretest', 'COMPREHENSION_1');
            await testUser.save();

            // Reload user from database
            const savedUser = await User.findOne({ userId: 'testuser123' });

            // Check if test is marked as completed
            expect(savedUser.completedTests.get('pretest_COMPREHENSION_1')).toBe(true);
        });

        it('should check if a test is completed', async () => {
            // Mark tests as completed
            testUser.markTestCompleted('pretest', 'COMPREHENSION_1');
            testUser.markTestCompleted('pretest', 'EFFORT_1');
            await testUser.save();

            // Check completed tests
            expect(testUser.isTestCompleted('pretest', 'COMPREHENSION_1')).toBe(true);
            expect(testUser.isTestCompleted('pretest', 'EFFORT_1')).toBe(true);
            expect(testUser.isTestCompleted('pretest', 'COMPREHENSION_2')).toBe(false);
        });

        it('should get all completed tests for a phase', async () => {
            // Mark multiple tests as completed
            testUser.markTestCompleted('pretest', 'COMPREHENSION_1');
            testUser.markTestCompleted('pretest', 'EFFORT_1');
            testUser.markTestCompleted('posttest1', 'COMPREHENSION_1');
            await testUser.save();

            // Get completed tests for pretest
            const pretestCompleted = testUser.getCompletedTestsForPhase('pretest');

            expect(pretestCompleted).toContain('COMPREHENSION_1');
            expect(pretestCompleted).toContain('EFFORT_1');
            expect(pretestCompleted).not.toContain('COMPREHENSION_2');
            expect(pretestCompleted.length).toBe(2);

            // Get completed tests for posttest1
            const posttest1Completed = testUser.getCompletedTestsForPhase('posttest1');

            expect(posttest1Completed).toContain('COMPREHENSION_1');
            expect(posttest1Completed.length).toBe(1);
        });

        it('should check if all required tests are completed', async () => {
            // Define required tests
            const requiredTests = ['COMPREHENSION_1', 'EFFORT_1', 'INTELLIGIBILITY_1'];

            // Initially no tests are completed
            expect(testUser.hasCompletedAllTests('pretest', requiredTests)).toBe(false);

            // Mark some tests as completed
            testUser.markTestCompleted('pretest', 'COMPREHENSION_1');
            testUser.markTestCompleted('pretest', 'EFFORT_1');
            await testUser.save();

            // Still not all tests completed
            expect(testUser.hasCompletedAllTests('pretest', requiredTests)).toBe(false);

            // Mark remaining test as completed
            testUser.markTestCompleted('pretest', 'INTELLIGIBILITY_1');
            await testUser.save();

            // Now all tests should be completed
            expect(testUser.hasCompletedAllTests('pretest', requiredTests)).toBe(true);
        });
    });

    describe('Test Config Utility', () => {
        it('should check phase completion using test config', async () => {
            // Mark all required pretest tests as completed
            testConfig.requiredTests.pretest.forEach(testId => {
                testUser.markTestCompleted('pretest', testId);
            });
            await testUser.save();

            // Check phase completion
            expect(testConfig.hasCompletedPhase(testUser, 'pretest')).toBe(true);
            expect(testConfig.hasCompletedPhase(testUser, 'posttest1')).toBe(false);
        });

        it('should get completed tests using test config', async () => {
            // Mark some tests as completed
            testUser.markTestCompleted('pretest', 'COMPREHENSION_1');
            testUser.markTestCompleted('pretest', 'EFFORT_1');
            await testUser.save();

            // Get completed tests
            const completed = testConfig.getCompletedTests(testUser, 'pretest');

            expect(completed).toContain('COMPREHENSION_1');
            expect(completed).toContain('EFFORT_1');
            expect(completed.length).toBe(2);
        });

        it('should determine next phase', () => {
            expect(testConfig.getNextPhase('pretest')).toBe('training');
            expect(testConfig.getNextPhase('training')).toBe('posttest1');
            expect(testConfig.getNextPhase('posttest1')).toBe('posttest2');
            expect(testConfig.getNextPhase('posttest3')).toBeNull();
        });

        it('should check if user can proceed today', () => {
            // Set pretest date to yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            testUser.pretestDate = yesterday;

            // Should be able to proceed with training on day 1
            expect(testConfig.canProceedToday(testUser, 'training')).toBe(true);

            // Should not be able to proceed with posttest1 yet
            expect(testConfig.canProceedToday(testUser, 'posttest1')).toBe(false);

            // Set pretest date to 5 days ago
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 12);
            testUser.pretestDate = fiveDaysAgo;

            // Should be able to proceed with posttest1 now
            expect(testConfig.canProceedToday(testUser, 'posttest1')).toBe(true);
        });
    });
});