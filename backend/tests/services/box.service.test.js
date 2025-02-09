// tests/services/box.service.test.js
const { mongoose } = require('../setup');
const request = require('supertest');
const { app } = require('../../server');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const BoxService = require('../../boxService');

describe('Box Service Integration Tests - Grace Norman', () => {
    const userId = 'Grace Norman';
    let token;
    let testUser;

    // Sample file patterns for Grace Norman
    const sampleFiles = [
        'Grace Norman_Pre_Comp_01.wav',
        'Grace Norman_Pre_Comp_02.wav',
        'Grace Norman_Pre_EFF_01.wav',
        'Grace Norman_Pre_EFF_02.wav',
        'Grace Norman_Pre_Int_01.wav',
        'Grace Norman_Pre_Int_02.wav',
        'Grace Norman_Trn_01_01.wav',
        'Grace Norman_Trn_01_02.wav',
        'Grace Norman_Post_Comp_01.wav',
        'Grace Norman_Post_EFF_01.wav',
        'Grace Norman_Post_Int_01.wav'
    ];

    beforeAll(async () => {
        // Create test user
        testUser = new User({
            userId: userId,
            email: 'grace.norman@test.com',
            password: 'password123'
        });
        await testUser.save();

        // Generate auth token
        token = jwt.sign(
            { userId: testUser.userId },
            process.env.JWT_SECRET || 'your_jwt_secret'
        );

        // Mock Box service methods
        jest.spyOn(BoxService, 'listUserFiles').mockImplementation(async () => sampleFiles);
        jest.spyOn(BoxService, 'fileExists').mockImplementation(async (userId, pattern) => {
            return sampleFiles.some(file => file.includes(pattern));
        });
        jest.spyOn(BoxService, 'getFileStream').mockImplementation(async () => {
            // Create a mock readable stream
            const { Readable } = require('stream');
            return new Readable({
                read() {
                    this.push(Buffer.from('mock audio data'));
                    this.push(null);
                }
            });
        });
    });

    afterAll(async () => {
        await User.deleteMany({});
        jest.restoreAllMocks();
    });

    describe('File Access Patterns', () => {
        it('should access pretest comprehension files', async () => {
            const response = await request(app)
                .get('/audio/pretest/Comp/1')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.header['content-type']).toBe('audio/wav');
        });

        it('should access pretest effort files', async () => {
            const response = await request(app)
                .get('/audio/pretest/EFF/1')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.header['content-type']).toBe('audio/wav');
        });

        it('should access pretest intelligibility files', async () => {
            const response = await request(app)
                .get('/audio/pretest/Int/1')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.header['content-type']).toBe('audio/wav');
        });

        it('should access training files', async () => {
            const response = await request(app)
                .get('/audio/training/day1/1')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.header['content-type']).toBe('audio/wav');
        });

        it('should access posttest files for all test types', async () => {
            const testTypes = ['Comp', 'EFF', 'Int'];
            
            for (const testType of testTypes) {
                const response = await request(app)
                    .get(`/audio/posttest/${testType}/1`)
                    .set('Authorization', `Bearer ${token}`);

                expect(response.status).toBe(200);
                expect(response.header['content-type']).toBe('audio/wav');
            }
        });

        it('should return 404 for non-existent files', async () => {
            const response = await request(app)
                .get('/audio/pretest/Comp/99')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(404);
        });

        it('should reject invalid test types', async () => {
            const response = await request(app)
                .get('/audio/pretest/INVALID/1')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid test type');
        });
    });

    describe('File Structure Verification', () => {
        it('should return correct file structure', async () => {
            const response = await request(app)
                .get('/api/check-audio-structure')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.structure).toHaveProperty('pretest');
            expect(response.body.structure).toHaveProperty('training');
            expect(response.body.structure).toHaveProperty('posttest');

            // Verify pretest structure
            expect(response.body.structure.pretest.comprehension).toHaveLength(2);
            expect(response.body.structure.pretest.effort).toHaveLength(2);
            expect(response.body.structure.pretest.intelligibility).toHaveLength(2);

            // Verify training structure
            expect(response.body.structure.training.day1).toHaveLength(2);

            // Verify posttest structure
            expect(response.body.structure.posttest.comprehension).toHaveLength(1);
            expect(response.body.structure.posttest.effort).toHaveLength(1);
            expect(response.body.structure.posttest.intelligibility).toHaveLength(1);
        });
    });

    describe('File Naming Convention', () => {
        it('should correctly parse file names', () => {
            const testCases = [
                {
                    filename: 'Grace Norman_Pre_Comp_01.wav',
                    expected: { phase: 'pretest', testType: 'Comp', sentence: 1 }
                },
                {
                    filename: 'Grace Norman_Trn_01_02.wav',
                    expected: { phase: 'training', day: 1, sentence: 2 }
                },
                {
                    filename: 'Grace Norman_Post_Int_01.wav',
                    expected: { phase: 'posttest', testType: 'Int', sentence: 1 }
                }
            ];

            testCases.forEach(({ filename, expected }) => {
                const result = BoxService.parseFileName(filename);
                expect(result).toMatchObject(expected);
            });
        });
    });

    describe('Authentication and Authorization', () => {
        it('should require authentication for file access', async () => {
            const response = await request(app)
                .get('/audio/pretest/Comp/1');
            
            expect(response.status).toBe(401);
        });

        it('should only allow access to own files', async () => {
            // Create another user
            const otherToken = jwt.sign(
                { userId: 'other_user' },
                process.env.JWT_SECRET || 'your_jwt_secret'
            );

            const response = await request(app)
                .get('/audio/pretest/Comp/1')
                .set('Authorization', `Bearer ${otherToken}`);

            expect(response.status).toBe(404);
        });
    });
});