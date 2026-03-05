/**
 * Mock for @monaco-editor/react in Jest tests
 */
const React = require('react');

console.log('[MOCK] @monaco-editor/react mock loaded');

module.exports = {
  Editor: () => React.createElement('div', { 'data-testid': 'monaco-editor' }),
  useMonaco: () => null,
  loader: {
    config: (...args) => {
      console.log('[MOCK] loader.config called with:', args);
    },
    init: () => Promise.resolve(),
  },
};
