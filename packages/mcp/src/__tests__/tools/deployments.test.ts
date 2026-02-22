import { registerDeploymentTools } from '../../tools/deployments.js';

// Mock @walkeros/cli
jest.mock('@walkeros/cli', () => ({
  listDeployments: jest.fn(),
  getDeploymentBySlug: jest.fn(),
  createDeployment: jest.fn(),
  updateDeployment: jest.fn(),
  deleteDeployment: jest.fn(),
  publish: jest.fn(),
}));

import {
  listDeployments,
  getDeploymentBySlug,
  createDeployment,
  updateDeployment,
  deleteDeployment,
  publish,
} from '@walkeros/cli';

const mockListDeployments = jest.mocked(listDeployments);
const mockGetDeploymentBySlug = jest.mocked(getDeploymentBySlug);
const mockCreateDeployment = jest.mocked(createDeployment);
const mockUpdateDeployment = jest.mocked(updateDeployment);
const mockDeleteDeployment = jest.mocked(deleteDeployment);
const mockPublish = jest.mocked(publish);

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

  describe('list-deployments', () => {
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
  });

  describe('get-deployment-by-slug', () => {
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

    it('calls CLI createDeployment with correct args', async () => {
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

  describe('update-deployment', () => {
    it('registers with correct name, title, and annotations', () => {
      const tool = server.getTool('update-deployment');
      expect(tool).toBeDefined();

      const config = tool.config as any;
      expect(config.title).toBe('Update Deployment');
      expect(config.annotations).toEqual({
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      });
    });

    it('calls CLI updateDeployment with correct args', async () => {
      const mockResult = { slug: 'my-deploy', label: 'Updated' };
      mockUpdateDeployment.mockResolvedValue(mockResult);

      const tool = server.getTool('update-deployment');
      const result = await tool.handler({
        slug: 'my-deploy',
        label: 'Updated',
        projectId: 'proj_1',
      });

      expect(mockUpdateDeployment).toHaveBeenCalledWith({
        slug: 'my-deploy',
        label: 'Updated',
        projectId: 'proj_1',
      });
      expect(result.structuredContent).toEqual(mockResult);
      expect(JSON.parse(result.content[0].text)).toEqual(mockResult);
    });

    it('returns apiResult on success', async () => {
      const mockResult = { slug: 'abc', label: 'New Label' };
      mockUpdateDeployment.mockResolvedValue(mockResult);

      const tool = server.getTool('update-deployment');
      const result = await tool.handler({ slug: 'abc', label: 'New Label' });

      expect(result.structuredContent).toEqual(mockResult);
      expect(result.isError).toBeUndefined();
    });

    it('returns apiError on failure', async () => {
      mockUpdateDeployment.mockRejectedValue(new Error('Forbidden'));

      const tool = server.getTool('update-deployment');
      const result = await tool.handler({ slug: 'abc', label: 'x' });

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Forbidden');
    });

    it('handles non-Error exceptions', async () => {
      mockUpdateDeployment.mockRejectedValue(undefined);

      const tool = server.getTool('update-deployment');
      const result = await tool.handler({ slug: 'abc' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unknown error');
    });
  });

  describe('delete-deployment', () => {
    it('registers with correct name, title, and annotations', () => {
      const tool = server.getTool('delete-deployment');
      expect(tool).toBeDefined();

      const config = tool.config as any;
      expect(config.title).toBe('Delete Deployment');
      expect(config.annotations).toEqual({
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
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

  describe('publish', () => {
    it('registers with correct name, title, and annotations', () => {
      const tool = server.getTool('publish');
      expect(tool).toBeDefined();

      const config = tool.config as any;
      expect(config.title).toBe('Publish');
      expect(config.annotations).toEqual({
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      });
    });

    it('calls CLI publish with correct args', async () => {
      const mockResult = {
        status: 'published',
        publicUrl: 'https://cdn.example.com/walker.js',
      };
      mockPublish.mockResolvedValue(mockResult);

      const extra = createMockExtra();
      const tool = server.getTool('publish');
      const result = await tool.handler(
        {
          deployment: 'my-deploy',
          configPath: '/path/to/flow.json',
          flowName: 'web',
          projectId: 'proj_1',
          wait: true,
        },
        extra,
      );

      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          deployment: 'my-deploy',
          config: '/path/to/flow.json',
          flowName: 'web',
          projectId: 'proj_1',
          wait: true,
          signal: extra.signal,
        }),
      );
      // onStatus should be a function
      const callArgs = mockPublish.mock.calls[0]![0];
      expect(typeof callArgs.onStatus).toBe('function');

      expect(result.structuredContent).toEqual(mockResult);
      expect(JSON.parse(result.content[0].text)).toEqual(mockResult);
    });

    it('returns apiResult on success', async () => {
      const mockResult = { status: 'published' };
      mockPublish.mockResolvedValue(mockResult);

      const extra = createMockExtra();
      const tool = server.getTool('publish');
      const result = await tool.handler(
        { deployment: 'abc', configPath: '/flow.json', wait: true },
        extra,
      );

      expect(result.structuredContent).toEqual(mockResult);
      expect(result.isError).toBeUndefined();
    });

    it('returns apiError on failure', async () => {
      mockPublish.mockRejectedValue(new Error('Publish failed'));

      const extra = createMockExtra();
      const tool = server.getTool('publish');
      const result = await tool.handler(
        { deployment: 'abc', configPath: '/flow.json', wait: true },
        extra,
      );

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Publish failed');
    });

    it('handles non-Error exceptions', async () => {
      mockPublish.mockRejectedValue('string error');

      const extra = createMockExtra();
      const tool = server.getTool('publish');
      const result = await tool.handler(
        { deployment: 'abc', configPath: '/flow.json', wait: true },
        extra,
      );

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unknown error');
    });

    it('sends progress notifications when progressToken provided', async () => {
      mockPublish.mockImplementation(async (opts: any) => {
        // Simulate status callbacks
        opts.onStatus?.('bundling', 'building');
        opts.onStatus?.('published', null);
        return { status: 'published' };
      });

      const extra = createMockExtra({ progressToken: 'tok_progress' });
      const tool = server.getTool('publish');
      await tool.handler(
        { deployment: 'abc', configPath: '/flow.json', wait: true },
        extra,
      );

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
      mockPublish.mockImplementation(async (opts: any) => {
        opts.onStatus?.('bundling', 'building');
        return { status: 'bundling' };
      });

      const extra = createMockExtra(); // no progressToken
      const tool = server.getTool('publish');
      await tool.handler(
        { deployment: 'abc', configPath: '/flow.json', wait: true },
        extra,
      );

      expect(extra.sendNotification).not.toHaveBeenCalled();
    });

    it('passes signal through', async () => {
      mockPublish.mockResolvedValue({ status: 'published' });

      const extra = createMockExtra();
      const tool = server.getTool('publish');
      await tool.handler(
        { deployment: 'abc', configPath: '/flow.json', wait: true },
        extra,
      );

      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: extra.signal,
        }),
      );
    });
  });
});
