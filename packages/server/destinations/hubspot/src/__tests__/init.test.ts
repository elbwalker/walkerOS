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

describe('destroy', () => {
  it('flushes remaining event queue on destroy', async () => {
    const batchSend = jest.fn().mockResolvedValue(undefined);
    const settings = {
      accessToken: 'pat-xxx',
      eventNamePrefix: 'pe12345678_',
      batch: true,
      batchSize: 50,
      _client: {
        events: {
          send: {
            basicApi: { send: jest.fn() },
            batchApi: { send: batchSend },
          },
        },
        crm: { contacts: { basicApi: { update: jest.fn() } } },
      },
      _eventQueue: [
        {
          eventName: 'pe12345678_test',
          email: 'user@example.com',
          properties: {},
        },
      ],
      _state: {},
    };

    await destinationHubspot.destroy!({ config: { settings } } as never);

    expect(batchSend).toHaveBeenCalledWith({
      inputs: [
        {
          eventName: 'pe12345678_test',
          email: 'user@example.com',
          properties: {},
        },
      ],
    });
  });

  it('does nothing when no event queue exists', async () => {
    const settings = {
      accessToken: 'pat-xxx',
      eventNamePrefix: 'pe12345678_',
      _state: {},
    };

    // Should not throw
    await destinationHubspot.destroy!({ config: { settings } } as never);
  });
});
