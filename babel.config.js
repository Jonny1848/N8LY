// Babel: jsxImportSource "nativewind" leitet JSX auf react-native-css-interop um; Reanimated-Plugin muss zuletzt stehen
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: ["react-native-reanimated/plugin"],
  };
};
