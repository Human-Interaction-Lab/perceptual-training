// backend/tempFileService.js
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

// Map to track downloaded files with their timestamps
const downloadedFiles = new Map();

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
const streamAndSaveFile = async (speaker, phase, testType, version, sentence) => {
  await ensureTempDir();
  
  // Generate filename based on parameters
  let filename;
  let fileStream;
  
  if (phase === 'training') {
    filename = `${speaker}_Trn_${String(version).padStart(2, '0')}_${String(sentence).padStart(2, '0')}.wav`;
    fileStream = await boxService.getTrainingFile(speaker, version, sentence);
  } else {
    // For pretest and posttest
    const testTypeCode = testType.toUpperCase();
    if (testTypeCode === 'COMPREHENSION') {
      filename = `${speaker}_Comp_${String(version).padStart(2, '0')}_${String(sentence).padStart(2, '0')}.wav`;
    } else if (testTypeCode === 'EFFORT') {
      filename = `${speaker}_EFF${String(sentence).padStart(2, '0')}.wav`;
    } else if (testTypeCode === 'INTELLIGIBILITY') {
      filename = `${speaker}_Int${String(sentence).padStart(2, '0')}.wav`;
    } else {
      throw new Error(`Invalid test type: ${testType}`);
    }
    
    fileStream = await boxService.getTestFile(speaker, testTypeCode, version, sentence);
  }
  
  const filePath = path.join(TEMP_DIR, filename);
  
  // Stream to file
  const chunks = [];
  for await (const chunk of fileStream) {
    chunks.push(chunk);
  }
  
  const buffer = Buffer.concat(chunks);
  await writeFile(filePath, buffer);
  
  // Track the file with current timestamp
  downloadedFiles.set(filename, Date.now());
  
  return {
    filename,
    path: filePath,
    relativeUrl: `/audio/temp/${filename}`
  };
};

// Clean up a specific file
const removeFile = async (filename) => {
  const filePath = path.join(TEMP_DIR, filename);
  try {
    if (await exists(filePath)) {
      await unlink(filePath);
      downloadedFiles.delete(filename);
      console.log(`Removed temporary file: ${filename}`);
    }
  } catch (error) {
    console.error(`Error removing file ${filename}:`, error);
    // Don't throw here to prevent affecting the user experience
  }
};

// Clean up all expired files
const cleanupExpiredFiles = async () => {
  const now = Date.now();
  
  try {
    // Clean up tracked files
    for (const [filename, timestamp] of downloadedFiles.entries()) {
      if (now - timestamp > FILE_EXPIRY_MS) {
        await removeFile(filename);
      }
    }
    
    // Also check directory for any untracked files (from previous runs)
    const files = await readdir(TEMP_DIR);
    for (const file of files) {
      if (!downloadedFiles.has(file)) {
        await removeFile(file);
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

module.exports = {
  initialize,
  streamAndSaveFile,
  removeFile,
  cleanupExpiredFiles
};
