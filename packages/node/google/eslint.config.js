module.exports = (async () => {
  const { default: config } = await import('@walkerOS/eslint/node.mjs');
  return config;
})();
