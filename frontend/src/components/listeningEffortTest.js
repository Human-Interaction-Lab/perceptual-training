import React, { useState, useEffect, useRef } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent } from "./ui/card";
import { Volume2, Send, AlertCircle } from 'lucide-react';
import audioService from '../services/audioService';

const ListeningEffortTest = ({
    userResponse,
    rating,
    onResponseChange,
    onRatingChange,
    onSubmit,
    currentStimulus,
    totalStimuli,
    onPlayAudio,
    isSubmitting = false
}) => {
    const progress = ((currentStimulus + 1) / totalStimuli) * 100;
    const [audioPlayed, setAudioPlayed] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioError, setAudioError] = useState(false);
    const timeoutRef = useRef(null);
    const isPlayingRef = useRef(false); // For avoiding race conditions
    
    const getRatingLabel = (value) => {
        if (value <= 20) return 'Very Easy';
        if (value <= 40) return 'Easy';
        if (value <= 60) return 'Moderate';
        if (value <= 80) return 'Hard';
        return 'Very Hard';
    };

    // Reset audioPlayed when stimulus changes
    useEffect(() => {
        setAudioPlayed(false);
        setAudioError(false);
        
        // Ensure cleanup when stimulus changes
        return () => {
            cleanupAudioResources();
        };
    }, [currentStimulus]);

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
    
    // Handler to track when audio has been played - with retries
    const handlePlayAudio = async () => {
        // Prevent concurrent calls
        if (isPlayingRef.current) {
            console.log('Audio already playing, ignoring additional play request');
            return;
        }
        
        setIsPlaying(true);
        isPlayingRef.current = true;
        setAudioError(false);

        // Reset in case of retry
        setAudioPlayed(false);

        // Clean up any previous resources
        cleanupAudioResources();

        // Try up to 3 times to play the audio
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`Attempt ${attempt} to play effort audio...`);

                // Add a timeout for the entire operation - increased to 15 seconds
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutRef.current = setTimeout(() => {
                        reject(new Error('Audio playback timed out'));
                    }, 15000); // Increased timeout for slower networks
                });

                // Race the audio playback against our timeout
                await Promise.race([onPlayAudio(), timeoutPromise]);

                // Clear the timeout if audio played successfully
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }

                console.log('Effort audio played successfully!');
                setAudioPlayed(true);
                break; // Success! Exit the retry loop
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);

                // Clear the timeout if it exists
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }

                if (error.message === 'AUDIO_NOT_FOUND' ||
                    error.message.includes('not found') ||
                    error.message.includes('404') ||
                    error.message.includes('timed out')) {

                    console.log('Critical audio error - providing fallback for effort test');
                    setAudioError(true);
                    setAudioPlayed(true); // Mark as played even if not found

                    // Auto-fill "NA" as response when audio is not found
                    onResponseChange("NA");

                    // Set a default rating value to allow proceeding
                    if (!rating) {
                        onRatingChange(1); // Set minimum rating
                    }

                    // Only show alert once
                    if (!audioError) {
                        alert('Audio file could not be played. You can proceed by entering "NA" as your response and setting a rating.');
                    }

                    break; // No need to retry for these critical errors
                } else if (attempt >= 3) {
                    // On the last attempt, handle any other error
                    console.log('All attempts failed, showing error');
                    setAudioError(true);
                    setAudioPlayed(true); // Mark as played so user can proceed

                    // Auto-fill "NA" as response
                    onResponseChange("NA");

                    // Set a default rating value
                    if (!rating) {
                        onRatingChange(1); // Set minimum rating
                    }

                    // Only show alert once
                    if (!audioError) {
                        alert('After multiple attempts, the audio could not be played. You can proceed with "NA" as your response.');
                    }
                }

                // Clean up before potential retry
                audioService.dispose();

                // If this wasn't the last attempt, wait a bit before retrying
                if (attempt < 3) {
                    try {
                        await new Promise(r => setTimeout(r, 1000));
                        console.log(`Waiting before retry attempt ${attempt + 1}...`);
                    } catch (timeoutError) {
                        console.error('Error in retry delay:', timeoutError);
                    }
                }
            }
        }

        // Always reset the playing state when done with all attempts
        setIsPlaying(false);
        isPlayingRef.current = false;

        // Ensure we clean up any hanging audio
        audioService.dispose();
    };

    // Helper function to detect browser type
    const getBrowserType = () => {
        if (typeof window === 'undefined') return 'unknown';
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (userAgent.indexOf('chrome') > -1) return 'chrome';
        return 'other';
    };

    return (
        <Card className="shadow-lg">
            <CardContent className="p-6 space-y-6">
                {/* Browser compatibility notice */}
                {getBrowserType() !== 'chrome' && (
                    <div className="mb-4 bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded text-sm">
                        <p className="font-medium text-yellow-800">Browser Warning</p>
                        <p className="text-yellow-700">Audio features work best in Google Chrome. Please switch browsers if you experience issues.</p>
                    </div>
                )}

                {/* Instructions - Moved to top */}
                <div className="mb-4 p-4 bg-[#f3ecda] rounded-lg border border-[#dad6d9]">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Instructions:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>1. Click "Play Audio" to hear the phrase (you can only play it once)</li>
                        <li>2. Type the final word you heard</li>
                        <li>3. Rate how much effort it took to understand the audio</li>
                        <li>4. Click "Submit Response" when you're ready</li>
                        <li className="text-[#406368] font-medium">
                            Note: You must wait for the audio to finish playing completely before submitting
                        </li>
                        {audioError && (
                            <li className="text-red-500">
                                If audio is not available, enter "NA" as your response
                            </li>
                        )}
                    </ul>
                </div>

                {/* Progress Section */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">
                            Phrase {currentStimulus + 1} of {totalStimuli}
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

                {/* Audio Control Section */}
                <div className="pt-4">
                    <Button
                        onClick={handlePlayAudio}
                        className={`w-full h-16 text-lg flex items-center justify-center space-x-3 
                            ${isPlaying ? "bg-[#6c8376]" :
                                audioError ? "bg-red-500 hover:bg-red-600" :
                                    audioPlayed ? "bg-[#6e6e6d] hover:bg-[#6e6e6d]" :
                                        "bg-[#406368] hover:bg-[#6c8376]"
                            } transition-colors`}
                        disabled={audioPlayed || isPlaying}
                    >
                        {isPlaying ? (
                            <span>Playing...</span>
                        ) : audioError ? (
                            <>
                                <AlertCircle className="h-6 w-6" />
                                <span>Audio Not Available</span>
                            </>
                        ) : (
                            <>
                                <Volume2 className="h-6 w-6" />
                                <span>{audioPlayed ? "Audio Played" : "Play Audio"}</span>
                            </>
                        )}
                    </Button>
                    <p className="text-center text-sm text-gray-600 mt-2">
                        {audioError ? (
                            <span className="text-red-500">
                                Audio file could not be found. Please enter "NA" as your response.
                            </span>
                        ) : audioPlayed ?
                            "Audio played successfully. Please complete your response below." :
                            isPlaying ? "Playing audio clip..." : "Click to play the audio clip (may take a moment to load)"
                        }
                    </p>
                </div>

                {/* Response Input Section */}
                <div className={`space-y-6 pt-4 ${!audioPlayed ? "opacity-60" : ""}`}>
                    <div className="space-y-2">
                        <Label
                            htmlFor="finalWordInput"
                            className="text-sm font-medium text-gray-700"
                        >
                            Type the <strong>final word</strong> you heard:
                        </Label>
                        <Input
                            id="finalWordInput"
                            type="text"
                            value={userResponse}
                            onChange={(e) => onResponseChange(e.target.value)}
                            placeholder={audioError ? "Type NA" : "Enter the final word..."}
                            className="w-full p-3 text-lg border-gray-200 focus:ring-[#406368] focus:border-[#406368]"
                            disabled={!audioPlayed}
                        />
                    </div>

                    {/* Effort Rating Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-gray-700">
                                Rate your listening effort:
                            </Label>
                            <span className="text-sm font-medium text-[#406368]">
                                {rating || 1} - {getRatingLabel(rating || 1)}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <div className="relative">
                                <input
                                    type="range"
                                    min="1"
                                    max="100"
                                    value={rating || 50}
                                    onChange={(e) => onRatingChange(parseInt(e.target.value))}
                                    className="w-full h-2 bg-[#dad6d9] rounded-lg appearance-none cursor-pointer
                                             focus:outline-none focus:ring-2 focus:ring-[#406368]"
                                    style={{
                                        background: `linear-gradient(to right, #406368 ${rating || 1}%, #dad6d9 ${rating || 1}%)`
                                    }}
                                    disabled={!audioPlayed}
                                />
                                <div className="flex justify-between text-xs text-gray-600 px-1 mt-1">
                                    <span>No effort</span>
                                    <span>Maximum effort</span>
                                </div>
                            </div>

                            {/* Visual indicator markers */}
                            <div className="flex justify-between px-1">
                                {[1, 25, 50, 75, 100].map((mark) => (
                                    <div
                                        key={mark}
                                        className="w-1 h-1 bg-gray-400 rounded-full"
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={onSubmit}
                        disabled={
                            // Standard validation: require response and rating
                            // But make an exception for "NA" responses due to missing audio
                            (!userResponse.trim() || !rating || !audioPlayed || isPlaying || isSubmitting) && 
                            // Special exception for "NA" with audio errors
                            !(userResponse.trim() === "NA" && audioError)
                        }
                        className="w-full h-12 mt-4 flex items-center justify-center space-x-2 bg-[#406368] hover:bg-[#6c8376]
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span>{isSubmitting ? "Submitting..." : "Submit Response"}</span>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>

            </CardContent>
        </Card>
    );
};

export default ListeningEffortTest;