'use strict';

// This file is needed to properly register Android/iOS platforms for the React Native CLI.
// Without it, `react-native config` fails to detect the project configuration because
// loading react-native's own config triggers a @babel/types circular dependency issue in Node.js 24.
const android = require('@react-native-community/cli-platform-android');
const ios = require('@react-native-community/cli-platform-ios');

module.exports = {
  platforms: {
    ios: {
      projectConfig: ios.projectConfig,
      dependencyConfig: ios.dependencyConfig,
    },
    android: {
      projectConfig: android.projectConfig,
      dependencyConfig: android.dependencyConfig,
    },
  },
};
