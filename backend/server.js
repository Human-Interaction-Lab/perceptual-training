const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path'); // Add this line for path module
const json2csv = require('json2csv').parse;
const fs = require('fs');
const app = express();
//const { generateToken, validateInput, asyncHandler, formatError, getAudioPath } = require('./utils');
//const { scheduleReminders } = require('./emailScheduler');
const User = require('./models/User');
const Response = require('./models/Response');
const Demographics = require('./models/Demographics');
let server;

//
// MIDDLEWARE
//
// SET UP
// AUDIO CHECKS
// TRAINING DAY CHECK
// AUDIO FILE STRUCTURE --> probably change to get from Box 

// Middleware
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static('public')); // For serving audio files

// Database connection
const connectDB = async () => {
  try {
    // Skip connection if we're testing (handled by test setup)
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const dbURI = process.env.MONGODB_URI || 'mongodb://localhost/audio-perception';
    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Don't exit process during tests
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

// Server startup function
const startServer = async () => {
  const PORT = process.env.NODE_ENV === 'test' ? 0 : (process.env.PORT || 3000);
  server = app.listen(PORT, () => {
    const actualPort = server.address().port;
    console.log(`Server running on port ${actualPort}`);
  });
  return server;
};

// Initialize if not in test environment
const initialize = async () => {
  await connectDB();
  if (process.env.NODE_ENV !== 'test') {
    await startServer();
    // scheduleReminders();
  }
};

// Serve static files from the public directory
app.use('/audio', express.static(path.join(__dirname, 'public', 'audio')));

// Add a route to check if audio files exist
app.get('/audio/:phase/:filename', (req, res, next) => {
  const { phase, filename } = req.params;
  const filepath = path.join(__dirname, 'public', 'audio', phase, filename);

  // Check if file exists before serving
  if (!require('fs').existsSync(filepath)) {
    return res.status(404).json({ error: `Audio file ${filename} not found in ${phase} phase` });
  }
  next();
});

// Add a route to check if training day audio files exist
app.get('/audio/training/day:day/:filename', (req, res, next) => {
  const { day, filename } = req.params;
  const filepath = path.join(__dirname, 'public', 'audio', 'training', `day${day}`, filename);

  if (!require('fs').existsSync(filepath)) {
    return res.status(404).json({ error: `Audio file ${filename} not found in training day ${day}` });
  }
  next();
});

// Add a utility route to check audio directory structure
app.get('/api/check-audio-structure', async (req, res) => {
  try {
    const audioDir = path.join(__dirname, 'public', 'audio');
    const structure = {
      pretest: await listFiles(path.join(audioDir, 'pretest')),
      training: {},
      posttest: await listFiles(path.join(audioDir, 'posttest'))
    };

    // Get training days
    for (let day = 1; day <= 4; day++) {
      const dayPath = path.join(audioDir, 'training', `day${day}`);
      structure.training[`day${day}`] = await listFiles(dayPath);
    }

    res.json({
      message: 'Audio directory structure',
      structure
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error checking audio structure',
      details: error.message
    });
  }
});


// helper fun to check correct day
const isCorrectDay = (user, phase) => {
  // Always allow pretest completion
  if (phase === 'pretest') return true;

  // If pretest hasn't been completed yet, no other phases are allowed
  if (!user.pretestDate) return false;

  const pretest = new Date(user.pretestDate);
  const today = new Date();

  // Reset time portions to compare dates only
  pretest.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // Calculate days since pretest
  const daysSincePretest = Math.floor((today - pretest) / (1000 * 60 * 60 * 24));

  // For training phase, check if it's the correct day based on training day
  if (phase === 'training') {
    return daysSincePretest === user.trainingDay;
  }

  // For posttest, check if it's 5 days after pretest
  if (phase === 'posttest') {
    return daysSincePretest === 5;
  }

  return false;
};


// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// 
// REGISTER POST
//

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { userId, password, email } = req.body;

    // Validation
    if (!userId || !password || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Check existing user
    const existingUser = await User.findOne({ $or: [{ userId }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User ID or email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      userId,
      password: hashedPassword,
      email
    });

    await user.save();
    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});


//
// LOGIN POST
//

app.post('/api/login', async (req, res) => {
  try {
    const { userId, password } = req.body;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Calculate canProceedToday based on current phase
    let canProceedToday = true;
    if (user.currentPhase === 'pretest') {
      canProceedToday = true; // Always allow pretest
    } else if (user.pretestDate) {
      const pretest = new Date(user.pretestDate);
      const today = new Date();
      pretest.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      const daysSincePretest = Math.floor((today - pretest) / (1000 * 60 * 60 * 24));

      if (user.currentPhase === 'training') {
        canProceedToday = daysSincePretest === user.trainingDay;
      } else if (user.currentPhase === 'posttest') {
        canProceedToday = daysSincePretest === 5;
      }
    }

    const token = jwt.sign(
      { userId: user.userId, isAdmin: user.isAdmin },
      process.env.JWT_SECRET || 'your_jwt_secret'
    );

    res.json({
      token,
      isAdmin: user.isAdmin,
      currentPhase: user.currentPhase,
      trainingDay: user.trainingDay,
      pretestDate: user.pretestDate,
      completed: user.completed,
      canProceedToday
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});



//
// RESPONSE POST
//

// Response Routes
app.post('/api/response', authenticateToken, async (req, res) => {
  try {
    const { phase, stimulusId, response, trainingDay } = req.body;
    const user = await User.findOne({ userId: req.user.userId });

    // Check if user is attempting on the correct day
    if (!isCorrectDay(user, phase)) {
      return res.status(403).json({
        error: 'Please return on the correct day to continue your training'
      });
    }

    const newResponse = new Response({
      userId: req.user.userId,
      phase,
      stimulusId,
      response: phase === 'training' ? 'training_completed' : response,
      trainingDay: phase === 'training' ? trainingDay : undefined
    });

    await newResponse.save();

    // Update user progress
    if (phase === 'pretest' && user.currentPhase === 'pretest') {
      user.currentPhase = 'training';
      user.trainingDay = 1;
      user.pretestDate = new Date(); // Set pretest date when completing pretest
    } else if (phase === 'training') {
      if (trainingDay === 4) {
        user.currentPhase = 'posttest';
      } else {
        user.trainingDay = trainingDay + 1;
      }
    } else if (phase === 'posttest') {
      user.completed = true;
    }

    await user.save();

    // Return updated user state
    res.status(201).json({
      message: 'Response saved successfully',
      currentPhase: user.currentPhase,
      trainingDay: user.trainingDay,
      pretestDate: user.pretestDate,
      completed: user.completed
    });
  } catch (error) {
    console.error('Error saving response:', error);
    res.status(500).json({ error: 'Failed to save response' });
  }
});



//
// ADMIN ROUTES
//

// Admin Routes
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find({}, {
      password: 0,
      _id: 0
    }).sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const usersByPhase = await User.aggregate([
      {
        $group: {
          _id: "$currentPhase",
          count: { $sum: 1 }
        }
      }
    ]);

    const completedUsers = await User.countDocuments({ completed: true });

    res.json({
      totalUsers,
      usersByPhase,
      completedUsers
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

app.delete('/api/admin/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.deleteOne({ userId });
    await Response.deleteMany({ userId }); // Delete user's responses too

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.post('/api/admin/users/:userId/reset-password', async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

app.post('/api/admin/users/:userId/toggle-status', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User ${user.isActive ? 'activated' : 'suspended'} successfully`,
      isActive: user.isActive
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});


// exporting
app.get('/api/admin/export/responses', async (req, res) => {
  try {
    // Fetch all responses with user information
    const responses = await Response.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: 'userId',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userId: 1,
          email: '$user.email',
          phase: 1,
          trainingDay: 1,
          stimulusId: 1,
          response: 1,
          correct: 1,
          timestamp: 1
        }
      }
    ]);

    // Define fields for CSV
    const fields = [
      'userId',
      'email',
      'phase',
      'trainingDay',
      'stimulusId',
      'response',
      'correct',
      'timestamp'
    ];

    // Convert to CSV
    const csv = json2csv(responses, { fields });

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=responses.csv');

    // Send CSV
    res.send(csv);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Route to download user data
app.get('/api/admin/export/users', async (req, res) => {
  try {
    const users = await User.find({}, {
      password: 0, // Exclude password
      __v: 0 // Exclude version key
    });

    // Define fields for CSV
    const fields = [
      'userId',
      'email',
      'currentPhase',
      'trainingDay',
      'lastTrainingDate',
      'completed',
      'isActive',
      'createdAt'
    ];

    // Convert to CSV
    const csv = json2csv(users, { fields });

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');

    // Send CSV
    res.send(csv);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Route to download all data (both users and responses)
app.get('/api/admin/export/all', async (req, res) => {
  try {
    // Fetch all users and responses
    const [users, responses] = await Promise.all([
      User.find({}, { password: 0, __v: 0 }),
      Response.find({})
    ]);

    // Create separate CSV files
    const usersCsv = json2csv(users, {
      fields: ['userId', 'email', 'currentPhase', 'trainingDay', 'completed', 'isActive', 'createdAt']
    });
    const responsesCsv = json2csv(responses, {
      fields: ['userId', 'phase', 'trainingDay', 'stimulusId', 'response', 'correct', 'timestamp']
    });

    // Create a zip file containing both CSVs
    const archiver = require('archiver');
    const archive = archiver('zip');

    // Set headers for zip file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=all_data.zip');

    // Pipe archive data to response
    archive.pipe(res);

    // Add CSV files to the zip
    archive.append(usersCsv, { name: 'users.csv' });
    archive.append(responsesCsv, { name: 'responses.csv' });

    // Finalize archive
    archive.finalize();

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});



// Utility function to list files in a directory
async function listFiles(dir) {
  try {
    const files = await fs.readdir(dir);
    return files.filter(file => file.endsWith('.wav'));
  } catch (error) {
    return [];
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// schedule email reminders
// scheduleReminders();




//
// DEMOGRAPHICS and CPIB POST, GET, PUT
//

// Create demographics entry
app.post('/api/demographics', authenticateToken, async (req, res) => {
  try {
    // Add userId from authenticated token to the demographics data
    const demographicsData = {
      ...req.body,
      userId: req.user.userId
    };

    // Check if demographics already exist for this user
    const existingDemographics = await Demographics.findOne({ userId: req.user.userId });
    if (existingDemographics) {
      return res.status(400).json({ error: 'Demographics already exist for this user' });
    }

    // Create new demographics entry
    const demographics = new Demographics(demographicsData);
    await demographics.save();

    res.status(201).json(demographics);
  } catch (error) {
    console.error('Error saving demographics:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to save demographics' });
  }
});

// Get demographics for a user
app.get('/api/demographics/:userId', authenticateToken, async (req, res) => {
  try {
    const demographics = await Demographics.findOne({ userId: req.params.userId });
    if (!demographics) {
      return res.status(404).json({ error: 'Demographics not found' });
    }
    res.json(demographics);
  } catch (error) {
    console.error('Error fetching demographics:', error);
    res.status(500).json({ error: 'Failed to fetch demographics' });
  }
});

// Update demographics (for research personnel only)
app.put('/api/demographics/:userId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Only research personnel can update demographics' });
    }

    const demographics = await Demographics.findOneAndUpdate(
      { userId: req.params.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!demographics) {
      return res.status(404).json({ error: 'Demographics not found' });
    }

    res.json(demographics);
  } catch (error) {
    console.error('Error updating demographics:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update demographics' });
  }
});

// Admin route to get all demographics
app.get('/api/admin/demographics', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const demographics = await Demographics.find({});
    res.json(demographics);
  } catch (error) {
    console.error('Error fetching all demographics:', error);
    res.status(500).json({ error: 'Failed to fetch demographics' });
  }
});

// Export demographics data to CSV with full CPIB responses
app.get('/api/admin/export/demographics', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const demographics = await Demographics.find({}).lean();

    // Transform the data to flatten CPIB responses
    const flattenedData = demographics.map(record => {
      const flatRecord = {
        userId: record.userId,
        dateOfBirth: record.dateOfBirth,
        ethnicity: record.ethnicity,
        race: record.race,
        sexAssignedAtBirth: record.sexAssignedAtBirth,
        isEnglishPrimary: record.isEnglishPrimary,
        cognitiveImpairment: record.cognitiveImpairment,
        hearingLoss: record.hearingLoss,
        hearingAids: record.hearingAids,
        relationshipToPartner: record.relationshipToPartner,
        relationshipOther: record.relationshipOther,
        communicationFrequency: record.communicationFrequency,

        // CPIB Individual Responses
        cpib_talkingKnownPeople: record.cpib?.talkingKnownPeople?.response,
        cpib_communicatingQuickly: record.cpib?.communicatingQuickly?.response,
        cpib_talkingUnknownPeople: record.cpib?.talkingUnknownPeople?.response,
        cpib_communicatingCommunity: record.cpib?.communicatingCommunity?.response,
        cpib_askingQuestions: record.cpib?.askingQuestions?.response,
        cpib_communicatingSmallGroup: record.cpib?.communicatingSmallGroup?.response,
        cpib_longConversation: record.cpib?.longConversation?.response,
        cpib_detailedInformation: record.cpib?.detailedInformation?.response,
        cpib_fastMovingConversation: record.cpib?.fastMovingConversation?.response,
        cpib_persuadingOthers: record.cpib?.persuadingOthers?.response,

        // CPIB Total Score
        cpibTotalScore: record.cpibTotalScore,

        formCompletedBy: record.formCompletedBy,
        submitted: record.submitted,

        // Research Data (if available)
        hearingScreeningCompleted: record.researchData?.hearingScreeningCompleted,
        researchNotes: record.researchData?.notes
      };

      // Add hearing thresholds if they exist
      if (record.researchData?.hearingThresholds) {
        record.researchData.hearingThresholds.forEach(threshold => {
          flatRecord[`threshold_${threshold.frequency}Hz_left`] = threshold.leftEar;
          flatRecord[`threshold_${threshold.frequency}Hz_right`] = threshold.rightEar;
        });
      }

      return flatRecord;
    });

    // Define fields for CSV based on first record's keys
    const fields = Object.keys(flattenedData[0] || {});

    // Convert to CSV with all fields
    const csv = json2csv(flattenedData, { fields });

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=demographics_full.csv');

    // Send CSV
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export demographics data' });
  }
});




// Call initialize
initialize().catch(console.error);

// Export for testing
module.exports = { app, server, startServer };
