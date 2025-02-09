const request = require('supertest');
const { mongoose } = require('../setup');
const { app } = require('../../server');
const jwt = require('jsonwebtoken');
const User = mongoose.model('User');
const Response = mongoose.model('Response');

describe('Admin API', () => {
    let adminToken;
    let regularUserToken;
    let testUser;
    let adminUser;

    beforeAll(async () => {
        // Clear any existing users at start
        await User.deleteMany({});
        await Response.deleteMany({});

        // Create admin user
        adminUser = new User({
            userId: 'adminuser',
            email: 'admin@test.com',
            password: 'adminpass123',
            isAdmin: true
        });
        await adminUser.save();

        // Create regular user
        testUser = new User({
            userId: 'regularuser',
            email: 'user@test.com',
            password: 'userpass123',
            isAdmin: false
        });
        await testUser.save();

        // Create tokens
        adminToken = jwt.sign(
            { userId: adminUser.userId, isAdmin: true },
            process.env.JWT_SECRET || 'your_jwt_secret'
        );

        regularUserToken = jwt.sign(
            { userId: testUser.userId, isAdmin: false },
            process.env.JWT_SECRET || 'your_jwt_secret'
        );
    });

    beforeEach(async () => {
        // Verify admin user exists before each test
        const admin = await User.findOne({ userId: 'adminuser' });
        if (!admin) {
            console.log('Recreating admin user before test...');
            adminUser = new User({
                userId: 'adminuser',
                email: 'admin@test.com',
                password: 'admin123',
                isAdmin: true
            });
            await adminUser.save();
        }
    });

    afterAll(async () => {
        await User.deleteMany({});
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