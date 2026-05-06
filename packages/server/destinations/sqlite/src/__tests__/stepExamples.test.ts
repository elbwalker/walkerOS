import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type {
  Env,
  Settings,
  SqliteClient,
  SqliteClientFactory,
} from '../types';

type CallRecord = [string, ...unknown[]];
type ExpectedOut = CallRecord | CallRecord[];

function flatten(out: unknown): CallRecord[] {
  if (!Array.isArray(out) || out.length === 0) return [];
  if (typeof out[0] === 'string') return [out as CallRecord];
  return out as CallRecord[];
}

/**
 * Recording Env -- wraps a mock SqliteClient whose prepared inserts append
 * to a shared call log as ['client.runInsert', unknown[]].
 */
function spyEnv(): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];

  const client: SqliteClient = {
    async execute() {
      // CREATE TABLE calls are not recorded -- only inserts matter for assertions.
    },
    prepare() {
      return async (args) => {
        calls.push(['client.runInsert', args as unknown[]]);
      };
    },
    async query() {
      return [];
    },
    async close() {
      // no-op
    },
  };

  const factory: SqliteClientFactory = () => Promise.resolve(client);

  return {
    env: { SqliteDriver: factory },
    collected: () => calls,
  };
}

describe('sqlite server destination -- step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: unknown;
      settings?: Partial<Settings>;
    };

    const { env, collected } = spyEnv();
    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    const exampleSqlite = example.settings?.sqlite;
    const baseSettings: Settings = {
      sqlite: {
        url: ':memory:',
        // Legacy-compat: drive the auto-create path so init() does not require
        // pre-existing table state in step-example simulations.
        schema: 'auto',
        ...(exampleSqlite ?? {}),
      },
    };

    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env },
      {
        settings: baseSettings,
        mapping: mappingConfig,
      },
    );

    await elb(event);

    // Let async push settle.
    await new Promise((resolve) => setImmediate(resolve));

    const expected = flatten(example.out as ExpectedOut);
    const actual = collected();
    expect(actual).toEqual(expected);
  });
});
