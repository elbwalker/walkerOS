import type { SendResponse } from '@walkeros/core';
import type { StepExample } from '../examples/step';
import { startFlow } from '@walkeros/collector';
import { destinationPiwikPro } from '..';
import { examples } from '../dev';

type Captured = [callable: string, ...args: unknown[]];

/**
 * The destination calls `env.sendServer(url, body, options)` once per event
 * that produces hits, and never for a skipped event. There are no init-time
 * calls to filter.
 */
describe('Step Examples', () => {
  const sendServer = jest.fn<Promise<SendResponse>, unknown[]>();

  beforeEach(() => {
    sendServer.mockReset();
    sendServer.mockResolvedValue({ ok: true, data: '' });
  });

  it.each<[string, StepExample]>(Object.entries(examples.step))(
    '%s',
    async (_, example) => {
      const event = example.in;
      const { elb } = await startFlow();

      await elb('walker destination', {
        code: { ...destinationPiwikPro, env: { sendServer } },
        config: {
          settings: {
            url: 'https://your_account_name.piwik.pro/',
            appId: 'e8f3a1c2-0b4d-4e5f-9a6b-7c8d9e0f1a2b',
            ...example.settings,
          },
          mapping: example.mapping
            ? { [event.entity]: { [event.action]: example.mapping } }
            : undefined,
        },
      });

      await elb(event);

      const captured: Captured[] = sendServer.mock.calls.map(
        (args): Captured => ['sendServer', ...args],
      );
      expect(captured).toEqual(example.out);
    },
  );
});
