import { z } from 'zod';
import {
  ErrorOutputShape,
  ValidateOutputShape,
  BundleOutputShape,
  SimulateOutputShape,
  WhoamiOutputShape,
  ProjectOutputShape,
  ListProjectsOutputShape,
  FlowOutputShape,
  ListFlowsOutputShape,
  DeleteOutputShape,
  BundleRemoteOutputShape,
} from '../../schemas/output.js';

/**
 * Helper: given a shape (Record<string, ZodType>), build a z.object()
 * and parse `data` through it. Returns the Zod parse result.
 */
function parseShape(shape: Record<string, z.ZodType>, data: unknown) {
  return z.object(shape).safeParse(data);
}

describe('output schemas', () => {
  describe('ErrorOutputShape', () => {
    it('accepts a valid error', () => {
      const result = parseShape(ErrorOutputShape, {
        error: 'Something went wrong',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing error', () => {
      const result = parseShape(ErrorOutputShape, {});
      expect(result.success).toBe(false);
    });
  });

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
      const result = parseShape(SimulateOutputShape, { success: true });
      expect(result.success).toBe(true);
    });

    it('accepts full result with all optional fields', () => {
      const result = parseShape(SimulateOutputShape, {
        success: true,
        collector: { events: [] },
        elbResult: { ok: true },
        logs: [{ level: 'info', msg: 'processed' }],
        usage: { ga4: [{ method: 'POST' }] },
        duration: 42,
      });
      expect(result.success).toBe(true);
    });

    it('accepts failure result with error', () => {
      const result = parseShape(SimulateOutputShape, {
        success: false,
        error: 'Config not found',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('WhoamiOutputShape', () => {
    it('accepts valid whoami result', () => {
      const result = parseShape(WhoamiOutputShape, {
        userId: 'usr_123',
        email: 'test@example.com',
        projectId: 'proj_456',
      });
      expect(result.success).toBe(true);
    });

    it('accepts null projectId', () => {
      const result = parseShape(WhoamiOutputShape, {
        userId: 'usr_123',
        email: 'test@example.com',
        projectId: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ProjectOutputShape', () => {
    it('accepts valid project', () => {
      const result = parseShape(ProjectOutputShape, {
        id: 'proj_abc',
        name: 'My Project',
        role: 'owner',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
      const result = parseShape(ProjectOutputShape, {
        id: 'proj_abc',
        name: 'My Project',
        role: 'admin',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ListProjectsOutputShape', () => {
    it('accepts valid project list', () => {
      const result = parseShape(ListProjectsOutputShape, {
        projects: [
          {
            id: 'proj_1',
            name: 'Project 1',
            role: 'owner',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-02-01T00:00:00Z',
          },
        ],
        total: 1,
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty project list', () => {
      const result = parseShape(ListProjectsOutputShape, {
        projects: [],
        total: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('FlowOutputShape', () => {
    it('accepts valid flow', () => {
      const result = parseShape(FlowOutputShape, {
        id: 'cfg_abc',
        name: 'My Flow',
        content: { version: 1 },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepts flow with deletedAt', () => {
      const result = parseShape(FlowOutputShape, {
        id: 'cfg_abc',
        name: 'My Flow',
        content: { version: 1 },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
        deletedAt: '2026-03-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepts flow with null deletedAt', () => {
      const result = parseShape(FlowOutputShape, {
        id: 'cfg_abc',
        name: 'My Flow',
        content: { version: 1 },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
        deletedAt: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ListFlowsOutputShape', () => {
    it('accepts valid flow list', () => {
      const result = parseShape(ListFlowsOutputShape, {
        flows: [
          {
            id: 'cfg_1',
            name: 'Flow 1',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-02-01T00:00:00Z',
            deletedAt: null,
          },
        ],
        total: 1,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('DeleteOutputShape', () => {
    it('accepts success: true', () => {
      const result = parseShape(DeleteOutputShape, { success: true });
      expect(result.success).toBe(true);
    });

    it('rejects success: false', () => {
      const result = parseShape(DeleteOutputShape, { success: false });
      expect(result.success).toBe(false);
    });
  });

  describe('BundleRemoteOutputShape', () => {
    it('accepts valid bundle remote result', () => {
      const result = parseShape(BundleRemoteOutputShape, {
        success: true,
        bundle: 'export default {};',
        size: 18,
      });
      expect(result.success).toBe(true);
    });

    it('accepts result with stats', () => {
      const result = parseShape(BundleRemoteOutputShape, {
        success: true,
        bundle: 'export default {};',
        size: 18,
        stats: { buildTime: 100, modules: 3 },
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing required fields', () => {
      const result = parseShape(BundleRemoteOutputShape, { success: true });
      expect(result.success).toBe(false);
    });
  });
});
