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
    cpib: {
        type: cpibSchema,
        required: true
    },
    cpibTotalScore: {
        type: Number,
        min: 0,
        max: 30
    },
    formCompletedBy: {
        type: String,
        required: true,
        enum: ['Participant', 'Research Personnel']
    },
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

// Function to calculate CPIB total score
demographicsSchema.methods.calculateCPIBScore = function () {
    if (!this.cpib) return 0;

    const responses = [
        this.cpib.talkingKnownPeople,
        this.cpib.communicatingQuickly,
        this.cpib.talkingUnknownPeople,
        this.cpib.communicatingCommunity,
        this.cpib.askingQuestions,
        this.cpib.communicatingSmallGroup,
        this.cpib.longConversation,
        this.cpib.detailedInformation,
        this.cpib.fastMovingConversation,
        this.cpib.persuadingOthers
    ];

    return responses.reduce((sum, question) => {
        return sum + (question ? parseInt(question.response) : 0);
    }, 0);
};

// Calculate CPIB total score before saving
demographicsSchema.pre('save', function (next) {
    this.cpibTotalScore = this.calculateCPIBScore();
    next();
});

// Add indexes for common queries
demographicsSchema.index({ userId: 1 }, { unique: true });
demographicsSchema.index({ submitted: -1 });

const Demographics = mongoose.model('Demographics', demographicsSchema);

module.exports = Demographics;