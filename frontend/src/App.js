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
  const [currentTestType, setCurrentTestType] = useState(null); // 'intelligibility', 'effort', 'comprehension'

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

  // This helper function gets the correct response for scoring
  //const getCurrentStimulusCorrect = () => {
  //  const currentStimuli = getCurrentStimuli();
  //  if (!currentStimuli || currentStimuli.length === 0) return '';
  //  return currentStimuli[currentStimulus]?.correct || '';
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

  const handleSubmitResponse = async () => {
    try {
      // Validate response based on test type
      if (!validateResponse()) {
        return;
      }

      const currentStimuli = getCurrentStimuli();
      const stimulus = currentStimuli[currentStimulus];

      const responseData = {
        phase,
        stimulusId: stimulus.id,
        testType: stimulus.type,
        trainingDay: phase === 'training' ? trainingDay : undefined,
        storyNumber: stimulus.storyNumber, // For comprehension tests
        response: formatResponse(userResponse, stimulus.type),
        rating: stimulus.type === 'Eff' ? rating : undefined,
      };

      const response = await fetch('http://localhost:3000/api/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(responseData),
      });

      if (response.ok) {
        const data = await response.json();
        handleResponseSuccess(data);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to submit response');
      }
    } catch (error) {
      console.error('Submit response error:', error);
      alert('Failed to submit response. Please try again.');
    }
  };

  const validateResponse = () => {
    const currentStimuli = getCurrentStimuli();
    const stimulus = currentStimuli[currentStimulus];

    switch (stimulus.type) {
      case 'Int':
        if (!userResponse.trim()) {
          alert('Please enter the phrase you heard.');
          return false;
        }
        break;

      case 'Eff':
        if (!userResponse.trim()) {
          alert('Please enter the final word you heard.');
          return false;
        }
        if (rating === null) {
          alert('Please rate your listening effort.');
          return false;
        }
        break;

      case 'Comp':
        if (!userResponse) {
          alert('Please select an answer.');
          return false;
        }
        break;

      case 'Trn':
        // Training might not need validation
        return true;
    }

    return true;
  };

  const formatResponse = (response, type) => {
    switch (type) {
      case 'Int':
        return response.trim().toLowerCase();

      case 'Eff':
        return response.trim().toLowerCase();

      case 'Comp':
        return response; // Already formatted as multiple choice selection

      case 'Trn':
        return 'completed'; // Training just needs completion status

      default:
        return response;
    }
  };

  // Handle successful response submission
  const handleResponseSuccess = (data) => {
    const currentStimuli = getCurrentStimuli();
    const isLastStimulus = currentStimulus === currentStimuli.length - 1;

    if (isLastStimulus) {
      // Update completedTests when a test is finished
      setCompletedTests(prev => ({
        ...prev,
        [`${phase}_${currentTestType}`]: true
      }));
    }

    // Reset response fields
    setUserResponse('');
    setRating(null);

    if (!isLastStimulus) {
      setCurrentStimulus(prev => prev + 1);
    } else {
      handlePhaseCompletion(data);
    }
  };


  // handle phase select
  const handlePhaseSelect = (selectedPhase, testType, dayNumber = null) => {
    setCurrentPhase(selectedPhase);
    setCurrentTestType(testType);

    if (dayNumber) {
      setTrainingDay(dayNumber);
    }

    setPhase(selectedPhase);
    setCurrentStimulus(0);
    setUserResponse('');
    setRating(null);
  };


  // Handle phase completion
  const handlePhaseCompletion = (data) => {
    setShowComplete(true);

    // Update user progress
    if (data.currentPhase) setCurrentPhase(data.currentPhase);
    if (data.trainingDay) setTrainingDay(data.trainingDay);

    // Handle different phase transitions
    if (phase === 'pretest') {
      setTimeout(() => {
        setPhase('selection');
        setShowComplete(false);
        setCurrentStimulus(0);
      }, 2000);
    } else if (phase === 'training') {
      setTimeout(() => {
        setPhase('selection');
        setShowComplete(false);
        setCurrentStimulus(0);
      }, 2000);
    } else if (phase === 'posttest') {
      setTimeout(() => {
        setPhase('selection');
        setShowComplete(false);
        setCurrentStimulus(0);
      }, 2000);
    }
  };


  const handlePlayAudio = async () => {
    try {
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
    const currentStimuli = getCurrentStimuli();
    const stimulus = currentStimuli[currentStimulus];

    const commonProps = {
      currentStimulus,
      totalStimuli: currentStimuli.length,
      onPlayAudio: handlePlayAudio,
      userResponse,
      onResponseChange: setUserResponse,
      onSubmit: handleSubmitResponse
    };

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white shadow-xl rounded-lg overflow-hidden">
            <div className="bg-blue-600 text-white px-6 py-4">
              <h2 className="text-xl font-semibold">
                {phase === 'pretest' ? 'Pre-test Assessment' :
                  phase === 'training' ? `Training Session - Day ${trainingDay}` :
                    'Post-test Assessment'}
              </h2>
            </div>

            <div className="p-6">
              {/* Render appropriate test component based on type */}
              {stimulus.type === 'Int' && (
                <IntelligibilityTest {...commonProps} />
              )}

              {stimulus.type === 'Eff' && (
                <ListeningEffortTest
                  {...commonProps}
                  effortRating={rating}
                  onEffortRatingChange={setRating}
                />
              )}

              {stimulus.type === 'Comp' && (
                <ComprehensionTest
                  {...commonProps}
                  options={stimulus.options}
                />
              )}
            </div>
          </div>
        </div>

        {/* Completion Modal */}
        {showComplete && currentStimulus === getCurrentStimuli().length - 1 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {phase === 'pretest' ? 'Pre-test Complete' :
                  phase === 'training' ? `Training Day ${trainingDay} Complete` :
                    'Post-test Complete'}
              </h3>
              <p className="text-gray-600 mb-6">
                {phase === 'pretest'
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
          ) : phase === 'selection' ? (
            <PhaseSelection
              currentPhase={currentPhase}
              trainingDay={trainingDay}
              pretestDate={pretestDate}
              onSelectPhase={handlePhaseSelect}
              completedTests={completedTests}
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