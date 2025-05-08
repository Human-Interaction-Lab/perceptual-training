/**
 * Utility functions for device and browser detection
 * Focuses on iPad Chrome detection which has special audio handling requirements
 */

/**
 * Detects if the current device is an iPad running Chrome
 * @returns {boolean} True if the device is an iPad with Chrome browser
 */
export const isIpadChrome = () => {
  if (typeof window === 'undefined' || !window.navigator) return false;
  
  const ua = window.navigator.userAgent;
  const lowerUA = ua.toLowerCase();
  
  // Detect iPad
  // Modern iPads report as "Macintosh" but have touch points
  const isIPad = /iPad/i.test(ua) || 
                (/Macintosh/i.test(ua) && 
                 navigator.maxTouchPoints && 
                 navigator.maxTouchPoints > 1);
  
  // Detect Chrome (but not Edge which includes Chrome in UA)
  const isChrome = lowerUA.indexOf('chrome') > -1 && 
                  lowerUA.indexOf('edg') === -1 &&
                  lowerUA.indexOf('edge') === -1;
  
  return isIPad && isChrome;
};

/**
 * Gets detailed browser and device information
 * @returns {Object} Object containing browser and device information
 */
export const getDeviceInfo = () => {
  if (typeof window === 'undefined' || !window.navigator) {
    return { 
      browser: 'unknown', 
      isIpadChrome: false,
      isMobile: false,
      isTablet: false,
      os: 'unknown'
    };
  }
  
  const ua = window.navigator.userAgent;
  const lowerUA = ua.toLowerCase();
  let browser = 'unknown';
  let os = 'unknown';
  let isTablet = false;
  let isMobile = false;
  
  // Detect iPad
  const isIPad = /iPad/i.test(ua) || 
                (/Macintosh/i.test(ua) && 
                 navigator.maxTouchPoints && 
                 navigator.maxTouchPoints > 1);
  
  // Detect OS
  if (/Windows/i.test(ua)) os = 'windows';
  else if (/Macintosh/i.test(ua) && !isIPad) os = 'mac';
  else if (isIPad) os = 'ios';
  else if (/iPhone|iPod/i.test(ua)) {
    os = 'ios';
    isMobile = true;
  }
  else if (/Android/i.test(ua)) {
    os = 'android';
    // Check if Android tablet or phone
    if (!/Mobile/i.test(ua)) isTablet = true;
    else isMobile = true;
  }
  
  // Detect browser
  if (/Chrome/i.test(ua) && !/Chromium|Edge|Edg/i.test(ua)) browser = 'chrome';
  else if (/Firefox/i.test(ua)) browser = 'firefox';
  else if (/Safari/i.test(ua) && !/Chrome|Chromium/i.test(ua)) browser = 'safari';
  else if (/Edge|Edg/i.test(ua)) browser = 'edge';
  
  // Set tablet flag for iPad
  if (isIPad) {
    isTablet = true;
    isMobile = false;
  }
  
  // iPad Chrome detection
  const ipadChrome = isIPad && browser === 'chrome';
  
  return {
    browser,
    os,
    isIpadChrome: ipadChrome,
    isTablet,
    isMobile,
    userAgent: ua
  };
};

/**
 * Get browser-specific audio settings
 * @returns {Object} Settings object with timeouts and other browser-specific parameters
 */
export const getAudioSettings = () => {
  const deviceInfo = getDeviceInfo();
  
  // Default settings
  const defaults = {
    timeout: 15000,          // Regular timeout (15s)
    retryAttempts: 1,        // Default retry attempts
    retryDelay: 1000,        // Default retry delay
    audioPreload: 'auto',    // HTML audio preload attribute
    bufferBeforePlayback: 0, // Wait before playback in ms
  };
  
  // iPad Chrome settings
  if (deviceInfo.isIpadChrome) {
    return {
      ...defaults,
      timeout: 8000,           // Shorter timeout (8s)
      retryAttempts: 2,        // More retry attempts
      retryDelay: 500,         // Shorter retry delay
      audioPreload: 'metadata', // Less aggressive preloading
      bufferBeforePlayback: 100, // Small buffer before playback
      showWarning: true,       // Show warning to user
      useBackupMethod: true,   // Try alternative playback method
    };
  }
  
  // Safari settings
  if (deviceInfo.browser === 'safari') {
    return {
      ...defaults,
      timeout: 12000,         // Medium timeout (12s)
      retryAttempts: 2,       // Extra retry for Safari
      useUserInteraction: true, // May need user interaction for playback
    };
  }
  
  // Mobile settings
  if (deviceInfo.isMobile) {
    return {
      ...defaults,
      timeout: 10000,         // Shorter timeout for mobile
      useBackupMethod: true,  // Try alternative playback method
    };
  }
  
  return defaults;
};