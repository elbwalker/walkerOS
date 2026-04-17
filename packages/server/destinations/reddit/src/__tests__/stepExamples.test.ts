import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';

describe('Step Examples', () => {
  const mockSendServer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({
      ok: true,
      data: { success: true },
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
        settings: { accessToken: 's3cr3t', pixelId: 'a2_abcdef123456' },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    expect(mockSendServer).toHaveBeenCalled();
    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.data.events).toHaveLength(1);

    const actual = requestBody.data.events[0];
    const expected = (
      example.out as {
        data: { events: Record<string, unknown>[] };
      }
    ).data.events[0];

    const expectedEventType = expected.event_type as {
      tracking_type: string;
      custom_event_name?: string;
    };
    const expectedMetadata = expected.event_metadata as
      | Record<string, unknown>
      | undefined;

    // Verify tracking_type matches expected (from mapping)
    expect(actual.event_type.tracking_type).toBe(
      expectedEventType.tracking_type,
    );

    // Verify timestamps
    expect(actual.event_at).toBe(expected.event_at);
    expect(actual.event_at_ms).toBe(expected.event_at_ms);

    // Verify conversion_id (event dedup ID)
    expect(actual.event_metadata.conversion_id).toBe(
      expectedMetadata?.conversion_id,
    );

    // Verify event_metadata fields when present (beyond conversion_id)
    if (expectedMetadata) {
      for (const [key, value] of Object.entries(expectedMetadata)) {
        if (key === 'conversion_id') continue;
        expect(actual.event_metadata[key]).toEqual(value);
      }
    }
  });
});
