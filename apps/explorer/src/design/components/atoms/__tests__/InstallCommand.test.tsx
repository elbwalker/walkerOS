import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { InstallCommand } from '../InstallCommand';
import { PROBE, expectRootTagged } from '../../__tests__/passThrough';

// The clipboard promise settles in a microtask; act flushes the state update.
async function settle(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
}

function iconName(container: HTMLElement): string | null {
  return (
    container
      .querySelector('.elb-cmd__icon svg')
      ?.getAttribute('class')
      ?.replace('elb-icon elb-icon--', '') ?? null
  );
}

// Each test gets its own clipboard, so no test changes the shared setup mock.
function useClipboard(writeText: (text: string) => Promise<void>): void {
  Object.assign(navigator, { clipboard: { writeText } });
}

describe('InstallCommand', () => {
  const clipboard = navigator.clipboard;

  afterEach(() => {
    Object.assign(navigator, { clipboard });
    jest.restoreAllMocks();
  });

  it('passes every attribute it does not own to its button', () => {
    expectRootTagged(<InstallCommand {...PROBE} />, 'button');
  });

  // Speech input targets a button by its visible text (label in name).
  it('is named by the command it shows and described by its action', () => {
    const { getByRole } = render(<InstallCommand />);
    const button = getByRole('button', { name: 'npm i -g @walkeros/cli' });
    expect(button).toHaveAccessibleDescription('Copy install command');
  });

  it('keeps its action description beside a caller description', () => {
    const { getByRole } = render(
      <>
        <InstallCommand aria-describedby="note" />
        <p id="note">Needs Node 20.</p>
      </>,
    );
    expect(
      getByRole('button', { name: /npm i -g @walkeros\/cli/ }),
    ).toHaveAccessibleDescription('Copy install command Needs Node 20.');
  });

  it('copies the command, confirms for 1.4 s, then shows the copy icon again', async () => {
    const writeText = jest.fn((_text: string) => Promise.resolve());
    useClipboard(writeText);
    const schedule = jest.spyOn(global, 'setTimeout');
    const { container, getByRole } = render(
      <InstallCommand command="npm i -g @walkeros/cli" />,
    );
    expect(getByRole('button').textContent).toBe('$ npm i -g @walkeros/cli');
    fireEvent.click(getByRole('button'));
    await settle();
    expect(writeText).toHaveBeenCalledWith('npm i -g @walkeros/cli');
    expect(iconName(container)).toBe('check');
    expect(getByRole('status').textContent).toBe('Copied');
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), 1400);
    act(() => {
      jest.advanceTimersByTime(1399);
    });
    expect(iconName(container)).toBe('check');
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(iconName(container)).toBe('copy');
    expect(getByRole('status').textContent).toBe('');
  });

  // A failed copy that showed the check would tell the visitor something that
  // did not happen.
  it.each<[string, () => void]>([
    [
      'the clipboard API is missing (http, older browsers)',
      () => Object.assign(navigator, { clipboard: undefined }),
    ],
    [
      'writeText throws',
      () =>
        useClipboard(() => {
          throw new Error('denied');
        }),
    ],
    [
      'writeText rejects',
      () => useClipboard(() => Promise.reject(new Error('denied'))),
    ],
  ])(
    'says "Copy failed" and keeps the copy icon when %s',
    async (_case, arrange) => {
      arrange();
      const { container, getByRole } = render(<InstallCommand />);
      fireEvent.click(getByRole('button'));
      await settle();
      expect(iconName(container)).toBe('copy');
      expect(getByRole('status').textContent).toBe('Copy failed');
    },
  );

  // React's own act machinery adds fake timers, so the count of pending
  // timers says nothing; the component's own setTimeout call does.
  it('schedules nothing once unmounted', async () => {
    useClipboard(() => Promise.resolve());
    const schedule = jest.spyOn(global, 'setTimeout');
    const { getByRole, unmount } = render(<InstallCommand />);
    fireEvent.click(getByRole('button'));
    unmount();
    await settle();
    expect(schedule).not.toHaveBeenCalled();
  });
});
