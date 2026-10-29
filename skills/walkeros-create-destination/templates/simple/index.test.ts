import { startFlow } from '@walkeros/collector';
import { clone, createLogger, observeEnv } from '@walkeros/core';
import type { Config } from './types';
import { destinationVendor } from '.';
import { examples } from './dev';

/**
 * Test template for the destination's own boundaries. The step examples are
 * the tests: `runExamples` in conformance.test.ts runs every event example on
 * a real collector. Keep tests here for what no example states, such as the
 * init example (its `in` is a config, not an event), ordering or a boundary.
 * Never hard-code a payload: add it to `examples.step` and read it from there.
 */
describe('vendor destination', () => {
  it('runs the init example', async () => {
    const { init } = examples.step;
    // `init.in` is `unknown`: the config is restated with its type so the
    // init call typechecks, and the assertion pins it to the example
    const config: Config = {
      loadScript: true,
      settings: { apiKey: 'YOUR_API_KEY' },
    };
    expect(init.in).toEqual(config);

    // Record the calls on the paths `examples.env.simulation` names
    const observed = observeEnv(
      clone(examples.env.push),
      examples.env.simulation,
    );
    const { collector } = await startFlow();
    await destinationVendor.init?.({
      id: 'vendor',
      config,
      env: observed.env,
      logger: createLogger(),
      collector,
    });

    expect(observed.calls.map(({ fn, args }) => [fn, ...args])).toEqual(
      init.out,
    );
  });
});
