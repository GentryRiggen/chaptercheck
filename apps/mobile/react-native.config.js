module.exports = {
  dependencies: {
    // react-native-reanimated 3.18 bundles the worklets native code internally.
    // We only need react-native-worklets for its Babel plugin, so disable native autolinking
    // to avoid duplicate symbol errors.
    "react-native-worklets": {
      platforms: {
        ios: null,
        android: null,
      },
    },
  },
};
