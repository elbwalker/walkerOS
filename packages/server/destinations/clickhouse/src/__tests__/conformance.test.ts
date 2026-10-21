import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationClickHouse } from '..';
import { examples, schemas } from '../dev';

describe('clickhouse conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationClickHouse, {
      profile: 'socket',
      examples: examples.step,
      schema: schemas.settings,
      // No retry: the kit's failure answers are judged on the first attempt.
      settings: { url: 'https://clickhouse.example.com:8443', maxRetries: 0 },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
