import type { Collector, WalkerOS } from '@walkeros/core';
import type { Settings } from '../types';
import { getEvent } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { getHashServer } from '@walkeros/server-core';
import {
  isIdentified,
  resolveContext,
  toPageViewId,
  toVisitorId,
} from '../context';

const base: Settings = { url: 'https://acc.piwik.pro/', appId: 'site-1' };
const WEB_TRACE = 'ab12cd34ef56ab12cd34ef56ab12cd34';

describe('context', () => {
  let collector: Collector.Instance;

  beforeAll(async () => {
    ({ collector } = await startFlow());
  });

  function event(props: WalkerOS.DeepPartialEvent = {}): WalkerOS.Event {
    return getEvent('page view', {
      timestamp: 1700000300000,
      ...props,
      source: {
        type: 'collector',
        url: 'https://www.example.com/docs/',
        ...props.source,
      },
    });
  }

  async function context(
    props: WalkerOS.DeepPartialEvent = {},
    settings: Partial<Settings> = {},
    ingest?: Record<string, unknown>,
    identified = true,
  ) {
    const hit = await resolveContext({
      settings: { ...base, ...settings },
      event: event(props),
      ingest,
      collector,
      identified,
    });
    return new Map(hit);
  }

  it('renders every parameter in the fixed order', async () => {
    const hit = await resolveContext({
      settings: base,
      event: event({
        source: {
          type: 'browser',
          platform: 'web',
          trace: WEB_TRACE,
          referrer: 'https://www.walkeros.io/',
        },
      }),
      ingest: {
        ip: '203.0.113.9',
        userAgent: 'Mozilla/5.0',
        language: 'de-DE',
      },
      collector,
      identified: true,
    });

    expect(hit).toEqual([
      ['url', 'https://www.example.com/docs/'],
      ['urlref', 'https://www.walkeros.io/'],
      ['cip', '203.0.113.9'],
      ['ua', 'Mozilla/5.0'],
      ['lang', 'de-DE'],
      ['_id', await getHashServer('c00k13', 16)],
      ['uid', 'us3r'],
      ['pv_id', 'ab12cd'],
      ['cdt', '1700000300'],
    ]);
  });

  it.each([
    ['ip', 'cip', '203.0.113.9', '198.51.100.7'],
    ['userAgent', 'ua', 'Mozilla/5.0', 'curl/8.0'],
    ['language', 'lang', 'de-DE', 'en-US'],
  ])(
    '%s reads ingest first, then event.user',
    async (name, param, fromIngest, fromUser) => {
      const user = { [name]: fromUser };
      const withIngest = await context({ user }, {}, { [name]: fromIngest });
      const withoutIngest = await context({ user }, {}, {});
      expect(withIngest.get(param)).toBe(fromIngest);
      expect(withoutIngest.get(param)).toBe(fromUser);
    },
  );

  it('switches an input off with false', async () => {
    const hit = await context({}, { ip: false }, { ip: '203.0.113.9' });
    expect(hit.has('cip')).toBe(false);
  });

  it('skips an input that resolves to an object', async () => {
    const hit = await context({}, { ip: 'ingest' }, { ip: '203.0.113.9' });
    expect(hit.has('cip')).toBe(false);
  });

  it('sends cdt in seconds and omits it for timestamp false', async () => {
    expect((await context()).get('cdt')).toBe('1700000300');
    expect((await context({}, { timestamp: false })).has('cdt')).toBe(false);
  });

  it('omits _id and uid on anonymous hits and keeps cip', async () => {
    const hit = await context({}, {}, { ip: '203.0.113.9' }, false);
    expect(hit.has('_id')).toBe(false);
    expect(hit.has('uid')).toBe(false);
    expect(hit.get('cip')).toBe('203.0.113.9');
  });

  describe('pv_id guard', () => {
    it('uses a web relay trace', async () => {
      const hit = await context({
        source: { type: 'browser', platform: 'web', trace: WEB_TRACE },
      });
      expect(hit.get('pv_id')).toBe('ab12cd');
    });

    it.each<[string, () => WalkerOS.DeepPartialEvent]>([
      [
        'the trace is the server collector run trace',
        () => ({
          source: {
            type: 'collector',
            platform: 'web',
            trace: collector.trace,
          },
        }),
      ],
      [
        'the platform is not web',
        () => ({
          source: { type: 'collector', platform: 'server', trace: WEB_TRACE },
        }),
      ],
    ])('sends none when %s', async (_, props) => {
      expect(collector.trace).toEqual(expect.any(String));
      expect((await context(props())).has('pv_id')).toBe(false);
    });

    it('lets an explicit pageViewId win over the guard', async () => {
      const hit = await context(
        {
          data: { pv: 'F00BA4' },
          source: { type: 'browser', platform: 'web', trace: WEB_TRACE },
        },
        { pageViewId: 'event.data.pv' },
      );
      expect(hit.get('pv_id')).toBe('f00ba4');
    });
  });
});

describe('toVisitorId', () => {
  it('passes a 16 hex id through', async () => {
    expect(await toVisitorId('0123456789abcdef')).toBe('0123456789abcdef');
  });

  it('hashes anything else to a stable 16 hex id', async () => {
    const id = await toVisitorId('device-abc');
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    expect(await toVisitorId('device-abc')).toBe(id);
  });
});

describe('toPageViewId', () => {
  it.each([
    ['AB12CD34', 'ab12cd'],
    ['pageview', null],
  ])('%s', async (value, expected) => {
    const id = await toPageViewId(value);
    expect(id).toBe(expected ?? (await getHashServer(value, 6)));
  });
});

describe('isIdentified', () => {
  let collector: Collector.Instance;

  beforeAll(async () => {
    ({ collector } = await startFlow());
  });

  it.each<[string, Settings['identified'], WalkerOS.Consent, boolean]>([
    ['absent', undefined, {}, true],
    ['true', true, {}, true],
    ['false', false, { marketing: true }, false],
    ['consent granted', { marketing: true }, { marketing: true }, true],
    ['consent missing', { marketing: true }, { functional: true }, false],
  ])('%s', (_, setting, consent, expected) => {
    expect(
      isIdentified(setting, collector, getEvent('page view', { consent })),
    ).toBe(expected);
  });
});
