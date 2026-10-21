import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import type { Destination, Flow } from '@walkeros/core';
import { page } from '../dev';
import { VENDOR_SCRIPT_MARKER } from '../loadVendor';
import { sendWeb } from '../sendWeb';
import { xhrSender } from './fixtures/src/sender';
import type { Vendor } from './fixtures/src/vendor';
import {
  pageScriptIgnoring,
  pageScriptVendor,
  scriptVendor,
  unmarkedScriptVendor,
} from './fixtures/src/vendor';

describe('page', () => {
  const effects: Flow.StepEffect[] = [];
  let settled = 0;
  const recordAnswering =
    (answer: Flow.StepAnswer): Flow.StepRecord =>
    (effect) => {
      effects.push(effect);
      return {
        answer,
        settle: () => {
          settled++;
        },
      };
    };

  beforeEach(() => {
    jest.useRealTimers();
    effects.length = 0;
    settled = 0;
  });

  it('answers sendBeacon at the boundary while open, and removes it at close', () => {
    const session = page.open(recordAnswering({ status: 500 }));
    try {
      expect(navigator.sendBeacon('https://e.example/b', 'body')).toBe(false);
    } finally {
      session.close();
    }
    expect(effects).toEqual([['sendBeacon', 'https://e.example/b', 'body']]);
    expect(settled).toBe(1);
    expect('sendBeacon' in navigator).toBe(false);
  });

  it('answers a synchronous XMLHttpRequest at the boundary, and restores the original at close', () => {
    const original = window.XMLHttpRequest;
    const session = page.open(
      recordAnswering({ status: 201, body: { ok: true } }),
    );
    const xhr = new XMLHttpRequest();
    try {
      xhr.open('POST', 'https://e.example/x', false);
      xhr.send('body');
    } finally {
      session.close();
    }
    expect(effects).toEqual([
      ['XMLHttpRequest', 'POST', 'https://e.example/x', 'body'],
    ]);
    expect(settled).toBe(1);
    expect(xhr.status).toBe(201);
    expect(xhr.responseText).toBe('{"ok":true}');
    expect(window.XMLHttpRequest).toBe(original);
  });

  it('fails a synchronous XMLHttpRequest on a network error, and answers the async form late', async () => {
    const failing = page.open(recordAnswering({ error: 'network' }));
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://e.example/x', false);
      expect(() => xhr.send()).toThrow('NetworkError');
    } finally {
      failing.close();
    }

    const late = page.open(recordAnswering({ status: 200 }));
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://e.example/x');
      const loaded = new Promise<void>((resolve) =>
        xhr.addEventListener('load', () => resolve()),
      );
      xhr.send();
      expect(settled).toBe(1);
      expect(xhr.readyState).toBe(1);
      await loaded;
      expect(settled).toBe(2);
      expect(xhr.status).toBe(200);
    } finally {
      late.close();
    }
  });

  it('counts the scripts added since open, fails the marked ones, and removes them at close', () => {
    const kept = document.createElement('script');
    document.head.appendChild(kept);
    const session = page.open(recordAnswering({}));
    const marked = document.createElement('script');
    marked.setAttribute(VENDOR_SCRIPT_MARKER, '');
    document.head.appendChild(marked);
    const unmarked = document.createElement('script');
    document.body.appendChild(unmarked);
    const failed = jest.fn();
    marked.addEventListener('error', failed);

    expect(session.globals).toEqual({ document });
    expect(session.scripts()).toEqual({ marked: 1, unmarked: 1 });
    session.failScripts();
    expect(failed).toHaveBeenCalledTimes(1);
    session.close();

    expect(marked.isConnected).toBe(false);
    expect(unmarked.isConnected).toBe(false);
    expect(kept.isConnected).toBe(true);
  });

  it("records sendWeb's beacon and XHR as a run's effects in the examples runner", async () => {
    const url = 'https://e.example/collect';
    const sending: Destination.Instance = {
      type: 'sending',
      config: {},
      push: (event) => {
        const body = JSON.stringify({ name: event.name });
        sendWeb(url, body, { transport: 'beacon' });
        sendWeb(url, body, { transport: 'xhr' });
      },
    };
    await expect(
      runExamples(
        'destination',
        sending,
        {
          pageView: {
            in: { name: 'page view' },
            out: [
              ['sendBeacon', url, '{"name":"page view"}'],
              ['XMLHttpRequest', 'POST', url, '{"name":"page view"}'],
            ],
          },
        },
        { page },
      ),
    ).resolves.toBeUndefined();
  });
});

describe('conformance kit on the page', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  const vendor: Vendor = {
    track: () => undefined,
    consent: () => undefined,
  };
  const event = { name: 'page view', data: { title: 'Home' } };
  const examples: Flow.StepExamples = {
    pageView: { in: event, out: [['vendor.track', 'page view', 'docs']] },
    silent: {
      public: false,
      description: 'A silent rule calls nothing.',
      in: event,
      mapping: { silent: true },
      out: [],
    },
    revoke: {
      command: 'consent',
      in: { marketing: false },
      out: [['vendor.consent', false]],
    },
  };
  const root = path.join(__dirname, 'fixtures');
  const options = {
    profile: 'vendor-global' as const,
    root,
    schema: { type: 'object', properties: { site: { type: 'string' } } },
    settings: { site: 'docs' },
    env: {
      push: { vendor },
      simulation: ['call:vendor.track', 'call:vendor.consent'],
    },
    examples,
    page,
  };

  it('counts item 2 per cause: a vendor-timeout line before the script error does not count', async () => {
    await expect(
      conformance('destination', scriptVendor, {
        ...options,
        schema: { type: 'object', properties: {} },
        settings: {},
        examples: {
          pageView: { in: event },
          silent: examples.silent,
          revoke: examples.revoke,
        },
      }),
    ).resolves.toBeUndefined();
  });

  // No declared failure example: item 2 must reach the script error itself.
  describe('a script injected once per page, loadScript on by default (item 2)', () => {
    it('reaches the script error although item 1 injected the src first', async () => {
      await expect(
        conformance('destination', pageScriptVendor, options),
      ).resolves.toBeUndefined();
    });

    it('reaches the script error when the examples env carries its own document', async () => {
      const own = document.implementation.createHTMLDocument('env');
      await expect(
        conformance('destination', pageScriptVendor, {
          ...options,
          env: { ...options.env, push: { vendor, document: own } },
        }),
      ).resolves.toBeUndefined();
    });

    it('fails item 2 when the push ignores the script error', async () => {
      await expect(
        conformance('destination', pageScriptIgnoring, options),
      ).rejects.toMatchObject({
        items: [2],
        message: expect.stringContaining('is not reported vendor-not-loaded'),
      });
    });
  });

  it('fails item 1 only for a script added without the loadVendor marker', async () => {
    await expect(
      conformance('destination', unmarkedScriptVendor, options),
    ).rejects.toMatchObject({
      items: [1],
      message: expect.stringContaining(
        'example pageView inserts a script without loadVendor',
      ),
    });
  });

  it('passes the web-sdk profile for a destination that loads its script into the page', async () => {
    await expect(
      conformance('destination', pageScriptVendor, {
        ...options,
        profile: 'web-sdk',
      }),
    ).resolves.toBeUndefined();
  });

  it("passes the http profile for a destination on sendWeb's XHR, answered at the page's boundary", async () => {
    const url = 'https://e.example/collect';
    const event = {
      name: 'page view',
      data: { title: 'Home' },
      user: { id: 'user-1' },
    };
    await expect(
      conformance('destination', xhrSender, {
        profile: 'http',
        root,
        page,
        schema: {
          type: 'object',
          properties: { url: { type: 'string' } },
          required: ['url'],
        },
        settings: { url },
        examples: {
          pageView: {
            in: event,
            out: [['XMLHttpRequest', 'POST', url, '{"name":"page view"}']],
          },
          silent: {
            public: false,
            description: 'A silent rule sends nothing.',
            in: event,
            mapping: { silent: true },
            out: [],
          },
        },
      }),
    ).resolves.toBeUndefined();
  });
});
