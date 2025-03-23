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

  // Reset states when phase changes
  useEffect(() => {
    setCurrentStimulus(0);
    setUserResponse('');
    setShowComplete(false);
  }, [phase]);

  // Log state changes for debugging
  useEffect(() => {
    console.log('State Update:', {
      phase,
      currentPhase,
      trainingDay,
      currentStimulus,
      showComplete,
      stimuliLength: getCurrentStimuli()?.length
    });
  }, [phase, currentPhase, trainingDay, currentStimulus, showComplete]);

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


  const renderTrainingSession = () => {
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

    const trainData = getTrainingData();

    return (
      <TrainingSession
        trainingDay={trainingDay}
        trainingStimuli={trainData.stimuli}
        intelligibilityStimuli={trainData.testStimuli}
        userId={userId}
        onComplete={(day) => {
          if (day >= 4) {
            setCurrentPhase('posttest');
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
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        setCurrentPhase(data.currentPhase);
        setTrainingDay(data.trainingDay);
        setPretestDate(data.pretestDate);
        setCanProceedToday(data.canProceedToday);
        setCompletedTests(data.completedTests || {});
        // Initialize story assignments
        initializeStoryAssignments(userId);

        // Check if demographics is completed by looking at completedTests
        const demographicsCompleted =
          data.completedTests?.demographics ||
          data.completedTests?.pretest_demographics ||
          data.isDemographicsCompleted;

        setIsDemographicsCompleted(!!demographicsCompleted);

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

      const response = await fetch('http://localhost:3000/api/register', {
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
      await fetch('http://localhost:3000/api/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phase,
          testType: 'intelligibility',
          stimulusId: `${phase}_intel_${currentStimulus + 1}`,
          response: userResponse
        }),
      });

      // Prevent multiple submissions of last stimulus
      if (currentStimulus === 19) {
        // Disable the submit button or add loading state
        setIsSubmitting(true); // Add this state variable
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
      const response = await fetch('http://localhost:3000/api/response', {
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
          rating: ratingValue  // Use the validated rating value
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
      if (currentStimulus === 29) {
        setIsSubmitting(true);
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

      // Get the assigned stories for the current phase
      const assignedStories = phaseStories[phase] || [];

      await fetch('http://localhost:3000/api/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phase,
          testType: 'comprehension',
          stimulusId: currentQuestion.id,
          response: optionLabels[userResponse],
          isCorrect: optionLabels[userResponse] === currentQuestion.answer
        }),
      });

      // Move to next question or complete the test
      if (questionIndex < currentStory.questions.length - 1) {
        // Move to next question in current story
        setQuestionIndex(prevIndex => prevIndex + 1);
      } else if (currentStoryIndex < assignedStories.length - 1) {
        // Move to the next assigned story
        setCurrentStoryIndex(prevIndex => prevIndex + 1);
        setQuestionIndex(0);
      } else {
        // Complete the comprehension test
        setCompletedTests(prev => ({
          ...prev,
          [`${phase}_comprehension`]: true
        }));
        setShowComplete(true);

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
      setUserResponse('');
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
            } else if (phase === 'posttest') {
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
        setUserResponse('');
        setRating(null);
      }, 2000);
    } else {
      // Just move to next stimulus
      setCurrentStimulus(prev => prev + 1);
      setUserResponse('');
      setRating(null);
    }
  };


  // handle phase select
  const handlePhaseSelect = (selectedPhase, testType, dayNumber = null) => {
    // Special handling for demographics
    if (selectedPhase === 'demographics') {
      console.log('Setting phase to demographics');  // Debug log
      setPhase('demographics');
      return;
    }

    // For training phase
    if (selectedPhase === 'training') {
      console.log(`Setting training day ${dayNumber}`);  // Debug log
      setCurrentPhase(selectedPhase);
      setCurrentTestType('training');
      if (dayNumber) {
        setTrainingDay(dayNumber);
      }
      setPhase(selectedPhase);
      return;
    }

    // For pretest and posttest phases
    // Determine which test type to start based on completed tests
    let startingTestType = testType || 'intelligibility';
    if (testType !== 'intelligibility' && !completedTests[`${selectedPhase}_intelligibility`]) {
      startingTestType = 'intelligibility';
    } else if (testType !== 'effort' &&
      completedTests[`${selectedPhase}_intelligibility`] &&
      !completedTests[`${selectedPhase}_effort`]) {
      startingTestType = 'effort';
    } else if (testType !== 'comprehension' &&
      completedTests[`${selectedPhase}_intelligibility`] &&
      completedTests[`${selectedPhase}_effort`] &&
      !completedTests[`${selectedPhase}_comprehension`]) {
      startingTestType = 'comprehension';
    }

    setCurrentPhase(selectedPhase);
    setCurrentTestType(startingTestType);
    setPhase(selectedPhase);
    setCurrentStimulus(0);
    setUserResponse('');
    setRating(null);

    // Add preloading after setting the phase
    try {
      // Preload the audio files for the selected phase
      if (selectedPhase === 'training') {
        audioService.preloadAudioFiles(selectedPhase, dayNumber);
      } else if (selectedPhase === 'pretest' || selectedPhase === 'posttest') {
        audioService.preloadAudioFiles(selectedPhase);
      }
    } catch (error) {
      console.error('Failed to preload audio files:', error);
      // Non-critical error, don't block the UI
    }
  };


  // Revised handlePlayAudio function to handle randomization
  const handlePlayAudio = async (input) => {
    try {
      // Check if we're playing a full story (input will be storyId like "Comp_01")
      if (typeof input === 'string' && input.startsWith('Comp_')) {
        // Story playback remains the same
        const storyNum = input.replace('Comp_', '');
        console.log(`Playing full story ${storyNum}`);

        const totalClips = 10;
        for (let i = 1; i <= totalClips; i++) {
          await audioService.playTestAudio(
            phase,
            'comprehension',
            storyNum,
            i
          );

          if (i < totalClips) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        return true;
      }
      // Use randomized playback for intelligibility tests 
      else if (currentTestType === 'intelligibility') {
        await audioService.playRandomizedTestAudio(
          phase,
          'intelligibility',
          null,
          currentStimulus + 1,
          userId
        );
        return true;
      }
      // For other test types, use normal playback for now
      else if (currentTestType === 'effort') {
        await audioService.playTestAudio(
          phase,
          'effort',
          null,
          currentStimulus + 1
        );
        return true;
      } else {
        await audioService.playTestAudio(
          phase,
          'intelligibility',
          null,
          currentStimulus + 1
        );
        return true;
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      if (error.message !== 'AUDIO_NOT_FOUND') {
        alert('Error playing audio. Please try again.');
      }
      return false;
    }
  };

  // Handle admin login success
  const handleAdminLoginSuccess = () => {
    setShowAdminLogin(false);
    setIsAdminLoggedIn(true);
  };

  // Add this component to display when user can't proceed
  const NotAvailableMessage = () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Please Return Tomorrow
          </h2>
          <p className="text-gray-600 mb-4">
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


  // renderAuth() updated
  const renderAuth = () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      {/* Welcome Section - wider width */}
      <WelcomeSection />

      <div className="bg-white shadow-xl rounded-lg px-8 py-6 mb-4 border border-gray-100 max-w-5xl mx-auto px-4 mb-11">
        <div className="max-w-md mx-auto">
          {/* Logo/Title Section */}
          <div className="text-center mb-8">
            <p className="text-gray-600">
              {authMode === 'login'
                ? 'Welcome back! Please login to continue your study.'
                : 'Create an account to participate in the study.'}
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-white shadow-xl rounded-lg px-8 py-6 mb-4 border border-gray-100">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            {authMode === 'login' ? 'Login' : 'Create Account'}
          </h2>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <Label htmlFor="userId">
                User ID
              </Label>
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
                <Label htmlFor="email">
                  Email
                </Label>
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
              <Label htmlFor="password">
                Password
              </Label>
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
                <Label htmlFor="confirmPassword">
                  Confirm Password
                </Label>
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
              onClick={authMode === 'login' ? handleLogin : handleRegister}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </div>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setError('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-blue-600 hover:text-blue-800"
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
            className="text-gray-500 hover:text-gray-700"
          >
            Access Admin Panel
          </Button>
        </div>
      </div >

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
              onPlayAudio={handlePlayAudio}
            />
          );

        default:
          return null;
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white shadow-xl rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 text-white px-6 py-4">
              <h2 className="text-xl font-semibold">
                {phase === 'pretest' || phase === 'intelligibility' ? 'Pre-test' : 'Post-test'}: {
                  currentTestType === 'intelligibility' ? 'Speech Intelligibility' :
                    currentTestType === 'effort' ? 'Listening Effort' :
                      'Story Comprehension'
                }
              </h2>
            </div>

            {/* Content */}
            <div className="p-6">
              {renderTestComponent()}
            </div>
          </div>
        </div>

        {/* Completion Modal */}
        {showComplete && currentStimulus === getCurrentStimuli().length - 1 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {phase === 'pretest' || phase === 'intelligibility' ? 'Pre-test Complete' :
                  phase === 'training' ? `Training Day ${trainingDay} Complete` :
                    'Post-test Complete'}
              </h3>
              <p className="text-gray-600 mb-6">
                {phase === 'pretest' || phase === 'intelligibility'
                  ? "Excellent work! You've completed the pre-test. Return tomorrow to begin your training."
                  : phase === 'training'
                    ? trainingDay < 4
                      ? `Great job! You've completed training day ${trainingDay}. Return tomorrow for day ${trainingDay + 1}.`
                      : "Congratulations! You've completed all training sessions. Return tomorrow for your final assessment."
                    : "Congratulations! You've successfully completed the study."}
              </p>
              {phase === 'training' && (
                <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-1000 ease-out"
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
                setIsDemographicsCompleted(true);
                setPhase('selection');
                setCurrentPhase('pretest');
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
          ) : (
            renderAudioTest()
          )}
        </>
      )}
    </div>
  );
};


export default App;