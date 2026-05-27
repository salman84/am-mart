module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Path aliases — makes imports cleaner across the app
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@components': './src/components',
            '@screens': './app',
            '@services': './src/services',
            '@store': './src/store',
            '@theme': './src/theme',
            '@utils': './src/utils',
            '@hooks': './src/hooks',
            '@assets': './assets',
          },
        },
      ],
      // Required for react-native-reanimated — MUST be last
      'react-native-reanimated/plugin',
    ],
  };
};
