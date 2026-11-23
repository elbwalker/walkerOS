import React from 'react';
import { render } from '@testing-library/react';
import { Terminal, type TerminalLine } from '../Terminal';

const LINES: readonly TerminalLine[] = [
  { kind: 'command', text: 'walkeros validate flow.json' },
  { kind: 'output', text: 'Checking 1 flow' },
  {
    kind: 'status',
    status: 'danger',
    text: 'destination.ga4: settings missing',
  },
];

describe('Terminal', () => {
  it('is a dark island in both page themes', () => {
    const { container } = render(<Terminal lines={LINES} />);
    expect(container.firstElementChild?.getAttribute('data-theme')).toBe(
      'dark',
    );
  });

  it('leads a command with its prompt', () => {
    const { container } = render(<Terminal lines={LINES.slice(0, 1)} />);
    const line = container.querySelector('.elb-terminal__line');
    expect(line?.querySelector('.elb-terminal__prompt')?.textContent).toBe('$');
    expect(line?.textContent).toBe('$ walkeros validate flow.json');
  });

  it('shows a danger status with its word and icon', () => {
    const { container } = render(<Terminal lines={LINES} />);
    const status = container.querySelector('.elb-terminal__line--danger');
    expect(status?.querySelector('.elb-terminal__word')?.textContent).toBe(
      'Error',
    );
    expect(status?.querySelector('svg.elb-icon--danger')).not.toBeNull();
    expect(status?.textContent).toContain('destination.ga4: settings missing');
  });

  it.each([
    ['with caret', true, 1],
    ['without caret', false, 0],
  ])('%s: carets after the last line', (_name, caret, count) => {
    const { container } = render(<Terminal lines={LINES} caret={caret} />);
    expect(container.querySelectorAll('.elb-terminal__caret')).toHaveLength(
      count,
    );
    const lines = container.querySelectorAll('.elb-terminal__line');
    expect(
      lines[lines.length - 1]?.querySelectorAll('.elb-terminal__caret'),
    ).toHaveLength(count);
  });

  it('shows its title in the bar', () => {
    const { container } = render(<Terminal title="zsh" lines={[]} />);
    expect(container.querySelector('.elb-terminal__title')?.textContent).toBe(
      'zsh',
    );
  });
});
