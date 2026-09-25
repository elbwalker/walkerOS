/**
 * `--consent` is a source simulation's starting consent: `runPush` accepts it
 * and hands it to `simulateSource` (which applies it as the flow's consent).
 */

import type { Simulation } from '@walkeros/core';

jest.mock('../index.js', () => ({
  ...jest.requireActual('../index.js'),
  simulateSource: jest.fn(
    async (): Promise<Simulation.Result> => ({
      step: 'source',
      name: 'session',
      events: [],
      calls: [],
      duration: 1,
    }),
  ),
}));

// run.ts first: it loads the (mocked) index, whose actual module then
// completes before the mock spreads it.
import { runPushCommand } from '../run.js';
import { simulateSource } from '../index.js';

it('forwards --consent to a source simulation', async () => {
  const result = await runPushCommand({
    config: 'flow.json',
    event: '{"trigger":{"type":"load"}}',
    simulate: ['source.session'],
    consentSource: '{"functional":true}',
  });

  expect(result.success).toBe(true);
  expect(jest.mocked(simulateSource)).toHaveBeenCalledWith(
    'flow.json',
    { trigger: { type: 'load' } },
    expect.objectContaining({
      sourceId: 'session',
      consent: { functional: true },
    }),
  );
});
