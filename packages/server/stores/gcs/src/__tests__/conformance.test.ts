import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { storeGcsInit } from '..';
import { examples, schemas } from '../dev';

const settings = { bucket: 'my-assets' };
const env = { push: examples.env.push, simulation: examples.env.simulation };

describe('gcs store conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('store', storeGcsInit, {
      profile: 'socket',
      examples: examples.step,
      schema: schemas.settings,
      settings,
      env,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('reports a failed read instead of a miss', async () => {
    const { failedRead } = examples.step;
    await runExamples('store', storeGcsInit, { failedRead }, { settings, env });
  });
});
