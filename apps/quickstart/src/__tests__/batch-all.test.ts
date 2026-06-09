import type { SendWebOptions } from '@walkeros/web-core';
import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import destinationAPI from '@walkeros/web-destination-api';

describe('walkerOS Batch-All Example', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('batches every event into one delivery with config.batch', async () => {
    const mockSendWeb = jest.fn(
      (url: string, body: string, options: SendWebOptions) => {
        // console.log('📡 API batch:', { url, body: JSON.parse(body), options });
      },
    );

    // config.batch enables batch-all: every event flows into one shared
    // buffer, no mapping wildcard rule needed.
    const { elb } = await startFlow({
      destinations: {
        api: {
          code: destinationAPI,
          config: {
            settings: {
              url: 'https://analytics.example.com/events',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            },
            batch: {
              wait: 1000,
              size: 50,
            },
          },
          env: {
            sendWeb: mockSendWeb,
          },
        },
      },
    });

    // Push two distinct events
    await elb('page view');
    await elb('product add');

    // Nothing delivered yet: the events sit in the shared batch buffer
    expect(mockSendWeb).not.toHaveBeenCalled();

    // Advance past the debounce window to flush the buffer
    jest.advanceTimersByTime(1100);

    // ONE delivery carrying BOTH events as a single array
    expect(mockSendWeb).toHaveBeenCalledTimes(1);
    const [calledUrl, calledBody] = mockSendWeb.mock.calls[0];
    expect(calledUrl).toBe('https://analytics.example.com/events');

    const payload = JSON.parse(calledBody) as WalkerOS.Event[];
    expect(payload).toHaveLength(2);
    expect(payload.map((event) => event.name)).toEqual([
      'page view',
      'product add',
    ]);
  });
});
