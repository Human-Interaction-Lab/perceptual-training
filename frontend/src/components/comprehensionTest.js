import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Card, CardContent } from "./ui/card";
import { Volume2, Send, BookOpen, Check, AlertCircle } from 'lucide-react';

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
    isSubmitting = false
}) => {
    // Track if the entire story audio has been played
    const [storyAudioPlayed, setStoryAudioPlayed] = useState(false);
    // Track if we're currently playing the story
    const [isPlayingStory, setIsPlayingStory] = useState(false);
    // Track audio errors
    const [audioError, setAudioError] = useState(false);

    const optionLabels = ['A', 'B', 'C', 'D', 'E'];
    const progress = ((currentStimulus + 1) / totalStimuli) * 100;

    // Reset storyAudioPlayed when story changes
    useEffect(() => {
        setStoryAudioPlayed(false);
        setAudioError(false);
    }, [storyId]);

    // Get the story number from the ID (e.g., "Comp_01" -> 1)
    const storyNumber = parseInt(storyId.replace('Comp_', ''));

    // Function to play the entire story
    const handlePlayStoryAudio = async () => {
        if (isPlayingStory) return;

        setIsPlayingStory(true);
        setAudioError(false);

        try {
            // Start by showing a message that the story is playing
            console.log(`Playing full story audio for ${storyId}`);

            // Call onPlayAudio with storyId instead of current question
            await onPlayAudio(storyId);

            // Mark the story as played
            setStoryAudioPlayed(true);
        } catch (error) {
            console.error("Error playing story audio:", error);
            if (error.message === 'AUDIO_NOT_FOUND') {
                setAudioError(true);
                setStoryAudioPlayed(true); // Mark as played even if not found
                // Set the first option as the default (can be adjusted later if needed)
                if (userResponse === null) {
                    onResponseChange(0);
                }
            }
        } finally {
            setIsPlayingStory(false);
        }
    };

    const handleSubmit = () => {
        if (isSubmitting) return;
        onSubmit();
    };

    return (
        <Card className="shadow-lg border-gray-200">
            <CardContent className="p-6 space-y-6">
                {/* Header with Progress and Story ID */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                            <span className="text-lg font-medium text-gray-900">
                                Story {storyNumber}
                            </span>
                        </div>
                        <span className="text-blue-600 font-medium">
                            {Math.round(progress)}% Complete
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-in-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Audio Control Section */}
                <div className="pt-2">
                    <Button
                        onClick={handlePlayStoryAudio}
                        className={`w-full h-16 text-lg flex items-center justify-center space-x-3 transition-colors ${isPlayingStory ? "bg-blue-400" :
                                audioError ? "bg-red-500 hover:bg-red-600" :
                                    storyAudioPlayed ? "bg-gray-400 hover:bg-gray-500 cursor-not-allowed" :
                                        "bg-blue-600 hover:bg-blue-700"
                            }`}
                        disabled={storyAudioPlayed || isPlayingStory || isSubmitting}
                    >
                        {isPlayingStory ? (
                            <>
                                <span className="animate-pulse">Playing Story Audio...</span>
                            </>
                        ) : audioError ? (
                            <>
                                <AlertCircle className="h-6 w-6" />
                                <span>Audio Not Available</span>
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
                        <p className="text-center text-sm text-blue-600 mt-2 font-medium">
                            You must listen to the complete story before answering questions
                        </p>
                    ) : (
                        <p className="text-center text-sm text-green-600 mt-2">
                            Story played successfully. You can now answer the questions.
                        </p>
                    )}
                </div>

                {/* Question Section - Disabled until story audio is played */}
                <div className={`space-y-6 ${!storyAudioPlayed ? "opacity-60" : ""}`}>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
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
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 bg-white'
                                    } ${storyAudioPlayed
                                        ? 'cursor-pointer hover:bg-gray-50'
                                        : 'cursor-not-allowed'
                                    }`}
                                onClick={() => storyAudioPlayed && !isSubmitting && onResponseChange(index)}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`w-6 h-6 flex items-center justify-center rounded-full border ${userResponse === index
                                        ? 'border-blue-500 bg-blue-500 text-white'
                                        : 'border-gray-300'
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
                        disabled={userResponse === null || !storyAudioPlayed || isSubmitting}
                        className="w-full h-12 mt-4 flex items-center justify-center space-x-2
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

                {/* Instructions */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Instructions:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-start">
                            <span className="text-blue-600 mr-2">1.</span>
                            Listen to the complete story first (required)
                        </li>
                        <li className="flex items-start">
                            <span className="text-blue-600 mr-2">2.</span>
                            Read the question above
                        </li>
                        <li className="flex items-start">
                            <span className="text-blue-600 mr-2">3.</span>
                            Select the best answer from the options provided
                        </li>
                        <li className="flex items-start">
                            <span className="text-blue-600 mr-2">4.</span>
                            Click "Submit Answer" when you're ready
                        </li>
                        {audioError && (
                            <li className="flex items-start text-red-500">
                                <span className="text-red-500 mr-2">*</span>
                                If audio is not available, select an answer to continue
                            </li>
                        )}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};

export default ComprehensionTest;