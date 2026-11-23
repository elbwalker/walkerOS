import type { Collector, WalkerOS } from '@walkeros/core';
import type { Settings } from '../types';
import { getEvent } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { getHashServer } from '@walkeros/server-core';
import { resolveContext, resolveTarget } from '../context';

const BASE: Settings = { url: 'https://m.example.com/', siteId: '1' };
const WEB = {
  type: 'browser',
  platform: 'web',
  url: 'https://www.example.com/docs/',
  referrer: 'https://www.walkeros.io/',
  trace: 'ab12cd34ef56ab12cd34ef56ab12cd34',
};
const INGEST = { ip: '203.0.113.9', userAgent: 'UA', language: 'de-DE' };

describe('context', () => {
  let collector: Collector.Instance;

  beforeAll(async () => {
    ({ collector } = await startFlow());
  });

  function event(props: WalkerOS.DeepPartialEvent = {}): WalkerOS.Event {
    return getEvent('page view', {
      timestamp: 1700000000000,
      source: WEB,
      user: { id: 'us3r', device: 'c00k13', screenSize: '1920x1080' },
      ...props,
    });
  }

  async function context(
    settings: Partial<Settings> = {},
    props: WalkerOS.DeepPartialEvent = {},
    ingest: Record<string, unknown> | undefined = INGEST,
  ) {
    return resolveContext({
      settings: { ...BASE, ...settings },
      event: event(props),
      ingest,
      collector,
    });
  }

  it.each<[string, Partial<Settings>, Array<[string, string]>]>([
    [
      'without ip, userAgent and userId',
      {},
      [
        ['url', 'https://www.example.com/docs/'],
        ['urlref', 'https://www.walkeros.io/'],
        ['res', '1920x1080'],
        ['lang', 'de-DE'],
        ['cid', 'cc8e27118413234d'],
        ['pv_id', 'ab12cd'],
        ['cdt', '1700000000'],
      ],
    ],
    [
      'with ip, userAgent and userId',
      {
        ip: 'ingest.ip',
        userAgent: 'ingest.userAgent',
        userId: 'event.user.id',
      },
      [
        ['url', 'https://www.example.com/docs/'],
        ['urlref', 'https://www.walkeros.io/'],
        ['res', '1920x1080'],
        ['lang', 'de-DE'],
        ['ua', 'UA'],
        ['cip', '203.0.113.9'],
        ['cid', 'cc8e27118413234d'],
        ['uid', 'us3r'],
        ['pv_id', 'ab12cd'],
        ['cdt', '1700000000'],
      ],
    ],
    [
      'with every input switched off',
      {
        language: false,
        pageUrl: false,
        referrer: false,
        visitorId: false,
        screenSize: false,
        pageViewId: false,
        timestamp: false,
      },
      [],
    ],
  ])('context order and defaults %s', async (_, settings, expected) => {
    expect(await context(settings)).toEqual({ hit: expected, dropped: [] });
  });

  it.each<[string, string, (value: string) => Promise<string> | string]>([
    ['a walkerOS device id is hashed', 'c00k13', () => 'cc8e27118413234d'],
    ['a 16 lowercase hex id passes', 'ab12cd34ef56ab12', (value) => value],
    [
      'an upper-case 16 hex id is hashed',
      'AB12CD34EF56AB12',
      (value) => getHashServer(value, 16),
    ],
  ])('cid: %s', async (_, device, expected) => {
    const { hit } = await context({}, { user: { device } });
    const cid = new Map(hit).get('cid');
    expect(cid).toBe(await expected(device));
    expect(cid).toMatch(/^[0-9a-f]{16}$/);
    expect(hit.some(([key]) => key === '_id')).toBe(false);
  });

  it.each<[string, () => WalkerOS.DeepPartialEvent]>([
    [
      'a server-platform event',
      () => ({ source: { ...WEB, platform: 'server' } }),
    ],
    [
      'the server collector run trace',
      () => ({ source: { ...WEB, trace: collector.trace } }),
    ],
  ])('sends no pv_id for %s', async (_, props) => {
    expect(collector.trace).toEqual(expect.any(String));
    const { hit } = await context({}, props());
    expect(hit.some(([key]) => key === 'pv_id')).toBe(false);
  });

  it('drops a screen size that is not WxH and reports it', async () => {
    const { hit, dropped } = await context({ screenSize: { value: 'big' } });
    expect(hit.some(([key]) => key === 'res')).toBe(false);
    expect(dropped).toEqual(['screenSize (not WxH)']);
  });
});

describe('resolveTarget', () => {
  let collector: Collector.Instance;

  beforeAll(async () => {
    ({ collector } = await startFlow());
  });

  it.each<[string, Partial<Settings>, unknown]>([
    [
      'a string url and siteId',
      { url: 'https://m.example.com', siteId: '7' },
      { endpoint: 'https://m.example.com/matomo.php', siteId: '7' },
    ],
    [
      'a number siteId and value configs',
      { url: { key: 'ingest.matomo' }, siteId: 3 },
      { endpoint: 'https://m.example.com/sub/matomo.php', siteId: '3' },
    ],
    [
      'a siteId of 0',
      { siteId: 0 },
      { invalid: 'siteId resolved to no site id' },
    ],
    [
      'a siteId that is not an integer',
      { siteId: { value: '1.5' } },
      { invalid: 'siteId resolved to no site id' },
    ],
    [
      'a siteId that resolves to nothing',
      { siteId: { key: 'ingest.missing' } },
      { invalid: 'siteId resolved to no site id' },
    ],
    [
      'a url that is not http(s)',
      { url: 'ftp://m.example.com/' },
      { invalid: 'url resolved to no http(s) URL' },
    ],
    [
      'a url that resolves to nothing',
      { url: { key: 'ingest.missing' } },
      { invalid: 'url resolved to no http(s) URL' },
    ],
  ])('resolves %s', async (_, settings, expected) => {
    expect(
      await resolveTarget(
        { ...BASE, ...settings },
        getEvent('page view'),
        { matomo: 'https://m.example.com/sub//' },
        collector,
      ),
    ).toEqual(expected);
  });
});
