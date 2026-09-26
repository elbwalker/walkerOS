import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { scrubSecrets } from '../redact-line';
import { tmpRunDir, type TmpRunKind } from '../tmp-names';

describe('tmpRunDir', () => {
  let root: string;

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'tmp-names-'));
  });

  afterAll(async () => {
    await fs.remove(root);
  });

  it('creates <root>/walkeros/<kind>/<6 chars>', async () => {
    const dir = await tmpRunDir('push', root);

    expect(path.relative(root, dir)).toMatch(/^walkeros\/push\/[\w-]{6}$/);
    expect((await fs.stat(dir)).isDirectory()).toBe(true);
  });

  it('never produces a path the redactor masks', async () => {
    const kinds: TmpRunKind[] = [
      'push',
      'build',
      'bundle',
      'wrap',
      'archive',
      'setup',
    ];
    const masked: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const dir = await tmpRunDir(kinds[i % kinds.length], root);
      // The same run dir as it looks under the usual Linux temp root.
      const shown = path.join('/tmp', path.relative(root, dir), 'flow.mjs');
      if (scrubSecrets(shown) !== shown) masked.push(shown);
    }

    expect(masked).toEqual([]);
  });
});
