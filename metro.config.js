// Metro config — extends Expo's default with no customisation.
// (The former whisper.rn asset extensions were removed with the voice feature.)
const { getDefaultConfig } = require("expo/metro-config");

module.exports = getDefaultConfig(__dirname);
