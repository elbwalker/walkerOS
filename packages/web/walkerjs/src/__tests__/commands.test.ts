import type { SourceWalkerjs } from '../';
import type { Elb, WalkerOS } from '@walkerOS/types';
import { mockDataLayer } from '@walkerOS/jest/web.setup';
import { createSourceWalkerjs } from '../';

describe('Commands', () => {
  let elb: Elb.Fn;
  let walkerjs: SourceWalkerjs.Instance;

  beforeEach(() => {
    global.performance.getEntriesByType = jest
      .fn()
      .mockReturnValue([{ type: 'navigate' }]);

    const { elb: elbFn, instance } = createSourceWalkerjs({
      default: true,
      consent: { test: true },
      pageview: false,
      session: false,
    });
    elb = elbFn;
    walkerjs = instance;
  });

  test('walker action', () => {
    mockDataLayer.mockClear();
    elb('walker action');

    // don't push walker commands to destinations
    expect(mockDataLayer).not.toHaveBeenCalled();
  });

  test('walker user', async () => {
    elb('walker run');

    // Missing argument
    elb('walker user');
    await elb('entity action');
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: {},
      }),
    );

    elb('walker user', { id: 'userId' });
    await elb('entity action');
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: { id: 'userId' },
      }),
    );

    elb('walker user', { device: 'userId' });
    await elb('entity action');
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: { id: 'userId', device: 'userId' },
      }),
    );

    elb('walker user', { session: 'sessionid' });
    await elb('entity action');
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: { id: 'userId', device: 'userId', session: 'sessionid' },
      }),
    );

    elb('walker user', { hash: 'h4sh' });
    await elb('entity action');
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

  test('walker consent', async () => {
    jest.clearAllMocks();
    const { elb, instance } = createSourceWalkerjs({
      consent: { functional: true },
      default: true,
      pageview: false,
    });

    await jest.runAllTimersAsync();
    expect(instance.consent.functional).toBeTruthy();
    expect(instance.consent.marketing).not.toBeTruthy();
    await elb('consent check');
    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'consent check',
        consent: { functional: true },
      }),
    );

    // Missing argument
    elb('walker consent');
    expect(instance.consent.functional).toBeTruthy();
    expect(instance.consent.marketing).not.toBeTruthy();

    // Grant permissions
    elb('walker consent', { marketing: true });
    expect(instance.consent.marketing).toBeTruthy();
    await elb('consent check');
    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'consent check',
        consent: { functional: true, marketing: true },
      }),
    );

    // Revoke permissions
    elb('walker consent', { marketing: false });
    expect(instance.consent.marketing).not.toBeTruthy();
    await elb('consent check');
    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'consent check',
        consent: { functional: true },
      }),
    );
  });

  test('walker globals', async () => {
    const { elb } = createSourceWalkerjs({
      default: true,
      globalsStatic: { static: 'value' },
    });

    await jest.runAllTimersAsync();
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        globals: { static: 'value' },
      }),
    );

    elb('walker globals', { foo: 'bar' });
    elb('walker globals', { another: 'value' });
    elb('walker globals', { static: 'override' });
    await elb('foo bar');
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

  test('walker custom', async () => {
    const { elb, instance } = createSourceWalkerjs({
      default: true,
      custom: { static: 'value' },
    });

    expect(instance).toStrictEqual(
      expect.objectContaining({
        custom: { static: 'value' },
      }),
    );

    elb('walker custom', { foo: 'bar' });
    elb('walker custom', { another: 'value' });
    elb('walker custom', { static: 'override' });
    await elb('foo bar');
    expect(instance).toStrictEqual(
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
