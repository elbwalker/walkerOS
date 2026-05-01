import { wrapCondition, wrapFn, wrapValidate } from '../wrapInlineCode';
import { createMockCollector } from './helpers/mocks';
import type { Mapping } from '../types';

const collector = createMockCollector();
const fakeContext: Mapping.Context = {
  event: { name: 'page view' },
  mapping: {},
  collector,
  logger: collector.logger,
  consent: { marketing: true },
};

describe('wrapFn', () => {
  test('produces fn that receives (value, context)', () => {
    const fn = wrapFn('value + ":" + context.event.name');
    expect(fn('hi', fakeContext)).toBe('hi:page view');
  });
  test('explicit return is respected', () => {
    const fn = wrapFn('return value * 2');
    expect(fn(5, fakeContext)).toBe(10);
  });
  test('exposes context.collector and context.logger', () => {
    const fn = wrapFn(
      'return typeof context.collector === "object" && typeof context.logger === "object"',
    );
    expect(fn(null, fakeContext)).toBe(true);
  });
});

describe('wrapCondition', () => {
  test('boolean from (value, context)', () => {
    const c = wrapCondition('context.consent?.marketing === true');
    expect(c('x', fakeContext)).toBe(true);
  });
});

describe('wrapValidate', () => {
  test('reads context for richer checks', () => {
    const v = wrapValidate(
      'typeof value === "string" && context.event.name === "page view"',
    );
    expect(v('foo', fakeContext)).toBe(true);
  });
});
