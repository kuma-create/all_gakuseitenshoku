// Ensure RN Gradle resolves node_modules correctly on EAS (CI)
const fs = require('fs');
const path = require('path');

const androidDir = path.join(__dirname, '..', 'android');
const gradlePropsPath = path.join(androidDir, 'gradle.properties');
const nodeModulesSymlink = path.join(androidDir, 'node_modules');
const targetNodeModules = path.join(__dirname, '..', 'node_modules'); // apps/mobile/node_modules

// 1) gradle.properties を強制整備（重複キーは除去）
let props = fs.existsSync(gradlePropsPath) ? fs.readFileSync(gradlePropsPath, 'utf8') : '';
const lines = props.split(/\r?\n/).filter(l =>
  !l.startsWith('REACT_NATIVE_NODE_MODULES_DIR=') &&
  !l.startsWith('REACT_NATIVE__DIR=') &&
  !l.startsWith('REACT_NATIVE_DIR=')
);
lines.push('REACT_NATIVE_NODE_MODULES_DIR=../node_modules');
lines.push('REACT_NATIVE_DIR=../node_modules/react-native');
fs.writeFileSync(gradlePropsPath, lines.join('\n') + '\n', 'utf8');
console.log('[eas-postinstall] gradle.properties updated');

// 2) android/node_modules -> ../node_modules のシンボリックリンクを作る（idempotent）
try {
  if (fs.existsSync(nodeModulesSymlink)) fs.unlinkSync(nodeModulesSymlink);
  fs.symlinkSync(targetNodeModules, nodeModulesSymlink, 'dir');
  console.log('[eas-postinstall] symlink created:', nodeModulesSymlink, '->', targetNodeModules);
} catch (e) {
  console.warn('[eas-postinstall] symlink warning:', e.message);
}