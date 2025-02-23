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

  useEffect(() => {
    const checkDemographics = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/demographics/status', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        setIsDemographicsCompleted(data.completed);
      } catch (error) {
        console.error('Error checking demographics status:', error);
      }
    };

    if (phase === 'selection') {
      checkDemographics();
    }
  }, [phase]);

  // Sample stimuli data structure
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


  // This helper function gets the text to display for training phases
  const getCurrentStimulusText = () => {
    const currentStimuli = getCurrentStimuli();
    if (!currentStimuli || currentStimuli.length === 0) return '';
    return phase === 'training'
      ? currentStimuli[currentStimulus]?.text
      : '';
  };


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
          currentTestType: 'intelligibility',
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
      const token = localStorage.getItem('token');
      await fetch('http://localhost:3000/api/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phase,
          currentTestType: 'effort',
          stimulusId: `${phase}_effort_${currentStimulus + 1}`,
          response: userResponse,
          rating: rating
        }),
      });

      // Prevent multiple submissions of last stimulus
      if (currentStimulus === 29) {
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

  // Handle comprehension test submissions (reusing previous code)
  const handleComprehensionSubmit = async () => {
    if (!validateResponse()) return;

    try {
      const token = localStorage.getItem('token');
      const currentStory = COMPREHENSION_DATA[currentStoryId];
      const currentQuestion = currentStory.questions[questionIndex];
      const optionLabels = ['A', 'B', 'C', 'D', 'E'];

      await fetch('http://localhost:3000/api/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phase,
          currentTestType: 'comprehension',
          stimulusId: currentQuestion.id,
          response: optionLabels[userResponse],
          isCorrect: optionLabels[userResponse] === currentQuestion.answer
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
        if (rating === null) {
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
    const isLastStimulus = currentStimulus === 19;

    if (isLastStimulus) {
      // Update completedTests for current test type
      setCompletedTests(prev => ({
        ...prev,
        [`${phase}_${currentTestType}`]: true
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
  };


  const handlePlayAudio = async () => {
    try {
      // Temporary placeholder until Box integration
      alert("Audio playback will be available once Box integration is complete. For now, you can proceed with testing the interface.");


      const currentStimuli = getCurrentStimuli();
      if (!currentStimuli || currentStimuli.length === 0) return;

      const stimulus = currentStimuli[currentStimulus];
      if (!stimulus) {
        console.error('No stimulus found for current index');
        return;
      }

      // Get the user ID from local storage or state
      const userId = localStorage.getItem('userId'); // You'll need to store this during login

      // Construct filename based on type
      let filename;
      if (stimulus.type === 'Comp' || stimulus.type === 'Trn') {
        // Format: userid_type_test_Num (e.g. test1_Comp_01_02.wav)
        const storyNum = String(stimulus.storyNumber || '01').padStart(2, '0');
        const questionNum = String(stimulus.id).padStart(2, '0');
        filename = `${userId}_${stimulus.type}_${storyNum}_${questionNum}.wav`;
      } else {
        // Format: userid_typeNum (e.g. test1_Int01.wav)
        filename = `${userId}_${stimulus.type}${String(stimulus.id).padStart(2, '0')}.wav`;
      }

      // Construct the full URL
      const audioUrl = `http://localhost:3000/audio/${phase}/${filename}`;

      const audio = new Audio(audioUrl);
      audio.onerror = (e) => {
        console.error('Error playing audio:', e);
        alert('Error playing audio. Please try again.');
      };

      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      alert('Error playing audio. Please try again.');
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
          const currentStory = COMPREHENSION_DATA[currentStoryId];
          const currentQuestion = currentStory.questions[questionIndex];
          return (
            <ComprehensionTest
              storyId={currentStoryId}
              question={currentQuestion.question}
              options={currentQuestion.options}
              userResponse={userResponse}
              onResponseChange={setUserResponse}
              onSubmit={handleComprehensionSubmit}
              currentStimulus={questionIndex}
              totalStimuli={currentStory.questions.length}
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
          ) : (
            renderAudioTest()
          )}
        </>
      )}
    </div>
  );
};


export default App;