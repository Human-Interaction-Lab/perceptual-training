const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // Less restrictive email pattern
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    speaker: {
        type: String,
        required: true
    },
    currentPhase: {
        type: String,
        enum: ['pretest', 'training', 'posttest1', 'posttest2', 'posttest3'],
        default: 'pretest'
    },
    trainingDay: {
        type: Number,
        min: 1,
        max: 4,
        default: 1
    },
    pretestDate: {
        type: Date,
        default: null
    },
    trainingCompletedDate: {
        type: Date,
        default: null
    },
    completed: {
        type: Boolean,
        default: false
    },
    completedTests: {
        type: Map,
        of: Boolean,
        default: new Map()
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    // Field to track when test users were last initialized
    // Only set on the admin user
    testUsersInitializedAt: {
        type: Date,
        default: null
    },
    // Field to track last notification time for each activity to prevent duplicate emails
    lastNotifiedActivities: {
        type: Map,
        of: Date,
        default: new Map()
    }
}, {
    timestamps: true
});

/**
 * Mark a test as completed with phase prefix
 * @param {String} phase - The phase (pretest, posttest1, etc.)
 * @param {String} testId - The test identifier
 * @param {Boolean} completed - Whether the test is completed
 * @returns {void}
 */
userSchema.methods.markTestCompleted = function (phase, testId, completed = true) {
    // Create a prefixed key for this test
    const prefixedKey = `${phase}_${testId}`;
    this.completedTests.set(prefixedKey, completed);
};

/**
 * Check if a test is completed for a specific phase
 * @param {String} phase - The phase (pretest, posttest1, etc.)
 * @param {String} testId - The test identifier
 * @returns {Boolean} - Whether the test is completed
 */
userSchema.methods.isTestCompleted = function (phase, testId) {
    const prefixedKey = `${phase}_${testId}`;
    return this.completedTests.get(prefixedKey) === true;
};

/**
 * Get all completed tests for a specific phase
 * @param {String} phase - The phase (pretest, posttest1, etc.)
 * @returns {Array} - Array of completed test IDs
 */
userSchema.methods.getCompletedTestsForPhase = function (phase) {
    const prefix = `${phase}_`;
    const completedTests = [];

    this.completedTests.forEach((completed, key) => {
        if (key.startsWith(prefix) && completed) {
            completedTests.push(key.substring(prefix.length));
        }
    });

    return completedTests;
};

/**
 * Check if all required tests are completed for a phase
 * @param {String} phase - The phase to check
 * @param {Array} requiredTests - Array of test IDs required for completion
 * @returns {Boolean} - Whether all required tests are completed
 */
userSchema.methods.hasCompletedAllTests = function (phase, requiredTests) {
    if (!requiredTests || !requiredTests.length) return false;

    return requiredTests.every(testId => this.isTestCompleted(phase, testId));
};



userSchema.methods.needsReminder = function () {
    if (!this.pretestDate) {
        return null;
    }

    const { toEasternTime, daysBetween } = require('../utils');

    // Calculate days difference using Eastern Time
    const daysDiff = daysBetween(this.pretestDate);

    // Training phase logic (days 1-4)
    if (daysDiff >= 1 && daysDiff <= 4) {
        return {
            type: 'training',
            day: daysDiff
        };
    }

    // Posttest1 reminder (day 12)
    if (daysDiff === 12) {
        return {
            type: 'posttest1',
            day: null
        };
    }

    // Posttest2 reminder (day 35)
    if (daysDiff === 35) {
        return {
            type: 'posttest2',
            day: null
        };
    }

    // Backward compatibility - generic posttest reminder
    if (daysDiff === 5) {
        return {
            type: 'posttest',
            day: null
        };
    }

    return null;
};

const User = mongoose.model('User', userSchema);

module.exports = User;