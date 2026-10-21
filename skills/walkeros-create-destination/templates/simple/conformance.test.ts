import path from 'path';
import { conformance } from '@walkeros/collector/dev';
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
 * `examples.step` must carry, besides the happy-path examples: a `silent`
 * example (`public: false`, `out: []`), a consent revocation example when the
 * vendor has a consent switch, and a failure example (`outcome`) for each
 * event the destination cannot send.
 */
describe('vendor conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationVendor, {
      profile: 'vendor-global',
      examples: examples.step,
      schema: schemas.settings,
      settings: { apiKey: 'test-key' },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
