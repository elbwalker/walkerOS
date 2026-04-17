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
      data: JSON.stringify({ status: 'OK', requestId: 'req-1' }),
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
        settings: { accessToken: 's3cr3t', tagId: 'UET-12345' },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    expect(mockSendServer).toHaveBeenCalled();
    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(body.data).toHaveLength(1);
    expect(body.dataProvider).toBe('walkerOS');

    const actual = body.data[0] as Record<string, unknown>;
    const expected = (example.out as { data: Record<string, unknown>[] })
      .data[0];

    // Framework fields
    expect(actual.eventId).toBe(expected.eventId);
    expect(actual.eventTime).toBe(expected.eventTime);
    expect(actual.eventType).toBe(expected.eventType);
    expect(actual.eventSourceUrl).toBe(expected.eventSourceUrl);
    expect(actual.adStorageConsent).toBe(expected.adStorageConsent);
    if (expected.eventName !== undefined) {
      expect(actual.eventName).toBe(expected.eventName);
    }

    // Verify mapped customData properties
    const expectedCustom = expected.customData as
      | Record<string, unknown>
      | undefined;
    const actualCustom = actual.customData as
      | Record<string, unknown>
      | undefined;
    if (expectedCustom) {
      if (expectedCustom.currency !== undefined)
        expect(actualCustom?.currency).toBe(expectedCustom.currency);
      if (expectedCustom.value !== undefined)
        expect(actualCustom?.value).toBe(expectedCustom.value);
      if (expectedCustom.items !== undefined)
        expect(actualCustom?.items).toEqual(expectedCustom.items);
      if (expectedCustom.transactionId !== undefined)
        expect(actualCustom?.transactionId).toBe(expectedCustom.transactionId);
      if (expectedCustom.pageType !== undefined)
        expect(actualCustom?.pageType).toBe(expectedCustom.pageType);
    }

    // Verify userData presence — hashable fields get hashed, so check presence
    const expectedUser = expected.userData as
      | Record<string, unknown>
      | undefined;
    if (expectedUser && Object.keys(expectedUser).length > 0) {
      expect(actual.userData).toBeDefined();
      for (const key of Object.keys(expectedUser)) {
        expect((actual.userData as Record<string, unknown>)[key]).toBeDefined();
      }
    } else {
      expect(actual.userData).toBeDefined();
    }
  });
});
