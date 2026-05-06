module.exports = function createBabelConfig(api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
  };
};
