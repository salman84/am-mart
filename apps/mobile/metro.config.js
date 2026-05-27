const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// ── Monorepo: watch files across the workspace ─────────────────────────────
config.watchFolders = [workspaceRoot];

// ── Monorepo: resolve packages from workspace root first ──────────────────
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// ── Pin react-native to the correct workspace version (0.76.9) ─────────────
// Some nested packages bundle their own react-native — block them
const reactNativePath = path.resolve(workspaceRoot, 'node_modules/react-native');
const reactPath = path.resolve(workspaceRoot, 'node_modules/react');

config.resolver.extraNodeModules = {
  'react-native': reactNativePath,
  'react': reactPath,
};

// Block nested react-native copies inside other packages
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/react-native\/.*/,
  /node_modules\/.*\/node_modules\/react\/.*/,
];

// ── SVG support ────────────────────────────────────────────────────────────
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg', 'mjs', 'cjs'];

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

// ── Enable package exports for Expo 52 / RN 0.76 compatibility ──────────────
config.resolver.unstable_enablePackageExports = true;

// ── Performance ─────────────────────────────────────────────────────────────
config.maxWorkers = 2;

module.exports = config;
