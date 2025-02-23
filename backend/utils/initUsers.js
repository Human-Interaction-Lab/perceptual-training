// save as initUsers.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Demographics = require('../models/Demographics');
const Response = require('../models/Response');

const initializeUsers = async () => {
    try {
        // Only proceed if we're not in test environment
        if (process.env.NODE_ENV === 'test') {
            console.log('Test environment detected, skipping user initialization');
            return;
        }

        // First, remove all test users but keep admin
        console.log('Removing existing test users...');
        await User.deleteMany({
            userId: {
                $in: ['test_pretest', 'test_training', 'test_posttest']
            }
        }); // drop test users
        await Demographics.deleteMany({
            userId: {
                $in: ['test_pretest', 'test_training', 'test_posttest']
            }
        }); // Drop test demographics
        await Response.deleteMany({
            userId: {
                $in: ['test_pretest', 'test_training', 'test_posttest']
            }
        }); // Drop test responses

        // Check if admin user exists
        const adminExists = await User.findOne({ isAdmin: true });

        if (!adminExists) {
            // Admin credentials - should be changed after first login
            const adminData = {
                userId: process.env.ADMIN_USER_ID || 'admin',
                email: process.env.ADMIN_EMAIL || 'admin@yourdomain.com',
                password: process.env.ADMIN_PASSWORD || 'changeme123',
                isAdmin: true,
                isActive: true,
                speaker: 'testSpeaker'
            };

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminData.password, salt);

            // Create admin user
            const adminUser = new User({
                ...adminData,
                password: hashedPassword
            });

            await adminUser.save();
            console.log('Admin user created successfully');
        } else {
            console.log('Admin user already exists');
        }

        // Test Users Configuration
        const testUsers = [
            {
                userId: 'test_pretest',
                email: 'pretest@test.com',
                password: 'test1234',
                currentPhase: 'pretest',
                isActive: true,
                speaker: 'GraceNorman'
            },
            {
                userId: 'test_training',
                email: 'training@test.com',
                password: 'test1234',
                currentPhase: 'training',
                trainingDay: 1,
                pretestDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
                isActive: true,
                speaker: 'GraceNorman'
            },
            {
                userId: 'test_posttest',
                email: 'posttest@test.com',
                password: 'test1234',
                currentPhase: 'posttest',
                trainingDay: 4,
                pretestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                isActive: true,
                speaker: 'GraceNorman'
            }
        ];

        // Create new test users
        for (const userData of testUsers) {
            // Hash password for new user
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(userData.password, salt);

            const user = new User({
                ...userData,
                password: hashedPassword
            });

            await user.save();
            console.log(`Test user ${userData.userId} created successfully`);
        }

        console.log('All users initialized successfully');
    } catch (error) {
        console.error('Error initializing users:', error);
        throw error; // Re-throw to handle in calling code
    }
};

// Add a function to execute the initialization
const runInitialization = async () => {
    try {
        // Connect to MongoDB if not already connected
        if (mongoose.connection.readyState !== 1) {
            const dbURI = process.env.MONGODB_URI || 'mongodb://localhost/audio-perception';
            await mongoose.connect(dbURI, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            console.log('Connected to MongoDB...');
        }

        await initializeUsers();

        // Only disconnect if we connected in this function
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('Disconnected from MongoDB');
        }
    } catch (error) {
        console.error('Initialization failed:', error);
        process.exit(1);
    }
};

// Export both functions for flexibility
module.exports = {
    initializeUsers,
    runInitialization
};

// Execute if run directly
if (require.main === module) {
    runInitialization();
}