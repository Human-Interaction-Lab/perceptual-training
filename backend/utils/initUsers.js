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

        // First, remove all existing test users but keep admin
        console.log('Removing existing test users...');
        await User.deleteMany({ userId: { $regex: /^test_/ } });
        await Demographics.deleteMany({ userId: { $regex: /^test_/ } });
        await Response.deleteMany({ userId: { $regex: /^test_/ } });
        
        // Define our specific test user IDs for creating new ones
        const testUserIds = [
            'test_pretesta', 'test_pretestb', 'test_pretestc'
        ];

        // Note: localStorage can only be cleared in the browser context
        // We've created a separate utility page at /clear-test-users.html to clear localStorage

        await User.deleteMany({ userId: { $in: testUserIds } });
        await Demographics.deleteMany({ userId: { $in: testUserIds } });
        await Response.deleteMany({ userId: { $in: testUserIds } });

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

        // Base test user configuration for reuse
        const baseTestUser = {
            password: 'test1234',
            isActive: true
        };

        // Test Users Configuration - just the three pretest users
        const testUsers = [
            // Create the three test users in pretest phase (no completed activities)
            {
                userId: 'test_pretesta',
                email: 'pretesta@test.com',
                currentPhase: 'pretest',
                speaker: 'OHSp01',
                ...baseTestUser
            },
            {
                userId: 'test_pretestb',
                email: 'pretestb@test.com',
                currentPhase: 'pretest',
                speaker: 'OHSp01',
                ...baseTestUser
            },
            {
                userId: 'test_pretestc',
                email: 'pretestc@test.com',
                currentPhase: 'pretest',
                speaker: 'OHSp01',
                ...baseTestUser
            }
        ];

        // Create new test users
        for (const userData of testUsers) {
            // Hash password for new user
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(userData.password, salt);

            const user = new User({
                ...userData,
                password: hashedPassword,
                // Initialize completedTests as a Map
                completedTests: new Map()
            });

            await user.save();
            console.log(`Test user ${userData.userId} created successfully`);
        }

        // Create demographics for all test users
        const demographicsData = {
            dateOfBirth: new Date('1980-01-01'),
            ethnicity: 'Not Hispanic or Latino',
            race: 'White',
            sexAssignedAtBirth: 'Male',
            isEnglishPrimary: 'Yes',
            cognitiveImpairment: 'No',
            hearingLoss: 'No',
            hearingAids: 'No',
            relationshipToPartner: 'Spouse/Partner',
            communicationFrequency: 'Daily',
            communicationType: 'Face to face',
            formCompletedBy: 'Participant',
            researchData: {
                hearingTestType: 'Hearing Not Tested',
                hearingScreenResult: '',
                hearingThresholds: [],
                notes: 'Stuff'
            }
        };

        const allTestUsers = [
            'test_pretesta', 'test_pretestb', 'test_pretestc'
        ];

        for (const userId of allTestUsers) {
            const demographics = new Demographics({
                ...demographicsData,
                userId
            });
            await demographics.save();
            console.log(`Demographics created for ${userId}`);
        }

        // Verify all test users have blank completion records
        for (const userId of allTestUsers) {
            const user = await User.findOne({ userId });
            if (user) {
                // Make sure all test users start with no completed tests/activities
                user.completedTests = new Map();
                await user.save();
                console.log(`Ensured user ${userId} has no completed activities - ready for testing`);
            }
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

        // Store initialization timestamp in database
        // Create a flag that can be checked by the frontend to know if test users were just initialized
        try {
            // We'll use the admin user to store this flag
            const adminUser = await User.findOne({ isAdmin: true });
            if (adminUser) {
                // Store the timestamp of when test users were last initialized
                adminUser.testUsersInitializedAt = new Date();
                await adminUser.save();
                console.log('Test users initialization timestamp updated');
            }
        } catch (flagError) {
            console.error('Error setting initialization flag:', flagError);
            // Continue even if setting the flag fails
        }

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