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

// helper fun to check correct day
const isCorrectDay = (user) => {
  if (!user.lastTrainingDate) return true;

  const lastDate = new Date(user.lastTrainingDate);
  const today = new Date();

  // Reset time portions to compare dates only
  lastDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // Calculate the expected date based on the phase and training day
  let expectedDate = new Date(user.lastTrainingDate);
  expectedDate.setHours(0, 0, 0, 0);
  expectedDate.setDate(expectedDate.getDate() + 1);

  return today.getTime() === expectedDate.getTime();
};



// Middleware
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static('public')); // For serving audio files

// MongoDB connection
mongoose.connect('mongodb://localhost/audio-perception');

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


// User Schema
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  currentPhase: { type: String, enum: ['pretest', 'training', 'posttest'], default: 'pretest' },
  trainingDay: { type: Number, default: 1 },
  lastTrainingDate: { type: Date },
  completed: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isAdmin: { type: Boolean, default: false },  // Add this line
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Response Schema
const responseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  phase: { type: String, required: true },
  trainingDay: { type: Number },
  stimulusId: { type: String, required: true },
  response: { type: String, required: true },
  correct: { type: Boolean },
  timestamp: { type: Date, default: Date.now }
});

const Response = mongoose.model('Response', responseSchema);

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

    const token = jwt.sign({ userId: user.userId, isAdmin: user.isAdmin },
      process.env.JWT_SECRET || 'your_jwt_secret');

    res.json({
      token,
      isAdmin: user.isAdmin,
      currentPhase: user.currentPhase,
      trainingDay: user.trainingDay,
      lastTrainingDate: user.lastTrainingDate,
      completed: user.completed,
      canProceedToday: true // You'll want to implement your date logic here
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Response Routes
app.post('/api/response', authenticateToken, async (req, res) => {
  try {
    const { phase, stimulusId, response, trainingDay } = req.body;
    const user = await User.findOne({ userId: req.user.userId });

    // Check if user is attempting on the correct day
    if (!isCorrectDay(user)) {
      return res.status(403).json({
        error: 'Please return tomorrow to continue your training'
      });
    }

    const newResponse = new Response({
      userId: req.user.userId,
      phase,
      stimulusId,
      response,
      trainingDay
    });

    await newResponse.save();

    // Update user progress
    if (phase === 'pretest' && user.currentPhase === 'pretest') {
      user.currentPhase = 'training';
      user.lastTrainingDate = new Date();
    } else if (phase === 'training') {
      user.lastTrainingDate = new Date();
      if (trainingDay === 4) {
        user.currentPhase = 'posttest';
      }
    } else if (phase === 'posttest') {
      user.completed = true;
    }

    await user.save();
    res.status(201).json({ message: 'Response saved successfully' });
  } catch (error) {
    console.error('Error saving response:', error);
    res.status(500).json({ error: 'Failed to save response' });
  }
});

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