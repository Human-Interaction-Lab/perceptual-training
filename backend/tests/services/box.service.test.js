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

    // Sample files with correct naming convention
    const sampleFiles = [
        'Grace Norman_Comp_01_01.wav',  // Comprehension version 1, sentence 1
        'Grace Norman_Comp_01_02.wav',  // Comprehension version 1, sentence 2
        'Grace Norman_Comp_02_01.wav',  // Comprehension version 2, sentence 1
        'Grace Norman_EFF01.wav',       // Effort sentence 1
        'Grace Norman_EFF02.wav',       // Effort sentence 2
        'Grace Norman_Int01.wav',       // Intelligibility sentence 1
        'Grace Norman_Int02.wav',       // Intelligibility sentence 2
        'Grace Norman_Trn_01_01.wav',   // Training day 1, sentence 1
        'Grace Norman_Trn_01_02.wav'    // Training day 1, sentence 2
    ];

    beforeAll(async () => {
        testUser = new User({
            userId: userId,
            email: 'grace.norman@test.com',
            password: 'password123'
        });
        await testUser.save();

        token = jwt.sign(
            { userId: testUser.userId },
            process.env.JWT_SECRET || 'your_jwt_secret'
        );

        // Mock Box service methods
        jest.spyOn(BoxService, 'listUserFiles').mockImplementation(async () => sampleFiles);
        jest.spyOn(BoxService, 'fileExists').mockImplementation(async (userId, filename) => {
            return sampleFiles.includes(filename);
        });
        jest.spyOn(BoxService, 'getFileStream').mockImplementation(async () => {
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

    describe('Filename Pattern Tests', () => {
        it('should correctly parse comprehension filenames', () => {
            const result = BoxService.parseFileName('Grace Norman_Comp_01_01.wav');
            expect(result).toEqual({
                username: 'Grace Norman',
                type: 'comprehension',
                version: 1,
                sentence: 1
            });
        });

        it('should correctly parse effort filenames', () => {
            const result = BoxService.parseFileName('Grace Norman_EFF01.wav');
            expect(result).toEqual({
                username: 'Grace Norman',
                type: 'effort',
                sentence: 1
            });
        });

        it('should correctly parse intelligibility filenames', () => {
            const result = BoxService.parseFileName('Grace Norman_Int01.wav');
            expect(result).toEqual({
                username: 'Grace Norman',
                type: 'intelligibility',
                sentence: 1
            });
        });

        it('should correctly parse training filenames', () => {
            const result = BoxService.parseFileName('Grace Norman_Trn_01_01.wav');
            expect(result).toEqual({
                username: 'Grace Norman',
                phase: 'training',
                day: 1,
                sentence: 1
            });
        });
    });

    describe('File Access Tests', () => {
        it('should access comprehension files with numeric version', async () => {
            const response = await request(app)
                .get('/audio/comprehension/1/1')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.header['content-type']).toBe('audio/wav');
        });

        it('should access effort files without version', async () => {
            const response = await request(app)
                .get('/audio/effort/1')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.header['content-type']).toBe('audio/wav');
        });

        it('should access intelligibility files without version', async () => {
            const response = await request(app)
                .get('/audio/intelligibility/1')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.header['content-type']).toBe('audio/wav');
        });
    });

    describe('File Pattern Generation', () => {
        it('should generate correct comprehension file pattern', () => {
            const pattern = BoxService.getFilePattern('COMPREHENSION', 'Grace Norman', 1, 1);
            expect(pattern).toBe('Grace Norman_Comp_01_01');
        });

        it('should generate correct effort file pattern', () => {
            const pattern = BoxService.getFilePattern('EFFORT', 'Grace Norman', null, 1);
            expect(pattern).toBe('Grace Norman_EFF01');
        });

        it('should generate correct intelligibility file pattern', () => {
            const pattern = BoxService.getFilePattern('INTELLIGIBILITY', 'Grace Norman', null, 1);
            expect(pattern).toBe('Grace Norman_Int01');
        });

        it('should handle version numbers correctly', () => {
            const pattern = BoxService.getFilePattern('COMPREHENSION', 'Grace Norman', 2, 1);
            expect(pattern).toBe('Grace Norman_Comp_02_01');
        });
    });
});