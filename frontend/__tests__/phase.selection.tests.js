// PhaseSelection.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from './test-utils';
import PhaseSelection from '../components/PhaseSelection';
import { testUsers } from '../mocks/testData';

describe('PhaseSelection Component', () => {
  const mockOnSelectPhase = jest.fn();

  beforeEach(() => {
    mockOnSelectPhase.mockClear();
  });

  test('renders pretest phase for new user', () => {
    render(
      <PhaseSelection
        currentPhase="pretest"
        trainingDay={1}
        pretestDate={null}
        onSelectPhase={mockOnSelectPhase}
      />
    );

    // Verify pretest card is enabled and training is locked
    const pretestButton = screen.getByRole('button', { name: /begin session/i });
    expect(pretestButton).not.toBeDisabled();

    const trainingCards = screen.getAllByText(/training day/i);
    trainingCards.forEach(card => {
      expect(card.closest('button')).toBeDisabled();
    });
  });

  test('enables first training day after pretest completion', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    render(
      <PhaseSelection
        currentPhase="training"
        trainingDay={1}
        pretestDate={yesterday.toISOString()}
        onSelectPhase={mockOnSelectPhase}
      />
    );

    // Verify pretest shows as completed
    expect(screen.getByText(/pre-test assessment/i)
      .closest('div')
      .textContent
    ).toContain('Completed');

    // Verify first training day is enabled
    const day1Button = screen.getByRole('button', { name: /begin training/i });
    expect(day1Button).not.toBeDisabled();
  });

  test('shows correct progress through training days', () => {
    const user = testUsers.training; // User on day 2

    render(
      <PhaseSelection
        currentPhase="training"
        trainingDay={user.trainingDay}
        pretestDate={user.pretestDate}
        onSelectPhase={mockOnSelectPhase}
      />
    );

    // Day 1 should show as completed
    expect(screen.getByText(/training day 1/i)
      .closest('div')
      .textContent
    ).toContain('Completed');

    // Day 2 should be available
    const day2Button = screen.getAllByRole('button', { name: /begin training/i })[1];
    expect(day2Button).not.toBeDisabled();

    // Days 3 and 4 should be locked
    const laterDayButtons = screen.getAllByRole('button', { name: /locked/i });
    expect(laterDayButtons).toHaveLength(2);
  });

  test('enables posttest after completing all training days', () => {
    render(
      <PhaseSelection
        currentPhase="posttest"
        trainingDay={4}
        pretestDate="2025-02-10" // 5 days ago
        onSelectPhase={mockOnSelectPhase}
      />
    );

    // All training days should show as completed
    const trainingCards = screen.getAllByText(/training day/i);
    trainingCards.forEach(card => {
      expect(card.closest('div').textContent).toContain('Completed');
    });

    // Posttest should be enabled
    const posttestButton = screen.getByRole('button', { name: /begin session/i });
    expect(posttestButton).not.toBeDisabled();
  });

  test('calls onSelectPhase with correct parameters', () => {
    render(
      <PhaseSelection
        currentPhase="training"
        trainingDay={1}
        pretestDate="2025-02-14"
        onSelectPhase={mockOnSelectPhase}
      />
    );

    // Click on an available training day
    const trainingButton = screen.getByRole('button', { name: /begin training/i });
    fireEvent.click(trainingButton);

    expect(mockOnSelectPhase).toHaveBeenCalledWith('training', 1);
  });

  test('displays correct dates for each phase', () => {
    const pretestDate = new Date('2025-02-14');

    render(
      <PhaseSelection
        currentPhase="training"
        trainingDay={1}
        pretestDate={pretestDate.toISOString()}
        onSelectPhase={mockOnSelectPhase}
      />
    );

    // Verify pretest completion date is shown
    expect(screen.getByText(/february 14/i)).toBeInTheDocument();

    // Verify expected dates for training days are shown
    const expectedDates = [
      'February 15', // Day 1
      'February 16', // Day 2
      'February 17', // Day 3
      'February 18', // Day 4
    ];

    expectedDates.forEach(date => {
      expect(screen.getByText(new RegExp(date, 'i'))).toBeInTheDocument();
    });

    // Verify posttest date
    expect(screen.getByText(/february 19/i)).toBeInTheDocument();
  });
});
