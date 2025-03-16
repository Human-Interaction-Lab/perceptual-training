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

        // First, remove existing test users but keep admin
        console.log('Removing existing test users...');
        const testUserIds = [
            'test_pretest', 'test_training', 'test_posttest',
            'test_pretest1', 'test_pretest2', 'test_pretest3'
        ];
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
            isActive: true,
            speaker: 'Grace Norman'
        };

        // Test Users Configuration
        const testUsers = [
            // Original test users
            {
                userId: 'test_pretest',
                email: 'pretest@test.com',
                currentPhase: 'pretest',
                ...baseTestUser
            },
            {
                userId: 'test_training',
                email: 'training@test.com',
                currentPhase: 'training',
                trainingDay: 1,
                pretestDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
                ...baseTestUser
            },
            {
                userId: 'test_posttest',
                email: 'posttest@test.com',
                currentPhase: 'posttest1',
                trainingDay: 4,
                pretestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                ...baseTestUser
            },

            // New test users with different pretest states
            {
                userId: 'test_pretest1',
                email: 'pretest1@test.com',
                currentPhase: 'pretest',
                ...baseTestUser
                // This user will only have demographics completed
            },
            {
                userId: 'test_pretest2',
                email: 'pretest2@test.com',
                currentPhase: 'pretest',
                ...baseTestUser
                // Will add demographics + intelligibility responses
            },
            {
                userId: 'test_pretest3',
                email: 'pretest3@test.com',
                currentPhase: 'pretest',
                ...baseTestUser
                // Will add demographics + intelligibility + effort responses
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

        // Create demographics for test_pretest1, test_pretest2 and test_pretest3
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

        for (const userId of ['test_pretest1', 'test_pretest2', 'test_pretest3']) {
            const demographics = new Demographics({
                ...demographicsData,
                userId
            });
            await demographics.save();
            console.log(`Demographics created for ${userId}`);
        }

        // Create responses for test_pretest2 and test_pretest3
        const pretest1 = await User.findOne({ userId: 'test_pretest1' });
        const pretest2 = await User.findOne({ userId: 'test_pretest2' });
        const pretest3 = await User.findOne({ userId: 'test_pretest3' });

        // Add intelligibility test responses for both pretest2 and pretest3
        const intelligibilityResponses = [
            { stimulusId: 'pretest_intelligibility_1', response: 'Sample response 1' },
            { stimulusId: 'pretest_intelligibility_2', response: 'Sample response 2' },
            { stimulusId: 'pretest_intelligibility_3', response: 'Sample response 3' }
        ];

        for (const respData of intelligibilityResponses) {
            // Create response for test_pretest2
            const response2 = new Response({
                userId: 'test_pretest2',
                phase: 'pretest',
                stimulusId: respData.stimulusId,
                response: respData.response
            });
            await response2.save();

            // Create response for test_pretest3
            const response3 = new Response({
                userId: 'test_pretest3',
                phase: 'pretest',
                stimulusId: respData.stimulusId,
                response: respData.response
            });
            await response3.save();
        }

        // Add effort test responses for pretest3 only
        const effortResponses = [
            { stimulusId: 'pretest_effort_1', response: 'Sample effort 1', rating: 75 },
            { stimulusId: 'pretest_effort_2', response: 'Sample effort 2', rating: 60 },
            { stimulusId: 'pretest_effort_3', response: 'Sample effort 3', rating: 85 }
        ];

        for (const respData of effortResponses) {
            const response = new Response({
                userId: 'test_pretest3',
                phase: 'pretest',
                stimulusId: respData.stimulusId,
                response: respData.response,
                rating: respData.rating
            });
            await response.save();
        }

        // Update completedTests property for the users
        if (pretest1) {
            pretest1.completedTests.set('pretest_demographics', true);
            await pretest1.save();
            console.log('Updated completedTests for test_pretest1 (demographics only)');
        }

        if (pretest2) {
            pretest2.completedTests.set('pretest_demographics', true);
            pretest2.completedTests.set('pretest_intelligibility', true);
            await pretest2.save();
            console.log('Updated completedTests for test_pretest2');
        }

        if (pretest3) {
            pretest3.completedTests.set('pretest_demographics', true);
            pretest3.completedTests.set('pretest_intelligibility', true);
            pretest3.completedTests.set('pretest_effort', true);
            await pretest3.save();
            console.log('Updated completedTests for test_pretest3');
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