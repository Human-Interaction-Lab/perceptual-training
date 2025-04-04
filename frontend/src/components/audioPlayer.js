// src/components/AudioPlayer.js
import React, { useState, useEffect } from 'react';
import audioService from '../services/audioService';

const AudioPlayer = ({ phase, testType, version, sentence, isTraining, day, onPlayComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playAudio = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsPlaying(true);

      // Add a timeout to prevent hanging indefinitely
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Audio loading timeout')), 15000);
      });

      // Use Promise.race to implement a timeout
      if (isTraining) {
        await Promise.race([
          audioService.playTrainingAudio(day, sentence),
          timeoutPromise
        ]);
      } else {
        await Promise.race([
          audioService.playTestAudio(phase, testType, version, sentence),
          timeoutPromise
        ]);
      }

      setIsPlaying(false);

      if (onPlayComplete) {
        onPlayComplete();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      
      // Special handling for file not found errors
      if (error.message === 'AUDIO_NOT_FOUND' || 
          error.message.includes('not found') || 
          error.message.includes('404')) {
        setError('Audio file not found. Please enter "NA" as your response.');
        
        // Still call onPlayComplete so the user can proceed
        if (onPlayComplete) {
          onPlayComplete();
        }
      } 
      // Special handling for timeout errors
      else if (error.message === 'Audio loading timeout' || 
               error.message.includes('timeout')) {
        setError('Audio loading timed out. Please try again or enter "NA" as your response.');
        
        // Still call onPlayComplete so the user can proceed
        if (onPlayComplete) {
          onPlayComplete();
        }
      }
      // Default error handling
      else {
        setError('Failed to play audio. Please try again or enter "NA" as your response.');
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