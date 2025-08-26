// apps/mobile/metro.config.js
// Use Expo's metro config to stay in sync with expo-router & SDK updates.
const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');

const projectRoot = __dirname; // apps/mobile
const workspaceRoot = path.resolve(projectRoot, '..', '..'); // monorepo root

/** @type {import('metro-config').ConfigT} */
const config = getDefaultConfig(projectRoot);

// In a monorepo, ensure Metro can resolve from both local and workspace node_modules.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(workspaceRoot, 'node_modules'),
];

module.exports = config;