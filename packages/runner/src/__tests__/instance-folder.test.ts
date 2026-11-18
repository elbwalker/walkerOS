import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';
import os from 'os';
import { basename, dirname, join } from 'path';
import {
  createInstanceFolder,
  removeInstanceFolder,
} from '../instance-folder.js';

describe('instance folder', () => {
  let root: string;

  beforeEach(() => {
    // Each test gets a temp directory of its own (restoreMocks undoes the spy).
    root = mkdtempSync(join(os.tmpdir(), 'runner-instance-folder-'));
    jest.spyOn(os, 'tmpdir').mockReturnValue(root);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('makes a new walkeros- folder under the temp directory each time, readable by its user only', async () => {
    const first = await createInstanceFolder();
    const second = await createInstanceFolder();

    expect(first).not.toBe(second);
    for (const folder of [first, second]) {
      expect(dirname(folder)).toBe(root);
      expect(basename(folder)).toMatch(/^walkeros-/);
      expect(statSync(folder).isDirectory()).toBe(true);
      expect(statSync(folder).mode & 0o777).toBe(0o700);
    }
  });

  it('names the folder it cannot make', async () => {
    const missing = join(root, 'missing');
    jest.spyOn(os, 'tmpdir').mockReturnValue(missing);

    await expect(createInstanceFolder()).rejects.toThrow(
      `The instance folder under ${missing} cannot be made`,
    );
  });

  it('removes a folder with files in it', async () => {
    const folder = await createInstanceFolder();
    await mkdir(join(folder, 'flow', 'node_modules'), { recursive: true });
    writeFileSync(join(folder, 'flow', 'flow.mjs'), 'export default 1');

    removeInstanceFolder(folder);

    expect(existsSync(folder)).toBe(false);
  });

  it('does not throw for a folder that is already gone', () => {
    expect(() => removeInstanceFolder(join(root, 'gone'))).not.toThrow();
  });
});
