// components/ui/input.jsx
import React, { useEffect } from 'react';

// Detect if we're running on iOS
const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// Detect if we're running in Chrome on iOS
const isIOSChrome = () => {
  if (typeof window === 'undefined') return false;
  return isIOS() && /CriOS|Chrome/.test(navigator.userAgent);
};

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  // Handle iOS Chrome-specific behavior
  useEffect(() => {
    if (!ref?.current) return;
    
    const inputEl = ref.current;
    
    // Only apply these fixes on iOS Chrome
    if (isIOSChrome()) {
      // Add specific attributes to improve input stability on iOS Chrome
      inputEl.setAttribute('autocorrect', 'off');
      inputEl.setAttribute('spellcheck', 'false');
      
      // For iPad Chrome virtual keyboard issues
      const handleFocus = () => {
        // Add a tiny delay to allow the virtual keyboard to fully appear
        setTimeout(() => {
          // Try to retain focus and prevent layout shifts
          if (document.activeElement !== inputEl) {
            inputEl.focus();
          }
        }, 50);
      };
      
      inputEl.addEventListener('focus', handleFocus);
      
      return () => {
        inputEl.removeEventListener('focus', handleFocus);
      };
    }
  }, [ref]);
  
  return (
    <input
      type={type}
      className={`flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm 
                 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium 
                 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 
                 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed 
                 disabled:opacity-50 ${isIOSChrome() ? 'ios-chrome-input' : ''} ${className || ''}`}
      ref={ref}
      // Add iOS Chrome specific attributes
      data-ios-chrome={isIOSChrome() ? 'true' : 'false'}
      // Improve keyboard behavior on mobile
      autoCapitalize="off"
      autoComplete="off"
      {...props}
    />
  );
});

// Prevent unnecessary re-renders that cause input focus loss
Input.displayName = "Input";

export { Input };