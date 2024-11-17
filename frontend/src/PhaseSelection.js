import React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { CheckCircle, Lock, Clock, ArrowRight } from "lucide-react";

const PhaseSelection = ({
  currentPhase,
  trainingDay,
  lastTrainingDate,
  onSelectPhase
}) => {
  // Helper function to determine if a phase is available
  const isPhaseAvailable = (phaseName, dayNumber = null) => {
    if (!lastTrainingDate && phaseName !== 'pretest') return false;

    const lastDate = lastTrainingDate ? new Date(lastTrainingDate) : null;
    const today = new Date();
    // Reset time portions to compare dates only
    today.setHours(0, 0, 0, 0);
    if (lastDate) lastDate.setHours(0, 0, 0, 0);

    switch (phaseName) {
      case 'pretest':
        return currentPhase === 'pretest';
      case 'training':
        if (currentPhase !== 'training') return false;
        const daysSinceStart = lastDate ?
          Math.floor((today - lastDate) / (1000 * 60 * 60 * 24)) : 0;
        return dayNumber === trainingDay && daysSinceStart === dayNumber - 1;
      case 'posttest':
        return currentPhase === 'posttest' &&
          lastDate &&
          Math.floor((today - lastDate) / (1000 * 60 * 60 * 24)) === 1;
      default:
        return false;
    }
  };

  // Helper to get the status of a phase
  const getPhaseStatus = (phaseName, dayNumber = null) => {
    const isAvailable = isPhaseAvailable(phaseName, dayNumber);
    const isCompleted = (phaseName === 'pretest' && currentPhase !== 'pretest') ||
      (phaseName === 'training' && dayNumber < trainingDay) ||
      (phaseName === 'posttest' && currentPhase === 'completed');

    return {
      isAvailable,
      isCompleted,
      isUpcoming: !isAvailable && !isCompleted
    };
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'Not started';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Perceptual Training Progress
          </h1>
          <p className="text-gray-600">
            Select a phase to begin or continue your training
          </p>
        </div>

        <div className="grid gap-6">
          {/* Pretest Card */}
          <PhaseCard
            title="Pre-test Assessment"
            description="Complete this assessment before starting your training"
            status={getPhaseStatus('pretest')}
            onClick={() => onSelectPhase('pretest')}
            date={formatDate(lastTrainingDate)}
          />

          {/* Training Days */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((day) => (
              <TrainingDayCard
                key={day}
                day={day}
                status={getPhaseStatus('training', day)}
                onClick={() => onSelectPhase('training', day)}
                date={formatDate(lastTrainingDate)}
              />
            ))}
          </div>

          {/* Posttest Card */}
          <PhaseCard
            title="Post-test Assessment"
            description="Final assessment to measure your progress"
            status={getPhaseStatus('posttest')}
            onClick={() => onSelectPhase('posttest')}
            date={formatDate(lastTrainingDate)}
          />
        </div>
      </div>
    </div>
  );
};

const PhaseCard = ({ title, description, status, onClick, date }) => {
  const { isAvailable, isCompleted, isUpcoming } = status;

  return (
    <Card className={isAvailable ? "" : "opacity-75"}>
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
          {isCompleted ? 'Completed' : isAvailable ? 'Available Now' : 'Upcoming'}
          {date && ` • ${date}`}
        </p>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={!isAvailable}
          variant={isAvailable ? "default" : "secondary"}
          onClick={onClick}
        >
          {isCompleted ? 'Completed' : isAvailable ? 'Begin Session' : 'Locked'}
          {isAvailable && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
};

const TrainingDayCard = ({ day, status, onClick, date }) => {
  const { isAvailable, isCompleted, isUpcoming } = status;

  return (
    <Card className={isAvailable ? "" : "opacity-75"}>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900 text-center">
          Training Day {day}
        </h3>
        <div className="flex justify-center mt-2">
          {isCompleted ? (
            <CheckCircle className="h-8 w-8 text-green-500" />
          ) : isAvailable ? (
            <Clock className="h-8 w-8 text-blue-500" />
          ) : (
            <Lock className="h-8 w-8 text-gray-400" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-gray-500 text-center">
          {isCompleted ? 'Completed' : isAvailable ? 'Available Now' : 'Upcoming'}
          {date && ` • ${date}`}
        </p>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={!isAvailable}
          variant={isAvailable ? "default" : "secondary"}
          onClick={onClick}
        >
          {isCompleted ? 'Completed' : isAvailable ? 'Begin Training' : 'Locked'}
          {isAvailable && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PhaseSelection;