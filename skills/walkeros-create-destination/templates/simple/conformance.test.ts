import type { StandardEventName } from '@walkeros/core';
import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import { destinationVendor } from '..';
import { examples, schemas } from '../dev';

/**
 * Conformance test template. `conformance` runs the destination on a real
 * collector and checks its failure contract. Pick the profile that matches
 * the destination:
 *
 * - `http`          calls fetch directly
 * - `sdk-env`       a server SDK injected through env
 * - `web-sdk`       a web SDK started in init (sdk-env without the init check)
 * - `vendor-global` a vendor script that defines a global (this template)
 * - `socket`        a long-lived connection
 *
 * The browser profiles (`web-sdk`, `vendor-global`) run on a page: pass `page`
 * from `@walkeros/web-core/dev`. A server destination drops the import and
 * the `page` lines.
 *
 * `examples.step` must carry, besides the happy-path examples: a `silent`
 * example (`public: false`, `out: []`), a consent revocation example when the
 * vendor has a consent switch, and a failure example (`outcome`, with a
 * `description`) for each event the destination cannot send.
 *
 * `minimal` is the package's minimal example (`src/examples/minimal.ts`):
 * only the settings the schema requires or `init` refuses to start without,
 * plus `config: { loadScript: true }` for a destination that loads its vendor
 * script on request. The kit starts the destination with it and requires one
 * public example delivered. A package that cannot have one passes
 * `withoutMinimal: '<reason>'` instead; a test with neither fails.
 *
 * `runExamples` runs every event example as `walkerOS.json` publishes it and
 * compares its `out` and its `outcome` with what happened; `conformance`
 * does not compare a failure example's `outcome`. `claims` lists the
 * standard events the destination maps: each needs a public example, and
 * every public event example must be claimed.
 */
const CLAIMS: StandardEventName[] = ['page view', 'order complete'];

const env = { push: examples.env.push, simulation: examples.env.simulation };

// The init example takes a config as `in`, not an event: index.test.ts runs it
const { init, ...events } = examples.step;

describe('vendor conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationVendor, {
      profile: 'vendor-global',
      page,
      examples: examples.step,
      schema: schemas.settings,
      settings: examples.minimal.settings,
      minimal: examples.minimal,
      env,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('runs every example and its outcome', async () => {
    await runExamples('destination', destinationVendor, events, {
      settings: examples.minimal.settings,
      env,
      page,
      claims: CLAIMS,
    });
  });
});
