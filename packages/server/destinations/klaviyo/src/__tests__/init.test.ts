import { destinationKlaviyo } from '..';

describe('init', () => {
  it('throws when apiKey is missing', () => {
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

    expect(() =>
      destinationKlaviyo.init!({
        config: { settings: {} },
        logger,
        id: 'test',
      } as never),
    ).toThrow('apiKey');
  });
});
