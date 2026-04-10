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
      data: {},
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
          accessToken: 's3cr3t',
          conversionRuleId: '12345678',
        },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    expect(mockSendServer).toHaveBeenCalled();
    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.elements).toHaveLength(1);

    const actual = requestBody.elements[0];
    const expected = (example.out as { elements: Record<string, unknown>[] })
      .elements[0];

    // Verify conversion URN
    expect(actual.conversion).toBe(expected.conversion);

    // Verify timestamp
    expect(actual.conversionHappenedAt).toBe(expected.conversionHappenedAt);

    // Verify eventId
    expect(actual.eventId).toBe(expected.eventId);

    // Verify userIds
    expect(actual.user.userIds).toEqual(expected.user.userIds);

    // Verify conversionValue if present
    if (expected.conversionValue) {
      expect(actual.conversionValue).toEqual(expected.conversionValue);
    } else {
      expect(actual.conversionValue).toBeUndefined();
    }
  });
});
