import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { destinationReditus } from '..';
import { examples, schemas } from '../dev';

const { settings } = examples.minimal;

describe('reditus conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationReditus, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings,
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('runs every example: requests, vendor answers and failures', async () => {
    await runExamples('destination', destinationReditus, examples.step, {
      settings,
      env: examples.env,
    });
  });
});
