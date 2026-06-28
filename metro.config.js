const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

 /**
+ * Metro configuration
+ * https://facebook.github.io/metro/docs/configuration
  *
+ * @type {import('metro-config').MetroConfig}
  */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    // Bundle .mp4 as an asset (for the keep-awake video)
    assetExts: [...defaultConfig.resolver.assetExts, 'mp4'],
  },
};

module.exports = mergeConfig(defaultConfig, config);