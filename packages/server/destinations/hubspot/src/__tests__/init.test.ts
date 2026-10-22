import { createMockContext } from '@walkeros/core';
import { destinationHubspot } from '..';

describe('init', () => {
  const logger = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    throw: jest.fn((msg: string) => {
      throw new Error(msg);
    }),
  };

  it('throws a config StepError naming every missing setting', () => {
    expect(() =>
      destinationHubspot.init(
        createMockContext({ config: { settings: {} }, id: 'test' }),
      ),
    ).toThrow(
      expect.objectContaining({
        name: 'StepError',
        code: 'config',
        message: 'Config settings accessToken, eventNamePrefix missing',
      }),
    );
  });

  it('throws when accessToken is missing', () => {
    expect(() =>
      destinationHubspot.init!({
        config: { settings: { eventNamePrefix: 'pe12345678_' } },
        logger,
        id: 'test',
      } as never),
    ).toThrow('accessToken');
  });

  it('throws when eventNamePrefix is missing', () => {
    expect(() =>
      destinationHubspot.init!({
        config: { settings: { accessToken: 'pat-xxx' } },
        logger,
        id: 'test',
      } as never),
    ).toThrow('eventNamePrefix');
  });
});
