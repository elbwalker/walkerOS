import { z } from 'zod';
import {
  ErrorOutputShape,
  WhoamiOutputShape,
  ProjectOutputShape,
  ListProjectsOutputShape,
  FlowOutputShape,
  ListFlowsOutputShape,
  DeleteOutputShape,
  BundleRemoteOutputShape,
  DeployFlowOutputShape,
  DeploymentOutputShape,
  ListDeploymentsOutputShape,
  CreateDeploymentOutputShape,
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

  describe('DeployFlowOutputShape', () => {
    it('accepts web deploy result', () => {
      const result = parseShape(DeployFlowOutputShape, {
        deploymentId: 'dep_abc',
        type: 'web',
        status: 'published',
      });
      expect(result.success).toBe(true);
    });

    it('accepts server deploy result', () => {
      const result = parseShape(DeployFlowOutputShape, {
        deploymentId: 'dep_xyz',
        type: 'server',
        status: 'deploying',
      });
      expect(result.success).toBe(true);
    });

    it('accepts result with publicUrl and scriptTag', () => {
      const result = parseShape(DeployFlowOutputShape, {
        deploymentId: 'dep_abc',
        type: 'web',
        status: 'published',
        publicUrl: 'https://cdn.example.com/flow.js',
        scriptTag: '<script src="https://cdn.example.com/flow.js"></script>',
      });
      expect(result.success).toBe(true);
    });

    it('accepts result with containerUrl', () => {
      const result = parseShape(DeployFlowOutputShape, {
        deploymentId: 'dep_xyz',
        type: 'server',
        status: 'active',
        containerUrl: 'https://container.example.com',
      });
      expect(result.success).toBe(true);
    });

    it('accepts result with errorMessage', () => {
      const result = parseShape(DeployFlowOutputShape, {
        deploymentId: 'dep_fail',
        type: 'server',
        status: 'failed',
        errorMessage: 'Container failed to start',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing deploymentId', () => {
      const result = parseShape(DeployFlowOutputShape, {
        type: 'web',
        status: 'published',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('DeploymentOutputShape', () => {
    it('accepts full deployment with all fields', () => {
      const result = parseShape(DeploymentOutputShape, {
        id: 'dep_abc',
        slug: 'my-flow-v1',
        flowId: 'cfg_123',
        type: 'web',
        status: 'published',
        publicUrl: 'https://cdn.example.com/flow.js',
        scriptTag: '<script src="https://cdn.example.com/flow.js"></script>',
        containerUrl: null,
        errorMessage: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepts minimal deployment', () => {
      const result = parseShape(DeploymentOutputShape, {
        id: 'dep_xyz',
        slug: 'server-flow',
        flowId: 'cfg_456',
        type: 'server',
        status: 'bundling',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing required fields', () => {
      const result = parseShape(DeploymentOutputShape, {
        id: 'dep_abc',
        slug: 'my-flow',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ListDeploymentsOutputShape', () => {
    it('accepts deployment list', () => {
      const result = parseShape(ListDeploymentsOutputShape, {
        deployments: [
          {
            id: 'dep_abc',
            slug: 'my-flow-v1',
            flowId: 'cfg_123',
            type: 'web',
            status: 'published',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-02-01T00:00:00Z',
          },
        ],
        total: 1,
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty list', () => {
      const result = parseShape(ListDeploymentsOutputShape, {
        deployments: [],
        total: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('CreateDeploymentOutputShape', () => {
    it('accepts with deployToken', () => {
      const result = parseShape(CreateDeploymentOutputShape, {
        id: 'dep_new',
        slug: 'new-deploy',
        type: 'web',
        status: 'bundling',
        deployToken: 'tok_secret123',
      });
      expect(result.success).toBe(true);
    });

    it('accepts without deployToken', () => {
      const result = parseShape(CreateDeploymentOutputShape, {
        id: 'dep_new',
        slug: 'new-deploy',
        type: 'server',
        status: 'bundling',
      });
      expect(result.success).toBe(true);
    });
  });
});
