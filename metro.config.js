// Metro config — extends Expo's default. The only customisation: let on-device
// whisper.rn models (ggml .bin, Core ML .mlmodelc) be bundled/resolved as assets
// so voice reflection can ship its model without a native rebuild.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = [
  ...config.resolver.assetExts,
  "bin", // whisper ggml model weights
  "mil", // Core ML intermediate
];

module.exports = config;
