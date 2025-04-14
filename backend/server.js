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
//const initializeAdmin = require('./utils/initAdmin');
const { initializeUsers } = require('./utils/initUsers');
const tempFileService = require('./tempFileService');
require('dotenv').config();
const helmet = require('helmet');
const config = {
  PORT: process.env.NODE_ENV === 'test' ? 0 : (process.env.PORT || 28303),
  CLIENT_ORIGIN: process.env.NODE_ENV === 'production'
    ? 'https://speechtraining.usu.edu'
    : 'http://localhost:3001'
};

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
  origin: [config.CLIENT_ORIGIN],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static('public'));
app.use(helmet());
if (process.env.NODE_ENV === 'production') {
  //app.use(session({
  //  secret: process.env.SESSION_SECRET,
  //  resave: false,
  //  saveUninitialized: true,
  //  cookie: {
  //    secure: true,
  //    httpOnly: true,
  //    sameSite: 'strict'
  //  }
  //}));
}


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

  // Updated to handle specific posttest phases
  if (phase === 'posttest1') {
    return daysSincePretest >= 12;  // Allow posttest1 on or after day 12
  }

  if (phase === 'posttest2') {
    return daysSincePretest >= 35;  // Allow posttest2 on or after day 35
  }

  // For backward compatibility with general 'posttest'
  if (phase === 'posttest') {
    return daysSincePretest >= 12;  // Same as posttest1
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
  await tempFileService.initialize();
  const PORT = process.env.NODE_ENV === 'test' ? 0 : (process.env.PORT || 28303);
  const server = app.listen(config.PORT, () => {
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

// Static audio file serving
app.use('/audio', express.static(path.join(__dirname, 'public', 'audio')));

// Route for training files
app.get('/audio/training/day/:day/:sentence', authenticateToken, async (req, res) => {
  try {
    const { day, sentence } = req.params;
    const userId = req.user.userId;  // Get userId from the authenticated request

    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const speaker = user.speaker;

    // The story number will now be passed as a query parameter from the frontend
    let storyNumber;

    // Check if a specific story is requested via query param
    if (req.query.story) {
      storyNumber = req.query.story;
      console.log(`Using requested story number: ${storyNumber} for day ${day}`);
    } else {
      // Fallback to the default mapping if no story is specified
      const dayToStory = {
        "1": "02",
        "2": "03",
        "3": "04",
        "4": "07"
      };
      storyNumber = dayToStory[day] || String(parseInt(day) + 1).padStart(2, '0');
      console.log(`Using fallback story number: ${storyNumber} for day ${day}`);
    }
    const pattern = `Trn_${storyNumber}_${String(sentence).padStart(2, '0')}`;
    const exists = await boxService.fileExists(speaker, pattern);

    if (!exists) {
      return res.status(404).json({
        error: `Training file for day ${day}, sentence ${sentence} not found`
      });
    }

    // FIXED: Corrected parameter order in streamAndSaveFile call
    // Use the same story number we determined above
    const fileInfo = await tempFileService.streamAndSaveFile(
      userId,                  // First param should be userId (was speaker)
      speaker,                 // Second param should be speaker (was 'training')
      'training',              // Third param should be phase (was null)
      null,                    // Fourth param should be testType (was day+1)
      storyNumber,             // Fifth param should be version (use the story number from query or mapping)
      parseInt(sentence)       // Sixth param should be sentence (was missing)
    );

    // Return the URL to the temporary file
    res.json({
      url: fileInfo.relativeUrl,
      filename: fileInfo.filename
    });
  } catch (error) {
    console.error('Error handling training audio request:', error);
    res.status(500).json({ error: 'Failed to retrieve training audio file' });
  }
});

// Route for pretest and posttest files with test types
app.get('/audio/:phase/:testType/:version/:sentence', authenticateToken, async (req, res) => {
  try {
    const { phase, testType, version, sentence } = req.params;
    const userId = req.user.userId

    // Log the parameters as received
    console.log('Audio request params:', { phase, testType, version, sentence });

    // Ensure testType is a string and not parsed as a number
    const safeTestType = testType.toString().toUpperCase();
    const versionNum = version === 'null' ? null : parseInt(version);
    const sentenceNum = parseInt(sentence);

    console.log('Processed params:', { phase, safeTestType, versionNum, sentenceNum });

    const user = await User.findOne({ userId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const speaker = user.speaker;

    // Special handling for practice files
    if (phase === 'practice' && testType === 'practice') {
      console.log('Processing practice audio request...');

      // Use a fixed pattern for practice file
      const pattern = `Practice`;

      console.log(`Checking if file exists: ${speaker}_Practice.wav`);

      const exists = await boxService.fileExists(speaker, pattern);
      if (!exists) {
        return res.status(404).json({
          error: `Practice file not found for speaker ${speaker}`
        });
      }

      // Stream and save the practice file
      const fileInfo = await tempFileService.streamAndSaveFile(
        userId,
        speaker,
        'practice',
        'PRACTICE',
        null,
        ''
      );

      // Return the URL to the temporary file
      return res.json({
        url: fileInfo.relativeUrl,
        filename: fileInfo.filename
      });
    }

    // Validate phase - ensure this route is only used for pretest and posttest
    if (phase !== 'pretest' && !phase.startsWith('posttest')) {
      return res.status(400).json({ error: 'Invalid phase specified. Must be pretest or posttest' });
    }

    // Validate test type against available types in boxService
    const validTestTypes = Object.keys(boxService.testTypes);
    if (!validTestTypes.includes(testType.toUpperCase())) {
      return res.status(400).json({
        error: `Invalid test type. Must be one of: ${validTestTypes.join(', ')}`
      });
    }

    // Check if file exists in Box - use appropriate pattern based on test type
    let pattern;
    const testTypeUpper = testType.toUpperCase();

    if (testTypeUpper === "COMPREHENSION") {
      pattern = `Comp_${String(version).padStart(2, '0')}_${String(sentence).padStart(2, '0')}`;
    } else if (testTypeUpper === "INTELLIGIBILITY") {
      // For intelligibility, we need to use the proper randomized sequence
      // Get the randomization module from the frontend code
      // We're using the same randomization logic on the server side to ensure consistency
      try {
        // Import the randomization utils
        const path = require('path');
        const randomizationPath = path.join(__dirname, '..', 'frontend', 'src', 'utils', 'randomization.js');

        // Force clear require cache to ensure we get fresh module
        delete require.cache[require.resolve(randomizationPath)];

        // Load the randomization module
        const randomization = require(randomizationPath);

        // Verify randomization module is loaded correctly
        if (!randomization || typeof randomization.getGroupForPhase !== 'function') {
          throw new Error('Randomization module not loaded correctly. Available methods: ' +
            Object.keys(randomization).join(', '));
        }

        // Get the randomized sequence for this user and phase
        const randomizedFiles = randomization.getGroupForPhase(phase, null, userId);

        // Verify we got a valid array back
        if (!Array.isArray(randomizedFiles) || randomizedFiles.length === 0) {
          throw new Error(`No randomized files returned for user ${userId}, phase ${phase}`);
        }

        console.log(`Server.js: Got randomized sequence for ${userId}, phase=${phase}: ${randomizedFiles.slice(0, 5)}...`);

        // IMPORTANT: If sentence is already a randomized file number, we should use it directly
        // instead of trying to look it up in the randomized sequence
        let randomizedFileNumber;

        // Check if the sentence is already one of the randomized file numbers
        if (randomizedFiles.includes(parseInt(sentence))) {
          console.log(`Server.js: Sentence ${sentence} is already a randomized file number, using directly`);
          randomizedFileNumber = parseInt(sentence);
        } else {
          // Otherwise, map the sequential index to the randomized file number
          // Note: sentence is 1-indexed in the URL params, but array is 0-indexed
          console.log(`Server.js: Treating ${sentence} as a sequential index, mapping to randomized file`);
          randomizedFileNumber = randomizedFiles[parseInt(sentence) - 1];
        }

        console.log(`Using randomized intelligibility number ${randomizedFileNumber} instead of ${sentence}`);

        // Create the pattern with the randomized file number
        pattern = `Int${String(randomizedFileNumber).padStart(2, '0')}`;
        console.log(`Using randomized intelligibility file pattern: ${pattern}`);
      } catch (randomizationError) {
        console.error('Error using randomization for intelligibility files:', randomizationError);

        // Add more detailed error logging to help diagnose issues
        if (randomizationError.stack) {
          console.error('Stack trace:', randomizationError.stack);
        }

        // Check if randomization module exists but has incorrect exports
        try {
          const randomizationTest = require(randomizationPath);
          console.error('Randomization module loaded but methods missing. Available methods:',
            Object.keys(randomizationTest).join(', '));
        } catch (e) {
          console.error('Could not load randomization module at all:', e.message);
        }

        // Fallback to using the sequential number if randomization fails
        pattern = `Int${String(sentence).padStart(2, '0')}`;
        console.log(`FALLBACK: Using sequential intelligibility file pattern: ${pattern}`);
      }
    } else { // EFFORT
      pattern = `EFF${String(sentence).padStart(2, '0')}`;
    }

    const exists = await boxService.fileExists(speaker, pattern);
    if (!exists) {
      return res.status(404).json({
        error: `${phase} ${testType} file ${version}/${sentence} not found`
      });
    }

    // Stream and save the file from Box
    const fileInfo = await tempFileService.streamAndSaveFile(
      userId,
      speaker,
      phase,
      safeTestType,  // Use the safe string version
      versionNum,
      sentenceNum
    );

    // Return the URL to the temporary file
    res.json({
      url: fileInfo.relativeUrl,
      filename: fileInfo.filename
    });
  } catch (error) {
    console.error('Error handling audio request:', error);
    res.status(500).json({ error: 'Failed to retrieve audio file' });
  }
});

// Preload audio files for a specific phase
app.post('/api/audio/preload', authenticateToken, async (req, res) => {
  try {
    const { phase, trainingDay, activeTestTypes, maxFiles } = req.body;
    const userId = req.user.userId;

    console.log(`Preload request for ${phase} with params:`, {
      trainingDay,
      activeTestTypes,
      maxFiles: maxFiles || 'all',
      userId
    });

    // Get user to retrieve speaker information
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate the phase
    const validPhases = ['pretest', 'training', 'posttest1', 'posttest2', 'posttest3'];
    if (!validPhases.includes(phase)) {
      return res.status(400).json({ error: 'Invalid phase specified' });
    }

    // Validate training day if applicable
    if (phase === 'training' && (!trainingDay || trainingDay < 1 || trainingDay > 4)) {
      return res.status(400).json({ error: 'Valid training day (1-4) required for training phase' });
    }

    // Check if user is allowed to access this phase/day
    if (!isCorrectDay(user, phase)) {
      return res.status(403).json({
        error: 'You are not scheduled for this phase/day yet'
      });
    }

    // Preload audio files for the specified phase
    const preloadResult = await tempFileService.preloadPhaseFiles(
      userId,
      user.speaker,
      phase,
      phase === 'training' ? trainingDay : null,
      activeTestTypes, // Pass through the active test types
      maxFiles // Add maxFiles parameter
    );

    // Format a user-friendly message about what was preloaded
    const filesDescription = maxFiles ? `first ${maxFiles} files` : 'all files';

    res.json({
      success: true,
      message: `Successfully processed ${preloadResult.count} files for ${phase}${phase === 'training' ? ` day ${trainingDay}` : ''}${activeTestTypes ? ` (test types: ${activeTestTypes.join(', ')})` : ''} (${preloadResult.newlyDownloaded} new, ${preloadResult.skipped} already loaded)`,
      files: preloadResult.files,
      partialPreload: maxFiles ? true : false // Indicate if this was a partial preload
    });
  } catch (error) {
    console.error('Error preloading audio files:', error);
    res.status(500).json({ error: 'Failed to preload audio files' });
  }
});

// Route to notify the server that a file has been played (to clean it up)
app.post('/api/audio/played', authenticateToken, async (req, res) => {
  try {
    const { filename, cleanup = false } = req.body;
    const userId = req.user.userId;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    if (cleanup) {
      // If cleanup is true, remove the file immediately
      setTimeout(() => {
        tempFileService.removeFile(filename).catch(err => {
          console.error(`Error removing file ${filename}:`, err);
        });
      }, 5000); // 5 second delay
    } else {
      // Otherwise just update the timestamp to prevent early cleanup
      tempFileService.markFilePlayed(userId, filename);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking file as played:', error);
    res.status(500).json({ error: 'Failed to process request' });
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
// SESSION ENDING ROUTE
//

// New route to handle session end and cleanup only played files
app.post('/api/session/end', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Clean up only files that were played during the session
    const cleanupResult = await tempFileService.cleanupPlayedUserFiles(userId);

    res.json({
      success: true,
      message: `Session ended successfully. Cleaned up ${cleanupResult.removed} played files, kept ${cleanupResult.kept} unplayed files.`
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session properly' });
  }
});

// Special endpoint to explicitly mark a test as completed
app.post('/api/test-completed', authenticateToken, async (req, res) => {
  try {
    const { phase, testType, completed } = req.body;

    if (!phase || !testType) {
      return res.status(400).json({ error: 'Phase and testType are required' });
    }

    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`Explicitly marking test ${testType} as ${completed ? 'completed' : 'not completed'} for phase ${phase}`);

    // Mark the test as completed with multiple formats for consistency and backward compatibility
    user.markTestCompleted(phase, testType.toUpperCase(), completed);
    user.markTestCompleted(phase, `${phase}_${testType}`, completed);
    user.markTestCompleted(phase, testType, completed);

    // Additional key for the combined format
    const combinedKey = `${phase}_${testType}`;
    user.completedTests.set(combinedKey, completed);

    // CRITICAL FIX: Set the pretestDate if this is the first completion of a pretest component
    if (phase === 'pretest' && completed && !user.pretestDate) {
      const { getCurrentDateInEastern } = require('./utils');
      const easternDate = getCurrentDateInEastern();
      console.log(`*** SETTING PRETEST DATE to ${easternDate} (Eastern Time) for user ${user.userId} via test-completed endpoint ***`);
      user.pretestDate = easternDate;
    }

    // Save the user to persist changes
    await user.save();

    res.json({
      success: true,
      message: `Test ${testType} marked as ${completed ? 'completed' : 'not completed'} for phase ${phase}`,
      completedTests: Object.fromEntries(user.completedTests) || {}
    });
  } catch (error) {
    console.error('Error marking test as completed:', error);
    res.status(500).json({ error: 'Failed to mark test completion status' });
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
      } else if (user.currentPhase === 'posttest1') {
        // For posttest1, we use day 12
        canProceedToday = daysSincePretest >= 12;
      } else if (user.currentPhase === 'posttest2') {
        // For posttest2, we use day 35
        canProceedToday = daysSincePretest >= 35;
      } else if (user.currentPhase === 'posttest') {
        // Backward compatibility - generic posttest
        canProceedToday = daysSincePretest >= 12;
      }
    }

    const token = jwt.sign(
      { userId: user.userId, isAdmin: user.isAdmin },
      process.env.JWT_SECRET || 'your_jwt_secret'
    );

    // Get completed tests for the current phase
    const currentPhaseCompletedTests = user.getCompletedTestsForPhase(user.currentPhase);

    // Check specifically for demographics completion
    const isDemographicsCompleted =
      user.completedTests.get('demographics') === true ||
      user.completedTests.get('pretest_demographics') === true;

    // Check if test users were recently initialized
    let testUsersInitialized = false;
    let testUsersInitializedAt = null;

    if (userId.startsWith('test_')) {
      // This is a test user, so check for the initialization flag
      try {
        const adminUser = await User.findOne({ isAdmin: true });
        if (adminUser && adminUser.testUsersInitializedAt) {
          testUsersInitializedAt = adminUser.testUsersInitializedAt;

          // Calculate if initialization happened recently (within the last 10 minutes)
          const initTime = new Date(adminUser.testUsersInitializedAt);
          const currentTime = new Date();
          const timeDiffMinutes = (currentTime - initTime) / (1000 * 60);

          testUsersInitialized = timeDiffMinutes < 10; // Flag as true if init was less than 10 minutes ago
          console.log(`Test user initialization status: ${testUsersInitialized ? 'RECENT' : 'OLD'} (${Math.round(timeDiffMinutes)} minutes ago)`);
        }
      } catch (error) {
        console.error('Error checking test user initialization status:', error);
      }
    }

    res.json({
      token,
      isAdmin: user.isAdmin,
      currentPhase: user.currentPhase,
      trainingDay: user.trainingDay,
      pretestDate: user.pretestDate,
      completed: user.completed,
      canProceedToday,
      completedTests: Object.fromEntries(user.completedTests) || {},
      currentPhaseCompletedTests,
      isDemographicsCompleted, // Send explicit flag about demographics completion
      testUsersInitialized,    // Add flag for test users initialization
      testUsersInitializedAt   // Add timestamp of when test users were last initialized
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
    const { phase, testType, stimulusId, response, trainingDay, rating, isTestCompleted } = req.body;
    const user = await User.findOne({ userId: req.user.userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is attempting on the correct day
    // Skip the day check for training phase - this allows the training tests to work
    // regardless of the day of the week
    if (phase !== 'training' && !isCorrectDay(user, phase)) {
      return res.status(403).json({
        error: 'Please return on the correct day to continue your training'
      });
    }

    // For test responses, create a unique test identifier combining test type and stimulus id
    // For training tests, we also want to create a unique identifier
    let testId = null;
    if (phase !== 'training') {
      testId = `${testType}_${stimulusId}`;
    } else if (testType === 'intelligibility') {
      // Also create a test ID for training tests with intelligibility
      testId = `training_intel_${stimulusId}`;
    }

    // Special handling for test completion
    // This is true when the frontend indicates this is the last response of a test type
    if (isTestCompleted) {
      console.log(`*** MARKING TEST TYPE ${testType} AS COMPLETED FOR PHASE ${phase} ***`);
      // Also mark the entire test type as completed in addition to the individual stimulus
      user.markTestCompleted(phase, testType.toUpperCase(), true);

      // For backward compatibility, also mark it with the special key format
      user.markTestCompleted(phase, `${phase}_${testType}`, true);
      user.markTestCompleted(phase, testType, true); // Simple key for backward compatibility

      // Additional key for the combined format
      const combinedKey = `${phase}_${testType}`;
      user.completedTests.set(combinedKey, true);

      console.log(`Added test completion markers to user record for ${phase}_${testType}`);

      // CRITICAL FIX: Set the pretestDate if this is the first completion of a pretest component
      // This ensures the pretestDate is set when users start the pretest phase
      if (phase === 'pretest' && !user.pretestDate) {
        const { getCurrentDateInEastern } = require('./utils');
        const easternDate = getCurrentDateInEastern();
        console.log(`*** SETTING PRETEST DATE to ${easternDate} (Eastern Time) for user ${user.userId} ***`);
        user.pretestDate = easternDate;
      }

      // Immediately save the user to ensure completion state is persisted
      await user.save();
      console.log(`User record saved with updated test completion status`);
    }

    // Create response record
    const newResponse = new Response({
      userId: req.user.userId,
      phase,
      stimulusId,
      // Save the actual response when testType is 'intelligibility' (training test)
      // Otherwise use the default 'training_completed' for training phase
      response: (phase === 'training' && testType !== 'intelligibility') ? 'training_completed' : response,
      trainingDay: phase === 'training' ? trainingDay : undefined,
      rating: testType === 'effort' ? rating : undefined
    });

    console.log('Creating new response:', {
      phase,
      testType,
      stimulusId,
      responsePreview: response ? response.substring(0, 20) + '...' : 'null',
      savedAs: newResponse.response.substring(0, 20) + '...',
      trainingDay
    });

    await newResponse.save();

    // Mark test as completed with appropriate phase prefix
    if (testId) {
      console.log(`Marking test as completed: phase=${phase}, testId=${testId}`);
      // Mark the test as completed - for both regular tests and training tests
      user.markTestCompleted(phase, testId, true);
    }

    // Update user progress
    if (phase === 'pretest' && user.currentPhase === 'pretest') {
      // Check if all pretest items are completed
      const pretestCompleted = checkAllPretestCompleted(user);

      if (pretestCompleted) {
        user.currentPhase = 'training';
        user.trainingDay = 1;
        user.pretestDate = new Date(); // Set pretest date when completing pretest
      }
    } else if (phase === 'training') {
      if (trainingDay >= 4) {
        user.currentPhase = 'posttest1'; // Changed from 'posttest' to 'posttest1'
      } else {
        user.trainingDay = trainingDay + 1;
      }
    } else if (phase === 'posttest1') {
      // Check if all posttest1 items are completed
      const posttestCompleted = checkAllPosttestCompleted(user, 'posttest1');

      if (posttestCompleted) {
        console.log(`User ${user.userId} has completed posttest1`);

        // Mark posttest1 as completed 
        user.markTestCompleted('posttest1', 'COMPLETED', true);

        // Set phase to posttest2 but don't auto-advance
        // The frontend will still check date requirements before allowing access
        user.currentPhase = 'posttest2';

        // Don't mark the study as fully completed yet - this happens after posttest2
      }
    } else if (phase === 'posttest2') {
      // Check if all posttest2 items are completed
      const posttest2Completed = checkAllPosttestCompleted(user, 'posttest2');

      if (posttest2Completed) {
        console.log(`User ${user.userId} has completed posttest2 and the entire study`);

        // Mark posttest2 as completed
        user.markTestCompleted('posttest2', 'COMPLETED', true);

        // Mark the entire study as completed
        user.completed = true;
        user.currentPhase = 'completed';
      }
    }
    // Additional posttest phases can be added here

    await user.save();

    // Return updated user state with completed tests
    res.status(201).json({
      message: 'Response saved successfully',
      currentPhase: user.currentPhase,
      trainingDay: user.trainingDay,
      pretestDate: user.pretestDate,
      completed: user.completed,
      completedTests: Object.fromEntries(user.completedTests) || {}
    });
  } catch (error) {
    console.error('Error saving response:', error);
    res.status(500).json({ error: 'Failed to save response' });
  }
});

// Helper function to check if all pretest items are completed
// This is a placeholder - you should define your required tests
function checkAllPretestCompleted(user) {
  const requiredTests = [
    'COMPREHENSION_1',
    'COMPREHENSION_2',
    'EFFORT_1',
    'INTELLIGIBILITY_1'
  ];

  return user.hasCompletedAllTests('pretest', requiredTests);
}

// Helper function to check if all posttest items are completed
function checkAllPosttestCompleted(user, postTestPhase) {
  const requiredTests = [
    'COMPREHENSION_1',
    'COMPREHENSION_2',
    'EFFORT_1',
    'INTELLIGIBILITY_1'
  ];

  return user.hasCompletedAllTests(postTestPhase, requiredTests);
}



//
// ADMIN ROUTES
//

app.use('/api/admin/export', (req, res, next) => {
  console.log('Export request headers:', req.headers);
  console.log('Auth header:', req.headers.authorization);
  next();
});

// Helper function to handle authorization for export routes
//const handleExportRequest = async (req, res, exportFunction) => {
//  try {
//    // Check for authorization token
//    const authHeader = req.headers['authorization'];
//    const token = authHeader && authHeader.split(' ')[1];
//
//    if (!token) {
//      return res.status(401).json({ error: 'Access denied - No token provided' });
//    }
//
//    // Verify the token
//    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
//    const user = await User.findOne({ userId: verified.userId });
//
//    if (!user || !user.isAdmin) {
//      return res.status(403).json({ error: 'Access denied - Admin only' });
//    }
//
//    // If authorization passes, execute the export function
//    await exportFunction(req, res);
//  } catch (error) {
//    console.error('Export error:', error);
//    res.status(500).json({ error: 'Failed to export data' });
//  }
//};

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

// Route to update user details
app.put('/api/admin/users/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, trainingDay, pretestDate, currentPhase, speaker } = req.body;

    // Input validation
    if (email && !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (trainingDay && (trainingDay < 1 || trainingDay > 4)) {
      return res.status(400).json({ error: 'Training day must be between 1 and 4' });
    }

    // Find the user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update fields if provided
    if (email) user.email = email;
    if (trainingDay) user.trainingDay = trainingDay;
    if (currentPhase) user.currentPhase = currentPhase;
    if (speaker) user.speaker = speaker;

    // Handle pretest date specially
    if (pretestDate) {
      try {
        user.pretestDate = new Date(pretestDate);
      } catch (err) {
        return res.status(400).json({ error: 'Invalid pretest date format' });
      }
    }

    // Save the updated user
    await user.save();

    res.json({
      message: 'User updated successfully',
      user: {
        userId: user.userId,
        email: user.email,
        trainingDay: user.trainingDay,
        currentPhase: user.currentPhase,
        pretestDate: user.pretestDate,
        speaker: user.speaker
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to update user' });
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



// 
// ADMIN DOWNLOAD DATA
//

// Support both GET and POST for all export routes
// Responses export
app.get('/api/admin/export/responses', authenticateAdmin, async (req, res) => {
  try {
    console.log('Processing responses export request');

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
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
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

    console.log(`Found ${responses.length} responses to export`);

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
    console.log('Response export completed successfully');
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Users export
app.get('/api/admin/export/users', authenticateAdmin, async (req, res) => {
  try {
    console.log('Processing users export request');

    const users = await User.find({}, {
      password: 0,
      _id: 0
    });

    console.log(`Found ${users.length} users to export`);

    const fields = [
      'userId',
      'email',
      'speaker',
      'currentPhase',
      'trainingDay',
      'pretestDate',
      'completed',
      'isActive',
      'createdAt'
    ];

    const csv = json2csv(users, { fields });

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');

    res.send(csv);
    console.log('User export completed successfully');
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// All data export
app.get('/api/admin/export/all', authenticateAdmin, async (req, res) => {
  try {
    console.log('Processing all data export request (ZIP)');

    // Fetch all users and responses
    const [users, responses, demographics] = await Promise.all([
      User.find({}, { password: 0, __v: 0 }),
      Response.find({}),
      Demographics.find({})
    ]);

    console.log(`Found ${users.length} users, ${responses.length} responses, and ${demographics.length} demographics to export`);

    // Create separate CSV files
    const usersCsv = json2csv(users, {
      fields: ['userId', 'email', 'speaker', 'currentPhase', 'trainingDay', 'completed', 'isActive', 'createdAt']
    });

    const responsesCsv = json2csv(responses, {
      fields: ['userId', 'phase', 'trainingDay', 'stimulusId', 'response', 'rating', 'correct', 'timestamp']
    });

    // Flatten demographics for CSV
    const flattenedDemographics = demographics.map(record => {
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
        formCompletedBy: record.formCompletedBy,
        submitted: record.submitted
      };

      // Add research data if available
      if (record.researchData) {
        flatRecord.hearingScreeningCompleted = record.researchData.hearingScreeningCompleted;
        flatRecord.researchNotes = record.researchData.notes;

        // Add hearing thresholds
        if (record.researchData.hearingThresholds) {
          record.researchData.hearingThresholds.forEach(threshold => {
            flatRecord[`threshold_${threshold.frequency}Hz_left`] = threshold.leftEar;
            flatRecord[`threshold_${threshold.frequency}Hz_right`] = threshold.rightEar;
          });
        }
      }

      return flatRecord;
    });

    const demographicsCsv = json2csv(flattenedDemographics);

    // Create a zip file containing all CSVs
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
    archive.append(demographicsCsv, { name: 'demographics.csv' });

    // Finalize archive
    archive.finalize();
    console.log('ZIP archive finalized and sent');
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

// Export demographics data to CSV
app.get('/api/admin/export/demographics', authenticateAdmin, async (req, res) => {
  try {
    console.log('Processing demographics export request');

    const demographics = await Demographics.find({}).lean();
    console.log(`Found ${demographics.length} demographics records to export`);

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
        formCompletedBy: record.formCompletedBy,
        submitted: record.submitted,
      };

      // Add research data if available
      if (record.researchData) {
        flatRecord.hearingScreeningCompleted = record.researchData.hearingScreeningCompleted;
        flatRecord.researchNotes = record.researchData.notes;

        // Add hearing thresholds if they exist
        if (record.researchData.hearingThresholds) {
          record.researchData.hearingThresholds.forEach(threshold => {
            flatRecord[`threshold_${threshold.frequency}Hz_left`] = threshold.leftEar;
            flatRecord[`threshold_${threshold.frequency}Hz_right`] = threshold.rightEar;
          });
        }
      }

      return flatRecord;
    });

    // Define fields for CSV based on first record's keys or empty object if no records
    const fields = Object.keys(flattenedData[0] || {});

    // Convert to CSV with all fields
    const csv = json2csv(flattenedData, { fields });

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=demographics.csv');

    // Send CSV
    res.send(csv);
    console.log('Demographics export completed successfully');
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
// Endpoint to update pretest date if it's missing (prevents missing dates)
app.post('/api/update-pretest-date', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only set if not already set
    if (!user.pretestDate) {
      const { getCurrentDateInEastern } = require('./utils');
      const easternDate = getCurrentDateInEastern();
      console.log(`Setting missing pretest date to ${easternDate} (Eastern Time) for user ${user.userId}`);
      user.pretestDate = easternDate;
      await user.save();
      return res.json({
        success: true,
        message: 'Pretest date set successfully',
        pretestDate: user.pretestDate
      });
    }

    return res.json({
      success: true,
      message: 'Pretest date already set',
      pretestDate: user.pretestDate
    });
  } catch (error) {
    console.error('Error updating pretest date:', error);
    res.status(500).json({ error: 'Failed to update pretest date' });
  }
});

module.exports = { app, startServer, connectDB };
