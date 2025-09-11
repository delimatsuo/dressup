const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ui.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: { // Re-added and corrected
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/', '<rootDir>/playwright-mcp/', '<rootDir>/tests/api/'],
  testMatch: [
    '<rootDir>/src/components/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/app/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/hooks/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/**/*.test.{js,jsx,ts,tsx}', // For responsive.integration.test.tsx
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.tsx',
  ],
  transform: { // Added explicit SWC transform
    '^.+\.(t|j)sx?$': ['@swc/jest'],
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)