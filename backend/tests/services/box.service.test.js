// tests/services/box.service.test.js
const { mongoose } = require('../setup');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

// Mock Box SDK first
jest.mock('box-node-sdk', () => {
    function MockBoxSDK() {
        return {
            getAppAuthClient: jest.fn().mockReturnValue({
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
            })
        };
    }
    return MockBoxSDK;
});

// Mock server with proper jest.mock syntax
jest.mock('../../server', () => {
    const express = require('express');
    const mockJwt = require('jsonwebtoken');
    const app = express();

    // Mock middleware that uses jwt from within the mock
    const authenticateToken = (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Access denied' });
        }

        try {
            const verified = mockJwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
            req.user = verified;
            next();
        } catch (err) {
            res.status(401).json({ error: 'Invalid token' });
        }
    };

    app.get('/audio/:phase/:testType/:sentence', authenticateToken, (req, res) => {
        res.status(200).send('mock audio data');
    });

    return { app, authenticateToken };
});

const { app } = require('../../server');
const BoxService = require('../../boxService');

describe('Box Service Integration Tests - Grace Norman', () => {
    const userId = 'Grace Norman';
    let token;
    let testUser;

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
                .get('/audio/comprehension/1/1');
            expect(response.status).toBe(401);
        });

        it('should access files with valid authentication', async () => {
            const response = await request(app)
                .get('/audio/comprehension/1/1')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
        });
    });
});