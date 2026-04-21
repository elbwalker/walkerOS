import { destinationRudderStack } from '..';
import type { Settings, RudderStackAnalyticsMock } from '../types';

describe('init', () => {
  it('throws when writeKey is missing', () => {
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
      destinationRudderStack.init!({
        config: { settings: { dataPlaneUrl: 'https://example.com' } },
        logger,
        id: 'test',
      } as never),
    ).toThrow('writeKey');
  });

  it('throws when dataPlaneUrl is missing', () => {
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
      destinationRudderStack.init!({
        config: { settings: { writeKey: 'test-key' } },
        logger,
        id: 'test',
      } as never),
    ).toThrow('dataPlaneUrl');
  });
});

describe('destroy', () => {
  it('calls flush on the analytics instance', async () => {
    const flush = jest.fn().mockResolvedValue(undefined);
    const mockAnalytics = { flush } as unknown as RudderStackAnalyticsMock;

    const config = {
      settings: {
        writeKey: 'test',
        dataPlaneUrl: 'https://example.com',
        _analytics: mockAnalytics,
      } as unknown as Settings,
    };

    await destinationRudderStack.destroy!({ config } as never);

    expect(flush).toHaveBeenCalled();
  });

  it('does nothing when no analytics instance exists', async () => {
    const config = {
      settings: {
        writeKey: 'test',
        dataPlaneUrl: 'https://example.com',
      } as Settings,
    };

    // Should not throw
    await destinationRudderStack.destroy!({ config } as never);
  });
});
