import type { WalkerOS } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type { FileStepExample } from '../examples/step';
import type { CapturedFile, SpyEnv, SpyState } from '../examples/env';
import type { FileWriteStream } from '../types';

/**
 * Build a fresh spy env per test. The exported `examples.env.push` shares
 * its internal state map across all tests because `clone` deep-copies the
 * object but not the closures behind `createWriteStream`. This factory
 * gives each test its own isolated captured-file state.
 */
function makeSpyEnv(): SpyEnv {
  const state: SpyState = {
    captured: new Map(),
    mkdirCalls: [],
  };
  return {
    _spy: state,
    fs: {
      createWriteStream: (path) => {
        const existing = state.captured.get(path);
        const file: CapturedFile = existing ?? {
          filename: path,
          lines: [],
          ended: false,
        };
        if (!existing) state.captured.set(path, file);
        const stream: FileWriteStream = {
          write(chunk) {
            file.lines.push(chunk);
            return true;
          },
          end() {
            file.ended = true;
          },
        };
        return stream;
      },
      mkdir: async (path) => {
        state.mkdirCalls.push(path);
      },
    },
  };
}

type CallRecord = [string, ...unknown[]];
type ExpectedOut = CallRecord | CallRecord[];

function flatten(out: unknown): CallRecord[] {
  if (!Array.isArray(out) || out.length === 0) return [];
  if (typeof out[0] === 'string') return [out as CallRecord];
  return out as CallRecord[];
}

describe('@walkeros/server-destination-file step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, rawExample) => {
    const example = rawExample as FileStepExample;

    const env = makeSpyEnv();

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    // FileSettingsJson is the serialisable view of Settings;
    // walkerOS resolves `$code:` fn strings at flow start.
    // `elb(...)` accepts a generic Config whose settings is `unknown`.
    elb(
      'walker destination',
      { ...dest, env },
      {
        settings: example.settings,
      },
    );

    await elb(example.in as WalkerOS.Event);

    // Convert the spy's per-file capture into intent-level call tuples:
    // one ['fs.writeFile', filename, line] per write. The destination uses
    // a persistent createWriteStream handle internally; we aggregate to the
    // logical intent per the design doc.
    const actual: CallRecord[] = [];
    for (const [filename, captured] of env._spy.captured.entries()) {
      for (const line of captured.lines) {
        actual.push(['fs.writeFile', filename, line]);
      }
    }

    const expected = flatten(example.out as ExpectedOut).map(
      (call): CallRecord => {
        // The jsonl default case uses a 'jsonl:event' placeholder for the
        // line. Expand it here using the framework contract:
        // JSONL = JSON.stringify(event) + '\n'. This is the only place
        // tests derive expected output for the default format.
        if (call[2] === 'jsonl:event') {
          return [call[0], call[1], JSON.stringify(example.in) + '\n'];
        }
        return call;
      },
    );

    expect(actual).toEqual(expected);
  });

  it('rejects missing filename in init', async () => {
    const dest = jest.requireActual('../').default;
    const env = makeSpyEnv();
    const logger = createMockLogger();
    await expect(
      dest.init({
        id: 'test-missing-filename',
        config: { settings: {} },
        env,
        logger,
      }),
    ).rejects.toThrow(/filename/i);
  });

  it('rejects tsv without fields in init', async () => {
    const dest = jest.requireActual('../').default;
    const env = makeSpyEnv();
    const logger = createMockLogger();
    await expect(
      dest.init({
        id: 'test-tsv-no-fields',
        config: { settings: { filename: 'a.tsv', format: 'tsv' } },
        env,
        logger,
      }),
    ).rejects.toThrow(/fields/i);
  });
});
