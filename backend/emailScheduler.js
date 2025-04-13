const cron = require('node-cron');
const { User } = require('./models/User'); // Adjust path as needed
const { sendReminder } = require('./emailService');
const { getCurrentDateInEastern, toEasternTime, daysBetween } = require('./utils');

// Schedule function to check and send reminders
const scheduleReminders = () => {
    // Run every day at 9 AM Eastern Time
    // Note: cron runs in server's timezone, but we're explicitly using Eastern Time
    // for all date calculations inside the callback
    cron.schedule('0 9 * * *', async () => {
        try {
            const yesterday = getCurrentDateInEastern();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            // Find users who completed pretest/training yesterday
            const users = await User.find({
                pretestDate: { $exists: true },
                completed: false
            });

            for (const user of users) {
                // Use the Eastern Time utilities for consistent date calculations
                const daysSincePretest = daysBetween(user.pretestDate, yesterday);

                // Send training reminders for days 1-4
                if (daysSincePretest >= 0 && daysSincePretest < 4) {
                    const nextTrainingDay = daysSincePretest + 2;
                    await sendReminder(user, 'training', nextTrainingDay);
                }
                // Send posttest reminder
                else if (daysSincePretest === 4) {
                    await sendReminder(user, 'posttest');
                }
            }
        } catch (error) {
            console.error('Error in reminder scheduler:', error);
        }
    });
};

module.exports = { scheduleReminders };