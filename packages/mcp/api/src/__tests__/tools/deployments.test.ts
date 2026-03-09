import { registerDeploymentTools } from '../../tools/deployments.js';
import {
  DeployFlowOutputShape,
  DeploymentOutputShape,
  ListDeploymentsOutputShape,
  CreateDeploymentOutputShape,
  DeleteOutputShape,
} from '../../schemas/output.js';

// Mock @walkeros/cli
jest.mock('@walkeros/cli', () => ({
  deploy: jest.fn(),
  getDeployment: jest.fn(),
  listDeployments: jest.fn(),
  getDeploymentBySlug: jest.fn(),
  createDeployment: jest.fn(),
  deleteDeployment: jest.fn(),
}));

import {
  deploy,
  getDeployment,
  listDeployments,
  getDeploymentBySlug,
  createDeployment,
  deleteDeployment,
} from '@walkeros/cli';

const mockDeploy = jest.mocked(deploy);
const mockGetDeployment = jest.mocked(getDeployment);
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

function createMockExtra(options?: { progressToken?: string | number }) {
  return {
    _meta: options?.progressToken
      ? { progressToken: options.progressToken }
      : undefined,
    sendNotification: jest.fn(),
    signal: new AbortController().signal,
  };
}

describe('deployment tools', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerDeploymentTools(server as any);
  });

  afterEach(() => jest.clearAllMocks());

  // --- deploy-flow ---
  describe('deploy_flow', () => {
    it('registers with correct name, title, and annotations', () => {
      const tool = server.getTool('deploy_flow');
      expect(tool).toBeDefined();

      const config = tool.config as any;
      expect(config.title).toBe('Deploy Flow');
      expect(config.annotations).toEqual({
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      });
    });

    it('has outputSchema matching DeployFlowOutputShape', () => {
      const tool = server.getTool('deploy_flow');
      const config = tool.config as any;
      expect(Object.keys(config.outputSchema)).toEqual(
        Object.keys(DeployFlowOutputShape),
      );
    });

    it('calls CLI deploy with onStatus and signal', async () => {
      const mockResult = {
        deploymentId: 'dep_1',
        status: 'published',
        publicUrl: 'https://cdn.example.com/walker.js',
      };
      mockDeploy.mockResolvedValue(mockResult);

      const extra = createMockExtra({ progressToken: 'tok_1' });
      const tool = server.getTool('deploy_flow');
      const result = await tool.handler(
        { flowId: 'flow_1', projectId: 'proj_1', wait: true, flowName: 'web' },
        extra,
      );

      expect(mockDeploy).toHaveBeenCalledWith(
        expect.objectContaining({
          flowId: 'flow_1',
          projectId: 'proj_1',
          wait: true,
          flowName: 'web',
          signal: extra.signal,
        }),
      );
      // onStatus should be a function
      const callArgs = mockDeploy.mock.calls[0]![0];
      expect(typeof callArgs.onStatus).toBe('function');

      expect(result.structuredContent).toEqual(mockResult);
      expect(JSON.parse(result.content[0].text)).toEqual(mockResult);
    });

    it('sends progress notifications when progressToken provided', async () => {
      mockDeploy.mockImplementation(async (opts) => {
        // Simulate status callbacks
        opts.onStatus?.('bundling', 'building');
        opts.onStatus?.('published', null);
        return { status: 'published' };
      });

      const extra = createMockExtra({ progressToken: 'tok_progress' });
      const tool = server.getTool('deploy_flow');
      await tool.handler({ flowId: 'flow_1', wait: true }, extra);

      expect(extra.sendNotification).toHaveBeenCalledTimes(2);
      expect(extra.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'notifications/progress',
          params: expect.objectContaining({
            progressToken: 'tok_progress',
            progress: 20,
            total: 100,
            message: 'Building bundle...',
          }),
        }),
      );
      expect(extra.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'notifications/progress',
          params: expect.objectContaining({
            progressToken: 'tok_progress',
            progress: 100,
            total: 100,
            message: 'Published',
          }),
        }),
      );
    });

    it('skips progress notifications when no progressToken', async () => {
      mockDeploy.mockImplementation(async (opts) => {
        opts.onStatus?.('bundling', 'building');
        return { status: 'bundling' };
      });

      const extra = createMockExtra(); // no progressToken
      const tool = server.getTool('deploy_flow');
      await tool.handler({ flowId: 'flow_1', wait: true }, extra);

      expect(extra.sendNotification).not.toHaveBeenCalled();
    });

    it('passes undefined for optional params when not provided', async () => {
      mockDeploy.mockResolvedValue({
        deploymentId: 'dep_2',
        status: 'bundling',
      });

      const extra = createMockExtra();
      const tool = server.getTool('deploy_flow');
      await tool.handler(
        {
          flowId: 'flow_1',
          projectId: undefined,
          wait: undefined,
          flowName: undefined,
        },
        extra,
      );

      expect(mockDeploy).toHaveBeenCalledWith(
        expect.objectContaining({
          flowId: 'flow_1',
          projectId: undefined,
          wait: undefined,
          flowName: undefined,
        }),
      );
    });

    it('returns isError on CLI failure', async () => {
      mockDeploy.mockRejectedValue(new Error('Deploy failed'));

      const extra = createMockExtra();
      const tool = server.getTool('deploy_flow');
      const result = await tool.handler(
        { flowId: 'flow_1', wait: true },
        extra,
      );

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Deploy failed');
    });

    it('handles non-Error exceptions', async () => {
      mockDeploy.mockRejectedValue('string error');

      const extra = createMockExtra();
      const tool = server.getTool('deploy_flow');
      const result = await tool.handler(
        { flowId: 'flow_1', wait: true },
        extra,
      );

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unknown error');
    });
  });

  // --- get-deployment (unified) ---
  describe('deployment_get', () => {
    it('registers with correct name, title, and annotations', () => {
      const tool = server.getTool('deployment_get');
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

    it('has outputSchema matching DeploymentOutputShape', () => {
      const tool = server.getTool('deployment_get');
      const config = tool.config as any;
      expect(Object.keys(config.outputSchema)).toEqual(
        Object.keys(DeploymentOutputShape),
      );
    });

    it('calls CLI getDeployment when flowId provided', async () => {
      const mockResult = {
        id: 'dep_1',
        status: 'active',
        type: 'server',
        containerUrl: 'https://flow.functions.fnc.fr-par.scw.cloud',
      };
      mockGetDeployment.mockResolvedValue(mockResult);

      const tool = server.getTool('deployment_get');
      const result = await tool.handler({
        flowId: 'flow_1',
        projectId: 'proj_1',
        flowName: 'api',
      });

      expect(mockGetDeployment).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: 'proj_1',
        flowName: 'api',
      });
      expect(result.structuredContent).toEqual(mockResult);
      expect(JSON.parse(result.content[0].text)).toEqual(mockResult);
    });

    it('calls CLI getDeploymentBySlug when slug provided', async () => {
      const mockResult = { slug: 'my-deploy', type: 'web', status: 'active' };
      mockGetDeploymentBySlug.mockResolvedValue(mockResult);

      const tool = server.getTool('deployment_get');
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

    it('returns error when neither flowId nor slug provided', async () => {
      const tool = server.getTool('deployment_get');
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Provide either flowId or slug');
    });

    it('returns error when both flowId and slug provided', async () => {
      const tool = server.getTool('deployment_get');
      const result = await tool.handler({
        flowId: 'flow_1',
        slug: 'my-deploy',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Provide either flowId or slug, not both');
    });

    it('passes undefined for optional params when not provided', async () => {
      mockGetDeployment.mockResolvedValue({ id: 'dep_1', status: 'published' });

      const tool = server.getTool('deployment_get');
      await tool.handler({
        flowId: 'flow_1',
        projectId: undefined,
        flowName: undefined,
      });

      expect(mockGetDeployment).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: undefined,
        flowName: undefined,
      });
    });

    it('returns isError on CLI failure (flowId path)', async () => {
      mockGetDeployment.mockRejectedValue(new Error('Not found'));

      const tool = server.getTool('deployment_get');
      const result = await tool.handler({
        flowId: 'flow_1',
      });

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Not found');
    });

    it('returns isError on CLI failure (slug path)', async () => {
      mockGetDeploymentBySlug.mockRejectedValue(new Error('Not found'));

      const tool = server.getTool('deployment_get');
      const result = await tool.handler({ slug: 'missing' });

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Not found');
    });

    it('handles non-Error exceptions', async () => {
      mockGetDeployment.mockRejectedValue(42);

      const tool = server.getTool('deployment_get');
      const result = await tool.handler({
        flowId: 'flow_1',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unknown error');
    });
  });

  // --- list-deployments ---
  describe('deployment_list', () => {
    it('has outputSchema matching ListDeploymentsOutputShape', () => {
      const tool = server.getTool('deployment_list');
      expect(Object.keys((tool.config as any).outputSchema)).toEqual(
        Object.keys(ListDeploymentsOutputShape),
      );
    });

    it('registers with correct name, title, and annotations', () => {
      const tool = server.getTool('deployment_list');
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

      const tool = server.getTool('deployment_list');
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

      const tool = server.getTool('deployment_list');
      const result = await tool.handler({});

      expect(result.structuredContent).toEqual(mockResult);
      expect(result.isError).toBeUndefined();
    });

    it('returns apiError on failure', async () => {
      mockListDeployments.mockRejectedValue(new Error('Unauthorized'));

      const tool = server.getTool('deployment_list');
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unauthorized');
    });

    it('handles non-Error exceptions', async () => {
      mockListDeployments.mockRejectedValue('string error');

      const tool = server.getTool('deployment_list');
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unknown error');
    });

    it('has status input as enum with known deployment statuses', () => {
      const tool = server.getTool('deployment_list');
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

  // --- create-deployment ---
  describe('deployment_create', () => {
    it('has outputSchema matching CreateDeploymentOutputShape', () => {
      const tool = server.getTool('deployment_create');
      expect(Object.keys((tool.config as any).outputSchema)).toEqual(
        Object.keys(CreateDeploymentOutputShape),
      );
    });

    it('registers with correct name, title, and annotations', () => {
      const tool = server.getTool('deployment_create');
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

      const tool = server.getTool('deployment_create');
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

    it('infers type from flowConfig (web)', async () => {
      const mockResult = { slug: 'abc', type: 'web' };
      mockCreateDeployment.mockResolvedValue(mockResult);

      const tool = server.getTool('deployment_create');
      const result = await tool.handler({
        flowConfig: { flows: { default: { web: {} } } },
      });

      expect(mockCreateDeployment).toHaveBeenCalledWith({
        type: 'web',
        label: undefined,
        projectId: undefined,
      });
      expect(result.structuredContent).toEqual(mockResult);
    });

    it('infers type from flowConfig (server)', async () => {
      const mockResult = { slug: 'abc', type: 'server' };
      mockCreateDeployment.mockResolvedValue(mockResult);

      const tool = server.getTool('deployment_create');
      const result = await tool.handler({
        flowConfig: { flows: { default: { server: {} } } },
      });

      expect(mockCreateDeployment).toHaveBeenCalledWith({
        type: 'server',
        label: undefined,
        projectId: undefined,
      });
      expect(result.structuredContent).toEqual(mockResult);
    });

    it('returns error when type cannot be determined', async () => {
      const tool = server.getTool('deployment_create');
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('type required');
    });

    it('returns apiResult on success', async () => {
      const mockResult = { slug: 'abc', type: 'server' };
      mockCreateDeployment.mockResolvedValue(mockResult);

      const tool = server.getTool('deployment_create');
      const result = await tool.handler({ type: 'server' });

      expect(result.structuredContent).toEqual(mockResult);
      expect(result.isError).toBeUndefined();
    });

    it('returns apiError on failure', async () => {
      mockCreateDeployment.mockRejectedValue(new Error('Bad request'));

      const tool = server.getTool('deployment_create');
      const result = await tool.handler({ type: 'web' });

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Bad request');
    });

    it('handles non-Error exceptions', async () => {
      mockCreateDeployment.mockRejectedValue(null);

      const tool = server.getTool('deployment_create');
      const result = await tool.handler({ type: 'web' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unknown error');
    });
  });

  // --- delete-deployment ---
  describe('deployment_delete', () => {
    it('should have idempotentHint true', () => {
      const tool = server.getTool('deployment_delete');
      expect((tool.config as any).annotations.idempotentHint).toBe(true);
    });

    it('has outputSchema matching DeleteOutputShape', () => {
      const tool = server.getTool('deployment_delete');
      expect(Object.keys((tool.config as any).outputSchema)).toEqual(
        Object.keys(DeleteOutputShape),
      );
    });

    it('registers with correct name, title, and annotations', () => {
      const tool = server.getTool('deployment_delete');
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

      const tool = server.getTool('deployment_delete');
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

      const tool = server.getTool('deployment_delete');
      const result = await tool.handler({ slug: 'abc' });

      expect(result.structuredContent).toEqual(mockResult);
      expect(result.isError).toBeUndefined();
    });

    it('returns apiError on failure', async () => {
      mockDeleteDeployment.mockRejectedValue(new Error('Not found'));

      const tool = server.getTool('deployment_delete');
      const result = await tool.handler({ slug: 'missing' });

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Not found');
    });

    it('handles non-Error exceptions', async () => {
      mockDeleteDeployment.mockRejectedValue({ code: 500 });

      const tool = server.getTool('deployment_delete');
      const result = await tool.handler({ slug: 'abc' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unknown error');
    });
  });
});
