import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ErrorRing } from '../log-ring.js';
import { errorSinkPath, wireErrorSink } from '../error-sink.js';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'walkeros-error-sink-'));
}

function sinkMessages(sink: string): string[] {
  return readFileSync(sink, 'utf-8')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const record: { message: string } = JSON.parse(line);
      return record.message;
    });
}

describe('errorSinkPath', () => {
  it.each<[string, number | undefined, string]>([
    ['a runner on a port', 8080, '/var/cache/walkeros/errors-8080.jsonl'],
    ['no port', undefined, '/var/cache/walkeros/errors.jsonl'],
  ])('names the file for %s', (_case, port, path) => {
    expect(errorSinkPath('/var/cache/walkeros', port)).toBe(path);
  });
});

describe('wireErrorSink', () => {
  it('appends the next first-seen error to the file it seeded from, after the seeded ones are cleared', () => {
    const sink = join(tempDir(), 'errors.jsonl');
    writeFileSync(
      sink,
      JSON.stringify({ message: 'prior boom', firstSeen: 111 }) + '\n',
    );
    const ring = new ErrorRing(10, () => 222);

    wireErrorSink(ring, sink);
    ring.add('next boom');

    expect(sinkMessages(sink)).toEqual(['next boom']);
  });

  it('keeps two files for two runners on ports 8080 and 8081 that share one cache folder', () => {
    const cacheDir = tempDir();
    const first = new ErrorRing(10, () => 1);
    const second = new ErrorRing(10, () => 2);
    wireErrorSink(first, errorSinkPath(cacheDir, 8080));
    wireErrorSink(second, errorSinkPath(cacheDir, 8081));
    first.add('boom on 8080');
    second.add('boom on 8081');

    // The runner on 8081 restarts; the one on 8080 keeps its file.
    const restarted = new ErrorRing(10, () => 3);
    wireErrorSink(restarted, errorSinkPath(cacheDir, 8081));

    expect(restarted.snapshot().map((e) => e.message)).toEqual([
      'boom on 8081',
    ]);
    expect(sinkMessages(errorSinkPath(cacheDir, 8080))).toEqual([
      'boom on 8080',
    ]);
  });
});

describe('wireErrorSink on a fresh container', () => {
  it('creates a not-yet-existing cache dir so the first append persists the line', () => {
    // Mirror the managed-runner boot: the cacheDir does NOT exist yet. The
    // wiring must create it so ErrorRing.persist's synchronous append
    // succeeds rather than throwing ENOENT into the swallow.
    const base = tempDir();
    const cacheDir = join(base, 'nested', 'walkeros-cache');
    expect(existsSync(cacheDir)).toBe(false);

    const sink = errorSinkPath(cacheDir);
    let t = 777;
    const ring = new ErrorRing(10, () => t);
    wireErrorSink(ring, sink);
    expect(existsSync(cacheDir)).toBe(true);
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
    // swallowed: the wiring must not throw, and the ring must keep working.
    const base = tempDir();
    const filePath = join(base, 'not-a-dir');
    writeFileSync(filePath, 'i am a file');
    const cacheDir = join(filePath, 'cache'); // under a file → ENOTDIR

    const sink = errorSinkPath(cacheDir);
    let t = 0;
    const ring = new ErrorRing(10, () => t++);
    expect(() => wireErrorSink(ring, sink)).not.toThrow();
    expect(existsSync(cacheDir)).toBe(false);

    expect(() => ring.add('boom')).not.toThrow();
    expect(ring.snapshot().map((e) => e.message)).toContain('boom');
    expect(existsSync(sink)).toBe(false);
  });
});

describe('wireErrorSink seeding', () => {
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
    wireErrorSink(ring, sink);

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
    wireErrorSink(ring1, sink); // truncates

    const ring2 = new ErrorRing(10, () => 0);
    wireErrorSink(ring2, sink); // second boot reads the truncated file
    expect(ring2.snapshot()).toHaveLength(0);
  });

  it('ignores a missing file (nothing seeded, no file created)', () => {
    const dir = tempDir();
    const sink = join(dir, 'errors.jsonl');

    const ring = new ErrorRing(10, () => 0);
    expect(() => wireErrorSink(ring, sink)).not.toThrow();
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
    wireErrorSink(ring, sink);

    const messages = ring.snapshot().map((e) => e.message);
    expect(messages).toEqual(['valid']);
  });
});
