const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  clearMocks: true,
  roots: ['<rootDir>/app/admin'],
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.ts'],
};

module.exports = createJestConfig(customJestConfig);
