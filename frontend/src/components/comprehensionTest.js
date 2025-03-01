import React, { useState } from 'react';
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
    // Add state to track if audio has been played
    const [audioPlayed, setAudioPlayed] = useState(false);

    const optionLabels = ['A', 'B', 'C', 'D', 'E'];
    const progress = ((currentStimulus + 1) / totalStimuli) * 100;

    // Modified play audio handler that updates the state
    const handlePlayAudio = async () => {
        await onPlayAudio();
        setAudioPlayed(true);
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
                                Story {storyId.replace('Comp_', '')}
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
                        onClick={handlePlayAudio}
                        className={`w-full h-16 text-lg flex items-center justify-center space-x-3 transition-colors ${audioPlayed
                                ? "bg-gray-400 hover:bg-gray-500 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700"
                            }`}
                        disabled={audioPlayed || isSubmitting}
                    >
                        <Volume2 className="h-6 w-6" />
                        <span>{audioPlayed ? "Story Audio Played" : "Play Story Audio"}</span>
                    </Button>

                    {!audioPlayed ? (
                        <p className="text-center text-sm text-blue-600 mt-2 font-medium">
                            You must listen to the story before answering questions
                        </p>
                    ) : (
                        <p className="text-center text-sm text-green-600 mt-2">
                            Story played successfully. You can now answer the question.
                        </p>
                    )}
                </div>

                {/* Question Section - Disabled until audio is played */}
                <div className={`space-y-6 ${!audioPlayed ? "opacity-60" : ""}`}>
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
                                    } ${audioPlayed
                                        ? 'cursor-pointer hover:bg-gray-50'
                                        : 'cursor-not-allowed'
                                    }`}
                                onClick={() => audioPlayed && !isSubmitting && onResponseChange(index)}
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
                        disabled={userResponse === null || !audioPlayed || isSubmitting}
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
                            Listen to the story segment carefully (required)
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
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};

export default ComprehensionTest;