// backend/utils/index.js

const crypto = require('crypto');
const path = require('path');
const { zonedTimeToUtc, toZonedTime, format } = require('date-fns-tz');
const { format: formatDate, parseISO } = require('date-fns');
const winston = require('winston');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'speech-training-backend' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add console transport in non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Eastern timezone 
const EASTERN_TIMEZONE = 'America/New_York';

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

/**
 * Get current date in Eastern Time
 * @returns {Date} The current date in Eastern Time
 */
const getCurrentDateInEastern = () => {
  return toZonedTime(new Date(), EASTERN_TIMEZONE);
};

/**
 * Convert any date to Eastern Time
 * @param {Date|string} date - The date to convert
 * @returns {Date} The date in Eastern Time
 */
const toEasternTime = (date) => {
  return toZonedTime(new Date(date), EASTERN_TIMEZONE);
};

/**
 * Format date to readable string in Eastern Time
 * @param {Date|string} date - The date to format
 * @param {string} formatStr - The format string (default: MMMM d, yyyy)
 * @returns {string} The formatted date string
 */
const formatDateInEastern = (date, formatStr = 'MMMM d, yyyy') => {
  const easternDate = toEasternTime(date);
  return formatDate(easternDate, formatStr);
};

/**
 * Compare dates ignoring time (in Eastern timezone)
 * @param {Date|string} date1 - First date to compare
 * @param {Date|string} date2 - Second date to compare
 * @returns {boolean} True if the dates are the same day
 */
const isSameDay = (date1, date2) => {
  const d1 = toEasternTime(date1);
  const d2 = toEasternTime(date2);
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

/**
 * Check if a date is today in Eastern Time
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if the date is today
 */
const isToday = (date) => {
  return isSameDay(date, new Date());
};

/**
 * Calculate days between two dates in Eastern Time
 * @param {Date|string} startDate - The start date
 * @param {Date|string} endDate - The end date (defaults to today)
 * @returns {number} The number of days between the dates
 */
const daysBetween = (startDate, endDate = new Date()) => {
  const start = toEasternTime(startDate);
  const end = toEasternTime(endDate);
  
  // Reset times to midnight for accurate day calculation
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  // Calculate difference in days
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

/**
 * Add days to a date in Eastern Time
 * @param {Date|string} date - The base date
 * @param {number} days - Number of days to add
 * @returns {Date} The new date with days added
 */
const addDays = (date, days) => {
  const easternDate = toEasternTime(date);
  easternDate.setDate(easternDate.getDate() + days);
  return easternDate;
};

module.exports = {
  generateToken,
  validateInput,
  asyncHandler,
  formatError,
  getAudioPath,
  EASTERN_TIMEZONE,
  getCurrentDateInEastern,
  toEasternTime,
  formatDateInEastern,
  isSameDay,
  isToday,
  daysBetween,
  addDays,
  logger
};
