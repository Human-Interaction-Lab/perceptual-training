// tests/models/response.test.js
const { mongoose } = require('../setup');
const Response = require('../../models/Response');
const User = require('../../models/User');

describe('Response Model Test', () => {
    let testUser;

    beforeAll(async () => {
        // Create a test user for foreign key reference
        testUser = await User.create({
            userId: 'testuser',
            email: 'test@example.com',
            password: 'password123'
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
                phase: 'posttest'
            });

            const savedPosttest = await posttestResponse.save();
            expect(savedPosttest.trainingDay).toBeUndefined();
        });
    });

    describe('Response Indexes', () => {
        it('should have compound index for userId and phase', async () => {
            const indexes = await Response.collection.getIndexes();
            const indexKeys = Object.values(indexes).map(index => index.key);
            const hasUserPhaseIndex = indexKeys.some(key =>
                key.userId === 1 && key.phase === 1
            );
            expect(hasUserPhaseIndex).toBe(true);
        });

        it('should have compound index for userId and timestamp', async () => {
            const indexes = await Response.collection.getIndexes();
            const indexKeys = Object.values(indexes).map(index => index.key);
            const hasUserTimestampIndex = indexKeys.some(key =>
                key.userId === 1 && key.timestamp === -1
            );
            expect(hasUserTimestampIndex).toBe(true);
        });

        // Add a helper test to see what indexes actually exist
        it('should list all indexes', async () => {
            const indexes = await Response.collection.getIndexes();
            console.log('Available indexes:', indexes);
        });
    });
});
