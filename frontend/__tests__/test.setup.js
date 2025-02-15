// setupTests.js
import '@testing-library/jest-dom';
import { server } from '../mocks/server';

// Establish API mocking before all tests
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished
afterAll(() => server.close());

// Mock window.fs for audio file handling
global.window.fs = {
  readFile: jest.fn(),
};

// Mock Audio API
window.HTMLMediaElement.prototype.play = jest.fn();
window.HTMLMediaElement.prototype.pause = jest.fn();

// auth.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('Authentication Flow', () => {
  test('user can register successfully', async () => {
    render(<App />);

    // Find and click register link
    const registerLink = screen.getByText(/Don't have an account/i);
    userEvent.click(registerLink);

    // Fill in registration form
    await userEvent.type(screen.getByPlaceholderText(/user id/i), 'testuser');
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'password123');
    await userEvent.type(screen.getByPlaceholderText(/confirm password/i), 'password123');

    // Submit form
    const registerButton = screen.getByRole('button', { name: /create account/i });
    userEvent.click(registerButton);

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
    });
  });

  test('user can login successfully', async () => {
    render(<App />);

    await userEvent.type(screen.getByPlaceholderText(/user id/i), 'testuser');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'password123');

    const loginButton = screen.getByRole('button', { name: /sign in/i });
    userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/perceptual training progress/i)).toBeInTheDocument();
    });
  });
});

// admin.test.js
describe('Admin Features', () => {
  test('admin can view user list', async () => {
    // Login as admin first
    render(<App />);
    const adminLink = screen.getByText(/access admin panel/i);
    userEvent.click(adminLink);

    await userEvent.type(screen.getByPlaceholderText(/user id/i), 'admin');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'adminpass');

    const loginButton = screen.getByRole('button', { name: /sign in/i });
    userEvent.click(loginButton);

    // Verify admin dashboard loads
    await waitFor(() => {
      expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/total users/i)).toBeInTheDocument();
    });
  });
});

// phase.test.js
describe('Phase Management', () => {
  test('user can access pretest', async () => {
    // Login first
    // ... login code ...

    const pretestCard = screen.getByText(/pre-test assessment/i);
    userEvent.click(pretestCard);

    await waitFor(() => {
      expect(screen.getByText(/play audio/i)).toBeInTheDocument();
    });
  });

  test('training day becomes available after pretest', async () => {
    // Complete pretest first
    // ... pretest completion code ...

    await waitFor(() => {
      const day1Card = screen.getByText(/training day 1/i);
      expect(day1Card).not.toBeDisabled();
    });
  });
});
