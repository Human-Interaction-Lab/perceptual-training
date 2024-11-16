import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Combine Tailwind classes and handle conflicts
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format date to readable string
export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
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