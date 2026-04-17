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
      data: JSON.stringify({ status: 'OK', request_id: 'req-1' }),
    });
  });

  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
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
        settings: { accessToken: 's3cr3t', pixelId: 'PIXEL_ID' },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    expect(mockSendServer).toHaveBeenCalled();
    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(body.data).toHaveLength(1);

    const actual = body.data[0] as Record<string, unknown>;
    const expected = (example.out as { data: Record<string, unknown>[] })
      .data[0];

    // Framework fields
    expect(actual.event_id).toBe(expected.event_id);
    expect(actual.event_time).toBe(expected.event_time);
    expect(actual.action_source).toBe(expected.action_source);
    expect(actual.event_source_url).toBe(expected.event_source_url);
    expect(actual.event_name).toBe(expected.event_name);

    // Verify mapped custom_data properties
    const expectedCustom = expected.custom_data as
      | Record<string, unknown>
      | undefined;
    const actualCustom = actual.custom_data as
      | Record<string, unknown>
      | undefined;
    if (expectedCustom) {
      if (expectedCustom.currency !== undefined)
        expect(actualCustom?.currency).toBe(expectedCustom.currency);
      if (expectedCustom.value !== undefined)
        expect(actualCustom?.value).toBe(expectedCustom.value);
      if (expectedCustom.contents !== undefined)
        expect(actualCustom?.contents).toEqual(expectedCustom.contents);
      if (expectedCustom.transaction_id !== undefined)
        expect(actualCustom?.transaction_id).toBe(
          expectedCustom.transaction_id,
        );
      if (expectedCustom.sign_up_method !== undefined)
        expect(actualCustom?.sign_up_method).toBe(
          expectedCustom.sign_up_method,
        );
    }

    // Verify user_data exists (pre-hash — hashable fields get hashed,
    // so we check presence, not exact values)
    const expectedUser = expected.user_data as
      | Record<string, unknown>
      | undefined;
    if (expectedUser && Object.keys(expectedUser).length > 0) {
      expect(actual.user_data).toBeDefined();
      for (const key of Object.keys(expectedUser)) {
        expect(
          (actual.user_data as Record<string, unknown>)[key],
        ).toBeDefined();
      }
    } else {
      // Empty user_data should still be present
      expect(actual.user_data).toBeDefined();
    }
  });
});
