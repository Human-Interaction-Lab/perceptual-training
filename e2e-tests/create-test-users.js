const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Determine correct path to models based on where script is run from
const isInE2EDir = __filename.includes('e2e-tests');
const backendPath = isInE2EDir ? '../backend' : './backend';

// Import models with correct path
const User = require(path.join(backendPath, 'models/User'));
const Demographics = require(path.join(backendPath, 'models/Demographics'));
const Response = require(path.join(backendPath, 'models/Response'));

const createE2ETestUsers = async () => {
    try {
        console.log('Creating E2E test users for comprehensive testing...');

        // Connect to MongoDB if not already connected
        if (mongoose.connection.readyState !== 1) {
            const dbURI = process.env.MONGODB_URI || 'mongodb://localhost/audio-perception';
            await mongoose.connect(dbURI, {
                serverSelectionTimeoutMS: 5000, // 5 second timeout
                socketTimeoutMS: 5000,
            });
            console.log('Connected to MongoDB...');
        }

        // Define test users for different phases/states
        const testUsers = [
            {
                userId: 'e2e_pretest_demo',
                email: 'e2e_demo@test.com',
                password: 'test1234',
                currentPhase: 'pretest',
                speaker: 'OHSp01',
                isActive: true,
                completedTests: new Map(),
                description: 'User in pretest phase - demographics only'
            },
            {
                userId: 'e2e_pretest_intel',
                email: 'e2e_intel@test.com', 
                password: 'test1234',
                currentPhase: 'pretest',
                speaker: 'OHSp01',
                isActive: true,
                completedTests: new Map([
                    ['demographics', true],
                    ['pretest_demographics', true],
                    ['pretest_intelligibility', true]
                ]),
                description: 'User in pretest - completed intelligibility'
            },
            {
                userId: 'e2e_pretest_effort',
                email: 'e2e_effort@test.com',
                password: 'test1234', 
                currentPhase: 'pretest',
                speaker: 'OHSp01',
                isActive: true,
                completedTests: new Map([
                    ['demographics', true],
                    ['pretest_demographics', true],
                    ['pretest_intelligibility', true],
                    ['pretest_effort', true]
                ]),
                description: 'User in pretest - completed through listening effort'
            },
            {
                userId: 'e2e_pretest_comp',
                email: 'e2e_comp@test.com',
                password: 'test1234',
                currentPhase: 'pretest', 
                speaker: 'OHSp01',
                isActive: true,
                completedTests: new Map([
                    ['demographics', true],
                    ['pretest_demographics', true],
                    ['pretest_intelligibility', true],
                    ['pretest_effort', true],
                    ['pretest_comprehension', true]
                ]),
                pretestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                description: 'User completed pretest - ready for training'
            },
            {
                userId: 'e2e_training_day1',
                email: 'e2e_train1@test.com',
                password: 'test1234',
                currentPhase: 'training',
                speaker: 'OHSp01', 
                isActive: true,
                trainingDay: 1,
                completedTests: new Map([
                    ['demographics', true],
                    ['pretest_demographics', true],
                    ['pretest_intelligibility', true],
                    ['pretest_effort', true],
                    ['pretest_comprehension', true]
                ]),
                pretestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                description: 'User in training day 1'
            },
            {
                userId: 'e2e_training_intel',
                email: 'e2e_traintel@test.com',
                password: 'test1234',
                currentPhase: 'training',
                speaker: 'OHSp01',
                isActive: true,
                trainingDay: 1,
                completedTests: new Map([
                    ['demographics', true],
                    ['pretest_demographics', true], 
                    ['pretest_intelligibility', true],
                    ['pretest_effort', true],
                    ['pretest_comprehension', true],
                    ['training_day1_intelligibility', true]
                ]),
                pretestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                description: 'User in training day 1 - completed intelligibility'
            },
            {
                userId: 'e2e_posttest1',
                email: 'e2e_post1@test.com',
                password: 'test1234',
                currentPhase: 'posttest1',
                speaker: 'OHSp01',
                isActive: true,
                trainingDay: 5, // Completed all training
                completedTests: new Map([
                    ['demographics', true],
                    ['pretest_demographics', true],
                    ['pretest_intelligibility', true], 
                    ['pretest_effort', true],
                    ['pretest_comprehension', true],
                    ['training_day1', true],
                    ['training_day2', true],
                    ['training_day3', true],
                    ['training_day4', true]
                ]),
                pretestDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
                trainingCompletedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
                description: 'User ready for 1-week posttest'
            },
            {
                userId: 'e2e_posttest2',
                email: 'e2e_post2@test.com',
                password: 'test1234',
                currentPhase: 'posttest2',
                speaker: 'OHSp01',
                isActive: true,
                trainingDay: 5,
                completedTests: new Map([
                    ['demographics', true],
                    ['pretest_demographics', true],
                    ['pretest_intelligibility', true],
                    ['pretest_effort', true], 
                    ['pretest_comprehension', true],
                    ['training_day1', true],
                    ['training_day2', true],
                    ['training_day3', true],
                    ['training_day4', true],
                    ['posttest1_intelligibility', true],
                    ['posttest1_effort', true],
                    ['posttest1_comprehension', true]
                ]),
                pretestDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
                trainingCompletedDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 28 days ago
                posttest1CompletedDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
                description: 'User ready for 1-month posttest'
            }
        ];

        // Remove existing E2E test users
        console.log('Removing existing E2E test users...');
        await User.deleteMany({ userId: { $regex: /^e2e_/ } });
        await Demographics.deleteMany({ userId: { $regex: /^e2e_/ } });
        await Response.deleteMany({ userId: { $regex: /^e2e_/ } });

        // Create new test users
        for (const userData of testUsers) {
            console.log(`Creating user: ${userData.userId} (${userData.description})`);
            
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(userData.password, salt);

            // Create user
            const user = new User({
                ...userData,
                password: hashedPassword
            });

            await user.save();

            // Create demographics for each user
            const demographics = new Demographics({
                userId: userData.userId,
                dateOfBirth: new Date('1985-01-01'),
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
                    notes: 'E2E Test User'
                }
            });

            await demographics.save();
            console.log(`  ✓ Created demographics for ${userData.userId}`);
        }

        console.log(`✅ Successfully created ${testUsers.length} E2E test users`);
        console.log('\nTest Users Created:');
        testUsers.forEach(user => {
            console.log(`  • ${user.userId} - ${user.description}`);
        });

        return testUsers;

    } catch (error) {
        console.error('Error creating E2E test users:', error);
        throw error;
    }
};

const cleanupE2ETestUsers = async () => {
    try {
        console.log('Cleaning up E2E test users...');

        // Connect to MongoDB if not already connected
        if (mongoose.connection.readyState !== 1) {
            const dbURI = process.env.MONGODB_URI || 'mongodb://localhost/audio-perception';
            await mongoose.connect(dbURI, {
                serverSelectionTimeoutMS: 5000, // 5 second timeout
                socketTimeoutMS: 5000,
            });
            console.log('Connected to MongoDB...');
        }

        // Remove all E2E test users and their data
        const userResult = await User.deleteMany({ userId: { $regex: /^e2e_/ } });
        const demoResult = await Demographics.deleteMany({ userId: { $regex: /^e2e_/ } });
        const responseResult = await Response.deleteMany({ userId: { $regex: /^e2e_/ } });

        console.log(`✅ Cleanup complete:`);
        console.log(`  • Removed ${userResult.deletedCount} test users`);
        console.log(`  • Removed ${demoResult.deletedCount} demographics records`);
        console.log(`  • Removed ${responseResult.deletedCount} response records`);

    } catch (error) {
        console.error('Error cleaning up E2E test users:', error);
        throw error;
    }
};

module.exports = {
    createE2ETestUsers,
    cleanupE2ETestUsers
};

// Execute if run directly
if (require.main === module) {
    const action = process.argv[2];
    
    if (action === 'create') {
        createE2ETestUsers()
            .then(() => {
                console.log('Done creating E2E test users');
                process.exit(0);
            })
            .catch(err => {
                console.error('Failed to create E2E test users:', err);
                process.exit(1);
            });
    } else if (action === 'cleanup') {
        cleanupE2ETestUsers()
            .then(() => {
                console.log('Done cleaning up E2E test users');
                process.exit(0);
            })
            .catch(err => {
                console.error('Failed to cleanup E2E test users:', err);
                process.exit(1);
            });
    } else {
        console.log('Usage: node create-test-users.js [create|cleanup]');
        process.exit(1);
    }
}