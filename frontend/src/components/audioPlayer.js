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

      if (isTraining) {
        await audioService.playTrainingAudio(day, sentence);
      } else {
        await audioService.playTestAudio(phase, testType, version, sentence);
      }

      setIsPlaying(false);
      if (onPlayComplete) {
        onPlayComplete();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setError('Failed to play audio. Please try again.');
    } finally {
      setIsLoading(false);
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
