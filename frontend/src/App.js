import React, { useState, useEffect } from 'react';
import Admin from './Admin';
import AdminLogin from './AdminLogin';
import PhaseSelection from './PhaseSelection';
import { Button } from './components/ui/button';
import { Label } from './components/ui/label';
import { Input } from './components/ui/input';
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
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('pretest');
  const [pretestDate, setPretestDate] = useState(null);
  const [canProceedToday, setCanProceedToday] = useState(true);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

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
    pretest: [
      { id: 1, audioUrl: 'http://localhost:3000/audio/Pretest/pre1.wav', correct: 'sample word one' },
      { id: 2, audioUrl: 'http://localhost:3000/audio/Pretest/pre2.wav', correct: 'sample word two' },
    ],
    training: {
      1: [
        { id: 1, audioUrl: 'http://localhost:3000/audio/Training/day1/training1.wav', text: 'training word one' },
        { id: 2, audioUrl: 'http://localhost:3000/audio/Training/day1/training2.wav', text: 'training word two' },
      ],
      2: [
        { id: 1, audioUrl: 'http://localhost:3000/audio/training/day2/training1.wav', text: 'training word one' },
        { id: 2, audioUrl: 'http://localhost:3000/audio/training/day2/training2.wav', text: 'training word two' },
      ],
      3: [
        { id: 1, audioUrl: 'http://localhost:3000/audio/training/day2/training1.wav', text: 'training word one' },
        { id: 2, audioUrl: 'http://localhost:3000/audio/training/day2/training2.wav', text: 'training word two' },
      ],
      4: [
        { id: 1, audioUrl: 'http://localhost:3000/audio/training/day2/training1.wav', text: 'training word one' },
        { id: 2, audioUrl: 'http://localhost:3000/audio/training/day2/training2.wav', text: 'training word two' },
      ],
    },
    posttest: [
      { id: 1, audioUrl: 'http://localhost:3000/audio/Posttest/post1.wav', correct: 'post word one' },
      { id: 2, audioUrl: 'http://localhost:3000/audio/Posttest/post2.wav', correct: 'post word two' },
    ],
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

  // Add handler for phase selection
  const handlePhaseSelect = (selectedPhase, dayNumber = null) => {
    setCurrentStimulus(0); // Reset stimulus counter
    setUserResponse(''); // Reset user response
    setShowComplete(false); // Ensure completion modal is hidden

    if (selectedPhase === 'training') {
      setTrainingDay(dayNumber);
    }

    setPhase(selectedPhase);
  };


  const handleLogin = async () => {
    try {
      setError('');
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
        setPhase('selection');
        setCurrentStimulus(0); // Ensure stimulus counter is reset
        setShowComplete(false); // Ensure completion modal is hidden
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
      const token = localStorage.getItem('token');
      const currentStimuli = getCurrentStimuli();
      const isLastStimulus = currentStimulus === currentStimuli.length - 1;

      const response = await fetch('http://localhost:3000/api/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phase,
          stimulusId: currentStimuli[currentStimulus].id,
          response: userResponse,
          trainingDay: phase === 'training' ? trainingDay : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        if (!isLastStimulus) {
          // If not the last stimulus, move to next one
          setCurrentStimulus(curr => curr + 1);
          setUserResponse('');
        } else {
          // If it's the last stimulus, show completion and handle phase transition
          setShowComplete(true);
          setUserResponse('');

          // Update state with server response
          if (data.currentPhase) setCurrentPhase(data.currentPhase);
          if (data.trainingDay) setTrainingDay(data.trainingDay);

          // Handle phase transitions
          if (phase === 'pretest') {
            // Immediately go to selection screen for pretest
            setPhase('selection');
            setShowComplete(false);
            setCurrentStimulus(0);
          } else if (phase === 'training') {
            // Show completion screen briefly for training
            setTimeout(() => {
              setShowComplete(false);
              setCurrentStimulus(0);
              setPhase('selection');
            }, 2000);
          } else if (phase === 'posttest') {
            // Immediately go to selection screen for posttest
            setPhase('selection');
            setShowComplete(false);
            setCurrentStimulus(0);
          }
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to submit response');
      }
    } catch (error) {
      console.error('Submit response error:', error);
      alert('Failed to submit response. Please try again.');
    }
  };

  const handlePlayAudio = () => {
    const currentStimuli = getCurrentStimuli();
    if (!currentStimuli || currentStimuli.length === 0) return;

    const audioUrl = currentStimuli[currentStimulus]?.audioUrl;
    if (!audioUrl) {
      console.error('No audio URL found for current stimulus');
      return;
    }

    const audio = new Audio(audioUrl);
    audio.onerror = (e) => {
      console.error('Error playing audio:', e);
      alert('Error playing audio. Please try again.');
    };

    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      alert('Error playing audio. Please try again.');
    });
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Logo/Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Perceptual Training
          </h1>
          <p className="text-gray-600">
            {authMode === 'login'
              ? 'Welcome back! Please login to continue your study.'
              : 'Create an account to participate in the study.'}
          </p>
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
      </div>
    </div>
  );




  const renderAudioTest = () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white px-6 py-4">
            <h2 className="text-xl font-semibold">
              {phase === 'pretest' ? 'Pre-test Assessment' :
                phase === 'training' ? `Training Session - Day ${trainingDay}` :
                  'Post-test Assessment'}
            </h2>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-6">
              {/* Progress Indicator */}
              <div className="flex items-center justify-between text-sm text-gray-600 mb-8">
                <span>
                  Progress: {currentStimulus + 1} of {getCurrentStimuli().length}
                </span>
                <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{
                      width: `${((currentStimulus + 1) / getCurrentStimuli().length) * 100}%`
                    }}
                  />
                </div>
              </div>

              {/* Audio Controls */}
              <div className="text-center">
                <button
                  onClick={handlePlayAudio}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                           transition-colors duration-200 flex items-center justify-center mx-auto space-x-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  <span>Play Audio</span>
                </button>
              </div>

              {/* Training Text - only show during training phase */}
              {phase === 'training' && getCurrentStimulusText() && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
                  <p className="text-blue-800 text-lg">
                    {getCurrentStimulusText()}
                  </p>
                </div>
              )}

              {/* Response Input - only show for pretest and posttest */}
              {phase !== 'training' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Your Response
                  </label>
                  <input
                    type="text"
                    placeholder="Type what you hear..."
                    value={userResponse}
                    onChange={(e) => setUserResponse(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 
                             focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  />

                  <button
                    onClick={handleSubmitResponse}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 
                             focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 
                             transition-colors duration-200"
                  >
                    Submit Response
                  </button>
                </div>
              )}

              {/* Next Button - only show for training */}
              {phase === 'training' && (
                <button
                  onClick={() => {
                    const currentStimuli = getCurrentStimuli();
                    const isLastStimulus = currentStimulus === currentStimuli.length - 1;

                    if (!isLastStimulus) {
                      setCurrentStimulus(curr => curr + 1);
                    } else {
                      setShowComplete(true);
                      setTimeout(() => {
                        setShowComplete(false);
                        setCurrentStimulus(0);
                        if (trainingDay < 4) {
                          setTrainingDay(prev => prev + 1);
                        } else {
                          setCurrentPhase('posttest');
                        }
                        setPhase('selection');
                      }, 2000);
                    }
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                           transition-colors duration-200"
                >
                  Next
                </button>
              )}
            </div>
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