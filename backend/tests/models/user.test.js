// tests/models/user.test.js
const { mongoose } = require('../setup');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

describe('User Model Test', () => {
    const validUserData = {
        userId: 'testuser1',
        email: 'test@example.com',
        password: 'password123',
        currentPhase: 'pretest'
    };

    beforeEach(async () => {
        await User.deleteMany({});
    });

    describe('User Validation', () => {
        it('should create & save user successfully', async () => {
            const validUser = new User(validUserData);
            const savedUser = await validUser.save();

            expect(savedUser._id).toBeDefined();
            expect(savedUser.userId).toBe(validUserData.userId);
            expect(savedUser.email).toBe(validUserData.email);
            expect(savedUser.currentPhase).toBe('pretest');
            expect(savedUser.trainingDay).toBe(1);
            expect(savedUser.completed).toBe(false);
        });

        it('should fail to save user without required fields', async () => {
            const userWithoutRequiredField = new User({ userId: 'test' });
            let err;

            try {
                await userWithoutRequiredField.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
        });

        it('should fail to save user with invalid email', async () => {
            const userWithInvalidEmail = new User({
                ...validUserData,
                email: 'invalid-email'
            });

            let err;
            try {
                await userWithInvalidEmail.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
            expect(err.errors.email).toBeDefined();
        });

        it('should not save duplicate userId', async () => {
            await new User(validUserData).save();
            const duplicateUser = new User(validUserData);

            let err;
            try {
                await duplicateUser.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeDefined();
            expect(err.code).toBe(11000); // MongoDB duplicate key error code
        });
    });

    describe('User Methods', () => {
        it('should correctly identify when reminder is needed for training', async () => {
            // Create date at start of today
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Set pretest date to exactly 1 day ago at start of day
            const pretestDate = new Date(today);
            pretestDate.setDate(pretestDate.getDate() - 1);

            const user = new User({
                ...validUserData,
                pretestDate: pretestDate
            });

            const reminder = user.needsReminder();
            expect(reminder).toEqual({
                type: 'training',
                day: 1
            });

            // Verify our date math
            const daysSincePretest = Math.floor((today - pretestDate) / (1000 * 60 * 60 * 24));
            expect(daysSincePretest).toBe(1);
        });

        it('should handle different times of day correctly', async () => {
            // Create reference date at specific time
            const referenceDate = new Date('2024-02-09T12:00:00');  // Noon on a specific date

            // Set pretest date to noon yesterday
            const pretestDate = new Date(referenceDate);
            pretestDate.setDate(pretestDate.getDate() - 1);

            const user = new User({
                ...validUserData,
                pretestDate: pretestDate
            });

            // Mock current date to be noon today
            const originalDate = global.Date;
            global.Date = class extends Date {
                constructor(...args) {
                    if (args.length === 0) {
                        return new originalDate(referenceDate);
                    }
                    return new originalDate(...args);
                }
            };

            try {
                const reminder = user.needsReminder();
                expect(reminder).toEqual({
                    type: 'training',
                    day: 1
                });
            } finally {
                // Restore original Date
                global.Date = originalDate;
            }
        });
    });
});