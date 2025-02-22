import React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { CheckCircle, Lock, Clock, ArrowRight, AlignJustify, AlignVerticalJustifyCenterIcon, AlignCenterIcon } from "lucide-react";
import { formatDate } from './lib/utils';
//import { Headphones } from "lucide-react";

const TestTypeCard = ({ title, description, testType, phase, status, onSelect, date }) => {
  const { isAvailable, isCompleted } = status;

  return (
    <Card className={`transition-opacity ${isAvailable ? "" : "opacity-75"}`}>
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
          {isCompleted ? 'Completed' : isAvailable ? 'Available Now' : 'Locked'}
          {date && ` • ${date}`}
        </p>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={!isAvailable}
          variant={isAvailable ? "default" : "secondary"}
          onClick={() => onSelect(phase, testType)}
        >
          <span>
            {isCompleted ? 'Completed' : isAvailable ? 'Begin Test' : 'Locked'}
          </span>
          {isAvailable && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
};

// Also update the Training Day cards to include icons
const TrainingDayCard = ({ day, currentDay, onSelect, date }) => {
  const isCompleted = day < currentDay;
  const isAvailable = day === currentDay;

  return (
    <Card className={`transition-opacity ${isAvailable ? "" : "opacity-75"}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-gray-900">
            Training Day {day}
          </h3>
          <div>
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
          {isCompleted ? 'Completed' : isAvailable ? 'Available Now' : 'Locked'}
          {date && ` • ${date}`}
        </p>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={!isAvailable}
          variant={isAvailable ? "default" : "secondary"}
          onClick={() => onSelect('training', 'Trn', day)}
        >
          <span>
            {isCompleted ? 'Completed' : isAvailable ? 'Begin Training' : 'Locked'}
          </span>
          {isAvailable && <ArrowRight className="ml-2 h-4 w-4" />}
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
  completedTests = {} // Track completed test types
}) => {
  const testTypes = [
    {
      id: 'intelligibility',
      title: 'Intelligibility Test',
      description: 'Type the complete phrase you hear',
      type: 'Int',
      order: 1
    },
    {
      id: 'effort',
      title: 'Listening Effort Test',
      description: 'Type the final word and rate your listening effort',
      type: 'Eff',
      order: 2
    },
    {
      id: 'comprehension',
      title: 'Comprehension Test',
      description: 'Listen to stories and answer questions',
      type: 'Comp',
      order: 3
    }
  ];

  // Helper function to determine if a test type is available
  const getTestStatus = (phase, testType) => {
    const test = testTypes.find(t => t.type === testType);

    // If this is the first test, it's available if phase matches and test isn't completed
    if (test.order === 1) {
      return {
        isAvailable: phase === currentPhase && !completedTests[`${phase}_${testType}`],
        isCompleted: completedTests[`${phase}_${testType}`]
      };
    }

    // For subsequent tests:
    // 1. Get the previous test type
    const previousTest = testTypes.find(t => t.order === test.order - 1);

    // 2. Check if previous test is completed
    const previousTestCompleted = completedTests[`${phase}_${previousTest.type}`];

    // 3. A test is available if:
    //    - We're in the correct phase
    //    - Previous test is completed
    //    - This test isn't completed yet
    const isAvailable = phase === currentPhase &&
      previousTestCompleted &&
      !completedTests[`${phase}_${testType}`];

    return {
      isAvailable,
      isCompleted: completedTests[`${phase}_${testType}`]
    };
  };

  // Add getExpectedDate function
  const getExpectedDate = (phase, dayNumber = null) => {
    if (!pretestDate) {
      return 'Complete pretest to unlock';
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

      case 'posttest':
        daysToAdd = 5; // Posttest starts after 4 days of training
        break;

      default:
        return 'Date not available';
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
          {pretestDate && (
            <p className="text-sm text-gray-500 mt-2">
              Started: {new Date(pretestDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Pretest Section */}
        {currentPhase === 'pretest' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Pre-test Assessment</h2>
            {/* <Headphones className="h-4 w-4" /> */}
            <p>  Please wear <strong>headphones</strong> during all portions of this app.</p>

            <br></br>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testTypes
                .sort((a, b) => a.order - b.order)
                .map(test => (
                  <TestTypeCard
                    key={test.id}
                    {...test}
                    phase={currentPhase}
                    status={getTestStatus(currentPhase, test.type)}
                    date={getExpectedDate(currentPhase)}
                    onSelect={onSelectPhase}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Training Section */}
        {currentPhase === 'training' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Training Sessions</h2>
            {/* <Headphones className="h-4 w-4" /> */}
            <p>  Please wear <strong>headphones</strong> during all portions of this app.</p>

            <br></br>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((day) => (
                <TrainingDayCard
                  key={day}
                  day={day}
                  currentDay={trainingDay}
                  onSelect={onSelectPhase}
                  date={getExpectedDate('training', day)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Posttest Section */}
        {currentPhase === 'posttest' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Post-test Assessment</h2>
            {/* <Headphones className="h-4 w-4" /> */}
            <p>  Please wear <strong>headphones</strong> during all portions of this app.</p>

            <br></br>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testTypes.map(test => (
                <TestTypeCard
                  key={test.id}
                  {...test}
                  phase="posttest"
                  status={getTestStatus('posttest', test.type)}
                  onSelect={onSelectPhase}
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