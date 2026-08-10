const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo: ver root + packages, pero bloquear otras apps (evita Haste collisions en EAS)
config.watchFolders = [workspaceRoot, ...(config.watchFolders ?? [])];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.blockList = [
  ...(config.resolver.blockList ?? []),
  new RegExp(`${path.resolve(workspaceRoot, 'apps')}/(?!repmax-mobile).*`),
];

module.exports = config;
