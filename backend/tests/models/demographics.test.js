// tests/models/Demographics.test.js
const mongoose = require('mongoose');
const { app } = require('../../server');
const Demographics = require('../../models/Demographics');

describe('Demographics Model Test', () => {
    // Define the valid demographics data outside the test cases
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

    beforeEach(async () => {
        await Demographics.deleteMany({}); // Clear demographics collection before each test
    });

    it('should create & save demographics successfully', async () => {
        const validDemographics = new Demographics(validDemographicsData);
        const savedDemographics = await validDemographics.save();

        // Use specific assertions instead of expect(savedDemographics).toBeDefined()
        expect(savedDemographics._id).toBeDefined();
        expect(savedDemographics.cpibTotalScore).toBe(30);
        expect(savedDemographics.userId).toBe(validDemographicsData.userId);
    }, 10000); // Individual timeout for this specific test

    it('should fail to save demographics with invalid CPIB response', async () => {
        const invalidDemographics = new Demographics({
            ...validDemographicsData,
            cpib: {
                ...validDemographicsData.cpib,
                talkingKnownPeople: { response: '5' } // Invalid response
            }
        });

        let err;
        try {
            await invalidDemographics.save();
        } catch (error) {
            err = error;
        }
        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    });

    it('should require research data when form is completed by research personnel', async () => {
        const researchDemographics = new Demographics({
            ...validDemographicsData,
            formCompletedBy: 'Research Personnel'
        });

        let err;
        try {
            await researchDemographics.save();
        } catch (error) {
            err = error;
        }
        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    });

    it('should calculate CPIB score correctly', async () => {
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
    });
});