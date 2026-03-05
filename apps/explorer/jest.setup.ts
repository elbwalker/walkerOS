import '@testing-library/jest-dom';
import React from 'react';

// Mock navigator.clipboard for copy functionality tests
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

// Mock Monaco editor modules with factory functions
jest.mock('monaco-editor', () => ({}));
jest.mock('@monaco-editor/react', () => ({
  Editor: () => React.createElement('div', { 'data-testid': 'monaco-editor' }),
  loader: {
    config: () => {},
    init: () => Promise.resolve(),
  },
}));
jest.mock(
  'monaco-editor/esm/vs/editor/editor.worker?worker',
  () => class MockWorker {},
);
jest.mock(
  'monaco-editor/esm/vs/language/json/json.worker?worker',
  () => class MockWorker {},
);
jest.mock(
  'monaco-editor/esm/vs/language/css/css.worker?worker',
  () => class MockWorker {},
);
jest.mock(
  'monaco-editor/esm/vs/language/html/html.worker?worker',
  () => class MockWorker {},
);
jest.mock(
  'monaco-editor/esm/vs/language/typescript/ts.worker?worker',
  () => class MockWorker {},
);
