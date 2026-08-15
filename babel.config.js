module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // reanimated 플러그인은 반드시 마지막에 위치해야 한다
    plugins: ['react-native-worklets/plugin'],
  };
};
