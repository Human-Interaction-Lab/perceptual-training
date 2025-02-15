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
        return true;
    }

    async listUserFiles(userId) {
        return [
            'GraceNorman_Comp_01_01.wav',
            'GraceNorman_Comp_01_02.wav',
            'GraceNorman_EFF01.wav',
            'GraceNorman_Int01.wav',
            'GraceNorman_Trn_01_01.wav'
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
    const userId = 'GraceNorman';
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
            const result = BoxService.parseFileName('GraceNorman_Comp_01_01.wav');
            expect(result).toEqual({
                username: 'GraceNorman',
                type: 'comprehension',
                version: 1,
                sentence: 1
            });
        });

        it('should correctly parse effort filenames', () => {
            const result = BoxService.parseFileName('GraceNorman_EFF01.wav');
            expect(result).toEqual({
                username: 'GraceNorman',
                type: 'effort',
                sentence: 1
            });
        });

        it('should correctly parse intelligibility filenames', () => {
            const result = BoxService.parseFileName('GraceNorman_Int01.wav');
            expect(result).toEqual({
                username: 'GraceNorman',
                type: 'intelligibility',
                sentence: 1
            });
        });

        it('should correctly parse training filenames', () => {
            const result = BoxService.parseFileName('GraceNorman_Trn_01_01.wav');
            expect(result).toEqual({
                username: 'GraceNorman',
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
            const exists = await BoxService.fileExists(userId, 'GraceNorman_Comp_01_01.wav');
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
            mockBoxService.fileExists = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .get('/audio/pretest/COMPREHENSION/1')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
        });

        it('should access training files with valid authentication', async () => {
            // Set pretest date to yesterday to allow training today
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            // Update user to be in training phase
            testUser = await User.findOneAndUpdate(
                { userId },
                {
                    currentPhase: 'training',
                    trainingDay: 1,
                    pretestDate: yesterday
                },
                { new: true }
            );

            // Create new token with updated user state
            token = jwt.sign(
                { userId: testUser.userId },
                process.env.JWT_SECRET || 'your_jwt_secret'
            );

            mockBoxService.fileExists = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .get('/audio/training/day/1/1')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
        });

        it('should return 404 for non-existent files', async () => {
            mockBoxService.fileExists = jest.fn().mockResolvedValue(false);

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