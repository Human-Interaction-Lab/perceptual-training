import React, { useState, useEffect } from 'react';
import Admin from './Admin';
import AdminLogin from './AdminLogin';
import PhaseSelection from './PhaseSelection';
import { Button } from './components/ui/button';
import { Label } from './components/ui/label';
import { Input } from './components/ui/input';
import TrainingFAQ from './faq.accordion';
import WelcomeSection from './welcomesection';
import IntelligibilityTest from './components/intelligibilityTest';
import ListeningEffortTest from './components/listeningEffortTest';
import ComprehensionTest from './components/comprehensionTest';
import { COMPREHENSION_DATA } from './components/comprehensionData';
import DemographicsForm from './demographics'
import TrainingSession from './components/trainingSession';
import { TRAINING_DATA, TRAINING_TEST_STIMULI } from './components/trainingData';
import audioService from './services/audioService';
import { getStoriesForPhase } from './utils/randomization';
import config from './config';
// import { cn, formatDuration, calculateProgress, formatDate, formatPhaseName } from './lib/utils';

const App = () => {
  const [phase, setPhase] = useState('auth');
  const [authMode, setAuthMode] = useState('login');
  const [currentStimulus, setCurrentStimulus] = useState(0);
  const [userResponse, setUserResponse] = useState('');
  const [trainingDay, setTrainingDay] = useState(1);
  const [showComplete, setShowComplete] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('pretest');
  const [pretestDate, setPretestDate] = useState(null);
  const [canProceedToday, setCanProceedToday] = useState(true);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [rating, setRating] = useState(null);
  const [completedTests, setCompletedTests] = useState({});
  const [currentTestType, setCurrentTestType] = useState('intelligibility'); // 'intelligibility', 'effort', 'comprehension'
  const [currentStoryId, setCurrentStoryId] = useState('Comp_01');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemographicsCompleted, setIsDemographicsCompleted] = useState(false);
  const [phaseStories, setPhaseStories] = useState({});
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  // const [comprehensionResponses, setComprehensionResponses] = useState([]);

  // Reset states when phase changes - with session persistence
  useEffect(() => {
    // Skip reset if in demographics phase
    if (phase === 'demographics') {
      return;
    }

    // Try to load saved progress for current user and phase
    const userId = localStorage.getItem('userId');
    if (userId && phase !== 'selection' && phase !== 'auth') {
      const savedProgressKey = `progress_${userId}_${phase}_${currentTestType || ''}`;
      const savedProgress = localStorage.getItem(savedProgressKey);

      if (savedProgress) {
        try {
          const progress = JSON.parse(savedProgress);
          console.log(`Resuming saved progress for ${phase} (${currentTestType}):`, progress);

          // Restore state from saved progress
          setCurrentStimulus(progress.stimulus || 0);
          setUserResponse(progress.response || '');
          if (progress.rating) setRating(progress.rating);
          if (progress.questionIndex !== undefined) setQuestionIndex(progress.questionIndex);
          if (progress.currentStoryIndex !== undefined) setCurrentStoryIndex(progress.currentStoryIndex);

          // Don't reset other states when resuming
          return;
        } catch (error) {
          console.error('Error parsing saved progress:', error);
        }
      }
    }

    // If no saved progress or error parsing, use default initial values
    setCurrentStimulus(0);
    setUserResponse('');
    setShowComplete(false);
  }, [phase, currentTestType]);

  // Add a special check to ensure demographics data is loaded when needed
  useEffect(() => {
    // If we've transitioned to demographics phase, ensure we're in the right state
    if (phase === 'demographics') {
      console.log('Demographics phase entered - ensuring clean state');
      // When entering demographics, make sure we:
      // 1. Reset the demographics completion flags to allow form to work
      setIsDemographicsCompleted(false);

      // 2. Update completedTests to match (important for consistency)
      setCompletedTests(prev => ({
        ...prev,
        demographics: false,
        pretest_demographics: false
      }));

      // 3. DON'T change currentPhase to prevent confusion
      // This means demographics phase is NOT the same as pretest phase
    }
  }, [phase]);

  // Log state changes for debugging and save progress
  useEffect(() => {
    console.log('State Update:', {
      phase,
      currentPhase,
      trainingDay,
      currentStimulus,
      showComplete,
      stimuliLength: getCurrentStimuli()?.length
    });

    // Save progress for resuming later - applies to all test phases
    const userId = localStorage.getItem('userId');
    if (userId && phase !== 'selection' && phase !== 'auth' && phase !== 'demographics'
      && !showComplete && currentTestType) {

      // Create a unique key for this user, phase and test type
      const progressKey = `progress_${userId}_${phase}_${currentTestType}`;

      // Save all relevant state for this test type
      const progressData = {
        stimulus: currentStimulus,
        response: userResponse,
        timestamp: new Date().toISOString()
      };

      // Add test-specific data
      if (currentTestType === 'effort' && rating !== null) {
        progressData.rating = rating;
      }

      if (currentTestType === 'comprehension') {
        progressData.questionIndex = questionIndex;
        progressData.currentStoryIndex = currentStoryIndex;
      }

      // Only save if we're actively in a test (stimulus > 0 or explicit save)
      if (currentStimulus > 0 || phase === 'training') {
        console.log(`Saving progress for ${progressKey}`, progressData);
        localStorage.setItem(progressKey, JSON.stringify(progressData));
      }
    }
  }, [phase, currentPhase, trainingDay, currentStimulus, currentTestType,
    userResponse, rating, questionIndex, currentStoryIndex, showComplete]);

  // stimuli data structure
  const stimuli = {
    pretest: {
      intelligibility: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        audioUrl: `/audio/pretest/intelligibility/${String(i + 1).padStart(2, '0')}`,
        type: 'Int',
        responseType: 'full-phrase'
      })),
      effort: Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        audioUrl: `/audio/pretest/effort/${String(i + 1).padStart(2, '0')}`,
        type: 'Eff',
        responseType: 'final-word',
        isHighPredictability: i < 15 // First 15 are high predictability
      })),
      comprehension: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        audioUrl: `/audio/pretest/comprehension/${Math.floor(i / 10) + 1}/${String(i % 10 + 1).padStart(2, '0')}`,
        type: 'Comp',
        responseType: 'multiple-choice',
        storyNumber: Math.floor(i / 10) + 1
      }))
    },
    training: {
      // Four training days, each with their own set of stimuli
      ...Array.from({ length: 4 }, (_, day) => ({
        [`day${day + 1}`]: Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          audioUrl: `/audio/training/day${day + 1}/${String(i + 1).padStart(2, '0')}`,
          type: 'Trn',
          responseType: 'training',
          day: day + 1
        }))
      })).reduce((acc, curr) => ({ ...acc, ...curr }), {})
    },
    posttest: {
      // Same structure as pretest
      intelligibility: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        audioUrl: `/audio/posttest/intelligibility/${String(i + 1).padStart(2, '0')}`,
        type: 'Int',
        responseType: 'full-phrase'
      })),
      effort: Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        audioUrl: `/audio/posttest/effort/${String(i + 1).padStart(2, '0')}`,
        type: 'Eff',
        responseType: 'final-word',
        isHighPredictability: i < 15
      })),
      comprehension: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        audioUrl: `/audio/posttest/comprehension/${Math.floor(i / 10) + 1}/${String(i % 10 + 1).padStart(2, '0')}`,
        type: 'Comp',
        responseType: 'multiple-choice',
        storyNumber: Math.floor(i / 10) + 1
      }))
    }
  };

  const getCurrentStimuli = () => {
    let currentStimuli;

    switch (phase) {
      case 'pretest':
        currentStimuli = stimuli.pretest;
        break;
      case 'training':
        currentStimuli = stimuli.training[trainingDay];
        break;
      case 'posttest':
        currentStimuli = stimuli.posttest;
        break;
      default:
        currentStimuli = [];
    }

    if (!currentStimuli || currentStimuli.length === 0) {
      console.warn(`No stimuli found for phase: ${phase}${phase === 'training' ? `, day: ${trainingDay}` : ''}`);
      return [];
    }

    return currentStimuli;
  };

  // Add a function to initialize story assignments when user logs in
  const initializeStoryAssignments = (uid) => {
    const { randomizeComprehensionStories } = require('./utils/randomization');
    const storyAssignments = randomizeComprehensionStories(uid);
    setPhaseStories(storyAssignments);
    console.log('Comprehension story assignments:', storyAssignments);
  };

  // if all phases completed and submited, give thank you message
  const renderCompleted = () => (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-[#406368] mb-4">
            Study Completed
          </h2>
          <p className="text-[#6e6e6d] mb-4">
            Thank you for completing all phases of the study! Your participation is greatly appreciated.
          </p>
        </div>
      </div>
    </div>
  );


  const renderTrainingSession = () => {
    // Get training data based on day
    const getTrainingData = () => {
      console.log(`App.js: Getting training data for day ${trainingDay}`);
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

    const trainData = getTrainingData();

    return (
      <TrainingSession
        trainingDay={trainingDay}
        trainingStimuli={trainData.stimuli}
        intelligibilityStimuli={trainData.testStimuli}
        userId={userId}
        onComplete={(day) => {
          // Mark this training day as completed in completedTests
          setCompletedTests(prev => ({
            ...prev,
            [`training_day${day}`]: true
          }));

          if (day >= 4) {
            console.log('Training day 4 completed, advancing to posttest1 phase');
            setCurrentPhase('posttest1');
          }
          setPhase('selection');
          setShowComplete(true);
          setTimeout(() => {
            setShowComplete(false);
          }, 2000);
        }}
        onBack={() => {
          setPhase('selection');
        }}
      />
    );
  };

  // This helper function gets the text to display for training phases
  //const getCurrentStimulusText = () => {
  //  const currentStimuli = getCurrentStimuli();
  //  if (!currentStimuli || currentStimuli.length === 0) return '';
  //  return phase === 'training'
  //    ? currentStimuli[currentStimulus]?.text
  //    : '';
  //};


  const handleLogin = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Check if this is a test user that was recently initialized
        if (userId.startsWith('test_') && data.testUsersInitialized) {
          console.log('Recently initialized test user detected! Clearing all localStorage progress...');

          // Clear any existing localStorage progress for test users
          const progressKeys = [
            // Training progress - both new format
            `progress_${userId}_training_day1`,
            `progress_${userId}_training_day2`,
            `progress_${userId}_training_day3`,
            `progress_${userId}_training_day4`,

            // Training progress - legacy format
            `training_progress_day_1`,
            `training_progress_day_2`,
            `training_progress_day_3`,
            `training_progress_day_4`,

            // Test progress
            `progress_${userId}_pretest_intelligibility`,
            `progress_${userId}_pretest_effort`,
            `progress_${userId}_pretest_comprehension`,
            `progress_${userId}_posttest1_intelligibility`,
            `progress_${userId}_posttest1_effort`,
            `progress_${userId}_posttest1_comprehension`,
            `progress_${userId}_posttest2_intelligibility`,
            `progress_${userId}_posttest2_effort`,
            `progress_${userId}_posttest2_comprehension`,
            `progress_${userId}_demographics_demographics`
          ];

          // Remove all progress keys
          progressKeys.forEach(key => {
            if (localStorage.getItem(key) !== null) {
              console.log(`Clearing localStorage key: ${key}`);
              localStorage.removeItem(key);
            }
          });

          console.log('Test user localStorage progress cleared');
          // Show a toast or notification to the user
          alert('Test users have been reinitialized. All progress has been reset.');
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', userId);
        setUserId(userId); // Ensure this is also set in component state
        setCurrentPhase(data.currentPhase);
        setTrainingDay(data.trainingDay);
        setPretestDate(data.pretestDate);
        setCanProceedToday(data.canProceedToday);
        setCompletedTests(data.completedTests || {});
        // Initialize story assignments
        initializeStoryAssignments(userId);

        // Explicitly check for demographics completion from multiple sources
        const completedTestsObj = data.completedTests || {};
        const demoCompleted =
          completedTestsObj.demographics === true ||
          completedTestsObj.pretest_demographics === true ||
          data.isDemographicsCompleted === true;

        // Log the demographic completion status for debugging
        console.log('Demographics completed status:', {
          fromData: data.isDemographicsCompleted,
          fromCompletedTests: completedTestsObj.demographics || completedTestsObj.pretest_demographics,
          finalStatus: demoCompleted
        });

        // Ensure demographics completion is properly set
        setIsDemographicsCompleted(demoCompleted);

        // Update completedTests to include demographics status if needed
        if (demoCompleted && !completedTestsObj.demographics && !completedTestsObj.pretest_demographics) {
          setCompletedTests(prev => ({
            ...prev,
            demographics: true,
            pretest_demographics: true
          }));
        }
        setPhase('selection');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    }
  };


  const handleRegister = async () => {
    try {
      setError('');
      // Add password match validation
      if (authMode === 'register' && password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (!email.includes('@')) {
        setError('Please enter a valid email address');
        return;
      }

      const response = await fetch(`${config.API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, password, email }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Registration successful! Please log in.');
        setAuthMode('login');
        setPassword('');
        setConfirmPassword(''); // Clear confirm password as well
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Registration failed. Please try again.');
    }
  };

  // Handle intelligibility test submissions
  const handleIntelligibilitySubmit = async () => {
    if (!validateResponse()) return;

    try {
      const token = localStorage.getItem('token');
      
      // Check if this is the last stimulus (20th file, index 19)
      const isLastStimulus = currentStimulus === 19;
      
      // Send the response to the backend with an isTestCompleted flag when it's the last stimulus
      await fetch(`${config.API_BASE_URL}/api/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phase,
          testType: 'intelligibility',
          stimulusId: `${phase}_intel_${currentStimulus + 1}`,
          response: userResponse,
          isTestCompleted: isLastStimulus  // Flag to tell backend this completes the entire test
        }),
      });

      // Prevent multiple submissions of last stimulus
      if (isLastStimulus) {
        // Disable the submit button or add loading state
        setIsSubmitting(true);
        
        // Also mark test as completed in database with a direct API call
        try {
          // Make a separate call to explicitly mark the test as completed
          await fetch(`${config.API_BASE_URL}/api/test-completed`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              phase,
              testType: 'intelligibility',
              completed: true
            }),
          });
          console.log(`Explicitly marked ${phase} intelligibility test as completed`);
        } catch (markError) {
          console.error('Error marking test as completed:', markError);
          // Continue even if this fails - the isTestCompleted flag should still work
        }
      }

      handleResponseSuccess();
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Failed to submit response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle effort test submissions
  const handleEffortSubmit = async () => {
    if (!validateResponse()) return;

    try {
      // Ensure rating is a number and at least 1
      const ratingValue = typeof rating === 'number' ? Math.max(1, rating) : 1;
      const token = localStorage.getItem('token');
      
      // Check if this is the last stimulus (30th file, index 29)
      const isLastStimulus = currentStimulus === 29;
      
      const response = await fetch(`${config.API_BASE_URL}/api/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phase,
          testType: 'effort',
          stimulusId: `${phase}_effort_${currentStimulus + 1}`,
          response: userResponse,
          trainingDay: 1,
          rating: ratingValue,  // Use the validated rating value
          isTestCompleted: isLastStimulus  // Flag to tell backend this completes the entire test
        }),
      });

      // Check response status and log outcome
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(`Server error: ${response.status} ${errorData.message || 'Unknown error'}`);
      }

      const responseData = await response.json();
      console.log('Server response:', responseData);

      // Prevent multiple submissions of last stimulus
      if (isLastStimulus) {
        setIsSubmitting(true);
        
        // Also mark test as completed in database with a direct API call
        try {
          // Make a separate call to explicitly mark the test as completed
          await fetch(`${config.API_BASE_URL}/api/test-completed`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              phase,
              testType: 'effort',
              completed: true
            }),
          });
          console.log(`Explicitly marked ${phase} effort test as completed`);
        } catch (markError) {
          console.error('Error marking test as completed:', markError);
          // Continue even if this fails - the isTestCompleted flag should still work
        }
      }

      // Store the current values before resetting
      const currentStim = currentStimulus;
      const currentResponse = userResponse;
      const currentRating = ratingValue;

      // Call handleResponseSuccess AFTER ensuring the data was sent successfully
      handleResponseSuccess();

      // Log to confirm state was updated correctly after submission
      console.log('After submission:', {
        previousStimulus: currentStim,
        newStimulus: currentStimulus,
        previousResponse: currentResponse,
        newResponse: userResponse,
        previousRating: currentRating,
        newRating: rating
      });
    } catch (error) {
      console.error('Error submitting response:', error);
      alert(`Failed to submit response: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle comprehension test submissions (reusing previous code)
  const handleComprehensionSubmit = async () => {
    if (!validateResponse()) return;

    try {
      const token = localStorage.getItem('token');
      const currentStory = COMPREHENSION_DATA[currentStoryId];
      const currentQuestion = currentStory.questions[questionIndex];
      const optionLabels = ['A', 'B', 'C', 'D', 'E'];
      const assignedStories = getStoriesForPhase(phase, userId);

      // Create standardized stimulusId format
      const storyNum = currentStoryId.replace('Comp_', '');
      const questionNum = questionIndex + 1;
      const stimulusId = `${phase}_comprehension_${storyNum}_${questionNum}`;
      
      // Determine if this is the last question of the last story
      const isLastStory = currentStoryIndex >= assignedStories.length - 1;
      const isLastQuestion = questionIndex >= currentStory.questions.length - 1;
      const isTestCompleted = isLastStory && isLastQuestion;
      
      // Log test completion status
      if (isTestCompleted) {
        console.log(`This is the last question of the last story - completing comprehension test`);
      }

      await fetch(`${config.API_BASE_URL}/api/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phase,
          testType: 'comprehension',
          stimulusId: stimulusId,
          response: optionLabels[userResponse],
          isCorrect: optionLabels[userResponse] === currentQuestion.answer,
          isTestCompleted: isTestCompleted  // Flag to tell backend this completes the entire test
        }),
      });
      
      // If this completes the whole comprehension test
      if (isTestCompleted) {
        // Make a separate call to explicitly mark the test as completed
        try {
          await fetch(`${config.API_BASE_URL}/api/test-completed`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              phase,
              testType: 'comprehension',
              completed: true
            }),
          });
          console.log(`Explicitly marked ${phase} comprehension test as completed`);
        } catch (markError) {
          console.error('Error marking test as completed:', markError);
          // Continue even if this fails - the isTestCompleted flag should still work
        }
      }

      // Move to next question or complete the test
      if (questionIndex < currentStory.questions.length - 1) {
        // Move to next question in current story
        setQuestionIndex(prevIndex => prevIndex + 1);
      } else if (currentStoryIndex < assignedStories.length - 1) {
        // Move to the next assigned story
        setCurrentStoryIndex(prevIndex => prevIndex + 1);
        setQuestionIndex(0);

        // Save the progress for the new story
        const userId = localStorage.getItem('userId');
        if (userId) {
          const progressKey = `progress_${userId}_${phase}_comprehension`;
          const progressData = {
            questionIndex: 0,
            currentStoryIndex: currentStoryIndex + 1,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem(progressKey, JSON.stringify(progressData));
        }
      } else {
        // Complete the comprehension test
        setCompletedTests(prev => ({
          ...prev,
          [`${phase}_comprehension`]: true
        }));
        setShowComplete(true);

        // Clear saved progress for completed comprehension test
        const userId = localStorage.getItem('userId');
        if (userId) {
          const progressKey = `progress_${userId}_${phase}_comprehension`;
          localStorage.removeItem(progressKey);
          console.log(`Cleared saved progress for completed comprehension test: ${progressKey}`);
        }

        // Update phase if needed
        if (phase === 'pretest') {
          setCurrentPhase('training');
        } else if (phase === 'posttest1') {
          // When posttest1 is completed, show posttest2 if available
          setCurrentPhase('posttest2');
        } else if (phase === 'posttest2') {
          setCurrentPhase('completed');
        }

        // Reset states after delay
        setTimeout(() => {
          setPhase('selection');
          setShowComplete(false);
          setCurrentStoryIndex(0);
          setQuestionIndex(0);
          setUserResponse('');
        }, 2000);
      }

      // Reset user response for next question
      // For comprehension test, explicitly set to null to ensure consistent state
      setUserResponse(null);
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Failed to submit response. Please try again.');
    }
  };

  // validate the responses
  const validateResponse = () => {
    switch (currentTestType) {
      case 'intelligibility':
        if (!userResponse.trim()) {
          alert('Please enter the phrase you heard.');
          return false;
        }
        break;

      case 'effort':
        if (!userResponse.trim()) {
          alert('Please enter the final word you heard.');
          return false;
        }
        if (rating === null || rating < 1) {
          alert('Please rate your listening effort.');
          return false;
        }
        break;

      case 'comprehension':
        if (userResponse === null) {
          alert('Please select an answer.');
          return false;
        }
        break;

      case 'training':
        // Training might have different validation requirements
        return true;
    }

    return true;
  };


  // Handle successful response submission
  const handleResponseSuccess = () => {
    const isLastStimulus = (currentStimulus === 19 && (currentTestType === 'intelligibility' || currentTestType === 'comprehension')) || currentStimulus === 29;

    if (isLastStimulus) {
      // Update completedTests for current test type
      setCompletedTests(prev => ({
        ...prev,
        [`${phase}_${currentTestType}`]: true,
        // Also add the non-prefixed version for backward compatibility
        [currentTestType]: true
      }));

      // Show completion message
      setShowComplete(true);

      // Clear saved progress for completed test
      const userId = localStorage.getItem('userId');
      if (userId) {
        const progressKey = `progress_${userId}_${phase}_${currentTestType}`;
        localStorage.removeItem(progressKey);
        console.log(`Cleared saved progress for completed test: ${progressKey}`);
      }

      // Handle phase transitions and user progress
      setTimeout(() => {
        // Update phase if needed based on test completion
        switch (currentTestType) {
          case 'intelligibility':
            // Keep same phase, just allow effort test to be available
            break;
          case 'effort':
            // Keep same phase, allow comprehension test to be available
            break;
          case 'comprehension':
            // Move to next major phase
            if (phase === 'pretest') {
              setCurrentPhase('training');
            } else if (phase === 'posttest1') {
              // Mark posttest1 as fully completed
              setCompletedTests(prev => ({
                ...prev,
                [`${phase}_COMPLETED`]: true,
                posttest1_COMPLETED: true
              }));

              // Set phase to posttest2 but it will still be date-restricted
              setCurrentPhase('posttest2');
              console.log('Posttest1 completed. Setting phase to posttest2 (will be date-restricted)');
            } else if (phase === 'posttest2') {
              // Mark everything as completed
              setCurrentPhase('completed');
            }
            break;
          default:
            break;
        }

        // Reset states
        setPhase('selection');
        setShowComplete(false);
        setCurrentStimulus(0);
        // For comprehension test specifically, use null to ensure proper button disabling
        if (currentTestType === 'comprehension') {
          setUserResponse(null);
        } else {
          setUserResponse('');
        }
        setRating(null);
      }, 2000);
    } else {
      // Just move to next stimulus
      setCurrentStimulus(prev => prev + 1);
      // For comprehension test specifically, use null to ensure proper button disabling
      if (currentTestType === 'comprehension') {
        setUserResponse(null);
      } else {
        setUserResponse('');
      }
      setRating(null);
    }
  };


  // handle phase select
  const handlePhaseSelect = async (selectedPhase, testType, day = null) => {
    // Special handling for demographics - completely separated from pretest
    if (selectedPhase === 'demographics') {
      console.log('Setting phase to demographics - completely separate from pretest');

      // Explicitly reset demographic completion state to ensure clean form
      setIsDemographicsCompleted(false);
      setCompletedTests(prev => ({
        ...prev,
        demographics: false,
        pretest_demographics: false
      }));

      // Navigate to demographics phase
      setPhase('demographics');
      return;
    }

    // For training phase
    if (selectedPhase === 'training') {
      console.log(`Setting training day ${day}`);
      setCurrentPhase(selectedPhase);
      setCurrentTestType('training');
      if (day) {
        setTrainingDay(day);
      }
      setPhase(selectedPhase);

      // Start preloading in the background without awaiting completion
      try {
        audioService.preloadAudioFiles(selectedPhase, day || trainingDay)
          .catch(error => console.error('Error preloading training files:', error));
      } catch (error) {
        console.error('Failed to start preloading training files:', error);
        // Non-critical error, don't block navigation
      }

      return;
    }

    // For pretest and posttest phases
    // Determine which test type to start based on completed tests
    let startingTestType = testType || 'intelligibility';

    // Ensure we have consistent phase names
    const phasePrefix = selectedPhase; // Could be 'pretest', 'posttest1', or 'posttest2'

    console.log(`Phase select: ${selectedPhase}, test type: ${testType}`);
    console.log(`Completed tests:`, completedTests);

    // Simple check for completed tests - don't block navigation
    if (testType !== 'intelligibility' && !completedTests[`${phasePrefix}_intelligibility`]) {
      startingTestType = 'intelligibility';
    } else if (testType !== 'effort' &&
      completedTests[`${phasePrefix}_intelligibility`] &&
      !completedTests[`${phasePrefix}_effort`]) {
      startingTestType = 'effort';
    } else if (testType !== 'comprehension' &&
      completedTests[`${phasePrefix}_intelligibility`] &&
      completedTests[`${phasePrefix}_effort`] &&
      !completedTests[`${phasePrefix}_comprehension`]) {
      startingTestType = 'comprehension';
    }

    // Immediately update state to navigate to the test
    setCurrentPhase(selectedPhase);
    setCurrentTestType(startingTestType);
    setPhase(selectedPhase);
    setCurrentStimulus(0);

    // Initialize user response with correct type based on test type
    if (startingTestType === 'comprehension') {
      setUserResponse(null); // Multiple choice uses null for no selection
    } else {
      setUserResponse(''); // Text input types use empty string
    }
    setRating(null);

    // CRITICAL CHANGE: NO PRELOADING AT ALL - not even in the background
    // This ensures we don't trigger any file loading until the exact moment we need each file
    console.log(`DISABLED: No preloading for ${selectedPhase} - will load files only when needed`);

    // The strategy is now to load each file exactly when it's needed, not in advance
    // This should prevent race conditions and waiting for preloading
  };


  // Completely rewritten handlePlayAudio function with direct randomization
  const handlePlayAudio = async (input) => {
    try {
      console.log(`SIMPLIFIED handlePlayAudio - phase: ${phase}, testType: ${currentTestType}, stimulus: ${currentStimulus + 1}`);

      // Check if we're playing a full story (input will be storyId like "Comp_01")
      if (typeof input === 'string' && input.startsWith('Comp_')) {
        // Story playback uses the most basic direct method
        const storyNum = input.replace('Comp_', '');
        console.log(`Playing story ${storyNum} directly - no randomization or preloading`);

        const totalClips = 2; // Changed from 10 to 2 clips per story
        for (let i = 1; i <= totalClips; i++) {
          // Use the simplest, most direct path
          const url = `${config.API_BASE_URL}/audio/${phase}/comprehension/${storyNum}/${i}`;
          console.log(`Directly accessing audio file URL: ${url}`);

          try {
            const token = localStorage.getItem('token');
            const response = await fetch(url, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
              throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            await audioService.playAudioFromUrl(`${config.API_BASE_URL}${data.url}`);
          } catch (clipError) {
            console.error(`Error playing clip ${i}:`, clipError);
            // Continue with the next clip regardless
          }

          if (i < totalClips) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        return true;
      }
      // Intelligibility test with proper randomization
      else if (currentTestType === 'intelligibility') {
        console.log('Using randomized intelligibility file access with PRE-REQUEST randomization');

        try {
          // Extract userId from token for randomization
          const userId = localStorage.getItem('userId');
          if (!userId) {
            throw new Error('User ID not found in localStorage');
          }

          // Get the randomized sequence directly in the App component
          const { getGroupForPhase } = require('./utils/randomization');
          const randomizedFiles = getGroupForPhase(phase, null, userId);
          
          // Map the sequential index to the randomized file number
          const sequentialIndex = currentStimulus;
          const randomizedFileNumber = randomizedFiles[sequentialIndex];
          
          console.log(`*** PRE-REQUEST RANDOMIZATION: Index ${sequentialIndex+1} maps to file ${randomizedFileNumber} ***`);
          console.log(`Randomized files for ${phase}: ${randomizedFiles.slice(0, 5)}...`);
          
          if (!randomizedFileNumber) {
            console.error(`ERROR: Could not get randomized file number for index ${sequentialIndex}`);
            throw new Error('Randomization failed - invalid file index');
          }
          
          // Use the regular playTestAudio instead of the randomized version
          // This ensures we directly use the file number
          console.log(`Using direct playTestAudio with randomizedFileNumber=${randomizedFileNumber}`);
          
          await audioService.playTestAudio(
            phase,
            'intelligibility',
            null,
            randomizedFileNumber // Use the randomized file number directly
          );

          return true;
        } catch (error) {
          console.error('Randomized access failed, trying fallback:', error);

          // FALLBACK: Try direct access to a static file as a last resort, but using randomized file number
          try {
            // Get the randomized file number from the sequence
            const { getGroupForPhase } = require('./utils/randomization');
            const userId = localStorage.getItem('userId');
            
            // Get the randomized sequence for the current phase
            const randomizedFiles = getGroupForPhase(phase, null, userId);
            
            // Map the sequential index to the randomized file number
            const randomizedFileNumber = randomizedFiles[currentStimulus];
            
            if (!randomizedFileNumber) {
              console.error(`ERROR in fallback: Could not get randomized file number for index ${currentStimulus}`);
              throw new Error('Randomization failed in fallback - invalid file index');
            }
            
            console.log(`App.js fallback: Using randomized file number: ${randomizedFileNumber} instead of sequential: ${currentStimulus + 1}`);
            console.log(`Fallback randomized files: ${randomizedFiles.slice(0, 5)}...`);
            
            // Instead of trying a public file that doesn't exist, use the regular API endpoint directly
            // But with the randomized file number
            console.log(`Using API endpoint fallback with randomized number ${randomizedFileNumber}`);
            
            const token = localStorage.getItem('token');
            // Tell the server we want file #randomizedFileNumber (not a sequential index)
            const url = `${config.API_BASE_URL}/audio/${phase}/intelligibility/null/${randomizedFileNumber}`;
            console.log(`Fallback API URL: ${url}`);
            
            const response = await fetch(url, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
              throw new Error(`Server error: ${response.status}`);
            }
            
            const data = await response.json();
            await audioService.playAudioFromUrl(`${config.API_BASE_URL}${data.url}`);
            return true;
          } catch (fallbackError) {
            console.error('All fallback attempts failed');
            throw new Error('AUDIO_NOT_FOUND');
          }
        }
      }
      // Effort test with proper randomization
      else if (currentTestType === 'effort') {
        console.log('Using randomized effort file access');

        try {
          // Extract userId from token for randomization
          const userId = localStorage.getItem('userId');
          if (!userId) {
            throw new Error('User ID not found in localStorage');
          }

          console.log(`Playing randomized effort audio for stimulus ${currentStimulus + 1}`);

          // Use the specialized effort randomized audio function
          await audioService.playRandomizedEffortAudio(
            phase,
            currentStimulus + 1,
            userId
          );

          return true;
        } catch (error) {
          console.error('Randomized effort file access failed:', error);

          // No good fallback for effort files, unlike intelligibility
          throw new Error('AUDIO_NOT_FOUND');
        }
      }
      // Simplest fallback method
      else {
        console.log('Using generic fallback method for unknown test type');

        // Very simple direct access attempt
        try {
          // Direct file access by stimulus number - no randomization or complexity
          const url = `${config.API_BASE_URL}/audio/${phase}/${currentTestType || 'intelligibility'}/null/${currentStimulus + 1}`;
          console.log(`Last-resort direct URL: ${url}`);

          const token = localStorage.getItem('token');
          const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }

          const data = await response.json();
          await audioService.playAudioFromUrl(`${config.API_BASE_URL}${data.url}`);
          return true;
        } catch (error) {
          console.error('Generic fallback method failed');
          throw new Error('AUDIO_NOT_FOUND');
        }
      }
    } catch (error) {
      console.error('Error playing audio:', error);

      // Handle different error types 
      if (error.message === 'AUDIO_NOT_FOUND' ||
        error.message.includes('not found') ||
        error.message.includes('timeout') ||
        error.message.includes('404')) {
        // Pass this specific error to the components to handle
        return false;
      } else {
        // For general errors
        console.error('General audio error:', error);
        audioService.dispose();
        return false;
      }
    } finally {
      // Always ensure we clean up any audio resources
      console.log('Finished audio playback attempt');
    }
  };

  // Handle admin login success
  const handleAdminLoginSuccess = () => {
    setShowAdminLogin(false);
    setIsAdminLoggedIn(true);
  };

  // Add this component to display when user can't proceed
  const NotAvailableMessage = () => (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-[#406368] mb-4">
            Please Return Tomorrow
          </h2>
          <p className="text-[#6e6e6d] mb-4">
            To maintain the effectiveness of the training, each session must be completed on consecutive days.
            Please return tomorrow to continue your training.
          </p>
        </div>
      </div>
    </div>
  );

  // Add a logout handler for admin
  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAdminLoggedIn(false);
    setShowAdminLogin(false);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (authMode === 'login') {
      handleLogin();
    } else {
      handleRegister();
    }
  };


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

  // renderAuth() updated
  const renderAuth = () => (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white py-12">
      {/* Browser compatibility warning for non-Chrome browsers */}
      {getBrowserType() !== 'chrome' && (
        <div className="max-w-5xl mx-auto mb-4 bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-md">
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

      {/* Welcome Section - wider width */}
      <WelcomeSection />

      <div className="bg-white shadow-xl rounded-lg px-8 py-6 mb-4 border border-[#dad6d9] max-w-5xl mx-auto px-4 mb-11">
        <div className="max-w-md mx-auto">
          {/* Logo/Title Section */}
          <div className="text-center mb-8">
            <p className="text-[#6e6e6d]">
              {authMode === 'login'
                ? 'Welcome back! Please login to continue your study.'
                : 'Create an account to participate in the study.'}
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-white shadow-xl rounded-lg px-8 py-6 mb-4 border border-[#dad6d9]">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            {authMode === 'login' ? 'Login' : 'Create Account'}
          </h2>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Form with onSubmit handler */}
          <form onSubmit={handleFormSubmit}>
            <div className="space-y-5">
              <div>
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  type="text"
                  placeholder="Enter your user ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#406368] hover:bg-[#6c8376] text-white transition-colors"
              >
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setError('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-[#406368] hover:text-[#6c8376]"
            >
              {authMode === 'login'
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </Button>
          </div>
        </div>

        {/* Admin Access */}
        <div className="text-center mt-4">
          <Button
            variant="link"
            onClick={() => setShowAdminLogin(true)}
            className="text-gray-500 hover:text-[#406368]"
          >
            Access Admin Panel
          </Button>
        </div>
      </div>

      {/* FAQ section */}
      <TrainingFAQ />
    </div>
  );


  const renderAudioTest = () => {
    const renderTestComponent = () => {
      switch (currentTestType) {
        case 'intelligibility':
          return (
            <IntelligibilityTest
              userResponse={userResponse}
              onResponseChange={setUserResponse}
              onSubmit={handleIntelligibilitySubmit}
              currentStimulus={currentStimulus}
              totalStimuli={20} // Set to your desired number
              onPlayAudio={handlePlayAudio}
            />
          );

        case 'effort':
          return (
            <ListeningEffortTest
              userResponse={userResponse}
              rating={rating}
              onResponseChange={setUserResponse}
              onRatingChange={setRating}
              onSubmit={handleEffortSubmit}
              currentStimulus={currentStimulus}
              totalStimuli={30} // Set to your desired number
              onPlayAudio={handlePlayAudio}
            />
          );

        case 'comprehension':
          // Get the assigned stories for the current phase
          const assignedStories = phaseStories[phase] || [];

          // If no stories are assigned yet, use default
          const storyId = assignedStories.length > 0
            ? assignedStories[currentStoryIndex % assignedStories.length]
            : "Comp_01";

          const currentStory = COMPREHENSION_DATA[storyId];
          const currentQuestion = currentStory?.questions[questionIndex] || {};

          return (
            <ComprehensionTest
              storyId={storyId}
              question={currentQuestion.question}
              options={currentQuestion.options}
              userResponse={userResponse}
              onResponseChange={setUserResponse}
              onSubmit={handleComprehensionSubmit}
              currentStimulus={questionIndex}
              totalStimuli={currentStory?.questions.length || 10}
              currentStoryIndex={currentStoryIndex} // Pass this prop for proper numbering
              onPlayAudio={handlePlayAudio}
            />
          );

        default:
          return null;
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white shadow-xl rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-[#406368] text-white px-6 py-4">
              <h2 className="text-xl font-semibold">
                {phase === 'pretest' || phase === 'intelligibility' ? 'Pre-test' : 'Post-test'}: {
                  currentTestType === 'intelligibility' ? 'Speech Intelligibility' :
                    currentTestType === 'effort' ? 'Listening Effort' :
                      'Story Comprehension'
                }
              </h2>
            </div>

            {/* Content */}
            <div className="p-6 bg-white">
              {renderTestComponent()}
            </div>
          </div>
        </div>

        {/* Completion Modal */}
        {showComplete && currentStimulus === getCurrentStimuli().length - 1 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-[#f3ecda] rounded-lg max-w-md w-full p-6 shadow-xl">
              <h3 className="text-xl font-semibold text-[#406368] mb-4">
                {phase === 'pretest' || phase === 'intelligibility' ? 'Pre-test Complete' :
                  phase === 'training' ? `Training Day ${trainingDay} Complete` :
                    phase === 'posttest1' ? '1-Week Post-test Complete' :
                      phase === 'posttest2' ? '1-Month Post-test Complete' :
                        'Post-test Complete'}
              </h3>
              <p className="text-[#6e6e6d] mb-6">
                {phase === 'pretest' || phase === 'intelligibility'
                  ? "Excellent work! You've completed the pre-test. Return tomorrow to begin your training."
                  : phase === 'training'
                    ? trainingDay < 4
                      ? `Great job! You've completed training day ${trainingDay}. Return tomorrow for day ${trainingDay + 1}.`
                      : "Congratulations! You've completed all training sessions. Return tomorrow for your final assessment."
                    : phase === 'posttest1'
                      ? "Thank you for completing the 1-week post-test! Please return in 3 weeks to complete the 1-month post-test."
                      : phase === 'posttest2'
                        ? "Congratulations! You've successfully completed all parts of the study. Thank you for your participation!"
                        : "Congratulations! You've successfully completed the study."}
              </p>
              {phase === 'training' && (
                <div className="w-full bg-[#dad6d9] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#406368] h-full transition-all duration-1000 ease-out"
                    style={{ width: "100%" }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };





  return (
    <div className="min-h-screen bg-gray-50">
      {isAdminLoggedIn ? (
        <div className="p-4">
          <button
            onClick={handleAdminLogout}
            className="mb-4 text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
          >
            <span>←</span>
            <span>Back to Main App</span>
          </button>
          <Admin />
        </div>
      ) : showAdminLogin ? (
        <AdminLogin
          onBack={() => setShowAdminLogin(false)}
          onLoginSuccess={handleAdminLoginSuccess}
        />
      ) : (
        <>
          {phase === 'auth' ? (
            renderAuth()
          ) : phase === 'demographics' ? (
            <DemographicsForm
              onSubmit={() => {
                // Update both state variables to reflect demographics completion
                console.log('Demographics completed - setting states and returning to selection');
                setIsDemographicsCompleted(true);
                setCompletedTests(prev => ({
                  ...prev,
                  demographics: true,
                  pretest_demographics: true
                }));

                // Very important - keep current phase and phase separate
                // Demographics is not part of pretest
                setPhase('selection');
                // Don't set current phase to pretest here, as that causes confusion
                // setCurrentPhase('pretest');
              }}
              onBack={() => setPhase('selection')}
            />

          ) : phase === 'selection' ? (
            <PhaseSelection
              currentPhase={currentPhase}
              trainingDay={trainingDay}
              pretestDate={pretestDate}
              onSelectPhase={handlePhaseSelect}
              completedTests={completedTests}
              isDemographicsCompleted={isDemographicsCompleted}
            />

          ) : !canProceedToday && currentPhase !== 'pretest' ? (
            <NotAvailableMessage />
          ) : phase === 'training' ? (
            renderTrainingSession()
          ) : currentPhase === 'completed' ? (
            renderCompleted()
          ) : (
            renderAudioTest()
          )}
        </>
      )}
    </div>
  );
};


export default App;