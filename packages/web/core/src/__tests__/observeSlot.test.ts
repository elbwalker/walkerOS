/**
 * The page's Observe credential slot, driven through a real collector: the
 * web arm reads the credential from the real jsdom URL (history.replaceState)
 * or the localStorage slot, persists it, strips a URL-borne copy and
 * self-heals the slot.
 *
 * Env-injection only: the poster's global fetch is swapped via
 * Object.defineProperty (and restored), warns are captured via an injected
 * logger handler. No jest.mock anywhere.
 */
import { startFlow } from '@walkeros/collector';
import { Level } from '@walkeros/core';
import type { Logger, PosterFetch } from '@walkeros/core';
import { pageObserveSlot } from '../observeSlot';

const OBSERVER_URL = 'https://obs.example';

interface CapturedPost {
  url: string;
  body: string;
  headers: Record<string, string>;
}

/** Swap the global fetch for a capturing stub; returns a restore fn. */
function stubFetch(
  posts: CapturedPost[],
  response: { ok: boolean; status: number } = { ok: true, status: 200 },
): () => void {
  const stub: PosterFetch = async (url, init) => {
    posts.push({ url, body: init.body, headers: init.headers });
    return response;
  };
  const original = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  Object.defineProperty(globalThis, 'fetch', {
    value: stub,
    configurable: true,
    writable: true,
  });
  return () => {
    if (original) Object.defineProperty(globalThis, 'fetch', original);
    else Reflect.deleteProperty(globalThis, 'fetch');
  };
}

/** Capture WARN-level messages via an injected logger handler. */
function warnCapture(): { warns: string[]; logger: Logger.Config } {
  const warns: string[] = [];
  const handler: Logger.Handler = (level, message) => {
    if (level === Level.WARN) warns.push(message);
  };
  return { warns, logger: { level: 'WARN', handler } };
}

function setUrl(search: string): void {
  window.history.replaceState({}, '', `https://example.com/${search}`);
}

describe('pageObserveSlot', () => {
  beforeEach(() => {
    localStorage.clear();
    setUrl('');
  });

  it('installs nothing with no URL param and no stored slot (zero-work)', async () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    const { collector } = await startFlow({
      observe: { url: OBSERVER_URL, binding: 'pb_x', slot: pageObserveSlot() },
    });
    expect(collector.observers.size).toBe(0);
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('reads the URL param, persists the slot, and posts with binding header + credential secret', async () => {
    jest.useRealTimers();
    setUrl('?elbObserve=obsw_pb_x.ses_9.sec_1');
    const posts: CapturedPost[] = [];
    const restore = stubFetch(posts);
    try {
      const { collector, elb } = await startFlow({
        observe: {
          url: OBSERVER_URL,
          binding: 'pb_x',
          slot: pageObserveSlot(),
        },
      });
      expect(collector.observers.size).toBe(1);
      expect(localStorage.getItem('elbObserve')).toBe('obsw_pb_x.ses_9.sec_1');

      await elb('page view');
      await new Promise((resolve) => setTimeout(resolve, 120));

      expect(posts.length).toBeGreaterThan(0);
      const first = posts[0];
      expect(first?.url).toBe(`${OBSERVER_URL}/ingest/ses_9`);
      expect(first?.headers.Authorization).toBe('Bearer sec_1');
      expect(first?.headers['X-Walkeros-Binding']).toBe('pb_x');
    } finally {
      restore();
    }
  });

  it('attaches from the stored slot when no URL param is present', async () => {
    setUrl('?keep=1');
    localStorage.setItem('elbObserve', 'obsw_pb_x.ses_9.sec_1');
    const { collector } = await startFlow({
      observe: { url: OBSERVER_URL, binding: 'pb_x', slot: pageObserveSlot() },
    });
    expect(collector.observers.size).toBe(1);
    // Slot-sourced attach never touches the address bar.
    expect(window.location.search).toBe('?keep=1');
  });

  it('strips elbObserve from the address bar after a URL-param attach, keeping innocent params', async () => {
    setUrl('?foo=1&elbObserve=obsw_pb_x.ses_9.sec_1&bar=2');
    const { collector } = await startFlow({
      observe: { url: OBSERVER_URL, binding: 'pb_x', slot: pageObserveSlot() },
    });
    expect(collector.observers.size).toBe(1);
    expect(window.location.search).not.toContain('elbObserve');
    expect(window.location.search).toContain('foo=1');
    expect(window.location.search).toContain('bar=2');
  });

  it('clears the slot and stops posting when the observer answers 401', async () => {
    jest.useRealTimers();
    localStorage.setItem('elbObserve', 'obsw_pb_x.ses_9.sec_1');
    const posts: CapturedPost[] = [];
    const restore = stubFetch(posts, { ok: false, status: 401 });
    try {
      const { collector, elb } = await startFlow({
        observe: {
          url: OBSERVER_URL,
          binding: 'pb_x',
          slot: pageObserveSlot(),
        },
      });
      expect(collector.observers.size).toBe(1);

      await elb('page view');
      await new Promise((resolve) => setTimeout(resolve, 120));

      expect(posts.length).toBeGreaterThan(0);
      expect(localStorage.getItem('elbObserve')).toBeNull();
      expect(collector.observers.size).toBe(0);

      // Detached: further events never reach the poster.
      const before = posts.length;
      await elb('page next');
      await new Promise((resolve) => setTimeout(resolve, 120));
      expect(posts.length).toBe(before);
    } finally {
      restore();
    }
  });

  it('keeps the slot and keeps observing on a non-401 status', async () => {
    jest.useRealTimers();
    localStorage.setItem('elbObserve', 'obsw_pb_x.ses_9.sec_1');
    const posts: CapturedPost[] = [];
    const restore = stubFetch(posts, { ok: false, status: 500 });
    try {
      const { collector, elb } = await startFlow({
        observe: {
          url: OBSERVER_URL,
          binding: 'pb_x',
          slot: pageObserveSlot(),
        },
      });

      await elb('page view');
      await new Promise((resolve) => setTimeout(resolve, 120));

      expect(posts.length).toBeGreaterThan(0);
      expect(localStorage.getItem('elbObserve')).toBe('obsw_pb_x.ses_9.sec_1');
      expect(collector.observers.size).toBe(1);
    } finally {
      restore();
    }
  });

  it('warns and installs nothing when the credential pb mismatches the binding', async () => {
    setUrl('?elbObserve=obsw_pb_other.ses_9.sec_1');
    const { warns, logger } = warnCapture();
    const { collector } = await startFlow({
      logger,
      observe: { url: OBSERVER_URL, binding: 'pb_x', slot: pageObserveSlot() },
    });
    expect(collector.observers.size).toBe(0);
    expect(warns.some((m) => m.includes('binding'))).toBe(true);
    expect(localStorage.getItem('elbObserve')).toBeNull();
  });

  it('warns and installs nothing on a malformed credential', async () => {
    setUrl('?elbObserve=garbage');
    const { warns, logger } = warnCapture();
    const { collector } = await startFlow({
      logger,
      observe: { url: OBSERVER_URL, binding: 'pb_x', slot: pageObserveSlot() },
    });
    expect(collector.observers.size).toBe(0);
    expect(warns.length).toBeGreaterThan(0);
  });

  it('never touches a stored slot for a malformed URL credential', async () => {
    // URL-sourced garbage never touches stored state (anti-griefing): a
    // crafted link cannot destroy a valid stored credential.
    setUrl('?elbObserve=garbage');
    localStorage.setItem('elbObserve', 'obsw_pb_x.ses_9.sec_1');
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    const removeItem = jest.spyOn(Storage.prototype, 'removeItem');
    const { warns, logger } = warnCapture();
    const { collector } = await startFlow({
      logger,
      observe: { url: OBSERVER_URL, binding: 'pb_x', slot: pageObserveSlot() },
    });
    expect(collector.observers.size).toBe(0);
    expect(warns).toContain('observe: malformed credential ignored');
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(localStorage.getItem('elbObserve')).toBe('obsw_pb_x.ses_9.sec_1');
    setItem.mockRestore();
    removeItem.mockRestore();
  });

  it('honors a baked flowId and trace level from the connect config', async () => {
    jest.useRealTimers();
    localStorage.setItem('elbObserve', 'obsw_pb_x.ses_9.sec_1');
    const posts: CapturedPost[] = [];
    const restore = stubFetch(posts);
    try {
      const { collector, elb } = await startFlow({
        name: 'localname',
        observe: {
          url: OBSERVER_URL,
          binding: 'pb_x',
          flowId: 'flow_db_1',
          level: 'trace',
          slot: pageObserveSlot(),
        },
      });
      // The baked level reaches the collector-wide supplier so destination
      // call capture runs at trace.
      expect(collector.observeLevel?.()).toBe('trace');

      await elb('page view');
      await new Promise((resolve) => setTimeout(resolve, 120));

      expect(posts.length).toBeGreaterThan(0);
      // Records carry the BAKED flowId (not the local config name), and at
      // trace the projection keeps the inbound event payload.
      expect(JSON.parse(posts[0]?.body ?? '')).toEqual(
        expect.objectContaining({
          v: 1,
          records: expect.arrayContaining([
            expect.objectContaining({
              flowId: 'flow_db_1',
              inEvent: expect.objectContaining({ name: 'page view' }),
            }),
          ]),
        }),
      );
    } finally {
      restore();
    }
  });

  it('defaults to the flow name, standard level, and no observeLevel supplier', async () => {
    localStorage.setItem('elbObserve', 'obsw_pb_x.ses_9.sec_1');
    const { collector } = await startFlow({
      name: 'myflow',
      observe: { url: OBSERVER_URL, binding: 'pb_x', slot: pageObserveSlot() },
    });
    expect(collector.observers.size).toBe(1);
    // No baked level: the collector-wide capture supplier stays unset.
    expect(collector.observeLevel).toBeUndefined();
  });

  it('warns and self-heals a malformed STORED slot value', async () => {
    localStorage.setItem('elbObserve', 'garbage');
    const { warns, logger } = warnCapture();
    const { collector } = await startFlow({
      logger,
      observe: { url: OBSERVER_URL, binding: 'pb_x', slot: pageObserveSlot() },
    });
    expect(collector.observers.size).toBe(0);
    expect(warns.length).toBeGreaterThan(0);
    // Stored state clears on its own failure -- the next pageview is
    // back on the silent zero-work path.
    expect(localStorage.getItem('elbObserve')).toBeNull();
  });

  it('clears the stored slot only while it still holds the same credential', () => {
    // CAS: a credential re-minted by another tab is never destroyed by a
    // stale poster's self-heal.
    localStorage.setItem('elbObserve', 'obsw_pb_x.ses_new.sec_2');
    pageObserveSlot().clear('obsw_pb_x.ses_9.sec_1');
    expect(localStorage.getItem('elbObserve')).toBe('obsw_pb_x.ses_new.sec_2');
  });
});
