import { getNextSteps } from '../route';
import * as packageIndex from '../index';
import type { Route } from '../types/transformer';

describe('getNextSteps', () => {
  it('returns [] for undefined spec', () => {
    expect(getNextSteps(undefined, {})).toEqual([]);
  });

  it('returns single-element array for a string ID', () => {
    expect(getNextSteps('enricher', {})).toEqual(['enricher']);
  });

  it('returns string[] for a chain', () => {
    expect(getNextSteps(['a', 'b', 'c'], {})).toEqual(['a', 'b', 'c']);
  });

  it('returns first match for `one` operator', () => {
    const spec: Route = {
      one: [
        {
          match: { key: 'event.name', operator: 'eq', value: 'page view' },
          next: 'page',
        },
        { next: 'default' },
      ],
    };
    expect(getNextSteps(spec, { event: { name: 'page view' } })).toEqual([
      'page',
    ]);
    expect(getNextSteps(spec, { event: { name: 'order' } })).toEqual([
      'default',
    ]);
  });

  it('returns ALL matches for `many` operator', () => {
    const spec: Route = {
      many: [
        {
          match: { key: 'event.name', operator: 'eq', value: 'page view' },
          next: 'audit',
        },
        { next: 'always' },
        {
          match: { key: 'event.name', operator: 'eq', value: 'never' },
          next: 'skipped',
        },
      ],
    };
    expect(getNextSteps(spec, { event: { name: 'page view' } })).toEqual([
      'audit',
      'always',
    ]);
  });

  it('returns [] for empty many', () => {
    expect(getNextSteps({ many: [] }, {})).toEqual([]);
  });

  it('returns [] for many where all matches fail', () => {
    const spec: Route = {
      many: [
        { match: { key: 'x', operator: 'eq', value: 'A' }, next: 'a' },
        { match: { key: 'x', operator: 'eq', value: 'B' }, next: 'b' },
      ],
    };
    expect(getNextSteps(spec, { x: 'Z' })).toEqual([]);
  });

  it('returns inner next when outer gate passes', () => {
    expect(
      getNextSteps(
        {
          match: { key: 'ingest.path', operator: 'prefix', value: '/api' },
          next: 'api',
        },
        { ingest: { path: '/api/x' } },
      ),
    ).toEqual(['api']);
  });

  it('returns [] when outer gate fails', () => {
    expect(
      getNextSteps(
        {
          match: { key: 'ingest.path', operator: 'prefix', value: '/api' },
          next: 'api',
        },
        { ingest: { path: '/other' } },
      ),
    ).toEqual([]);
  });

  it('handles nested many inside one', () => {
    const spec: Route = {
      one: [
        {
          match: { key: 'event.name', operator: 'eq', value: 'order' },
          next: { many: ['a', 'b'] },
        },
        { next: 'default' },
      ],
    };
    expect(getNextSteps(spec, { event: { name: 'order' } })).toEqual([
      'a',
      'b',
    ]);
  });

  it('mixed sequence concatenates segments', () => {
    const spec: Route = [
      'dedup',
      {
        one: [
          {
            match: { key: 'ingest.path', operator: 'prefix', value: '/api' },
            next: ['validate', 'enrich'],
          },
          { next: 'fallback' },
        ],
      },
      'writer',
    ];
    expect(getNextSteps(spec, { ingest: { path: '/api/x' } })).toEqual([
      'dedup',
      'validate',
      'enrich',
      'writer',
    ]);
    expect(getNextSteps(spec, { ingest: { path: '/other' } })).toEqual([
      'dedup',
      'fallback',
      'writer',
    ]);
  });

  it('caches compiled AST by spec object identity', () => {
    const spec: Route = { many: ['a', 'b'] };
    const first = getNextSteps(spec, {});
    const second = getNextSteps(spec, {});
    expect(first).toEqual(second);
    expect(first).toEqual(['a', 'b']);
  });

  it('is exported from package index', () => {
    expect(typeof packageIndex.getNextSteps).toBe('function');
    expect(packageIndex.getNextSteps).toBe(getNextSteps);
  });
});
