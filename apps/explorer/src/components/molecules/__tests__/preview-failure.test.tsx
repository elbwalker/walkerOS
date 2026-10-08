// Stub the Vite virtual module before any import of code.tsx.
jest.mock('virtual:walkeros-core-types', () => '', { virtual: true });

// The browser source's failure modes, with everything else real: the source
// factory either throws, or builds the real source whose init rejects. The
// collector is a real one; collector.push is never mocked.
const mockFailure: { at?: 'factory' | 'init' } = {};
jest.mock('@walkeros/web-source-browser', () => {
  const actual = jest.requireActual<
    typeof import('@walkeros/web-source-browser')
  >('@walkeros/web-source-browser');
  const sourceBrowser: typeof actual.sourceBrowser = async (context) => {
    if (mockFailure.at === 'factory') throw new Error('no document');
    const instance = await actual.sourceBrowser(context);
    return mockFailure.at === 'init'
      ? {
          ...instance,
          init: async () => {
            throw new Error('scope missing');
          },
        }
      : instance;
  };
  return { ...actual, sourceBrowser };
});

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { startFlow } from '@walkeros/collector';
import { Preview } from '../preview';

const html =
  '<div data-elb="product" data-elbaction="load:view"><button>Add</button></div>';

beforeEach(() => {
  // The shared web setup turns fake timers on; the preview runs on real ones.
  jest.useRealTimers();
  delete mockFailure.at;
});

const alert = (container: HTMLElement) =>
  container.querySelector('[role="alert"]');

it.each<['factory' | 'init', RegExp]>([
  ['init', /Error.*Events are not captured: scope missing/],
  [
    'factory',
    /Error.*Events are not captured: the browser source did not start/,
  ],
])('names a source whose %s fails in the Preview box', async (at, words) => {
  mockFailure.at = at;
  const { collector } = await startFlow();
  const { container, unmount } = render(
    <Preview html={html} collector={collector} />,
  );

  await waitFor(() => expect(alert(container)).toHaveTextContent(words), {
    timeout: 3000,
  });
  unmount();
  await collector.command('shutdown');
});
