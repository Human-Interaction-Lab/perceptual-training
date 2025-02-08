// tests/routes/admin.test.js
const request = require('supertest');
const { mongoose } = require('../setup');  // Use shared mongoose connection
const { app } = require('../../server');
const jwt = require('jsonwebtoken');

// Get the models using the shared mongoose connection
const User = mongoose.model('User');
const Response = mongoose.model('Response');

describe('Admin API', () => {
    let server;
    let adminToken;
    let regularUserToken;
    let testUser;
    let adminUser;

    beforeAll(async () => {
        try {
            // Clear any existing users using the shared connection
            await User.deleteMany({});

            // Create admin user using the shared connection
            adminUser = await User.create({
                userId: 'adminuser',
                email: 'admin@test.com',
                password: 'admin123',
                isAdmin: true
            });

            // Create regular user
            testUser = await User.create({
                userId: 'regularuser',
                email: 'user@test.com',
                password: 'user123',
                isAdmin: false
            });

            // Create tokens
            adminToken = jwt.sign(
                { userId: adminUser.userId, isAdmin: true },
                process.env.JWT_SECRET || 'your_jwt_secret'
            );

            regularUserToken = jwt.sign(
                { userId: testUser.userId, isAdmin: false },
                process.env.JWT_SECRET || 'your_jwt_secret'
            );

            server = app.listen(0);

        } catch (error) {
            console.error('Setup failed:', error);
            throw error;
        }
    });

    afterAll(async () => {
        try {
            await User.deleteMany({});
            if (server) {
                await new Promise(resolve => server.close(resolve));
            }
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
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
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/admin/users/:userId/toggle-status', () => {
        it('should allow admin to toggle user status', async () => {
            const response = await request(app)
                .post(`/api/admin/users/${testUser.userId}/toggle-status`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('isActive');
        });
    });

    describe('GET /api/admin/export/users', () => {
        it('should export user data in CSV format', async () => {
            const response = await request(app)
                .get('/api/admin/export/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.header['content-type']).toBe('text/csv; charset=utf-8');
            expect(response.header['content-disposition']).toContain('attachment; filename=users.csv');
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

        it('should not allow regular users to access stats', async () => {
            const response = await request(app)
                .get('/api/admin/stats')
                .set('Authorization', `Bearer ${regularUserToken}`);

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error');
        });
    });
});