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

// Modified markFilePlayed function to set the played flag
const markFilePlayed = (userId, filename) => {
  if (userFiles.has(userId) && userFiles.get(userId).has(filename)) {
    // Update timestamp to reflect recent usage
    const fileInfo = userFiles.get(userId).get(filename);
    fileInfo.timestamp = Date.now();
    fileInfo.played = true; // Mark as played
    console.log(`Marked file ${filename} as played for user ${userId}`);
    return true;
  }
  return false;
};

// New function to clean up only played files when session ends
const cleanupPlayedUserFiles = async (userId) => {
  if (userFiles.has(userId)) {
    const files = userFiles.get(userId);
    const playedFiles = [];
    const keptFiles = [];

    // First, identify which files to remove (played ones)
    for (const [filename, fileInfo] of files.entries()) {
      if (fileInfo.played) {
        playedFiles.push(filename);
      } else {
        keptFiles.push(filename);
      }
    }

    // Remove played files
    for (const filename of playedFiles) {
      await removeFile(filename);
    }

    console.log(`Cleaned up ${playedFiles.length} played files for user ${userId}`);
    console.log(`Kept ${keptFiles.length} unplayed files for user ${userId}`);

    // If all files were removed, clean up user entry
    if (files.size === 0) {
      userFiles.delete(userId);
      return { removed: playedFiles.length, kept: 0 };
    }

    return { removed: playedFiles.length, kept: keptFiles.length };
  }
  return { removed: 0, kept: 0 };
};

// Modified streamAndSaveFile to set played flag to false initially
const streamAndSaveFile = async (userId, speaker, phase, testType, version, sentence) => {
  await ensureTempDir();

  // Generate filename based on parameters
  let filename;

  // SPECIAL CASE: Handle training intelligibility files differently
  if (phase === 'training' && testType === 'INTELLIGIBILITY') {
    // For training intelligibility files, use Int pattern not Trn pattern
    filename = `${speaker}_Int${String(sentence).padStart(2, '0')}.wav`;
    console.log(`Using intelligibility file pattern for training phase: ${filename}`);
  } else if (phase === 'training') {
    // For regular training files: <speaker>_Trn_<day>_<sentence>.wav
    filename = `${speaker}_Trn_${String(version).padStart(2, '0')}_${String(sentence).padStart(2, '0')}.wav`;
  } else if (testType === 'PRACTICE') {
    // Handle practice files
    filename = `${speaker}_Practice.wav`;
    console.log(`Using practice file pattern: ${filename}`);
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
      // Here sentence is the already randomized file number passed from server.js
      filename = `${speaker}_Int${String(sentence).padStart(2, '0')}.wav`;
      console.log(`Using intelligibility file pattern with (possibly randomized) number: ${sentence}`);
    } else {
      throw new Error(`Invalid test type: ${testType}`);
    }
  }

  // Add a unique user identifier to the saved filename to avoid conflicts
  const userFilename = `${userId}_${filename}`;
  const filePath = path.join(TEMP_DIR, userFilename);

  // First check if this file already exists in the temp directory
  if (await exists(filePath)) {
    console.log(`File ${userFilename} already exists in temp directory, using cached version`);

    // Make sure it's tracked in our userFiles map
    if (!userFiles.has(userId)) {
      userFiles.set(userId, new Map());
    }

    // Update or create the file info with fresh timestamp
    userFiles.get(userId).set(userFilename, {
      timestamp: Date.now(),
      originalFilename: filename,
      played: false
    });

    return {
      filename: userFilename,
      path: filePath,
      relativeUrl: `/audio/temp/${userFilename}`
    };
  }

  // If file doesn't exist locally, fetch it from Box
  console.log(`File ${userFilename} not found locally, fetching from Box`);
  let fileStream;

  if (phase === 'training') {
    // Pass testType for special handling of training intelligibility files
    fileStream = await boxService.getTrainingFile(speaker, version, sentence, testType);
  } else {
    fileStream = await boxService.getTestFile(speaker, testType, version, sentence);
  }

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
    originalFilename: filename,
    played: false // Initialize as not played
  });

  return {
    filename: userFilename,
    path: filePath,
    relativeUrl: `/audio/temp/${userFilename}`
  };
};

// Preload all files for a specific phase
const preloadPhaseFiles = async (userId, speaker, phase, trainingDay = null, activeTestTypes = null, maxFiles = null) => {
  try {
    console.log(`Preloading files for user ${userId}, phase ${phase}${trainingDay ? `, day ${trainingDay}` : ''}${activeTestTypes ? `, test types: ${activeTestTypes.join(', ')}` : ''}${maxFiles ? `, max ${maxFiles} files` : ''}`);

    let preloadedFiles = [];
    let skippedFiles = 0;

    // First, check if this user has existing files
    if (!userFiles.has(userId)) {
      userFiles.set(userId, new Map());
    }
    const existingUserFiles = userFiles.get(userId);

    // Different preloading logic based on phase
    if (phase === 'training' && trainingDay) {
      // For training phase, preload all files for the specified day
      // Assume we have up to 20 sentences per training day
      for (let i = 1; i <= 30; i++) {
        try {
          // Generate the expected filename for this file
          const expectedDay = parseInt(trainingDay) + 1; // Add 1 to day for file naming
          const filename = `${speaker}_Trn_${String(expectedDay).padStart(2, '0')}_${String(i).padStart(2, '0')}.wav`;
          const userFilename = `${userId}_${filename}`;

          // Check if this file is already loaded for this user
          if (existingUserFiles.has(userFilename)) {
            // Update timestamp to refresh the file's expiry
            existingUserFiles.get(userFilename).timestamp = Date.now();

            // Add to preloaded files list but mark as already existing
            preloadedFiles.push({
              filename: userFilename,
              relativeUrl: `/audio/temp/${userFilename}`,
              alreadyLoaded: true
            });

            skippedFiles++;
            continue; // Skip to next file
          }

          // Check if file exists in Box before trying to download
          const pattern = `Trn_${String(expectedDay).padStart(2, '0')}_${String(i).padStart(2, '0')}`;
          const exists = await boxService.fileExists(speaker, pattern);

          if (exists) {
            const fileInfo = await streamAndSaveFile(
              userId,
              speaker,
              'training',
              null,  // No test type for training
              expectedDay,
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
      // For test phases, preload only the active test types if specified

      // Determine which test types to preload
      const testTypesToPreload = activeTestTypes || ['intelligibility', 'effort', 'comprehension'];
      console.log(`Preloading test types in order: ${testTypesToPreload.join(', ')}`);

      // Process each test type in the exact order they're provided in the array
      for (const testType of testTypesToPreload) {
        console.log(`Processing test type: ${testType}`);

        if (testType === 'comprehension') {
          // Preload comprehension test files (typically 2 versions with multiple sentences each)
          for (let version = 1; version <= 2; version++) {
            for (let sentence = 1; sentence <= 10; sentence++) {
              try {
                // Generate expected filename for this comprehension file
                const filename = `${speaker}_Comp_${String(version).padStart(2, '0')}_${String(sentence).padStart(2, '0')}.wav`;
                const userFilename = `${userId}_${filename}`;

                // Check if this file is already loaded for this user
                if (existingUserFiles.has(userFilename)) {
                  // Update timestamp to refresh the file's expiry
                  existingUserFiles.get(userFilename).timestamp = Date.now();

                  // Add to preloaded files list but mark as already existing
                  preloadedFiles.push({
                    filename: userFilename,
                    relativeUrl: `/audio/temp/${userFilename}`,
                    alreadyLoaded: true
                  });

                  skippedFiles++;
                  continue; // Skip to next file
                }

                // Check if file exists in Box
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
        }
        else if (testType === 'effort') {
          // Preload effort test files
          for (let sentence = 1; sentence <= 30; sentence++) {
            try {
              // Generate expected filename for this effort file
              const filename = `${speaker}_EFF${String(sentence).padStart(2, '0')}.wav`;
              const userFilename = `${userId}_${filename}`;

              // Check if this file is already loaded for this user
              if (existingUserFiles.has(userFilename)) {
                // Update timestamp to refresh the file's expiry
                existingUserFiles.get(userFilename).timestamp = Date.now();

                // Add to preloaded files list but mark as already existing
                preloadedFiles.push({
                  filename: userFilename,
                  relativeUrl: `/audio/temp/${userFilename}`,
                  alreadyLoaded: true
                });

                skippedFiles++;
                continue; // Skip to next file
              }

              // Check if file exists in Box
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
        }
        else if (testType === 'intelligibility') {
          // Preload intelligibility test files
          // If maxFiles is provided, only preload that many (for faster initial load)
          const maxIntelligibilityFiles = maxFiles ? Math.min(maxFiles, 20) : 20;
          console.log(`Will preload up to ${maxIntelligibilityFiles} intelligibility files`);

          // Get the randomized intelligibility file sequence for this user
          let randomizedFiles;
          try {
            // Import the randomization utils if needed
            const randomizationPath = path.join(__dirname, '..', 'frontend', 'src', 'utils', 'randomization.js');
            const randomization = require(randomizationPath);
            // For training intelligibility, make sure to pass training day to get the right segment
            if (phase === 'training') {
              // For training phase, we need to pass the training day
              randomizedFiles = randomization.getGroupForPhase(phase, trainingDay, userId);
              console.log(`Using training day ${trainingDay} for randomization`);
            } else {
              randomizedFiles = randomization.getGroupForPhase(phase, null, userId);
            }
            console.log(`Loaded randomized intelligibility sequence for user ${userId}: ${randomizedFiles.slice(0, 5)}...`);
          } catch (randomizationError) {
            console.error('Error getting randomized sequence:', randomizationError);
            // Fallback to sequential numbers if randomization fails
            randomizedFiles = Array.from({ length: maxIntelligibilityFiles }, (_, i) => i + 1);
            console.log('Using fallback sequential numbers due to randomization error');
          }

          // Limit to the max number if specified
          const sequenceToUse = randomizedFiles.slice(0, maxIntelligibilityFiles);

          for (let i = 0; i < sequenceToUse.length; i++) {
            try {
              const sentence = sequenceToUse[i];
              // Generate expected filename for this intelligibility file
              const filename = `${speaker}_Int${String(sentence).padStart(2, '0')}.wav`;
              const userFilename = `${userId}_${filename}`;

              // Check if this file is already loaded for this user
              if (existingUserFiles.has(userFilename)) {
                // Update timestamp to refresh the file's expiry
                existingUserFiles.get(userFilename).timestamp = Date.now();

                // Add to preloaded files list but mark as already existing
                preloadedFiles.push({
                  filename: userFilename,
                  relativeUrl: `/audio/temp/${userFilename}`,
                  alreadyLoaded: true
                });

                skippedFiles++;
                continue; // Skip to next file
              }

              // Check if file exists in Box
              const pattern = `Int${String(sentence).padStart(2, '0')}`;
              const exists = await boxService.fileExists(speaker, pattern);

              if (exists) {
                // Pass the randomized file number as the sentence parameter
                // Also specify the correct test type, especially important for training phase
                const fileInfo = await streamAndSaveFile(
                  userId,
                  speaker,
                  phase,
                  'INTELLIGIBILITY',
                  null,
                  sentence // This is already the randomized number from sequenceToUse
                );
                preloadedFiles.push(fileInfo);
                console.log(`Preloaded intelligibility file ${sentence} of ${maxIntelligibilityFiles}`);
              } else {
                console.log(`File ${pattern} not found, stopping intelligibility preload`);
                break;
              }
            } catch (error) {
              console.log(`Error preloading intelligibility file s${sentence}:`, error.message);
              break;
            }
          }
        }
      }
    }

    console.log(`Preloaded ${preloadedFiles.length - skippedFiles} new files, reused ${skippedFiles} existing files for user ${userId}`);
    return {
      success: true,
      count: preloadedFiles.length,
      newlyDownloaded: preloadedFiles.length - skippedFiles,
      skipped: skippedFiles,
      files: preloadedFiles.map(f => ({
        filename: f.filename,
        url: f.relativeUrl,
        alreadyLoaded: f.alreadyLoaded || false
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
  cleanupPlayedUserFiles,
  cleanupExpiredFiles
};