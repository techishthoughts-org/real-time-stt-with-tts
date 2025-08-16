/** @type {import('jest').Config} */
const config = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@expo|react-native-.*|@react-native-community|@react-native-async-storage|@testing-library|@babel|@voice)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@voice/config$': '<rootDir>/../shared/config/src',
    '^@voice/observability$': '<rootDir>/../shared/observability/src',
    '^@voice/schemas$': '<rootDir>/../shared/schemas/src',
    // Mock React Native modules that cause issues in tests
    '^react-native$': '<rootDir>/src/__mocks__/react-native.js',
    '^@react-native/js-polyfills$': '<rootDir>/src/__mocks__/react-native-polyfills.js',
    // Exclude problematic polyfills
    '^@react-native/js-polyfills/error-guard$': '<rootDir>/src/__mocks__/react-native-polyfills.js',
  },
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 10000,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '/e2e/',
  ],
  // Add globals for React Native testing
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },
};

module.exports = config;
