import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  utimesSync,
  existsSync,
} from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { withConfigLock, getConfigLockPath } from '../../../lib/config-lock.js';

/** Let pending timers and microtasks run for `ms`. */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('withConfigLock', () => {
  let dir: string;
  const originalXdg = process.env.XDG_CONFIG_HOME;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-config-lock-'));
    process.env.XDG_CONFIG_HOME = dir;
  });

  afterEach(() => {
    if (originalXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = originalXdg;
    rmSync(dir, { recursive: true, force: true });
  });

  it('serializes two concurrent holders instead of interleaving them', async () => {
    const order: string[] = [];
    let releaseFirst!: () => void;
    const firstHeld = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let firstEntered!: () => void;
    const firstIsInside = new Promise<void>((resolve) => {
      firstEntered = resolve;
    });

    const first = withConfigLock(async () => {
      order.push('first:enter');
      firstEntered();
      await firstHeld;
      order.push('first:exit');
    });

    await firstIsInside;

    const second = withConfigLock(async () => {
      order.push('second:enter');
      order.push('second:exit');
    });

    // Long enough for several 100 ms acquire retries. Without a real lock the
    // second callback would have run to completion by now.
    await wait(300);
    expect(order).toEqual(['first:enter']);

    releaseFirst();
    await Promise.all([first, second]);

    expect(order).toEqual([
      'first:enter',
      'first:exit',
      'second:enter',
      'second:exit',
    ]);
  });

  it('breaks a lock whose file is older than the stale window', async () => {
    const lockPath = getConfigLockPath();
    mkdirSync(dirname(lockPath), { recursive: true });
    writeFileSync(lockPath, '');
    // 20 s of age, past the 15 s stale window.
    const past = Date.now() / 1000 - 20;
    utimesSync(lockPath, past, past);

    await expect(withConfigLock(async () => 'ran')).resolves.toBe('ran');
  });

  it('waits for a lock that is not yet stale rather than breaking it', async () => {
    // The control for the stale-breaking test above: proves the lock is
    // honored when it is fresh, so breaking it there is attributable to its
    // age and not to the lock being ignored.
    const lockPath = getConfigLockPath();
    mkdirSync(dirname(lockPath), { recursive: true });
    writeFileSync(lockPath, '');

    let ran = false;
    const pending = withConfigLock(async () => {
      ran = true;
    });

    await wait(300);
    expect(ran).toBe(false);

    rmSync(lockPath);
    await pending;
    expect(ran).toBe(true);
  });

  it('removes the lock file after the callback resolves', async () => {
    await withConfigLock(async () => undefined);
    expect(existsSync(getConfigLockPath())).toBe(false);
  });

  it('removes the lock file when the callback throws', async () => {
    await expect(
      withConfigLock(async () => {
        throw new Error('callback failed');
      }),
    ).rejects.toThrow('callback failed');

    expect(existsSync(getConfigLockPath())).toBe(false);
  });

  it('returns the callback result', async () => {
    await expect(withConfigLock(async () => 42)).resolves.toBe(42);
  });
});
