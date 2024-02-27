import { sessionStart } from '@elbwalker/utils';
import { Walkerjs } from '..';
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
    expect(walkerjs.config.session).toBeFalsy();

    walkerjs = Walkerjs({
      default: true,
    });
    expect(walkerjs.config.session).toBeFalsy();

    expect(sessionStart).toHaveBeenCalledTimes(0);
  });

  test('session true', () => {
    walkerjs = Walkerjs();
    expect(walkerjs.config.session).toBeFalsy();

    walkerjs = Walkerjs({
      default: true,
      session: true,
    });
    expect(sessionStart).toHaveBeenCalledTimes(1);
  });
});
