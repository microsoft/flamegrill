module.exports = {
  webpack: function(config, env) {
    if (env === 'production') {
      config.optimization.minimize = false;
      config.output.publicPath = './';
    }
    return config;
  }
}
