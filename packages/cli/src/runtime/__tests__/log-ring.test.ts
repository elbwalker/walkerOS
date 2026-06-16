import { LogRing, ErrorRing } from '../log-ring.js';
import type { RingEntry } from '../log-ring.js';

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
