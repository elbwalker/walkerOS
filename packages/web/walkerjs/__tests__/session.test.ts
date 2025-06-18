import type { SourceWalkerjs } from '..';
import { mockDataLayer } from '@elbwalker/jest/web.setup';
import { sessionStart } from '@walkerOS/web';
import { elb, Walkerjs } from '..';

jest.mock('@walkerOS/web', () => {
  const utilsOrg = jest.requireActual('@walkerOS/web');

  return {
    ...utilsOrg,
    sessionStart: jest.fn().mockImplementation(utilsOrg.sessionStart),
  };
});

describe('Session', () => {
  let walkerjs: SourceWalkerjs.Instance;
  const mockFn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('default state', async () => {
    walkerjs = Walkerjs();
    expect(walkerjs.config.session).toEqual({ storage: false });

    walkerjs = Walkerjs({
      default: true,
    });
    expect(walkerjs.config.session).toEqual({
      storage: false,
    });
    expect(sessionStart).toHaveBeenCalledTimes(1);

    await jest.runAllTimersAsync();
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'session start',
        data: expect.objectContaining({
          storage: false,
        }),
      }),
    );
  });

  test('session false', () => {
    walkerjs = Walkerjs();
    expect(walkerjs.config.session).not.toBeFalsy();

    walkerjs = Walkerjs({
      default: true,
      session: false,
    });
    expect(walkerjs.config.session).toEqual(false);
    expect(sessionStart).toHaveBeenCalledTimes(0);
  });

  test('on call', () => {
    walkerjs = Walkerjs({
      session: { storage: false },
      sessionStatic: { device: 'd3v1c3' },
      on: { session: [mockFn] },
      run: true,
    });

    expect(mockFn).toHaveBeenCalledTimes(1);

    expect(
      walkerjs.sessionStart({
        config: { storage: false },
        data: { id: 's3ss10n' },
      }),
    ).toStrictEqual(
      expect.objectContaining({
        id: 's3ss10n', // @TODO Different in window.session
        device: 'd3v1c3',
        storage: false,
      }),
    );

    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  test('different consent keys', async () => {
    walkerjs = Walkerjs({
      default: true,
      session: { consent: ['marketing', 'analytics'], storage: true },
      pageview: false,
    });

    expect(mockDataLayer).toHaveBeenCalledTimes(0);
    elb('walker consent', { marketing: false, analytics: true });

    await jest.runAllTimersAsync();
    expect(mockDataLayer).toHaveBeenCalledTimes(1);
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'session start',
        data: expect.objectContaining({
          storage: true, // Prefer granted consent
        }),
      }),
    );
  });

  test('multiple consent updates', async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: new URL('https://www.elbwalker.com/?utm_campaign=foo'),
    });

    walkerjs = Walkerjs({
      default: true,
      session: { consent: 'marketing', storage: true },
      pageview: false,
    });

    expect(mockDataLayer).toHaveBeenCalledTimes(0);
    elb('walker consent', { marketing: true });
    elb('walker consent', { marketing: true });
    elb('walker consent', { marketing: true });

    await jest.runAllTimersAsync();
    expect(mockDataLayer).toHaveBeenCalledTimes(1);
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'session start',
        data: expect.any(Object),
      }),
    );

    elb('walker run');
    await jest.runAllTimersAsync();
    expect(mockDataLayer).toHaveBeenCalledTimes(2);
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'session start',
        data: expect.objectContaining({
          count: 2,
        }),
      }),
    );

    Object.defineProperty(window, 'location', {
      value: originalLocation,
    });
  });
});
