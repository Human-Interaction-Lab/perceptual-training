// tests/services/box.service.test.js
const { mongoose } = require('../setup');
const request = require('supertest');
const { app } = require('../../server');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

// Mock Box SDK
jest.mock('box-node-sdk', () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            getAppAuthClient: jest.fn().mockReturnValue({
                folders: {
                    getItems: jest.fn().mockImplementation(() => ({
                        entries: [
                            { type: 'folder', name: 'Grace Norman', id: 'folder123' },
                            { type: 'file', name: 'Grace Norman_Comp_01_01.wav', id: 'file1' },
                            { type: 'file', name: 'Grace Norman_Comp_01_02.wav', id: 'file2' },
                            { type: 'file', name: 'Grace Norman_EFF01.wav', id: 'file3' },
                            { type: 'file', name: 'Grace Norman_Int01.wav', id: 'file4' },
                            { type: 'file', name: 'Grace Norman_Trn_01_01.wav', id: 'file5' }
                        ]
                    })),
                    create: jest.fn().mockResolvedValue({ id: 'newfolder123' })
                },
                files: {
                    getReadStream: jest.fn().mockImplementation(() => {
                        const { Readable } = require('stream');
                        return new Readable({
                            read() {
                                this.push(Buffer.from('mock audio data'));
                                this.push(null);
                            }
                        });
                    })
                }
            })
        }))
    };
});

// Now import BoxService after mocking
const BoxService = require('../../boxService');

describe('Box Service Integration Tests - Grace Norman', () => {
    const userId = 'Grace Norman';
    let token;
    let testUser;

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
    });

    afterAll(async () => {
        await User.deleteMany({});
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

    describe('File Access Tests', () => {
        it('should return a readable stream', async () => {
            const stream = await BoxService.getTestFile(userId, 'COMPREHENSION', 1, 1);
            expect(stream).toBeDefined();
            expect(typeof stream.pipe).toBe('function');
        });

        it('should throw error for non-existent file', async () => {
            await expect(BoxService.getTestFile(userId, 'COMPREHENSION', 99, 99))
                .rejects
                .toThrow('File');
        });

        it('should throw error for invalid test type', async () => {
            await expect(BoxService.getTestFile(userId, 'INVALID', 1, 1))
                .rejects
                .toThrow('Invalid test type');
        });
    });

    describe('API Integration Tests', () => {
        it('should handle comprehension file requests', async () => {
            const response = await request(app)
                .get('/audio/comprehension/1/1')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
        });

        it('should handle effort file requests', async () => {
            const response = await request(app)
                .get('/audio/effort/1')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
        });

        it('should handle intelligibility file requests', async () => {
            const response = await request(app)
                .get('/audio/intelligibility/1')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
        });
    });
});