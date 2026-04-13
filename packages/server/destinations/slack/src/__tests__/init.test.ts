jest.mock('@slack/web-api', () => ({
  __esModule: true,
  WebClient: class {
    constructor(
      public token: string,
      public opts: unknown,
    ) {}
  },
}));

import { destinationSlack } from '..';
import type { Settings } from '../types';

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

describe('init', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws when neither token nor webhookUrl is provided', () => {
    expect(() =>
      destinationSlack.init!({
        config: { settings: {} },
        logger,
        id: 'test',
      } as never),
    ).toThrow(/token or webhookUrl/i);
  });

  it('throws when both token and webhookUrl are provided', () => {
    expect(() =>
      destinationSlack.init!({
        config: {
          settings: {
            token: 'xoxb-abc',
            webhookUrl: 'https://hooks.slack.com/services/x/y/z',
          },
        },
        logger,
        id: 'test',
      } as never),
    ).toThrow(/not both/i);
  });

  it('creates a WebClient when token is provided (no env mock)', () => {
    const result = destinationSlack.init!({
      config: { settings: { token: 'xoxb-abc', channel: '#alerts' } },
      logger,
      id: 'test',
      env: {},
    } as never) as { settings: Settings };

    expect(result.settings._client).toBeDefined();
  });

  it('skips WebClient creation in webhook mode', () => {
    const result = destinationSlack.init!({
      config: {
        settings: { webhookUrl: 'https://hooks.slack.com/services/x/y/z' },
      },
      logger,
      id: 'test',
      env: {},
    } as never) as { settings: Settings };

    expect(result.settings._client).toBeUndefined();
  });
});
