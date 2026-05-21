import type { WalkerOS } from '@walkeros/core';
import { createEvent } from '@walkeros/core';
import { pushBounded } from '../buffers';

describe('pushBounded', () => {
  function makeEvent(name: string): WalkerOS.Event {
    return createEvent({ name });
  }

  test('appends when below cap', () => {
    const buffer: WalkerOS.Event[] = [];
    const result = pushBounded(buffer, makeEvent('a'), { max: 3 });
    expect(result).toEqual({ appended: true, dropped: 0 });
    expect(buffer.length).toBe(1);
  });

  test('appends up to exactly cap with no drops', () => {
    const buffer: WalkerOS.Event[] = [];
    pushBounded(buffer, makeEvent('a'), { max: 3 });
    pushBounded(buffer, makeEvent('b'), { max: 3 });
    const result = pushBounded(buffer, makeEvent('c'), { max: 3 });
    expect(result).toEqual({ appended: true, dropped: 0 });
    expect(buffer.length).toBe(3);
    expect(buffer.map((e) => e.name)).toEqual(['a', 'b', 'c']);
  });

  test('dropOldest evicts head when over cap', () => {
    const buffer: WalkerOS.Event[] = [
      makeEvent('a'),
      makeEvent('b'),
      makeEvent('c'),
    ];
    const result = pushBounded(buffer, makeEvent('d'), {
      max: 3,
      onOverflow: 'dropOldest',
    });
    expect(result).toEqual({ appended: true, dropped: 1 });
    expect(buffer.length).toBe(3);
    expect(buffer.map((e) => e.name)).toEqual(['b', 'c', 'd']);
  });

  test('dropOldest is the default policy', () => {
    const buffer: WalkerOS.Event[] = [
      makeEvent('a'),
      makeEvent('b'),
      makeEvent('c'),
    ];
    const result = pushBounded(buffer, makeEvent('d'), { max: 3 });
    expect(result).toEqual({ appended: true, dropped: 1 });
    expect(buffer.map((e) => e.name)).toEqual(['b', 'c', 'd']);
  });

  test('dropNewest refuses new item when at cap', () => {
    const buffer: WalkerOS.Event[] = [
      makeEvent('a'),
      makeEvent('b'),
      makeEvent('c'),
    ];
    const result = pushBounded(buffer, makeEvent('d'), {
      max: 3,
      onOverflow: 'dropNewest',
    });
    expect(result).toEqual({ appended: false, dropped: 1 });
    expect(buffer.length).toBe(3);
    expect(buffer.map((e) => e.name)).toEqual(['a', 'b', 'c']);
  });

  test('onDrop fires with the dropped items on dropOldest overflow', () => {
    const buffer: WalkerOS.Event[] = [
      makeEvent('a'),
      makeEvent('b'),
      makeEvent('c'),
    ];
    const drops: WalkerOS.Event[][] = [];
    pushBounded(
      buffer,
      makeEvent('d'),
      { max: 3, onOverflow: 'dropOldest' },
      (dropped) => drops.push(dropped),
    );
    expect(drops.length).toBe(1);
    expect(drops[0].length).toBe(1);
    expect(drops[0][0].name).toBe('a');
  });

  test('onDrop fires with the new item on dropNewest overflow', () => {
    const buffer: WalkerOS.Event[] = [
      makeEvent('a'),
      makeEvent('b'),
      makeEvent('c'),
    ];
    const drops: WalkerOS.Event[][] = [];
    const incoming = makeEvent('d');
    pushBounded(
      buffer,
      incoming,
      { max: 3, onOverflow: 'dropNewest' },
      (dropped) => drops.push(dropped),
    );
    expect(drops.length).toBe(1);
    expect(drops[0][0]).toBe(incoming);
  });

  test('onDrop is not invoked when no overflow', () => {
    const buffer: WalkerOS.Event[] = [];
    const drops: WalkerOS.Event[][] = [];
    pushBounded(buffer, makeEvent('a'), { max: 3 }, (dropped) =>
      drops.push(dropped),
    );
    expect(drops.length).toBe(0);
  });

  test('throws on max <= 0', () => {
    const buffer: WalkerOS.Event[] = [];
    expect(() => pushBounded(buffer, makeEvent('a'), { max: 0 })).toThrow(
      /max must be > 0/,
    );
    expect(() => pushBounded(buffer, makeEvent('a'), { max: -1 })).toThrow(
      /max must be > 0/,
    );
  });
});
