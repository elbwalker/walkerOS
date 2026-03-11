import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';

describe('Step Examples', () => {
  const mockSendServer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({ ok: true });
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const testEnv = clone(examples.env.standard);
    testEnv.sendServer = mockSendServer;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const expectedOut = example.out as {
      url: string;
      body: string;
      headers?: Record<string, string>;
    };

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    const settings: Record<string, unknown> = { url: expectedOut.url };
    if (expectedOut.headers) {
      settings.headers = expectedOut.headers;
    }

    elb(
      'walker destination',
      { ...dest, env: testEnv },
      { settings, mapping: mappingConfig },
    );

    await elb(event);

    expect(mockSendServer).toHaveBeenCalled();

    const [calledUrl, calledBody, calledOptions] = mockSendServer.mock.calls[0];
    expect(calledUrl).toBe(expectedOut.url);
    expect(calledBody).toBe(expectedOut.body);

    if (expectedOut.headers) {
      expect(calledOptions.headers).toEqual(expectedOut.headers);
    }
  });
});
