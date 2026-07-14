/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://shop.example.com/page"}
 */
// Core's jest defaults to jsdom at https://example.com (web.config); the
// options docblock pins this suite's origin so aud checks are realistic.
// jsdom has no crypto.subtle and no TextEncoder: inject webcrypto, use Buffer.
import { webcrypto } from 'node:crypto';
import {
  browserSwapActivator,
  parseGrant,
  type SwapActivatorConfig,
} from '../preview';

const crypto = webcrypto;
const NOW = 1_700_000_000_000;

// Helper: sign a real grant with a real key (see Task 2 test for the shape).
async function setup() {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const spki = Buffer.from(
    new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey)),
  ).toString('base64url');

  const sign = async (over: Record<string, unknown> = {}) => {
    const grant = {
      iss: 'app:stage',
      aud: ['https://shop.example.com'],
      iat: NOW / 1000,
      sxp: NOW / 1000 + 3600,
      art: 'art_abc',
      sri: 'sha384-AAAA',
      pb: 'pb_a',
      cap: 'activate',
      jti: 'gr_1',
      pid: 'prv_1',
      ...over,
    };
    const header = Buffer.from(
      JSON.stringify({ alg: 'ES256', kid: 'kid1' }),
    ).toString('base64url');
    const payload = Buffer.from(JSON.stringify(grant)).toString('base64url');
    const sig = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.privateKey,
      Buffer.from(`${header}.${payload}`),
    );
    return `${header}.${payload}.${Buffer.from(new Uint8Array(sig)).toString('base64url')}`;
  };

  const cfg: SwapActivatorConfig = {
    keyring: [{ kid: 'kid1', spki }],
    iss: 'app:stage',
    pb: 'pb_a',
    previewOrigin: 'cdn.example.com',
    now: () => NOW,
    crypto,
  };
  return { cfg, sign };
}

function setUrl(search: string) {
  window.history.replaceState({}, '', `https://shop.example.com/page${search}`);
}

/** Resolve the injected <script> the way a real CDN would. */
function autoResolveScripts(ok: boolean) {
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (n instanceof HTMLScriptElement) {
          queueMicrotask(() =>
            n.dispatchEvent(new Event(ok ? 'load' : 'error')),
          );
        }
      });
    }
  });
  observer.observe(document.head, { childList: true });
  return () => observer.disconnect();
}

describe('browserSwapActivator', () => {
  beforeEach(() => {
    // The shared web jest setup (web.setup.mjs) puts every test on fake
    // timers, and modern Jest fake timers also fake queueMicrotask: the
    // MutationObserver-driven autoResolveScripts helper below relies on a
    // real microtask turn to dispatch load/error, so it never fires unless
    // real timers are restored here.
    jest.useRealTimers();
    localStorage.clear();
    document.head.innerHTML = '';
    setUrl('');
  });

  it('does nothing and touches no storage when there is no grant', async () => {
    const { cfg } = await setup();
    const spy = jest.spyOn(Storage.prototype, 'setItem');
    expect(await browserSwapActivator(cfg)).toBe(false);
    expect(document.head.querySelector('script')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('verifies a URL grant, persists it, strips the param and injects the artifact', async () => {
    const { cfg, sign } = await setup();
    const stop = autoResolveScripts(true);
    setUrl(`?elbPreview=${await sign()}`);

    expect(await browserSwapActivator(cfg)).toBe(true);

    const script = document.head.querySelector('script');
    expect(script?.getAttribute('src')).toBe(
      'https://cdn.example.com/preview/art_abc.js',
    );
    expect(script?.getAttribute('integrity')).toBe('sha384-AAAA');
    expect(script?.getAttribute('crossorigin')).toBe('anonymous');
    expect(localStorage.getItem('elbPreview')).toBeTruthy();
    expect(window.location.search).toBe('');
    stop();
  });

  it('re-activates from storage on a later navigation with no param', async () => {
    const { cfg, sign } = await setup();
    localStorage.setItem('elbPreview', await sign());
    const stop = autoResolveScripts(true);

    expect(await browserSwapActivator(cfg)).toBe(true);
    expect(document.head.querySelector('script')).not.toBeNull();
    stop();
  });

  it('activates a 30-minute-old stored grant via the storage clock, past the 15-minute URL window', async () => {
    // sxp - iat = 60 min: within MAX_SESSION_MS (65 min), but iat itself is
    // 30 min old, past URL_WINDOW_MS (15 min). Only the storage clock (sxp
    // alone, not min(iat + URL_WINDOW_MS, sxp)) admits this grant; a
    // regression to source: 'url' on the storage path would reject it as
    // expired and then self-heal-clear it.
    const { cfg, sign } = await setup();
    const stored = await sign({
      iat: NOW / 1000 - 30 * 60,
      sxp: NOW / 1000 + 30 * 60,
    });
    localStorage.setItem('elbPreview', stored);
    const stop = autoResolveScripts(true);

    expect(await browserSwapActivator(cfg)).toBe(true);
    expect(localStorage.getItem('elbPreview')).toBe(stored);
    stop();
  });

  it('falls through to production and clears storage when the CDN fails', async () => {
    const { cfg, sign } = await setup();
    localStorage.setItem('elbPreview', await sign());
    const stop = autoResolveScripts(false);

    expect(await browserSwapActivator(cfg)).toBe(false);
    expect(localStorage.getItem('elbPreview')).toBeNull();
    stop();
  });

  it('self-heals when the preview script neither loads nor errors (hung CDN), via the swap timeout', async () => {
    // No autoResolveScripts here: the injected <script> is left in place with
    // no load/error ever dispatched, so only preview.ts's SWAP_TIMEOUT_MS
    // fallback (not any DOM event) can settle this promise. Fake timers let
    // the 5s timeout elapse instantly; the real crypto verify above still
    // resolves on Node's real event loop, unaffected by faked setTimeout.
    jest.useFakeTimers();
    const { cfg, sign } = await setup();
    setUrl(`?elbPreview=${await sign()}`);

    const result = browserSwapActivator(cfg);
    await jest.advanceTimersByTimeAsync(5_000); // preview.ts's SWAP_TIMEOUT_MS

    expect(await result).toBe(false);
    expect(document.head.querySelector('script')).toBeNull();
    expect(localStorage.getItem('elbPreview')).toBeNull();

    jest.useRealTimers();
  });

  it('clears an active session on ?elbPreview=off', async () => {
    const { cfg, sign } = await setup();
    localStorage.setItem('elbPreview', await sign());
    setUrl('?elbPreview=off');

    expect(await browserSwapActivator(cfg)).toBe(false);
    expect(localStorage.getItem('elbPreview')).toBeNull();
  });

  it('IGNORES a malformed param and keeps the active session alive (anti-griefing)', async () => {
    const { cfg, sign } = await setup();
    const stored = await sign();
    localStorage.setItem('elbPreview', stored);
    setUrl('?elbPreview=garbage');
    const stop = autoResolveScripts(true);

    expect(await browserSwapActivator(cfg)).toBe(true);
    expect(localStorage.getItem('elbPreview')).toBe(stored);
    stop();
  });

  it('IGNORES a rejected URL grant (even a structurally valid unsigned one) and activates from storage', async () => {
    // The nastier griefing shape: iat is pushed an hour into the past while
    // sxp stays put, so sxp - iat exceeds MAX_SESSION_MS and this is rejected
    // as 'expired' by the session-ceiling check before the (junk) signature
    // is ever verified. It must not end the stored session (the URL path
    // never touches stored state on rejection).
    const { cfg, sign } = await setup();
    const stored = await sign();
    localStorage.setItem('elbPreview', stored);
    const forged = (await sign({ iat: NOW / 1000 - 3600 })).replace(
      /[^.]+$/,
      Buffer.alloc(64, 7).toString('base64url'),
    );
    setUrl(`?elbPreview=${forged}`);
    const stop = autoResolveScripts(true);

    expect(await browserSwapActivator(cfg)).toBe(true);
    expect(localStorage.getItem('elbPreview')).toBe(stored);
    stop();
  });

  it('clears storage when the STORED grant fails verification (self-heal)', async () => {
    const { cfg, sign } = await setup();
    localStorage.setItem(
      'elbPreview',
      await sign({ aud: ['https://other.example.com'] }),
    );

    expect(await browserSwapActivator(cfg)).toBe(false);
    expect(localStorage.getItem('elbPreview')).toBeNull();
  });
});

describe('parseGrant art charset', () => {
  it('rejects a grant whose art escapes the /preview/ path prefix (path traversal)', async () => {
    const { sign } = await setup();
    expect(parseGrant(await sign({ art: '../../evil' }))).toBeNull();
  });
});
