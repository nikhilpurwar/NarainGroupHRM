const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable updates in development
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;