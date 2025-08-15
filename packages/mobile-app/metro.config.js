const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@voice/config': path.resolve(__dirname, '../shared/config/src'),
      '@voice/observability': path.resolve(__dirname, '../shared/observability/src'),
      '@voice/schemas': path.resolve(__dirname, '../shared/schemas/src'),
    },
    platforms: ['ios', 'android', 'native', 'web'],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  watchFolders: [
    path.resolve(__dirname, '../shared'),
  ],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
