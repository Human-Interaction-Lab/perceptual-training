/**
 * Configuration for test phases and required tests
 */
const testConfig = {
    // Phase definitions
    phases: {
        PRETEST: 'pretest',
        TRAINING: 'training',
        POSTTEST1: 'posttest1',
        POSTTEST2: 'posttest2',
        POSTTEST3: 'posttest3'
    },

    // Test types
    testTypes: {
        COMPREHENSION: 'COMPREHENSION',
        EFFORT: 'EFFORT',
        INTELLIGIBILITY: 'INTELLIGIBILITY'
    },

    // Required tests for each phase
    requiredTests: {
        pretest: [
            'COMPREHENSION_1',
            'COMPREHENSION_2',
            'EFFORT_1',
            'INTELLIGIBILITY_1',
            // Add all required pretest items
        ],
        posttest1: [
            'COMPREHENSION_1',
            'COMPREHENSION_2',
            'EFFORT_1',
            'INTELLIGIBILITY_1',
            // Add all required posttest1 items
        ],
        posttest2: [
            'COMPREHENSION_1',
            'COMPREHENSION_2',
            'EFFORT_1',
            'INTELLIGIBILITY_1',
            // Add all required posttest2 items
        ],
        posttest3: [
            'COMPREHENSION_1',
            'COMPREHENSION_2',
            'EFFORT_1',
            'INTELLIGIBILITY_1',
            // Add all required posttest3 items
        ],
        // For backward compatibility
        posttest: [
            'COMPREHENSION_1',
            'COMPREHENSION_2',
            'EFFORT_1',
            'INTELLIGIBILITY_1'
        ]
    },

    // Phase progression
    nextPhase: {
        'pretest': 'training',
        'training': 'posttest1',
        'posttest1': 'posttest2',
        'posttest2': 'posttest3',
        'posttest3': null, // End of progression
        'posttest': 'completed' // For backward compatibility
    },

    // Expected days from pretest date for each phase
    expectedDays: {
        'pretest': 0,
        'training': [1, 2, 3, 4], // Training days 1-4
        'posttest1': 12, // Updated to 12 days after pretest
        'posttest2': 35, // Updated to 35 days after pretest
        'posttest3': 90, // Example: 3 month follow-up
        'posttest': 12 // For backward compatibility
    },

    /**
     * Check if a user has completed all required tests for a phase
     * @param {Object} user - User document
     * @param {String} phase - Phase to check
     * @returns {Boolean} - Whether all tests are completed
     */
    hasCompletedPhase: function (user, phase) {
        if (!user || !phase || !this.requiredTests[phase]) {
            return false;
        }

        return this.requiredTests[phase].every(testId => {
            const prefixedKey = `${phase}_${testId}`;
            return user.completedTests.get(prefixedKey) === true;
        });
    },

    /**
     * Get all completed tests for a phase
     * @param {Object} user - User document
     * @param {String} phase - Phase to check
     * @returns {Array} - Array of completed test IDs
     */
    getCompletedTests: function (user, phase) {
        if (!user || !phase) {
            return [];
        }

        const prefix = `${phase}_`;
        const completed = [];

        user.completedTests.forEach((value, key) => {
            if (key.startsWith(prefix) && value === true) {
                completed.push(key.substring(prefix.length));
            }
        });

        return completed;
    },

    /**
     * Create a test ID with phase prefix
     * @param {String} phase - Phase prefix
     * @param {String} testType - Test type (COMPREHENSION, EFFORT, etc.)
     * @param {Number|String} testNumber - Test number or identifier
     * @returns {String} - Prefixed test ID
     */
    createTestId: function (phase, testType, testNumber) {
        return `${phase}_${testType}_${testNumber}`;
    },

    /**
     * Get the next phase after the current one
     * @param {String} currentPhase - Current phase
     * @returns {String|null} - Next phase or null if at end
     */
    getNextPhase: function (currentPhase) {
        return this.nextPhase[currentPhase] || null;
    },

    /**
     * Check if user can proceed with a phase today
     * @param {Object} user - User document 
     * @param {String} phase - Phase to check
     * @returns {Boolean} - Whether user can proceed
     */
    canProceedToday: function (user, phase) {
        if (!user || !phase || !user.pretestDate) {
            return phase === 'pretest'; // Always allow pretest
        }

        // Get days since pretest
        const pretest = new Date(user.pretestDate);
        const today = new Date();
        pretest.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const daysSincePretest = Math.floor(
            (today.getTime() - pretest.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (phase === 'training') {
            return this.expectedDays.training.includes(daysSincePretest);
        }

        // For posttests, check the expected day - use explicit phases
        if (phase === 'posttest1' || phase === 'posttest2' || phase === 'posttest3') {
            const expectedDay = this.expectedDays[phase];
            return daysSincePretest >= expectedDay;
        }

        // Backward compatibility
        if (phase === 'posttest') {
            return daysSincePretest >= this.expectedDays.posttest1;
        }

        return false;
    }
};

module.exports = testConfig;