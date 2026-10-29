import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationSQLite } from '..';
import { examples, schemas } from '../dev';

describe('sqlite conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationSQLite, {
      profile: 'socket',
      examples: examples.step,
      schema: schemas.settings,
      // An in-memory database that creates its table at the first push, so
      // the real driver runs without a setup step.
      settings: { sqlite: { url: ':memory:', schema: 'auto' } },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
      withoutMinimal:
        'the install line cannot express the driver choice (better-sqlite3 or @libsql/client)',
    });
  });
});
