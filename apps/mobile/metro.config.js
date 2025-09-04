// metro.config.js — reset to Expo defaults for reliability
const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('metro-config').ConfigT} */
module.exports = getDefaultConfig(__dirname);