import { registerDeployTools } from '../../tools/deploy.js';

// Mock @walkeros/cli
jest.mock('@walkeros/cli', () => ({
  deploy: jest.fn(),
  getDeployment: jest.fn(),
}));

import { deploy, getDeployment } from '@walkeros/cli';
const mockDeploy = jest.mocked(deploy);
const mockGetDeployment = jest.mocked(getDeployment);

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

describe('deploy tools', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerDeployTools(server as any);
  });

  afterEach(() => jest.clearAllMocks());

  describe('deploy-flow', () => {
    it('registers with correct name, title, and annotations', () => {
      const tool = server.getTool('deploy-flow');
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

    it('calls CLI deploy with onStatus and signal', async () => {
      const mockResult = {
        deploymentId: 'dep_1',
        status: 'published',
        publicUrl: 'https://cdn.example.com/walker.js',
      };
      mockDeploy.mockResolvedValue(mockResult);

      const extra = createMockExtra({ progressToken: 'tok_1' });
      const tool = server.getTool('deploy-flow');
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
      const tool = server.getTool('deploy-flow');
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
      const tool = server.getTool('deploy-flow');
      await tool.handler({ flowId: 'flow_1', wait: true }, extra);

      expect(extra.sendNotification).not.toHaveBeenCalled();
    });

    it('passes undefined for optional params when not provided', async () => {
      mockDeploy.mockResolvedValue({
        deploymentId: 'dep_2',
        status: 'bundling',
      });

      const extra = createMockExtra();
      const tool = server.getTool('deploy-flow');
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
      const tool = server.getTool('deploy-flow');
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
      const tool = server.getTool('deploy-flow');
      const result = await tool.handler(
        { flowId: 'flow_1', wait: true },
        extra,
      );

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unknown error');
    });
  });

  describe('get-deployment', () => {
    it('registers with correct name, title, and annotations', () => {
      const tool = server.getTool('get-deployment');
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

    it('calls CLI getDeployment with correct options', async () => {
      const mockResult = {
        id: 'dep_1',
        status: 'active',
        type: 'server',
        containerUrl: 'https://flow.functions.fnc.fr-par.scw.cloud',
      };
      mockGetDeployment.mockResolvedValue(mockResult);

      const tool = server.getTool('get-deployment');
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

    it('passes undefined for optional params when not provided', async () => {
      mockGetDeployment.mockResolvedValue({ id: 'dep_1', status: 'published' });

      const tool = server.getTool('get-deployment');
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

    it('returns isError on CLI failure', async () => {
      mockGetDeployment.mockRejectedValue(new Error('Not found'));

      const tool = server.getTool('get-deployment');
      const result = await tool.handler({
        flowId: 'flow_1',
      });

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Not found');
    });

    it('handles non-Error exceptions', async () => {
      mockGetDeployment.mockRejectedValue(42);

      const tool = server.getTool('get-deployment');
      const result = await tool.handler({
        flowId: 'flow_1',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unknown error');
    });
  });
});
