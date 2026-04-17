import { createMemoryStore } from '../store';
import { examples } from '../dev';

describe('Step Examples', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('getHit — read an existing key', () => {
    const example = examples.step.getHit;
    const input = example.in as { operation: string; key: string };
    const [, expectedKey, expectedValue] = example.out![0] as readonly [
      string,
      string,
      unknown,
    ];

    const store = createMemoryStore();
    // Pre-populate the store with the expected value
    store.set(input.key, expectedValue);

    const result = store.get(expectedKey);
    expect(result).toEqual(expectedValue);
  });

  it('setAndGet — write then read back', () => {
    const example = examples.step.setAndGet;
    const input = example.in as {
      operation: string;
      key: string;
      value: unknown;
    };
    const [, getKey, getValue] = example.out![1] as readonly [
      string,
      string,
      unknown,
    ];

    const store = createMemoryStore();
    store.set(input.key, input.value);

    const result = store.get(getKey);
    expect(result).toEqual(getValue);
  });

  it('ttlExpiration — entry expires after TTL', () => {
    const example = examples.step.ttlExpiration;
    const input = example.in as {
      operation: string;
      key: string;
      value: unknown;
      ttl: number;
    };
    const [, getKey, getValue] = example.out![1] as readonly [
      string,
      string,
      unknown,
    ];

    const store = createMemoryStore();
    store.set(input.key, input.value, input.ttl);

    // Advance past the TTL
    jest.advanceTimersByTime(input.ttl + 1);

    const result = store.get(getKey);
    expect(result).toEqual(getValue);
  });
});
