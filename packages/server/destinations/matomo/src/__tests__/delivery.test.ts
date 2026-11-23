import type { Collector, Logger, SendResponse, WalkerOS } from '@walkeros/core';
import type { Credentials, PartialConfig, Settings } from '../types';
import { getEvent, Level, StepError } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { destinationMatomo } from '..';
import { examples } from '../dev';

const BASE: Settings = { url: 'https://matomo.example.com/', siteId: '1' };
const SOURCE = {
  type: 'browser',
  platform: 'web',
  url: 'https://www.example.com/',
};
const TRACKED = { data: { status: 'success', tracked: 1, invalid: 0 } };

interface Line {
  level: Logger.Level;
  message: string;
  context: Logger.LogContext;
}

describe('delivery on a real collector', () => {
  const sendServer = jest.fn<Promise<SendResponse>, unknown[]>();
  let fetch: jest.SpyInstance;
  let lines: Line[];
  let collector: Collector.Instance;

  beforeEach(() => {
    jest.useRealTimers();
    sendServer.mockReset();
    sendServer.mockResolvedValue(TRACKED);
    fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('no network in tests'));
    lines = [];
  });

  afterEach(() => {
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  });

  async function setup(
    settings: Partial<Settings> = {},
    config: Omit<PartialConfig, 'settings'> = {},
  ) {
    ({ collector } = await startFlow({
      logger: {
        level: 'WARN',
        handler: (level, message, context) => {
          lines.push({ level, message, context });
        },
      },
      destinations: {
        matomo: {
          code: { ...destinationMatomo, env: { sendServer } },
          config: { ...config, settings: { ...BASE, ...settings } },
        },
      },
    }));
  }

  function event(props: WalkerOS.DeepPartialEvent = {}) {
    return getEvent('page view', { source: SOURCE, ...props });
  }

  /** Every request string of every sendServer call. */
  function requests(): URLSearchParams[] {
    return sendServer.mock.calls.flatMap(([, body]) => {
      const parsed: unknown = JSON.parse(String(body));
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('requests' in parsed) ||
        !Array.isArray(parsed.requests)
      )
        throw new Error('unexpected body');
      return parsed.requests.map(
        (request: unknown) => new URLSearchParams(String(request)),
      );
    });
  }

  function linesOf(level: Logger.Level, code?: string): Line[] {
    return lines.filter(
      (line) =>
        line.level === level &&
        (code === undefined || line.context.code === code),
    );
  }

  const REASONS =
    'an unknown siteId, an invalid parameter, a repeated order ID, or one that needs token_auth';

  it.each<[string, Partial<PartialConfig>, SendResponse, string, boolean]>([
    [
      'an old event Matomo counts invalid fails, not retried',
      {},
      { data: { status: 'success', tracked: 0, invalid: 1 } },
      `Matomo tracked 0 of 1 tracking requests (1 invalid): ${REASONS}`,
      false,
    ],
    [
      'a request Matomo skips fails, retried',
      {},
      { data: { status: 'success', tracked: 0, invalid: 0 } },
      `Matomo tracked 0 of 1 tracking requests (0 invalid): ${REASONS}`,
      true,
    ],
    [
      'a refused goal hit fails the event, not retried',
      { mapping: { page: { view: { settings: { goalId: 3 } } } } },
      { data: { status: 'success', tracked: 1, invalid: 1 } },
      `Matomo tracked 1 of 2 tracking requests (1 invalid): ${REASONS}`,
      false,
    ],
    [
      "an answer without Matomo's counts fails, not retried",
      {},
      { data: '<html></html>' },
      'Matomo answered without its tracking counts: settings.url must be the Matomo base URL',
      false,
    ],
  ])('%s', async (_, config, answer, message, retryable) => {
    await setup({}, config);
    sendServer.mockResolvedValue(answer);

    const result = await collector.push(event());

    expect(requests()[0].get('cdt')).toBe('1700000000');
    expect(result.failed?.matomo?.reason).toEqual({
      code: 'transport',
      message,
      retryable,
    });
    expect(linesOf(Level.ERROR, 'transport')).toHaveLength(1);
  });

  it("Matomo's tracker answer is delivered with one WARN line", async () => {
    await setup();
    sendServer
      .mockResolvedValueOnce({ data: '' })
      .mockResolvedValueOnce({ data: 'GIF89a' });

    const first = await collector.push(event());
    const second = await collector.push(event());

    expect(first.done?.matomo).toBeDefined();
    expect(second.done?.matomo).toBeDefined();
    expect(linesOf(Level.WARN, 'unconfirmed')).toHaveLength(1);
    expect(linesOf(Level.ERROR)).toHaveLength(0);
  });

  it('sends each site to its own Matomo and fails an unknown one', async () => {
    await setup(examples.step.twoSitesA.settings);

    for (const host of ['shop-a', 'shop-b'])
      expect(
        (
          await collector.push(
            event({ source: { ...SOURCE, url: `https://${host}.example/` } }),
          )
        ).done?.matomo,
      ).toBeDefined();
    const unknown = await collector.push(
      event({ source: { ...SOURCE, url: 'https://shop-c.example/' } }),
    );

    expect(sendServer.mock.calls.map(([endpoint]) => endpoint)).toEqual([
      'https://a.matomo.example/matomo.php',
      'https://b.matomo.example/matomo.php',
    ]);
    expect(requests().map((request) => request.get('idsite'))).toEqual([
      '1',
      '2',
    ]);
    expect(unknown.failed?.matomo?.reason).toMatchObject({
      code: 'missing-input',
      message: expect.stringMatching(/^Matomo cannot send the event: /),
    });
  });

  it.each<
    [string, Partial<Settings>, Credentials | undefined, WalkerOS.User, number]
  >([
    ['no visitor id, no ip or userAgent', {}, undefined, { id: 'us3r' }, 1],
    [
      'userAgent without ip',
      { userAgent: 'event.user.userAgent' },
      undefined,
      { userAgent: 'Mozilla/5.0' },
      1,
    ],
    [
      'a user id beside the visitor id, no ip',
      { userId: 'event.user.id' },
      undefined,
      { id: 'us3r', device: 'c00k13' },
      1,
    ],
    [
      'ip, credentials.token and userAgent',
      { ip: 'event.user.ip', userAgent: 'event.user.userAgent' },
      { token: 'T' },
      { ip: '192.0.2.1', userAgent: 'Mozilla/5.0' },
      0,
    ],
    [
      'ip, credentials.token, userAgent and userId',
      {
        ip: 'event.user.ip',
        userAgent: 'event.user.userAgent',
        userId: 'event.user.id',
      },
      { token: 'T' },
      { id: 'us3r', ip: '192.0.2.1', userAgent: 'Mozilla/5.0' },
      0,
    ],
    ['a visitor id without a user id', {}, undefined, { device: 'c00k13' }, 0],
  ])('visitor merge: %s', async (_, settings, credentials, user, expected) => {
    await setup(settings, credentials ? { credentials } : {});

    const first = await collector.push(event({ user }));
    const second = await collector.push(event({ user }));

    expect(first.done?.matomo).toBeDefined();
    expect(second.done?.matomo).toBeDefined();
    expect(linesOf(Level.ERROR, 'visitor-merge')).toHaveLength(expected);
    expect(linesOf(Level.ERROR)).toHaveLength(expected);
  });

  it('names the values it did not send in one ERROR line', async () => {
    await setup(
      {},
      { mapping: { page: { view: { settings: { goalId: 'x' } } } } },
    );

    const result = await collector.push(
      event({ user: { device: 'c00k13', screenSize: 'big' } }),
    );

    expect(result.done?.matomo).toBeDefined();
    expect(requests()).toHaveLength(1);
    expect(linesOf(Level.ERROR, 'not-sent')).toEqual([
      expect.objectContaining({
        context: expect.objectContaining({
          error: 'screenSize (not WxH), goalId (not a positive integer)',
        }),
      }),
    ]);
  });

  it('two visitors at first use stay two', async () => {
    await setup();

    await Promise.all([
      collector.push(event({ user: { device: 'd3v1c3a' } })),
      collector.push(event({ user: { device: 'd3v1c3b' } })),
    ]);

    const ids = requests().map((request) => request.get('cid'));
    expect(ids).toHaveLength(2);
    expect(ids[0]).toMatch(/^[0-9a-f]{16}$/);
    expect(ids[1]).toMatch(/^[0-9a-f]{16}$/);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('the token never reaches a line', async () => {
    await setup({}, { credentials: { token: 'S3CRET' } });
    sendServer.mockRejectedValue(
      new StepError('HTTP 403', {
        code: 'transport',
        status: 403,
        body: { message: 'token_auth S3CRET is not valid' },
      }),
    );

    const result = await collector.push(event());

    const [[endpoint, body]] = sendServer.mock.calls;
    expect(String(endpoint)).not.toContain('S3CRET');
    expect(String(body)).toContain('"token_auth":"S3CRET"');
    expect(result.failed?.matomo?.reason).toEqual({
      code: 'transport',
      message: 'Matomo refused the request (HTTP 403)',
      retryable: false,
      status: 403,
    });
    expect(lines.length).toBeGreaterThan(0);
    expect(JSON.stringify(lines)).not.toContain('S3CRET');
    expect(JSON.stringify(result.failed?.matomo?.reason)).not.toContain(
      'S3CRET',
    );
  });

  it('refuses ip without a token when init is skipped', async () => {
    await setup({ ip: 'event.user.ip' }, { init: true });

    const result = await collector.push(event());

    expect(sendServer).not.toHaveBeenCalled();
    expect(result.failed?.matomo?.reason).toMatchObject({ code: 'config' });
  });
});
