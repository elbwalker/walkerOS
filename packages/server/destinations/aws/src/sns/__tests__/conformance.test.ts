import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationSNS } from '..';
import { exportExamples, schemas } from '../../dev';
import * as examples from '../examples';

describe('aws sns conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationSNS, {
      profile: 'sdk-env',
      examples: examples.step,
      schema: schemas.snsSettings,
      settings: examples.minimal.settings,
      env: { push: examples.env.push, simulation: examples.env.simulation },
      exportName: 'destinationSNS',
      exportExamples,
      root: path.join(__dirname, '..', '..', '..'),
    });
  });
});
