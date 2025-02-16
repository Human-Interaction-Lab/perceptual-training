// save as initUsers.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const initializeUsers = async () => {
    try {
        // Only proceed if we're not in test environment
        if (process.env.NODE_ENV === 'test') {
            console.log('Test environment detected, skipping user initialization');
            return;
        }

        // Check if admin user exists
        const adminExists = await User.findOne({ isAdmin: true });

        if (!adminExists) {
            // Admin credentials - should be changed after first login
            const adminData = {
                userId: process.env.ADMIN_USER_ID || 'admin',
                email: process.env.ADMIN_EMAIL || 'admin@yourdomain.com',
                password: process.env.ADMIN_PASSWORD || 'changeme123',
                isAdmin: true,
                isActive: true
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
        }

        // Test Users Configuration
        const testUsers = [
            {
                userId: 'test_pretest',
                email: 'pretest@test.com',
                password: 'test1234',
                currentPhase: 'pretest',
                isActive: true
            },
            {
                userId: 'test_training',
                email: 'training@test.com',
                password: 'test1234',
                currentPhase: 'training',
                trainingDay: 1,
                pretestDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
                isActive: true
            },
            {
                userId: 'test_posttest',
                email: 'posttest@test.com',
                password: 'test1234',
                currentPhase: 'posttest',
                trainingDay: 4,
                pretestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                isActive: true
            }
        ];

        // Create or update test users
        for (const userData of testUsers) {
            const existingUser = await User.findOne({ userId: userData.userId });

            if (!existingUser) {
                // Hash password for new user
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(userData.password, salt);

                const user = new User({
                    ...userData,
                    password: hashedPassword
                });

                await user.save();
                console.log(`Test user ${userData.userId} created successfully`);
            } else {
                // Update existing user's phase and related fields
                await User.updateOne(
                    { userId: userData.userId },
                    {
                        $set: {
                            currentPhase: userData.currentPhase,
                            trainingDay: userData.trainingDay,
                            pretestDate: userData.pretestDate
                        }
                    }
                );
                console.log(`Test user ${userData.userId} updated successfully`);
            }
        }

        console.log('All users initialized successfully');
    } catch (error) {
        console.error('Error initializing users:', error);
    }
};

module.exports = initializeUsers;