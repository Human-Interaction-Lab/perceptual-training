// backend/utils/index.js

const crypto = require('crypto');
const path = require('path');

// Generate a secure random token for authentication
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Validate user input
const validateInput = (input) => {
  if (!input || typeof input !== 'string') {
    return false;
  }
  return input.trim().length > 0;
};

// Async handler wrapper for route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Format error responses
const formatError = (error) => {
  return {
    error: error.message || 'An unexpected error occurred',
    status: error.status || 500
  };
};

// Audio file path helper
const getAudioPath = (phase, day, filename) => {
  return path.join('audio', phase, day ? `day${day}` : '', filename);
};

module.exports = {
  generateToken,
  validateInput,
  asyncHandler,
  formatError,
  getAudioPath
};
