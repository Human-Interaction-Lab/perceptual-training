// components/ListeningEffortTest.jsx
import React from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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
    return (
        <div className="space-y-6">
            {/* Progress Indicator */}
            <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Progress: {currentStimulus + 1} of {totalStimuli}</span>
                <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${((currentStimulus + 1) / totalStimuli) * 100}%` }}
                    />
                </div>
            </div>

            {/* Audio Control */}
            <Button
                onClick={onPlayAudio}
                className="w-full flex items-center justify-center space-x-2"
            >
                <span>Play Audio</span>
            </Button>

            {/* Response Input */}
            <div className="space-y-3">
                <Label htmlFor="finalWordInput">
                    Type the final word you heard:
                </Label>
                <Input
                    id="finalWordInput"
                    type="text"
                    value={userResponse}
                    onChange={(e) => onResponseChange(e.target.value)}
                    placeholder="Enter the final word..."
                />

                <div className="mt-4">
                    <Label>Rate your listening effort (0-100):</Label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={rating || 0}
                        onChange={(e) => onRatingChange(parseInt(e.target.value))}
                        className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>No effort</span>
                        <span>Maximum effort</span>
                    </div>
                    <div className="text-center mt-2">
                        Selected value: {rating || 0}
                    </div>
                </div>

                <Button onClick={onSubmit} className="w-full">
                    Submit Response
                </Button>
            </div>
        </div>
    );
};

export default ListeningEffortTest;