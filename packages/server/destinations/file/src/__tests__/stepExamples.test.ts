import type { WalkerOS } from '@walkeros/core';
import { clone, createMockLogger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type { FileStepExample } from '../examples/step';
import type { SpyEnv } from '../examples/env';

describe('@walkeros/server-destination-file step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, rawExample) => {
    const example = rawExample as FileStepExample;

    const env = clone(examples.env.push) as SpyEnv;

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

    const captured = env._spy.captured.get(example.out.filename);
    expect(captured).toBeDefined();
    if (!captured) return;
    expect(captured.filename).toBe(example.out.filename);

    if (example.out.line !== undefined) {
      expect(captured.lines.join('')).toBe(example.out.line);
    } else {
      // JSONL default: recompute expected line from the event.
      // This is the only place tests derive expected output, because
      // JSONL = JSON.stringify(event) + '\n' is a framework contract.
      expect(captured.lines.join('')).toBe(JSON.stringify(example.in) + '\n');
    }
  });

  it('rejects missing filename in init', async () => {
    const dest = jest.requireActual('../').default;
    const env = clone(examples.env.push) as SpyEnv;
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
    const env = clone(examples.env.push) as SpyEnv;
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
