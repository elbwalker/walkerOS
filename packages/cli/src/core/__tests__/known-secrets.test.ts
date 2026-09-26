import type { Flow } from '@walkeros/core';
import { collectKnownSecrets, maskKnownNumbers } from '../known-secrets.js';
import { scrubSecrets } from '../redact-line.js';

function flowWith(...refs: string[]): Flow.Json {
  return {
    version: 4,
    flows: {
      default: {
        config: { platform: 'server' },
        destinations: {
          api: {
            package: '@walkeros/server-destination-api',
            config: { settings: { keys: refs, nested: { key: refs[0] } } },
          },
        },
      },
    },
  };
}

describe('collectKnownSecrets', () => {
  it('returns the value of each referenced secret', () => {
    expect(
      collectKnownSecrets(flowWith('$secret.GCP_SA'), { GCP_SA: 'value-123' }),
    ).toEqual(['value-123']);
  });

  it('ignores unset and empty names and unreferenced env values', () => {
    expect(
      collectKnownSecrets(
        flowWith('$secret.GCP_SA', '$secret.UNSET', '$secret.EMPTY'),
        { GCP_SA: 'value-123', EMPTY: '', OTHER: 'not-referenced' },
      ),
    ).toEqual(['value-123']);
  });

  it('only counts whole-value references', () => {
    expect(
      collectKnownSecrets(flowWith('prefix $secret.GCP_SA'), {
        GCP_SA: 'value-123',
      }),
    ).toEqual([]);
  });
});

describe('maskKnownNumbers', () => {
  it('masks numbers that print a digits-only known secret', () => {
    expect(
      maskKnownNumbers(
        { id: 12345678, n: 9123456789, s: 'a12345678b', list: [12345678] },
        ['12345678'],
      ),
    ).toEqual({ id: '***', n: '***', s: 'a12345678b', list: ['***'] });
  });

  it.each([
    ['a negative number', -1234567, '-1234567'],
    ['a decimal', 1234567.5, '1234567.5'],
    ['an exponent form', 1.5e300, '1.5e+300'],
  ])('masks %s whose printed form is a known value', (_label, n, secret) => {
    const masked = maskKnownNumbers({ n, list: [n] }, [secret]);

    expect(masked).toEqual({ n: '***', list: ['***'] });
    // The egress order: mask numbers, serialize, then scrub the text.
    const line = scrubSecrets(JSON.stringify(masked), { known: [secret] });
    expect(JSON.parse(line)).toEqual({ n: '***', list: ['***'] });
  });

  it.each([['12345'], ['tok-123456']])(
    'leaves numbers alone for the known value %s',
    (secret) => {
      const value = { id: 12345678, short: 12345, list: [123456] };
      expect(maskKnownNumbers(value, [secret])).toEqual(value);
    },
  );
});
