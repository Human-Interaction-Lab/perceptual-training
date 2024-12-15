// backend/tests/testEmailScheduler.js
require('dotenv').config();
const mongoose = require('mongoose');
const { sendReminder } = require('../emailService');
const User = require('../models/User');

// Test configurations
const TEST_EMAIL = process.env.TEST_EMAIL || 'your.test@email.com';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Test functions
async function createTestUser(daysFromPretest) {
    const pretestDate = new Date();
    pretestDate.setDate(pretestDate.getDate() - daysFromPretest);

    const user = new User({
        userId: `test_user_${Date.now()}`,
        email: TEST_EMAIL,
        password: 'password123',
        pretestDate: pretestDate,
        currentPhase: daysFromPretest >= 5 ? 'posttest' : 'training',
        trainingDay: Math.min(daysFromPretest + 1, 4),
        completed: false
    });

    await user.save();
    return user;
}

// Test sending emails for different scenarios
async function runTests() {
    try {
        console.log('Starting email scheduler tests...');

        // Test 1: Training Day 2 reminder
        console.log('\nTest 1: Training Day 2 reminder');
        const user1 = await createTestUser(1);
        await sendReminder(user1, 'training', 2);

        // Test 2: Training Day 4 reminder
        console.log('\nTest 2: Training Day 4 reminder');
        const user2 = await createTestUser(3);
        await sendReminder(user2, 'training', 4);

        // Test 3: Posttest reminder
        console.log('\nTest 3: Posttest reminder');
        const user3 = await createTestUser(4);
        await sendReminder(user3, 'posttest');

        // Test 4: Already completed user (should not send)
        console.log('\nTest 4: Completed user (should not send)');
        const user4 = await createTestUser(2);
        user4.completed = true;
        await user4.save();
        const needsReminder = user4.needsReminder();
        console.log('Needs reminder:', needsReminder);

        // Cleanup
        await Promise.all([
            User.deleteOne({ _id: user1._id }),
            User.deleteOne({ _id: user2._id }),
            User.deleteOne({ _id: user3._id }),
            User.deleteOne({ _id: user4._id })
        ]);

        console.log('\nAll tests completed!');
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

// Run all tests
runTests();