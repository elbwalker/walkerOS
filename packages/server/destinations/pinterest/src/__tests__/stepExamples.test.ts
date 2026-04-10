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
      data: {
        num_events_received: 1,
        num_events_processed: 1,
        events: [{ status: 'processed' }],
      },
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
        settings: { accessToken: 's3cr3t', adAccountId: '123456789' },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    expect(mockSendServer).toHaveBeenCalled();
    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.data).toHaveLength(1);

    const actual = requestBody.data[0];
    const expected = (example.out as { data: Record<string, unknown>[] })
      .data[0];

    // Verify event ID and source URL (framework fields that should match)
    expect(actual.event_id).toBe(expected.event_id);
    expect(actual.event_source_url).toBe(expected.event_source_url);
    expect(actual.action_source).toBe(expected.action_source);

    // Verify mapped event name (from mapping or default)
    if ((mapping as Record<string, unknown>)?.name) {
      expect(actual.event_name).toBe(expected.event_name);
    }

    // Verify custom_data fields when present
    if (expected.custom_data) {
      expect(actual.custom_data).toEqual(expected.custom_data);
    }
  });
});
