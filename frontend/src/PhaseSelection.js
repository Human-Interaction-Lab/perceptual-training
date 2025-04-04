import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { CheckCircle, Lock, Clock, ArrowRight, PartyPopper, Loader } from "lucide-react";
import { formatDate } from './lib/utils';
import audioService from './services/audioService';
import config from './config';
// Make audioService available globally for components that need it
window.audioService = audioService;

const TestTypeCard = ({ title, description, testType, phase, status, onSelect, date }) => {
  const { isAvailable, isCompleted } = status;
  const [isLoading, setIsLoading] = useState(false);

  // Handle the loading and selection with improved preloading
  const handleClick = async () => {
    // Only proceed if the card is available and not completed
    if (!isAvailable || isCompleted || isLoading) return;

    // Set loading state
    setIsLoading(true);
    
    // CRITICAL CHANGE: No preloading during test type selection
    // First check if this is special handling for demographics
    if (phase === 'demographics') {
      console.log('Demographics selected - no preloading needed');
      
      // Short wait for visual feedback
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Proceed immediately to demographics
      setIsLoading(false);
      onSelect(phase, testType);
      return;
    }
    
    // For all other phases, show brief loading spinner but don't actually preload
    // This change fundamentally separates preloading from navigation
    console.log(`Selected ${phase} ${testType} - proceeding without preloading`);
    
    // Brief spinner for better UX, but not doing actual preloading
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Proceed with navigation without any preloading promises
    setIsLoading(false);
    onSelect(phase, testType);
  };

  return (
    <Card className={`transition-all ${isLoading ? "border-blue-400 shadow-lg" : ""} ${isAvailable ? "" : "opacity-75"}`}>
      <CardHeader className={isLoading ? "bg-blue-50" : ""}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <div className="ml-4">
            {isCompleted ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : isLoading ? (
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
        {isLoading ? (
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
          disabled={!isAvailable || isLoading || isCompleted}
          variant={isCompleted ? "secondary" : (isAvailable ? (isLoading ? "outline" : "default") : "secondary")}
          onClick={handleClick}
        >
          {isLoading ? (
            <span className="flex items-center">
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Preparing Audio... ({Math.ceil(6 - (Date.now() % 6000) / 1000)}s)
            </span>
          ) : (
            <span>
              {isCompleted ? 'Completed' : isAvailable ? 'Begin Test' : 'Locked'}
            </span>
          )}
          {isAvailable && !isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
};

// TrainingDayCard component that mirrors the testing days
const TrainingDayCard = ({ day, currentDay, onSelect, date, pretestDate }) => {
  // Keep the original completed check - day is less than current day
  const isCompleted = day < currentDay;
  const [isLoading, setIsLoading] = useState(false);

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

  // Handle the loading and selection for training days
  const handleClick = () => {
    // Only proceed if the card is available and not completed
    if (!isAvailable || isCompleted || isLoading) return;

    // Set loading state
    setIsLoading(true);

    // No actual preloading - just a brief loading indicator
    // After 2 seconds, trigger the selection and reset loading state
    setTimeout(() => {
      setIsLoading(false);
      onSelect('training', null, day);
    }, 2000);
  };

  return (
    <Card className={`transition-all ${isLoading ? "border-blue-400 shadow-lg" : ""} ${isAvailable || isCompleted ? "" : "opacity-75"}`}>
      <CardHeader className={isLoading ? "bg-blue-50" : ""}>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-gray-900">
            Training Day {day}
          </h3>
          <div>
            {isCompleted ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : isLoading ? (
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
        {isLoading ? (
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
          disabled={!isAvailable || isLoading || isCompleted}
          variant={isCompleted ? "secondary" : (isAvailable ? (isLoading ? "outline" : "default") : "secondary")}
          onClick={handleClick}
        >
          {isLoading ? (
            <span className="flex items-center">
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Preparing Audio... ({Math.ceil(6 - (Date.now() % 6000) / 1000)}s)
            </span>
          ) : (
            <span>
              {isCompleted ? 'Completed' : isAvailable ? 'Begin Training' : 'Locked'}
            </span>
          )}
          {isAvailable && !isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
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
  //const [backgroundPreloading, setBackgroundPreloading] = useState(false);
  //const [preloadingStatus, setPreloadingStatus] = useState({
  //  pretest: { completed: false },
  //  training: { completed: false },
  //  posttest1: { completed: false },
  //  posttest2: { completed: false }
  //});
  const [preloadedPhases, setPreloadedPhases] = useState({
    pretest: false,
    training: {},  // Will store days as keys
    posttest1: false,
    posttest2: false
  });

  const [showLoadingIndicator, setShowLoadingIndicator] = useState({
    pretest: false,
    posttest1: false,
    posttest2: false,
    training: false
  });

  // Add state to track posttest availability
  const [posttestAvailability, setPosttestAvailability] = useState({
    posttest1: false,
    posttest2: false
  });
  
  // Add state to track if we're in the fresh demographics completion state
  const [isPostDemographics, setIsPostDemographics] = useState(false);

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
    
    // Check for fresh demographics completion
    if (completedTests.demographics === true && 
        !isPostDemographics && 
        currentPhase === 'pretest') {
      console.log("Fresh demographics completion detected - preparing special handling");
      setIsPostDemographics(true);
      
      // Schedule reset of this flag after a reasonable time
      setTimeout(() => {
        setIsPostDemographics(false);
        console.log("Post-demographics special handling period ended");
      }, 60000); // Reset after 1 minute
    }
  }, [currentPhase, completedTests, isPostDemographics]);

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
    //if (!isDemographicsCompleted) {
    //  console.log('Demographics not completed, skipping preload');
    //  return;
    //}

    // Function to start preloading for a specific phase
    const startPreloading = async (phase, day = null) => {
      // Set loading indicator for 6 seconds
      const updatedIndicators = { ...showLoadingIndicator };
      updatedIndicators[phase] = true;
      setShowLoadingIndicator(updatedIndicators);

      console.log(`Starting preload for ${phase}${day ? ` day ${day}` : ''}`);

      // Start background preloading without waiting for it to finish
      let activeTestTypes = [];

      if (phase !== 'training') {
        // Get test types that aren't completed yet
        activeTestTypes = getActiveTestTypes(phase);

        if (activeTestTypes.length > 0) {
          // Start preloading in the background - don't await
          audioService.preloadRandomizedAudioFiles(phase, null, activeTestTypes)
            .then(() => console.log(`${phase} files preloaded successfully`))
            .catch(error => console.error(`Error preloading ${phase} files:`, error));
        }
      } else if (phase === 'training' && day) {
        // For training, preload the specific day
        audioService.preloadRandomizedAudioFiles('training', day)
          .then(() => console.log(`Training day ${day} files preloaded successfully`))
          .catch(error => console.error(`Error preloading training day ${day} files:`, error));
      }

      // Hide loading indicator after 6 seconds regardless of preload status
      setTimeout(() => {
        const updatedIndicators = { ...showLoadingIndicator };
        updatedIndicators[phase] = false;
        setShowLoadingIndicator(updatedIndicators);
        console.log(`Hiding loading indicator for ${phase}`);
      }, 6000); // 6 seconds
    };

    // Check current phase and start preloading accordingly
    if (currentPhase === 'pretest') {
      startPreloading('pretest');
    } else if (currentPhase === 'training') {
      startPreloading('training', trainingDay);
    } else if (currentPhase === 'posttest1') {
      startPreloading('posttest1');
    } else if (currentPhase === 'posttest2') {
      startPreloading('posttest2');
    }

    // When posttest1 is available but not current phase, preload in background
    if (posttestAvailability.posttest1 && currentPhase !== 'posttest1') {
      startPreloading('posttest1');
    }

    // When posttest2 is available but not current phase, preload in background
    if (posttestAvailability.posttest2 && currentPhase !== 'posttest2') {
      startPreloading('posttest2');
    }

  }, [currentPhase, trainingDay, isDemographicsCompleted, posttestAvailability]);


  // Helper function to determine if a test type is available
  const getTestStatus = (phase, testType) => {
    // Check if demographics is completed from either state or completedTests map
    const demoCompleted = isDemographicsCompleted ||
      completedTests['demographics'] ||
      completedTests['pretest_demographics'];

    // Special handling for demographics
    if (testType === 'demographics') {
      return {
        isAvailable: !demoCompleted,
        isCompleted: demoCompleted
      };
    }

    // For training phase
    if (phase === 'training') {
      return {
        isAvailable: currentPhase === 'training' && demoCompleted,
        isCompleted: completedTests[`${phase}_${testType}`] || false
      };
    }

    // For posttest phases, we need to check availability based on the calculated dates
    if (phase === 'posttest1' || phase === 'posttest2') {
      const isPosttestAvailable = phase === 'posttest1'
        ? posttestAvailability.posttest1
        : posttestAvailability.posttest2;

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

    // For pretest phase specifically
    if (phase === 'pretest') {
      const test = testTypes.find(t => t.type === testType);
      if (!test) return { isAvailable: false, isCompleted: false };

      // Check for completed test using both formats
      const isTestCompleted =
        completedTests[`${phase}_${testType}`] ||
        completedTests[testType];

      // First test in pretest phase (after demographics)
      if (test.order === 1) {
        return {
          // Only available if demographics is completed and we're in pretest phase
          isAvailable: (currentPhase === 'pretest' || currentPhase === 'training') && 
                      demoCompleted && 
                      !isTestCompleted,
          isCompleted: isTestCompleted
        };
      }

      // Subsequent tests in pretest phase
      const previousTest = testTypes.find(t => t.order === test.order - 1);
      const previousTestCompleted =
        completedTests[`${phase}_${previousTest.type}`] ||
        completedTests[previousTest.type];

      return {
        isAvailable: (currentPhase === 'pretest' || currentPhase === 'training') &&
          demoCompleted &&
          previousTestCompleted &&
          !isTestCompleted,
        isCompleted: isTestCompleted
      };
    }

    // For other phases
    const test = testTypes.find(t => t.type === testType);
    if (!test) return { isAvailable: false, isCompleted: false };

    // Check for completed test
    const isTestCompleted =
      completedTests[`${phase}_${testType}`] ||
      completedTests[testType];

    // First test in other phases
    if (test.order === 1) {
      return {
        isAvailable: phase === currentPhase && 
                     demoCompleted && 
                     !isTestCompleted,
        isCompleted: isTestCompleted
      };
    }

    // Subsequent tests in other phases
    const previousTest = testTypes.find(t => t.order === test.order - 1);
    const previousTestCompleted =
      completedTests[`${phase}_${previousTest.type}`] ||
      completedTests[previousTest.type];

    return {
      isAvailable: phase === currentPhase &&
        demoCompleted &&
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

  // Calculate posttest availability when component mounts or pretestDate changes
  useEffect(() => {
    const availability = calculatePosttestAvailability(pretestDate, trainingDay);
    console.log("Posttest availability:", availability);
    setPosttestAvailability(availability);
  }, [pretestDate, trainingDay, currentPhase]);

  // Completely redesigned phase selection without preloading during navigation
  const handleSelectPhase = (phase, testType, day = null) => {
    // Fundamental change: No preloading at all during phase/test selection
    // This completely separates navigation from audio file preloading
    
    console.log(`Phase selection: ${phase} ${testType || ''}, day ${day || 'n/a'}`);
    
    // CRITICAL CHANGE: Navigate immediately WITHOUT any preloading
    console.log(`Immediately navigating to ${phase} ${testType || ''} without any preloading`);
    
    // Reset preloading indicators (used for background preloading)
    setIsPreloading(false);
    setPreloadingPhase(null);
    
    // Just navigate directly
    onSelectPhase(phase, testType, day);
    
    // Start a background preload thread ONLY for analytics, not blocking navigation
    setTimeout(() => {
      try {
        // Only log this for debugging
        console.log(`Optional background stats for ${phase} ${testType || ''}`);
      } catch (error) {
        // Ignore any errors in the background thread
      }
    }, 1000);
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
        </div>

        {/* Pretest Section with Demographics Card always visible */}
        {currentPhase === 'pretest' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Pre-test Assessment</h2>
            <p className="mb-4">Please wear <strong>headphones</strong> during all portions of this app.</p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Demographics Card as first item */}
              <TestTypeCard
                title="Demographics Questionnaire"
                description="Please complete this first"
                phase="demographics"
                testType="demographics"
                status={{
                  isAvailable: !isDemographicsCompleted,
                  isCompleted: isDemographicsCompleted || Object.keys(completedTests).some(key => key === 'demographics' || key === 'pretest_demographics')
                }}
                onSelect={handleSelectPhase}
                date="Required first"
                isPreloading={false}
              />
              
              {/* All test type cards */}
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
            <h2 className="text-xl font-semibold mb-4">Posttest #1 Assessment (1-week follow-up)</h2>
            <p>Please wear <strong>headphones</strong> during all portions of this app.</p>

            {/* Debug info - can be removed in production */}
            <p className="text-xs text-gray-400 mt-1">
              {/* Current Phase: {currentPhase},*/}
              {/* Posttest1 Available: {posttestAvailability.posttest1 ? 'Yes' : 'No'},*/}
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
                />
              ))}
            </div>
          </div>
        )}

        {/* Posttest2 Section - Show based on availability or current phase */}
        {(currentPhase === 'posttest2' || posttestAvailability.posttest2) && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Posttest #2 Assessment (1-month follow-up)</h2>
            <p>Please wear <strong>headphones</strong> during all portions of this app.</p>

            {/* Debug info - can be removed in production */}
            <p className="text-xs text-gray-400 mt-1">
              {/* Current Phase: {currentPhase},*/}
              {/* Posttest2 Available: {posttestAvailability.posttest2 ? 'Yes' : 'No'},*/}
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