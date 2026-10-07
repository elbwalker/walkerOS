import type { SendResponse } from '@walkeros/core';
import type { Rule } from '../types';
import type { StepExample } from '../examples/step';
import { runInNewContext } from 'vm';
import { startFlow } from '@walkeros/collector';
import { isObject } from '@walkeros/core';
import { destinationPiwikPro } from '..';
import { examples } from '../dev';
import { expectSimulationResolves } from '@walkeros/core/dev';

type Captured = [callable: string, ...args: unknown[]];

// Functions in examples are published as `{ $code: fn.toString() }` in
// walkerOS.json and evaluated without the module scope they were written in.
function asPublished(rule: Rule | undefined): Rule | undefined {
  if (rule === undefined) return rule;
  return JSON.parse(
    JSON.stringify(rule, (_, value) =>
      typeof value === 'function' ? { $code: value.toString() } : value,
    ),
    (_, value) =>
      isObject(value) && typeof value.$code === 'string'
        ? runInNewContext(`(${value.$code})`)
        : value,
  );
}

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

  async function run(
    example: StepExample,
    rule: Rule | undefined,
  ): Promise<Captured[]> {
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
        mapping: rule
          ? { [event.entity]: { [event.action]: rule } }
          : undefined,
      },
    });

    await elb(event);

    return sendServer.mock.calls.map(
      (args): Captured => ['sendServer', ...args],
    );
  }

  it.each<[string, StepExample]>(Object.entries(examples.step))(
    '%s',
    async (_, example) => {
      expect(await run(example, example.mapping)).toEqual(example.out);
    },
  );

  it.each<[string, StepExample]>(Object.entries(examples.step))(
    '%s as published',
    async (_, example) => {
      expect(await run(example, asPublished(example.mapping))).toEqual(
        example.out,
      );
    },
  );
});

it('declares simulation paths that resolve', () =>
  expectSimulationResolves(examples.env));
