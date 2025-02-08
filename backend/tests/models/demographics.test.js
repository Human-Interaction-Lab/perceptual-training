// tests/models/demographics.test.js
const mongoose = require('mongoose');
const Demographics = require('../../models/Demographics');

describe('Demographics Model Test', () => {
    jest.setTimeout(30000); // Increase timeout for all tests in this file

    const validDemographicsData = {
        userId: '12345',
        dateOfBirth: new Date('1980-01-01'),
        ethnicity: 'Not Hispanic or Latino',
        race: 'White',
        sexAssignedAtBirth: 'Male',
        isEnglishPrimary: true,
        cognitiveImpairment: 'No',
        hearingLoss: 'No',
        hearingAids: false,
        relationshipToPartner: 'Spouse/Partner',
        communicationFrequency: 'Daily',
        formCompletedBy: 'Participant',
        cpib: {
            talkingKnownPeople: { response: '3' },
            communicatingQuickly: { response: '3' },
            talkingUnknownPeople: { response: '3' },
            communicatingCommunity: { response: '3' },
            askingQuestions: { response: '3' },
            communicatingSmallGroup: { response: '3' },
            longConversation: { response: '3' },
            detailedInformation: { response: '3' },
            fastMovingConversation: { response: '3' },
            persuadingOthers: { response: '3' }
        }
    };

    beforeAll(async () => {
        try {
            await mongoose.connect(global.__MONGO_URI__, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
        } catch (err) {
            console.error('Error connecting to the database', err);
        }
    });

    afterAll(async () => {
        try {
            await mongoose.connection.close();
        } catch (err) {
            console.error('Error closing the database connection', err);
        }
    });

    beforeEach(async () => {
        try {
            // No need to connect here - already handled in setup.js
            await Demographics.deleteMany({});
        } catch (err) {
            throw err; // Rethrow to fail tests if cleanup fails
        }
    });

    it('should create & save demographics successfully', async () => {
        const validDemographics = new Demographics(validDemographicsData);
        const savedDemographics = await validDemographics.save();

        expect(savedDemographics._id).toBeDefined();
        expect(savedDemographics.userId).toBe(validDemographicsData.userId);
        expect(savedDemographics.cpibTotalScore).toBe(30);
    }, 10000);

    it('should fail to save demographics with invalid CPIB response', async () => {
        const invalidDemographics = new Demographics({
            ...validDemographicsData,
            cpib: {
                ...validDemographicsData.cpib,
                talkingKnownPeople: { response: '5' }
            }
        });

        let err;
        try {
            await invalidDemographics.save();
        } catch (error) {
            err = error;
        }
        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    }, 10000);

    it('should calculate CPIB score correctly with mixed responses', async () => {
        const mixedResponsesDemographics = new Demographics({
            ...validDemographicsData,
            cpib: {
                talkingKnownPeople: { response: '3' },
                communicatingQuickly: { response: '2' },
                talkingUnknownPeople: { response: '1' },
                communicatingCommunity: { response: '0' },
                askingQuestions: { response: '3' },
                communicatingSmallGroup: { response: '2' },
                longConversation: { response: '1' },
                detailedInformation: { response: '0' },
                fastMovingConversation: { response: '3' },
                persuadingOthers: { response: '2' }
            }
        });

        const saved = await mixedResponsesDemographics.save();
        expect(saved.cpibTotalScore).toBe(17);
    }, 10000);
});