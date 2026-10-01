import { readFile, mkdtemp, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { bundle } from '../../../commands/bundle/index.js';

/**
 * A real web flow, bundled by the CLI from the local package dists and run in
 * jsdom: the browser source pushes the page view at run, the gtag destination
 * is held by require: ["consent"], and the CookieFirst CMP reports the user's
 * choice afterwards. The Consent Mode update must precede the page_view event.
 */
const PACKAGES = resolve(__dirname, '../../../../..');
const local = (rel: string) => ({ path: join(PACKAGES, rel) });

const CONSENT_FLOW = {
  version: 4,
  flows: {
    default: {
      config: {
        platform: 'web',
        bundle: {
          packages: {
            '@walkeros/core': local('core'),
            '@walkeros/web-core': local('web/core'),
            '@walkeros/collector': {
              ...local('collector'),
              imports: ['startFlow'],
            },
            '@walkeros/web-source-browser': local('web/sources/browser'),
            '@walkeros/web-source-cmp-cookiefirst': local(
              'web/sources/cmps/cookiefirst',
            ),
            '@walkeros/web-destination-gtag': local('web/destinations/gtag'),
          },
        },
      },
      sources: {
        cmp: { package: '@walkeros/web-source-cmp-cookiefirst' },
        browser: {
          package: '@walkeros/web-source-browser',
          config: {
            settings: { pageview: true, elb: 'elb', elbLayer: 'elbLayer' },
          },
        },
      },
      destinations: {
        gtag: {
          package: '@walkeros/web-destination-gtag',
          config: {
            consent: { marketing: true },
            require: ['consent'],
            loadScript: false,
            settings: { ga4: { measurementId: 'G-XXXXXXXXXX' } },
          },
        },
      },
    },
  },
};

const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('bundled web flow: consent update precedes the first gtag event', () => {
  let tmpDir: string;
  let script: string;

  beforeAll(async () => {
    expect(existsSync(join(PACKAGES, 'collector/package.json'))).toBe(true);
    tmpDir = await mkdtemp(join(tmpdir(), 'walkeros-consent-order-'));
    const out = join(tmpDir, 'walker.js');
    await bundle(CONSENT_FLOW, {
      target: 'cdn',
      silent: true,
      cache: false,
      buildOverrides: {
        output: out,
        windowCollector: 'walkerOS',
        windowElb: 'elb',
      },
    });
    script = await readFile(out, 'utf8');
  }, 180000);

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('sends default, config, update, then page_view when the CMP reports after the page view', async () => {
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', () => {});
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      runScripts: 'outside-only',
      url: 'https://example.com/',
      virtualConsole,
    });
    const calls: unknown[][] = [];
    Reflect.set(dom.window, 'gtag', (...args: unknown[]) => {
      calls.push(args);
    });

    dom.window.eval(script);
    await settle(150);

    // The page view is held: no event may have reached gtag yet.
    expect(calls.filter((c) => c[0] === 'event')).toHaveLength(0);

    dom.window.dispatchEvent(
      new dom.window.CustomEvent('cf_consent', {
        detail: { necessary: true, performance: true, advertising: true },
      }),
    );
    await settle(150);

    expect(calls.map((c) => `${String(c[0])} ${String(c[1])}`)).toEqual([
      'consent default',
      'config G-XXXXXXXXXX',
      'consent update',
      'event page_view',
    ]);
    expect(calls[2][2]).toEqual({
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    });

    dom.window.close();
  }, 30000);
});
