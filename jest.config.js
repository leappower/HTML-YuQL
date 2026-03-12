module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>/src'],

  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // File extensions
  moduleFileExtensions: ['js', 'json'],

  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.js',
    '<rootDir>/src/**/*.{spec,test}.js',
    '<rootDir>/tests/**/*.test.js',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/translations/**/*.json',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Restore mocks between tests
  restoreMocks: true,
};
