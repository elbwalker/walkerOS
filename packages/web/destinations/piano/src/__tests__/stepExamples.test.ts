import type { WalkerOS } from '@walkeros/core';
import { isObject, mockEnv } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type { Config, Env, Rule } from '../types';
import destinationPiano from '..';

type Effect = [string, ...unknown[]];

/**
 * `StepExample.in` and `.mapping` are typed `unknown`. Narrow them with type
 * predicates (the cast-free way) rather than `as` assertions.
 */
function isEvent(value: unknown): value is WalkerOS.Event {
  return (
    isObject(value) &&
    typeof value.name === 'string' &&
    typeof value.entity === 'string' &&
    typeof value.action === 'string'
  );
}

function isConfig(value: unknown): value is Config {
  return isObject(value);
}

function isRule(value: unknown): value is Rule {
  return isObject(value);
}

/**
 * Capture every Piano SDK method call by wrapping the example env with
 * `mockEnv`, which recurses into `window.pa` and records each call as
 * `[callable, ...args]` (e.g. `['pa.sendEvent', 'page.display', {...}]`).
 */
function spyEnv(): { env: Env; calls: Effect[] } {
  const calls: Effect[] = [];
  const env = mockEnv(examples.env.push, (path, args) => {
    calls.push([path.slice(1).join('.'), ...args]);
  });
  return { env, calls };
}

const initExample = examples.step.init;
const initConfig: Config = isConfig(initExample.in) ? initExample.in : {};
const initOut: Effect[] = [...(initExample.out ?? [])].map((effect) => [
  ...effect,
]);

describe('piano destination — step examples', () => {
  const stepEntries = Object.entries(examples.step).filter(
    ([name]) => name !== 'init',
  );

  it.each(stepEntries)('%s', async (name, example) => {
    const { env, calls } = spyEnv();

    if (!isEvent(example.in))
      throw new Error(`step example "${name}" has no event input`);

    const rule = isRule(example.mapping) ? example.mapping : undefined;
    const mapping: Config['mapping'] = rule
      ? { [example.in.entity]: { [example.in.action]: rule } }
      : undefined;

    const { elb } = await startFlow();
    await elb('walker destination', {
      code: { ...destinationPiano, env },
      config: { ...initConfig, mapping },
    });
    await elb(example.in);

    const expected: Effect[] = [...(example.out ?? [])].map((effect) => [
      ...effect,
    ]);

    // init (setConfigurations) runs before push (sendEvent); assert both.
    expect(calls).toEqual([...initOut, ...expected]);
  });
});
