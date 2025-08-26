module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    // Reanimated を使っていないなら消してOK
    'react-native-reanimated/plugin',
  ],
};