import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationFile } from '..';
import { examples, schemas } from '../dev';

describe('file conformance', () => {
  // The runs without env write to the real disk: keep them in a temp dir.
  let dir: string;

  beforeEach(() => {
    jest.useRealTimers();
    dir = mkdtempSync(path.join(tmpdir(), 'walkeros-file-kit-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('conforms', async () => {
    await conformance('destination', destinationFile, {
      profile: 'socket',
      examples: examples.step,
      schema: schemas.settings,
      settings: { filename: path.join(dir, 'events.jsonl') },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });
});
