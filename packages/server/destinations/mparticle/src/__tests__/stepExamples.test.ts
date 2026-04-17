import type { WalkerOS } from '@walkeros/core';
import { clone } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';

describe('Step Examples', () => {
  const mockSendServer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({ ok: true, data: {} });
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping as
      | { settings?: Record<string, unknown> }
      | undefined;

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
          apiKey: 'key',
          apiSecret: 'secret',
          userIdentities: {
            customer_id: 'user.id',
            ...(event.user?.email ? { email: 'user.email' } : {}),
          },
        },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    expect(mockSendServer).toHaveBeenCalled();
    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    const expected = example.out as {
      events: Array<{ event_type: string; data: Record<string, unknown> }>;
      user_identities?: Record<string, unknown>;
      environment?: string;
    };

    expect(requestBody.events).toHaveLength(1);
    const actualEvent = requestBody.events[0];
    const expectedEvent = expected.events[0];

    expect(actualEvent.event_type).toBe(expectedEvent.event_type);
    if ('event_name' in expectedEvent.data) {
      expect(actualEvent.data.event_name).toBe(expectedEvent.data.event_name);
    }
    if ('screen_name' in expectedEvent.data) {
      expect(actualEvent.data.screen_name).toBe(expectedEvent.data.screen_name);
    }
    if ('custom_event_type' in expectedEvent.data) {
      expect(actualEvent.data.custom_event_type).toBe(
        expectedEvent.data.custom_event_type,
      );
    }
    if ('currency_code' in expectedEvent.data) {
      expect(actualEvent.data.currency_code).toBe(
        expectedEvent.data.currency_code,
      );
    }
    if ('product_action' in expectedEvent.data) {
      expect(actualEvent.data.product_action).toEqual(
        expectedEvent.data.product_action,
      );
    }

    if (expected.user_identities) {
      expect(requestBody.user_identities).toEqual(expected.user_identities);
    }
    if (expected.environment) {
      expect(requestBody.environment).toBe(expected.environment);
    }
  });
});
