const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const boxService = require('./boxService');

// Convert callback-based functions to promise-based
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const exists = promisify(fs.exists);
const readdir = promisify(fs.readdir);

// Configuration
const TEMP_DIR = path.join(__dirname, 'public', 'audio', 'temp');
const FILE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

// Enhanced tracking - map of userIds to their downloaded files with timestamps
const userFiles = new Map();

// Ensure temp directory exists
const ensureTempDir = async () => {
  try {
    if (!await exists(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true });
      console.log(`Created temporary directory: ${TEMP_DIR}`);
    }
  } catch (error) {
    console.error('Error creating temp directory:', error);
    throw error;
  }
};

// Initialize the service
const initialize = async () => {
  await ensureTempDir();
  console.log('Temporary file service initialized');

  // Start cleanup job
  setInterval(cleanupExpiredFiles, 5 * 60 * 1000); // Check every 5 minutes
};

// Stream and save a file from Box
const streamAndSaveFile = async (userId, speaker, phase, testType, version, sentence) => {
  await ensureTempDir();

  // Generate filename based on parameters
  let filename;
  let fileStream;

  if (phase === 'training') {
    // For training files: <speaker>_Trn_<day>_<sentence>.wav
    // Note: in the route, we pass the real day (1-indexed), but internally add 1 to match file naming convention
    filename = `${speaker}_Trn_${String(version).padStart(2, '0')}_${String(sentence).padStart(2, '0')}.wav`;
    fileStream = await boxService.getTrainingFile(speaker, version, sentence);
  } else {
    // For pretest and posttest
    if (testType === 'COMPREHENSION') {
      // Comprehension: <speaker>_Comp_<version>_<sentence>.wav
      filename = `${speaker}_Comp_${String(version).padStart(2, '0')}_${String(sentence).padStart(2, '0')}.wav`;
    } else if (testType === 'EFFORT') {
      // Effort: <speaker>_EFF<sentence>.wav
      filename = `${speaker}_EFF${String(sentence).padStart(2, '0')}.wav`;
    } else if (testType === 'INTELLIGIBILITY') {
      // Intelligibility: <speaker>_Int<sentence>.wav
      filename = `${speaker}_Int${String(sentence).padStart(2, '0')}.wav`;
    } else {
      throw new Error(`Invalid test type: ${testType}`);
    }

    fileStream = await boxService.getTestFile(speaker, testType, version, sentence);
  }

  // Add a unique user identifier to the saved filename to avoid conflicts
  const userFilename = `${userId}_${filename}`;
  const filePath = path.join(TEMP_DIR, userFilename);

  // Stream to file
  const chunks = [];
  for await (const chunk of fileStream) {
    chunks.push(chunk);
  }

  const buffer = Buffer.concat(chunks);
  await writeFile(filePath, buffer);

  // Track the file with current timestamp, organized by user
  if (!userFiles.has(userId)) {
    userFiles.set(userId, new Map());
  }
  userFiles.get(userId).set(userFilename, {
    timestamp: Date.now(),
    originalFilename: filename
  });

  return {
    filename: userFilename,
    path: filePath,
    relativeUrl: `/audio/temp/${userFilename}`
  };
};

// Preload all files for a specific phase
const preloadPhaseFiles = async (userId, speaker, phase, trainingDay = null) => {
  try {
    console.log(`Preloading files for user ${userId}, phase ${phase}${trainingDay ? `, day ${trainingDay}` : ''}`);

    let preloadedFiles = [];

    // Different preloading logic based on phase
    if (phase === 'training' && trainingDay) {
      // For training phase, preload all files for the specified day
      // Assume we have up to 20 sentences per training day
      for (let i = 1; i <= 20; i++) {
        try {
          // Check if file exists before trying to download
          const pattern = `Trn_${String(parseInt(trainingDay) + 1).padStart(2, '0')}_${String(i).padStart(2, '0')}`;
          const exists = await boxService.fileExists(speaker, pattern);

          if (exists) {
            const fileInfo = await streamAndSaveFile(
              userId,
              speaker,
              'training',
              null,
              parseInt(trainingDay) + 1,
              i
            );
            preloadedFiles.push(fileInfo);
          } else {
            // If we've hit a non-existent file, we might have reached the end of available files
            console.log(`Training file day ${trainingDay}, sentence ${i} not found, stopping preload`);
            break;
          }
        } catch (error) {
          console.log(`Error preloading training file day ${trainingDay}, sentence ${i}:`, error.message);
          // Continue with next file even if this one fails
          break;
        }
      }
    } else if (phase === 'pretest' || phase.startsWith('posttest')) {
      // For test phases, preload comprehension, effort, and intelligibility files

      // Preload comprehension test files (typically 2 versions with multiple sentences each)
      for (let version = 1; version <= 2; version++) {
        for (let sentence = 1; sentence <= 10; sentence++) {
          try {
            const pattern = `Comp_${String(version).padStart(2, '0')}_${String(sentence).padStart(2, '0')}`;
            const exists = await boxService.fileExists(speaker, pattern);

            if (exists) {
              const fileInfo = await streamAndSaveFile(
                userId,
                speaker,
                phase,
                'COMPREHENSION',
                version,
                sentence
              );
              preloadedFiles.push(fileInfo);
            } else {
              // If file doesn't exist, move to next version
              break;
            }
          } catch (error) {
            console.log(`Error preloading comprehension file v${version}, s${sentence}:`, error.message);
            break;
          }
        }
      }

      // Preload effort test files
      for (let sentence = 1; sentence <= 5; sentence++) {
        try {
          const pattern = `EFF${String(sentence).padStart(2, '0')}`;
          const exists = await boxService.fileExists(speaker, pattern);

          if (exists) {
            const fileInfo = await streamAndSaveFile(
              userId,
              speaker,
              phase,
              'EFFORT',
              null,
              sentence
            );
            preloadedFiles.push(fileInfo);
          } else {
            break;
          }
        } catch (error) {
          console.log(`Error preloading effort file s${sentence}:`, error.message);
          break;
        }
      }

      // Preload intelligibility test files
      for (let sentence = 1; sentence <= 5; sentence++) {
        try {
          const pattern = `Int${String(sentence).padStart(2, '0')}`;
          const exists = await boxService.fileExists(speaker, pattern);

          if (exists) {
            const fileInfo = await streamAndSaveFile(
              userId,
              speaker,
              phase,
              'INTELLIGIBILITY',
              null,
              sentence
            );
            preloadedFiles.push(fileInfo);
          } else {
            break;
          }
        } catch (error) {
          console.log(`Error preloading intelligibility file s${sentence}:`, error.message);
          break;
        }
      }
    }

    console.log(`Preloaded ${preloadedFiles.length} files for user ${userId}`);
    return {
      success: true,
      count: preloadedFiles.length,
      files: preloadedFiles.map(f => ({
        filename: f.filename,
        url: f.relativeUrl
      }))
    };
  } catch (error) {
    console.error(`Error preloading files for user ${userId}:`, error);
    throw error;
  }
};

// Clean up a specific file
const removeFile = async (filename) => {
  const filePath = path.join(TEMP_DIR, filename);
  try {
    if (await exists(filePath)) {
      await unlink(filePath);

      // Remove from tracking map
      for (const [userId, files] of userFiles.entries()) {
        if (files.has(filename)) {
          files.delete(filename);
          console.log(`Removed temporary file: ${filename} for user ${userId}`);

          // Clean up empty user entries
          if (files.size === 0) {
            userFiles.delete(userId);
          }
          break;
        }
      }
    }
  } catch (error) {
    console.error(`Error removing file ${filename}:`, error);
    // Don't throw here to prevent affecting the user experience
  }
};

// Mark a file as played for a user - this updates the timestamp but keeps the file
const markFilePlayed = (userId, filename) => {
  if (userFiles.has(userId) && userFiles.get(userId).has(filename)) {
    // Update timestamp to reflect recent usage
    userFiles.get(userId).get(filename).timestamp = Date.now();
    console.log(`Updated timestamp for file ${filename} for user ${userId}`);
    return true;
  }
  return false;
};

// Clean up user files when they complete a phase or log out
const cleanupUserFiles = async (userId) => {
  if (userFiles.has(userId)) {
    const files = userFiles.get(userId);
    for (const [filename] of files) {
      await removeFile(filename);
    }
    userFiles.delete(userId);
    console.log(`Cleaned up all files for user ${userId}`);
    return true;
  }
  return false;
};

// Clean up all expired files
const cleanupExpiredFiles = async () => {
  const now = Date.now();

  try {
    // Clean up tracked files by user
    for (const [userId, files] of userFiles.entries()) {
      const expiredFiles = [];

      for (const [filename, fileInfo] of files.entries()) {
        if (now - fileInfo.timestamp > FILE_EXPIRY_MS) {
          expiredFiles.push(filename);
        }
      }

      // Remove expired files
      for (const filename of expiredFiles) {
        await removeFile(filename);
      }

      // If all files were removed, clean up user entry
      if (files.size === 0) {
        userFiles.delete(userId);
      }
    }

    // Also check directory for any untracked files (from previous runs)
    const files = await readdir(TEMP_DIR);
    for (const file of files) {
      let isTracked = false;

      // Check if file is tracked for any user
      for (const userFileMap of userFiles.values()) {
        if (userFileMap.has(file)) {
          isTracked = true;
          break;
        }
      }

      if (!isTracked) {
        try {
          const filePath = path.join(TEMP_DIR, file);
          await unlink(filePath);
          console.log(`Removed untracked file: ${file}`);
        } catch (error) {
          console.error(`Error removing untracked file ${file}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

module.exports = {
  initialize,
  streamAndSaveFile,
  preloadPhaseFiles,
  removeFile,
  markFilePlayed,
  cleanupUserFiles,
  cleanupExpiredFiles
};