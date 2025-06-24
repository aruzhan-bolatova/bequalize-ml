module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@services': './src/services',
          '@types': './src/types',
          '@algorithms': './src/algorithms',
          '@utils': './src/utils',
        },
      },
    ],
  ],
}; 