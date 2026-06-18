import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ErrorRing } from '../../../runtime/index.js';
import {
  ensureSinkDir,
  errorSinkPath,
  seedErrorRingFromJsonl,
} from '../error-sink.js';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'walkeros-error-sink-'));
}

describe('errorSinkPath', () => {
  it('resolves errors.jsonl inside the cache dir', () => {
    expect(errorSinkPath('/var/cache/walkeros')).toBe(
      '/var/cache/walkeros/errors.jsonl',
    );
  });
});

describe('ensureSinkDir + sink persistence on a fresh container', () => {
  it('creates a not-yet-existing cache dir so the first append persists the line', () => {
    // Mirror the managed-runner boot: the cacheDir does NOT exist yet (no
    // writeCache ran). ensureSinkDir must create it so ErrorRing.persist's
    // synchronous append succeeds rather than throwing ENOENT into the swallow.
    const base = tempDir();
    const cacheDir = join(base, 'nested', 'walkeros-cache');
    expect(existsSync(cacheDir)).toBe(false);

    ensureSinkDir(cacheDir);
    expect(existsSync(cacheDir)).toBe(true);

    const sink = errorSinkPath(cacheDir);
    let t = 777;
    const ring = new ErrorRing(10, () => t);
    ring.setSink(sink);
    ring.add('boom');

    expect(existsSync(sink)).toBe(true);
    const lines = readFileSync(sink, 'utf-8')
      .split('\n')
      .filter((l) => l.length > 0);
    expect(lines).toHaveLength(1);
    const record: { message: string; firstSeen: number } = JSON.parse(lines[0]);
    expect(record.message).toBe('boom');
    expect(record.firstSeen).toBe(777);
  });

  it('swallows a genuinely unwritable path (cacheDir under a file, not a dir)', () => {
    // Point the cacheDir at a path whose parent is a regular FILE, so mkdir
    // cannot create it (ENOTDIR) and a later append also fails. Both must be
    // swallowed: ensureSinkDir must not throw, and the ring must keep working.
    const base = tempDir();
    const filePath = join(base, 'not-a-dir');
    writeFileSync(filePath, 'i am a file');
    const cacheDir = join(filePath, 'cache'); // under a file → ENOTDIR

    expect(() => ensureSinkDir(cacheDir)).not.toThrow();
    expect(existsSync(cacheDir)).toBe(false);

    const sink = errorSinkPath(cacheDir);
    let t = 0;
    const ring = new ErrorRing(10, () => t++);
    ring.setSink(sink);

    expect(() => ring.add('boom')).not.toThrow();
    expect(ring.snapshot().map((e) => e.message)).toContain('boom');
    expect(existsSync(sink)).toBe(false);
  });
});

describe('seedErrorRingFromJsonl', () => {
  it('seeds prior errors into the ring then truncates the file', () => {
    const dir = tempDir();
    const sink = join(dir, 'errors.jsonl');
    writeFileSync(
      sink,
      [
        JSON.stringify({ message: 'prior boom', firstSeen: 111 }),
        JSON.stringify({ message: 'prior crash', firstSeen: 222 }),
      ].join('\n') + '\n',
    );

    let t = 1000;
    const ring = new ErrorRing(10, () => t);
    seedErrorRingFromJsonl(ring, sink);

    const messages = ring.snapshot().map((e) => e.message);
    expect(messages).toContain('prior boom');
    expect(messages).toContain('prior crash');
    // firstSeen preserved from the persisted record (not the boot clock).
    const boom = ring.snapshot().find((e) => e.message === 'prior boom');
    expect(boom?.firstSeen).toBe(111);

    // File is truncated so a following boot re-ships nothing.
    expect(readFileSync(sink, 'utf-8')).toBe('');
  });

  it('is not re-shipped on the following boot (truncated file seeds nothing)', () => {
    const dir = tempDir();
    const sink = join(dir, 'errors.jsonl');
    writeFileSync(
      sink,
      JSON.stringify({ message: 'once', firstSeen: 5 }) + '\n',
    );

    const ring1 = new ErrorRing(10, () => 0);
    seedErrorRingFromJsonl(ring1, sink); // truncates

    const ring2 = new ErrorRing(10, () => 0);
    seedErrorRingFromJsonl(ring2, sink); // second boot reads the truncated file
    expect(ring2.snapshot()).toHaveLength(0);
  });

  it('ignores a missing file (nothing seeded, no file created)', () => {
    const dir = tempDir();
    const sink = join(dir, 'errors.jsonl');

    const ring = new ErrorRing(10, () => 0);
    expect(() => seedErrorRingFromJsonl(ring, sink)).not.toThrow();
    expect(ring.snapshot()).toHaveLength(0);
    expect(existsSync(sink)).toBe(false);
  });

  it('skips corrupt lines but seeds the valid ones', () => {
    const dir = tempDir();
    const sink = join(dir, 'errors.jsonl');
    writeFileSync(
      sink,
      [
        'not json at all',
        JSON.stringify({ message: 'valid', firstSeen: 9 }),
        JSON.stringify({ notAnError: true }),
      ].join('\n') + '\n',
    );

    const ring = new ErrorRing(10, () => 0);
    seedErrorRingFromJsonl(ring, sink);

    const messages = ring.snapshot().map((e) => e.message);
    expect(messages).toEqual(['valid']);
  });
});
