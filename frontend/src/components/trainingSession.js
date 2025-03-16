import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "./ui/card";
import { Volume2, ArrowRight, Headphones } from 'lucide-react';
import IntelligibilityTest from './intelligibilityTest';
import { TRAINING_DATA, TRAINING_TEST_STIMULI } from './trainingData';
import audioService from '../services/audioService';

const TrainingSession = ({
    onComplete,
    onBack,
    trainingDay,
    trainingStimuli,
    intelligibilityStimuli
}) => {
    const [currentPhase, setCurrentPhase] = useState('instruction'); // 'instruction', 'training', 'test'
    const [currentStimulusIndex, setCurrentStimulusIndex] = useState(0);
    const [showText, setShowText] = useState(false);
    const [userResponse, setUserResponse] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [audioPlayed, setAudioPlayed] = useState(false);

    // Reset states when training day changes
    useEffect(() => {
        setCurrentPhase('instruction');
        setCurrentStimulusIndex(0);
        setShowText(true);
        setUserResponse('');
        setIsSubmitting(false);
        setAudioPlayed(false);
    }, [trainingDay]);

    const handlePlayAudio = async () => {
        try {
            await audioService.playTrainingAudio(
                trainingDay,
                currentStimulusIndex + 1
            );
            setAudioPlayed(true);

            return true;
        } catch (error) {
            console.error('Error playing audio:', error);
            alert('Error playing audio. Please try again.');
            return false;
        }
    };

    const handleNext = () => {
        // If we're still in training phase
        if (currentPhase === 'training') {
            // Reset for next stimulus
            setAudioPlayed(false);
            setShowText(true);

            // Move to next stimulus or to test phase
            if (currentStimulusIndex < trainingStimuli.length - 1) {
                setCurrentStimulusIndex(prevIndex => prevIndex + 1);
            } else {
                // Move to test phase after completing all training stimuli
                setCurrentPhase('test');
                setCurrentStimulusIndex(0);
            }
        }
    };

    const handleStartTraining = async () => {
        // Try to preload audio files before starting training
        try {
            await audioService.preloadAudioFiles('training', trainingDay);
        } catch (error) {
            console.error('Failed to preload training audio:', error);
            // Continue even if preloading fails
        }

        setCurrentPhase('training');
    };

    const handleTestSubmit = async () => {
        if (!userResponse.trim()) {
            alert('Please enter the phrase you heard.');
            return;
        }

        try {
            setIsSubmitting(true);
            const token = localStorage.getItem('token');
            const stimulus = intelligibilityStimuli[currentStimulusIndex];

            await fetch('http://localhost:3000/api/response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    phase: 'training',
                    currentTestType: 'intelligibility',
                    stimulusId: `training_day${trainingDay}_intel_${currentStimulusIndex + 1}`,
                    response: userResponse,
                    trainingDay: trainingDay
                }),
            });

            // Move to next test stimulus or complete
            if (currentStimulusIndex < intelligibilityStimuli.length - 1) {
                setCurrentStimulusIndex(prevIndex => prevIndex + 1);
                setUserResponse('');
                setAudioPlayed(false);
            } else {
                // Complete training day
                onComplete(trainingDay);
            }
        } catch (error) {
            console.error('Error submitting response:', error);
            alert('Failed to submit response. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePlayTestAudio = async () => {
        try {
            // The "test" type of training uses a different endpoint format
            const stimulusIndex = currentStimulusIndex + 1;

            await audioService.playTrainingAudio(
                trainingDay,
                stimulusIndex
            );

            setAudioPlayed(true);
            return true;
        } catch (error) {
            console.error('Error playing audio:', error);
            alert('Error playing audio. Please try again.');
            return false;
        }
    };

    const renderInstructionPhase = () => (
        <Card className="shadow-lg">
            <CardHeader className="bg-blue-600 text-white">
                <h2 className="text-xl font-semibold">Training Day {trainingDay}</h2>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Instructions</h3>
                    <p>In this training session, you will:</p>
                    <ol className="list-decimal ml-5 space-y-2">
                        <li>Listen to audio clips and see the text that matches what is being said</li>
                        <li>After completing all training clips, you will be tested on your ability to understand similar speech</li>
                    </ol>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center space-x-2">
                        <Headphones className="h-5 w-5 text-blue-500" />
                        <p className="text-blue-700">Please wear headphones during this training session.</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="border-t border-gray-100 pt-4">
                <Button
                    onClick={handleStartTraining}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                >
                    Start Training
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );

    const renderTrainingPhase = () => {
        const currentStimulus = trainingStimuli[currentStimulusIndex];
        const progress = ((currentStimulusIndex + 1) / trainingStimuli.length) * 100;

        return (
            <Card className="shadow-lg">
                <CardHeader className="bg-blue-600 text-white">
                    <h2 className="text-xl font-semibold">Training Day {trainingDay}</h2>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700">
                                Stimulus {currentStimulusIndex + 1} of {trainingStimuli.length}
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

                    <div className="pt-4">
                        <Button
                            onClick={handlePlayAudio}
                            disabled={audioPlayed}
                            className={`w-full h-16 text-lg flex items-center justify-center space-x-3 transition-colors ${audioPlayed ? "bg-gray-400 hover:bg-gray-500" : "bg-blue-600 hover:bg-blue-700"
                                }`}
                        >
                            <Volume2 className="h-6 w-6" />
                            <span>{audioPlayed ? "Audio Playing..." : "Play Audio"}</span>
                        </Button>
                    </div>

                    {showText && (
                        <div className="mt-6 p-6 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-lg text-center font-medium text-gray-800">
                                "{currentStimulus.text}"
                            </p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="border-t border-gray-100 pt-4">
                    <Button
                        onClick={handleNext}
                        disabled={!audioPlayed}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                    >
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        );
    };

    const renderTestPhase = () => (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-center">Day {trainingDay} Test</h2>
            <IntelligibilityTest
                userResponse={userResponse}
                onResponseChange={setUserResponse}
                onSubmit={handleTestSubmit}
                currentStimulus={currentStimulusIndex}
                totalStimuli={intelligibilityStimuli.length}
                onPlayAudio={handlePlayTestAudio}
                isSubmitting={isSubmitting}
            />
        </div>
    );

    // Get training data based on day
    const getTrainingData = () => {
        switch (trainingDay) {
            case 1:
                return {
                    stimuli: TRAINING_DATA.day1,
                    testStimuli: TRAINING_TEST_STIMULI.day1
                };
            case 2:
                return {
                    stimuli: TRAINING_DATA.day2,
                    testStimuli: TRAINING_TEST_STIMULI.day2
                };
            case 3:
                return {
                    stimuli: TRAINING_DATA.day3,
                    testStimuli: TRAINING_TEST_STIMULI.day3
                };
            case 4:
                return {
                    stimuli: TRAINING_DATA.day4,
                    testStimuli: TRAINING_TEST_STIMULI.day4
                };
            default:
                return {
                    stimuli: TRAINING_DATA.day1,
                    testStimuli: TRAINING_TEST_STIMULI.day1
                };
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="mb-4 text-gray-600 hover:text-gray-800"
                >
                    ← Back to Training Selection
                </Button>

                {currentPhase === 'instruction' && renderInstructionPhase()}
                {currentPhase === 'training' && renderTrainingPhase()}
                {currentPhase === 'test' && renderTestPhase()}
            </div>
        </div>
    );
};

export default TrainingSession;