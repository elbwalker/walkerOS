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
    it('accepts full project with all fields', () => {
      const result = parseShape(ProjectOutputShape, {
        id: 'proj_abc',
        name: 'My Project',
        role: 'owner',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepts POST /projects response (id, name, createdAt only)', () => {
      const result = parseShape(ProjectOutputShape, {
        id: 'proj_abc',
        name: 'My Project',
        createdAt: '2026-01-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepts GET /projects/{id} response (id, name, role only)', () => {
      const result = parseShape(ProjectOutputShape, {
        id: 'proj_abc',
        name: 'My Project',
        role: 'member',
      });
      expect(result.success).toBe(true);
    });

    it('accepts PATCH /projects/{id} response (id, name, updatedAt only)', () => {
      const result = parseShape(ProjectOutputShape, {
        id: 'proj_abc',
        name: 'My Project',
        updatedAt: '2026-02-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepts all app role values', () => {
      for (const role of ['owner', 'admin', 'member', 'deployer', 'viewer']) {
        const result = parseShape(ProjectOutputShape, {
          id: 'proj_abc',
          name: 'My Project',
          role,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid role', () => {
      const result = parseShape(ProjectOutputShape, {
        id: 'proj_abc',
        name: 'My Project',
        role: 'superadmin',
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

    it('requires role in list items', () => {
      const result = parseShape(ListProjectsOutputShape, {
        projects: [
          {
            id: 'proj_1',
            name: 'Project 1',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-02-01T00:00:00Z',
          },
        ],
        total: 1,
      });
      expect(result.success).toBe(false);
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
    it('accepts minimal deploy result', () => {
      const result = parseShape(DeployFlowOutputShape, {
        deploymentId: 'dep_abc',
        type: 'web',
        status: 'deploying',
      });
      expect(result.success).toBe(true);
    });

    it('accepts deploy result with slug and target', () => {
      const result = parseShape(DeployFlowOutputShape, {
        deploymentId: 'dep_abc',
        type: 'web',
        status: 'deploying',
        slug: 'k7x9m2p3q4r5',
        target: 'https://cdn.example.com/k7x9m2p3q4r5',
      });
      expect(result.success).toBe(true);
    });

    it('accepts deploy result with configId', () => {
      const result = parseShape(DeployFlowOutputShape, {
        deploymentId: 'dep_abc',
        type: 'server',
        status: 'deploying',
        slug: 'k7x9m2p3q4r5',
        configId: 'cfg_flow1',
      });
      expect(result.success).toBe(true);
    });

    it('accepts completed deploy with SSE result merged', () => {
      const result = parseShape(DeployFlowOutputShape, {
        deploymentId: 'dep_abc',
        type: 'web',
        status: 'published',
        slug: 'k7x9m2p3q4r5',
        target: 'https://cdn.example.com/k7x9m2p3q4r5',
        publicUrl: 'https://cdn.example.com/flow.js',
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
    it('accepts deployment with new API shape', () => {
      const result = parseShape(DeploymentOutputShape, {
        id: 'dep_abc',
        slug: 'k7x9m2p3q4r5',
        type: 'web',
        status: 'published',
        target: 'https://cdn.example.com/k7x9m2p3q4r5',
        label: 'Production',
        origin: 'cloud',
        url: 'https://cdn.example.com/k7x9m2p3q4r5',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepts legacy deploy response with flowId', () => {
      const result = parseShape(DeploymentOutputShape, {
        id: 'dep_abc',
        slug: 'k7x9m2p3q4r5',
        type: 'server',
        status: 'active',
        target: 'https://container.example.com',
        flowId: 'flow_123',
        containerUrl: 'https://container.example.com',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepts minimal deployment', () => {
      const result = parseShape(DeploymentOutputShape, {
        id: 'dep_xyz',
        slug: 'k7x9m2p3q4r5',
        type: 'server',
        status: 'idle',
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
    it('accepts deployment list with new shape', () => {
      const result = parseShape(ListDeploymentsOutputShape, {
        deployments: [
          {
            id: 'dep_abc',
            slug: 'k7x9m2p3q4r5',
            type: 'web',
            status: 'published',
            target: 'https://cdn.example.com/k7x9m2p3q4r5',
            label: 'Prod',
            origin: 'cloud',
            url: 'https://cdn.example.com/k7x9m2p3q4r5',
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
    it('accepts new API response shape', () => {
      const result = parseShape(CreateDeploymentOutputShape, {
        id: 'dep_new',
        slug: 'k7x9m2p3q4r5',
        type: 'web',
        status: 'idle',
        target: 'https://cdn.example.com/k7x9m2p3q4r5',
        label: null,
        origin: 'cloud',
        url: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepts minimal response', () => {
      const result = parseShape(CreateDeploymentOutputShape, {
        id: 'dep_new',
        slug: 'k7x9m2p3q4r5',
        type: 'server',
        status: 'idle',
      });
      expect(result.success).toBe(true);
    });
  });
});
