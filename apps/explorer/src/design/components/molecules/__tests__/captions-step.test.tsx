import React from 'react';
import { render } from '@testing-library/react';
import { Captions } from '../Captions';
import { StepMarker, type StepMarkerProps } from '../StepMarker';

afterEach(() => jest.restoreAllMocks());

describe('Captions', () => {
  it('shows at most two lines and logs nothing for more', () => {
    const logs = [
      jest.spyOn(console, 'error').mockImplementation(() => {}),
      jest.spyOn(console, 'warn').mockImplementation(() => {}),
      jest.spyOn(console, 'log').mockImplementation(() => {}),
    ];
    const { container } = render(
      <Captions lines={['One line.', 'Two lines.', 'Three lines.']} />,
    );
    expect(
      Array.from(
        container.querySelectorAll('.elb-captions__line'),
        (line) => line.textContent,
      ),
    ).toEqual(['One line.', 'Two lines.']);
    for (const log of logs) expect(log).not.toHaveBeenCalled();
  });

  it('marks exactly the highlighted word as current', () => {
    const { container } = render(
      <Captions
        lines={['Add one script tag', 'and walker.js runs.']}
        highlight={{ line: 1, word: 1 }}
      />,
    );
    const current = container.querySelectorAll('[aria-current="true"]');
    expect(Array.from(current, (word) => word.textContent)).toEqual([
      'walker.js',
    ]);
    expect(container.textContent).toBe('Add one script tagand walker.js runs.');
  });

  it('marks nothing for a word beyond the lines', () => {
    const { container } = render(
      <Captions lines={['One line.']} highlight={{ line: 0, word: 9 }} />,
    );
    expect(container.querySelectorAll('[aria-current]')).toHaveLength(0);
  });
});

describe('StepMarker', () => {
  it.each<[StepMarkerProps['surface'], string]>([
    ['page', 'Page'],
    ['code', 'Code'],
    ['cli', 'CLI'],
    ['mcp', 'MCP'],
    ['app', 'App'],
  ])(
    'shows the number, the %s surface as "%s" and the title',
    (surface, word) => {
      const { container, getByRole } = render(
        <StepMarker n={2} surface={surface} title="Tag the element" />,
      );
      expect(container.querySelector('.elb-step-number')?.textContent).toBe(
        '2',
      );
      expect(
        container.querySelector('.elb-step-marker__surface')?.textContent,
      ).toBe(word);
      expect(getByRole('heading').textContent).toBe('Tag the element');
    },
  );
});
