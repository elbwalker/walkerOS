import type { WalkerOS } from '@elbwalker/types';
import { getMappingValue } from '../';

describe('getMappingValue', () => {
  let event: WalkerOS.Event;

  beforeEach(() => {
    event = { data: { foo: 'bar' } } as unknown as WalkerOS.Event;
  });

  test('basic', () => {
    expect(getMappingValue(event, 'data.foo')).toBe('bar');
  });

  test('key', () => {
    expect(getMappingValue(event, { key: 'data.foo' })).toBe('bar');
  });

  test('default', () => {
    expect(getMappingValue(event, { default: 'fallback' })).toBe('fallback');
    expect(
      getMappingValue(event, { key: 'data.nope', default: 'fallback' }),
    ).toBe('fallback');
  });

  test('empty', () => {
    expect(getMappingValue(event)).toBeUndefined();
  });
});
