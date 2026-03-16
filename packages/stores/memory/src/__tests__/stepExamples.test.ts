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
    const input = example.in as {
      operation: string;
      key: string;
    };
    const output = example.out as { value: unknown };

    const store = createMemoryStore();
    // Pre-populate the store with the expected value
    store.set(input.key, output.value);

    const result = store.get(input.key);
    expect(result).toEqual(output.value);
  });

  it('setAndGet — write then read back', () => {
    const example = examples.step.setAndGet;
    const input = example.in as {
      operation: string;
      key: string;
      value: unknown;
    };
    const output = example.out as {
      operation: string;
      key: string;
      value: unknown;
    };

    const store = createMemoryStore();
    store.set(input.key, input.value);

    const result = store.get(output.key);
    expect(result).toEqual(output.value);
  });

  it('ttlExpiration — entry expires after TTL', () => {
    const example = examples.step.ttlExpiration;
    const input = example.in as {
      operation: string;
      key: string;
      value: unknown;
      ttl: number;
    };
    const output = example.out as {
      operation: string;
      key: string;
      value: unknown;
    };

    const store = createMemoryStore();
    store.set(input.key, input.value, input.ttl);

    // Advance past the TTL
    jest.advanceTimersByTime(input.ttl + 1);

    const result = store.get(output.key);
    expect(result).toEqual(output.value);
  });
});
