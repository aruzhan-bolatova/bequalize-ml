/**
 * Metro configuration for Expo with React Native 0.79.x
 * Optimized to prevent C++ exceptions and support ONNX Runtime
 */

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuration optimized for React Native 0.79.x and ONNX Runtime
module.exports = {
  ...config,
  resolver: {
    ...config.resolver,
    // Support ONNX model files
    assetExts: [...config.resolver.assetExts, 'onnx', 'bin', 'tflite'],
    // Ensure all source extensions are supported
    sourceExts: [...config.resolver.sourceExts, 'ts', 'tsx'],
    // Disable package exports to prevent module resolution issues
    unstable_enablePackageExports: false,
  },
  transformer: {
    ...config.transformer,
    // Use stable minifier
    minifierPath: require.resolve('metro-minify-terser'),
    // Optimize for stability
    assetPlugins: [],
  },
  // Performance optimizations
  maxWorkers: Math.max(1, Math.floor(require('os').cpus().length / 2)),
}; 

