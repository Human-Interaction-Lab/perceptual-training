import React from 'react';
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Card } from "./ui/card";

const ComprehensionTest = ({
    question,
    options,
    userResponse,
    onResponseChange,
    onSubmit,
    currentStimulus,
    totalStimuli,
    onPlayAudio,
    storyId
}) => {
    const optionLabels = ['A', 'B', 'C', 'D', 'E'];

    return (
        <div className="space-y-6">
            {/* Progress and Story ID */}
            <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Progress: {currentStimulus + 1} of {totalStimuli}</span>
                <span className="text-blue-600 font-medium">Story {storyId}</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStimulus + 1) / totalStimuli) * 100}%` }}
                />
            </div>

            {/* Audio Control */}
            <Button
                onClick={onPlayAudio}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2 py-4"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Play Story Audio</span>
            </Button>

            {/* Question */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <Label className="block text-lg font-medium mb-4">
                    {question}
                </Label>

                {/* Options */}
                <div className="grid gap-3">
                    {options.map((option, index) => (
                        <Card
                            key={index}
                            className={`p-4 cursor-pointer transition-all duration-200 hover:border-blue-400 ${userResponse === index
                                ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                                : 'hover:bg-gray-50'
                                }`}
                            onClick={() => onResponseChange(index)}
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
                        </Card>
                    ))}
                </div>

                <Button
                    onClick={onSubmit}
                    className="w-full mt-6"
                    disabled={userResponse === null}
                >
                    Submit Response
                </Button>
            </div>
        </div>
    );
};

export default ComprehensionTest;