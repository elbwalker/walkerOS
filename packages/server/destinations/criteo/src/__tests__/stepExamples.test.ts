import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { CriteoRequestBody } from '../types';

describe('Step Examples', () => {
  const mockSendServer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({
      ok: true,
      data: 'OK',
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
        settings: { partnerId: 'PARTNER_ID', callerId: 'CALLER_ID' },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    expect(mockSendServer).toHaveBeenCalled();
    const actual = JSON.parse(
      mockSendServer.mock.calls[0][1],
    ) as CriteoRequestBody;
    const expected = example.out as CriteoRequestBody;

    // Top-level fields
    expect(actual.version).toBe(expected.version);
    expect(actual.site_type).toBe(expected.site_type);
    expect(actual.account).toBe(expected.account);
    expect(actual.id.mapping_key).toBe(expected.id.mapping_key);
    if (expected.id.mapped_user_id !== undefined) {
      expect(actual.id.mapped_user_id).toBe(expected.id.mapped_user_id);
    }
    expect(actual.full_url).toBe(expected.full_url);
    if (expected.previous_url !== undefined) {
      expect(actual.previous_url).toBe(expected.previous_url);
    }

    // Events array
    expect(actual.events).toHaveLength(expected.events.length);
    const actualEvent = actual.events[0];
    const expectedEvent = expected.events[0];
    expect(actualEvent.event).toBe(expectedEvent.event);
    expect(actualEvent.timestamp).toBe(expectedEvent.timestamp);
    if (expectedEvent.id !== undefined) {
      expect(actualEvent.id).toBe(expectedEvent.id);
    }
    if (expectedEvent.item !== undefined) {
      expect(actualEvent.item).toEqual(expectedEvent.item);
    }
  });
});
