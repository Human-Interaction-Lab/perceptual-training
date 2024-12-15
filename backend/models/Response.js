// backend/models/Response.js
const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        ref: 'User' // This creates a reference to the User model
    },
    phase: {
        type: String,
        required: true,
        enum: ['pretest', 'training', 'posttest']
    },
    trainingDay: {
        type: Number,
        min: 1,
        max: 4,
        required: function () {
            return this.phase === 'training';
        }
    },
    stimulusId: {
        type: String,
        required: true
    },
    response: {
        type: String,
        required: true
    },
    correct: {
        type: Boolean,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Add indexes for common queries
responseSchema.index({ userId: 1, phase: 1 });
responseSchema.index({ userId: 1, timestamp: -1 });

const Response = mongoose.model('Response', responseSchema);

module.exports = Response;