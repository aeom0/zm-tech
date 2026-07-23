const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: allow Metro to watch packages outside apps/mobile
// Merge workspaceRoot with Expo's default watchFolders to satisfy expo-doctor
config.watchFolders = [workspaceRoot, ...(config.watchFolders ?? [])];

// Monorepo: resolve modules from workspace root first, then project
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
