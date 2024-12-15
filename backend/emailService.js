const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',  // or your preferred email service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Email templates
const emailTemplates = {
    trainingReminder: (userId, day) => ({
        subject: `Training Day ${day} Reminder`,
        text: `Hello ${userId},\n\nThis is a reminder that it's time for your Day ${day} training session. Please log in to complete your training.\n\nBest regards,\nPerceptual Training Team`
    }),
    posttestReminder: (userId) => ({
        subject: 'Post-test Reminder',
        text: `Hello ${userId},\n\nIt's time for your post-test assessment. Please log in to complete your final evaluation.\n\nBest regards,\nPerceptual Training Team`
    })
};

// Send email function
const sendEmail = async (to, template) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject: template.subject,
            text: template.text
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

// Send reminder email
const sendReminder = async (user, type, day = null) => {
    const template = type === 'training'
        ? emailTemplates.trainingReminder(user.userId, day)
        : emailTemplates.posttestReminder(user.userId);

    return await sendEmail(user.email, template);
};

module.exports = { sendReminder };