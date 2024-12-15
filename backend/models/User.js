const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (v) {
                return /\S+@\S+\.\S+/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        }
    },
    currentPhase: {
        type: String,
        enum: ['pretest', 'training', 'posttest'],
        default: 'pretest'
    },
    trainingDay: {
        type: Number,
        default: 1,
        min: 1,
        max: 4
    },
    pretestDate: {
        type: Date
    },
    completed: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastEmailSent: {  // New field to track email sending
        type: Date
    }
});

// Add an index for efficient querying of users needing reminders
userSchema.index({
    pretestDate: 1,
    completed: 1,
    currentPhase: 1
});

// Add a method to check if user needs a reminder
userSchema.methods.needsReminder = function () {
    if (!this.pretestDate || this.completed) return false;

    const today = new Date();
    const pretest = new Date(this.pretestDate);
    const daysSincePretest = Math.floor((today - pretest) / (1000 * 60 * 60 * 24));

    // Check if we should send a training reminder (days 1-4)
    if (daysSincePretest >= 0 && daysSincePretest < 4) {
        return {
            type: 'training',
            day: daysSincePretest + 2
        };
    }

    // Check if we should send a posttest reminder (day 5)
    if (daysSincePretest === 4) {
        return {
            type: 'posttest'
        };
    }

    return false;
};

const User = mongoose.model('User', userSchema);

module.exports = User;