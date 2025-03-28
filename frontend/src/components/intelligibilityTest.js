import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent } from "./ui/card";
import { Send, Volume2, AlertCircle } from 'lucide-react';
import audioService from '../services/audioService';

const IntelligibilityTest = ({
    userResponse,
    onResponseChange,
    onSubmit,
    currentStimulus,
    totalStimuli,
    onPlayAudio
}) => {
    const [audioError, setAudioError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioPlayed, setAudioPlayed] = useState(false);

    const progress = ((currentStimulus + 1) / totalStimuli) * 100;

    // Reset audioPlayed when stimulus changes
    useEffect(() => {
        setAudioPlayed(false);
        setAudioError(false);
    }, [currentStimulus]);

    const handlePlayAudio = async () => {
        setIsPlaying(true);
        setAudioError(false);

        try {
            // Use randomized audio playback instead of sequential
            if (audioService.onPlayRandomizedAudio) {
                await audioService.onPlayRandomizedAudio();
            } else {
                await onPlayAudio();
            }
            setAudioPlayed(true);
        } catch (error) {
            if (error.message === 'AUDIO_NOT_FOUND') {
                setAudioError(true);
                onResponseChange("NA");
            } else {
                console.error('Error playing audio:', error);
            }
        } finally {
            setIsPlaying(false);
        }
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
                        disabled={isPlaying || audioPlayed}
                        className={`w-full h-16 text-lg flex items-center justify-center space-x-3 ${audioError ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
                            } transition-colors`}
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
                                <span>Play Audio Stimulus</span>
                            </>
                        )}
                    </Button>
                    <p className="text-center text-sm text-gray-600 mt-2">
                        {audioError ? (
                            <span className="text-red-500">
                                Audio file could not be found. Please enter "NA" as your response.
                            </span>
                        ) : isPlaying ? (
                            "Playing audio clip..."
                        ) : (
                            "Click to play the audio clip (may take a moment to load)"
                        )}
                    </p>
                </div>

                {/* Response Input Section */}
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label
                            htmlFor="phraseInput"
                            className="text-sm font-medium text-gray-700"
                        >
                            Type the entire phrase you heard:
                        </Label>
                        <Input
                            id="phraseInput"
                            type="text"
                            value={userResponse}
                            onChange={(e) => onResponseChange(e.target.value)}
                            placeholder={audioError ? "Type NA" : "Enter the phrase..."}
                            className="w-full p-3 text-lg border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <Button
                        onClick={onSubmit}
                        disabled={!userResponse.trim()}
                        className="w-full h-12 mt-4 flex items-center justify-center space-x-2 
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span>Submit Response</span>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>

                {/* Instructions */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Instructions:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>1. Click the "Play Audio" button to hear the stimulus</li>
                        <li>2. Listen carefully to the entire phrase</li>
                        <li>3. Type exactly what you heard in the text box</li>
                        <li>4. Click "Submit Response" when you're ready</li>
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

export default IntelligibilityTest;