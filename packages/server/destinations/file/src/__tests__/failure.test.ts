import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import { destinationFile } from '..';

describe('file destination on a failing disk', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'walkeros-file-fail-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('fails the push when the file cannot be written, without crashing', async () => {
    // A directory as the filename: opening it for append fails (EISDIR).
    const { collector } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      destinations: {
        file: {
          code: destinationFile,
          config: { settings: { filename: dir } },
        },
      },
    });

    const result = await collector.push(getEvent('page view'));

    expect(result.ok).toBe(false);
    expect(result.failed?.file?.reason).toMatchObject({
      code: 'transport',
      message: expect.stringContaining('file destination: write failed'),
    });
    expect(collector.status.destinations.file.failed).toBe(1);
    expect(collector.destinations.file.dlq).toHaveLength(1);
    // The stream's error event was heard (a crash otherwise).
    expect(
      collector.status.connectionErrors['destination.file'],
    ).toBeGreaterThanOrEqual(1);

    await collector.command('shutdown');
  });
});
