// components/ComprehensionTest.jsx
import React from 'react';
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Card } from "./ui/card";

const ComprehensionTest = ({
    userResponse,
    onResponseChange,
    onSubmit,
    currentStimulus,
    totalStimuli,
    onPlayAudio,
    options = []
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
            <div className="space-y-4">
                <Label>Select your answer:</Label>
                <div className="grid gap-3">
                    {options.map((option, index) => (
                        <Card
                            key={index}
                            className={`p-4 cursor-pointer transition-colors ${userResponse === index ? 'bg-blue-50 border-blue-500' : ''
                                }`}
                            onClick={() => onResponseChange(index)}
                        >
                            <div className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="answer"
                                    checked={userResponse === index}
                                    onChange={() => onResponseChange(index)}
                                    className="form-radio"
                                />
                                <span>{option}</span>
                            </div>
                        </Card>
                    ))}
                </div>

                <Button onClick={onSubmit} className="w-full mt-4">
                    Submit Response
                </Button>
            </div>
        </div>
    );
};

export default ComprehensionTest;