const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.api.js'],
  testMatch: [
    '<rootDir>/tests/api/**/*.test.ts',
    '<rootDir>/tests/lib/**/*.test.ts'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 10000, // Increase timeout for image generation tests
}

module.exports = createJestConfig(customJestConfig)