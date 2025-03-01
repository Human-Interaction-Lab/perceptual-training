// tests/routes/demographics.test.js
jest.mock('../../boxService', () => require('../__mocks__/boxService'));

const request = require('supertest');
const { mongoose } = require('../setup');  // Import mongoose from setup
const { app } = require('../../server');  // Don't import startServer
const Demographics = require('../../models/Demographics');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

describe('Demographics API', () => {
    let token;
    let userId;
    let server;

    beforeAll(async () => {
        // Verify connection is already established by setup.js
        console.log('Current connection state:', mongoose.connection.readyState);
        server = app.listen(0);
    });

    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    beforeEach(async () => {
        // Create test user
        const uniqueId = `testuser_${Date.now()}`;
        const user = await User.create({
            userId: uniqueId,
            email: `${uniqueId}@test.com`,
            password: 'password123',
            speaker: "testSpeaker"
        });

        userId = user.userId;
        token = jwt.sign(
            { userId: user.userId },
            process.env.JWT_SECRET || 'your_jwt_secret'
        );
    });

    afterEach(async () => {
        await User.deleteMany({});
        await Demographics.deleteMany({});
    });

    const validDemographicsData = {
        dateOfBirth: '1980-01-01',
        ethnicity: 'Not Hispanic or Latino',
        race: 'White',
        sexAssignedAtBirth: 'Male',
        isEnglishPrimary: 'Yes',
        cognitiveImpairment: 'No',
        hearingLoss: 'No',
        hearingAids: 'No',
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

    describe('POST /api/demographics', () => {
        it('should create new demographics', async () => {
            const response = await request(app)
                .post('/api/demographics')
                .set('Authorization', `Bearer ${token}`)
                .send(validDemographicsData);

            expect(response.status).toBe(201);
            expect(response.body.userId).toBe(userId);
        });
    });

    describe('GET /api/demographics/:userId', () => {
        it('should retrieve demographics for a user', async () => {
            // First create demographics
            await Demographics.create({
                ...validDemographicsData,
                userId
            });

            const response = await request(app)
                .get(`/api/demographics/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.userId).toBe(userId);
        });

        it('should return 404 for non-existent demographics', async () => {
            const response = await request(app)
                .get('/api/demographics/nonexistentuser')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(404);
        });
    });
});