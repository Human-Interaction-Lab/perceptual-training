// Modified ComprehensionTest.js with iPad Chrome compatibility
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardFooter } from "./ui/card";
import { Volume2, Send, BookOpen, AlertCircle, ArrowRight, Headphones, AlertTriangle } from 'lucide-react';
import audioService from '../services/audioService';
import { isIpadChrome, getAudioSettings } from '../utils/deviceDetection';

const ComprehensionTest = ({
    question,
    options,
    userResponse,
    onResponseChange,
    onSubmit,
    currentStimulus,
    totalStimuli,
    onPlayAudio,
    storyId,
    currentStoryIndex, // Add this prop to track the story number in sequence
    isSubmitting = false
}) => {
    const [storyAudioPlayed, setStoryAudioPlayed] = useState(false);
    const [isPlayingStory, setIsPlayingStory] = useState(false);
    const [audioError, setAudioError] = useState(false);
    const [showQuestions, setShowQuestions] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);
    const [allQuestionsAnswered, setAllQuestionsAnswered] = useState(false);
    const timeoutRef = useRef(null);
    const isPlayingRef = useRef(false); // For avoiding race conditions
    
    // Proper cleanup on component unmount
    useEffect(() => {
        return () => {
            cleanupAudioResources();
        };
    }, []);
    
    // Central cleanup function for audio resources
    const cleanupAudioResources = () => {
        // Clear any pending timeouts
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        
        // Cleanup any audio elements
        audioService.dispose();
        
        // Reset internal state
        isPlayingRef.current = false;
    };

    const optionLabels = ['A', 'B', 'C', 'D', 'E'];

    // Calculate progress across both stories (0-50% for story 1, 50-100% for story 2)
    const calculateProgress = () => {
        // If we're on the first story (index 0)
        if (currentStoryIndex === 0) {
            // Calculate progress from 0-50% based on current question
            return ((currentStimulus + 1) / totalStimuli) * 50;
        }
        // If we're on the second story (index 1)
        else if (currentStoryIndex === 1) {
            // Start at 50% and go to 100% based on current question
            return 50 + ((currentStimulus + 1) / totalStimuli) * 50;
        }
        // Fallback for any other scenario
        else {
            return ((currentStimulus + 1) / totalStimuli) * 100;
        }
    };

    const progress = calculateProgress();

    // Reset state when story changes
    useEffect(() => {
        setStoryAudioPlayed(false);
        setAudioError(false);
        setShowQuestions(false);
        setAllQuestionsAnswered(false);
        
        // Ensure cleanup when story changes
        cleanupAudioResources();
    }, [storyId]);

    // Check if a response has been selected
    useEffect(() => {
        // For multiple choice, userResponse is a number or null
        // When reset between questions, it may also be an empty string or undefined
        setAllQuestionsAnswered(userResponse !== null && userResponse !== '' && userResponse !== undefined);
    }, [userResponse]);

    // Extract story number and adjust to display 1 and 2 for story indices
    // If we're dealing with assigned stories in sequence, use the currentStoryIndex + 1
    const storyNumber = currentStoryIndex !== undefined ? currentStoryIndex + 1 : parseInt(storyId.replace('Comp_', ''));

    const handlePlayStoryAudio = async () => {
        // Prevent concurrent calls
        if (isPlayingRef.current) {
            console.log('Story audio already playing, ignoring additional play request');
            return;
        }
        
        // If this is a retry attempt, reset error and played states
        if (audioError) {
            console.log('Retrying audio playback after previous error');
            setStoryAudioPlayed(false);
        }
        
        setIsPlayingStory(true);
        isPlayingRef.current = true;
        setAudioError(false);
        setShowQuestions(false);

        // Clean up any previous resources
        cleanupAudioResources();

        // Use device-specific audio settings but with a longer base timeout for stories
        const settings = getAudioSettings();
        
        // Use a special timeout for iPad Chrome to prevent hanging
        const isIPadChromeDevice = isIpadChrome();
        
        // Stories need longer timeouts, but still shorter for iPad Chrome
        const baseTimeout = 60000; // 60 seconds for regular browsers
        const timeoutDuration = isIPadChromeDevice ? 30000 : baseTimeout; // 30 seconds for iPad Chrome
        
        console.log(`Using timeout of ${timeoutDuration}ms for story audio${isIPadChromeDevice ? ' (iPad Chrome)' : ''}`);
        
        // Add a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            timeoutRef.current = setTimeout(() => {
                reject(new Error('Audio playback timed out'));
            }, timeoutDuration);
        });

        try {
            console.log(`Playing full story audio for ${storyId}`);
            
            // Create a flag to track if audio has started playing
            let hasStartedPlaying = false;
            
            // Listen for audio play events at the window level
            const handleAudioPlaying = () => {
                console.log('Detected audio is playing - adjusting timeout');
                hasStartedPlaying = true;
                
                // Once audio starts playing, clear the original timeout and set a much longer one
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    
                    // Set a very long timeout (2 minutes) once audio is actually playing
                    // This prevents timeout errors while audio is still playing
                    timeoutRef.current = setTimeout(() => {
                        console.log('Extended audio playback timeout reached');
                        setAudioError(true);
                        setStoryAudioPlayed(true); // Allow proceeding even with error
                    }, 120000); // 2 minutes
                }
            };
            
            // Add a global event listener for audio play events
            if (typeof window !== 'undefined') {
                window.addEventListener('audio-playing', handleAudioPlaying);
            }
            
            try {
                // Race the story playback against our timeout
                await Promise.race([
                    onPlayAudio(storyId),
                    timeoutPromise
                ]);
                
                // Clear timeout if successful
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
                
                setStoryAudioPlayed(true);
                console.log('Story audio played successfully');
            } finally {
                // Clean up event listener
                if (typeof window !== 'undefined') {
                    window.removeEventListener('audio-playing', handleAudioPlaying);
                }
            }
        } catch (error) {
            console.error("Error playing story audio:", error);
            
            // Clear timeout on error
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            
            // Handle the audio error case
            if (error.message === 'AUDIO_NOT_FOUND' ||
                error.message.includes('not found') ||
                error.message.includes('404') ||
                error.message.includes('timed out')) {
                
                setAudioError(true);
                setStoryAudioPlayed(true);
                
                // Auto-select the first answer option to allow proceeding
                if (userResponse === null) {
                    onResponseChange(0);
                    console.log('Auto-selected first answer option due to audio error');
                }
                
                // Show questions immediately when audio fails
                setShowQuestions(true);
                
                // Show user message about audio failure
                alert('Story audio could not be played. You can proceed with the questions by selecting any answer option.');
            }
        } finally {
            setIsPlayingStory(false);
            isPlayingRef.current = false;
            audioService.dispose(); // Ensure cleanup
        }
    };

    const handleStartTest = () => {
        setShowInstructions(false);
    };

    const handleSubmit = () => {
        if (isSubmitting) return;
        onSubmit();
    };

    // Initialize state to detect iPad Chrome
    const [isIPadChromeDevice, setIsIPadChromeDevice] = useState(false);
    
    // Detect iPad Chrome on mount
    useEffect(() => {
        const detected = isIpadChrome();
        setIsIPadChromeDevice(detected);
        if (detected) {
            console.log('ComprehensionTest detected iPad Chrome');
        }
    }, []);
    
    if (showInstructions) {
        return (
            <Card className="shadow-lg">
                <CardHeader className="bg-[#406368] text-white">
                    <h2 className="text-xl font-semibold">Story Comprehension Activity</h2>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Instructions</h3>
                        <p>In this next task, you will hear two stories (you can only play each story once). After each story, you will answer multiple choice questions about the story. The story will begin as soon as you click to play the audio. Multiple choice questions will use information from all parts of the story.</p>

                        <div className="bg-[#f3ecda] p-4 rounded-lg border border-[#dad6d9] flex items-center space-x-2">
                            <Headphones className="h-5 w-5 text-[#406368]" />
                            <p className="text-[#406368]">Please wear headphones during this test session.</p>
                        </div>
                        
                        {/* iPad Chrome specific notice */}
                        {isIPadChromeDevice && (
                            <div className="bg-blue-100 p-4 rounded-lg border border-blue-300 flex items-start space-x-2">
                                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div className="text-blue-800">
                                    <p className="font-medium">iPad Chrome Detected</p>
                                    <p className="text-sm">If audio doesn't play correctly, you can still proceed by clicking "Start Questions" and selecting an answer.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="pt-4">
                    <Button
                        onClick={handleStartTest}
                        className="w-full bg-[#406368] hover:bg-[#6c8376]"
                    >
                        Start Comprehension Activity
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="shadow-lg">
            <CardContent className="p-6 space-y-6">
                {/* Instructions - Shown at the top */}
                <div className="mb-4 p-4 bg-[#f3ecda] rounded-lg border border-[#dad6d9]">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Instructions:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-start">
                            <span className="text-[#406368] mr-2">1.</span>
                            Listen to the complete story first (you can only play it once)
                        </li>
                        <li className="flex items-start">
                            <span className="text-[#406368] mr-2">2.</span>
                            Click "Start Questions" after listening
                        </li>
                        <li className="flex items-start">
                            <span className="text-[#406368] mr-2">3.</span>
                            Answer each question about the story
                        </li>
                        <li className="flex items-start">
                            <span className="text-[#406368] mr-2">4.</span>
                            Click "Submit Answer" to proceed
                        </li>
                        {audioError && (
                            <li className="flex items-start text-red-500">
                                <span className="text-red-500 mr-2">*</span>
                                If audio is not available, select an answer to continue
                            </li>
                        )}
                        {isIPadChromeDevice && (
                            <li className="flex items-start text-blue-600 mt-2">
                                <span className="text-blue-600 mr-2">*</span>
                                iPad Chrome: If audio doesn't play properly, you can still proceed with the questions
                            </li>
                        )}
                    </ul>
                </div>
                
                {/* iPad Chrome specific notice when detected */}
                {isIPadChromeDevice && !storyAudioPlayed && !audioError && (
                    <div className="mb-4 bg-blue-100 p-3 rounded-md border border-blue-300">
                        <div className="flex items-center text-blue-800">
                            <AlertTriangle className="h-5 w-5 mr-2 text-blue-600" />
                            <p className="text-sm">Stories may take longer to load on iPad Chrome. If loading fails, you can still continue with the questions.</p>
                        </div>
                    </div>
                )}

                {/* Header with Progress and Story ID */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <BookOpen className="h-5 w-5 text-[#406368]" />
                            <span className="text-lg font-medium text-gray-900">
                                Story {storyNumber} of 2
                            </span>
                        </div>
                        <span className="text-[#406368] font-medium">
                            {Math.round(progress)}% Complete
                        </span>
                    </div>

                    <div className="w-full h-2 bg-[#dad6d9] rounded-full overflow-hidden relative">
                        <div
                            className="h-full bg-[#406368] rounded-full transition-all duration-300 ease-in-out"
                            style={{ width: `${progress}%` }}
                        />
                        {/* Add a marker at 50% to visually separate the stories */}
                        <div className="absolute top-[-4px] left-[50%] translate-x-[-50%] w-[2px] h-[10px] bg-white"></div>
                    </div>
                </div>

                {/* Audio Control Section */}
                <div className="pt-2">
                    <Button
                        onClick={handlePlayStoryAudio}
                        className={`w-full h-16 text-lg flex items-center justify-center space-x-3 transition-colors ${isPlayingStory ? "bg-[#6c8376]" :
                            audioError ? "bg-[#406368] hover:bg-[#6c8376]" : // Changed to use standard color for retry
                                storyAudioPlayed ? "bg-[#6e6e6d] hover:bg-[#6e6e6d] cursor-not-allowed" :
                                    "bg-[#406368] hover:bg-[#6c8376]"
                            }`}
                        disabled={(!audioError && storyAudioPlayed) || isPlayingStory || isSubmitting}
                    >
                        {isPlayingStory ? (
                            <span className="animate-pulse">Playing Story Audio...</span>
                        ) : audioError ? (
                            <>
                                <AlertCircle className="h-6 w-6" />
                                <span>Retry Audio</span>
                            </>
                        ) : (
                            <>
                                <Volume2 className="h-6 w-6" />
                                <span>{storyAudioPlayed ? "Story Audio Played" : "Play Story Audio"}</span>
                            </>
                        )}
                    </Button>

                    {audioError ? (
                        <p className="text-center text-sm text-red-600 mt-2 font-medium">
                            Story audio could not be found. Please continue with the questions.
                        </p>
                    ) : !storyAudioPlayed ? (
                        <p className="text-center text-sm text-[#406368] mt-2 font-medium">
                            You must listen to the complete story before answering questions
                        </p>
                    ) : !showQuestions ? (
                        <div className="mt-4 text-center">
                            <Button
                                onClick={() => setShowQuestions(true)}
                                className="bg-[#6c8376] hover:bg-[#406368]"
                            >
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Start Questions
                            </Button>
                        </div>
                    ) : (
                        <p className="text-center text-sm text-[#6c8376] mt-2">
                            Please answer all questions about the story.
                        </p>
                    )}
                </div>

                {/* Question Section - Hidden until story audio is played AND Start Questions is clicked */}
                {showQuestions && (
                    <div className="space-y-6">
                        <div className="bg-[#f3ecda] p-4 rounded-lg border border-[#dad6d9]">
                            <Label className="block text-lg font-medium text-gray-800">
                                {question}
                            </Label>
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            {options.map((option, index) => (
                                <div
                                    key={index}
                                    className={`p-3 rounded-md border ${userResponse === index
                                        ? 'border-[#406368] bg-[#f3ecda]'
                                        : 'border-[#dad6d9] bg-white'
                                        } cursor-pointer hover:bg-[#f3ecda]`}
                                    onClick={() => !isSubmitting && onResponseChange(index)}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-6 h-6 flex items-center justify-center rounded-full border ${userResponse === index
                                            ? 'border-[#406368] bg-[#406368] text-white'
                                            : 'border-[#6e6e6d]'
                                            }`}>
                                            {optionLabels[index]}
                                        </div>
                                        <span className="text-gray-700">{option}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button
                            onClick={handleSubmit}
                            disabled={
                                // Normal case: require an answer
                                (!allQuestionsAnswered || isSubmitting) && 
                                // But enable if there's an audio error and any answer is selected
                                !(audioError && userResponse !== null)
                            }
                            className="w-full h-12 mt-4 flex items-center justify-center space-x-2 bg-[#406368] hover:bg-[#6c8376]
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center">
                                    <span className="animate-spin mr-2">●</span>
                                    Submitting...
                                </span>
                            ) : (
                                <>
                                    <span>Submit Answer</span>
                                    <Send className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ComprehensionTest;