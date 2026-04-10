import { destinationSegment } from '..';
import type { Settings, SegmentAnalyticsMock } from '../types';

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
      destinationSegment.init!({
        config: { settings: {} },
        logger,
        id: 'test',
      } as never),
    ).toThrow('writeKey');
  });
});

describe('destroy', () => {
  it('calls closeAndFlush on the analytics instance', async () => {
    const closeAndFlush = jest.fn().mockResolvedValue(undefined);
    const mockAnalytics = { closeAndFlush } as unknown as SegmentAnalyticsMock;

    const config = {
      settings: {
        writeKey: 'test',
        _analytics: mockAnalytics,
      } as unknown as Settings,
    };

    await destinationSegment.destroy!({ config } as never);

    expect(closeAndFlush).toHaveBeenCalledWith({ timeout: 5000 });
  });

  it('does nothing when no analytics instance exists', async () => {
    const config = { settings: { writeKey: 'test' } as Settings };

    // Should not throw
    await destinationSegment.destroy!({ config } as never);
  });
});
