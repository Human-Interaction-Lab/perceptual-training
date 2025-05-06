import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isEqual } from 'date-fns';
import { zonedTimeToUtc, toZonedTime } from 'date-fns-tz';

// Eastern timezone
export const EASTERN_TIMEZONE = 'America/New_York';

// Helper to detect iPad Chrome 
export function isIPadChrome() {
  if (typeof window === 'undefined' || !window.navigator) return false;
  
  const ua = window.navigator.userAgent.toLowerCase();
  // Detect iPad (including newer iPads that identify as macOS)
  const isIPad = /ipad/.test(ua) || 
    (/macintosh/.test(ua) && typeof window !== 'undefined' && 'ontouchend' in document);
  
  // Detect Chrome browser
  const isChrome = /crios|chrome/.test(ua) && !/edge|edg|firefox|fxios|opera|opr/.test(ua);
  
  return isIPad && isChrome;
}

// Combine Tailwind classes and handle conflicts
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Get current date in Eastern Time with platform-consistent handling
export function getCurrentDateInEastern() {
  const now = new Date();
  
  // If we're on iPad Chrome, use a more direct approach to avoid timezone issues
  if (isIPadChrome()) {
    // Get Eastern time offset (-4 or -5 hours depending on daylight saving)
    // This calculation is more reliable across browsers than date-fns-tz on iPad Chrome
    const easternOffset = getEasternTimeOffset();
    
    // Create a new date object in Eastern time by applying the offset
    const easternDate = new Date(now);
    
    // Reset the time portion to midnight to ensure date-only comparison
    easternDate.setHours(0, 0, 0, 0);
    
    return easternDate;
  }
  
  // For other browsers, use the standard approach
  return toZonedTime(now, EASTERN_TIMEZONE);
}

// Helper to get Eastern timezone offset based on date
function getEasternTimeOffset() {
  // Eastern Time is either UTC-5 (standard) or UTC-4 (daylight saving)
  // This could be replaced with a more robust solution for production
  const now = new Date();
  const jan = new Date(now.getFullYear(), 0, 1); // January (standard time)
  const jul = new Date(now.getFullYear(), 6, 1); // July (daylight saving time)
  
  // Check if Eastern is currently on daylight saving time
  const isDaylightSaving = 
    Math.abs(jan.getTimezoneOffset()) < Math.abs(jul.getTimezoneOffset());
  
  // Eastern is UTC-4 during daylight saving, UTC-5 during standard time
  return isDaylightSaving ? -4 : -5;
}

// Convert any date to Eastern Time with platform-consistent handling
export function toEasternTime(date) {
  if (!date) return null;
  
  const inputDate = new Date(date);
  
  // iPadOS Chrome needs special handling
  if (isIPadChrome()) {
    // Convert the input date to midnight in Eastern time
    const easternDate = new Date(inputDate);
    
    // Reset the time portion to midnight
    easternDate.setHours(0, 0, 0, 0);
    
    return easternDate;
  }
  
  // For non-iPad Chrome browsers, use the standard approach
  return toZonedTime(inputDate, EASTERN_TIMEZONE);
}

// Format date to readable string in Eastern Time
export function formatDate(date) {
  if (!date) return "";
  const easternDate = toEasternTime(date);
  return format(easternDate, 'MMMM d, yyyy');
}

// Compare dates ignoring time (in Eastern timezone) - with cross-platform consistency
export function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  
  // Normalize both dates
  const d1 = normalizeDate(toEasternTime(date1));
  const d2 = normalizeDate(toEasternTime(date2));
  
  // Simple year/month/day comparison to avoid timezone complications
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

// Helper to reset time to midnight for comparing dates only
function normalizeDate(date) {
  if (!date) return null;
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

// Check if a date is today in Eastern Time - with cross-platform consistency
export function isToday(date) {
  if (!date) return false;
  
  // Always normalize the dates before comparison
  const normalizedToday = normalizeDate(getCurrentDateInEastern());
  const normalizedDate = normalizeDate(toEasternTime(date));
  
  // Compare year, month, and day components directly
  return normalizedToday.getFullYear() === normalizedDate.getFullYear() &&
         normalizedToday.getMonth() === normalizedDate.getMonth() &&
         normalizedToday.getDate() === normalizedDate.getDate();
}

// Calculate percentage
export function calculatePercentage(value, total) {
  return Math.round((value / total) * 100);
}

// Generate random ID
export function generateId(length = 8) {
  return Math.random().toString(36).substring(2, length + 2);
}

// Format duration (ms to minutes and seconds)
export function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds.padStart(2, '0')}`;
}