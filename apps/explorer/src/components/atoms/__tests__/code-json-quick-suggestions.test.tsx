/**
 * Bug (user report): editing JSON in the Monaco CodeBox with a schema +
 * IntelliSense is a "weird experience" — autocomplete popups fire on every
 * keystroke while the JSON is still being typed (and thus transiently invalid).
 *
 * Cause: code.tsx configures `quickSuggestions: { strings: true, other: true }`
 * whenever a jsonSchema or intellisenseContext is attached. `other: true` makes
 * Monaco request completions on every non-string token (keys, numbers, booleans)
 * mid-edit. Keeping `strings: true` preserves useful in-string completions
 * (e.g. `$ref.` paths) while `other: false` stops the per-keystroke popups; the
 * user can still trigger them explicitly with Ctrl+Space.
 *
 * This test reads the real `options` the component passes to @monaco-editor/react
 * (not a hardcoded mirror), so it fails iff code.tsx still sets `other: true`.
 *
 * Note: the cursor-jump symptom is a controlled-value round-trip that can only
 * be observed against real Monaco (jsdom has no editor model/cursor); it is
 * covered by the dev-only Playwright repro, not here.
 */

// Stub the Vite virtual module before any import of code.tsx.
jest.mock('virtual:walkeros-core-types', () => '', { virtual: true });

// jsdom doesn't ship matchMedia; code.tsx uses it for theme detection.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Capture the `options` prop the real component hands to the editor. The global
// mock (jest.setup.ts) is a bare <div> that discards props, so we extend it
// locally to record options. The production file-based mock is untouched.
let capturedOptions: Record<string, unknown> | null = null;

jest.mock('@monaco-editor/react', () => {
  // require inside the factory: jest hoists jest.mock above imports.
  const ReactLocal = require('react');
  const Editor = ({
    options,
  }: {
    options?: Record<string, unknown>;
    [key: string]: unknown;
  }) => {
    capturedOptions = options ?? null;
    return ReactLocal.createElement('div', { 'data-testid': 'monaco-editor' });
  };
  return {
    Editor,
    default: Editor,
    loader: { config: () => {}, init: () => Promise.resolve() },
    useMonaco: () => null,
  };
});

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Code } from '../code';

beforeEach(() => {
  capturedOptions = null;
});

it('does not fire quickSuggestions on non-string tokens for a JSON editor with a schema', () => {
  render(
    <Code
      code='{"version":4}'
      language="json"
      onChange={() => {}}
      jsonSchema={{ type: 'object' }}
    />,
  );

  expect(capturedOptions).not.toBeNull();
  expect(capturedOptions?.quickSuggestions).toEqual({
    strings: true,
    other: false,
    comments: false,
  });
});
