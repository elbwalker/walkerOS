import { Walkerjs } from '..';
import { mockDataLayer } from '@elbwalker/jest/web.setup';
import { sessionStart } from '@elbwalker/utils/web';
import type { SourceWalkerjs } from '..';

jest.mock('@elbwalker/utils/web', () => {
  const utilsOrg = jest.requireActual('@elbwalker/utils/web');

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

  test('default state', () => {
    walkerjs = Walkerjs();
    expect(walkerjs.config.session).toEqual({ storage: false });

    walkerjs = Walkerjs({
      default: true,
    });
    expect(walkerjs.config.session).toEqual({
      storage: false,
    });
    expect(sessionStart).toHaveBeenCalledTimes(1);
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
});
