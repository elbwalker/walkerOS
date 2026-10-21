import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationSNS } from '..';
import { schemas } from '../../dev';
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
      settings: {
        topicArn: 'arn:aws:sns:eu-central-1:123456789012:walkeros-events',
      },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..', '..'),
    });
  });
});
