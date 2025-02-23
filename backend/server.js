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
const boxService = require('./boxService');
const initializeAdmin = require('./utils/initAdmin');
const initializeUsers = require('./utils/initUsers');

let server;

//
// MIDDLEWARE
//
// SET UP
// AUDIO CHECKS
// TRAINING DAY CHECK
// AUDIO FILE STRUCTURE --> probably change to get from Box 

// Basic middleware
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static('public'));

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

// Admin Authentication Middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'Access denied' });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    const user = await User.findOne({ userId: verified.userId });

    if (!user || !user.isAdmin) {
      console.log('User not found or not admin');
      return res.status(403).json({ error: 'Access denied - Admin only' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Admin authentication error:', err);
    res.status(403).json({ error: 'Invalid token or insufficient permissions' });
  }
};

// Helper Functions
const isCorrectDay = (user, phase) => {
  if (phase === 'pretest') return true;
  if (!user.pretestDate) return false;

  const pretest = new Date(user.pretestDate);
  const today = new Date();
  pretest.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const daysSincePretest = Math.floor((today - pretest) / (1000 * 60 * 60 * 24));

  if (phase === 'training') {
    return daysSincePretest >= user.trainingDay;  // Allow catching up
  }

  if (phase === 'posttest') {
    return daysSincePretest >= 4;  // Allow posttest on or after day 4
  }

  return false;
};

// Database connection
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }

    if (process.env.NODE_ENV === 'test') {
      console.log('Test environment detected, skipping DB connection');
      return;
    }

    const dbURI = process.env.MONGODB_URI || 'mongodb://localhost/audio-perception';
    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected...');

    // Initialize admin and test users after successful connection
    await initializeUsers();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

// Server startup function
const startServer = async () => {
  await connectDB();
  const PORT = process.env.NODE_ENV === 'test' ? 0 : (process.env.PORT || 3000);
  const server = app.listen(PORT, () => {
    const actualPort = server.address().port;
    console.log(`Server running on port ${actualPort}`);
  });
  return server;
};

// Routes start here
app.use('/audio', express.static(path.join(__dirname, 'public', 'audio')));


//
// Box integration
//

// Route for pretest and posttest files
// Route for pretest and posttest files with test types
app.get('/audio/:phase/:testType/:sentence', authenticateToken, async (req, res) => {
  try {
    const { phase, testType, sentence } = req.params;
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const speaker = user.speaker;

    // Validate phase
    if (phase !== 'pretest' && phase !== 'posttest') {
      return res.status(400).json({ error: 'Invalid phase specified' });
    }

    // Validate test type
    const validTestTypes = Object.values(boxService.testTypes);
    if (!validTestTypes.includes(testType)) {
      return res.status(400).json({
        error: `Invalid test type. Must be one of: ${validTestTypes.join(', ')}`
      });
    }

    // Check if file exists using speaker instead of userId
    const prefix = phase === 'pretest' ? 'Pre' : 'Post';
    const pattern = `${prefix}_${testType}_${String(sentence).padStart(2, '0')}`;
    const exists = await boxService.fileExists(speaker, pattern);

    if (!exists) {
      return res.status(404).json({
        error: `${phase} ${testType} file ${sentence} not found`
      });
    }

    // Get and stream the file using speaker
    const fileStream = await boxService.getTestFile(speaker, phase, testType, sentence);

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-cache');
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error streaming audio:', error);
    res.status(500).json({ error: 'Failed to stream audio file' });
  }
});

// Route for training files (unchanged)
app.get('/audio/training/day/:day/:sentence', authenticateToken, async (req, res) => {
  try {
    const { day, sentence } = req.params;
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const speaker = user.speaker;

    const pattern = `Trn_${String(day).padStart(2, '0')}_${String(sentence).padStart(2, '0')}`;

    const exists = await boxService.fileExists(speaker, pattern);
    if (!exists) {
      return res.status(404).json({
        error: `Training file for day ${day}, sentence ${sentence} not found`
      });
    }

    const fileStream = await boxService.getTrainingFile(speaker, day, sentence);

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-cache');
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error streaming audio:', error);
    res.status(500).json({ error: 'Failed to stream audio file' });
  }
});

// Modified audio structure check route
app.get('/api/check-audio-structure', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const files = await boxService.listUserFiles(userId);

    // Organize files by phase, test type, and training day
    const structure = {
      pretest: {
        comprehension: [],
        effort: [],
        intelligibility: []
      },
      training: {
        day1: [], day2: [], day3: [], day4: []
      },
      posttest: {
        comprehension: [],
        effort: [],
        intelligibility: []
      }
    };

    files.forEach(filename => {
      const info = boxService.parseFileName(filename);
      if (!info) return;

      if (info.phase === 'pretest' || info.phase === 'posttest') {
        const testCategory = info.testType.toLowerCase();
        switch (testCategory) {
          case 'comp':
            structure[info.phase].comprehension.push(filename);
            break;
          case 'eff':
            structure[info.phase].effort.push(filename);
            break;
          case 'int':
            structure[info.phase].intelligibility.push(filename);
            break;
        }
      } else if (info.phase === 'training') {
        structure.training[`day${info.day}`].push(filename);
      }
    });

    res.json({
      message: 'Audio files available',
      structure
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error checking audio structure',
      details: error.message
    });
  }
});



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
      canProceedToday,
      completedTests: Object.fromEntries(user.completedTests) || {}
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
      if (trainingDay >= 4) {
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
app.use('/api/admin', authenticateAdmin)

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
          rating: 1,
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
      'rating',
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
      password: 0,
      _id: 0
    });

    const fields = [
      'userId',
      'email',
      'currentPhase',
      'trainingDay',
      'completed',
      'isActive',
      'createdAt'
    ];

    const csv = json2csv(users, { fields });

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');

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
      fields: ['userId', 'phase', 'trainingDay', 'stimulusId', 'response', 'rating', 'correct', 'timestamp']
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
        communicationType: record.communicationType,

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



// Only auto-start if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer().catch(console.error);
}

// Export for testing
module.exports = { app, startServer, connectDB };
