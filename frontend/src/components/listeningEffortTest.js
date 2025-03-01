import React from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent } from "./ui/card";
import { Volume2, Send, Activity } from 'lucide-react';

const ListeningEffortTest = ({
    userResponse,
    rating,
    onResponseChange,
    onRatingChange,
    onSubmit,
    currentStimulus,
    totalStimuli,
    onPlayAudio
}) => {
    const progress = ((currentStimulus + 1) / totalStimuli) * 100;

    const getRatingLabel = (value) => {
        if (value <= 20) return 'Very Easy';
        if (value <= 40) return 'Easy';
        if (value <= 60) return 'Moderate';
        if (value <= 80) return 'Hard';
        return 'Very Hard';
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
                        onClick={onPlayAudio}
                        className="w-full h-16 text-lg flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                        <Volume2 className="h-6 w-6" />
                        <span>Play Audio Stimulus</span>
                    </Button>
                    <p className="text-center text-sm text-gray-600 mt-2">
                        Click to play the audio clip
                    </p>
                </div>

                {/* Response Input Section */}
                <div className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label
                            htmlFor="finalWordInput"
                            className="text-sm font-medium text-gray-700"
                        >
                            Type the <strong>final word</strong>you heard:
                        </Label>
                        <Input
                            id="finalWordInput"
                            type="text"
                            value={userResponse}
                            onChange={(e) => onResponseChange(e.target.value)}
                            placeholder="Enter the final word..."
                            className="w-full p-3 text-lg border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Effort Rating Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-gray-700">
                                How easy is this speech to understand?
                            </Label>
                            <span className="text-sm font-medium text-blue-600">
                                {rating || 0} - {getRatingLabel(rating || 0)}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <div className="relative">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={rating || 0}
                                    onChange={(e) => onRatingChange(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    style={{
                                        background: `linear-gradient(to right, #2563eb ${rating}%, #e5e7eb ${rating}%)`
                                    }}
                                />
                                <div className="flex justify-between text-xs text-gray-600 px-1 mt-1">
                                    <span>No effort</span>
                                    <span>Maximum effort</span>
                                </div>
                            </div>

                            {/* Visual indicator markers */}
                            <div className="flex justify-between px-1">
                                {[0, 25, 50, 75, 100].map((mark) => (
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
                        disabled={!userResponse.trim() || rating === null}
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
                        <li>1. Click "Play Audio" to hear the stimulus</li>
                        <li>2. Type the final word you heard</li>
                        <li>3. Rate how much effort it took to understand the audio</li>
                        <li>4. Click "Submit Response" when you're ready</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};

export default ListeningEffortTest;