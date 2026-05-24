const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const { resolver } = config;
config.resolver = {
  ...resolver,
  sourceExts: [...resolver.sourceExts, 'cjs', 'mjs'],
  unstable_enablePackageExports: false,
};

module.exports = config;
