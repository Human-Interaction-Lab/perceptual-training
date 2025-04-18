// tests/models/response.test.js
const { mongoose } = require('../setup');
const Response = require('../../models/Response');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { app } = require('../../server');

describe('Response Model Test', () => {
    let testUser;

    beforeAll(async () => {
        // Create a test user for foreign key reference
        testUser = await User.create({
            userId: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            speaker: 'testSpeaker'
        });
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Response.deleteMany({});
    });

    beforeEach(async () => {
        await Response.deleteMany({});
    });

    const validResponseData = {
        userId: 'testuser',
        phase: 'pretest',
        stimulusId: 'stimulus_1',
        response: 'user_response',
        rating: 10,
        correct: true
    };

    describe('Response Validation', () => {
        it('should create & save response successfully', async () => {
            const validResponse = new Response(validResponseData);
            const savedResponse = await validResponse.save();

            expect(savedResponse._id).toBeDefined();
            expect(savedResponse.userId).toBe(validResponseData.userId);
            expect(savedResponse.phase).toBe(validResponseData.phase);
            expect(savedResponse.stimulusId).toBe(validResponseData.stimulusId);
            expect(savedResponse.response).toBe(validResponseData.response);
            expect(savedResponse.rating).toBe(validResponseData.rating);
            expect(savedResponse.correct).toBe(validResponseData.correct);
            expect(savedResponse.timestamp).toBeDefined();
        });

        it('should fail to save response without required fields', async () => {
            const responseWithoutRequired = new Response({
                userId: 'testuser'
            });

            let err;
            try {
                await responseWithoutRequired.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
            expect(err.errors.phase).toBeDefined();
            expect(err.errors.stimulusId).toBeDefined();
            expect(err.errors.response).toBeDefined();
        });

        it('should fail to save response with invalid phase', async () => {
            const responseWithInvalidPhase = new Response({
                ...validResponseData,
                phase: 'invalid_phase'
            });

            let err;
            try {
                await responseWithInvalidPhase.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
            expect(err.errors.phase).toBeDefined();
        });

        it('should require trainingDay for training phase', async () => {
            const trainingResponse = new Response({
                ...validResponseData,
                phase: 'training'
            });

            let err;
            try {
                await trainingResponse.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
            expect(err.errors.trainingDay).toBeDefined();
        });

        it('should save training response with valid trainingDay', async () => {
            const trainingResponse = new Response({
                ...validResponseData,
                phase: 'training',
                trainingDay: 2
            });

            const savedResponse = await trainingResponse.save();
            expect(savedResponse.trainingDay).toBe(2);
        });

        it('should fail to save training response with invalid trainingDay', async () => {
            const responseWithInvalidDay = new Response({
                ...validResponseData,
                phase: 'training',
                trainingDay: 5 // Max is 4
            });

            let err;
            try {
                await responseWithInvalidDay.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
            expect(err.errors.trainingDay).toBeDefined();
        });

        it('should not require trainingDay for non-training phases', async () => {
            const pretestResponse = new Response({
                ...validResponseData,
                phase: 'pretest'
            });

            const savedResponse = await pretestResponse.save();
            expect(savedResponse.trainingDay).toBeUndefined();

            const posttestResponse = new Response({
                ...validResponseData,
                phase: 'posttest1'
            });

            const savedPosttest = await posttestResponse.save();
            expect(savedPosttest.trainingDay).toBeUndefined();
        });
    });

    describe('Response Indexes', () => {
        it('should have compound index for userId and phase', async () => {
            const indexes = await Response.collection.getIndexes();
            const hasUserPhaseIndex = indexes.hasOwnProperty('userId_1_phase_1');
            expect(hasUserPhaseIndex).toBe(true);

            // Verify the index structure
            const indexDef = indexes['userId_1_phase_1'];
            expect(indexDef).toEqual([['userId', 1], ['phase', 1]]);
        });

        it('should have compound index for userId and timestamp', async () => {
            const indexes = await Response.collection.getIndexes();
            const hasUserTimestampIndex = indexes.hasOwnProperty('userId_1_timestamp_-1');
            expect(hasUserTimestampIndex).toBe(true);

            // Verify the index structure
            const indexDef = indexes['userId_1_timestamp_-1'];
            expect(indexDef).toEqual([['userId', 1], ['timestamp', -1]]);
        });

        it('should list all indexes', async () => {
            const indexes = await Response.collection.getIndexes();
            console.log('Available indexes:', indexes);
        });
    });

    describe('Late Training Transitions', () => {
        it('should allow transition to posttest after day 4', async () => {
            // Create user in training phase
            const user = await User.create({
                userId: 'lateuser',
                email: 'late@test.com',
                password: 'password123',
                speaker: 'testSpeaker',
                currentPhase: 'training',
                trainingDay: 4,
                pretestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
            });

            const token = jwt.sign(
                { userId: user.userId },
                process.env.JWT_SECRET || 'your_jwt_secret'
            );

            // Submit training response for day 4
            const response = await request(app)
                .post('/api/response')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    phase: 'training',
                    stimulusId: 'stimulus_1',
                    response: 'user_response',
                    trainingDay: 4
                });

            expect(response.status).toBe(201);
            expect(response.body.currentPhase).toBe('posttest1');
        });

        it('should allow catching up on missed training days', async () => {
            // Create user who missed a day
            const user = await User.create({
                userId: 'catchupuser',
                email: 'catchup@test.com',
                password: 'password123',
                currentPhase: 'training',
                speaker: 'testSpeaker',
                trainingDay: 2,
                pretestDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
            });

            const token = jwt.sign(
                { userId: user.userId },
                process.env.JWT_SECRET || 'your_jwt_secret'
            );

            // Submit training response for day 2 late
            const response = await request(app)
                .post('/api/response')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    phase: 'training',
                    stimulusId: 'stimulus_1',
                    response: 'user_response',
                    trainingDay: 2
                });

            expect(response.status).toBe(201);
            expect(response.body.trainingDay).toBe(3);
        });
    });
});
