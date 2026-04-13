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
      data: JSON.stringify({ code: 0, message: 'OK' }),
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
        settings: { accessToken: 's3cr3t', pixelCode: 'PIXEL_CODE' },
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

    // Verify event ID and page URL (framework fields)
    expect(actual.event_id).toBe(expected.event_id);

    // Verify event name
    if ((mapping as Record<string, unknown>)?.name) {
      expect(actual.event).toBe(expected.event);
    }

    // Verify timestamp
    expect(actual.timestamp).toBe(expected.timestamp);

    // Verify context.page.url
    if (
      expected.context &&
      (expected.context as Record<string, unknown>).page
    ) {
      const expectedPage = (expected.context as Record<string, unknown>)
        .page as Record<string, unknown>;
      expect(actual.context?.page?.url).toBe(expectedPage.url);
    }

    // Verify mapped properties
    const expectedProps = expected.properties as
      | Record<string, unknown>
      | undefined;
    if (expectedProps) {
      if (expectedProps.currency)
        expect(actual.properties?.currency).toBe(expectedProps.currency);
      if (expectedProps.value)
        expect(actual.properties?.value).toBe(expectedProps.value);
      if (expectedProps.contents)
        expect(actual.properties?.contents).toEqual(expectedProps.contents);
      if (expectedProps.order_id)
        expect(actual.properties?.order_id).toBe(expectedProps.order_id);
      if (expectedProps.content_type)
        expect(actual.properties?.content_type).toBe(
          expectedProps.content_type,
        );
    }

    // Verify user data in context (pre-hash — user data gets hashed,
    // so we check it exists, not exact values)
    const expectedContext = expected.context as
      | Record<string, unknown>
      | undefined;
    if (
      expectedContext?.user &&
      Object.keys(expectedContext.user as Record<string, unknown>).length > 0
    ) {
      expect(actual.context?.user).toBeDefined();
    }
  });
});
