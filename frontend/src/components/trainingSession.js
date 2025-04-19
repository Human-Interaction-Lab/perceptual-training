import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "./ui/card";
import { ArrowRight, Headphones, Volume2, Loader, AlertCircle } from 'lucide-react';
import IntelligibilityTest from './intelligibilityTest';
import { TRAINING_DATA, TRAINING_TEST_STIMULI, TRAINING_DAY_TO_STORY, STORY_METADATA } from './trainingData';
import audioService from '../services/audioService';
import config from '../config';

const TrainingSession = ({
    onComplete,
    onBack,
    trainingDay,
    trainingStimuli,
    intelligibilityStimuli,
    userId
}) => {
    const [currentPhase, setCurrentPhase] = useState('instruction'); // 'instruction', 'training', 'test'
    const [currentStimulusIndex, setCurrentStimulusIndex] = useState(0);
    const [showText, setShowText] = useState(false);
    const [userResponse, setUserResponse] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [audioPlaying, setAudioPlaying] = useState(false);
    const [audioPlayed, setAudioPlayed] = useState(false);
    const [cleanupStarted, setCleanupStarted] = useState(false);

    // State to track which story pair we're on (first or second story)
    const [storyPairIndex, setStoryPairIndex] = useState(0);
    // State to track all stories for this training day with default values based on day
    const [trainingDayStories, setTrainingDayStories] = useState(() => {
        // Default initialization based on training day
        if (trainingDay === 1 || trainingDay === 3) {
            return ["02", "04"];
        } else if (trainingDay === 2 || trainingDay === 4) {
            return ["03", "07"];
        }
        // Fallback if trainingDay is invalid
        return ["02", "04"];
    });

    // Load saved progress when component mounts
    useEffect(() => {
        // Import getTrainingStoriesForDay here to avoid any import confusion
        const { getTrainingStoriesForDay } = require('../utils/randomization');

        // Load the stories for this training day
        const stories = getTrainingStoriesForDay(trainingDay);
        setTrainingDayStories(stories);
        console.log(`Training day ${trainingDay} will use stories:`, stories);

        const loadSavedProgress = () => {
            // Get the proper user-specific progress key
            const userSpecificKey = `progress_${userId}_training_day${trainingDay}`;
            // Also check the old format for backward compatibility
            const legacyKey = `training_progress_day_${trainingDay}`;

            // First try the new format
            let savedProgress = localStorage.getItem(userSpecificKey);

            // If not found, try the legacy format
            if (!savedProgress) {
                savedProgress = localStorage.getItem(legacyKey);

                // If we found data in the legacy format, log it and will save in new format later
                if (savedProgress) {
                    console.log('Found legacy format progress data, will migrate to new format');
                }
            }

            if (savedProgress) {
                try {
                    const progress = JSON.parse(savedProgress);

                    // Only restore if it's for the current training day
                    if (progress.trainingDay === trainingDay) {
                        console.log('Resuming from saved progress:', progress);

                        setCurrentPhase(progress.phase);
                        setCurrentStimulusIndex(progress.stimulusIndex);
                        setShowText(true);

                        // Restore story pair index if available
                        if (progress.storyPairIndex !== undefined) {
                            setStoryPairIndex(progress.storyPairIndex);
                        }

                        // If we're resuming in the test phase, don't mark audio as played yet
                        if (progress.phase !== 'test') {
                            setAudioPlayed(progress.audioPlayed || false);
                        }

                        return true; // Progress was restored
                    }
                } catch (error) {
                    console.error('Error parsing saved progress:', error);
                }
            }

            return false; // No progress was restored
        };

        // If we couldn't load saved progress, use default initial values
        if (!loadSavedProgress()) {
            setCurrentPhase('instruction');
            setCurrentStimulusIndex(0);
            setStoryPairIndex(0); // Start with the first story
            setShowText(true);
            setAudioPlayed(false);
        }

        setUserResponse('');
        setIsSubmitting(false);
        setCleanupStarted(false);
        setAudioPlaying(false);
    }, [trainingDay]);

    // Save progress whenever relevant state changes
    useEffect(() => {
        // Only save progress if we've started training
        if (currentPhase !== 'instruction') {
            const progressData = {
                trainingDay,
                phase: currentPhase,
                stimulusIndex: currentStimulusIndex,
                storyPairIndex, // Save which story in the pair we're on
                audioPlayed
            };

            // Use the new user-specific format
            const userSpecificKey = `progress_${userId}_training_day${trainingDay}`;

            localStorage.setItem(userSpecificKey, JSON.stringify(progressData));

            // Also remove any legacy format data to avoid confusion
            localStorage.removeItem(`training_progress_day_${trainingDay}`);

            console.log('Saved progress using new format:', progressData);
        }
    }, [trainingDay, currentPhase, currentStimulusIndex, storyPairIndex, audioPlayed, userId]);

    // State to track the actual story number being used for audio
    // Initialize with a special token that indicates we haven't determined the story yet
    const [audioStoryNumber, setAudioStoryNumber] = useState('loading');
    // State to track the actual file number being played
    const [currentFileNumber, setCurrentFileNumber] = useState(null);
    // State to track the total number of stimuli for the current story
    const [totalStoryStimuli, setTotalStoryStimuli] = useState(null);

    // Listen for custom events from the audio service
    // This ensures we get story number updates BEFORE audio actually plays
    useEffect(() => {
        const handleStoryIdentified = (event) => {
            const { storyNumber, fileNumber } = event.detail;
            console.log(`Event received: Story ${storyNumber}, File ${fileNumber} identified before audio plays`);

            // Immediately update the state to show the correct text
            setAudioStoryNumber(storyNumber);
            if (fileNumber) {
                setCurrentFileNumber(fileNumber);
            }

            // Update the total stimuli count based on the identified story
            if (storyNumber && STORY_METADATA[storyNumber]) {
                const storyLength = STORY_METADATA[storyNumber].length;
                console.log(`Setting total story stimuli to ${storyLength} for story ${storyNumber}`);
                setTotalStoryStimuli(storyLength);
            }
        };

        // Add the event listener
        window.addEventListener('trainingStoryIdentified', handleStoryIdentified);

        // Clean up the listener when component unmounts
        return () => {
            window.removeEventListener('trainingStoryIdentified', handleStoryIdentified);
        };
    }, []);

    // Add a MutationObserver to detect when new audio elements are added to the DOM
    // This is a fallback to ensure we catch the story number as soon as possible
    useEffect(() => {
        // Function to check audio elements
        const checkAudioElements = () => {
            const audioElements = document.querySelectorAll('audio');
            audioElements.forEach(audio => {
                if (audio.src) {
                    console.log(`Mutation observer found audio: ${audio.src}`);

                    // Use the same pattern matching logic to extract story number
                    const patterns = [
                        { regex: /Trn_(\d{2})_\d{2}/i, group: 1 },
                        { regex: /day\/(\d{2})\/\d+/i, group: 1 },
                        { regex: /(\d{2})_\d{2}\.wav/i, group: 1 }
                    ];

                    for (const pattern of patterns) {
                        const match = audio.src.match(pattern.regex);
                        if (match && match[pattern.group]) {
                            const detectedStory = match[pattern.group];
                            console.log(`Observer detected story ${detectedStory} in audio element`);

                            // Update if different from current
                            if (detectedStory !== audioStoryNumber) {
                                setAudioStoryNumber(detectedStory);

                                // Also update the total stimuli count
                                if (STORY_METADATA[detectedStory]) {
                                    const storyLength = STORY_METADATA[detectedStory].length;
                                    console.log(`Observer setting total stimuli to ${storyLength} for story ${detectedStory}`);
                                    setTotalStoryStimuli(storyLength);
                                }
                            }
                            break;
                        }
                    }
                }
            });
        };

        // Create a mutation observer to watch for DOM changes
        const observer = new MutationObserver((mutations) => {
            // Check if any audio elements were added
            const audioAdded = mutations.some(mutation =>
                Array.from(mutation.addedNodes).some(node =>
                    node.nodeName === 'AUDIO' ||
                    (node.nodeType === 1 && node.querySelector('audio'))
                )
            );

            if (audioAdded) {
                console.log('MutationObserver detected new audio element');
                checkAudioElements();
            }
        });

        // Start observing the document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Initial check
        checkAudioElements();

        // Clean up
        return () => {
            observer.disconnect();
        };
    }, [audioStoryNumber]);

    // Auto-play audio when in training phase and stimulus changes
    useEffect(() => {
        // Only auto-play in training phase, not when resuming a session
        if (currentPhase === 'training' && !audioPlayed && !audioPlaying) {
            const autoPlay = async () => {
                try {
                    setAudioPlaying(true);

                    // The sentence index needs to be 1-based for the audio file
                    const sentenceIndex = currentStimulusIndex + 1;

                    // Get the current story number for this pair index
                    const currentStoryNumber = trainingDayStories[storyPairIndex];
                    console.log(`Auto-playing training audio for day ${trainingDay}, story ${currentStoryNumber}, stimulus index ${sentenceIndex}`);

                    // Override the story number parameter in the audioService
                    const result = await audioService.playTrainingAudio(
                        trainingDay,
                        sentenceIndex,
                        currentStoryNumber // Force the service to use this story number
                    );

                    // Get the actual story number from the result
                    const actualStoryNumber = result.storyNumber || currentStoryNumber;

                    console.log(`Audio played successfully with story number: ${actualStoryNumber}`);

                    // Set the story number for text display
                    setAudioStoryNumber(actualStoryNumber);
                    // Set the current file number (which matches the stimulus index)
                    setCurrentFileNumber(sentenceIndex);

                    setAudioPlayed(true);
                } catch (error) {
                    console.error('Error auto-playing audio:', error);
                    
                    // Check for specific audio not found errors
                    if (error.message === 'AUDIO_NOT_FOUND' ||
                        error.message.includes('not found') ||
                        error.message.includes('404')) {
                        
                        console.log('Audio file not found. Setting audio as played to allow continuing.');
                        // Set audio as played so user can continue
                        setAudioPlayed(true);
                        // Show an alert to inform the user
                        alert('Audio file could not be found. You can proceed to the next phrase by clicking Next.');
                    }
                } finally {
                    setAudioPlaying(false);
                }
            };

            // Small delay to ensure the UI has updated before playing
            const timer = setTimeout(() => {
                autoPlay();
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [currentPhase, currentStimulusIndex, audioPlayed, audioPlaying, trainingDay, storyPairIndex, trainingDayStories]);

    //const handleManualPlayAudio = async () => {
    //    if (audioPlaying || audioPlayed) return;
    //
    //    try {
    //        setAudioPlaying(true);
    //        await audioService.playTrainingAudio(
    //            trainingDay,
    //            currentStimulusIndex + 1
    //        );
    //        setAudioPlayed(true);
    //    } catch (error) {
    //        console.error('Error playing audio:', error);
    //        alert('Error playing audio. Please try again.');
    //    } finally {
    //        setAudioPlaying(false);
    //    }
    //};

    const handleNext = () => {
        // If we're still in training phase
        if (currentPhase === 'training') {
            // Reset for next stimulus
            setAudioPlayed(false);
            setShowText(true);

            // Set the audio story number back to loading state
            // This prevents showing the wrong text while loading the next audio
            setAudioStoryNumber('loading');
            setCurrentFileNumber(null);

            // Determine if we've reached the end of the current story
            const currentTotal = totalStoryStimuli ||
                (audioStoryNumber && STORY_METADATA[audioStoryNumber]?.length) ||
                trainingStimuli.length;

            console.log(`Checking if at end: index=${currentStimulusIndex}, total=${currentTotal}`);

            // Move to next stimulus or transition to next story or test phase
            if (currentStimulusIndex < currentTotal - 1) {
                // Still have stimuli left in this story
                console.log(`Moving to next stimulus (${currentStimulusIndex + 1})`);
                setCurrentStimulusIndex(prevIndex => prevIndex + 1);
            } else {
                // Reached the end of the current story
                console.log(`End of story reached with ${currentStimulusIndex + 1}/${currentTotal} stimuli`);

                // Check if we have another story to play for this training day
                if (storyPairIndex < trainingDayStories.length - 1) {
                    // Move to the next story in the pair
                    console.log(`Moving to next story in pair (${storyPairIndex + 1}/${trainingDayStories.length})`);
                    setStoryPairIndex(prevIndex => prevIndex + 1);
                    setCurrentStimulusIndex(0);
                    setAudioStoryNumber(trainingDayStories[storyPairIndex + 1]);
                } else {
                    // Completed all stories for this training day, move to test phase
                    console.log(`All stories completed, moving to test phase`);
                    setCurrentPhase('test');
                    setCurrentStimulusIndex(0);
                }
            }
        }
    };

    const handleStartTraining = () => {
        // No more preloading - load files only when needed
        console.log('Starting training session without preloading');

        // Immediately transition to training phase
        setCurrentPhase('training');
        setAudioPlayed(false); // Reset audio state when starting training
    };

    const handleTestSubmit = async () => {
        if (!userResponse.trim()) {
            alert('Please enter the phrase you heard.');
            return;
        }

        try {
            setIsSubmitting(true);
            const token = localStorage.getItem('token');
            //const stimulus = intelligibilityStimuli[currentStimulusIndex];

            // Get the actual stimulus ID from the file number (Int01, Int02, etc.)
            // Map the sequential index to the actual randomized file number
            const { getGroupForPhase } = require('../utils/randomization');
            
            // IMPORTANT: Keep track of actual stimulus index to prevent going out of bounds 
            // Cap at 19 to stay within the allocated segment size
            const safeIndex = Math.min(currentStimulusIndex, 19);
            
            // Store training day in window for other services to access
            if (typeof window !== 'undefined') {
                window.currentTrainingDay = trainingDay;
                console.log(`Set current training day in window (submit): ${trainingDay}`);
            }
            
            // Get randomized file number from the appropriate training day sequence
            // Use 'training' phase with trainingDay parameter to get the correct segment
            const trainingFiles = getGroupForPhase('training', trainingDay, userId);
            console.log(`Getting randomized file for day ${trainingDay}, index ${safeIndex}:`, 
                        `Full sequence (${trainingFiles.length}):`, trainingFiles);
            
            // Safety checks for index and array bounds
            if (!trainingFiles || trainingFiles.length === 0) {
                console.error(`No randomized files returned for training day ${trainingDay}`);
                alert('Error retrieving audio files. Please try again or contact support.');
                return;
            }
            
            // Ensure index is valid
            if (safeIndex >= trainingFiles.length) {
                console.error(`Index ${safeIndex} out of bounds for array of length ${trainingFiles.length}`);
                alert('Invalid audio file selection. Please try again or contact support.');
                return;
            }
            
            const actualFileNumber = trainingFiles[safeIndex];
            
            // Verify file number is reasonable
            if (actualFileNumber < 1 || actualFileNumber > 160) {
                console.error(`Invalid file number ${actualFileNumber} - should be between 1 and 160`);
                alert('Invalid audio file number. Please try again or contact support.');
                return;
            }
            
            // CRITICAL: Check if we have a stored file number from playback and ensure consistency
            let fileNumberToUse = actualFileNumber;
            
            // If we have stored a file number in the window object during playback, use that instead
            // This ensures we're consistently using the same file number for playback and response
            if (typeof window !== 'undefined' && window.lastRandomizedFileNumber) {
                const storedFileNumber = window.lastRandomizedFileNumber;
                console.log(`Found stored randomized file number: ${storedFileNumber} - comparing with calculated: ${actualFileNumber}`);
                
                if (storedFileNumber !== actualFileNumber) {
                    console.warn(`CRITICAL: Inconsistency detected - using stored file number ${storedFileNumber} instead of calculated ${actualFileNumber}`);
                    fileNumberToUse = storedFileNumber;
                } else {
                    console.log(`CONSISTENCY CONFIRMED: Playback and response using same file number: ${actualFileNumber}`);
                }
            } else {
                console.log(`No stored file number found - using calculated number: ${actualFileNumber}`);
            }
            
            console.log(`Using randomized file number ${fileNumberToUse} for index ${safeIndex} (day ${trainingDay})`);

            // Int01, Int02, etc. format for the actual stimulus ID
            // CRITICAL: Use fileNumberToUse which may be from window.lastRandomizedFileNumber
            const actualStimulusId = `Int${String(fileNumberToUse).padStart(2, '0')}`;

            // Log what we're about to send
            const requestBody = {
                phase: 'training', // Use standard 'training' phase name which is expected by backend
                testType: 'intelligibility',
                stimulusId: actualStimulusId, // Use the actual stimulus ID format (Int01, Int02, etc.)
                response: userResponse,
                trainingDay: trainingDay, // Add the required trainingDay field
                currentTestType: 'intelligibility' // Add this field which may be expected by backend
            };

            console.log('Submitting test response with data:', requestBody);

            // Match the exact format used in App.js for successful submissions
            const response = await fetch(`${config.API_BASE_URL}/api/response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(requestBody),
            });

            // Log detailed information about the response
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Response submission failed with status ${response.status}: ${errorText}`);

                // Special handling for the "correct day" error - simply log and continue
                // This allows the test to proceed even if the backend rejects the submission
                if (errorText.includes("correct day") || errorText.includes("Please return")) {
                    console.warn("Ignoring day restriction for training test phase - continuing test");
                    // Don't throw error, just continue with the test
                } else {
                    // For other errors, throw normally
                    throw new Error(`Server returned ${response.status}: ${errorText}`);
                }
            } else {
                console.log('Response submission successful!');
            }

            // Log response submission for debugging
            console.log(`Submitted test response for file #${currentFileNumber}, stimulus index ${currentStimulusIndex}`);

            // Move to next test stimulus or complete
            // We always want to do 20 tests for training test, regardless of the intelligibilityStimuli.length
            const TRAINING_TEST_LENGTH = 20;

            if (currentStimulusIndex < TRAINING_TEST_LENGTH - 1) {
                setCurrentStimulusIndex(prevIndex => prevIndex + 1);
                setUserResponse('');
                setAudioPlayed(false);
            } else {
                // End the session to clean up played files before completing
                if (!cleanupStarted) {
                    setCleanupStarted(true);

                    try {
                        // End session to clean up played files
                        await audioService.endSession();
                        console.log('Played files have been cleaned up');

                        // Clear saved progress when completing a training day
                        localStorage.removeItem(`progress_${userId}_training_day${trainingDay}`);
                        // Also clear legacy format if it exists
                        localStorage.removeItem(`training_progress_day_${trainingDay}`);
                    } catch (error) {
                        console.error('Error cleaning up files:', error);
                        // Continue even if cleanup fails
                    }

                    // Complete training day
                    onComplete(trainingDay);
                }
            }
        } catch (error) {
            console.error('Error submitting response:', error);

            // Show a more detailed error message that might help debug the issue
            let errorMessage = 'Failed to submit response. Please try again.';
            if (error.message && error.message.includes('Server returned')) {
                // For day restriction errors, use a more friendly message
                if (error.message.includes("correct day") || error.message.includes("Please return")) {
                    // Skip alert for this common error - just log to console
                    console.warn("Day restriction error - continuing with test without alerting user");
                    // No alert in this case - too disruptive for testing
                } else {
                    // For other server errors, show the detailed message
                    errorMessage = error.message;
                    alert(errorMessage);
                }
            } else {
                // For non-server errors, show the generic message
                alert(errorMessage);
            }

            // Continue to next stimulus even if submission fails
            // This prevents users from getting stuck
            if (currentStimulusIndex < 19) {
                setCurrentStimulusIndex(prevIndex => prevIndex + 1);
                setUserResponse('');
                setAudioPlayed(false);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePlayTestAudio = async () => {
        // First set audio story to loading state to prevent showing the wrong text
        setAudioStoryNumber('loading');

        // Log available files - for debugging only
        console.log("Training test phase - available files for testing:", intelligibilityStimuli);

        // Try up to 3 times to play the training test audio
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`Attempt ${attempt} to play training test audio...`);
                // CRITICAL FIX: Get the randomized file number rather than using sequential index
                // Cap at 19 to stay within the allocated segment size
                const safeIndex = Math.min(currentStimulusIndex, 19);
                
                // Get the actual file number using the same randomization approach as the submission
                const { getGroupForPhase } = require('../utils/randomization');
                // Use 'training' phase with trainingDay parameter to get the correct segment
                const trainingFiles = getGroupForPhase('training', trainingDay, userId);
                
                // Convert to proper file number using the randomized sequence
                const actualFileNumber = trainingFiles[safeIndex];
                
                console.log(`Playing randomized training test audio: Using file #${actualFileNumber} for day ${trainingDay}, index ${safeIndex}`);
                console.log(`Full sequence (${trainingFiles.length}):`, trainingFiles.slice(0, 5), '...');

                // Add a timeout for the entire operation - reduced to 10 seconds for faster failure
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Audio playback timed out')), 10000);
                });

                // Race the audio playback against our timeout
                // USE playRandomizedTestAudio instead which handles randomization correctly
                const result = await Promise.race([
                    // Custom wrapper for training test audio that ensures trainingDay is passed properly
                    (async () => {
                        console.log(`Creating custom training test audio request for day ${trainingDay}`);
                        
                        // Store training day in window for other services to access
                        if (typeof window !== 'undefined') {
                            window.currentTrainingDay = trainingDay;
                            console.log(`Set current training day in window: ${trainingDay}`);
                        }
                        
                        // First, get the randomized file directly using getGroupForPhase
                        const { getGroupForPhase } = require('../utils/randomization');
                        const randomizedFiles = getGroupForPhase('training', trainingDay, userId);
                        
                        if (!randomizedFiles || randomizedFiles.length === 0) {
                            throw new Error(`No randomized files returned for training day ${trainingDay}`);
                        }
                        
                        // Get the actual file number for this index and ensure it's valid
                        if (safeIndex >= randomizedFiles.length) {
                            console.error(`Index ${safeIndex} out of bounds for randomized files array of length ${randomizedFiles.length}`);
                            throw new Error(`Invalid file index: ${safeIndex} exceeds available files`);
                        }
                        
                        const actualFileNumber = randomizedFiles[safeIndex];
                        
                        // Verify file number is in a reasonable range
                        if (actualFileNumber < 1 || actualFileNumber > 160) {
                            console.error(`Invalid file number ${actualFileNumber} - should be between 1 and 160`);
                            throw new Error(`Invalid file number: ${actualFileNumber}`);
                        }
                        
                        console.log(`Directly using file number ${actualFileNumber} from day ${trainingDay} sequence`);
                        
                        // Now the backend supports 'training' as a valid phase for intelligibility tests
                        // We can directly use the proper phase instead of the pretest workaround
                        console.log(`Using direct training phase for intelligibility file #${actualFileNumber}`);
                        
                        // CRITICAL: Store the randomized file number in a global variable for debugging
                        if (typeof window !== 'undefined') {
                            window.lastRandomizedFileNumber = actualFileNumber;
                            console.log(`Set lastRandomizedFileNumber in window: ${actualFileNumber}`);
                        }
                        
                        // Handle 404s gracefully with fallback
                        try {
                            return await audioService.playTestAudio(
                                'training', // Use 'training' directly now that the backend supports it
                                'intelligibility',
                                null,
                                actualFileNumber, // Use pre-randomized file number
                                // Pass additional info to help with debugging and ensure consistent randomization
                                {
                                    trainingDay: trainingDay, 
                                    randomizedFileNumber: actualFileNumber
                                }
                            );
                        } catch (error) {
                            if (error.message === 'AUDIO_NOT_FOUND' || error.message.includes('not found') || error.message.includes('404')) {
                                console.warn(`File #${actualFileNumber} not found, trying fallback with sequential file`);
                                
                                // Instead of hardcoding a direct URL, 
                                // try another approach with the backend API
                                // This time request the file through a different endpoint
                                console.log(`Attempting to access file through backend API...`);
                                
                                // The backend knows the correct speaker for this user
                                const token = localStorage.getItem('token');
                                if (!token) {
                                    throw new Error('No authentication token found');
                                }
                                
                                // CRITICAL: Log the actual file number we're using for the API call
                                console.log(`CRITICAL BACKUP: Using randomized file number ${actualFileNumber} for backup API call`);
                                
                                // Store backup file number in window for debugging
                                if (typeof window !== 'undefined') {
                                    window.lastBackupFileNumber = actualFileNumber;
                                    console.log(`Set lastBackupFileNumber in window: ${actualFileNumber}`);
                                }
                                
                                // Use the training phase directly instead of pretest
                                // Include trainingDay as a query parameter to ensure consistent randomization
                                const backupUrl = `${config.API_BASE_URL}/audio/training/intelligibility/null/${actualFileNumber}?trainingDay=${trainingDay}`;
                                console.log(`Trying backup API endpoint: ${backupUrl}`);
                                
                                const response = await fetch(backupUrl, {
                                    headers: {
                                        'Authorization': `Bearer ${token}`
                                    }
                                });
                                
                                if (!response.ok) {
                                    console.error(`Backup API request failed: ${response.status}`);
                                    throw new Error('All file access methods failed');
                                }
                                
                                const data = await response.json();
                                if (!data.url) {
                                    throw new Error('No URL in backup API response');
                                }
                                
                                console.log(`Got file URL from backup API: ${data.url}`);
                                // Use audio service's direct playback method
                                await audioService.playAudioFromUrl(`${config.API_BASE_URL}${data.url}`);
                                return true; // Consider it successful
                            }
                            
                            // For other errors, let them propagate
                            throw error;
                        }
                    })(),
                    timeoutPromise
                ]);

                // If we got a result with file information, store it
                if (result && result.fileNumber) {
                    console.log(`Test audio result: file #${result.fileNumber}`);

                    // For test phase, we don't need to set story number since we're using intelligibility files
                    setCurrentFileNumber(result.fileNumber);

                    // In test phase, we don't need to show specific story text, so we can clear this
                    setAudioStoryNumber(null);
                }

                // We no longer need to check for story numbers since we're using intelligibility files
                // Adding a simpler check just to verify the audio element exists
                setTimeout(() => {
                    const audioElement = document.querySelector('audio');
                    if (audioElement && audioElement.src) {
                        console.log(`Test audio element source: ${audioElement.src}`);
                        // Check if it contains 'Int' which indicates intelligibility files
                        if (audioElement.src.includes('Int')) {
                            console.log('Confirmed intelligibility file is being used');
                        }
                    }
                }, 500); // Short delay to ensure audio element is created

                console.log('Training test audio played successfully!');
                setAudioPlayed(true);
                return true; // Success
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);

                // Handle critical errors immediately
                if (error.message === 'AUDIO_NOT_FOUND' ||
                    error.message.includes('not found') ||
                    error.message.includes('404') ||
                    error.message.includes('timed out')) {

                    console.log('Critical error in training test audio - providing fallback');
                    alert('Audio file could not be played. You can proceed by submitting "NA" as your response.');
                    setUserResponse('NA');
                    setAudioPlayed(true);

                    // Ensure we clean up any hanging audio
                    audioService.dispose();
                    return false; // Failed but handled
                }

                // Clean up before potential retry
                audioService.dispose();

                // If this is the last attempt, handle the error
                if (attempt >= 3) {
                    console.log('All training audio retry attempts failed');
                    alert('After multiple attempts, the audio could not be played. You can proceed with "NA" as your response.');
                    setUserResponse('NA');
                    setAudioPlayed(true);
                    return false; // Failed but handled
                }

                // Wait before retrying
                await new Promise(r => setTimeout(r, 1000));
                console.log(`Waiting before retry attempt ${attempt + 1}...`);
            }
        }

        // Should never reach here due to return statements above
        return false;
    };

    // Clean up resources when component unmounts or when user navigates away
    useEffect(() => {
        return () => {
            // Only clean up if we've started a training session
            if (currentPhase !== 'instruction' && !cleanupStarted) {
                audioService.endSession()
                    .then(() => console.log('Files cleaned up on component unmount'))
                    .catch(error => console.error('Failed to clean up files:', error));
            }
        };
    }, [currentPhase, cleanupStarted]);

    const renderInstructionPhase = () => (
        <Card className="shadow-lg">
            <CardHeader className="bg-[#406368] text-white">
                <h2 className="text-xl font-semibold">Training Day {trainingDay}</h2>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Instructions</h3>
                    <p>In this training session, you will:</p>
                    <ol className="list-decimal ml-5 space-y-2">
                        <li>Listen to audio clips and see the text that matches what is being said</li>
                        <li>After completing all training clips, you will be tested on your ability to understand similar speech</li>
                    </ol>

                    <div className="bg-[#f3ecda] p-4 rounded-lg border border-[#dad6d9] flex items-center space-x-2">
                        <Headphones className="h-5 w-5 text-[#406368]" />
                        <p className="text-[#406368]">Please wear headphones during this training session.</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="border-t border-gray-100 pt-4">
                <Button
                    onClick={handleStartTraining}
                    className="w-full bg-[#406368] hover:bg-[#6c8376]"
                >
                    Start Training
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );

    const renderTrainingPhase = () => {
        // Determine what story text to display
        let storyNumber;
        let loadingText = false; // Flag to show a loading message instead of text

        // If we're in the loading state, don't show any story text yet
        if (audioStoryNumber === 'loading') {
            console.log('Audio story still loading - will show loading indicator');
            loadingText = true;
            storyNumber = null; // Don't use any story number while loading
        }
        // Otherwise, use the story from audio, or default mapping as last resort
        else if (audioStoryNumber) {
            console.log(`Using story number ${audioStoryNumber} from audio playback`);
            storyNumber = audioStoryNumber;
        }
        else {
            console.log(`Using default story number ${TRAINING_DAY_TO_STORY[trainingDay]} from mapping`);
            storyNumber = TRAINING_DAY_TO_STORY[trainingDay];

            // Check the actual audio element that's currently playing
            // This is an immediate check that doesn't wait for async operations
            const audioElement = document.querySelector('audio');
            if (audioElement && audioElement.src) {
                console.log(`Examining active audio element source: ${audioElement.src}`);

                // Check for ALL possible story numbers in the src
                let detectedStory = null;

                // Try to find any story number pattern in the URL
                const patterns = [
                    { regex: /Trn_(\d{2})_\d{2}/i, group: 1 },
                    { regex: /day\/(\d{2})\/\d+/i, group: 1 },
                    { regex: /(\d{2})_\d{2}\.wav/i, group: 1 }
                ];

                for (const pattern of patterns) {
                    const match = audioElement.src.match(pattern.regex);
                    if (match && match[pattern.group]) {
                        detectedStory = match[pattern.group];
                        console.log(`Detected story ${detectedStory} in currently playing audio via pattern ${pattern.regex}`);
                        break;
                    }
                }

                // If we found a story number that's different from current state, update immediately
                if (detectedStory && detectedStory !== audioStoryNumber) {
                    console.log(`Updating story number to ${detectedStory} based on active audio element`);
                    // Update state to force re-render with correct text
                    setAudioStoryNumber(detectedStory);
                    storyNumber = detectedStory; // Use immediately in this render

                    // Also update total length for this story
                    if (STORY_METADATA[detectedStory]) {
                        const newTotalStimuli = STORY_METADATA[detectedStory].length;
                        setTotalStoryStimuli(newTotalStimuli);
                    }
                }
            }
        }

        // The file index to display (e.g., 1, 2, 3)
        const fileIndex = currentFileNumber || (currentStimulusIndex + 1);

        // We'll define these variables for use in rendering
        let currentStimulus = null;
        let displayText = "";

        // Show loading indicator if we're still waiting for the actual story
        if (loadingText) {
            displayText = "Loading audio...";
            console.log("Showing loading message while determining correct story");
        }
        // Normal processing when we know the story number
        else if (storyNumber) {
            // Format matches the exact ID format in trainingData.js: "Trn_03_01"
            const stimulusId = `Trn_${storyNumber}_${String(fileIndex).padStart(2, '0')}`;

            console.log(`Looking up text for stimulus ID ${stimulusId}`);

            // Find the text for this stimulus in all available data
            let correctStimulus = null;
            let foundInDay = null;

            // The story number maps to a specific day in the data:
            // 02 -> day1, 03 -> day2, 04 -> day3, 07 -> day4
            // We need to find which day contains this story
            let dataDay = null;

            if (storyNumber === "02") dataDay = "day1";
            else if (storyNumber === "03") dataDay = "day2";
            else if (storyNumber === "04") dataDay = "day3";
            else if (storyNumber === "07") dataDay = "day4";

            if (dataDay && TRAINING_DATA[dataDay]) {
                // First check the expected day for this story
                correctStimulus = TRAINING_DATA[dataDay].find(item => item.id === stimulusId);
                if (correctStimulus) {
                    foundInDay = dataDay;
                    console.log(`Found matching text in ${dataDay} data (direct match): "${correctStimulus.text}"`);
                }
            }

            // If not found in the expected day, search all days
            if (!correctStimulus) {
                for (const day in TRAINING_DATA) {
                    const foundStimulus = TRAINING_DATA[day].find(item => item.id === stimulusId);
                    if (foundStimulus) {
                        correctStimulus = foundStimulus;
                        foundInDay = day;
                        console.log(`Found matching text in ${day} data (fallback search): "${foundStimulus.text}"`);
                        break;
                    }
                }
            }

            // In case we still don't have a match, try searching by story number alone
            if (!correctStimulus) {
                for (const day in TRAINING_DATA) {
                    // Look for any stimulus with the matching story number
                    const anyStoryMatch = TRAINING_DATA[day].find(item =>
                        item.id.includes(`_${storyNumber}_`) ||
                        item.id.includes(`Trn_${storyNumber}`)
                    );

                    if (anyStoryMatch) {
                        console.log(`Found at least one stimulus with story ${storyNumber} in ${day}`);

                        // Now look for the specific index in this day
                        const indexMatch = TRAINING_DATA[day].find(item =>
                            item.id.endsWith(`_${String(fileIndex).padStart(2, '0')}`)
                        );

                        if (indexMatch) {
                            correctStimulus = indexMatch;
                            foundInDay = day;
                            console.log(`Found matching index ${fileIndex} in ${day}: "${indexMatch.text}"`);
                            break;
                        }
                    }
                }
            }

            // Use the correct stimulus if found, otherwise fall back to the passed prop
            currentStimulus = correctStimulus || trainingStimuli[currentStimulusIndex];

            // Log for debugging if the correct stimulus is not found
            if (!correctStimulus) {
                console.warn(`Could not find training stimulus with ID ${stimulusId} in any day's data. Using fallback.`);
            } else {
                console.log(`Using text from ${foundInDay} for story ${storyNumber}, stimulus ${fileIndex}: "${currentStimulus.text}"`);
            }

            displayText = currentStimulus?.text || "Loading text...";
        }
        else {
            // Fallback text if no story number (shouldn't happen)
            displayText = "Preparing training session...";
        }

        // Calculate progress based on all stories for this training day
        const currentStoryTotal = totalStoryStimuli ||
            (storyNumber && STORY_METADATA[storyNumber]?.length) ||
            trainingStimuli.length;

        // Calculate total stimuli across all stories
        let totalStimuli = 0;
        if (trainingDayStories.length > 0) {
            for (const storyId of trainingDayStories) {
                totalStimuli += STORY_METADATA[storyId]?.length || 0;
            }
        } else {
            // Fallback if stories aren't loaded yet
            totalStimuli = currentStoryTotal;
        }

        // Calculate actual progress considering completed stories
        let completedCount = 0;
        // Add all completed stories
        if (trainingDayStories.length > 0) {
            for (let i = 0; i < storyPairIndex; i++) {
                const storyId = trainingDayStories[i];
                completedCount += STORY_METADATA[storyId]?.length || 0;
            }
        }
        // Add progress in current story
        completedCount += currentStimulusIndex + 1;

        const progress = (completedCount / totalStimuli) * 100;
        console.log(`Progress: ${completedCount}/${totalStimuli} = ${progress.toFixed(1)}% (Story ${storyPairIndex + 1}/${trainingDayStories.length}, stimuli ${currentStimulusIndex + 1}/${currentStoryTotal})`);

        return (
            <Card className="shadow-lg !border-0">
                <CardHeader className="bg-[#406368] text-white">
                    <h2 className="text-xl font-semibold">Training Day {trainingDay}</h2>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700">
                                {trainingDayStories.length > 0 ? (
                                    <>
                                        Story {storyPairIndex + 1}/{trainingDayStories.length}: Stimulus {currentStimulusIndex + 1} of {currentStoryTotal}
                                    </>
                                ) : (
                                    <>
                                        Stimulus {currentStimulusIndex + 1} of {currentStoryTotal}
                                    </>
                                )}
                                {storyNumber && STORY_METADATA[storyNumber] && (
                                    <span className="ml-1 text-[#406368]">
                                        ({STORY_METADATA[storyNumber].title})
                                    </span>
                                )}
                            </span>
                            <span className="text-[#406368] font-medium">
                                {Math.round(progress)}% Complete
                            </span>
                        </div>
                        <div className="w-full h-2 bg-[#dad6d9] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#406368] rounded-full transition-all duration-300 ease-in-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Audio status indicator */}
                    <div className="pt-4">
                        <div
                            className={`w-full h-16 rounded-md flex items-center justify-center space-x-3 ${audioPlaying
                                ? "bg-[#f3ecda]"
                                : audioPlayed && !audioStoryNumber
                                    ? "bg-red-100" // Error state when audio played = true but no story (audio not found)
                                    : audioPlayed
                                      ? "bg-[#f3ecda] bg-opacity-70"
                                      : "bg-[#dad6d9] bg-opacity-30"
                                }`}
                        >
                            {audioPlaying ? (
                                <>
                                    <Loader className="h-6 w-6 text-[#406368] animate-spin" />
                                    <span className="text-[#406368] font-medium">Audio Playing...</span>
                                </>
                            ) : audioPlayed && !audioStoryNumber ? (
                                <>
                                    <AlertCircle className="h-6 w-6 text-red-500" />
                                    <span className="text-red-500 font-medium">Audio Not Available - Click Next to Continue</span>
                                </>
                            ) : audioPlayed ? (
                                <>
                                    <Volume2 className="h-6 w-6 text-[#6c8376]" />
                                    <span className="text-[#6c8376] font-medium">Audio Played</span>
                                </>
                            ) : (
                                <>
                                    <Loader className="h-6 w-6 text-[#6e6e6d] animate-spin" />
                                    <span className="text-[#6e6e6d]">Loading Audio... (Training will start automatically)</span>
                                </>
                            )}
                        </div>
                    </div>

                    {showText && (
                        <div className={`mt-6 p-6 ${audioPlayed && !audioStoryNumber 
                            ? "bg-red-50 border-red-200" 
                            : "bg-[#f3ecda] border-[#dad6d9]"} rounded-lg border`}>
                            <p className="text-lg text-center font-medium text-gray-800">
                                {audioPlayed && !audioStoryNumber ? (
                                    <span className="text-red-500 italic">Audio file not available. Please click Next to continue.</span>
                                ) : loadingText ? (
                                    <span className="text-gray-500 italic">{displayText}</span>
                                ) : (
                                    `"${displayText}"`
                                )}
                            </p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="border-t border-gray-100 pt-4">
                    <Button
                        onClick={handleNext}
                        disabled={!audioPlayed || audioPlaying}
                        className={`w-full ${audioPlayed && !audioStoryNumber 
                            ? "bg-red-500 hover:bg-red-600" // Highlight the button for audio not found cases
                            : "bg-[#406368] hover:bg-[#6c8376]"} disabled:bg-[#6e6e6d]`}
                    >
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        );
    };

    const renderTestPhase = () => {
        // Always use 20 for the total number of test stimuli
        const TRAINING_TEST_LENGTH = 20;

        return (
            <div>
                <div className="bg-white shadow-xl rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-[#406368] text-white px-6 py-4">
                        <h2 className="text-xl font-semibold">Day {trainingDay} Activity: Speech Intelligibility</h2>
                    </div>

                    {/* Content */}
                    <div className="p-6 bg-white">
                        <IntelligibilityTest
                            userResponse={userResponse}
                            onResponseChange={setUserResponse}
                            onSubmit={handleTestSubmit}
                            currentStimulus={currentStimulusIndex}
                            totalStimuli={TRAINING_TEST_LENGTH}
                            onPlayAudio={handlePlayTestAudio}
                            isSubmitting={isSubmitting}
                        />
                    </div>
                </div>
            </div>
        );
    };

    // Get training data based on day
    //const getTrainingData = () => {
    //    switch (trainingDay) {
    //        case 1:
    //            return {
    //                stimuli: TRAINING_DATA.day1,
    //                testStimuli: TRAINING_TEST_STIMULI.day1
    //            };
    //        case 2:
    //            return {
    //                stimuli: TRAINING_DATA.day2,
    //                testStimuli: TRAINING_TEST_STIMULI.day2
    //            };
    //        case 3:
    //            return {
    //                stimuli: TRAINING_DATA.day3,
    //                testStimuli: TRAINING_TEST_STIMULI.day3
    //            };
    //        case 4:
    //            return {
    //                stimuli: TRAINING_DATA.day4,
    //                testStimuli: TRAINING_TEST_STIMULI.day4
    //            };
    //        default:
    //            return {
    //                stimuli: TRAINING_DATA.day1,
    //                testStimuli: TRAINING_TEST_STIMULI.day1
    //            };
    //    }
    //};

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={() => {
                        // Clean up played files before going back, but don't remove progress
                        if (currentPhase !== 'instruction' && !cleanupStarted) {
                            setCleanupStarted(true);
                            audioService.endSession()
                                .then(() => {
                                    console.log('Files cleaned up on back navigation');
                                    onBack();
                                })
                                .catch(() => onBack());
                        } else {
                            onBack();
                        }
                    }}
                    className="mb-4 text-[#406368] hover:text-[#6c8376]"
                >
                    ← Back to Training Selection
                </Button>

                {currentPhase === 'instruction' && renderInstructionPhase()}
                {currentPhase === 'training' && renderTrainingPhase()}
                {currentPhase === 'test' && renderTestPhase()}
            </div>
        </div>
    );
};

export default TrainingSession;