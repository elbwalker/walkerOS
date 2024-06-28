import type { WebClient } from '..';
import type { WalkerOS } from '@elbwalker/types';
import { elb, Walkerjs } from '..';
import { mockDataLayer } from '@elbwalker/jest/web.setup';

describe('Commands', () => {
  let walkerjs: WebClient.Instance;

  beforeEach(() => {
    global.performance.getEntriesByType = jest
      .fn()
      .mockReturnValue([{ type: 'navigate' }]);

    walkerjs = Walkerjs({
      default: true,
      consent: { test: true },
      pageview: false,
      session: false,
    });
  });

  test('walker action', () => {
    mockDataLayer.mockClear();
    elb('walker action');

    // don't push walker commands to destinations
    expect(mockDataLayer).not.toHaveBeenCalled();
  });

  test('walker user', () => {
    elb('walker run');

    // Missing argument
    elb('walker user');
    elb('entity action');
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: {},
      }),
    );

    elb('walker user', { id: 'userId' });
    elb('entity action');
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: { id: 'userId' },
      }),
    );

    elb('walker user', { device: 'userId' });
    elb('entity action');
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: { id: 'userId', device: 'userId' },
      }),
    );

    elb('walker user', { session: 'sessionid' });
    elb('entity action');
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: { id: 'userId', device: 'userId', session: 'sessionid' },
      }),
    );

    elb('walker user', { hash: 'h4sh' });
    elb('entity action');
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: {
          id: 'userId',
          device: 'userId',
          session: 'sessionid',
          hash: 'h4sh',
        },
      }),
    );

    const user: WalkerOS.User = {
      userAgent: 'Mozilla...',
      browser: 'Chrome',
      browserVersion: '90',
      deviceType: 'desktop',
      language: 'de-DE',
      country: 'DE',
      region: 'HH',
      city: 'Hamburg',
      timezone: 'Berlin',
      os: 'walkerOS',
      osVersion: '1.0',
      screenSize: '1337x420',
      ip: 'xxx',
      internal: true,
      custom: 'value',
    };
    elb('walker user', user);
    expect(walkerjs.user).toStrictEqual(
      expect.objectContaining({ ...user, id: 'userId' }),
    );

    elb('walker user', { ip: undefined });
    expect(walkerjs.user).toStrictEqual(
      expect.objectContaining({ ip: undefined }),
    );
  });

  test('walker consent', () => {
    jest.clearAllMocks();
    walkerjs = Walkerjs({
      consent: { functional: true },
      default: true,
      pageview: false,
    });

    elb('walker run');

    expect(walkerjs.consent.functional).toBeTruthy();
    expect(walkerjs.consent.marketing).not.toBeTruthy();
    elb('consent check');
    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'consent check',
        consent: { functional: true },
      }),
    );

    // Missing argument
    elb('walker consent');
    expect(walkerjs.consent.functional).toBeTruthy();
    expect(walkerjs.consent.marketing).not.toBeTruthy();

    // Grant permissions
    elb('walker consent', { marketing: true });
    expect(walkerjs.consent.marketing).toBeTruthy();
    elb('consent check');
    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'consent check',
        consent: { functional: true, marketing: true },
      }),
    );

    // Revoke permissions
    elb('walker consent', { marketing: false });
    expect(walkerjs.consent.marketing).not.toBeTruthy();
    elb('consent check');
    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'consent check',
        consent: { functional: true, marketing: false },
      }),
    );
  });

  test('walker globals', () => {
    walkerjs = Walkerjs({ default: true, globalsStatic: { static: 'value' } });
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        globals: { static: 'value' },
      }),
    );

    elb('walker globals', { foo: 'bar' });
    elb('walker globals', { another: 'value' });
    elb('walker globals', { static: 'override' });
    elb('foo bar');
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        globals: {
          static: 'override',
          foo: 'bar',
          another: 'value',
        },
      }),
    );
  });

  test('walker custom', () => {
    walkerjs = Walkerjs({ default: true, custom: { static: 'value' } });
    expect(walkerjs).toStrictEqual(
      expect.objectContaining({
        custom: { static: 'value' },
      }),
    );

    elb('walker custom', { foo: 'bar' });
    elb('walker custom', { another: 'value' });
    elb('walker custom', { static: 'override' });
    elb('foo bar');
    expect(walkerjs).toStrictEqual(
      expect.objectContaining({
        custom: {
          static: 'override',
          foo: 'bar',
          another: 'value',
        },
      }),
    );
  });

  test('run with state', () => {
    elb('walker run', { group: 'gr0up1d', round: 5 });

    expect(walkerjs).toStrictEqual(
      expect.objectContaining({
        group: 'gr0up1d',
        round: 6,
      }),
    );
  });
});
