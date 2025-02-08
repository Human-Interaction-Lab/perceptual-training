// tests/routes/admin.test.js
const request = require('supertest');
const { mongoose } = require('../setup');
const { app } = require('../../server');
const User = require('../../models/User');
const Response = require('../../models/Response');
const jwt = require('jsonwebtoken');

describe('Admin API', () => {
    let server;
    let adminToken;
    let regularUserToken;
    let testUser;

    beforeAll(async () => {
        server = app.listen(0);

        // Create admin user
        const admin = await User.create({
            userId: 'admin',
            email: 'admin@test.com',
            password: 'admin123',
            isAdmin: true
        });

        // Create regular user
        testUser = await User.create({
            userId: 'regularuser',
            email: 'user@test.com',
            password: 'user123'
        });

        adminToken = jwt.sign(
            { userId: admin.userId, isAdmin: true },
            process.env.JWT_SECRET || 'your_jwt_secret'
        );

        regularUserToken = jwt.sign(
            { userId: testUser.userId },
            process.env.JWT_SECRET || 'your_jwt_secret'
        );
    });

    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    beforeEach(async () => {
        await Response.deleteMany({});
    });

    describe('GET /api/admin/users', () => {
        it('should allow admin to fetch all users', async () => {
            const response = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBeTruthy();
            expect(response.body.length).toBeGreaterThan(0);
        });

        it('should not allow regular users to fetch all users', async () => {
            const response = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${regularUserToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('GET /api/admin/stats', () => {
        it('should return correct statistics', async () => {
            const response = await request(app)
                .get('/api/admin/stats')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('totalUsers');
            expect(response.body).toHaveProperty('usersByPhase');
            expect(response.body).toHaveProperty('completedUsers');
        });
    });

    describe('POST /api/admin/users/:userId/toggle-status', () => {
        it('should allow admin to toggle user status', async () => {
            const response = await request(app)
                .post(`/api/admin/users/${testUser.userId}/toggle-status`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('isActive', false);
        });
    });

    describe('GET /api/admin/export/users', () => {
        it('should export user data in CSV format', async () => {
            const response = await request(app)
                .get('/api/admin/export/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.header['content-type']).toBe('text/csv');
        });
    });
});