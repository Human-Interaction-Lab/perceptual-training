import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { CheckCircle, Lock, Clock, ArrowRight, PartyPopper, Loader, Volume2, VolumeX } from "lucide-react";
import { formatDate, getCurrentDateInEastern, toEasternTime, isToday, isSameDay } from './lib/utils';
import audioService from './services/audioService';
import config from './config';
// Make audioService available globally for components that need it
window.audioService = audioService;

const TestTypeCard = ({ title, description, testType, phase, status, onSelect, date }) => {
  const { isAvailable, isCompleted, hasProgress } = status;
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
    <Card className={`transition-all border border-gray-300 shadow-lg ${isLoading ? "border-[#406368]" : ""} ${isAvailable ? "" : "opacity-75"}`}>
      <CardHeader className={isLoading ? "bg-[#f3ecda]" : ""}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#406368]">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <div className="ml-4">
            {isCompleted ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : isLoading ? (
              <Loader className="h-6 w-6 text-[#406368] animate-spin" />
            ) : hasProgress ? (
              <div className="relative">
                <Clock className="h-6 w-6 text-yellow-500" />
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
              </div>
            ) : isAvailable ? (
              <Clock className="h-6 w-6 text-[#406368]" />
            ) : (
              <Lock className="h-6 w-6 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-[#406368] font-medium flex items-center">
            <Loader className="animate-spin h-4 w-4 mr-2" />
            Preparing audio files...
          </p>
        ) : (
          <p className="text-xs text-gray-500">
            {isCompleted ? 'Completed' :
              hasProgress ? 'In Progress - Continue' :
                isAvailable ? 'Available Now' : 'Locked'}
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
              {isCompleted ? 'Completed' :
                hasProgress ? 'Continue Activity' :
                  isAvailable ? 'Begin Activity' : 'Locked'}
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

  // Check for in-progress data
  const hasProgress = (() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return false;

    const progressKey = `progress_${userId}_training_day${day}`;
    return localStorage.getItem(progressKey) !== null;
  })();

  // Helper functions inside the component
  const isDateToday = (date) => {
    if (!date) return false;
    return isToday(date);
  };

  const getExpectedTrainingDate = (baseDate, dayNumber) => {
    if (!baseDate) return null;
    const date = toEasternTime(baseDate);
    date.setDate(date.getDate() + dayNumber);
    return date;
  };

  // Date availability check only applies to the current training day
  const expectedDate = getExpectedTrainingDate(pretestDate, day);
  const isDayAvailableToday = isDateToday(expectedDate) ||
    (expectedDate && getCurrentDateInEastern() > expectedDate);

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
    <Card className={`transition-all shadow-lg border border-gray-300 ${isLoading ? "border-[#406368]" : ""} ${isAvailable || isCompleted ? "" : "opacity-75"}`}>
      <CardHeader className={isLoading ? "bg-[#f3ecda]" : ""}>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-[#406368]">
            Training Day {day}
          </h3>
          <div>
            {isCompleted ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : isLoading ? (
              <Loader className="h-6 w-6 text-[#406368] animate-spin" />
            ) : isAvailable ? (
              <Clock className="h-6 w-6 text-[#406368]" />
            ) : (
              <Lock className="h-6 w-6 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-[#406368] font-medium flex items-center">
            <Loader className="animate-spin h-4 w-4 mr-2" />
            Preparing audio files...
          </p>
        ) : (
          <p className="text-xs text-gray-500">
            {isCompleted ? 'Completed' :
              hasProgress ? 'In Progress - Continue' :
                isAvailable ? 'Available Now' : 'Locked'}
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
              Preparing Audio... ({Math.ceil(2 - (Date.now() % 2000) / 1000)}s)
            </span>
          ) : (
            <span>
              {isCompleted ? 'Completed' :
                hasProgress ? 'Continue Training' :
                  isAvailable ? 'Begin Training' : 'Locked'}
            </span>
          )}
          {isAvailable && !isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card >
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

  // Add state for practice audio playback
  const [isPlayingPractice, setIsPlayingPractice] = useState(false);
  const [practiceAudioError, setPracticeAudioError] = useState(false);

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
    // Remove the currentPhase === 'pretest' condition since demographics is totally separate
    if (completedTests.demographics === true && !isPostDemographics) {
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

  // CRITICAL CHANGE: Completely DISABLE all automatic preloading
  // This is to prevent any preloading from happening automatically when arriving at the selection page
  useEffect(() => {
    // Disable preloading entirely - files will be loaded only when needed
    console.log("Preloading completely disabled in phase selection");

    // Instead, just track analytics for debugging purposes
    if (currentPhase) {
      console.log(`Current phase is ${currentPhase} - NO automatic preloading`);
    }

    // The app will now load audio files one at a time when they are needed
    // This prevents the app from trying to preload everything at once

  }, [currentPhase]);


  // Helper function to check if a test has saved progress
  const hasInProgressData = (phase, testType) => {
    const userId = localStorage.getItem('userId');
    if (!userId) return false;

    const progressKey = `progress_${userId}_${phase}_${testType}`;
    const savedProgress = localStorage.getItem(progressKey);

    return savedProgress !== null;
  };

  // Helper function to determine if a test type is available
  const getTestStatus = (phase, testType) => {
    // Check if demographics is completed from either state or completedTests map
    const demoCompleted = isDemographicsCompleted ||
      completedTests['demographics'] ||
      completedTests['pretest_demographics'];

    // Special handling for demographics - completely separate phase
    if (testType === 'demographics') {
      // Demographics card is ALWAYS available if not completed
      // This prevents it from being blocked by other conditions
      return {
        isAvailable: !demoCompleted,
        isCompleted: demoCompleted,
        hasProgress: false // Demographics doesn't support resuming
      };
    }

    // For training phase
    if (phase === 'training') {
      const inProgress = hasInProgressData(phase, testType);
      return {
        isAvailable: currentPhase === 'training' && demoCompleted,
        isCompleted: completedTests[`${phase}_${testType}`] || false,
        hasProgress: inProgress
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
        const inProgress = hasInProgressData(phase, test.type);
        return {
          // Available only if the phase matches current phase AND the posttest is available by date
          isAvailable: (currentPhase === phase && isPosttestAvailable) && !isTestCompleted,
          isCompleted: isTestCompleted,
          hasProgress: inProgress
        };
      }

      // Subsequent tests in a posttest phase
      const previousTest = testTypes.find(t => t.order === test.order - 1);
      const previousTestCompleted = completedTests[`${phase}_${previousTest.type}`] || false;
      const inProgress = hasInProgressData(phase, test.type);

      return {
        isAvailable: (currentPhase === phase && isPosttestAvailable) &&
          previousTestCompleted &&
          !isTestCompleted,
        isCompleted: isTestCompleted,
        hasProgress: inProgress
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
        const inProgress = hasInProgressData(phase, test.type);
        return {
          // Only available if demographics is completed and we're in pretest phase
          isAvailable: (currentPhase === 'pretest' || currentPhase === 'training') &&
            demoCompleted &&
            !isTestCompleted,
          isCompleted: isTestCompleted,
          hasProgress: inProgress
        };
      }

      // Subsequent tests in pretest phase
      const previousTest = testTypes.find(t => t.order === test.order - 1);
      const previousTestCompleted =
        completedTests[`${phase}_${previousTest.type}`] ||
        completedTests[previousTest.type];
      const inProgress = hasInProgressData(phase, test.type);

      return {
        isAvailable: (currentPhase === 'pretest' || currentPhase === 'training') &&
          demoCompleted &&
          previousTestCompleted &&
          !isTestCompleted,
        isCompleted: isTestCompleted,
        hasProgress: inProgress
      };
    }

    // For other phases
    const test = testTypes.find(t => t.type === testType);
    if (!test) return { isAvailable: false, isCompleted: false, hasProgress: false };

    // Check for completed test
    const isTestCompleted =
      completedTests[`${phase}_${testType}`] ||
      completedTests[testType];

    // Check if there's saved progress
    const inProgress = hasInProgressData(phase, test.type);

    // First test in other phases
    if (test.order === 1) {
      return {
        isAvailable: phase === currentPhase &&
          demoCompleted &&
          !isTestCompleted,
        isCompleted: isTestCompleted,
        hasProgress: inProgress
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
      isCompleted: isTestCompleted,
      hasProgress: inProgress
    };
  };

  // Add getExpectedDate function
  const getExpectedDate = (phase, dayNumber = null) => {
    if (!pretestDate) {
      return '';
    }

    const baseDate = toEasternTime(pretestDate);
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

  // Helper function to check if a phase is complete
  const isPhaseCompleted = (phase) => {
    return testTypes.every(test =>
      completedTests[`${phase}_${test.type}`] === true
    );
  };

  // Helper for posttest1 specifically
  const isPosttest1Completed = () => {
    return isPhaseCompleted('posttest1');
  };

  // Helper function to check if training is complete (all 4 days)
  const isTrainingCompleted = () => {
    // Add explicit boolean conversion for safety
    return Boolean(completedTests['training_day1']) &&
      Boolean(completedTests['training_day2']) &&
      Boolean(completedTests['training_day3']) &&
      Boolean(completedTests['training_day4']);
  };

  // Helper function to calculate days until a specific date
  const getDaysUntilDate = (daysToAdd) => {
    if (!pretestDate) return null;

    const baseDate = toEasternTime(pretestDate);
    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + daysToAdd);

    const today = getCurrentDateInEastern();

    // Calculate days difference
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  };

  // Helper function to calculate days until posttest1
  const getDaysUntilPosttest1 = () => {
    return getDaysUntilDate(12); // Posttest1 is 12 days after pretest
  };

  // Helper function to calculate days until posttest2
  const getDaysUntilPosttest2 = () => {
    return getDaysUntilDate(35); // Posttest2 is 35 days after pretest
  };

  // Calculate posttest availability when current time is after expected date
  const calculatePosttestAvailability = (pretestDate, trainingDay) => {
    if (!pretestDate) return { posttest1: false, posttest2: false };

    const baseDate = toEasternTime(pretestDate);
    const today = getCurrentDateInEastern();

    // Now following the correct timeline:
    // Posttest1 is 12 days after pretest (1 week after 4 days of training + 1 day)
    const posttest1Date = new Date(baseDate);
    posttest1Date.setDate(posttest1Date.getDate() + 12);

    // Posttest2 is 35 days after pretest
    const posttest2Date = new Date(baseDate);
    posttest2Date.setDate(posttest2Date.getDate() + 35);

    // For debugging
    console.log("Today (Eastern):", today);
    console.log("Pretest date (Eastern):", baseDate);
    console.log("Posttest1 date (Eastern):", posttest1Date);
    console.log("Posttest2 date (Eastern):", posttest2Date);
    console.log("Days since pretest:", Math.floor((today - baseDate) / (1000 * 60 * 60 * 24)));

    return {
      // For posttest1, check both date AND that all training days are completed
      // This ensures posttest1 isn't available until the required date even if training is done
      posttest1: (today >= posttest1Date) && (currentPhase === 'posttest1' || (currentPhase === 'training' && isTrainingCompleted())),
      // For posttest2, check both date AND that the current phase is posttest2
      // This ensures even if we've completed posttest1, we can't access posttest2 until the date
      posttest2: (today >= posttest2Date) && (currentPhase === 'posttest2' || currentPhase === 'completed')
    };
  };

  // Calculate posttest availability when component mounts or pretestDate changes
  useEffect(() => {
    const availability = calculatePosttestAvailability(pretestDate, trainingDay);
    console.log("Posttest availability:", availability);
    setPosttestAvailability(availability);
  }, [pretestDate, trainingDay, currentPhase]);

  // Debug useEffect to log training completion conditions
  useEffect(() => {
    // Debug training completion and posttest1 message conditions
    console.log("Training completion conditions:", {
      currentPhase,
      isTrainingCompleted: isTrainingCompleted(),
      trainingDay,
      training_day1: completedTests['training_day1'],
      training_day2: completedTests['training_day2'],
      training_day3: completedTests['training_day3'],
      training_day4: completedTests['training_day4'],
      posttest1Available: posttestAvailability.posttest1,
      daysUntilPosttest1: getDaysUntilPosttest1()
    });
  }, [currentPhase, trainingDay, completedTests, posttestAvailability]);

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

  // Helper function to detect browser type
  const getBrowserType = () => {
    if (typeof window === 'undefined') return 'unknown'; // SSR handling

    const userAgent = window.navigator.userAgent.toLowerCase();

    if (userAgent.indexOf('chrome') > -1) return 'chrome';
    if (userAgent.indexOf('firefox') > -1) return 'firefox';
    if (userAgent.indexOf('safari') > -1) return 'safari';
    if (userAgent.indexOf('edge') > -1 || userAgent.indexOf('edg') > -1) return 'edge';
    if (userAgent.indexOf('opr') > -1 || userAgent.indexOf('opera') > -1) return 'opera';

    return 'other';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Browser compatibility warning for non-Chrome browsers */}
        {getBrowserType() !== 'chrome' && (
          <div className="mb-6 bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-md">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-yellow-800">Browser Compatibility Notice</p>
                <p className="text-sm text-yellow-700">This application works best in Google Chrome. Some features may not function correctly in other browsers.</p>
              </div>
            </div>
          </div>
        )}

        {/* Developer tools - only show in development mode */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 bg-gray-100 p-2 rounded-md border border-gray-300">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Developer Tools</span>
              <a
                href="/clear-test-users.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#406368] hover:text-[#6c8376] hover:underline"
              >
                Clear Test User Progress
              </a>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#406368] mb-2">
            Communication Training Progress
          </h1>
          {pretestDate && (
            <p className="text-sm text-gray-500 mt-2">
              Started: {formatDate(pretestDate)}
            </p>
          )}
        </div>

        {/* Volume adjustment section */}
        <div className="mb-8 bg-[#f3ecda] border border-[#dad6d9] rounded-lg p-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#406368] mb-2">Volume Adjustment</h3>
              <p className="text-sm text-gray-600 mb-4">
                Use this audio sample to adjust your headphone volume to a comfortable level before starting an activity.
              </p>
            </div>
            
            <div className="mt-4 md:mt-0">
              <Button
                onClick={async () => {
                  try {
                    setIsPlayingPractice(true);
                    setPracticeAudioError(false);
                    // Use default speaker ID '01'
                    const result = await audioService.playPracticeAudio();
                    if (!result) {
                      setPracticeAudioError(true);
                    }
                  } catch (error) {
                    console.error('Error playing practice audio:', error);
                    setPracticeAudioError(true);
                  } finally {
                    setIsPlayingPractice(false);
                  }
                }}
                disabled={isPlayingPractice}
                className={`min-w-[150px] ${practiceAudioError ? "bg-red-500 hover:bg-red-600" : "bg-[#406368] hover:bg-[#6c8376]"}`}
              >
                {isPlayingPractice ? (
                  <span className="flex items-center">
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Playing...
                  </span>
                ) : practiceAudioError ? (
                  <span className="flex items-center">
                    <VolumeX className="h-4 w-4 mr-2" />
                    Error
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Volume2 className="h-4 w-4 mr-2" />
                    Play Sample Audio
                  </span>
                )}
              </Button>
              {practiceAudioError && (
                <p className="text-xs text-red-600 mt-2">Failed to play audio. Please ensure your headphones are connected.</p>
              )}
            </div>
          </div>
        </div>

        {/* Standalone Demographics card - separate from pretest section */}
        {!isDemographicsCompleted && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-[#406368]">Background Questionnaire</h2>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
              <TestTypeCard
                title="Demographics Questionnaire"
                description="Required before starting any tests"
                phase="demographics"
                testType="demographics"
                status={{
                  isAvailable: true,
                  isCompleted: false
                }}
                onSelect={handleSelectPhase}
                date="Required first"
                isPreloading={false}
              />
            </div>
          </div>
        )}

        {/* Pretest Section WITHOUT Demographics Card */}
        {currentPhase === 'pretest' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-[#406368]">Initial Assessment</h2>
            <p className="mb-4">Please wear <strong>headphones</strong> during all portions of this app.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

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
          <div className="mb-8 text-center p-6 bg-[#f3ecda] rounded-lg border border-[#dad6d9]">
            <div className="flex items-center justify-center mb-2">
              <PartyPopper className="h-8 w-8 text-[#6c8376] mr-2" />
              <h2 className="text-xl font-semibold text-[#406368]">Great job completing all tests!</h2>
              <PartyPopper className="h-8 w-8 text-[#6c8376] ml-2" />
            </div>
            <p className="text-lg text-[#6c8376]">Please return tomorrow to start the training.</p>
          </div>
        )}

        {/* Training Section */}
        {currentPhase === 'training' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-[#406368]">Training Sessions</h2>
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

        {/* Posttest1 Section - Only show if current phase is posttest1 AND the date requirement is met */}
        {currentPhase === 'posttest1' && posttestAvailability.posttest1 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-[#406368]">1-Week Follow-up Assessment</h2>
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

        {/* Message for countdown to posttest1 - Show whenever we're in posttest1 phase but the date requirement for showing the cards hasn't been met */}
        {(currentPhase === 'posttest1' && !posttestAvailability.posttest1) && (
          <div className="mb-8 text-center p-6 bg-[#f3ecda] rounded-lg border border-[#dad6d9]">
            <div className="flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#406368] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-xl font-semibold text-[#406368]">1-Week Follow-up Coming Soon</h2>
            </div>
            <p className="text-lg text-[#406368]">
              You've completed all training days! Your 1-week follow-up will be available in <span className="font-bold">{getDaysUntilPosttest1()} days</span>.
            </p>
            <p className="text-sm text-[#6c8376] mt-2">
              Please return on {getExpectedDate('posttest1')} to complete the follow-up assessment.
            </p>
          </div>
        )}

        {/* Message for countdown to posttest2 - Show only when posttest1 is complete and posttest2 isn't available yet */}
        {isPosttest1Completed() && !posttestAvailability.posttest2 && getDaysUntilPosttest2() > 0 && (
          <div className="mb-8 text-center p-6 bg-[#f3ecda] rounded-lg border border-[#dad6d9]">
            <div className="flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#406368] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-xl font-semibold text-[#406368]">1-Month Follow-up Coming Soon</h2>
            </div>
            <p className="text-lg text-[#406368]">
              You've completed the 1-week follow-up! Your 1-month follow-up will be available in <span className="font-bold">{getDaysUntilPosttest2()} days</span>.
            </p>
            <p className="text-sm text-[#6c8376] mt-2">
              Please return on {getExpectedDate('posttest2')} to complete the final assessment.
            </p>
          </div>
        )}

        {/* Message when posttest2 is available but not yet started */}
        {posttestAvailability.posttest2 && currentPhase !== 'completed' && !testTypes.some(test => completedTests[`posttest2_${test.type}`]) && (
          <div className="mb-4 text-center p-4 bg-[#f3ecda] rounded-lg border border-[#dad6d9]">
            <div className="flex items-center justify-center mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#406368] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 className="text-lg font-medium text-[#406368]">Your 1-month follow-up is now available!</h3>
            </div>
            <p className="text-[#6c8376]">
              Please complete the final assessment to finish the study.
            </p>
          </div>
        )}

        {/* Posttest2 Section - Only show if current phase is posttest2 AND the date requirement is met */}
        {currentPhase === 'posttest2' && posttestAvailability.posttest2 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-[#406368]">1-Month Follow-up Assessment</h2>
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