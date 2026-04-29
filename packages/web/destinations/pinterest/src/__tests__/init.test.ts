/**
 * Pinterest destination — init test.
 *
 * The step-examples runner filters out `load` and `page` commands. This
 * dedicated test asserts that init fires them in the right order and with
 * the right arguments, and handles the pageview + missing-apiKey paths.
 */

import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { Env, Pintrk } from '../types';

function spy(env: Env): unknown[][] {
  const calls: unknown[][] = [];
  const fn = ((...args: unknown[]) => {
    calls.push(args);
  }) as unknown as Pintrk;
  fn.queue = [];
  fn.version = '3.0';
  env.window.pintrk = fn;
  return calls;
}

describe('pinterest destination — init', () => {
  it('fires pintrk("load", tagId) then pintrk("page") when pageview is true (default)', async () => {
    const env = clone(examples.env.push) as Env;
    const calls = spy(env);

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    await elb(
      'walker destination',
      { ...dest, env },
      {
        settings: { apiKey: '2612345678901' },
      },
    );
    // Init fires lazily on first push, so trigger a no-op event.
    await elb('walker run');

    expect(calls).toEqual([['load', '2612345678901'], ['page']]);
  });

  it('skips pintrk("page") when pageview is false', async () => {
    const env = clone(examples.env.push) as Env;
    const calls = spy(env);

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    await elb(
      'walker destination',
      { ...dest, env },
      {
        settings: {
          apiKey: '2612345678901',
          pageview: false,
        },
      },
    );
    await elb('walker run');

    expect(calls).toEqual([['load', '2612345678901']]);
  });

  it('returns false when apiKey is missing', async () => {
    const dest = jest.requireActual('../').default;
    const env = clone(examples.env.push) as Env;
    const result = await dest.init({
      config: { settings: {} },
      env,
    });
    expect(result).toBe(false);
  });
});
