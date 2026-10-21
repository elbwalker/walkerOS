/**
 * startFlow observe wiring: server-arm direct attach, web-arm credential
 * handshake through the `ObserveSlot` port (keep, self-heal, zero-work), the
 * observers escape hatch, and the advisory no-crash invariant. The page slot
 * itself is pinned in @walkeros/web-core's observeSlot tests.
 *
 * Env-injection only: the poster's global fetch is swapped via
 * Object.defineProperty (and restored), warns are captured via an injected
 * logger handler, and the web credential arrives through a fake slot that
 * records every keep and clear. No jest.mock anywhere.
 */
import { Level } from '@walkeros/core';
import type {
  Collector,
  Logger,
  ObserveSlot,
  ObserverFn,
  PosterFetch,
} from '@walkeros/core';
import { startFlow } from '../flow';

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

interface FakeSlot extends ObserveSlot {
  kept: Array<[string, boolean]>;
  cleared: string[];
}

/** An in-memory slot holding `found`, recording every keep and clear. */
function fakeSlot(found: { raw: string; fromUrl: boolean } | null): FakeSlot {
  const kept: Array<[string, boolean]> = [];
  const cleared: string[] = [];
  return {
    kept,
    cleared,
    read: () => found,
    keep: (raw, fromUrl) => {
      kept.push([raw, fromUrl]);
    },
    clear: (raw) => {
      cleared.push(raw);
    },
  };
}

describe('startFlow observe wiring', () => {
  describe('server form', () => {
    it('installs an observer that posts the v1 envelope to url/ingest/sessionId', async () => {
      jest.useRealTimers();
      const posts: CapturedPost[] = [];
      const restore = stubFetch(posts);
      try {
        const { collector, elb } = await startFlow({
          name: 'myflow',
          release: 'rel_1',
          observe: {
            url: OBSERVER_URL,
            sessionId: 'ses_1',
            token: 'tok',
            level: 'trace',
          },
        });
        expect(collector.observers.size).toBe(1);

        await elb('page view');
        await new Promise((resolve) => setTimeout(resolve, 120));

        expect(posts.length).toBeGreaterThan(0);
        const first = posts[0];
        expect(first?.url).toBe(`${OBSERVER_URL}/ingest/ses_1`);
        expect(first?.headers.Authorization).toBe('Bearer tok');
        expect(JSON.parse(first?.body ?? '')).toEqual(
          expect.objectContaining({
            v: 1,
            records: expect.arrayContaining([
              expect.objectContaining({ flowId: 'myflow', release: 'rel_1' }),
            ]),
          }),
        );
      } finally {
        restore();
      }
    });

    it('installs nothing when level is off (zero-work)', async () => {
      const { collector } = await startFlow({
        observe: {
          url: OBSERVER_URL,
          sessionId: 'ses_1',
          token: 'tok',
          level: 'off',
        },
      });
      expect(collector.observers.size).toBe(0);
      expect(collector.observeLevel).toBeUndefined();
    });

    it('installs the collector-wide capture supplier for a configured level', async () => {
      // Mirrors the web arm: without the supplier, destination call capture
      // never runs at trace even though the observer emits trace records.
      const { collector } = await startFlow({
        observe: {
          url: OBSERVER_URL,
          sessionId: 'ses_1',
          token: 'tok',
          level: 'trace',
        },
      });
      expect(collector.observeLevel?.()).toBe('trace');
    });

    it('leaves the capture supplier unset when no level is configured', async () => {
      const { collector } = await startFlow({
        observe: { url: OBSERVER_URL, sessionId: 'ses_1', token: 'tok' },
      });
      expect(collector.observers.size).toBe(1);
      expect(collector.observeLevel).toBeUndefined();
    });
  });

  describe('web form', () => {
    it('installs nothing and never touches the slot when it holds no credential (zero-work)', async () => {
      const slot = fakeSlot(null);
      const { collector } = await startFlow({
        observe: { url: OBSERVER_URL, binding: 'pb_x', slot },
      });
      expect(collector.observers.size).toBe(0);
      expect(slot.kept).toEqual([]);
      expect(slot.cleared).toEqual([]);
    });

    it('keeps a URL credential as URL-borne and posts with binding header + credential secret', async () => {
      jest.useRealTimers();
      const slot = fakeSlot({ raw: 'obsw_pb_x.ses_9.sec_1', fromUrl: true });
      const posts: CapturedPost[] = [];
      const restore = stubFetch(posts);
      try {
        const { collector, elb } = await startFlow({
          observe: { url: OBSERVER_URL, binding: 'pb_x', slot },
        });
        expect(collector.observers.size).toBe(1);
        // keep(raw, true): the slot persists it and strips the address bar.
        expect(slot.kept).toEqual([['obsw_pb_x.ses_9.sec_1', true]]);

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

    it('keeps a stored credential as stored, so the address bar is never touched', async () => {
      const slot = fakeSlot({ raw: 'obsw_pb_x.ses_9.sec_1', fromUrl: false });
      const { collector } = await startFlow({
        observe: { url: OBSERVER_URL, binding: 'pb_x', slot },
      });
      expect(collector.observers.size).toBe(1);
      expect(slot.kept).toEqual([['obsw_pb_x.ses_9.sec_1', false]]);
    });

    it('clears the slot and stops posting when the observer answers 401', async () => {
      jest.useRealTimers();
      const slot = fakeSlot({ raw: 'obsw_pb_x.ses_9.sec_1', fromUrl: false });
      const posts: CapturedPost[] = [];
      const restore = stubFetch(posts, { ok: false, status: 401 });
      try {
        const { collector, elb } = await startFlow({
          observe: { url: OBSERVER_URL, binding: 'pb_x', slot },
        });
        expect(collector.observers.size).toBe(1);

        await elb('page view');
        await new Promise((resolve) => setTimeout(resolve, 120));

        expect(posts.length).toBeGreaterThan(0);
        expect(slot.cleared).toEqual(['obsw_pb_x.ses_9.sec_1']);
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
      const slot = fakeSlot({ raw: 'obsw_pb_x.ses_9.sec_1', fromUrl: false });
      const posts: CapturedPost[] = [];
      const restore = stubFetch(posts, { ok: false, status: 500 });
      try {
        const { collector, elb } = await startFlow({
          observe: { url: OBSERVER_URL, binding: 'pb_x', slot },
        });

        await elb('page view');
        await new Promise((resolve) => setTimeout(resolve, 120));

        expect(posts.length).toBeGreaterThan(0);
        expect(slot.cleared).toEqual([]);
        expect(collector.observers.size).toBe(1);
      } finally {
        restore();
      }
    });

    it('warns, installs nothing and never touches the slot when the credential pb mismatches the binding', async () => {
      const slot = fakeSlot({
        raw: 'obsw_pb_other.ses_9.sec_1',
        fromUrl: true,
      });
      const { warns, logger } = warnCapture();
      const { collector } = await startFlow({
        logger,
        observe: { url: OBSERVER_URL, binding: 'pb_x', slot },
      });
      expect(collector.observers.size).toBe(0);
      expect(warns.some((m) => m.includes('binding'))).toBe(true);
      expect(slot.kept).toEqual([]);
      expect(slot.cleared).toEqual([]);
    });

    it('warns and never touches the slot on a malformed URL credential', async () => {
      // URL-sourced garbage never touches stored state (anti-griefing).
      const slot = fakeSlot({ raw: 'garbage', fromUrl: true });
      const { warns, logger } = warnCapture();
      const { collector } = await startFlow({
        logger,
        observe: { url: OBSERVER_URL, binding: 'pb_x', slot },
      });
      expect(collector.observers.size).toBe(0);
      expect(warns).toEqual(['observe: malformed credential ignored']);
      expect(slot.kept).toEqual([]);
      expect(slot.cleared).toEqual([]);
    });

    it('warns and self-heals a malformed STORED credential', async () => {
      const slot = fakeSlot({ raw: 'garbage', fromUrl: false });
      const { warns, logger } = warnCapture();
      const { collector } = await startFlow({
        logger,
        observe: { url: OBSERVER_URL, binding: 'pb_x', slot },
      });
      expect(collector.observers.size).toBe(0);
      expect(warns).toEqual(['observe: malformed stored credential cleared']);
      // Stored state clears on its own failure, exactly that value: the next
      // pageview is back on the silent zero-work path.
      expect(slot.cleared).toEqual(['garbage']);
      expect(slot.kept).toEqual([]);
    });

    it('honors a baked flowId and trace level from the connect config', async () => {
      jest.useRealTimers();
      const slot = fakeSlot({ raw: 'obsw_pb_x.ses_9.sec_1', fromUrl: false });
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
            slot,
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
      const slot = fakeSlot({ raw: 'obsw_pb_x.ses_9.sec_1', fromUrl: false });
      const { collector } = await startFlow({
        name: 'myflow',
        observe: { url: OBSERVER_URL, binding: 'pb_x', slot },
      });
      expect(collector.observers.size).toBe(1);
      // No baked level: the collector-wide capture supplier stays unset.
      expect(collector.observeLevel).toBeUndefined();
    });

    it('a web observe without slot logs one ERROR line, and startFlow resolves', async () => {
      // A JSON caller cannot carry the slot: the config arrives as parsed
      // JSON, the shape a JS or JSON caller hands over.
      const config: Collector.InitConfig = JSON.parse(
        JSON.stringify({ observe: { url: OBSERVER_URL, binding: 'pb_x' } }),
      );
      const logs: Array<{ level: Level; message: string }> = [];
      // No level: the line must be visible at the default level.
      const handler: Logger.Handler = (level, message) => {
        logs.push({ level, message });
      };
      const { collector, elb } = await startFlow({
        ...config,
        logger: { handler },
      });
      expect(logs).toEqual([
        {
          level: Level.ERROR,
          message:
            'observe: a web observe config needs slot: pageObserveSlot() from @walkeros/web-core',
        },
      ]);
      // Observe stays off; the flow runs.
      expect(collector.observers.size).toBe(0);
      await expect(elb('page view')).resolves.toBeDefined();
    });
  });

  describe('a throwing slot', () => {
    const failing = (): never => {
      throw new Error('boom');
    };
    it.each<[string, ObserveSlot]>([
      ['read', { read: failing, keep: () => {}, clear: () => {} }],
      [
        'keep',
        {
          read: () => ({ raw: 'obsw_pb_x.ses_9.sec_1', fromUrl: false }),
          keep: failing,
          clear: () => {},
        },
      ],
    ])(
      'a throwing %s logs one ERROR line, and startFlow resolves',
      async (_, slot) => {
        const logs: Array<{ level: Level; message: string }> = [];
        const handler: Logger.Handler = (level, message) => {
          logs.push({ level, message });
        };
        const { collector, elb } = await startFlow({
          logger: { handler },
          observe: { url: OBSERVER_URL, binding: 'pb_x', slot },
        });
        expect(logs).toEqual([
          {
            level: Level.ERROR,
            message: 'observe: the slot failed, Observe is off: boom',
          },
        ]);
        // Observe stays off; the flow runs.
        expect(collector.observers.size).toBe(0);
        await expect(elb('page view')).resolves.toBeDefined();
      },
    );
  });

  describe('observers escape hatch', () => {
    it('installs caller-supplied observers into the advisory set', async () => {
      const spy: ObserverFn = () => {};
      const { collector } = await startFlow({ observers: [spy] });
      expect(collector.observers.has(spy)).toBe(true);
    });

    it('a throwing observer never breaks startFlow or event processing', async () => {
      const { collector, elb } = await startFlow({
        observers: [
          () => {
            throw new Error('boom');
          },
        ],
      });
      expect(collector.observers.size).toBe(1);
      await expect(elb('page view')).resolves.toBeDefined();
    });
  });
});
