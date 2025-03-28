import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { CheckCircle, Lock, Clock, ArrowRight, PartyPopper, Loader } from "lucide-react";
import { formatDate } from './lib/utils';
import audioService from './services/audioService';

const TestTypeCard = ({ title, description, testType, phase, status, onSelect, date, isPreloading }) => {
  const { isAvailable, isCompleted } = status;

  return (
    <Card className={`transition-all ${isPreloading ? "border-blue-400 shadow-lg" : ""} ${isAvailable ? "" : "opacity-75"}`}>
      <CardHeader className={isPreloading ? "bg-blue-50" : ""}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <div className="ml-4">
            {isCompleted ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : isPreloading ? (
              <Loader className="h-6 w-6 text-blue-500 animate-spin" />
            ) : isAvailable ? (
              <Clock className="h-6 w-6 text-blue-500" />
            ) : (
              <Lock className="h-6 w-6 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isPreloading ? (
          <p className="text-sm text-blue-600 font-medium flex items-center">
            <Loader className="animate-spin h-4 w-4 mr-2" />
            Preparing audio files...
          </p>
        ) : (
          <p className="text-xs text-gray-500">
            {isCompleted ? 'Completed' : isAvailable ? 'Available Now' : 'Locked'}
            {date && ` • ${date}`}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={!isAvailable || isPreloading || isCompleted}
          variant={isCompleted ? "secondary" : (isAvailable ? (isPreloading ? "outline" : "default") : "secondary")}
          onClick={() => onSelect(phase, testType)}
        >
          {isPreloading ? (
            <span className="flex items-center">
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Preparing Audio...
            </span>
          ) : (
            <span>
              {isCompleted ? 'Completed' : isPreloading ? 'Preparing audio...' : isAvailable ? 'Begin Test' : 'Locked'}
            </span>
          )}
          {isAvailable && !isPreloading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
};

// Fixed TrainingDayCard component
const TrainingDayCard = ({ day, currentDay, onSelect, date, isPreloading, pretestDate }) => {
  // Keep the original completed check - day is less than current day
  const isCompleted = day < currentDay;

  // Helper functions inside the component
  const isDateToday = (date) => {
    if (!date) return false;
    const today = new Date();
    const checkDate = new Date(date);
    return today.toDateString() === checkDate.toDateString();
  };

  const getExpectedTrainingDate = (baseDate, dayNumber) => {
    if (!baseDate) return null;
    const date = new Date(baseDate);
    date.setDate(date.getDate() + dayNumber);
    return date;
  };

  // Date availability check only applies to the current training day
  const expectedDate = getExpectedTrainingDate(pretestDate, day);
  const isDayAvailableToday = isDateToday(expectedDate) ||
    (expectedDate && new Date() > expectedDate);

  // Available only if it's current day AND correct calendar day
  // AND it's not already completed
  const isAvailable = !isCompleted && day === currentDay && isDayAvailableToday;

  return (
    <Card className={`transition-all ${isPreloading ? "border-blue-400 shadow-lg" : ""} ${isAvailable || isCompleted ? "" : "opacity-75"}`}>
      <CardHeader className={isPreloading ? "bg-blue-50" : ""}>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-gray-900">
            Training Day {day}
          </h3>
          <div>
            {isCompleted ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : isPreloading ? (
              <Loader className="h-6 w-6 text-blue-500 animate-spin" />
            ) : isAvailable ? (
              <Clock className="h-6 w-6 text-blue-500" />
            ) : (
              <Lock className="h-6 w-6 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isPreloading ? (
          <p className="text-sm text-blue-600 font-medium flex items-center">
            <Loader className="animate-spin h-4 w-4 mr-2" />
            Preparing audio files...
          </p>
        ) : (
          <p className="text-xs text-gray-500">
            {isCompleted ? 'Completed' : isAvailable ? 'Available Now' : 'Locked'}
            {date && ` • ${date}`}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={!isAvailable || isPreloading || isCompleted}
          variant={isCompleted ? "secondary" : (isAvailable ? (isPreloading ? "outline" : "default") : "secondary")}
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
    pretest: { completed: false },
    training: { completed: false },
    posttest1: { completed: false },
    posttest2: { completed: false }
  });
  const [preloadedPhases, setPreloadedPhases] = useState({
    pretest: false,
    training: {},  // Will store days as keys
    posttest1: false,
    posttest2: false
  });

  const testTypes = [
    {
      id: 'intelligibility',
      title: 'Intelligibility',
      description: 'Type the complete phrase you hear',
      type: 'intelligibility',
      order: 1  // Make intelligibility the first (priority 1)
    },
    {
      id: 'effort',
      title: 'Listening Effort',
      description: 'Type the final word and rate your listening effort',
      type: 'effort',
      order: 2  // Keep effort as second (priority 2)
    },
    {
      id: 'comprehension',
      title: 'Comprehension',
      description: 'Listen to stories and answer questions',
      type: 'comprehension',
      order: 3  // Make comprehension last (priority 3)
    }
  ];

  // Debug log to see current phase and completed tests
  useEffect(() => {
    console.log("Current phase:", currentPhase);
    console.log("Completed tests:", completedTests);
  }, [currentPhase, completedTests]);

  // Helper function to get active test types (not completed)
  const getActiveTestTypes = (phase) => {
    return testTypes
      .filter(test => {
        // Check both formats for completed tests
        const isCompleted =
          completedTests[`${phase}_${test.type}`] ||
          completedTests[test.type];

        return !isCompleted;
      })
      .sort((a, b) => a.order - b.order) // Explicitly sort by the order property
      .map(test => test.type);
  };

  // Immediately start preloading files when the component mounts
  useEffect(() => {
    // Skip if demographics isn't completed yet
    if (!isDemographicsCompleted) {
      console.log('Demographics not completed, skipping preload');
      return;
    }

    // Check if this phase is already preloaded
    if ((currentPhase === 'pretest' && preloadedPhases.pretest) ||
      (currentPhase === 'training' && preloadedPhases.training[trainingDay]) ||
      ((currentPhase === 'posttest1' || currentPhase === 'posttest2') && preloadedPhases[currentPhase])) {
      console.log(`Phase ${currentPhase}${currentPhase === 'training' ? ` day ${trainingDay}` : ''} already preloaded`);
      return;
    }

    const startPreloading = async () => {
      console.log('Starting background preloading for', currentPhase);
      setBackgroundPreloading(true);

      try {
        // Determine what phase to preload based on current phase
        if (currentPhase === 'pretest') {
          // Get only the test types that aren't completed
          const activeTestTypes = getActiveTestTypes('pretest');

          if (activeTestTypes.length === 0) {
            console.log('All pretest types completed, skipping preload');
            setPreloadingStatus(prev => ({
              ...prev,
              pretest: { ...prev.pretest, completed: true }
            }));
            setPreloadedPhases(prev => ({ ...prev, pretest: true }));
            return;
          }

          // Start preloading pretest files immediately, only for uncompleted tests
          console.log('Beginning pretest files preload for types:', activeTestTypes);
          await audioService.preloadRandomizedAudioFiles('pretest', null, activeTestTypes);
          console.log('Pretest files preloaded successfully');
          setPreloadingStatus(prev => ({
            ...prev,
            pretest: { ...prev.pretest, completed: true }
          }));
          setPreloadedPhases(prev => ({ ...prev, pretest: true }));
        }
        else if (currentPhase === 'training') {
          // For training, we still load all files for the current day
          console.log(`Beginning training day ${trainingDay} files preload...`);
          await audioService.preloadRandomizedAudioFiles('training', trainingDay);
          console.log(`Training day ${trainingDay} files preloaded successfully`);
          setPreloadingStatus(prev => ({
            ...prev,
            training: { ...prev.training, completed: true }
          }));
          setPreloadedPhases(prev => ({
            ...prev,
            training: { ...prev.training, [trainingDay]: true }
          }));
        }
        else if (currentPhase === 'posttest1' || currentPhase === 'posttest2') {
          // Get only the test types that aren't completed
          const activeTestTypes = getActiveTestTypes(currentPhase);

          if (activeTestTypes.length === 0) {
            console.log(`All ${currentPhase} types completed, skipping preload`);
            setPreloadingStatus(prev => ({
              ...prev,
              [currentPhase]: { ...prev[currentPhase], completed: true }
            }));
            setPreloadedPhases(prev => ({ ...prev, [currentPhase]: true }));
            return;
          }

          // Start preloading posttest files immediately, only for uncompleted tests
          console.log(`Beginning ${currentPhase} files preload for types:`, activeTestTypes);
          await audioService.preloadRandomizedAudioFiles(currentPhase, null, activeTestTypes);
          console.log(`${currentPhase} files preloaded successfully`);
          setPreloadingStatus(prev => ({
            ...prev,
            [currentPhase]: { ...prev[currentPhase], completed: true }
          }));
          setPreloadedPhases(prev => ({ ...prev, [currentPhase]: true }));
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
  }, [currentPhase, trainingDay, isDemographicsCompleted, completedTests, preloadedPhases]);

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

    // For posttest phases, we need to check availability based on the calculated dates
    if (phase === 'posttest1' || phase === 'posttest2') {
      const isPosttestAvailable = phase === 'posttest1'
        ? posttestAvailability.posttest1
        : posttestAvailability.posttest2;

      // Debug log
      console.log(`${phase} availability:`, isPosttestAvailable);
      console.log(`Current phase:`, currentPhase);

      const test = testTypes.find(t => t.type === testType);
      if (!test) return { isAvailable: false, isCompleted: false };

      // Check for completed test
      const isTestCompleted = completedTests[`${phase}_${testType}`] || false;

      // First test in a phase
      if (test.order === 1) {
        return {
          // Available if it's the current phase, OR if this is posttest1 and it's available by date
          isAvailable: (currentPhase === phase || (phase === currentPhase && isPosttestAvailable)) &&
            !isTestCompleted,
          isCompleted: isTestCompleted
        };
      }

      // Subsequent tests in a posttest phase
      const previousTest = testTypes.find(t => t.order === test.order - 1);
      const previousTestCompleted = completedTests[`${phase}_${previousTest.type}`] || false;

      return {
        isAvailable: (currentPhase === phase || (phase === currentPhase && isPosttestAvailable)) &&
          previousTestCompleted &&
          !isTestCompleted,
        isCompleted: isTestCompleted
      };
    }

    // For pretest phase and other phases (original logic)
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
      return '';
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

      case 'posttest1':
        daysToAdd = 12; // Posttest1 starts after 4 days of training + 1 week
        break;

      case 'posttest2':
        daysToAdd = 35; // Posttest2 is about a month after training
        break;

      default:
        return 'Date not available';
    }

    const expectedDate = new Date(baseDate);
    expectedDate.setDate(expectedDate.getDate() + daysToAdd);
    return formatDate(expectedDate);
  };

  // Calculate posttest availability when current time is after expected date
  const calculatePosttestAvailability = (pretestDate, trainingDay) => {
    if (!pretestDate) return { posttest1: false, posttest2: false };

    const baseDate = new Date(pretestDate);
    const today = new Date();

    // Now following the correct timeline:
    // Posttest1 is 12 days after pretest (1 week after 4 days of training + 1 day)
    const posttest1Date = new Date(baseDate);
    posttest1Date.setDate(posttest1Date.getDate() + 12);

    // Posttest2 is 35 days after pretest
    const posttest2Date = new Date(baseDate);
    posttest2Date.setDate(posttest2Date.getDate() + 35);

    // For debugging
    console.log("Today:", today);
    console.log("Pretest date:", baseDate);
    console.log("Posttest1 date:", posttest1Date);
    console.log("Posttest2 date:", posttest2Date);
    console.log("Days since pretest:", Math.floor((today - baseDate) / (1000 * 60 * 60 * 24)));

    return {
      // Also consider actual phase from currentPhase as a condition
      posttest1: today >= posttest1Date || currentPhase === 'posttest1',
      posttest2: today >= posttest2Date || currentPhase === 'posttest2'
    };
  };

  // Add state to track posttest availability
  const [posttestAvailability, setPosttestAvailability] = useState({
    posttest1: false,
    posttest2: false
  });

  // Calculate posttest availability when component mounts or pretestDate changes
  useEffect(() => {
    const availability = calculatePosttestAvailability(pretestDate, trainingDay);
    console.log("Posttest availability:", availability);
    setPosttestAvailability(availability);
  }, [pretestDate, trainingDay, currentPhase]);

  // Modified select phase handlers with preloading
  const handleSelectPhase = async (phase, testType, day = null) => {
    // Don't preload for demographics
    if (phase === 'demographics') {
      onSelectPhase(phase, testType);
      return;
    }

    setIsPreloading(true);
    setPreloadingPhase(testType || (phase === 'training' ? 'training' : phase));

    try {
      if (phase === 'training') {
        // For training, only load the specific day's files
        await audioService.preloadRandomizedAudioFiles(phase, day || trainingDay);
        setPreloadedPhases(prev => ({
          ...prev,
          training: { ...prev.training, [day || trainingDay]: true }
        }));
      }
      else if ((phase === 'pretest' || phase === 'posttest1' || phase === 'posttest2') && testType) {
        // Check if we've already completed some tests
        const completedTestIds = Object.keys(completedTests)
          .filter(key => key.startsWith(`${phase}_`))
          .map(key => key.replace(`${phase}_`, ''));

        console.log(`Completed tests for ${phase}:`, completedTestIds);

        // Only load the specific test type - no background loading of others
        await audioService.preloadRandomizedAudioFiles(phase, null, [testType]);

        // Mark just this specific test as preloaded
        const updatedPreloaded = { ...preloadedPhases };
        if (!updatedPreloaded[phase]) {
          updatedPreloaded[phase] = {};
        }
        updatedPreloaded[phase][testType] = true;
        setPreloadedPhases(updatedPreloaded);

        // Skip loading other tests that might not be needed
        console.log(`Only loaded ${testType} for ${phase} - skipping others`);
      }
      else {
        // Only load the first active (not completed) test type
        const activeTestTypes = getActiveTestTypes(phase);

        if (activeTestTypes.length > 0) {
          const firstType = activeTestTypes[0];
          await audioService.preloadRandomizedAudioFiles(phase, null, [firstType]);

          // Mark just this specific test as preloaded
          const updatedPreloaded = { ...preloadedPhases };
          if (!updatedPreloaded[phase]) {
            updatedPreloaded[phase] = {};
          }
          updatedPreloaded[phase][firstType] = true;
          setPreloadedPhases(updatedPreloaded);

          // Skip background loading entirely
          console.log(`Only loaded ${firstType} for ${phase} - skipping others`);
        }
      }
    } catch (error) {
      console.error('Error during preloading:', error);
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
            <div className="bg-blue-100 border-l-4 border-blue-500 p-3 rounded-md mt-4 mb-4 shadow-md">
              <p className="text-md text-blue-700 font-medium flex items-center justify-center">
                <Loader className="animate-spin h-5 w-5 mr-3" />
                Preparing audio files... Please wait
              </p>
            </div>
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
        {isDemographicsCompleted && (currentPhase === 'pretest' || (currentPhase === 'training' && isAllPretestCompleted)) && (
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
                    phase="pretest"
                    status={getTestStatus("pretest", test.type)}
                    date={getExpectedDate("pretest")}
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
                  pretestDate={pretestDate} // Pass the pretestDate as a prop
                />
              ))}
            </div>
          </div>
        )}

        {/* Posttest1 Section - Show based on availability or current phase */}
        {(currentPhase === 'posttest1' || posttestAvailability.posttest1) && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Post-test #1 Assessment (1-week follow-up)</h2>
            <p>Please wear <strong>headphones</strong> during all portions of this app.</p>

            {/* Debug info - can be removed in production */}
            <p className="text-xs text-gray-400 mt-1">
              Current Phase: {currentPhase},
              Posttest1 Available: {posttestAvailability.posttest1 ? 'Yes' : 'No'},
              Expected Date: {getExpectedDate('posttest1')}
            </p>

            <br></br>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testTypes.map(test => (
                <TestTypeCard
                  key={test.id}
                  {...test}
                  phase="posttest1"
                  status={getTestStatus('posttest1', test.type)}
                  date={getExpectedDate('posttest1')}
                  onSelect={handleSelectPhase}
                  isPreloading={isPreloading && preloadingPhase === test.type}
                />
              ))}
            </div>
          </div>
        )}

        {/* Posttest2 Section - Show based on availability or current phase */}
        {(currentPhase === 'posttest2' || posttestAvailability.posttest2) && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Post-test #2 Assessment (1-month follow-up)</h2>
            <p>Please wear <strong>headphones</strong> during all portions of this app.</p>

            {/* Debug info - can be removed in production */}
            <p className="text-xs text-gray-400 mt-1">
              Current Phase: {currentPhase},
              Posttest2 Available: {posttestAvailability.posttest2 ? 'Yes' : 'No'},
              Expected Date: {getExpectedDate('posttest2')}
            </p>

            <br></br>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testTypes.map(test => (
                <TestTypeCard
                  key={test.id}
                  {...test}
                  phase="posttest2"
                  status={getTestStatus('posttest2', test.type)}
                  date={getExpectedDate('posttest2')}
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