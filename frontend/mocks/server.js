// mocks/testData.js
export const testUsers = {
  regular: {
    userId: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    currentPhase: 'pretest',
    trainingDay: 1,
    isActive: true,
    completed: false
  },
  admin: {
    userId: 'admin',
    email: 'admin@example.com',
    password: 'adminpass',
    isAdmin: true,
    isActive: true
  },
  training: {
    userId: 'trainee',
    email: 'trainee@example.com',
    password: 'traineepass',
    currentPhase: 'training',
    trainingDay: 2,
    pretestDate: '2025-02-14',
    isActive: true,
    completed: false
  }
};

export const mockResponses = [
  {
    userId: 'testuser',
    phase: 'pretest',
    stimulusId: 1,
    response: 'test response',
    timestamp: '2025-02-15T10:00:00Z'
  },
  // Add more mock responses as needed
];

export const mockStats = {
  totalUsers: 45,
  completedUsers: 15,
  usersByPhase: [
    { _id: 'pretest', count: 10 },
    { _id: 'training', count: 20 },
    { _id: 'posttest', count: 10 },
    { _id: 'completed', count: 5 }
  ]
};

// mocks/handlers.js
import { rest } from 'msw';
import { testUsers, mockResponses, mockStats } from './testData';

// Helper function to simulate token generation
const generateToken = (userId, isAdmin = false) => {
  return `mock-token-${userId}-${isAdmin ? 'admin' : 'user'}`;
};

export const handlers = [
  // Auth handlers
  rest.post('http://localhost:3000/api/register', async (req, res, ctx) => {
    const { userId, email, password } = await req.json();
    
    // Check if user exists
    if (Object.values(testUsers).some(user => user.userId === userId || user.email === email)) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'User ID or email already exists' })
      );
    }

    return res(
      ctx.status(201),
      ctx.json({ message: 'Registration successful' })
    );
  }),

  rest.post('http://localhost:3000/api/login', async (req, res, ctx) => {
    const { userId, password } = await req.json();
    const user = Object.values(testUsers).find(u => u.userId === userId);

    if (!user || user.password !== password) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Invalid credentials' })
      );
    }

    if (!user.isActive) {
      return res(
        ctx.status(403),
        ctx.json({ error: 'Account is suspended' })
      );
    }

    return res(
      ctx.json({
        token: generateToken(userId, user.isAdmin),
        isAdmin: user.isAdmin,
        currentPhase: user.currentPhase,
        trainingDay: user.trainingDay,
        pretestDate: user.pretestDate,
        completed: user.completed,
        canProceedToday: true
      })
    );
  }),

  // Response handlers
  rest.post('http://localhost:3000/api/response', async (req, res, ctx) => {
    const { phase, stimulusId, response, trainingDay } = await req.json();
    
    return res(
      ctx.status(201),
      ctx.json({
        message: 'Response saved successfully',
        currentPhase: phase === 'pretest' ? 'training' : phase,
        trainingDay: phase === 'training' ? (trainingDay < 4 ? trainingDay + 1 : trainingDay) : undefined,
        completed: phase === 'posttest'
      })
    );
  }),

  // Admin handlers
  rest.get('http://localhost:3000/api/admin/users', (req, res, ctx) => {
    const users = Object.values(testUsers).map(({ password, ...user }) => user);
    return res(ctx.json(users));
  }),

  rest.get('http://localhost:3000/api/admin/stats', (req, res, ctx) => {
    return res(ctx.json(mockStats));
  }),

  rest.delete('http://localhost:3000/api/admin/users/:userId', (req, res, ctx) => {
    const { userId } = req.params;
    return res(ctx.json({ message: 'User deleted successfully' }));
  }),

  rest.post('http://localhost:3000/api/admin/users/:userId/reset-password', async (req, res, ctx) => {
    const { userId } = req.params;
    const { newPassword } = await req.json();
    return res(ctx.json({ message: 'Password reset successfully' }));
  }),

  rest.post('http://localhost:3000/api/admin/users/:userId/toggle-status', (req, res, ctx) => {
    const { userId } = req.params;
    return res(ctx.json({
      message: 'User status toggled successfully',
      isActive: true
    }));
  }),

  // Audio file handlers
  rest.get('http://localhost:3000/audio/:phase/:testType/:sentence', (req, res, ctx) => {
    return res(
      ctx.set('Content-Type', 'audio/wav'),
      ctx.body('mock-audio-data')
    );
  }),

  rest.get('http://localhost:3000/audio/training/day/:day/:sentence', (req, res, ctx) => {
    return res(
      ctx.set('Content-Type', 'audio/wav'),
      ctx.body('mock-audio-data')
    );
  })
];

// mocks/server.js
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// test-utils.js
import { render } from '@testing-library/react';

// Custom render function that includes providers if needed
const customRender = (ui, options = {}) => {
  return render(ui, {
    wrapper: ({ children }) => children,
    ...options,
  });
};

// Helper to simulate logged in state
export const setupLoggedInUser = (type = 'regular') => {
  const user = testUsers[type];
  localStorage.setItem('token', generateToken(user.userId, user.isAdmin));
  return user;
};

// Helper to simulate logged in admin
export const setupLoggedInAdmin = () => {
  return setupLoggedInUser('admin');
};

// Helper to clear auth state
export const clearAuth = () => {
  localStorage.clear();
};

export * from '@testing-library/react';
export { customRender as render };
