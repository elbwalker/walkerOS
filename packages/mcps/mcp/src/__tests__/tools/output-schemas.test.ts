import { z } from 'zod';
import {
  ValidateOutputShape,
  BundleOutputShape,
  SimulateOutputShape,
  PushOutputShape,
} from '../../schemas/output.js';

/**
 * Helper: given a shape (Record<string, ZodType>), build a z.object()
 * and parse `data` through it. Returns the Zod parse result.
 */
function parseShape(shape: Record<string, z.ZodType>, data: unknown) {
  return z.object(shape).safeParse(data);
}

describe('output schemas', () => {
  describe('ValidateOutputShape', () => {
    it('accepts a full valid result', () => {
      const result = parseShape(ValidateOutputShape, {
        valid: true,
        type: 'event',
        errors: [],
        warnings: [],
        details: { checked: 5 },
      });
      expect(result.success).toBe(true);
    });

    it('accepts errors with optional fields', () => {
      const result = parseShape(ValidateOutputShape, {
        valid: false,
        type: 'flow',
        errors: [
          {
            path: '/name',
            message: 'required',
            value: undefined,
            code: 'required',
          },
        ],
        warnings: [
          { path: '/dest', message: 'deprecated', suggestion: 'use v2' },
        ],
        details: {},
      });
      expect(result.success).toBe(true);
    });

    it('accepts dot-notation destination type', () => {
      const result = parseShape(ValidateOutputShape, {
        valid: true,
        type: 'destinations.snowplow',
        errors: [],
        warnings: [],
        details: {},
      });
      expect(result.success).toBe(true);
    });

    it('accepts dot-notation source type', () => {
      const result = parseShape(ValidateOutputShape, {
        valid: true,
        type: 'sources.datalayer',
        errors: [],
        warnings: [],
        details: {},
      });
      expect(result.success).toBe(true);
    });

    it('accepts dot-notation transformer type', () => {
      const result = parseShape(ValidateOutputShape, {
        valid: true,
        type: 'transformers.router',
        errors: [],
        warnings: [],
        details: {},
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid type', () => {
      const result = parseShape(ValidateOutputShape, {
        valid: true,
        type: 'invalid.foo.bar',
        errors: [],
        warnings: [],
        details: {},
      });
      expect(result.success).toBe(false);
    });
  });

  describe('BundleOutputShape', () => {
    it('accepts minimal success result', () => {
      const result = parseShape(BundleOutputShape, {
        success: true,
        message: 'Bundle created',
      });
      expect(result.success).toBe(true);
    });

    it('accepts full result with packages', () => {
      const result = parseShape(BundleOutputShape, {
        success: true,
        totalSize: 2048,
        buildTime: 150,
        packages: [
          { name: '@walkeros/ga4', size: 1024 },
          { name: '@walkeros/meta', size: 512 },
        ],
        treeshakingEffective: true,
      });
      expect(result.success).toBe(true);
    });

    it('rejects when success is missing', () => {
      const result = parseShape(BundleOutputShape, { totalSize: 100 });
      expect(result.success).toBe(false);
    });
  });

  describe('SimulateOutputShape', () => {
    it('accepts minimal success result', () => {
      const result = parseShape(SimulateOutputShape, {
        success: true,
        summary: '0/0 destinations received the event',
      });
      expect(result.success).toBe(true);
    });

    it('accepts full result with destinations', () => {
      const result = parseShape(SimulateOutputShape, {
        success: true,
        summary: '1/2 destinations received the event',
        destinations: {
          gtag: { received: true, calls: 1, payload: { args: ['event'] } },
          meta: { received: false, calls: 0 },
        },
        duration: 42,
      });
      expect(result.success).toBe(true);
    });

    it('accepts failure result with error', () => {
      const result = parseShape(SimulateOutputShape, {
        success: false,
        error: 'Config not found',
        summary: 'Simulation failed',
      });
      expect(result.success).toBe(true);
    });

    it('accepts result with capturedEvents', () => {
      const result = parseShape(SimulateOutputShape, {
        success: true,
        summary: 'Source captured 2 events',
        capturedEvents: [
          { name: 'page view', data: { title: 'Home' } },
          { name: 'cta click', data: { label: 'Sign Up' } },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('PushOutputShape', () => {
    it('accepts minimal success result', () => {
      const result = parseShape(PushOutputShape, {
        success: true,
        duration: 150,
      });
      expect(result.success).toBe(true);
    });

    it('accepts full result with optional fields', () => {
      const result = parseShape(PushOutputShape, {
        success: true,
        elbResult: { ok: true },
        duration: 200,
      });
      expect(result.success).toBe(true);
    });

    it('accepts failure result with error', () => {
      const result = parseShape(PushOutputShape, {
        success: false,
        duration: 50,
        error: 'Destination unreachable',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing duration', () => {
      const result = parseShape(PushOutputShape, {
        success: true,
      });
      expect(result.success).toBe(false);
    });
  });
});
