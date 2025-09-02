// 1) これが最初（Gesture Handler の初期化）
import 'react-native-gesture-handler';

// 2) Hermes で Metro の require が未定義なケースを吸収する一行
//    Metro が expose する __r を require にブリッジ（存在する時だけ）
if (typeof globalThis.require === 'undefined' && typeof globalThis.__r === 'function') {
  globalThis.require = globalThis.__r;
}

// 3) Expo Router のブートストラップ（最後）
import 'expo-router/entry';