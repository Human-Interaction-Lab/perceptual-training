// src/components/AudioPlayer.js
import React, { useState, useEffect } from 'react';
import audioService from '../services/audioService';

const AudioPlayer = ({ phase, testType, version, sentence, isTraining, day, onPlayComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isIpadChrome, setIsIpadChrome] = useState(false);
  
  // Detect iPad Chrome on mount
  useEffect(() => {
    const detectIpadChrome = () => {
      if (typeof window === 'undefined' || !window.navigator) return false;
      const ua = window.navigator.userAgent;
      const isIPad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
      const isChrome = /Chrome/i.test(ua) && !/Safari/i.test(ua) || (/Chrome/i.test(ua) && /Safari/i.test(ua) && !/Edg/i.test(ua));
      return isIPad && isChrome;
    };
    
    const detected = detectIpadChrome();
    setIsIpadChrome(detected);
    if (detected) {
      console.log('AudioPlayer detected iPad Chrome');
    }
  }, []);

  const playAudio = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsPlaying(true);

      // Use shorter timeout for iPad Chrome which has more issues
      const timeoutDuration = isIpadChrome ? 8000 : 15000;
      console.log(`Setting audio timeout: ${timeoutDuration}ms${isIpadChrome ? ' (iPad Chrome shorter timeout)' : ''}`);
      
      // Add a timeout to prevent hanging indefinitely
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Audio loading timeout')), timeoutDuration);
      });

      // For iPad Chrome, add an extra layer of protection
      if (isIpadChrome) {
        console.log('Using enhanced error handling for iPad Chrome');
      }

      // Use Promise.race to implement a timeout
      if (isTraining) {
        // For iPad Chrome, add retry logic for training audio
        let result = null;
        let attempts = isIpadChrome ? 2 : 1; // Extra retry for iPad Chrome
        
        for (let i = 0; i < attempts; i++) {
          try {
            if (i > 0) console.log(`Retry attempt ${i+1} for iPad Chrome`);
            
            result = await Promise.race([
              audioService.playTrainingAudio(day, sentence),
              timeoutPromise
            ]);
            
            break; // Success - exit retry loop
          } catch (err) {
            if (i === attempts - 1) throw err; // Last attempt, rethrow
            
            // Wait briefly before retry
            await new Promise(r => setTimeout(r, 500));
            console.log('Retrying audio playback after error');
            
            // Make sure audio is cleaned up before retry
            audioService.dispose();
          }
        }
      } else {
        await Promise.race([
          audioService.playTestAudio(phase, testType, version, sentence),
          timeoutPromise
        ]);
      }

      setIsPlaying(false);

      // Call onPlayComplete on success
      if (onPlayComplete) {
        onPlayComplete();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      
      // Define error categories for better handling
      const isNotFoundError = error.message === 'AUDIO_NOT_FOUND' || 
                             error.message.includes('not found') || 
                             error.message.includes('404');
      
      const isTimeoutError = error.message === 'Audio loading timeout' || 
                            error.message.includes('timeout') ||
                            error.message.includes('timed out');
      
      const isPlaybackError = error.message.includes('play') ||
                             error.message.includes('NotAllowedError') ||
                             error.message.includes('NotSupportedError');
      
      // Special handling for iPad Chrome - always allow continuing
      if (isIpadChrome) {
        console.log('iPad Chrome detected - using enhanced error handling');
        
        // Show a more targeted error message based on the specific error
        if (isNotFoundError) {
          setError('Audio file not found on iPad Chrome. Please enter "NA" as your response.');
        } else if (isTimeoutError) {
          setError('Audio loading timed out on iPad Chrome. Please enter "NA" as your response.');
        } else if (isPlaybackError) {
          setError('Audio playback error on iPad Chrome. Please enter "NA" as your response.');
        } else {
          setError('Failed to play audio on iPad Chrome. Please enter "NA" as your response.');
        }
        
        // Always call onPlayComplete for iPad Chrome regardless of error type
        if (onPlayComplete) {
          onPlayComplete();
        }
      }
      // Regular error handling for other browsers
      else {
        // Special handling for file not found errors
        if (isNotFoundError) {
          setError('Audio file not found. Please enter "NA" as your response.');
          
          // Still call onPlayComplete so the user can proceed
          if (onPlayComplete) {
            onPlayComplete();
          }
        } 
        // Special handling for timeout errors
        else if (isTimeoutError) {
          setError('Audio loading timed out. Please try again or enter "NA" as your response.');
          
          // Still call onPlayComplete so the user can proceed
          if (onPlayComplete) {
            onPlayComplete();
          }
        }
        // Special handling for playback errors
        else if (isPlaybackError) {
          setError('Audio playback permission denied. Please try again or enter "NA" as your response.');
          
          // Still call onPlayComplete so the user can proceed
          if (onPlayComplete) {
            onPlayComplete();
          }
        }
        // Default error handling
        else {
          setError('Failed to play audio. Please try again or enter "NA" as your response.');
          
          // For unknown errors, we still let the user continue
          if (onPlayComplete) {
            onPlayComplete();
          }
        }
      }
    } finally {
      setIsLoading(false);
      setIsPlaying(false);
      
      // Make sure audio is properly cleaned up
      audioService.dispose();
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // This would ideally pause the current audio if component unmounts while playing
      if (isPlaying) {
        audioService.dispose();
      }
    };
  }, [isPlaying]);

  return (
    <div className="audio-player">
      <button
        onClick={playAudio}
        disabled={isLoading || isPlaying}
        className={`play-button ${isPlaying ? 'playing' : ''}`}
      >
        {isLoading ? 'Loading...' : isPlaying ? 'Playing...' : 'Play Audio'}
      </button>
      {error && <div className="error-message">{error}</div>}
      <div className="audio-info">
        {isTraining ? (
          <span>Training Day {day}, Sentence {sentence}</span>
        ) : (
          <span>{phase} - {testType} {version && `Version ${version}`}, Sentence {sentence}</span>
        )}
      </div>
    </div>
  );
};

export default AudioPlayer;