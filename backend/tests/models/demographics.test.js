// tests/models/demographics.test.js
const { mongoose } = require('../setup');  // Import mongoose from setup
const Demographics = require('../../models/Demographics');

describe('Demographics Model Test', () => {

    const validDemographicsData = {
        userId: '12345',
        dateOfBirth: new Date('1980-01-01'),
        ethnicity: 'Not Hispanic or Latino',
        race: 'White',
        sexAssignedAtBirth: 'Male',
        isEnglishPrimary: 'No',
        cognitiveImpairment: 'No',
        hearingLoss: 'No',
        hearingAids: 'Yes',
        relationshipToPartner: 'Spouse/Partner',
        communicationFrequency: 'Daily',
        communicationType: 'Face to face',
        formCompletedBy: 'Participant',
        researchData: {
            hearingTestType: 'Hearing Screened',
            hearingScreenResult: 'Pass',
            hearingThresholds: [],
            notes: 'Stuff'
        }
    };

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Demographics.deleteMany({});
    });

    it('should create & save demographics successfully', async () => {
        expect(mongoose.connection.readyState).toBe(1); // Verify connection before test

        const validDemographics = new Demographics(validDemographicsData);
        const savedDemographics = await validDemographics.save();

        expect(savedDemographics._id).toBeDefined();
        expect(savedDemographics.userId).toBe(validDemographicsData.userId);
    }, 10000);
});