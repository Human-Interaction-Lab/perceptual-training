// backend/models/Demographics.js
const mongoose = require('mongoose');

const hearingThresholdSchema = new mongoose.Schema({
    frequency: {
        type: Number,
        required: true,
        enum: [250, 500, 1000, 2000, 4000, 8000]
    },
    leftEar: {
        type: Number,
        min: -10,
        max: 120
    },
    rightEar: {
        type: Number,
        min: -10,
        max: 120
    }
});

const demographicsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        ref: 'User'
    },
    dateOfBirth: {
        type: Date,
        required: true,
        max: new Date()
    },
    ethnicity: {
        type: String,
        required: true,
        enum: [
            'Hispanic or Latino',
            'Not Hispanic or Latino',
            'Prefer not to answer'
        ]
    },
    race: {
        type: String,
        required: true,
        enum: [
            'American Indian or Alaska Native',
            'Asian',
            'Black or African American',
            'Native Hawaiian or Other Pacific Islander',
            'White',
            'Multiple races',
            'Prefer not to answer'
        ]
    },
    sexAssignedAtBirth: {
        type: String,
        required: true,
        enum: ['Male', 'Female', 'Prefer not to answer']
    },
    isEnglishPrimary: {
        type: String,
        required: true,
        enum: ['Yes', 'No', 'Unknown']
    },
    cognitiveImpairment: {
        type: String,
        required: true,
        enum: ['Yes', 'No', 'Unknown']
    },
    hearingLoss: {
        type: String,
        required: true,
        enum: ['Yes', 'No', 'Unknown']
    },
    hearingAids: {
        type: String,
        required: true,
        enum: ['Yes', 'No', 'Unknown']
    },
    relationshipToPartner: {
        type: String,
        required: true,
        enum: ['Spouse/Partner', 'Child', 'Sibling', 'Friend', 'Other']
    },
    relationshipOther: {
        type: String,
        required: function () {
            return this.relationshipToPartner === 'Other';
        },
        trim: true
    },
    communicationFrequency: {
        type: String,
        required: true,
        enum: [
            'Daily',
            'Several Days Per Week',
            'Weekly',
            'Monthly',
            'Less than Monthly'
        ]
    },
    communicationType: {
        type: String,
        required: true,
        enum: [
            'Face to face',
            'Phone (audio only)',
            'Video chat'
        ]
    },
    formCompletedBy: {
        type: String,
        required: true,
        enum: ['Participant', 'Research Personnel']
    },
    researchData: {
        hearingTestType: {
            type: String,
            enum: ['Full Threshold Testing', 'Hearing Screened', 'Hearing Not Tested'],
            required: function () {
                return this.formCompletedBy === 'Research Personnel';
            }
        },
        hearingScreenResult: {
            type: String,
            enum: ['Pass', 'Fail'],
            required: function () {
                return this.researchData?.hearingTestType === 'Hearing Screened';
            }
        },
        hearingThresholds: [hearingThresholdSchema],
        notes: {
            type: String,
            trim: true
        }
    },
    submitted: {
        type: Date,
        default: Date.now
    }
});

// Add indexes for common queries
demographicsSchema.index({ userId: 1 }, { unique: true });
demographicsSchema.index({ submitted: -1 });

const Demographics = mongoose.model('Demographics', demographicsSchema);

module.exports = Demographics;