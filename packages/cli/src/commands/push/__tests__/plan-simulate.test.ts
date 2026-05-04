import { planSimulate } from '../plan-simulate';

describe('planSimulate', () => {
  it('returns kind=none and empty ids on empty input', () => {
    expect(planSimulate([])).toEqual({ kind: 'none', ids: [] });
  });

  it('rejects bare names without prefix', () => {
    expect(() => planSimulate(['api'])).toThrow(
      /Invalid step format.*api.*Expected/,
    );
  });

  it('rejects unknown prefix', () => {
    expect(() => planSimulate(['store.cache'])).toThrow(
      /Unsupported step type.*store/,
    );
  });

  it('rejects empty name', () => {
    expect(() => planSimulate(['destination.'])).toThrow(/Missing name/);
  });

  it('rejects 4-part chain syntax (only valid for --mock)', () => {
    expect(() => planSimulate(['destination.api.before.redact'])).toThrow(
      /chain syntax.*not supported.*--simulate/,
    );
  });

  it('returns destination + every id', () => {
    expect(planSimulate(['destination.api', 'destination.meta'])).toEqual({
      kind: 'destination',
      ids: ['api', 'meta'],
    });
  });

  it('returns single source id', () => {
    expect(planSimulate(['source.browser'])).toEqual({
      kind: 'source',
      ids: ['browser'],
    });
  });

  it('rejects multiple source flags (single-target only)', () => {
    expect(() => planSimulate(['source.browser', 'source.dataLayer'])).toThrow(
      /source.*single target/i,
    );
  });

  it('rejects multiple transformer flags', () => {
    expect(() =>
      planSimulate(['transformer.redact', 'transformer.enrich']),
    ).toThrow(/transformer.*single target/i);
  });

  it('rejects mixed types', () => {
    expect(() => planSimulate(['destination.api', 'source.browser'])).toThrow(
      /Cannot.*destination.*source/,
    );
  });

  it('dedupes identical destination ids', () => {
    expect(planSimulate(['destination.api', 'destination.api'])).toEqual({
      kind: 'destination',
      ids: ['api'],
    });
  });
});
