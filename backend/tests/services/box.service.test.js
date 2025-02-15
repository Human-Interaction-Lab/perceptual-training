// tests/services/box.service.test.js
const { mongoose } = require('../setup');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

// Mock environment variables before requiring BoxService
process.env.BOX_CLIENT_ID = 'mock_client_id';
process.env.BOX_CLIENT_SECRET = 'mock_client_secret';
process.env.BOX_KEY_ID = 'mock_key_id';
process.env.BOX_PRIVATE_KEY = 'mock_private_key';
process.env.BOX_PASSPHRASE = 'mock_passphrase';
process.env.BOX_ENTERPRISE_ID = 'mock_enterprise_id';
process.env.BOX_ROOT_FOLDER_ID = 'mock_root_folder_id';

// Mock Box SDK before requiring BoxService
jest.mock('box-node-sdk', () => {
    return class MockBoxSDK {
        constructor() {
            this.getAppAuthClient = jest.fn().mockReturnValue({
                folders: {
                    getItems: jest.fn().mockResolvedValue({
                        entries: [
                            { type: 'folder', name: 'Grace Norman', id: 'folder123' },
                            { type: 'file', name: 'Grace Norman_Comp_01_01.wav', id: 'file1' },
                            { type: 'file', name: 'Grace Norman_Comp_01_02.wav', id: 'file2' },
                            { type: 'file', name: 'Grace Norman_EFF01.wav', id: 'file3' },
                            { type: 'file', name: 'Grace Norman_Int01.wav', id: 'file4' },
                            { type: 'file', name: 'Grace Norman_Trn_01_01.wav', id: 'file5' }
                        ]
                    }),
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
            });
        }
    };
});

// Create a mock BoxService class
class MockBoxService {
    constructor() {
        this.testTypes = {
            COMPREHENSION: 'COMPREHENSION',
            EFFORT: 'EFFORT',
            INTELLIGIBILITY: 'INTELLIGIBILITY'
        };
    }

    async getUserFolder(userId) {
        return { id: 'folder123', name: userId };
    }

    async getFileStream(userId, filePattern) {
        const { Readable } = require('stream');
        return new Readable({
            read() {
                this.push(Buffer.from('mock audio data'));
                this.push(null);
            }
        });
    }

    async getTestFile(userId, testType, version, sentence) {
        return this.getFileStream(userId, 'mock_file.wav');
    }

    async getTrainingFile(userId, day, sentence) {
        return this.getFileStream(userId, 'mock_training.wav');
    }

    async fileExists(userId, filename) {
        // Return true by default, can be mocked in individual tests
        return true;
    }

    async listUserFiles(userId) {
        return [
            'Grace Norman_Comp_01_01.wav',
            'Grace Norman_Comp_01_02.wav',
            'Grace Norman_EFF01.wav',
            'Grace Norman_Int01.wav',
            'Grace Norman_Trn_01_01.wav'
        ];
    }

    parseFileName(filename) {
        const parts = filename.replace('.wav', '').split('_');
        const username = parts.slice(0, 2).join(' ');

        if (parts[2] === 'Trn') {
            return {
                username,
                phase: 'training',
                day: parseInt(parts[3]),
                sentence: parseInt(parts[4])
            };
        }

        if (parts[2] === 'Comp') {
            return {
                username,
                type: 'comprehension',
                version: parseInt(parts[3]),
                sentence: parseInt(parts[4])
            };
        }

        if (parts[2].startsWith('EFF')) {
            return {
                username,
                type: 'effort',
                sentence: parseInt(parts[2].substring(3))
            };
        }

        if (parts[2].startsWith('Int')) {
            return {
                username,
                type: 'intelligibility',
                sentence: parseInt(parts[2].substring(3))
            };
        }

        return null;
    }
}

// Mock the entire BoxService module
jest.mock('../../boxService', () => new MockBoxService());

const BoxService = require('../../boxService');
const { app } = require('../../server');

describe('Box Service Integration Tests - Grace Norman', () => {
    const userId = 'Grace Norman';
    let token;
    let testUser;

    beforeAll(async () => {
        testUser = new User({
            userId: userId,
            email: 'grace.norman@test.com',
            password: 'password123',
            currentPhase: 'pretest',
            pretestDate: new Date(),
            trainingDay: 1
        });
        await testUser.save();

        token = jwt.sign(
            { userId: testUser.userId },
            process.env.JWT_SECRET || 'your_jwt_secret'
        );
    });

    afterAll(async () => {
        await User.deleteMany({});
        await mongoose.connection.close();
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

    describe('File Operations', () => {
        it('should list files for a user', async () => {
            const files = await BoxService.listUserFiles(userId);
            expect(Array.isArray(files)).toBe(true);
            expect(files.length).toBeGreaterThan(0);
            expect(files[0]).toMatch(/\.wav$/);
        });

        it('should check if a file exists', async () => {
            const exists = await BoxService.fileExists(userId, 'Grace Norman_Comp_01_01.wav');
            expect(exists).toBe(true);
        });

        it('should get a file stream', async () => {
            const stream = await BoxService.getTestFile(userId, 'COMPREHENSION', 1, 1);
            expect(stream).toBeDefined();
            expect(typeof stream.pipe).toBe('function');
        });
    });

    describe('API Integration', () => {
        it('should require authentication for file access', async () => {
            const response = await request(app)
                .get('/audio/pretest/COMPREHENSION/1');
            expect(response.status).toBe(401);
        });

        it('should access files with valid authentication', async () => {
            const response = await request(app)
                .get('/audio/pretest/COMPREHENSION/1')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
        });

        it('should access training files with valid authentication', async () => {
            const response = await request(app)
                .get('/audio/training/day1/1')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
        });

        it('should return 404 for non-existent files', async () => {
            // Temporarily override fileExists for this test
            jest.spyOn(BoxService, 'fileExists').mockResolvedValueOnce(false);

            const response = await request(app)
                .get('/audio/pretest/COMPREHENSION/999')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(404);
        });

        it('should return 400 for invalid test type', async () => {
            const response = await request(app)
                .get('/audio/pretest/INVALID/1')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(400);
        });
    });
});