// Stub the Vite virtual module before any import of code.tsx.
jest.mock('virtual:walkeros-core-types', () => '', { virtual: true });

// The real CodeBox and Code render; only Monaco itself is replaced, by a
// textarea that shows the editor's value.
jest.mock('@monaco-editor/react', () => {
  // require inside the factory: jest hoists jest.mock above imports.
  const ReactLocal = require('react');
  const Editor = ({
    defaultValue,
    language,
  }: {
    defaultValue: string;
    language: string;
  }) =>
    ReactLocal.createElement('textarea', {
      'data-language': language,
      value: defaultValue,
      readOnly: true,
    });
  return {
    Editor,
    loader: { config: () => {}, init: () => Promise.resolve() },
    useMonaco: () => null,
  };
});

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { LiveCode } from '../live-code';
import { Default } from '../live-code.stories';

beforeEach(() => {
  // The shared web setup turns fake timers on; the live run uses real ones.
  jest.useRealTimers();
});

function box(container: HTMLElement, label: string): HTMLElement {
  const found = Array.from(
    container.querySelectorAll<HTMLElement>('.elb-explorer-box'),
  ).find(
    (element) =>
      element.querySelector('.elb-explorer-label')?.textContent === label,
  );
  if (!found) throw new Error(`No box labelled ${label}`);
  return found;
}

const result = (container: HTMLElement) =>
  box(container, 'Result').querySelector('textarea')?.value;

describe('LiveCode', () => {
  it('runs the mapping example of its story against a real collector', async () => {
    // Without the story's static output, the box shows what the run logged.
    const args = Default.args ?? {};
    const { container, unmount } = render(
      <LiveCode {...args} input={args.input} output={undefined} />,
    );

    await waitFor(() => expect(result(container)).toBe('"12345"'), {
      timeout: 3000,
    });
    expect(box(container, 'Result')).not.toHaveTextContent('Error');
    unmount();
  });

  it('shows its empty text in words beside an empty output editor', () => {
    const { container, unmount } = render(
      <LiveCode input={{ name: 'page view' }} emptyText="Nothing yet." />,
    );

    expect(result(container)).toBe('');
    expect(box(container, 'Result')).toHaveTextContent('Nothing yet.');
    unmount();
  });

  it('names a failed run in the Result box', async () => {
    const { container, unmount } = render(
      <LiveCode
        input={{ name: 'page view' }}
        fn={async () => {
          throw new Error('mapping failed');
        }}
      />,
    );

    await waitFor(() =>
      expect(
        box(container, 'Result').querySelector('[role="alert"]'),
      ).toHaveTextContent(/Error.*mapping failed/),
    );
    expect(result(container)).toBe('');
    // The error stands alone: no empty text beside it.
    expect(box(container, 'Result')).not.toHaveTextContent('No event yet.');
    unmount();
  });

  it('shows a log that arrives after the run resolved', async () => {
    const { container, unmount } = render(
      <LiveCode
        input={{ name: 'page view' }}
        fn={async (_input, _config, log) => {
          setTimeout(() => log('late'), 50);
        }}
      />,
    );

    await waitFor(() => expect(result(container)).toBe('"late"'));
    unmount();
  });
});
