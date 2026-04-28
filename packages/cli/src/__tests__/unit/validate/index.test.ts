// walkerOS/packages/cli/src/commands/validate/__tests__/index.test.ts

import { describe, it, expect } from '@jest/globals';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { validate } from '../../../commands/validate/index.js';

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
        version: 4,
        flows: { default: { config: { platform: 'web' } } },
      });

      expect(result.valid).toBe(true);
      expect(result.type).toBe('flow');
    });

    it('validates flow from file path', async () => {
      const flow = {
        version: 4,
        flows: { default: { config: { platform: 'web' } } },
      };
      const tmpFile = path.join(os.tmpdir(), 'test-flow.json');
      fs.writeFileSync(tmpFile, JSON.stringify(flow));

      try {
        const result = await validate('flow', tmpFile);
        expect(result.valid).toBe(true);
        expect(result.type).toBe('flow');
      } finally {
        fs.unlinkSync(tmpFile);
      }
    });

    it('validates flow from JSON string', async () => {
      const flow = {
        version: 4,
        flows: { default: { config: { platform: 'web' } } },
      };
      const result = await validate('flow', JSON.stringify(flow));

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

  describe('flow validation includes deep checks', () => {
    it('validates cross-step examples as part of flow validation', async () => {
      const result = await validate('flow', {
        version: 4,
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              gtag: {
                package: '@walkeros/web-destination-gtag',
                examples: {
                  pageview: {
                    in: { name: 'page view' },
                    out: ['event', 'page_view'],
                  },
                },
              },
            },
          },
        },
      });

      expect(result.valid).toBe(true);
      expect(result.type).toBe('flow');
    });
  });

  describe('path-based entry validation', () => {
    it('routes to entry validation when path is provided', async () => {
      const result = await validate(
        'flow',
        {},
        { path: 'destinations.nonexistent' },
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('ENTRY_VALIDATION');
    });

    it('ignores type when path is provided', async () => {
      // Even though type is 'event', path takes priority
      const result = await validate(
        'event',
        {},
        { path: 'destinations.nonexistent' },
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('ENTRY_VALIDATION');
    });
  });
});
