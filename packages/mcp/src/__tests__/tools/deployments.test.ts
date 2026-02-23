import { registerDeploymentTools } from '../../tools/deployments.js';
import {
  ListDeploymentsOutputShape,
  DeploymentOutputShape,
  CreateDeploymentOutputShape,
  DeleteOutputShape,
} from '../../schemas/output.js';

// Mock @walkeros/cli
jest.mock('@walkeros/cli', () => ({
  listDeployments: jest.fn(),
  getDeploymentBySlug: jest.fn(),
  createDeployment: jest.fn(),
  deleteDeployment: jest.fn(),
}));

import {
  listDeployments,
  getDeploymentBySlug,
  createDeployment,
  deleteDeployment,
} from '@walkeros/cli';

const mockListDeployments = jest.mocked(listDeployments);
const mockGetDeploymentBySlug = jest.mocked(getDeploymentBySlug);
const mockCreateDeployment = jest.mocked(createDeployment);
const mockDeleteDeployment = jest.mocked(deleteDeployment);

function createMockServer() {
  const tools: Record<string, { config: unknown; handler: Function }> = {};
  return {
    registerTool(name: string, config: unknown, handler: Function) {
      tools[name] = { config, handler };
    },
    getTool(name: string) {
      return tools[name];
    },
  };
}

describe('deployment tools', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerDeploymentTools(server as any);
  });

  afterEach(() => jest.clearAllMocks());

  describe('list-deployments', () => {
    it('has outputSchema matching ListDeploymentsOutputShape', () => {
      const tool = server.getTool('list-deployments');
      expect(Object.keys((tool.config as any).outputSchema)).toEqual(
        Object.keys(ListDeploymentsOutputShape),
      );
    });

    it('registers with correct name, title, and annotations', () => {
      const tool = server.getTool('list-deployments');
      expect(tool).toBeDefined();

      const config = tool.config as any;
      expect(config.title).toBe('List Deployments');
      expect(config.annotations).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      });
    });

    it('calls CLI listDeployments with correct args', async () => {
      const mockResult = { deployments: [{ slug: 'abc' }], total: 1 };
      mockListDeployments.mockResolvedValue(mockResult);

      const tool = server.getTool('list-deployments');
      const result = await tool.handler({
        projectId: 'proj_1',
        type: 'web',
        status: 'active',
      });

      expect(mockListDeployments).toHaveBeenCalledWith({
        projectId: 'proj_1',
        type: 'web',
        status: 'active',
      });
      expect(result.structuredContent).toEqual(mockResult);
      expect(JSON.parse(result.content[0].text)).toEqual(mockResult);
    });

    it('returns apiResult on success', async () => {
      const mockResult = { deployments: [], total: 0 };
      mockListDeployments.mockResolvedValue(mockResult);

      const tool = server.getTool('list-deployments');
      const result = await tool.handler({});

      expect(result.structuredContent).toEqual(mockResult);
      expect(result.isError).toBeUndefined();
    });

    it('returns apiError on failure', async () => {
      mockListDeployments.mockRejectedValue(new Error('Unauthorized'));

      const tool = server.getTool('list-deployments');
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unauthorized');
    });

    it('handles non-Error exceptions', async () => {
      mockListDeployments.mockRejectedValue('string error');

      const tool = server.getTool('list-deployments');
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unknown error');
    });

    it('has status input as enum with known deployment statuses', () => {
      const tool = server.getTool('list-deployments');
      const config = tool.config as any;
      const statusSchema = config.inputSchema.status;
      // Unwrap optional wrapper to get inner type
      const inner = statusSchema._def.innerType ?? statusSchema;
      // Zod 4 uses .options array, Zod 3 uses _def.values
      const values = inner.options ?? inner._def.values;
      expect(values).toEqual(
        expect.arrayContaining([
          'bundling',
          'deploying',
          'active',
          'failed',
          'deleted',
          'published',
        ]),
      );
    });
  });

  describe('get-deployment-by-slug', () => {
    it('has outputSchema matching DeploymentOutputShape', () => {
      const tool = server.getTool('get-deployment-by-slug');
      expect(Object.keys((tool.config as any).outputSchema)).toEqual(
        Object.keys(DeploymentOutputShape),
      );
    });

    it('registers with correct name, title, and annotations', () => {
      const tool = server.getTool('get-deployment-by-slug');
      expect(tool).toBeDefined();

      const config = tool.config as any;
      expect(config.title).toBe('Get Deployment');
      expect(config.annotations).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      });
    });

    it('calls CLI getDeploymentBySlug with correct args', async () => {
      const mockResult = { slug: 'my-deploy', type: 'web', status: 'active' };
      mockGetDeploymentBySlug.mockResolvedValue(mockResult);

      const tool = server.getTool('get-deployment-by-slug');
      const result = await tool.handler({
        slug: 'my-deploy',
        projectId: 'proj_1',
      });

      expect(mockGetDeploymentBySlug).toHaveBeenCalledWith({
        slug: 'my-deploy',
        projectId: 'proj_1',
      });
      expect(result.structuredContent).toEqual(mockResult);
      expect(JSON.parse(result.content[0].text)).toEqual(mockResult);
    });

    it('returns apiResult on success', async () => {
      const mockResult = { slug: 'abc', status: 'active' };
      mockGetDeploymentBySlug.mockResolvedValue(mockResult);

      const tool = server.getTool('get-deployment-by-slug');
      const result = await tool.handler({ slug: 'abc' });

      expect(result.structuredContent).toEqual(mockResult);
      expect(result.isError).toBeUndefined();
    });

    it('returns apiError on failure', async () => {
      mockGetDeploymentBySlug.mockRejectedValue(new Error('Not found'));

      const tool = server.getTool('get-deployment-by-slug');
      const result = await tool.handler({ slug: 'missing' });

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Not found');
    });

    it('handles non-Error exceptions', async () => {
      mockGetDeploymentBySlug.mockRejectedValue(42);

      const tool = server.getTool('get-deployment-by-slug');
      const result = await tool.handler({ slug: 'abc' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unknown error');
    });
  });

  describe('create-deployment', () => {
    it('has outputSchema matching CreateDeploymentOutputShape', () => {
      const tool = server.getTool('create-deployment');
      expect(Object.keys((tool.config as any).outputSchema)).toEqual(
        Object.keys(CreateDeploymentOutputShape),
      );
    });

    it('registers with correct name, title, and annotations', () => {
      const tool = server.getTool('create-deployment');
      expect(tool).toBeDefined();

      const config = tool.config as any;
      expect(config.title).toBe('Create Deployment');
      expect(config.annotations).toEqual({
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      });
    });

    it('calls CLI createDeployment with explicit type', async () => {
      const mockResult = { slug: 'new-deploy', type: 'web' };
      mockCreateDeployment.mockResolvedValue(mockResult);

      const tool = server.getTool('create-deployment');
      const result = await tool.handler({
        type: 'web',
        label: 'My Deploy',
        projectId: 'proj_1',
      });

      expect(mockCreateDeployment).toHaveBeenCalledWith({
        type: 'web',
        label: 'My Deploy',
        projectId: 'proj_1',
      });
      expect(result.structuredContent).toEqual(mockResult);
      expect(JSON.parse(result.content[0].text)).toEqual(mockResult);
    });

    it('infers type from flowContent (web)', async () => {
      const mockResult = { slug: 'abc', type: 'web' };
      mockCreateDeployment.mockResolvedValue(mockResult);

      const tool = server.getTool('create-deployment');
      const result = await tool.handler({
        flowContent: { flows: { default: { web: {} } } },
      });

      expect(mockCreateDeployment).toHaveBeenCalledWith({
        type: 'web',
        label: undefined,
        projectId: undefined,
      });
      expect(result.structuredContent).toEqual(mockResult);
    });

    it('infers type from flowContent (server)', async () => {
      const mockResult = { slug: 'abc', type: 'server' };
      mockCreateDeployment.mockResolvedValue(mockResult);

      const tool = server.getTool('create-deployment');
      const result = await tool.handler({
        flowContent: { flows: { default: { server: {} } } },
      });

      expect(mockCreateDeployment).toHaveBeenCalledWith({
        type: 'server',
        label: undefined,
        projectId: undefined,
      });
      expect(result.structuredContent).toEqual(mockResult);
    });

    it('returns error when type cannot be determined', async () => {
      const tool = server.getTool('create-deployment');
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('type required');
    });

    it('returns apiResult on success', async () => {
      const mockResult = { slug: 'abc', type: 'server' };
      mockCreateDeployment.mockResolvedValue(mockResult);

      const tool = server.getTool('create-deployment');
      const result = await tool.handler({ type: 'server' });

      expect(result.structuredContent).toEqual(mockResult);
      expect(result.isError).toBeUndefined();
    });

    it('returns apiError on failure', async () => {
      mockCreateDeployment.mockRejectedValue(new Error('Bad request'));

      const tool = server.getTool('create-deployment');
      const result = await tool.handler({ type: 'web' });

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Bad request');
    });

    it('handles non-Error exceptions', async () => {
      mockCreateDeployment.mockRejectedValue(null);

      const tool = server.getTool('create-deployment');
      const result = await tool.handler({ type: 'web' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unknown error');
    });
  });

  describe('delete-deployment', () => {
    it('should have idempotentHint true', () => {
      const tool = server.getTool('delete-deployment');
      expect((tool.config as any).annotations.idempotentHint).toBe(true);
    });

    it('has outputSchema matching DeleteOutputShape', () => {
      const tool = server.getTool('delete-deployment');
      expect(Object.keys((tool.config as any).outputSchema)).toEqual(
        Object.keys(DeleteOutputShape),
      );
    });

    it('registers with correct name, title, and annotations', () => {
      const tool = server.getTool('delete-deployment');
      expect(tool).toBeDefined();

      const config = tool.config as any;
      expect(config.title).toBe('Delete Deployment');
      expect(config.annotations).toEqual({
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      });
    });

    it('calls CLI deleteDeployment with correct args', async () => {
      const mockResult = { success: true };
      mockDeleteDeployment.mockResolvedValue(mockResult);

      const tool = server.getTool('delete-deployment');
      const result = await tool.handler({
        slug: 'my-deploy',
        projectId: 'proj_1',
      });

      expect(mockDeleteDeployment).toHaveBeenCalledWith({
        slug: 'my-deploy',
        projectId: 'proj_1',
      });
      expect(result.structuredContent).toEqual(mockResult);
      expect(JSON.parse(result.content[0].text)).toEqual(mockResult);
    });

    it('returns apiResult on success', async () => {
      const mockResult = { success: true };
      mockDeleteDeployment.mockResolvedValue(mockResult);

      const tool = server.getTool('delete-deployment');
      const result = await tool.handler({ slug: 'abc' });

      expect(result.structuredContent).toEqual(mockResult);
      expect(result.isError).toBeUndefined();
    });

    it('returns apiError on failure', async () => {
      mockDeleteDeployment.mockRejectedValue(new Error('Not found'));

      const tool = server.getTool('delete-deployment');
      const result = await tool.handler({ slug: 'missing' });

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Not found');
    });

    it('handles non-Error exceptions', async () => {
      mockDeleteDeployment.mockRejectedValue({ code: 500 });

      const tool = server.getTool('delete-deployment');
      const result = await tool.handler({ slug: 'abc' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unknown error');
    });
  });
});
