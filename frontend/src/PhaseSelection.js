import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { CheckCircle, Lock, Clock, ArrowRight, PartyPopper, Loader, Volume2, VolumeX, X } from "lucide-react";
import { formatDate, getCurrentDateInEastern, toEasternTime, isToday } from './lib/utils';
import audioService from './services/audioService';
import { isIpadChrome, getAudioSettings } from './utils/deviceDetection';
// Make audioService available globally for components that need it
window.audioService = audioService;

// Ensure isIpadChrome() doesn't accidentally render to the page
// Using a function to prevent direct evaluation at module level
function getIsUsingIpadChrome() {
  return typeof window !== 'undefined' ? isIpadChrome() : false;
}

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
// Study Process Diagram Component
const StudyProcessDiagram = ({ currentPhase, completedTests, trainingDay, onClose }) => {
  const stages = [
    { id: 'demographics', label: 'Background', icon: '📋' },
    { id: 'pretest', label: 'Initial Activities', icon: '📝' },
    { id: 'training1', label: 'Training Day 1', icon: '🎧' },
    { id: 'training2', label: 'Training Day 2', icon: '🎧' },
    { id: 'training3', label: 'Training Day 3', icon: '🎧' },
    { id: 'training4', label: 'Training Day 4', icon: '🎧' },
    { id: 'posttest1', label: 'Middle Activities', icon: '✏️' },
    { id: 'posttest2', label: 'Final Activities', icon: '🎉' }
  ];

  // Helper function to determine if a stage is completed
  const isStageCompleted = (stageId) => {
    // Access trainingDay from parent component scope
    if (stageId === 'demographics') {
      // PRIORITY 1: Check for any demographics-related keys with true values
      const anyDemographicsCompleted = Object.entries(completedTests).some(([key, value]) => {
        return key.toLowerCase().includes('demograph') && Boolean(value);
      });

      if (anyDemographicsCompleted) {
        return true;
      }

      // PRIORITY 2: Check specific keys we know about
      if (Boolean(completedTests['demographics']) || Boolean(completedTests['pretest_demographics'])) {
        return true;
      }

      // PRIORITY 3: Fall back to localStorage as a last resort
      const userId = localStorage.getItem('userId');
      const userSpecificFlag = userId && localStorage.getItem(`demographicsCompleted_${userId}`) === 'true';
      const globalFlag = localStorage.getItem('demographicsCompleted') === 'true';

      // Check different combinations for backward compatibility
      if (userSpecificFlag) {
        return true;
      }

      if (globalFlag && userId) {
        return true;
      }

      return false;
    } else if (stageId === 'pretest') {
      return Boolean(completedTests['pretest_intelligibility']) &&
        Boolean(completedTests['pretest_effort']) &&
        Boolean(completedTests['pretest_comprehension']);
    } else if (stageId.startsWith('training')) {
      const day = stageId.charAt(stageId.length - 1);

      // We need a more specific pattern that only matches this exact day
      // Make sure to include word boundaries to prevent matching day1 in day10, etc.
      const pattern = new RegExp(`(training|day)[^0-9]*${day}\\b|\\bday${day}\\b`, 'i');

      // Use a targeted approach - check specific keys and formats
      const isCompleted =
        // Check direct formats we know about
        Boolean(completedTests[`training_day${day}`]) ||

        // Only do the pattern matching if we need to (avoids false positives)
        (() => {
          // Check specific keys based on the exact day number
          for (const key in completedTests) {
            // Only consider keys that contain "training" and are true
            if (completedTests[key] === true && key.includes('training')) {
              // For training day 1, look for these specific patterns
              if (day === '1' && (
                key === 'training_day1' ||
                key === 'day1' ||
                key === 'training1'
              )) {
                return true;
              }
              // For other days, only match their specific patterns
              else if (day !== '1' && pattern.test(key)) {
                return true;
              }
            }
          }
          return false;
        })() ||

        // Use trainingDay only for days we've already passed
        (parseInt(day) < parseInt(trainingDay));

      // Log for debugging - only for day 1 and day 2 to see comparison
      if (day === '1' || day === '2') {
        console.log(`Training day ${day} completion check:`, {
          [`training_day${day}`]: Boolean(completedTests[`training_day${day}`]),
          trainingDay: trainingDay,
          pastDay: parseInt(day) < parseInt(trainingDay),
          isCompleted: isCompleted
        });
      }

      return isCompleted;
    } else if (stageId === 'posttest1') {
      return Boolean(completedTests['posttest1_intelligibility']) &&
        Boolean(completedTests['posttest1_effort']) &&
        Boolean(completedTests['posttest1_comprehension']);
    } else if (stageId === 'posttest2') {
      return Boolean(completedTests['posttest2_intelligibility']) &&
        Boolean(completedTests['posttest2_effort']) &&
        Boolean(completedTests['posttest2_comprehension']);
    }
    return false;
  };

  // Helper function to determine if a stage is the current one
  const isCurrentStage = (stageId) => {
    // First check if demographics is not completed, force demographics to be the current stage
    // Reuse isStageCompleted to get consistent behavior
    const isDemoCompleted = isStageCompleted('demographics');

    if (stageId === 'demographics' && !isDemoCompleted) return true;

    // Otherwise, proceed with normal stage checks
    if (stageId === 'demographics' && currentPhase === 'demographics') return true;
    if (stageId === 'pretest' && currentPhase === 'pretest') return true;
    if (stageId.startsWith('training') && currentPhase === 'training') {
      const day = parseInt(stageId.charAt(stageId.length - 1));
      return trainingDay === day;
    }
    if (stageId === 'posttest1' && currentPhase === 'posttest1') return true;
    if (stageId === 'posttest2' && currentPhase === 'posttest2') return true;
    return false;
  };

  return (
    <div className="bg-[#f3ecda] border border-[#dad6d9] rounded-lg p-4 mb-6 relative">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        aria-label="Close study progress diagram"
      >
        <X className="h-5 w-5" />
      </button>

      <h3 className="text-lg font-semibold text-[#406368] mb-3">Study Progress</h3>

      {/* Simplified list view for smaller screens */}
      <div className="flex flex-col lg:hidden">
        <div className="grid grid-cols-2 gap-1 text-xs">
          {stages.map((stage, index) => (
            <div key={stage.id} className={`px-2 py-1.5 mb-1 rounded ${isStageCompleted(stage.id)
              ? "bg-green-100 text-green-800 border-l-4 border-green-500"
              : isCurrentStage(stage.id)
                ? "bg-[#d9f0f4] text-[#2d8c9e] font-medium border-l-4 border-[#2d8c9e]"
                : "bg-gray-100 text-gray-600 border-l-4 border-gray-300"
              }`}>
              <div className="flex items-center">
                {isStageCompleted(stage.id) && <CheckCircle className="w-3 h-3 mr-1 text-green-600" />}
                <span>{stage.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop view - horizontal timeline (only on large screens) */}
      <div className="hidden lg:flex flex-wrap items-center justify-between relative">
        {/* Background line connecting all items - centered vertically on the circle */}
        <div className="absolute h-[2px] bg-gray-300" style={{ left: '40px', right: '40px', top: '24px' }}></div>

        {stages.map((stage, index) => (
          <div key={stage.id} className="flex flex-col items-center" style={{ width: `${100 / stages.length}%`, position: 'relative', zIndex: 1 }}>
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-full mb-2 relative ${isStageCompleted(stage.id)
                ? "bg-green-100 border-2 border-green-500"
                : isCurrentStage(stage.id)
                  ? "bg-[#2d8c9e] text-white border-2 border-[#2d8c9e] shadow-md"
                  : "bg-white border-2 border-gray-300"
                }`}
            >
              <span className="text-lg">{stage.icon}</span>
              {isStageCompleted(stage.id) && (
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                  <CheckCircle className="text-white w-4 h-4" />
                </div>
              )}
            </div>
            <span className="text-xs text-center font-medium">{stage.label}</span>
          </div>
        ))}
      </div>

      {/* Legend for timeline */}
      {/* Legend for simplified view */}
      <div className="lg:hidden">
        <p className="text-xs text-gray-600 text-center mt-3">
          <span className="inline-flex items-center mr-2">
            <div className="w-2 h-2 bg-green-500 mr-1"></div>
            <span>Completed</span>
          </span>
          <span className="inline-flex items-center">
            <div className="w-2 h-2 bg-[#2d8c9e] mr-1"></div>
            <span>Current</span>
          </span>
        </p>
      </div>

      {/* Legend for desktop timeline */}
      <div className="hidden lg:block">
        <p className="text-xs text-gray-600 text-center mt-4">
          <span className="inline-flex items-center mr-3">
            <div className="w-3 h-3 rounded-full bg-green-100 border border-green-500 mr-1"></div>
            <span>Completed</span>
          </span>
          <span className="inline-flex items-center mr-3">
            <div className="w-3 h-3 rounded-full bg-[#2d8c9e] mr-1"></div>
            <span>Current</span>
          </span>
          <span className="inline-flex items-center">
            <div className="w-3 h-3 rounded-full bg-white border border-gray-300 mr-1"></div>
            <span>Upcoming</span>
          </span>
        </p>
      </div>
    </div>
  );
};

const TrainingDayCard = ({ day, currentDay, onSelect, date, pretestDate, completedTests = {} }) => {
  // Update isCompleted check to look at both currentDay and completedTests
  // This ensures we consider both the sequential order AND explicit completion status
  const isCompleted = day < currentDay || Boolean(completedTests[`training_day${day}`]);
  const [isLoading, setIsLoading] = useState(false);

  // Check for in-progress data
  const hasProgress = (() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return false;

    const progressKey = `progress_${userId}_training_day${day}`;
    return localStorage.getItem(progressKey) !== null;
  })();

  // Helper functions inside the component

  const getExpectedTrainingDate = (baseDate, dayNumber) => {
    if (!baseDate) return null;
    // Use our improved toEasternTime function which now handles iPad Chrome correctly
    const date = toEasternTime(baseDate);
    date.setDate(date.getDate() + dayNumber);
    return date;
  };

  // Date availability check only applies to the current training day
  const expectedDate = getExpectedTrainingDate(pretestDate, day);

  // Improve date availability check for cross-platform consistency
  // This is critical to prevent bypassing the calendar day wait requirement
  const isDayAvailableToday = (() => {
    // If no expected date is set, we can't determine availability
    if (!expectedDate) return false;

    // Normalize dates for comparison (to midnight)
    const normalizedExpectedDate = new Date(expectedDate);
    normalizedExpectedDate.setHours(0, 0, 0, 0);

    const normalizedToday = new Date(getCurrentDateInEastern());
    normalizedToday.setHours(0, 0, 0, 0);

    // Compare timestamps for reliable cross-platform behavior
    // This ensures iPad Chrome uses the same logic as desktop browsers
    return normalizedToday.getTime() >= normalizedExpectedDate.getTime();
  })();

  // Log date checks for debugging (can be removed in production)
  if (day === 1) {
    console.log(`Training day ${day} availability check:`, {
      expectedDate: expectedDate ? new Date(expectedDate).toISOString() : null,
      today: new Date(getCurrentDateInEastern()).toISOString(),
      isDayAvailableToday,
      isIPadChromeDetected: getIsUsingIpadChrome()
    });
  }

  // Available only if it's current day AND correct calendar day AND not already completed
  // This is the most important check for enforcing the calendar day wait
  const isAvailable = !isCompleted && day === currentDay && isDayAvailableToday;

  // Get tomorrow's date for return message
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  // Get message based on completion status and day
  const getMessage = () => {
    if (isCompleted) {
      if (day === 4) {
        return 'Completed - Please return in 1 week for follow-up activities';
      } else {
        return `Completed - Please return tomorrow (${getTomorrowDate()}) for Day ${day + 1}`;
      }
    } else if (hasProgress) {
      return 'In Progress - Continue';
    } else if (isAvailable) {
      return 'Available Now';
    } else {
      return 'Locked';
    }
  };

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
            {getMessage()}
            {date && !isCompleted && ` • ${date}`}
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
  trainingCompletedDate, // Add training completed date
  canProceedToday = false, // Add calendar day verification prop
  onSelectPhase,
  isDemographicsCompleted,
  onPhaseTransition,
  completedTests = {} // Track completed test types
}) => {
  // Debug log for the mysterious "0" issue
  console.log("PhaseSelection component rendering");
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadingPhase, setPreloadingPhase] = useState(null);
  //const [backgroundPreloading, setBackgroundPreloading] = useState(false);
  //const [preloadingStatus, setPreloadingStatus] = useState({
  //  pretest: { completed: false },
  //  training: { completed: false },
  //  posttest1: { completed: false },
  //  posttest2: { completed: false }
  //});

  // Add state to track posttest availability
  const [posttestAvailability, setPosttestAvailability] = useState({
    posttest1: false,
    posttest2: false
  });

  // Add state to track if we're in the fresh demographics completion state
  const [isPostDemographics, setIsPostDemographics] = useState(false);

  // Add state for completion message/modal
  const [completionMessage, setCompletionMessage] = useState({
    show: false,
    title: '',
    message: '',
    type: ''
  });

  // Add state for practice audio playback
  const [isPlayingPractice, setIsPlayingPractice] = useState(false);
  const [practiceAudioError, setPracticeAudioError] = useState(false);

  // Add state for showing/hiding the study process diagram
  const [showStudyDiagram, setShowStudyDiagram] = useState(true);

  const testTypes = React.useMemo(() => [
    {
      id: 'intelligibility',
      title: 'Intelligibility',
      description: 'Type the complete phrase you hear (15 minutes)',
      type: 'intelligibility',
      order: 1  // Make intelligibility the first (priority 1)
    },
    {
      id: 'effort',
      title: 'Listening Effort',
      description: 'Type the final word and rate your listening effort (20 minutes)',
      type: 'effort',
      order: 2  // Keep effort as second (priority 2)
    },
    {
      id: 'comprehension',
      title: 'Comprehension',
      description: 'Listen to stories and answer questions (10 minutes)',
      type: 'comprehension',
      order: 3  // Make comprehension last (priority 3)
    }
  ], []);

  // CRITICAL FIX: Helper function to consistently check demographics completion with improved validation
  // Move this function before any useEffect hooks that call it to fix the ESLint no-use-before-define warning
  const checkDemographicsCompleted = React.useCallback(() => {
    // Add detailed logging to track all possible sources of demographics completion status
    console.log("Checking demographics completion with sources:", {
      serverStatusFlag: isDemographicsCompleted,
      completedTestsObject: completedTests,
      demographicsKey: completedTests['demographics'],
      pretest_demographicsKey: completedTests['pretest_demographics'],
      demographicsCompletedKeys: Object.keys(completedTests).filter(key => key.includes('demograph')),
      userId: localStorage.getItem('userId'),
      localStorageGlobalFlag: localStorage.getItem('demographicsCompleted'),
      userSpecificLocalFlag: localStorage.getItem(`demographicsCompleted_${localStorage.getItem('userId')}`)
    });

    // PRIORITY 1: Check if props explicitly say demographics is completed
    if (isDemographicsCompleted) {
      console.log("Demographics completed via isDemographicsCompleted prop");
      return true;
    }

    // PRIORITY 2: Check if completedTests has any demographics-related keys with true values
    // Look for any key containing 'demograph' that has a truthy value
    const anyDemographicsCompleted = Object.entries(completedTests).some(([key, value]) => {
      return key.toLowerCase().includes('demograph') && Boolean(value);
    });

    if (anyDemographicsCompleted) {
      console.log("Demographics completed via completedTests object");
      return true;
    }

    // PRIORITY 3: Check for specific demographics completion keys we know about
    if (Boolean(completedTests['demographics']) || Boolean(completedTests['pretest_demographics'])) {
      console.log("Demographics completed via specific completedTests keys");
      return true;
    }

    // PRIORITY 4: Only fall back to localStorage as a last resort
    const userId = localStorage.getItem('userId');

    // Check user-specific demographics completion flag
    const userSpecificCompletion = userId && localStorage.getItem(`demographicsCompleted_${userId}`) === 'true';

    // Check if global flag exists
    const globalFlag = localStorage.getItem('demographicsCompleted') === 'true';

    // Now consider various combinations for backward compatibility
    if (userSpecificCompletion) {
      console.log("Demographics completed via user-specific localStorage flag");
      return true;
    }

    if (globalFlag && userId) {
      console.log("Demographics completed via global localStorage flag with userID present");
      return true;
    }

    console.log("Demographics NOT completed based on all checks");
    return false;
  }, [isDemographicsCompleted, completedTests]);

  // Debug log to see current phase and completed tests
  useEffect(() => {
    console.log("Current phase:", currentPhase);
    console.log("Completed tests:", completedTests);
    console.log("isDemographicsCompleted prop:", isDemographicsCompleted);

    // Run demographics check on mount and when completed tests change
    const demoStatus = checkDemographicsCompleted();
    console.log("Demographics completion status on phase/tests update:", demoStatus);

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
  }, [currentPhase, completedTests, isDemographicsCompleted, isPostDemographics, checkDemographicsCompleted]);

  // Add a specific effect just to check demographics status on initial load
  useEffect(() => {
    // This runs once on component mount
    console.log("=== INITIAL DEMOGRAPHICS CHECK ===");
    console.log("Prop isDemographicsCompleted:", isDemographicsCompleted);
    console.log("completedTests object:", completedTests);

    const anyDemographicsKey = Object.keys(completedTests).find(key =>
      key.toLowerCase().includes('demograph')
    );

    if (anyDemographicsKey) {
      console.log(`Found demographics key: ${anyDemographicsKey} with value:`, completedTests[anyDemographicsKey]);
    } else {
      console.log("No demographics keys found in completedTests");
    }

    // Local storage check
    const userId = localStorage.getItem('userId');
    console.log("userId from localStorage:", userId);
    console.log("Global demographics flag:", localStorage.getItem('demographicsCompleted'));
    console.log("User-specific demographics flag:", localStorage.getItem(`demographicsCompleted_${userId}`));

    // Final check result
    console.log("Final demographics completion status:", checkDemographicsCompleted());
  }, [isDemographicsCompleted, completedTests, checkDemographicsCompleted]);
  
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
  // Moving this up before functions that use it to fix ESLint no-use-before-define warning
  const hasInProgressData = (phase, testType) => {
    const userId = localStorage.getItem('userId');
    if (!userId) return false;

    const progressKey = `progress_${userId}_${phase}_${testType}`;
    const savedProgress = localStorage.getItem(progressKey);

    return savedProgress !== null;
  };

  // Helper function to determine if a test type is available
  // Moving this after hasInProgressData and checkDemographicsCompleted to fix ESLint warnings
  const getTestStatus = (phase, testType) => {
    // Special handling for demographics - completely separate phase
    if (testType === 'demographics') {
      // Using our improved check function for demographics completion
      const demoCompleted = checkDemographicsCompleted();
      console.log(`Demographics completion status from getTestStatus: ${demoCompleted}`);

      // Demographics card should not be shown at all if completed
      return {
        isAvailable: !demoCompleted,
        isCompleted: demoCompleted,
        hasProgress: false // Demographics doesn't support resuming
      };
    }

    // Check if demographics is completed for other types of tests
    const demoCompletedStatus = checkDemographicsCompleted();

    // For training phase
    if (phase === 'training') {
      const inProgress = hasInProgressData(phase, testType);
      return {
        isAvailable: currentPhase === 'training' && demoCompletedStatus,
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
            demoCompletedStatus &&
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
          demoCompletedStatus &&
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
          demoCompletedStatus &&
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
        demoCompletedStatus &&
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
  const isTrainingCompleted = React.useCallback(() => {
    // Add explicit boolean conversion for safety
    return Boolean(completedTests['training_day1']) &&
      Boolean(completedTests['training_day2']) &&
      Boolean(completedTests['training_day3']) &&
      Boolean(completedTests['training_day4']);
  }, [completedTests]);

  // Helper function to calculate days until a specific date
  const getDaysUntilDate = React.useCallback((baseDate, daysToAdd) => {
    if (!baseDate) return null;

    const referenceDate = toEasternTime(baseDate);
    const targetDate = new Date(referenceDate);
    targetDate.setDate(targetDate.getDate() + daysToAdd);

    const today = getCurrentDateInEastern();

    // Calculate days difference
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }, []);

  // Helper function to calculate days until posttest1
  const getDaysUntilPosttest1 = React.useCallback(() => {
    // Use trainingCompletedDate if available, otherwise fall back to pretestDate
    if (trainingCompletedDate) {
      return getDaysUntilDate(trainingCompletedDate, 7); // 7 days after training completion
    }
    return getDaysUntilDate(pretestDate, 12); // Legacy: 12 days after pretest
  }, [trainingCompletedDate, pretestDate, getDaysUntilDate]);

  // Helper function to calculate days until posttest2
  const getDaysUntilPosttest2 = React.useCallback(() => {
    // Use trainingCompletedDate if available, otherwise fall back to pretestDate
    if (trainingCompletedDate) {
      return getDaysUntilDate(trainingCompletedDate, 30); // 30 days after training completion
    }
    return getDaysUntilDate(pretestDate, 35); // Legacy: 35 days after pretest
  }, [trainingCompletedDate, pretestDate, getDaysUntilDate]);

  // Calculate posttest availability when current time is after expected date
  const calculatePosttestAvailability = React.useCallback((pretestDate, trainingCompletedDate, trainingDay) => {
    const today = getCurrentDateInEastern();

    // Use trainingCompletedDate if available, otherwise fallback to pretestDate for backward compatibility
    if (trainingCompletedDate) {
      const trainingCompleted = toEasternTime(trainingCompletedDate);

      // Posttest1 is 7 days after training completion
      const posttest1Date = new Date(trainingCompleted);
      posttest1Date.setDate(posttest1Date.getDate() + 7);

      // Posttest2 is 30 days after training completion
      const posttest2Date = new Date(trainingCompleted);
      posttest2Date.setDate(posttest2Date.getDate() + 30);

      // For debugging
      console.log("Today (Eastern):", today);
      console.log("Training completed date (Eastern):", trainingCompleted);
      console.log("Posttest1 date (Eastern):", posttest1Date);
      console.log("Posttest2 date (Eastern):", posttest2Date);
      console.log("Days since training completed:", Math.floor((today - trainingCompleted) / (1000 * 60 * 60 * 24)));

      return {
        // For posttest1, check both date AND phase
        posttest1: (today >= posttest1Date) && (currentPhase === 'posttest1' || (currentPhase === 'training' && isTrainingCompleted())),
        // For posttest2, check both date AND that the current phase is posttest2
        posttest2: (today >= posttest2Date) && (currentPhase === 'posttest2' || currentPhase === 'completed')
      };
    }
    // Fall back to original logic using pretestDate
    else if (pretestDate) {
      const baseDate = toEasternTime(pretestDate);

      // Use legacy calculation for backward compatibility
      // Posttest1 is 12 days after pretest (1 week after 4 days of training + 1 day)
      const posttest1Date = new Date(baseDate);
      posttest1Date.setDate(posttest1Date.getDate() + 12);

      // Posttest2 is 35 days after pretest
      const posttest2Date = new Date(baseDate);
      posttest2Date.setDate(posttest2Date.getDate() + 35);

      // For debugging
      console.log("Today (Eastern):", today);
      console.log("Pretest date (Eastern):", baseDate);
      console.log("Posttest1 date (Eastern) [legacy]:", posttest1Date);
      console.log("Posttest2 date (Eastern) [legacy]:", posttest2Date);
      console.log("Days since pretest:", Math.floor((today - baseDate) / (1000 * 60 * 60 * 24)));

      return {
        // For posttest1, check both date AND that all training days are completed
        posttest1: (today >= posttest1Date) && (currentPhase === 'posttest1' || (currentPhase === 'training' && isTrainingCompleted())),
        // For posttest2, check both date AND that the current phase is posttest2
        posttest2: (today >= posttest2Date) && (currentPhase === 'posttest2' || currentPhase === 'completed')
      };
    }

    // No dates available at all
    return { posttest1: false, posttest2: false };
  }, [currentPhase, isTrainingCompleted]);

  // Calculate posttest availability when component mounts or date/phase changes
  useEffect(() => {
    const availability = calculatePosttestAvailability(pretestDate, trainingCompletedDate, trainingDay);
    console.log("Posttest availability:", availability);
    setPosttestAvailability(availability);
  }, [pretestDate, trainingCompletedDate, trainingDay, currentPhase, calculatePosttestAvailability]);

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
  }, [currentPhase, trainingDay, completedTests, posttestAvailability, getDaysUntilPosttest1, isTrainingCompleted]);

  // Auto-transition to training phase when returning on a different day after completing pretest
  useEffect(() => {
    // We need to declare isAllPretestCompleted inside the effect to avoid hoisting issues
    const allPretestComplete = testTypes.every(test =>
      completedTests[`pretest_${test.type}`] === true
    );

    // Enhanced log for cross-platform debugging
    console.log('Auto-transition check:', {
      currentPhase,
      allPretestComplete,
      pretestDate: pretestDate ? new Date(pretestDate).toISOString() : null,
      isToday: pretestDate ? isToday(pretestDate) : false,
      canProceedToday,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
    });

    // Check if this is a return visit on a different day from pretest completion
    // CRITICAL FIX: Now we use canProceedToday from App.js which properly checks calendar days
    // across all platforms including iPad Chrome
    if (currentPhase === 'pretest' && allPretestComplete && canProceedToday) {
      console.log('User returned on a different day after completing pretest - auto-transitioning to training');

      // Automatically transition to training phase after a short delay
      // to ensure the UI has time to render and user can see what's happening
      setTimeout(() => {
        if (typeof onPhaseTransition === 'function') {
          onPhaseTransition('training');
        }
      }, 1500);
    }
  }, [currentPhase, pretestDate, canProceedToday, onPhaseTransition, completedTests, testTypes]);

  // Check for pretest_completed flag to handle transition to training after seeing phase selection
  useEffect(() => {
    // Check for pretest_completed flag - this means user has completed pretest comprehension
    // and has now seen the phase selection screen with the completions
    const pretestCompleted = localStorage.getItem('pretest_completed') === 'true';

    if (pretestCompleted && currentPhase === 'pretest') {
      console.log('Detected pretest_completed flag - user has now seen the completion status');

      // Clear the flag first to prevent repeated transitions
      localStorage.removeItem('pretest_completed');

      // Show congratulatory message for completing pretest
      setCompletionMessage({
        show: true,
        title: 'Pretest Completed!',
        message: 'Congratulations! You have completed all pretest activities. Please return tomorrow to begin your training.',
        type: 'pretest'
      });

      // Set a timeout to update currentPhase to training after showing message
      // This ensures user sees the completion message first
      setTimeout(() => {
        console.log('Now transitioning to training phase after user has seen pretest completion');
        // If App.js provides an onPhaseTransition prop, call it
        if (typeof onPhaseTransition === 'function') {
          onPhaseTransition('training');
        }
      }, 5000); // 5 seconds after showing the message
    }

    // No cleanup needed for this effect
    return () => { };
  }, [currentPhase, onPhaseTransition]);

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

  // Completion message modal component
  const CompletionMessageModal = () => {
    if (!completionMessage.show) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-[#f3ecda] rounded-lg max-w-md w-full p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-[#406368]">
              {completionMessage.title}
            </h3>
            <PartyPopper className="h-6 w-6 text-[#406368]" />
          </div>
          <p className="text-[#6e6e6d] mb-6">
            {completionMessage.message}
          </p>
          <Button
            className="w-full bg-[#406368] hover:bg-[#6c8376]"
            onClick={() => setCompletionMessage({ ...completionMessage, show: false })}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white py-12 px-4">
      {/* Render completion message modal if needed */}
      <CompletionMessageModal />

      <div className="max-w-4xl mx-auto">
        {/* iPad Chrome specific notice 
        {getIsUsingIpadChrome() && (
          <div className="mb-6 bg-blue-100 border-l-4 border-blue-500 p-4 rounded-md">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-blue-500 mr-3" />
              <div>
                <p className="font-medium text-blue-800">iPad Chrome Detected</p>
                <p className="text-sm text-blue-700">
                  We've detected you're using Chrome on iPad. We've made special adjustments to ensure
                  audio works correctly. If you experience any issues with audio playback, you can
                  proceed by entering "NA" as your response after trying to play the audio.
                </p>
              </div>
            </div>
          </div>
        )}
        */}


        {/* Browser compatibility warning for non-Chrome browsers (but not iPad Chrome) */}
        {getBrowserType() !== 'chrome' && !getIsUsingIpadChrome() && (
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

        {/* Study Process Diagram - only shown if showStudyDiagram is true */}
        {showStudyDiagram && (
          <StudyProcessDiagram
            currentPhase={currentPhase}
            completedTests={completedTests}
            trainingDay={trainingDay}
            onClose={() => setShowStudyDiagram(false)}
          />
        )}

        {!showStudyDiagram && (
          <div className="mb-4 text-center">
            <Button
              variant="outline"
              className="text-xs"
              onClick={() => setShowStudyDiagram(true)}
            >
              Show Study Timeline
            </Button>
          </div>
        )}

        {/* Volume adjustment section */}
        <div className="mb-8 bg-[#f3ecda] border border-[#dad6d9] rounded-lg p-4 relative volume-adjustment-section">
          <button
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            onClick={() => document.querySelector('.volume-adjustment-section').style.display = 'none'}
            aria-label="Close volume adjustment"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#406368] mb-2">Volume Testing</h3>
              <p className="text-sm text-gray-600 mb-4">
                Use this audio sample to adjust your headphone volume to a comfortable level.<br></br>You can change the volume at any point during any of the activities.
              </p>
            </div>

            <div className="mt-4 md:mt-0">
              <Button
                onClick={async () => {
                  try {
                    setIsPlayingPractice(true);
                    setPracticeAudioError(false);

                    // Get device-specific audio settings
                    const audioSettings = getAudioSettings();
                    console.log('Using audio settings:', audioSettings);

                    // For iPad Chrome, add timeout protection
                    const playWithTimeout = async () => {
                      const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Audio loading timeout')),
                          audioSettings.timeout || 10000);
                      });

                      try {
                        // Race the audio playback against the timeout
                        return await Promise.race([
                          audioService.playPracticeAudio(),
                          timeoutPromise
                        ]);
                      } catch (error) {
                        console.error('Error in practice audio playback:', error);
                        throw error;
                      }
                    };

                    // Add retry logic for iPad Chrome
                    const maxAttempts = getIsUsingIpadChrome() ? 2 : 1;
                    let result = false;

                    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                      try {
                        if (attempt > 1) {
                          console.log(`Retry attempt ${attempt} for iPad Chrome practice audio`);
                          // Short delay before retry
                          await new Promise(r => setTimeout(r, 500));
                          // Make sure audio is cleaned up between attempts
                          audioService.dispose();
                        }

                        result = await playWithTimeout();
                        if (result) {
                          console.log('Practice audio played successfully!');
                          break; // Success, exit retry loop
                        }
                      } catch (error) {
                        console.error(`Practice audio attempt ${attempt} failed:`, error);

                        // On last attempt, set error state
                        if (attempt === maxAttempts) {
                          setPracticeAudioError(true);

                          // Special handling for iPad Chrome
                          if (getIsUsingIpadChrome()) {
                            console.log('iPad Chrome detected - showing special error message for practice audio');
                            alert('Audio playback on iPad Chrome may be limited. You can continue with the activities anyway.');
                          }
                        }

                        // Clean up before potential retry
                        audioService.dispose();
                      }
                    }

                    if (!result) {
                      setPracticeAudioError(true);
                    }
                  } catch (error) {
                    console.error('Error playing practice audio:', error);
                    setPracticeAudioError(true);
                  } finally {
                    setIsPlayingPractice(false);
                    // Ensure audio is properly cleaned up
                    audioService.dispose();
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

        {/* Standalone Demographics card - CRITICAL FIX: completely hide when completed */}
        {/* Use our standardized helper function to check demographics completion */}
        {!checkDemographicsCompleted() && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-[#406368]">Background Questionnaire</h2>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
              <TestTypeCard
                title="Background Questionnaire"
                description="Required before starting any activities"
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
            <h2 className="text-xl font-semibold mb-4 text-[#406368]">Initial Activities</h2>
            <p className="mb-4">Please wear <strong>headphones</strong> during all portions of this app. Please complete the activities in one session.</p>
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

        {/* Message when all pretest tests are completed - only show on the day they were completed */}
        {currentPhase === 'pretest' && isDemographicsCompleted && isAllPretestCompleted && (
          // Only show the completion message if we're on the same day as the pretest date
          // or if the pretest date doesn't exist yet (which can happen right after completion)
          !pretestDate || isToday(pretestDate) ? (
            <div className="mb-8 text-center p-6 bg-[#f3ecda] rounded-lg border border-[#dad6d9]">
              <div className="flex items-center justify-center mb-2">
                <PartyPopper className="h-8 w-8 text-[#6c8376] mr-2" />
                <h2 className="text-xl font-semibold text-[#406368]">Great job completing all tests!</h2>
                <PartyPopper className="h-8 w-8 text-[#6c8376] ml-2" />
              </div>
              <p className="text-lg text-[#6c8376]">Please return any time tomorrow to start the training.</p>
            </div>
          ) : (
            // If it's a different day, show a smaller reminder with a button to proceed
            <div className="mb-8 text-center p-4 bg-[#f3ecda] rounded-lg border border-[#dad6d9]">
              <p className="text-[#6c8376] mb-4">
                You have completed all pretest activities. You can now proceed to training.
              </p>
              <Button
                className="bg-[#406368] hover:bg-[#6c8376]"
                onClick={() => {
                  // Transition to training phase
                  if (typeof onPhaseTransition === 'function') {
                    onPhaseTransition('training');
                  }
                }}
              >
                Begin Training
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )
        )}

        {/* Training Section */}
        {currentPhase === 'training' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-[#406368]">Training Sessions</h2>
            <p>Please wear <strong>headphones</strong> during all portions of this app. Please complete the activities in one session.</p>

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
                  completedTests={completedTests} // Pass completedTests to check completion status directly
                />
              ))}
            </div>
          </div>
        )}

        {/* Posttest1 Section - Only show if current phase is posttest1 AND the date requirement is met */}
        {currentPhase === 'posttest1' && posttestAvailability.posttest1 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-[#406368]">1-Week Follow-up Activities</h2>
            <p>Please wear <strong>headphones</strong> during all portions of this app. Please complete the activities in one session.</p>

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
              Please return on {getExpectedDate('posttest1')} to complete the follow-up activities.
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
              Please return on {getExpectedDate('posttest2')} to complete the final activities.
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
              Please complete the final activities to finish the study.
            </p>
          </div>
        )}

        {/* Posttest2 Section - Only show if current phase is posttest2 AND the date requirement is met */}
        {currentPhase === 'posttest2' && posttestAvailability.posttest2 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-[#406368]">1-Month Follow-up Activities</h2>
            <p>Please wear <strong>headphones</strong> during all portions of this app. Please complete the activities in one session.</p>

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
    </div >
  );
};

export default PhaseSelection;