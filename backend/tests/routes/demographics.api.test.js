// tests/routes/demographics.test.js
const request = require('supertest');
const app = require('../../server'); // Update path as needed
const Demographics = require('../../models/Demographics');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

describe('Demographics API', () => {
    let token;
    let userId;

    beforeEach(async () => {
        // Create a test user and generate token
        const user = await User.create({
            userId: 'testuser',
            email: 'test@test.com',
            password: 'password123'
        });
        userId = user.userId;
        token = jwt.sign(
            { userId: user.userId },
            process.env.JWT_SECRET || 'your_jwt_secret'
        );
    });

    const validDemographicsData = {
        dateOfBirth: '1980-01-01',
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

    describe('POST /api/demographics', () => {
        it('should create new demographics', async () => {
            const response = await request(app)
                .post('/api/demographics')
                .set('Authorization', `Bearer ${token}`)
                .send(validDemographicsData);

            expect(response.status).toBe(201);
            expect(response.body.cpibTotalScore).toBe(30);
        });

        it('should reject invalid CPIB data', async () => {
            const invalidData = {
                ...validDemographicsData,
                cpib: {
                    ...validDemographicsData.cpib,
                    talkingKnownPeople: { response: '5' }
                }
            };

            const response = await request(app)
                .post('/api/demographics')
                .set('Authorization', `Bearer ${token}`)
                .send(invalidData);

            expect(response.status).toBe(400);
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