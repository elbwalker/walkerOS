import { Walkerjs } from '..';
import { mockDataLayer } from '@elbwalker/jest/web.setup';
import { sessionStart } from '@elbwalker/utils';
import type { WebClient } from '..';

jest.mock('@elbwalker/utils', () => {
  const utilsOrg = jest.requireActual('@elbwalker/utils');

  return {
    ...utilsOrg,
    sessionStart: jest.fn().mockImplementation(utilsOrg.sessionStart),
  };
});

describe('Session', () => {
  let walkerjs: WebClient.Instance;

  beforeEach(() => {});

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
});
