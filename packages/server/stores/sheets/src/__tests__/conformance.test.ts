import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { storeSheetsInit } from '..';
import { examples, schemas } from '../dev';

const settings = { id: 'spreadsheet-id-123' };
const env = { push: examples.env.push, simulation: examples.env.simulation };

describe('sheets store conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('store', storeSheetsInit, {
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
    await runExamples(
      'store',
      storeSheetsInit,
      { failedRead },
      { settings, env },
    );
  });
});
