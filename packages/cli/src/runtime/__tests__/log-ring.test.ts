import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { LogRing, ErrorRing } from '../log-ring.js';
import type { RingEntry, DedupedError } from '../log-ring.js';

function makeEntry(time: number, message: string): RingEntry {
  return { time, level: 'info', message };
}

describe('LogRing', () => {
  it('starts empty', () => {
    const ring = new LogRing(5);
    expect(ring.snapshot()).toEqual([]);
  });

  it('keeps only the last N entries', () => {
    const ring = new LogRing(5);
    for (let i = 0; i < 10; i++) {
      ring.add(makeEntry(i, `msg-${i}`));
    }
    const snap = ring.snapshot();
    expect(snap).toHaveLength(5);
    // oldest dropped: only messages 5..9 remain
    expect(snap[0].message).toBe('msg-5');
    expect(snap[4].message).toBe('msg-9');
  });

  it('snapshot(limit) returns the most recent limit entries oldest-first', () => {
    const ring = new LogRing(10);
    for (let i = 0; i < 8; i++) {
      ring.add(makeEntry(i, `msg-${i}`));
    }
    const snap = ring.snapshot(3);
    expect(snap).toHaveLength(3);
    expect(snap[0].message).toBe('msg-5');
    expect(snap[1].message).toBe('msg-6');
    expect(snap[2].message).toBe('msg-7');
  });
});

describe('ErrorRing', () => {
  it('starts empty', () => {
    let t = 0;
    const ring = new ErrorRing(10, () => t++);
    expect(ring.snapshot()).toEqual([]);
  });

  it('deduplicates: same message twice yields count 2, firstSeen unchanged, lastSeen updated', () => {
    let t = 100;
    const now = () => t;
    const ring = new ErrorRing(10, now);

    t = 100;
    ring.add('boom');
    t = 200;
    ring.add('boom');

    const snap = ring.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0].message).toBe('boom');
    expect(snap[0].count).toBe(2);
    expect(snap[0].firstSeen).toBe(100);
    expect(snap[0].lastSeen).toBe(200);
  });

  it('evicts the least-recently-seen entry when maxUnique is exceeded', () => {
    let t = 0;
    const ring = new ErrorRing(3, () => t++);

    // add 3 distinct messages at t=0,1,2
    ring.add('a'); // lastSeen=0
    ring.add('b'); // lastSeen=1
    ring.add('c'); // lastSeen=2

    // touch 'a' again so it's no longer the LRS
    ring.add('a'); // lastSeen=3 now

    // 'd' is the 4th distinct message — should evict 'b' (lastSeen=1, oldest)
    ring.add('d'); // t=4

    const snap = ring.snapshot();
    const messages = snap.map((e) => e.message);
    expect(messages).not.toContain('b');
    expect(messages).toContain('a');
    expect(messages).toContain('c');
    expect(messages).toContain('d');
  });

  it('snapshot returns entries sorted by lastSeen descending', () => {
    let t = 0;
    const ring = new ErrorRing(10, () => t++);

    ring.add('first'); // t=0
    ring.add('second'); // t=1
    ring.add('third'); // t=2

    const snap = ring.snapshot();
    expect(snap[0].message).toBe('third');
    expect(snap[1].message).toBe('second');
    expect(snap[2].message).toBe('first');
  });
});

describe('ErrorRing listener', () => {
  it('invokes the listener with isNew=true on the first occurrence and isNew=false on repeats', () => {
    let t = 0;
    const ring = new ErrorRing(10, () => t++);
    const calls: Array<{ message: string; isNew: boolean }> = [];
    ring.setListener((entry: DedupedError, isNew: boolean) => {
      calls.push({ message: entry.message, isNew });
    });

    ring.add('boom');
    ring.add('boom');
    ring.add('other');

    expect(calls).toEqual([
      { message: 'boom', isNew: true },
      { message: 'boom', isNew: false },
      { message: 'other', isNew: true },
    ]);
  });

  it('does not let a throwing listener break add (entry is still recorded)', () => {
    let t = 0;
    const ring = new ErrorRing(10, () => t++);
    ring.setListener(() => {
      throw new Error('listener blew up');
    });

    expect(() => ring.add('boom')).not.toThrow();
    expect(ring.snapshot().map((e) => e.message)).toContain('boom');
  });
});

describe('ErrorRing durable jsonl sink', () => {
  function tempDir(): string {
    return mkdtempSync(join(tmpdir(), 'walkeros-ring-'));
  }

  it('synchronously appends one line per new message, not on repeats', () => {
    const dir = tempDir();
    const sink = join(dir, 'errors.jsonl');
    let t = 100;
    const ring = new ErrorRing(10, () => t);
    ring.setSink(sink);

    t = 100;
    ring.add('boom'); // new → append
    t = 200;
    ring.add('boom'); // repeat → no append
    t = 300;
    ring.add('crash'); // new → append

    const lines = readFileSync(sink, 'utf-8')
      .split('\n')
      .filter((l) => l.length > 0);
    expect(lines).toHaveLength(2);
    const first: { message: string; firstSeen: number } = JSON.parse(lines[0]);
    const second: { message: string; firstSeen: number } = JSON.parse(lines[1]);
    expect(first.message).toBe('boom');
    expect(first.firstSeen).toBe(100);
    expect(second.message).toBe('crash');
    expect(second.firstSeen).toBe(300);
  });

  it('swallows an fs append failure but still records the entry', () => {
    // Point the sink at a path whose parent does not exist so appendFileSync
    // throws ENOENT; add must not throw and must still record the entry.
    const dir = tempDir();
    const sink = join(dir, 'does-not-exist', 'errors.jsonl');
    let t = 0;
    const ring = new ErrorRing(10, () => t++);
    ring.setSink(sink);

    expect(() => ring.add('boom')).not.toThrow();
    expect(ring.snapshot().map((e) => e.message)).toContain('boom');
    expect(existsSync(sink)).toBe(false);
  });

  it('does not append when no sink is configured (sink disabled)', () => {
    // No setSink call: add must work and write nothing anywhere. Exercised by
    // the absence of a throw and a normal snapshot.
    let t = 0;
    const ring = new ErrorRing(10, () => t++);
    expect(() => ring.add('boom')).not.toThrow();
    expect(ring.snapshot()).toHaveLength(1);
  });

  it('seed inserts an entry without re-appending to the sink', () => {
    const dir = tempDir();
    const sink = join(dir, 'errors.jsonl');
    let t = 500;
    const ring = new ErrorRing(10, () => t);
    ring.setSink(sink);

    ring.seed('prior boom', 42);

    // seeded entry is visible in the snapshot...
    const snap = ring.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0].message).toBe('prior boom');
    expect(snap[0].firstSeen).toBe(42);

    // ...but seed must NOT write to the sink (otherwise boot re-ship would
    // re-persist the same line forever).
    expect(existsSync(sink)).toBe(false);
  });

  it('seed treats an already-seeded message as a repeat (isNew=false, no extra line)', () => {
    const dir = tempDir();
    const sink = join(dir, 'errors.jsonl');
    let t = 0;
    const ring = new ErrorRing(10, () => t++);
    ring.setSink(sink);

    // Pre-existing file content does not matter; seed first, then a live add of
    // the same message must be a dedup (count increments), and must not write a
    // duplicate first-occurrence line.
    writeFileSync(sink, '');
    ring.seed('boom', 7);
    ring.add('boom');

    const snap = ring.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0].count).toBe(2);

    const lines = readFileSync(sink, 'utf-8')
      .split('\n')
      .filter((l) => l.length > 0);
    // add('boom') saw the seeded key as existing → isNew=false → no append.
    expect(lines).toHaveLength(0);
  });
});
