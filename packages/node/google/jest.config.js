module.exports = (async () => {
  const { default: config } = await import('@walkerOS/jest/index.mjs');
  return config;
})();
