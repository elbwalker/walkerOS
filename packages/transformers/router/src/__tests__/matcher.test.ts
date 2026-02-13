import { compileMatcher } from '../matcher';

describe('compileMatcher', () => {
  describe('wildcard', () => {
    it('should always match on *', () => {
      const match = compileMatcher('*');
      expect(match({})).toBe(true);
      expect(match({ path: '/anything' })).toBe(true);
    });
  });

  describe('single condition', () => {
    it('eq: exact match', () => {
      const match = compileMatcher({
        key: 'method',
        operator: 'eq',
        value: 'POST',
      });
      expect(match({ method: 'POST' })).toBe(true);
      expect(match({ method: 'GET' })).toBe(false);
    });

    it('prefix: starts with', () => {
      const match = compileMatcher({
        key: 'path',
        operator: 'prefix',
        value: '/gtag',
      });
      expect(match({ path: '/gtag/collect' })).toBe(true);
      expect(match({ path: '/collect' })).toBe(false);
    });

    it('suffix: ends with', () => {
      const match = compileMatcher({
        key: 'path',
        operator: 'suffix',
        value: '.json',
      });
      expect(match({ path: '/api/data.json' })).toBe(true);
      expect(match({ path: '/api/data.xml' })).toBe(false);
    });

    it('contains: substring', () => {
      const match = compileMatcher({
        key: 'path',
        operator: 'contains',
        value: 'webhook',
      });
      expect(match({ path: '/api/webhooks/stripe' })).toBe(true);
      expect(match({ path: '/api/events' })).toBe(false);
    });

    it('regex: pattern match', () => {
      const match = compileMatcher({
        key: 'path',
        operator: 'regex',
        value: '^/v\\d+/events$',
      });
      expect(match({ path: '/v2/events' })).toBe(true);
      expect(match({ path: '/latest/events' })).toBe(false);
    });

    it('gt: greater than (numeric)', () => {
      const match = compileMatcher({
        key: 'size',
        operator: 'gt',
        value: '100',
      });
      expect(match({ size: 200 })).toBe(true);
      expect(match({ size: 50 })).toBe(false);
    });

    it('lt: less than (numeric)', () => {
      const match = compileMatcher({
        key: 'size',
        operator: 'lt',
        value: '100',
      });
      expect(match({ size: 50 })).toBe(true);
      expect(match({ size: 200 })).toBe(false);
    });

    it('exists: key present', () => {
      const match = compileMatcher({
        key: 'topic',
        operator: 'exists',
        value: '',
      });
      expect(match({ topic: 'events' })).toBe(true);
      expect(match({})).toBe(false);
    });

    it('not: negation', () => {
      const match = compileMatcher({
        key: 'path',
        operator: 'prefix',
        value: '/internal',
        not: true,
      });
      expect(match({ path: '/public/api' })).toBe(true);
      expect(match({ path: '/internal/api' })).toBe(false);
    });

    it('missing key returns empty string for comparison', () => {
      const match = compileMatcher({
        key: 'missing',
        operator: 'eq',
        value: '',
      });
      expect(match({})).toBe(true);
    });
  });

  describe('and', () => {
    it('should require all conditions to match', () => {
      const match = compileMatcher({
        and: [
          { key: 'path', operator: 'prefix', value: '/api' },
          { key: 'method', operator: 'eq', value: 'POST' },
        ],
      });
      expect(match({ path: '/api/events', method: 'POST' })).toBe(true);
      expect(match({ path: '/api/events', method: 'GET' })).toBe(false);
      expect(match({ path: '/other', method: 'POST' })).toBe(false);
    });

    it('should short-circuit on first false', () => {
      const match = compileMatcher({
        and: [
          { key: 'a', operator: 'eq', value: 'no' },
          { key: 'b', operator: 'eq', value: 'yes' },
        ],
      });
      expect(match({ a: 'no', b: 'no' })).toBe(false);
    });
  });

  describe('or', () => {
    it('should match if any condition matches', () => {
      const match = compileMatcher({
        or: [
          { key: 'path', operator: 'eq', value: '/collect' },
          { key: 'path', operator: 'eq', value: '/events' },
        ],
      });
      expect(match({ path: '/collect' })).toBe(true);
      expect(match({ path: '/events' })).toBe(true);
      expect(match({ path: '/other' })).toBe(false);
    });
  });

  describe('nested and/or', () => {
    it('should handle nested expressions', () => {
      // (path prefix /api AND method POST) OR (topic eq shopify)
      const match = compileMatcher({
        or: [
          {
            and: [
              { key: 'path', operator: 'prefix', value: '/api' },
              { key: 'method', operator: 'eq', value: 'POST' },
            ],
          },
          { key: 'topic', operator: 'eq', value: 'shopify' },
        ],
      });

      expect(match({ path: '/api/data', method: 'POST' })).toBe(true);
      expect(match({ topic: 'shopify' })).toBe(true);
      expect(match({ path: '/api/data', method: 'GET' })).toBe(false);
      expect(match({ topic: 'other' })).toBe(false);
    });

    it('should handle deeply nested expressions', () => {
      // NOT path /internal AND (method POST OR (method GET AND path prefix /public))
      const match = compileMatcher({
        and: [
          { key: 'path', operator: 'contains', value: 'internal', not: true },
          {
            or: [
              { key: 'method', operator: 'eq', value: 'POST' },
              {
                and: [
                  { key: 'method', operator: 'eq', value: 'GET' },
                  { key: 'path', operator: 'prefix', value: '/public' },
                ],
              },
            ],
          },
        ],
      });

      expect(match({ path: '/api', method: 'POST' })).toBe(true);
      expect(match({ path: '/public/data', method: 'GET' })).toBe(true);
      expect(match({ path: '/internal/api', method: 'POST' })).toBe(false);
      expect(match({ path: '/private', method: 'GET' })).toBe(false);
    });
  });
});
