import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationFirehose } from '..';
import { exportExamples, schemas } from '../../dev';
import * as examples from '../examples';

describe('aws firehose conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationFirehose, {
      profile: 'sdk-env',
      examples: examples.step,
      schema: schemas.settings,
      settings: examples.minimal.settings,
      env: { push: examples.env.push, simulation: examples.env.simulation },
      exportName: 'destinationFirehose',
      exportExamples,
      root: path.join(__dirname, '..', '..', '..'),
    });
  });
});
