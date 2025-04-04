import React, { useState, useEffect } from 'react';
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
    }, [currentStimulus]);

    // Handler to track when audio has been played - with retries
    const handlePlayAudio = async () => {
        setIsPlaying(true);
        setAudioError(false);
        
        // Reset in case of retry
        setAudioPlayed(false);

        // Try up to 3 times to play the audio - increased retry attempts
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`Attempt ${attempt} to play effort audio...`);
                
                // Add a timeout for the entire operation - reduced time for faster failure
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Audio playback timed out')), 10000);
                });
                
                // Race the audio playback against our timeout
                await Promise.race([onPlayAudio(), timeoutPromise]);
                
                console.log('Effort audio played successfully!');
                setAudioPlayed(true);
                break; // Success! Exit the retry loop
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                
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
                    await new Promise(r => setTimeout(r, 1000));
                    console.log(`Waiting before retry attempt ${attempt + 1}...`);
                }
            }
        }
        
        // Always reset the playing state when done with all attempts
        setIsPlaying(false);
        
        // Ensure we clean up any hanging audio
        audioService.dispose();
    };

    return (
        <Card className="shadow-lg border-gray-200">
            <CardContent className="p-6 space-y-6">
                {/* Progress Section */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">
                            Stimulus {currentStimulus + 1} of {totalStimuli}
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

                {/* Audio Control Section */}
                <div className="pt-4">
                    <Button
                        onClick={handlePlayAudio}
                        className={`w-full h-16 text-lg flex items-center justify-center space-x-3 
                            ${isPlaying ? "bg-blue-400" :
                                audioError ? "bg-red-500 hover:bg-red-600" :
                                    audioPlayed ? "bg-gray-400 hover:bg-gray-500" :
                                        "bg-blue-600 hover:bg-blue-700"
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
                                <span>{audioPlayed ? "Audio Played" : "Play Audio Stimulus"}</span>
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
                            className="w-full p-3 text-lg border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                            disabled={!audioPlayed}
                        />
                    </div>

                    {/* Effort Rating Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-gray-700">
                                Rate your listening effort:
                            </Label>
                            <span className="text-sm font-medium text-blue-600">
                                {rating || 1} - {getRatingLabel(rating || 1)}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <div className="relative">
                                <input
                                    type="range"
                                    min="1"
                                    max="100"
                                    value={rating || 1}
                                    onChange={(e) => onRatingChange(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    style={{
                                        background: `linear-gradient(to right, #2563eb ${rating || 1}%, #e5e7eb ${rating || 1}%)`
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
                        disabled={!userResponse.trim() || !rating || !audioPlayed || isPlaying || isSubmitting}
                        className="w-full h-12 mt-4 flex items-center justify-center space-x-2
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span>{isSubmitting ? "Submitting..." : "Submit Response"}</span>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>

                {/* Instructions */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Instructions:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>1. Click "Play Audio" to hear the stimulus</li>
                        <li>2. Type the final word you heard</li>
                        <li>3. Rate how much effort it took to understand the audio</li>
                        <li>4. Click "Submit Response" when you're ready</li>
                        <li className="text-blue-600 font-medium">
                            Note: You must wait for the audio to finish playing completely before submitting
                        </li>
                        {audioError && (
                            <li className="text-red-500">
                                If audio is not available, enter "NA" as your response
                            </li>
                        )}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};

export default ListeningEffortTest;