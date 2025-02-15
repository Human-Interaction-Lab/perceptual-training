// backend/models/Response.js
const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        ref: 'User'
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
    rating: {
        type: Number,
        min: 1,
        max: 100
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

// Create compound indexes
responseSchema.index({ userId: 1, phase: 1 });
responseSchema.index({ userId: 1, timestamp: -1 });

// Ensure indexes are created
responseSchema.set('autoIndex', true);

const Response = mongoose.model('Response', responseSchema);

// Create indexes immediately instead of waiting for first query
Response.createIndexes().catch(err => {
    console.error('Error creating indexes:', err);
});

module.exports = Response;