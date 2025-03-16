import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { CheckCircle, Lock, Clock, ArrowRight, PartyPopper, Loader } from "lucide-react";
import { formatDate } from './lib/utils';
import audioService from './services/audioService';

const TestTypeCard = ({ title, description, testType, phase, status, onSelect, date, isPreloading }) => {
  const { isAvailable, isCompleted } = status;

  return (
    <Card className={`transition-opacity ${isAvailable ? "" : "opacity-75"}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <div className="ml-4">
            {isCompleted ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : isAvailable ? (
              <Clock className="h-6 w-6 text-blue-500" />
            ) : (
              <Lock className="h-6 w-6 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-gray-500">
          {isCompleted ? 'Completed' : isAvailable ? 'Available Now' : 'Locked'}
          {date && ` • ${date}`}
        </p>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={!isAvailable || isPreloading}
          variant={isAvailable ? "default" : "secondary"}
          onClick={() => onSelect(phase, testType)}
        >
          {isPreloading ? (
            <span className="flex items-center">
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Preparing Audio...
            </span>
          ) : (
            <span>
              {isCompleted ? 'Completed' : isAvailable ? 'Begin Test' : 'Locked'}
            </span>
          )}
          {isAvailable && !isPreloading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
};

// Also update the Training Day cards to include loading state
const TrainingDayCard = ({ day, currentDay, onSelect, date, isPreloading }) => {
  const isCompleted = day < currentDay;
  const isAvailable = day === currentDay;

  return (
    <Card className={`transition-opacity ${isAvailable ? "" : "opacity-75"}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-gray-900">
            Training Day {day}
          </h3>
          <div>
            {isCompleted ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : isAvailable ? (
              <Clock className="h-6 w-6 text-blue-500" />
            ) : (
              <Lock className="h-6 w-6 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-gray-500">
          {isCompleted ? 'Completed' : isAvailable ? 'Available Now' : 'Locked'}
          {date && ` • ${date}`}
        </p>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={!isAvailable || isPreloading}
          variant={isAvailable ? "default" : "secondary"}
          onClick={() => onSelect('training', null, day)}
        >
          {isPreloading ? (
            <span className="flex items-center">
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Preparing Audio...
            </span>
          ) : (
            <span>
              {isCompleted ? 'Completed' : isAvailable ? 'Begin Training' : 'Locked'}
            </span>
          )}
          {isAvailable && !isPreloading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
};

const PhaseSelection = ({
  currentPhase,
  trainingDay,
  pretestDate,
  onSelectPhase,
  isDemographicsCompleted,
  completedTests = {} // Track completed test types
}) => {
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadingPhase, setPreloadingPhase] = useState(null);
  const [backgroundPreloading, setBackgroundPreloading] = useState(false);
  const [preloadingStatus, setPreloadingStatus] = useState({
    pretest: false,
    training: false,
    posttest: false
  });

  const testTypes = [
    {
      id: 'intelligibility',
      title: 'Intelligibility',
      description: 'Type the complete phrase you hear',
      type: 'intelligibility',
      order: 1
    },
    {
      id: 'effort',
      title: 'Listening Effort',
      description: 'Type the final word and rate your listening effort',
      type: 'effort',
      order: 2
    },
    {
      id: 'comprehension',
      title: 'Comprehension',
      description: 'Listen to stories and answer questions',
      type: 'comprehension',
      order: 3
    }
  ];

  // Immediately start preloading files when the component mounts
  useEffect(() => {
    // Skip if demographics isn't completed yet
    if (!isDemographicsCompleted) {
      console.log('Demographics not completed, skipping preload');
      return;
    }

    const startPreloading = async () => {
      console.log('Starting background preloading for', currentPhase);
      setBackgroundPreloading(true);

      try {
        // Determine what phase to preload based on current phase
        if (currentPhase === 'pretest') {
          // Start preloading pretest files immediately
          console.log('Beginning pretest files preload...');
          await audioService.preloadAudioFiles('pretest');
          console.log('Pretest files preloaded successfully');
          setPreloadingStatus(prev => ({ ...prev, pretest: true }));
        }
        else if (currentPhase === 'training') {
          // Start preloading training day files immediately
          console.log(`Beginning training day ${trainingDay} files preload...`);
          await audioService.preloadAudioFiles('training', trainingDay);
          console.log(`Training day ${trainingDay} files preloaded successfully`);
          setPreloadingStatus(prev => ({ ...prev, training: true }));
        }
        else if (currentPhase === 'posttest') {
          // Start preloading posttest files immediately
          console.log('Beginning posttest files preload...');
          await audioService.preloadAudioFiles('posttest');
          console.log('Posttest files preloaded successfully');
          setPreloadingStatus(prev => ({ ...prev, posttest: true }));
        }
      } catch (error) {
        console.error('Background preloading error:', error);
        // Fail silently - this is just an optimization
      } finally {
        setBackgroundPreloading(false);
      }
    };

    // Call it immediately
    startPreloading();
  }, [currentPhase, trainingDay, isDemographicsCompleted]); // Removed preloadingStatus dependency to ensure it always runs

  // Helper function to determine if a test type is available
  const getTestStatus = (phase, testType) => {
    // Special handling for demographics
    if (testType === 'demographics') {
      const demoCompleted = isDemographicsCompleted ||
        completedTests['demographics'] ||
        completedTests['pretest_demographics'];

      return {
        isAvailable: !demoCompleted,
        isCompleted: demoCompleted
      };
    }

    // For training phase
    if (phase === 'training') {
      return {
        isAvailable: currentPhase === 'training' && isDemographicsCompleted,
        isCompleted: completedTests[`${phase}_${testType}`] || false
      };
    }

    const test = testTypes.find(t => t.type === testType);
    if (!test) return { isAvailable: false, isCompleted: false };

    // Check for completed test using both formats:
    // 1. "phase_testType" (e.g., "pretest_intelligibility")
    // 2. Just "testType" (e.g., "intelligibility")
    const isTestCompleted =
      completedTests[`${phase}_${testType}`] ||
      completedTests[testType];

    // First test in a phase
    if (test.order === 1) {
      return {
        isAvailable: phase === currentPhase && isDemographicsCompleted && !isTestCompleted,
        isCompleted: isTestCompleted
      };
    }

    // Subsequent tests
    const previousTest = testTypes.find(t => t.order === test.order - 1);
    const previousTestCompleted =
      completedTests[`${phase}_${previousTest.type}`] ||
      completedTests[previousTest.type];

    return {
      isAvailable: phase === currentPhase &&
        isDemographicsCompleted &&
        previousTestCompleted &&
        !isTestCompleted,
      isCompleted: isTestCompleted
    };
  };

  // Add getExpectedDate function
  const getExpectedDate = (phase, dayNumber = null) => {
    if (!pretestDate) {
      return 'Complete pretest to unlock';
    }

    const baseDate = new Date(pretestDate);
    let daysToAdd = 0;

    switch (phase) {
      case 'pretest':
        return formatDate(pretestDate);

      case 'training':
        if (dayNumber) {
          daysToAdd = dayNumber;
        }
        break;

      case 'posttest':
        daysToAdd = 5; // Posttest starts after 4 days of training
        break;

      default:
        return 'Date not available';
    }

    const expectedDate = new Date(baseDate);
    expectedDate.setDate(expectedDate.getDate() + daysToAdd);
    return formatDate(expectedDate);
  };

  // Modified select handlers with preloading
  const handleSelectPhase = async (phase, testType, day = null) => {
    // Don't preload for demographics
    if (phase === 'demographics') {
      onSelectPhase(phase, testType);
      return;
    }

    // Check if we have already preloaded the files for this phase
    let alreadyPreloaded = false;

    if (phase === 'pretest' && preloadingStatus.pretest) {
      alreadyPreloaded = true;
    } else if (phase === 'training' && preloadingStatus.training && day === trainingDay) {
      alreadyPreloaded = true;
    } else if (phase === 'posttest' && preloadingStatus.posttest) {
      alreadyPreloaded = true;
    }

    // If already preloaded, just navigate directly
    if (alreadyPreloaded) {
      console.log('Files already preloaded, proceeding directly');
      onSelectPhase(phase, testType, day);
      return;
    }

    // Otherwise, do the preloading now
    setIsPreloading(true);
    setPreloadingPhase(testType || phase);

    try {
      if (phase === 'training') {
        await audioService.preloadAudioFiles(phase, day || trainingDay);
        setPreloadingStatus(prev => ({ ...prev, training: true }));
      } else if (phase === 'pretest') {
        await audioService.preloadAudioFiles(phase);
        setPreloadingStatus(prev => ({ ...prev, pretest: true }));
      } else if (phase === 'posttest') {
        await audioService.preloadAudioFiles(phase);
        setPreloadingStatus(prev => ({ ...prev, posttest: true }));
      }
    } catch (error) {
      console.error('Failed to preload audio files:', error);
      // Continue even if preloading fails
    } finally {
      setIsPreloading(false);
      setPreloadingPhase(null);
      onSelectPhase(phase, testType, day);
    }
  };

  const isAllPretestCompleted = testTypes.every(test =>
    completedTests[`pretest_${test.type}`] === true
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Communication Training Progress
          </h1>
          {pretestDate && (
            <p className="text-sm text-gray-500 mt-2">
              Started: {new Date(pretestDate).toLocaleDateString()}
            </p>
          )}
          {backgroundPreloading && (
            <p className="text-xs text-blue-500 mt-2 flex items-center justify-center">
              <Loader className="animate-spin h-3 w-3 mr-1" />
              Preparing audio files in background...
            </p>
          )}
        </div>

        {/* Demographics Card */}
        {currentPhase === 'pretest' && !isDemographicsCompleted && (
          <div className="mb-8">
            <TestTypeCard
              title="Demographics Questionnaire"
              description="Please complete this questionnaire before starting the pre-test"
              phase="demographics"
              testType="demographics"
              status={{
                isAvailable: true,
                isCompleted: isDemographicsCompleted
              }}
              onSelect={handleSelectPhase}
              date="Required now"
              isPreloading={false}
            />
          </div>
        )}

        {/* Pretest Section */}
        {currentPhase === 'pretest' && isDemographicsCompleted && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Pre-test Assessment</h2>
            <p>Please wear <strong>headphones</strong> during all portions of this app.</p>

            <br></br>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testTypes
                .sort((a, b) => a.order - b.order)
                .map(test => (
                  <TestTypeCard
                    key={test.id}
                    {...test}
                    phase={currentPhase}
                    status={getTestStatus(currentPhase, test.type)}
                    date={getExpectedDate(currentPhase)}
                    onSelect={handleSelectPhase}
                    isPreloading={isPreloading && preloadingPhase === test.type}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Message when all pretest tests are completed */}
        {currentPhase === 'pretest' && isDemographicsCompleted && isAllPretestCompleted && (
          <div className="mb-8 text-center p-6 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center justify-center mb-2">
              <PartyPopper className="h-8 w-8 text-yellow-500 mr-2" />
              <h2 className="text-xl font-semibold">Great job completing all tests!</h2>
              <PartyPopper className="h-8 w-8 text-yellow-500 ml-2" />
            </div>
            <p className="text-lg text-green-700">Please return tomorrow to start the training.</p>
          </div>
        )}

        {/* Training Section */}
        {currentPhase === 'training' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Training Sessions</h2>
            <p>Please wear <strong>headphones</strong> during all portions of this app.</p>

            <br></br>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((day) => (
                <TrainingDayCard
                  key={day}
                  day={day}
                  currentDay={trainingDay}
                  onSelect={handleSelectPhase}
                  date={getExpectedDate('training', day)}
                  isPreloading={isPreloading && preloadingPhase === 'training' && day === trainingDay}
                />
              ))}
            </div>
          </div>
        )}

        {/* Posttest Section */}
        {currentPhase === 'posttest' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Post-test Assessment</h2>
            <p>Please wear <strong>headphones</strong> during all portions of this app.</p>

            <br></br>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testTypes.map(test => (
                <TestTypeCard
                  key={test.id}
                  {...test}
                  phase="posttest"
                  status={getTestStatus('posttest', test.type)}
                  onSelect={handleSelectPhase}
                  isPreloading={isPreloading && preloadingPhase === test.type}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhaseSelection;