// backend/models/Demographics.js
const mongoose = require('mongoose');

const hearingThresholdSchema = new mongoose.Schema({
    frequency: {
        type: Number,
        required: true,
        enum: [250, 500, 1000, 2000, 4000, 8000] // Standard audiometry frequencies in Hz
    },
    leftEar: {
        type: Number,
        min: -10,
        max: 120 // Standard dB HL range
    },
    rightEar: {
        type: Number,
        min: -10,
        max: 120
    }
});

// Define CPIB question schema
const cpibQuestionSchema = new mongoose.Schema({
    response: {
        type: String,
        required: true,
        enum: ['0', '1', '2', '3'], // 0: Very much, 1: Quite a bit, 2: A little, 3: Not at all
        validate: {
            validator: function (v) {
                return ['0', '1', '2', '3'].includes(v);
            },
            message: props => `${props.value} is not a valid CPIB response`
        }
    }
});

const cpibSchema = new mongoose.Schema({
    talkingKnownPeople: cpibQuestionSchema,
    communicatingQuickly: cpibQuestionSchema,
    talkingUnknownPeople: cpibQuestionSchema,
    communicatingCommunity: cpibQuestionSchema,
    askingQuestions: cpibQuestionSchema,
    communicatingSmallGroup: cpibQuestionSchema,
    longConversation: cpibQuestionSchema,
    detailedInformation: cpibQuestionSchema,
    fastMovingConversation: cpibQuestionSchema,
    persuadingOthers: cpibQuestionSchema
});

// Add method to calculate CPIB score
cpibSchema.methods.calculateScore = function () {
    const responses = Object.values(this.toObject()).map(q => parseInt(q.response));
    return responses.reduce((sum, val) => sum + val, 0);
};

const demographicsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        ref: 'User',
        unique: true
    },
    // Participant Information
    dateOfBirth: {
        type: Date,
        required: true,
        max: new Date() // Cannot be in the future
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
        type: Boolean,
        required: true
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
        type: Boolean,
        required: true
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

    // CPIB Form data
    cpib: {
        type: cpibSchema,
        required: true
    },
    cpibTotalScore: {
        type: Number,
        min: 0,
        max: 30
    },

    // Research Personnel Section
    formCompletedBy: {
        type: String,
        required: true,
        enum: ['Participant', 'Research Personnel']
    },
    // Only required if formCompletedBy is 'Research Personnel'
    researchData: {
        hearingScreeningCompleted: {
            type: Boolean,
            required: function () {
                return this.formCompletedBy === 'Research Personnel';
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
demographicsSchema.index({ userId: 1 });
demographicsSchema.index({ submitted: -1 });

// Validation middleware
demographicsSchema.pre('validate', function (next) {
    // Validate research data is present when form is completed by research personnel
    if (this.formCompletedBy === 'Research Personnel' && !this.researchData) {
        this.invalidate('researchData', 'Research data is required when form is completed by research personnel');
    }

    // Additional validations can be added here

    next();
});

const Demographics = mongoose.model('Demographics', demographicsSchema);

module.exports = Demographics;