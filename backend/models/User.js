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
        match: /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/
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
        enum: ['pretest', 'training', 'posttest'],
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
    }
}, {
    timestamps: true
});

userSchema.methods.needsReminder = function () {
    if (!this.pretestDate) {
        return null;
    }

    // Create dates with time set to start of day for consistent comparison
    const pretest = new Date(this.pretestDate);
    pretest.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate full days between dates
    const msDiff = today.getTime() - pretest.getTime();
    const daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));

    // Training phase logic (days 1-4)
    if (daysDiff >= 1 && daysDiff <= 4) {
        return {
            type: 'training',
            day: daysDiff
        };
    }

    // Posttest reminder (day 5)
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