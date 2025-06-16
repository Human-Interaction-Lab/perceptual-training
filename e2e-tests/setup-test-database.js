const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Import models
const User = require('../backend/models/User');
const Demographics = require('../backend/models/Demographics');
const Response = require('../backend/models/Response');

const setupTestDatabase = async () => {
    try {
        console.log('🔧 Setting up test database with phase users...');

        // Connect to MongoDB
        const dbURI = process.env.MONGODB_URI || 'mongodb://localhost/audio-perception';
        await mongoose.connect(dbURI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 10000,
        });
        console.log('Connected to MongoDB...');

        // Clean up any existing test users
        console.log('Cleaning existing test users...');
        await User.deleteMany({ userId: { $regex: /^testphase_/ } });
        await Demographics.deleteMany({ userId: { $regex: /^testphase_/ } });
        await Response.deleteMany({ userId: { $regex: /^testphase_/ } });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('test1234', salt);

        // Base demographics data
        const baseDemographics = {
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
                notes: 'Test Phase User'
            }
        };

        // Create users in different phases with proper database state
        const testUsers = [
            {
                userId: 'testphase_fresh',
                email: 'fresh@test.com',
                currentPhase: 'pretest',
                completedTests: new Map(),
                description: 'Fresh user - should see demographics form'
            },
            {
                userId: 'testphase_demo_done',
                email: 'demo@test.com',
                currentPhase: 'pretest',
                completedTests: new Map([
                    ['demographics', true],
                    ['pretest_demographics', true]
                ]),
                description: 'Demographics completed - should see intelligibility test'
            },
            {
                userId: 'testphase_intel_done',
                email: 'intel@test.com',
                currentPhase: 'pretest',
                completedTests: new Map([
                    ['demographics', true],
                    ['pretest_demographics', true],
                    ['pretest_intelligibility', true]
                ]),
                description: 'Intelligibility completed - should see listening effort'
            },
            {
                userId: 'testphase_effort_done',
                email: 'effort@test.com',
                currentPhase: 'pretest',
                completedTests: new Map([
                    ['demographics', true],
                    ['pretest_demographics', true],
                    ['pretest_intelligibility', true],
                    ['pretest_effort', true]
                ]),
                description: 'Effort completed - should see comprehension'
            },
            {
                userId: 'testphase_pretest_complete',
                email: 'complete@test.com',
                currentPhase: 'training',
                trainingDay: 1,
                pretestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                completedTests: new Map([
                    ['demographics', true],
                    ['pretest_demographics', true],
                    ['pretest_intelligibility', true],
                    ['pretest_effort', true],
                    ['pretest_comprehension', true]
                ]),
                description: 'All pretest complete - should see training day 1'
            },
            {
                userId: 'testphase_training_active',
                email: 'training@test.com',
                currentPhase: 'training',
                trainingDay: 2,
                pretestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                completedTests: new Map([
                    ['demographics', true],
                    ['pretest_demographics', true],
                    ['pretest_intelligibility', true],
                    ['pretest_effort', true],
                    ['pretest_comprehension', true],
                    ['training_day1', true]
                ]),
                description: 'Training day 1 complete - should see training day 2'
            },
            {
                userId: 'testphase_training_done',
                email: 'traindone@test.com',
                currentPhase: 'posttest1',
                trainingDay: 5,
                pretestDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
                trainingCompletedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
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
                description: 'Training complete - should see 1-week follow-up'
            },
            {
                userId: 'testphase_posttest1_done',
                email: 'post1@test.com',
                currentPhase: 'posttest2',
                trainingDay: 5,
                pretestDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
                trainingCompletedDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 28 days ago
                posttest1CompletedDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
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
                description: '1-week posttest complete - should see 1-month follow-up'
            }
        ];

        // Create each test user
        for (const userData of testUsers) {
            console.log(`Creating user: ${userData.userId} (${userData.description})`);
            
            const user = new User({
                userId: userData.userId,
                email: userData.email,
                password: hashedPassword,
                currentPhase: userData.currentPhase,
                speaker: 'OHSp01',
                isActive: true,
                trainingDay: userData.trainingDay || 1,
                completedTests: userData.completedTests,
                pretestDate: userData.pretestDate || null,
                trainingCompletedDate: userData.trainingCompletedDate || null,
                posttest1CompletedDate: userData.posttest1CompletedDate || null,
                posttest2CompletedDate: userData.posttest2CompletedDate || null,
                completed: false
            });

            await user.save();

            // Create demographics for users who have completed it
            if (userData.completedTests.has('demographics')) {
                const demographics = new Demographics({
                    ...baseDemographics,
                    userId: userData.userId
                });
                await demographics.save();
                console.log(`  ✓ Created demographics for ${userData.userId}`);
            }

            console.log(`  ✓ Created ${userData.userId}`);
        }

        console.log(`\n✅ Successfully created ${testUsers.length} test phase users`);
        console.log('\nCreated Users:');
        testUsers.forEach(user => {
            console.log(`  • ${user.userId} - ${user.description}`);
        });

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        
        return testUsers;

    } catch (error) {
        console.error('❌ Error setting up test database:', error);
        throw error;
    }
};

const cleanupTestDatabase = async () => {
    try {
        console.log('🧹 Cleaning up test database...');

        const dbURI = process.env.MONGODB_URI || 'mongodb://localhost/audio-perception';
        await mongoose.connect(dbURI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 5000,
        });

        const userResult = await User.deleteMany({ userId: { $regex: /^testphase_/ } });
        const demoResult = await Demographics.deleteMany({ userId: { $regex: /^testphase_/ } });
        const responseResult = await Response.deleteMany({ userId: { $regex: /^testphase_/ } });

        console.log(`✅ Cleanup complete:`);
        console.log(`  • Removed ${userResult.deletedCount} test users`);
        console.log(`  • Removed ${demoResult.deletedCount} demographics records`);
        console.log(`  • Removed ${responseResult.deletedCount} response records`);

        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Error cleaning up test database:', error);
        throw error;
    }
};

// Test the database connection
const testConnection = async () => {
    try {
        const dbURI = process.env.MONGODB_URI || 'mongodb://localhost/audio-perception';
        await mongoose.connect(dbURI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 5000,
        });
        console.log('✅ Database connection successful');
        await mongoose.disconnect();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
};

module.exports = {
    setupTestDatabase,
    cleanupTestDatabase,
    testConnection
};

// Execute if run directly
if (require.main === module) {
    const action = process.argv[2];
    
    if (action === 'setup') {
        setupTestDatabase()
            .then(() => {
                console.log('✅ Database setup complete');
                process.exit(0);
            })
            .catch(err => {
                console.error('❌ Database setup failed:', err);
                process.exit(1);
            });
    } else if (action === 'cleanup') {
        cleanupTestDatabase()
            .then(() => {
                console.log('✅ Database cleanup complete');
                process.exit(0);
            })
            .catch(err => {
                console.error('❌ Database cleanup failed:', err);
                process.exit(1);
            });
    } else if (action === 'test') {
        testConnection()
            .then(success => {
                process.exit(success ? 0 : 1);
            });
    } else {
        console.log('Usage: node setup-test-database.js [setup|cleanup|test]');
        process.exit(1);
    }
}