module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Some deps (e.g. zustand v5) ship `import.meta.env` dev checks. Expo's
      // web bundle is loaded as a classic script (`<script defer>`, not
      // type="module"), so a raw `import.meta` throws and blanks the app.
      // Rewrite it to an empty object — the guarded `import.meta.env ? … : void 0`
      // then degrades to production behavior. Harmless on native (rarely used).
      function transformImportMetaShim() {
        return {
          name: "transform-import-meta-shim",
          visitor: {
            MetaProperty(path) {
              path.replaceWithSourceString("({})");
            },
          },
        };
      },
      "react-native-reanimated/plugin", // MUST be last
    ],
  };
};
