module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@expo|react-native-.*|@react-native-community|@react-native-async-storage|@react-native-js-polyfills|@react-native\\+js-polyfills)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@voice/config$': '<rootDir>/../shared/config/src',
    '^@voice/observability$': '<rootDir>/../shared/observability/src',
    '^@voice/schemas$': '<rootDir>/../shared/schemas/src',
    '@react-native/js-polyfills': '<rootDir>/src/__mocks__/react-native-polyfills.js',
    '@react-native\\+js-polyfills': '<rootDir>/src/__mocks__/react-native-polyfills.js',
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
};
