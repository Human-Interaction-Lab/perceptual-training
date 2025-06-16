const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Import models  
const User = require('../backend/models/User');
const Demographics = require('../backend/models/Demographics');

const createPhaseTestUsers = async () => {
    try {
        console.log('Creating phase-specific test users...');

        // Connect to MongoDB
        if (mongoose.connection.readyState !== 1) {
            const dbURI = process.env.MONGODB_URI || 'mongodb://localhost/audio-perception';
            await mongoose.connect(dbURI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 5000,
            });
            console.log('Connected to MongoDB...');
        }

        // Remove existing phase test users
        await User.deleteMany({ userId: { $regex: /^phase_/ } });
        await Demographics.deleteMany({ userId: { $regex: /^phase_/ } });
        console.log('Removed existing phase test users');

        // Hash password once
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
                notes: 'Phase Test User'
            }
        };

        // User configurations for different phases
        const phaseUsers = [
            {
                userId: 'phase_pretest_start',
                email: 'phase_pretest@test.com',
                currentPhase: 'pretest',
                completedTests: new Map(),
                description: 'Starting pretest - can access demographics'
            },
            {
                userId: 'phase_pretest_demo_done',
                email: 'phase_demo@test.com', 
                currentPhase: 'pretest',
                completedTests: new Map([
                    ['demographics', true],
                    ['pretest_demographics', true]
                ]),
                description: 'Demographics completed - can access intelligence test'
            },
            {
                userId: 'phase_pretest_intel_done',
                email: 'phase_intel@test.com',
                currentPhase: 'pretest', 
                completedTests: new Map([
                    ['demographics', true],
                    ['pretest_demographics', true],
                    ['pretest_intelligibility', true]
                ]),
                description: 'Intelligence test completed - can access listening effort'
            },
            {
                userId: 'phase_pretest_complete',
                email: 'phase_complete@test.com',
                currentPhase: 'pretest',
                completedTests: new Map([
                    ['demographics', true],
                    ['pretest_demographics', true], 
                    ['pretest_intelligibility', true],
                    ['pretest_effort', true],
                    ['pretest_comprehension', true]
                ]),
                pretestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                description: 'All pretest completed - should show training available'
            },
            {
                userId: 'phase_training_start',
                email: 'phase_train@test.com',
                currentPhase: 'training',
                trainingDay: 1,
                completedTests: new Map([
                    ['demographics', true],
                    ['pretest_demographics', true],
                    ['pretest_intelligibility', true], 
                    ['pretest_effort', true],
                    ['pretest_comprehension', true]
                ]),
                pretestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                description: 'In training phase - can access training day 1'
            },
            {
                userId: 'phase_training_done',
                email: 'phase_traindone@test.com',
                currentPhase: 'posttest1',
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
                    ['training_day4', true]
                ]),
                pretestDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
                trainingCompletedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
                description: 'Training completed - can access 1-week posttest'
            },
            {
                userId: 'phase_posttest2',
                email: 'phase_post2@test.com',
                currentPhase: 'posttest2',
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
                description: '1-week posttest completed - can access 1-month posttest'
            }
        ];

        // Create users
        for (const userData of phaseUsers) {
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

        console.log(`\n✅ Successfully created ${phaseUsers.length} phase test users`);
        return phaseUsers;

    } catch (error) {
        console.error('Error creating phase test users:', error);
        throw error;
    }
};

const cleanupPhaseTestUsers = async () => {
    try {
        console.log('Cleaning up phase test users...');

        if (mongoose.connection.readyState !== 1) {
            const dbURI = process.env.MONGODB_URI || 'mongodb://localhost/audio-perception';
            await mongoose.connect(dbURI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 5000,
            });
        }

        const userResult = await User.deleteMany({ userId: { $regex: /^phase_/ } });
        const demoResult = await Demographics.deleteMany({ userId: { $regex: /^phase_/ } });

        console.log(`✅ Cleanup complete:`);
        console.log(`  • Removed ${userResult.deletedCount} phase test users`);
        console.log(`  • Removed ${demoResult.deletedCount} demographics records`);

    } catch (error) {
        console.error('Error cleaning up phase test users:', error);
        throw error;
    }
};

module.exports = {
    createPhaseTestUsers,
    cleanupPhaseTestUsers
};

// Execute if run directly
if (require.main === module) {
    const action = process.argv[2];
    
    if (action === 'create') {
        createPhaseTestUsers()
            .then(() => {
                console.log('Done creating phase test users');
                process.exit(0);
            })
            .catch(err => {
                console.error('Failed to create phase test users:', err);
                process.exit(1);
            });
    } else if (action === 'cleanup') {
        cleanupPhaseTestUsers()
            .then(() => {
                console.log('Done cleaning up phase test users');
                process.exit(0);
            })
            .catch(err => {
                console.error('Failed to cleanup phase test users:', err);
                process.exit(1);
            });
    } else {
        console.log('Usage: node create-phase-users.js [create|cleanup]');
        process.exit(1);
    }
}