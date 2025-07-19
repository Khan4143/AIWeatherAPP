const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json'],
    useTransformReact: true
  },
  transformer: {
    allowOptionalDependencies: true,
    experimentalImportSupport: false,
    inlineRequires: true,
  },
  watchFolders: [],
  maxWorkers: 2,
  resetCache: false,
  server: {
    port: 8081,
    enhanceMiddleware: (middleware) => {
      return middleware;
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
