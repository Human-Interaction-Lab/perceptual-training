import React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { CheckCircleIcon, LockClosedIcon, ClockIcon, ArrowRightIcon } from '@heroicons/react/24/solid';

const PhaseSelection = ({
  currentPhase,
  trainingDay,
  pretestDate, // Changed from lastTrainingDate
  onSelectPhase
}) => {
  // Helper function to determine if a phase is available
  const isPhaseAvailable = (phaseName, dayNumber = null) => {
    // Pretest is available if it hasn't been completed yet
    if (phaseName === 'pretest') {
      return currentPhase === 'pretest';
    }

    // If pretest hasn't been completed, no other phases are available
    if (!pretestDate) return false;

    const pretest = new Date(pretestDate);
    const today = new Date();

    // Reset time portions to compare dates only
    pretest.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    // Calculate days since pretest
    const daysSincePretest = Math.floor((today - pretest) / (1000 * 60 * 60 * 24));

    switch (phaseName) {
      case 'training':
        if (currentPhase !== 'training') return false;

        // Each training day should be available on its specific day
        // Day 1: 1 day after pretest
        // Day 2: 2 days after pretest
        // Day 3: 3 days after pretest
        // Day 4: 4 days after pretest
        return dayNumber === trainingDay && daysSincePretest === dayNumber;

      case 'posttest':
        // Posttest should be available 5 days after pretest
        return currentPhase === 'posttest' && daysSincePretest === 5;

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

  // Get expected date for a phase
  const getExpectedDate = (phaseName, dayNumber = null) => {
    if (!pretestDate) return 'Complete pretest to unlock';

    const baseDate = new Date(pretestDate);
    let daysToAdd = 0;

    if (phaseName === 'training') {
      daysToAdd = dayNumber;
    } else if (phaseName === 'posttest') {
      daysToAdd = 5;
    }

    const expectedDate = new Date(baseDate);
    expectedDate.setDate(expectedDate.getDate() + daysToAdd);
    return formatDate(expectedDate);
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
          {pretestDate && (
            <p className="text-sm text-gray-500 mt-2">
              Pretest completed: {formatDate(pretestDate)}
            </p>
          )}
        </div>

        <div className="grid gap-6">
          {/* Pretest Card */}
          <PhaseCard
            title="Pre-test Assessment"
            description="Complete this assessment before starting your training"
            status={getPhaseStatus('pretest')}
            onClick={() => onSelectPhase('pretest')}
            date={pretestDate ? formatDate(pretestDate) : 'Not started'}
          />

          {/* Training Days */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((day) => (
              <TrainingDayCard
                key={day}
                day={day}
                status={getPhaseStatus('training', day)}
                onClick={() => onSelectPhase('training', day)}
                date={getExpectedDate('training', day)}
              />
            ))}
          </div>

          {/* Posttest Card */}
          <PhaseCard
            title="Post-test Assessment"
            description="Final assessment to measure your progress"
            status={getPhaseStatus('posttest')}
            onClick={() => onSelectPhase('posttest')}
            date={getExpectedDate('posttest')}
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
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
            ) : isAvailable ? (
              <ClockIcon className="h-6 w-6 text-blue-500" />
            ) : (
              <LockClosedIcon className="h-6 w-6 text-gray-400" />
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
          <span>{isCompleted ? 'Completed' : isAvailable ? 'Begin Session' : 'Locked'}</span>
          {isAvailable && <ArrowRightIcon className="ml-2 h-4 w-4" />}
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
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          ) : isAvailable ? (
            <ClockIcon className="h-8 w-8 text-blue-500" />
          ) : (
            <LockClosedIcon className="h-8 w-8 text-gray-400" />
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
          <span>{isCompleted ? 'Completed' : isAvailable ? 'Begin Training' : 'Locked'}</span>
          {isAvailable && <ArrowRightIcon className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PhaseSelection;