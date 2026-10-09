// Stub the Vite virtual module before any import of code.tsx.
jest.mock('virtual:walkeros-core-types', () => '', { virtual: true });

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import type { Destination, WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { Preview } from '../preview';

// Preview's contract with the browser source: the source binds to the frame
// through the collector's own source wiring, so its events reach the
// collector's destinations. A change to that contract fails here.

const html = `<div data-elb="product" data-elbaction="load:view">
  <h3 data-elb-product="name:Snack">Snack</h3>
  <button data-elbaction="click:add">Add</button>
</div>`;

const WAIT = { timeout: 3000 };

beforeEach(() => {
  // The shared web setup turns fake timers on; the preview runs on real ones.
  jest.useRealTimers();
});

async function capturingCollector() {
  const events: WalkerOS.Event[] = [];
  const capture: Destination.Instance = {
    type: 'capture',
    config: {},
    push: (event) => {
      events.push(event);
    },
  };
  const { collector } = await startFlow({
    destinations: { capture: { code: capture } },
  });
  return { collector, names: () => events.map((event) => event.name), events };
}

function frame(container: HTMLElement): Document {
  const doc = container.querySelector('iframe')?.contentDocument;
  if (!doc) throw new Error('The preview has no document');
  return doc;
}

describe('Preview', () => {
  it('sends its load and click events to the collector', async () => {
    const { collector, names, events } = await capturingCollector();
    const { container, unmount } = render(
      <Preview html={html} collector={collector} />,
    );

    await waitFor(() => expect(names()).toEqual(['product view']), WAIT);
    expect(events[0].data).toEqual({ name: 'Snack' });

    const add = frame(container).querySelector('button');
    if (!add) throw new Error('The preview has no button');
    fireEvent.click(add);

    await waitFor(() =>
      expect(names()).toEqual(['product view', 'product add']),
    );
    unmount();
    await collector.command('shutdown');
  });

  it('fires load once: an edit rebinds clicks without a second view', async () => {
    const { collector, names } = await capturingCollector();
    const { container, rerender, unmount } = render(
      <Preview html={html} collector={collector} />,
    );
    await waitFor(() => expect(names()).toEqual(['product view']), WAIT);

    rerender(
      <Preview html={html.replace(/Snack/g, 'Fries')} collector={collector} />,
    );
    await waitFor(
      () => expect(frame(container).body.textContent).toContain('Fries'),
      WAIT,
    );
    // Click until the edited document's own source has bound and captures it.
    await waitFor(() => {
      const add = frame(container).querySelector('button');
      if (!add) throw new Error('The preview has no button');
      fireEvent.click(add);
      expect(names()).toContain('product add');
    }, WAIT);
    expect(names().filter((name) => name === 'product view')).toHaveLength(1);
    unmount();
    await collector.command('shutdown');
  });

  it('renders without a collector and captures nothing', () => {
    const { container, unmount } = render(<Preview html={html} />);

    expect(container.querySelector('iframe')).not.toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    unmount();
  });
});
