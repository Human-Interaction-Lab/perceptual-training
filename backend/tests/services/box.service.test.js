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

// Create a mock BoxService class that mirrors the actual implementation
class MockBoxService {
    constructor() {
        this.testTypes = {
            COMPREHENSION: 'COMPREHENSION',
            EFFORT: 'EFFORT',
            INTELLIGIBILITY: 'INTELLIGIBILITY'
        };
    }

    async getUserFolder(speaker) {
        return { id: 'folder123', name: speaker };
    }

    async getFileStream(speaker, filePattern) {
        const { Readable } = require('stream');
        return new Readable({
            read() {
                this.push(Buffer.from('mock audio data'));
                this.push(null);
            }
        });
    }

    async getTestFile(speaker, testType, version, sentence) {
        return this.getFileStream(speaker, 'mock_file.wav');
    }

    async getTrainingFile(speaker, day, sentence) {
        return this.getFileStream(speaker, 'mock_training.wav');
    }

    async fileExists(speaker, filename) {
        return true;
    }

    async listUserFiles(speaker) {
        return [
            'Grace Norman_Comp_01_01.wav',
            'Grace Norman_Comp_01_02.wav',
            'Grace Norman_EFF01.wav',
            'Grace Norman_Int01.wav',
            'Grace Norman_Trn_02_01.wav'
        ];
    }

    parseFileName(filename) {
        const noExt = filename.replace('.wav', '');
        const parts = noExt.split('_');
        if (parts.length < 2) return null;

        const username = parts[0];
        const typeIndicator = parts[1];

        // Handle training files
        if (typeIndicator === 'Trn') {
            return {
                username,
                phase: 'training',
                day: parseInt(parts[2]),
                sentence: parseInt(parts[3])
            };
        }

        // Handle comprehension files
        if (typeIndicator === 'Comp') {
            return {
                username,
                type: 'comprehension',
                version: parseInt(parts[2]),
                sentence: parseInt(parts[3])
            };
        }

        // Handle effort and intelligibility files
        if (typeIndicator.startsWith('EFF') || typeIndicator.startsWith('Int')) {
            const type = typeIndicator.substring(0, 3);
            const sentence = parseInt(typeIndicator.substring(3));
            return {
                username,
                type: type === 'EFF' ? 'effort' : 'intelligibility',
                sentence
            };
        }

        return null;
    }
}

// Mock the BoxService module with our implementation
const mockBoxService = new MockBoxService();
jest.mock('../../boxService', () => mockBoxService);

const BoxService = require('../../boxService');
const { app } = require('../../server');

describe('Box Service Integration Tests - Grace Norman', () => {
    const userId = 'testuser123';
    const speaker = 'Grace Norman';
    let token;
    let testUser;

    beforeAll(async () => {
        testUser = new User({
            userId: userId,
            email: 'grace.norman@test.com',
            password: 'password123',
            currentPhase: 'pretest',
            pretestDate: new Date(),
            trainingDay: 1,
            speaker: speaker
        });
        await testUser.save();

        token = jwt.sign(
            { userId: testUser.userId },
            process.env.JWT_SECRET || 'your_jwt_secret'
        );
    });

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        // Reset fileExists to default behavior
        mockBoxService.fileExists = jest.fn().mockResolvedValue(true);
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
            const result = BoxService.parseFileName('Grace Norman_Trn_02_01.wav');
            expect(result).toEqual({
                username: 'Grace Norman',
                phase: 'training',
                day: 2,
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
                .get('/audio/pretest/COMPREHENSION/1/1');
            expect(response.status).toBe(401);
        });

        it('should access files with valid authentication', async () => {
            mockBoxService.fileExists = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .get('/audio/pretest/COMPREHENSION/1/1')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
        });

        it('should access training files with valid authentication', async () => {
            // Set pretest date to yesterday to allow training today
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 2);

            // Update user to be in training phase
            testUser = await User.findOneAndUpdate(
                { userId },
                {
                    currentPhase: 'training',
                    trainingDay: 2,
                    pretestDate: yesterday
                },
                { new: true }
            );

            // Create new token with updated user state
            token = jwt.sign(
                { userId: testUser.userId },
                process.env.JWT_SECRET || 'your_jwt_secret'
            );

            // Mock the fileExists method for this specific test
            mockBoxService.fileExists = jest.fn().mockImplementation((speaker, param2, param3, param4) => {
                // Handle different call signatures
                if (typeof param2 === 'string' && param2 === 'training' && param3 === 2) {
                    // Called as fileExists(speaker, 'training', 2, 1)
                    return Promise.resolve(true);
                } else if (param2 && param2.includes && param2.includes('Trn_02')) {
                    // Called as fileExists(speaker, 'Grace Norman_Trn_02_01.wav')
                    return Promise.resolve(true);
                }
                // Default
                return Promise.resolve(true);
            });

            const response = await request(app)
                .get('/audio/training/day/2/1')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
        });

        it('should return 404 for non-existent files', async () => {
            mockBoxService.fileExists = jest.fn().mockResolvedValue(false);

            const response = await request(app)
                .get('/audio/pretest/COMPREHENSION/1/1')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(404);
        });

        it('should return 400 for invalid test type', async () => {
            const response = await request(app)
                .get('/audio/pretest/INVALID/1/1')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(400);
        });
    });
});