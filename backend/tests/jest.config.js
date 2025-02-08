module.exports = {
    testEnvironment: 'node',
    verbose: true,
    coveragePathIgnorePatterns: ['/node_modules/'],
    testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
    setupFilesAfterEnv: ['./tests/setup.js'],
    testTimeout: 10000
};