import { compileNext, resolveNext } from '../route';

describe('compileNext', () => {
  it('returns undefined for undefined input', () => {
    expect(compileNext(undefined)).toBeUndefined();
  });

  it('compiles a static string', () => {
    const compiled = compileNext('enricher');
    expect(compiled).toBeDefined();
    expect(resolveNext(compiled!)).toBe('enricher');
  });

  it('compiles a static string array', () => {
    const compiled = compileNext(['a', 'b', 'c']);
    expect(compiled).toBeDefined();
    expect(resolveNext(compiled!)).toEqual(['a', 'b', 'c']);
  });

  it('compiles routes and resolves first match', () => {
    const compiled = compileNext([
      {
        match: { key: 'path', operator: 'prefix', value: '/gtag' },
        next: 'gtag-parser',
      },
      { match: '*', next: 'default' },
    ]);
    expect(resolveNext(compiled!, { path: '/gtag/collect' })).toBe(
      'gtag-parser',
    );
    expect(resolveNext(compiled!, { path: '/other' })).toBe('default');
  });

  it('returns undefined when no route matches and no wildcard', () => {
    const compiled = compileNext([
      {
        match: { key: 'method', operator: 'eq', value: 'POST' },
        next: 'writer',
      },
    ]);
    expect(resolveNext(compiled!, { method: 'GET' })).toBeUndefined();
  });

  it('resolves nested routes recursively', () => {
    const compiled = compileNext([
      {
        match: { key: 'path', operator: 'prefix', value: '/api' },
        next: [
          {
            match: { key: 'method', operator: 'eq', value: 'POST' },
            next: 'api-writer',
          },
          { match: '*', next: 'api-reader' },
        ],
      },
      { match: '*', next: 'default' },
    ]);
    expect(resolveNext(compiled!, { path: '/api/data', method: 'POST' })).toBe(
      'api-writer',
    );
    expect(resolveNext(compiled!, { path: '/api/data', method: 'GET' })).toBe(
      'api-reader',
    );
    expect(resolveNext(compiled!, { path: '/other' })).toBe('default');
  });

  it('resolves route target to string array (chain)', () => {
    const compiled = compileNext([
      {
        match: { key: 'method', operator: 'eq', value: 'POST' },
        next: ['validator', 'writer'],
      },
      { match: '*', next: 'reader' },
    ]);
    expect(resolveNext(compiled!, { method: 'POST' })).toEqual([
      'validator',
      'writer',
    ]);
  });

  it('handles complex match expressions (and/or)', () => {
    const compiled = compileNext([
      {
        match: {
          and: [
            { key: 'path', operator: 'prefix', value: '/api' },
            { key: 'method', operator: 'eq', value: 'POST' },
          ],
        },
        next: 'api-writer',
      },
      { match: '*', next: 'default' },
    ]);
    expect(resolveNext(compiled!, { path: '/api/data', method: 'POST' })).toBe(
      'api-writer',
    );
    expect(resolveNext(compiled!, { path: '/api/data', method: 'GET' })).toBe(
      'default',
    );
  });

  it('resolves without ingest (static values pass through)', () => {
    const compiled = compileNext('enricher');
    expect(resolveNext(compiled!)).toBe('enricher');
  });
});
