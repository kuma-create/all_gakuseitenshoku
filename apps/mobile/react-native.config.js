// 既存の module.exports に "dependencies" を足す
module.exports = {
  project: { android: { sourceDir: './android', packageName: 'co.gakuten.app' } },
  dependencies: {
    '@react-native-async-storage/async-storage': { platforms: { android: null } },
    '@react-native-picker/picker':              { platforms: { android: null } },
    'react-native-gesture-handler':             { platforms: { android: null } },
    'react-native-reanimated':                  { platforms: { android: null } },
    'react-native-safe-area-context':           { platforms: { android: null } },
    'react-native-screens':                     { platforms: { android: null } },
    'react-native-svg':                         { platforms: { android: null } },
    'react-native-webview':                     { platforms: { android: null } },
  },
};