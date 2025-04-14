import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { zonedTimeToUtc, toZonedTime } from 'date-fns-tz';

// Eastern timezone
export const EASTERN_TIMEZONE = 'America/New_York';

// Combine Tailwind classes and handle conflicts
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Get current date in Eastern Time
export function getCurrentDateInEastern() {
  return toZonedTime(new Date(), EASTERN_TIMEZONE);
}

// Convert any date to Eastern Time
export function toEasternTime(date) {
  return toZonedTime(new Date(date), EASTERN_TIMEZONE);
}

// Format date to readable string in Eastern Time
export function formatDate(date) {
  const easternDate = toEasternTime(date);
  return format(easternDate, 'MMMM d, yyyy');
}

// Compare dates ignoring time (in Eastern timezone)
export function isSameDay(date1, date2) {
  const d1 = toEasternTime(date1);
  const d2 = toEasternTime(date2);
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

// Check if a date is today in Eastern Time
export function isToday(date) {
  return isSameDay(date, new Date());
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