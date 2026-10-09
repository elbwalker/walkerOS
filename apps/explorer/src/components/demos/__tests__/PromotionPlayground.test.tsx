// Stub the Vite virtual module before any import of code.tsx.
jest.mock('virtual:walkeros-core-types', () => '', { virtual: true });

// The real CodeBox and Code render; only Monaco itself is replaced, by a
// textarea that shows the editor's value, its language and whether it is
// read-only, and reports edits like Monaco does.
jest.mock('@monaco-editor/react', () => {
  // require inside the factory: jest hoists jest.mock above imports.
  const ReactLocal = require('react');
  const Editor = ({
    defaultValue,
    language,
    onChange,
    options,
  }: {
    defaultValue: string;
    language: string;
    onChange: (value: string | undefined) => void;
    options: { readOnly?: boolean };
  }) =>
    ReactLocal.createElement('textarea', {
      'data-language': language,
      value: defaultValue,
      readOnly: options.readOnly,
      onChange: (event: { target: { value: string } }) =>
        onChange(event.target.value),
    });
  return {
    Editor,
    loader: { config: () => {}, init: () => Promise.resolve() },
    useMonaco: () => null,
  };
});

import React, { StrictMode } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { PromotionPlayground } from '../PromotionPlayground';
import {
  createGtagDestination,
  type DestinationCode,
} from '../../../helpers/destinations';

// Preview renders 200 ms after a change and binds its source 50 ms later.
const WAIT = { timeout: 3000 };

beforeEach(() => {
  // The shared web setup turns fake timers on; the preview, the collector and
  // the mapping debounce run on real ones here.
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

function editor(container: HTMLElement, label: string): HTMLTextAreaElement {
  const found = box(container, label).querySelector('textarea');
  if (!found) throw new Error(`The ${label} box has no editor`);
  return found;
}

const shown = (container: HTMLElement, label: string) =>
  editor(container, label).value;

function frame(container: HTMLElement): Document {
  const doc = container.querySelector('iframe')?.contentDocument;
  if (!doc) throw new Error('The preview has no document');
  return doc;
}

function button(doc: Document, text: string): HTMLButtonElement {
  const found = Array.from(doc.querySelectorAll('button')).find(
    (element) => element.textContent?.trim() === text,
  );
  if (!found) throw new Error(`The preview has no ${text} button`);
  return found;
}

/** The demo gtag destination, recording each call it formats. */
function recordingGtag(overrides: Partial<DestinationCode> = {}) {
  const gtag = createGtagDestination();
  const pushes: string[] = [];
  const destination: DestinationCode = {
    ...gtag,
    push: (event, context) => {
      pushes.push(event.name);
      return gtag.push(event, context);
    },
    ...overrides,
  };
  return { destination, pushes };
}

describe('PromotionPlayground', () => {
  it('starts every JSON box empty or with valid JSON, and the output boxes read-only', async () => {
    const { container, unmount } = render(<PromotionPlayground />);

    const json = Array.from(
      container.querySelectorAll<HTMLTextAreaElement>(
        'textarea[data-language="json"]',
      ),
    ).map((element) => element.value);
    expect(json.length).toBeGreaterThan(0);
    for (const code of json) {
      if (code !== '') expect(() => JSON.parse(code)).not.toThrow();
    }
    expect(editor(container, 'Events').readOnly).toBe(true);
    expect(editor(container, 'Result').readOnly).toBe(true);
    expect(editor(container, 'Mapping').readOnly).toBe(false);
    expect(box(container, 'Events')).toHaveTextContent(
      'Click the preview to see its events.',
    );

    // Let the preview bind before it unmounts.
    await waitFor(() => expect(shown(container, 'Events')).not.toBe(''), WAIT);
    unmount();
  });

  it('shows the load event and the mapped gtag call', async () => {
    const { container, unmount } = render(<PromotionPlayground />);

    await waitFor(
      () => expect(shown(container, 'Events')).toContain('"product view"'),
      WAIT,
    );
    await waitFor(() =>
      expect(shown(container, 'Result')).toContain("gtag('event', 'view_item'"),
    );
    expect(shown(container, 'Result')).toContain('"item_variant": "sweet"');
    unmount();
  });

  it('shows add with the selected taste and save on clicks in the preview', async () => {
    const { container, unmount } = render(<PromotionPlayground />);
    await waitFor(
      () => expect(shown(container, 'Events')).toContain('"product view"'),
      WAIT,
    );
    const doc = frame(container);

    const select = doc.querySelector('select');
    if (!select) throw new Error('The preview has no taste select');
    select.value = 'spicy';
    fireEvent.click(button(doc, 'Add to Cart'));

    await waitFor(() =>
      expect(shown(container, 'Events')).toContain('"product add"'),
    );
    expect(shown(container, 'Events')).toContain('"taste": "spicy"');
    await waitFor(() =>
      expect(shown(container, 'Result')).toContain(
        "gtag('event', 'add_to_cart'",
      ),
    );
    expect(shown(container, 'Result')).toContain('"item_variant": "spicy"');

    fireEvent.click(button(doc, 'Maybe later'));
    await waitFor(() =>
      expect(shown(container, 'Events')).toContain('"product save"'),
    );
    await waitFor(() =>
      expect(shown(container, 'Result')).toContain(
        "gtag('event', 'add_to_wishlist'",
      ),
    );
    unmount();
  });

  it('applies a mapping edit once, after typing stops', async () => {
    const { destination, pushes } = recordingGtag();
    const { container, unmount } = render(
      <PromotionPlayground destination={destination} />,
    );
    await waitFor(() => expect(pushes).toEqual(['view_item']), WAIT);

    const mapping = editor(container, 'Mapping');
    for (const name of ['first', 'second', 'third']) {
      fireEvent.change(mapping, {
        target: { value: JSON.stringify({ product: { view: { name } } }) },
      });
    }

    await waitFor(() => expect(pushes).toEqual(['view_item', 'third']), WAIT);
    expect(shown(container, 'Result')).toContain("gtag('event', 'third'");
    // The Events box shows what the preview sent, not the re-run.
    expect(shown(container, 'Events')).toContain('"product view"');
    unmount();
  });

  it('drops a pending mapping edit on unmount and shuts the collector down', async () => {
    const destroy = jest.fn();
    const { destination, pushes } = recordingGtag({ destroy });
    const { container, unmount } = render(
      <PromotionPlayground destination={destination} />,
    );
    await waitFor(() => expect(pushes).toEqual(['view_item']), WAIT);

    fireEvent.change(editor(container, 'Mapping'), {
      target: {
        value: JSON.stringify({ product: { view: { name: 'late' } } }),
      },
    });
    unmount();

    await waitFor(() => expect(destroy).toHaveBeenCalledTimes(1));
    await act(() => new Promise((resolve) => setTimeout(resolve, 700)));
    expect(pushes).toEqual(['view_item']);
  });

  it('names an invalid mapping in the Mapping box and keeps capturing', async () => {
    const { container, unmount } = render(
      <PromotionPlayground initialMapping="{ not json" />,
    );

    // Input validation is announced politely, not as an alert.
    expect(
      box(container, 'Mapping').querySelector('[role="alert"]'),
    ).toBeNull();
    expect(
      box(container, 'Mapping').querySelector('[role="status"]'),
    ).toHaveTextContent(/Error.*Mapping not applied/);
    await waitFor(
      () => expect(shown(container, 'Events')).toContain('"product view"'),
      WAIT,
    );
    unmount();
  });

  it('names a destination failure in the Result box', async () => {
    const { destination } = recordingGtag({
      push: () => {
        throw new Error('gtag is not loaded');
      },
    });
    const { container, unmount } = render(
      <PromotionPlayground destination={destination} />,
    );

    await waitFor(
      () =>
        expect(
          box(container, 'Result').querySelector('[role="alert"]'),
        ).toHaveTextContent(/Error.*gtag is not loaded/),
      WAIT,
    );
    unmount();
  });

  it('names a destination init failure in the Result box', async () => {
    const { destination } = recordingGtag({
      init: () => {
        throw new Error('gtag init failed');
      },
    });
    const { container, unmount } = render(
      <PromotionPlayground destination={destination} />,
    );

    await waitFor(
      () =>
        expect(
          box(container, 'Result').querySelector('[role="alert"]'),
        ).toHaveTextContent(/Error.*gtag init failed/),
      WAIT,
    );
    unmount();
  });

  it('clears the Result when an event makes no gtag call', async () => {
    const { container, unmount } = render(<PromotionPlayground />);
    await waitFor(
      () =>
        expect(shown(container, 'Result')).toContain(
          "gtag('event', 'view_item'",
        ),
      WAIT,
    );

    fireEvent.change(editor(container, 'Mapping'), {
      target: {
        value: JSON.stringify({ product: { view: { ignore: true } } }),
      },
    });

    await waitFor(() => expect(shown(container, 'Result')).toBe(''), WAIT);
    expect(box(container, 'Result')).toHaveTextContent(
      'No gtag call for this event.',
    );
    unmount();
  });

  it('starts one collector in strict mode and shuts the discarded one down', async () => {
    const destroy = jest.fn();
    const { destination, pushes } = recordingGtag({ destroy });
    const { unmount } = render(
      <StrictMode>
        <PromotionPlayground destination={destination} />
      </StrictMode>,
    );

    await waitFor(() => expect(pushes).toEqual(['view_item']), WAIT);
    // The collector of the discarded first mount, never the running one.
    await waitFor(() => expect(destroy).toHaveBeenCalledTimes(1));
    unmount();
    await waitFor(() => expect(destroy).toHaveBeenCalledTimes(2));
  });

  it('keeps a mapping edit made while the collector starts', async () => {
    jest.useFakeTimers();
    const { destination, pushes } = recordingGtag();
    const { container, unmount } = render(
      <PromotionPlayground destination={destination} />,
    );

    fireEvent.change(editor(container, 'Mapping'), {
      target: {
        value: JSON.stringify({ product: { view: { name: 'early' } } }),
      },
    });
    // The edit applies before the start resolves: no await in between.
    act(() => {
      jest.advanceTimersByTime(500);
    });
    // Then the start, the preview and the load event, on the fake clock.
    for (let step = 0; step < 20 && pushes.length === 0; step++)
      await act(() => jest.advanceTimersByTimeAsync(250));

    expect(pushes).toEqual(['early']);
    unmount();
  });

  it('names the preview by its first tab, not a second label', () => {
    const { container, unmount } = render(<PromotionPlayground />);

    const labels = Array.from(
      container.querySelectorAll('.elb-explorer-label'),
    ).map((label) => label.textContent);
    expect(labels).toEqual(['Events', 'Mapping', 'Result']);
    expect(
      Array.from(container.querySelectorAll('button')).some(
        (button) => button.textContent === 'Preview',
      ),
    ).toBe(true);
    unmount();
  });
});
