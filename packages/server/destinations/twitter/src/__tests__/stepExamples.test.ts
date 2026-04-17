import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { ConversionsRequest } from '../types';

describe('Step Examples', () => {
  const mockSendServer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({
      ok: true,
      data: { request_id: 'mock-request-id' },
    });
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const testEnv = clone(examples.env.push);
    testEnv.sendServer = mockSendServer;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env: testEnv },
      {
        settings: {
          pixelId: 'o8z6j',
          eventId: 'tw-o8z6j-o8z21',
          consumerKey: 'consumer-key',
          consumerSecret: 'consumer-secret',
          accessToken: 'access-token',
          accessTokenSecret: 'access-token-secret',
        },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    expect(mockSendServer).toHaveBeenCalled();
    const requestBody: ConversionsRequest = JSON.parse(
      mockSendServer.mock.calls[0][1],
    );
    expect(requestBody.conversions).toHaveLength(1);

    const actual = requestBody.conversions[0];
    const expected = (example.out as ConversionsRequest).conversions[0];

    // Verify conversion time (ISO 8601)
    expect(actual.conversion_time).toBe(expected.conversion_time);

    // Verify event_id
    expect(actual.event_id).toBe(expected.event_id);

    // Verify identifiers array
    expect(actual.identifiers).toEqual(expected.identifiers);

    // Verify conversion_id (dedup key)
    expect(actual.conversion_id).toBe(expected.conversion_id);

    // Verify value if present
    if (expected.value !== undefined) {
      expect(actual.value).toBe(expected.value);
      expect(typeof actual.value).toBe('string');
    } else {
      expect(actual.value).toBeUndefined();
    }
  });
});
