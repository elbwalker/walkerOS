import type { WalkerOS } from '@walkeros/core';
import { createMockContext } from '@walkeros/core';
import { __getCalls, __reset } from '../__mocks__/@clickhouse/client';
import destination from '../';
import { examples } from '../dev';
import type { Credentials, InitSettings, PartialConfig } from '../types';
import { id, isRecord } from './support';
import { expectSimulationResolves } from '@walkeros/core/dev';

const initOut = examples.step.init.out ?? [];

function isInitSettings(value: unknown): value is InitSettings {
  if (!isRecord(value)) return false;
  if (typeof value.url !== 'string') return false;
  if (value.database !== undefined && typeof value.database !== 'string')
    return false;
  if (value.table !== undefined && typeof value.table !== 'string')
    return false;
  if (value.maxRetries !== undefined && typeof value.maxRetries !== 'number')
    return false;

  return true;
}

function isCredentials(value: unknown): value is Credentials {
  return (
    isRecord(value) &&
    typeof value.username === 'string' &&
    typeof value.password === 'string'
  );
}

function isEvent(value: unknown): value is WalkerOS.Event {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.entity === 'string' &&
    typeof value.action === 'string'
  );
}

/** The config a user copy-pastes, read back from an init step example. */
function toConfig(raw: unknown, name: string): PartialConfig {
  if (!isRecord(raw))
    throw new Error(`The ${name} example \`in\` must be a config object`);
  if (!isInitSettings(raw.settings))
    throw new Error(`The ${name} example settings must carry a url`);
  if (!isCredentials(raw.credentials))
    throw new Error(
      `The ${name} example credentials must carry a username and a password`,
    );

  return { settings: raw.settings, credentials: raw.credentials };
}

describe('clickhouse destination -- step examples', () => {
  beforeEach(() => {
    __reset();
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const env = examples.env.push;

    // An example whose `in` is a config rather than an event exercises the
    // bootstrap on its own: init on that config, compare what it produced.
    if (!isEvent(example.in)) {
      await destination.init(
        createMockContext({ config: toConfig(example.in, name), env, id }),
      );

      expect(__getCalls()).toEqual(example.out);
      return;
    }

    // Every push example bootstraps through the real init, so the captured
    // calls always start with the init effects.
    const config = await destination.init(
      createMockContext({
        config: toConfig(examples.step.init.in, 'init'),
        env,
        id,
      }),
    );

    if (!config)
      throw new Error('init must return the resolved config for a push');

    await destination.push(
      example.in,
      createMockContext({ config, env, id, rule: example.mapping }),
    );

    expect(__getCalls().slice(initOut.length)).toEqual(example.out);
  });
});

it('declares simulation paths that resolve', () =>
  expectSimulationResolves(examples.env));
