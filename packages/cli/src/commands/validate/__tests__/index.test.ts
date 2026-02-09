// walkerOS/packages/cli/src/commands/validate/__tests__/index.test.ts

import { describe, it, expect } from '@jest/globals';
import { validate } from '../index.js';

describe('validate programmatic API', () => {
  describe('event validation', () => {
    it('validates event object', async () => {
      const result = await validate('event', {
        name: 'page view',
        data: { title: 'Home' },
      });

      expect(result.valid).toBe(true);
      expect(result.type).toBe('event');
    });

    it('returns errors for invalid event', async () => {
      const result = await validate('event', { name: 'pageview' });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('flow validation', () => {
    it('validates flow object', async () => {
      const result = await validate('flow', {
        version: 1,
        flows: { default: { web: {} } },
      });

      expect(result.valid).toBe(true);
      expect(result.type).toBe('flow');
    });
  });

  describe('mapping validation', () => {
    it('validates mapping object', async () => {
      const result = await validate('mapping', {
        'page view': { name: 'page_view' },
      });

      expect(result.valid).toBe(true);
      expect(result.type).toBe('mapping');
    });
  });

  describe('invalid type', () => {
    it('throws for unknown validation type', async () => {
      await expect(validate('unknown' as any, {})).rejects.toThrow(
        'Unknown validation type',
      );
    });
  });
});
