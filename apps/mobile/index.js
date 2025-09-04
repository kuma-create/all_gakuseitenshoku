import 'react-native-gesture-handler';
if (global.ErrorUtils?.setGlobalHandler) {
  const prev = global.ErrorUtils.getGlobalHandler?.();
  global.ErrorUtils.setGlobalHandler((e, isFatal) => {
    console.log('[FATAL]', e?.message);
    console.log('[STACK]', e?.stack);
    prev && prev(e, isFatal);
  });
}