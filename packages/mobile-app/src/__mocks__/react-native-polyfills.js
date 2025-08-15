// Mock React Native polyfills
module.exports = {
  ErrorUtils: {
    setGlobalHandler: jest.fn(),
    getGlobalHandler: jest.fn(),
  },
  // Add more polyfills as needed
  'error-guard': {
    ErrorUtils: {
      setGlobalHandler: jest.fn(),
      getGlobalHandler: jest.fn(),
    },
  },
};
