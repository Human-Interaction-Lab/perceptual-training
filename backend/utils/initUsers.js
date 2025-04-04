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
            'test_training2',
            'test_pretest1', 'test_pretest2', 'test_pretest3',
            'test_posttest1', 'test_posttest2', 'test_posttest3'
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

        // Test Users Configuration
        const testUsers = [
            // Original test users
            {
                userId: 'test_pretest',
                email: 'pretest@test.com',
                currentPhase: 'pretest',
                speaker: 'Grace Norman',
                ...baseTestUser
            },
            {
                userId: 'test_training',
                email: 'training@test.com',
                currentPhase: 'training',
                speaker: 'Grace Norman',
                trainingDay: 1,
                pretestDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
                ...baseTestUser
            },
            {
                userId: 'test_training2',
                email: 'training2@test.com',
                currentPhase: 'training',
                speaker: 'Taylian',
                trainingDay: 2,
                pretestDate: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
                ...baseTestUser
            },
            {
                userId: 'test_posttest',
                email: 'posttest@test.com',
                currentPhase: 'posttest1',
                speaker: 'Grace Norman',
                trainingDay: 4,
                pretestDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
                ...baseTestUser
            },

            // New test users with different pretest states
            {
                userId: 'test_pretest1',
                email: 'pretest1@test.com',
                currentPhase: 'pretest',
                speaker: 'Grace Norman',
                ...baseTestUser
                // This user will only have demographics completed
            },
            {
                userId: 'test_pretest2',
                email: 'pretest2@test.com',
                currentPhase: 'pretest',
                speaker: 'Emma01Test',
                ...baseTestUser
                // Will add demographics + intelligibility responses
            },
            {
                userId: 'test_pretest3',
                email: 'pretest3@test.com',
                currentPhase: 'pretest',
                speaker: 'Grace Norman',
                ...baseTestUser
                // Will add demographics + intelligibility + effort responses
            },

            // Three posttest users with different testing states
            {
                userId: 'test_posttest1',
                email: 'posttest1@test.com',
                currentPhase: 'posttest1',
                speaker: 'Grace Norman',
                trainingDay: 4,
                pretestDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
                ...baseTestUser
                // This user will only have demographics completed for posttest
            },
            {
                userId: 'test_posttest2',
                email: 'posttest2@test.com',
                currentPhase: 'posttest1',
                speaker: 'Taylian',
                trainingDay: 4,
                pretestDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
                ...baseTestUser
                // Will add demographics + intelligibility responses
            },
            {
                userId: 'test_posttest3',
                email: 'posttest3@test.com',
                currentPhase: 'posttest1',
                speaker: 'Grace Norman',
                trainingDay: 4,
                pretestDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
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
            'test_pretest1', 'test_pretest2', 'test_pretest3',
            'test_training', 'test_training2',
            'test_posttest1', 'test_posttest2', 'test_posttest3'
        ];

        for (const userId of allTestUsers) {
            const demographics = new Demographics({
                ...demographicsData,
                userId
            });
            await demographics.save();
            console.log(`Demographics created for ${userId}`);
        }

        // Add pretest user completed tests
        const pretest1 = await User.findOne({ userId: 'test_pretest1' });
        const pretest2 = await User.findOne({ userId: 'test_pretest2' });
        const pretest3 = await User.findOne({ userId: 'test_pretest3' });

        // Add posttest user references
        const posttest1 = await User.findOne({ userId: 'test_posttest1' });
        const posttest2 = await User.findOne({ userId: 'test_posttest2' });
        const posttest3 = await User.findOne({ userId: 'test_posttest3' });

        // Intelligibility responses template
        const intelligibilityResponses = [
            { stimulusId: 'intelligibility_1', response: 'Sample response 1' },
            { stimulusId: 'intelligibility_2', response: 'Sample response 2' },
            { stimulusId: 'intelligibility_3', response: 'Sample response 3' }
        ];

        // Effort responses template
        const effortResponses = [
            { stimulusId: 'effort_1', response: 'Sample effort 1', rating: 75 },
            { stimulusId: 'effort_2', response: 'Sample effort 2', rating: 60 },
            { stimulusId: 'effort_3', response: 'Sample effort 3', rating: 85 }
        ];

        // Create responses for pretest users
        for (const respData of intelligibilityResponses) {
            // For pretest2
            const response2 = new Response({
                userId: 'test_pretest2',
                phase: 'pretest',
                stimulusId: `pretest_${respData.stimulusId}`,
                response: respData.response
            });
            await response2.save();

            // For pretest3
            const response3 = new Response({
                userId: 'test_pretest3',
                phase: 'pretest',
                stimulusId: `pretest_${respData.stimulusId}`,
                response: respData.response
            });
            await response3.save();
        }

        // Add effort responses for pretest3
        for (const respData of effortResponses) {
            const response = new Response({
                userId: 'test_pretest3',
                phase: 'pretest',
                stimulusId: `pretest_${respData.stimulusId}`,
                response: respData.response,
                rating: respData.rating
            });
            await response.save();
        }

        // CREATE RESPONSES FOR POSTTEST USERS
        for (const respData of intelligibilityResponses) {
            // For posttest2
            const post_response2 = new Response({
                userId: 'test_posttest2',
                phase: 'posttest1',
                stimulusId: `posttest1_${respData.stimulusId}`,
                response: respData.response
            });
            await post_response2.save();

            // For posttest3
            const post_response3 = new Response({
                userId: 'test_posttest3',
                phase: 'posttest1',
                stimulusId: `posttest1_${respData.stimulusId}`,
                response: respData.response
            });
            await post_response3.save();
        }

        // Add effort responses for posttest3
        for (const respData of effortResponses) {
            const response = new Response({
                userId: 'test_posttest3',
                phase: 'posttest1',
                stimulusId: `posttest1_${respData.stimulusId}`,
                response: respData.response,
                rating: respData.rating
            });
            await response.save();
        }

        // Update completedTests property for the pretest users
        if (pretest1) {
            // Set both the specific phase key and the general demographics key
            pretest1.completedTests.set('pretest_demographics', true);
            pretest1.completedTests.set('demographics', true); // General flag for demographics completion
            await pretest1.save();
            console.log('Updated completedTests for test_pretest1 (demographics only)');
        }

        if (pretest2) {
            pretest2.completedTests.set('pretest_demographics', true);
            pretest2.completedTests.set('demographics', true); // General flag for demographics completion
            pretest2.completedTests.set('pretest_intelligibility', true);
            await pretest2.save();
            console.log('Updated completedTests for test_pretest2');
        }

        if (pretest3) {
            pretest3.completedTests.set('pretest_demographics', true);
            pretest3.completedTests.set('demographics', true); // General flag for demographics completion
            pretest3.completedTests.set('pretest_intelligibility', true);
            pretest3.completedTests.set('pretest_effort', true);
            await pretest3.save();
            console.log('Updated completedTests for test_pretest3');
        }

        // Update standard test users as well
        const trainingUser = await User.findOne({ userId: 'test_training' });
        if (trainingUser) {
            trainingUser.completedTests.set('pretest_demographics', true);
            trainingUser.completedTests.set('demographics', true); // General flag for demographics completion
            trainingUser.completedTests.set('pretest_intelligibility', true);
            trainingUser.completedTests.set('pretest_effort', true);
            trainingUser.completedTests.set('pretest_comprehension', true);
            await trainingUser.save();
            console.log('Updated completedTests for test_training user');
        }

        const training2User = await User.findOne({ userId: 'test_training2' });
        if (training2User) {
            training2User.completedTests.set('pretest_demographics', true);
            training2User.completedTests.set('demographics', true); // General flag for demographics completion
            training2User.completedTests.set('pretest_intelligibility', true);
            training2User.completedTests.set('pretest_effort', true);
            training2User.completedTests.set('pretest_comprehension', true);
            await training2User.save();
            console.log('Updated completedTests for test_training2 user');
        }

        // Update completedTests property for the posttest users
        if (posttest1) {
            posttest1.completedTests.set('pretest_demographics', true);
            posttest1.completedTests.set('demographics', true); // General flag for demographics completion
            posttest1.completedTests.set('pretest_intelligibility', true);
            posttest1.completedTests.set('pretest_effort', true);
            posttest1.completedTests.set('pretest_comprehension', true);
            posttest1.completedTests.set('posttest1_demographics', true);
            await posttest1.save();
            console.log('Updated completedTests for test_posttest1 (demographics only for posttest1)');
        }

        if (posttest2) {
            posttest2.completedTests.set('pretest_demographics', true);
            posttest2.completedTests.set('demographics', true); // General flag for demographics completion
            posttest2.completedTests.set('pretest_intelligibility', true);
            posttest2.completedTests.set('pretest_effort', true);
            posttest2.completedTests.set('pretest_comprehension', true);
            posttest2.completedTests.set('posttest1_demographics', true);
            posttest2.completedTests.set('posttest1_intelligibility', true);
            await posttest2.save();
            console.log('Updated completedTests for test_posttest2');
        }

        if (posttest3) {
            posttest3.completedTests.set('pretest_demographics', true);
            posttest3.completedTests.set('demographics', true); // General flag for demographics completion
            posttest3.completedTests.set('pretest_intelligibility', true);
            posttest3.completedTests.set('pretest_effort', true);
            posttest3.completedTests.set('pretest_comprehension', true);
            posttest3.completedTests.set('posttest1_demographics', true);
            posttest3.completedTests.set('posttest1_intelligibility', true);
            posttest3.completedTests.set('posttest1_effort', true);
            await posttest3.save();
            console.log('Updated completedTests for test_posttest3');
        }

        // The test_pretest user should NOT have any completed tests - they are just starting
        const pretestUser = await User.findOne({ userId: 'test_pretest' });
        if (pretestUser) {
            // Clear any completion flags that might have been set previously
            pretestUser.completedTests = new Map();
            await pretestUser.save();
            console.log('Cleared all completedTests for test_pretest user - ready for fresh start');
        }

        // Add completed flags for the standard posttest user (all pretest and all training should be complete)
        const posttestUser = await User.findOne({ userId: 'test_posttest' });
        if (posttestUser) {
            posttestUser.completedTests.set('pretest_demographics', true);
            posttestUser.completedTests.set('demographics', true); // General flag for demographics completion
            posttestUser.completedTests.set('pretest_intelligibility', true);
            posttestUser.completedTests.set('pretest_effort', true);
            posttestUser.completedTests.set('pretest_comprehension', true);
            // Mark training day 1-4 as complete
            posttestUser.completedTests.set('training_day1', true);
            posttestUser.completedTests.set('training_day2', true);
            posttestUser.completedTests.set('training_day3', true);
            posttestUser.completedTests.set('training_day4', true);
            await posttestUser.save();
            console.log('Updated completedTests for test_posttest user');
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