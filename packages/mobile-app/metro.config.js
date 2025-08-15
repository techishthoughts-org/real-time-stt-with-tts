const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    alias: {
      '@': './src',
      '@voice/config': '../shared/config/src',
      '@voice/observability': '../shared/observability/src',
      '@voice/schemas': '../shared/schemas/src',
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
