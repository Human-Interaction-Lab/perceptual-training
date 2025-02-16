// components/IntelligibilityTest.jsx
import React from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const IntelligibilityTest = ({
    userResponse,
    onResponseChange,
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
                <Label htmlFor="phraseInput">
                    Type the entire phrase you heard:
                </Label>
                <Input
                    id="phraseInput"
                    type="text"
                    value={userResponse}
                    onChange={(e) => onResponseChange(e.target.value)}
                    placeholder="Enter the phrase..."
                />
                <Button
                    onClick={onSubmit}
                    className="w-full"
                >
                    Submit Response
                </Button>
            </div>
        </div>
    );
};

export default IntelligibilityTest;