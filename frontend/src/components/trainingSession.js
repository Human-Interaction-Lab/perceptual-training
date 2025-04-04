import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "./ui/card";
import { ArrowRight, Headphones, Volume2, Loader } from 'lucide-react';
import IntelligibilityTest from './intelligibilityTest';
import { TRAINING_DATA, TRAINING_TEST_STIMULI, TRAINING_DAY_TO_STORY } from './trainingData';
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

    // Load saved progress when component mounts
    useEffect(() => {
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
                audioPlayed
            };

            // Use the new user-specific format
            const userSpecificKey = `progress_${userId}_training_day${trainingDay}`;
            
            localStorage.setItem(userSpecificKey, JSON.stringify(progressData));
            
            // Also remove any legacy format data to avoid confusion
            localStorage.removeItem(`training_progress_day_${trainingDay}`);

            console.log('Saved progress using new format:', progressData);
        }
    }, [trainingDay, currentPhase, currentStimulusIndex, audioPlayed, userId]);

    // Auto-play audio when in training phase and stimulus changes
    useEffect(() => {
        // Only auto-play in training phase, not when resuming a session
        if (currentPhase === 'training' && !audioPlayed && !audioPlaying) {
            const autoPlay = async () => {
                try {
                    setAudioPlaying(true);
                    await audioService.playTrainingAudio(
                        trainingDay,
                        currentStimulusIndex + 1
                    );
                    setAudioPlayed(true);
                } catch (error) {
                    console.error('Error auto-playing audio:', error);
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
    }, [currentPhase, currentStimulusIndex, audioPlayed, audioPlaying, trainingDay]);

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

            // Move to next stimulus or to test phase
            if (currentStimulusIndex < trainingStimuli.length - 1) {
                setCurrentStimulusIndex(prevIndex => prevIndex + 1);
            } else {
                // Move to test phase after completing all training stimuli
                setCurrentPhase('test');
                setCurrentStimulusIndex(0);
            }
        }
    };

    const handleStartTraining = () => {
        // Start preloading audio files in the background without waiting
        audioService.preloadAudioFiles('training', trainingDay)
            .catch(error => {
                console.error('Failed to preload training audio:', error);
                // Continue even if preloading fails
            });

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

            await fetch(`${config.API_BASE_URL}/api/response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    phase: 'training',
                    currentTestType: 'intelligibility',
                    stimulusId: `training_day${trainingDay}_intel_${currentStimulusIndex + 1}`,
                    response: userResponse,
                    trainingDay: trainingDay
                }),
            });

            // Move to next test stimulus or complete
            if (currentStimulusIndex < intelligibilityStimuli.length - 1) {
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
            alert('Failed to submit response. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePlayTestAudio = async () => {
        // Try up to 3 times to play the training test audio
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`Attempt ${attempt} to play training test audio...`);
                const stimulusIndex = currentStimulusIndex + 1;

                // Add a timeout for the entire operation - reduced to 10 seconds for faster failure
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Audio playback timed out')), 10000);
                });
                
                // Race the audio playback against our timeout
                await Promise.race([
                    audioService.playRandomizedTrainingAudio(
                        trainingDay,
                        stimulusIndex,
                        userId
                    ),
                    timeoutPromise
                ]);

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
            <CardHeader className="bg-blue-600 text-white">
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

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center space-x-2">
                        <Headphones className="h-5 w-5 text-blue-500" />
                        <p className="text-blue-700">Please wear headphones during this training session.</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="border-t border-gray-100 pt-4">
                <Button
                    onClick={handleStartTraining}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                >
                    Start Training
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );

    const renderTrainingPhase = () => {
        const currentStimulus = trainingStimuli[currentStimulusIndex];
        const progress = ((currentStimulusIndex + 1) / trainingStimuli.length) * 100;

        return (
            <Card className="shadow-lg">
                <CardHeader className="bg-blue-600 text-white">
                    <h2 className="text-xl font-semibold">Training Day {trainingDay}</h2>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700">
                                Stimulus {currentStimulusIndex + 1} of {trainingStimuli.length}
                            </span>
                            <span className="text-blue-600 font-medium">
                                {Math.round(progress)}% Complete
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-in-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Audio status indicator */}
                    <div className="pt-4">
                        <div
                            className={`w-full h-16 rounded-md flex items-center justify-center space-x-3 ${audioPlaying
                                ? "bg-blue-100"
                                : audioPlayed
                                    ? "bg-blue-50"
                                    : "bg-gray-50"
                                }`}
                        >
                            {audioPlaying ? (
                                <>
                                    <Loader className="h-6 w-6 text-blue-500 animate-spin" />
                                    <span className="text-blue-700 font-medium">Audio Playing...</span>
                                </>
                            ) : audioPlayed ? (
                                <>
                                    <Volume2 className="h-6 w-6 text-green-500" />
                                    <span className="text-green-700 font-medium">Audio Played</span>
                                </>
                            ) : (
                                <>
                                    <Loader className="h-6 w-6 text-gray-500 animate-spin" />
                                    <span className="text-gray-700">Loading Audio... (Training will start automatically)</span>
                                </>
                            )}
                        </div>
                    </div>

                    {showText && (
                        <div className="mt-6 p-6 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-lg text-center font-medium text-gray-800">
                                "{currentStimulus.text}"
                            </p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="border-t border-gray-100 pt-4">
                    <Button
                        onClick={handleNext}
                        disabled={!audioPlayed || audioPlaying}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                    >
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        );
    };

    const renderTestPhase = () => (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-center">Day {trainingDay} Test</h2>
            <IntelligibilityTest
                userResponse={userResponse}
                onResponseChange={setUserResponse}
                onSubmit={handleTestSubmit}
                currentStimulus={currentStimulusIndex}
                totalStimuli={intelligibilityStimuli.length}
                onPlayAudio={handlePlayTestAudio}
                isSubmitting={isSubmitting}
            />
        </div>
    );

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
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
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
                    className="mb-4 text-gray-600 hover:text-gray-800"
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