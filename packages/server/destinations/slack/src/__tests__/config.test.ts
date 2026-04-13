import { getConfig } from '../config';

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

describe('getConfig', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws when neither token nor webhookUrl is provided', () => {
    expect(() => getConfig({ settings: {} }, logger as never)).toThrow(
      /token or webhookUrl/i,
    );
  });

  it('throws when both token and webhookUrl are provided', () => {
    expect(() =>
      getConfig(
        {
          settings: {
            token: 'xoxb-abc',
            webhookUrl: 'https://hooks.slack.com/services/x/y/z',
          },
        },
        logger as never,
      ),
    ).toThrow(/not both/i);
  });

  it('warns when Web API mode has no default channel', () => {
    getConfig({ settings: { token: 'xoxb-abc' } }, logger as never);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringMatching(/no default channel/i),
    );
  });

  it('returns config unchanged when valid (Web API)', () => {
    const config = getConfig(
      { settings: { token: 'xoxb-abc', channel: '#alerts' } },
      logger as never,
    );
    expect(config.settings.token).toBe('xoxb-abc');
    expect(config.settings.channel).toBe('#alerts');
  });

  it('returns config unchanged when valid (webhook)', () => {
    const config = getConfig(
      { settings: { webhookUrl: 'https://hooks.slack.com/services/x/y/z' } },
      logger as never,
    );
    expect(config.settings.webhookUrl).toContain('hooks.slack.com');
  });
});
