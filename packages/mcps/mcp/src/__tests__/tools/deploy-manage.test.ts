import { registerDeployTool } from '../../tools/deploy-manage.js';

jest.mock('@walkeros/cli', () => ({
  deploy: jest.fn(),
  listDeployments: jest.fn(),
  getDeployment: jest.fn(),
  getDeploymentBySlug: jest.fn(),
  deleteDeployment: jest.fn(),
}));

jest.mock('@walkeros/core', () => ({
  mcpResult: jest.fn((result, hints) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          hints ? { ...result, _hints: hints } : result,
          null,
          2,
        ),
      },
    ],
    structuredContent: hints ? { ...result, _hints: hints } : result,
  })),
  mcpError: jest.fn((error, hint) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          ...(hint ? { hint } : {}),
        }),
      },
    ],
    isError: true,
  })),
}));

import {
  deploy as deployFlow,
  listDeployments,
  getDeployment,
  getDeploymentBySlug,
  deleteDeployment,
} from '@walkeros/cli';

const mockDeployFlow = jest.mocked(deployFlow);
const mockListDeployments = jest.mocked(listDeployments);
const mockGetDeployment = jest.mocked(getDeployment);
const mockGetDeploymentBySlug = jest.mocked(getDeploymentBySlug);
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

describe('deploy tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerDeployTool(server as any);
  });

  it('registers with name "deploy" and correct annotations', () => {
    const tool = server.getTool('deploy');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  describe('deploy', () => {
    it('requires flowId', async () => {
      const tool = server.getTool('deploy');
      const result = await tool.handler({ action: 'deploy' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('flowId is required');
    });

    it('calls deployFlow with correct options', async () => {
      const deployed = { status: 'deployed', url: 'https://example.com' };
      mockDeployFlow.mockResolvedValue(deployed);

      const tool = server.getTool('deploy');
      const result = await tool.handler({
        action: 'deploy',
        flowId: 'flow_1',
        flowName: 'my-flow',
      });

      expect(mockDeployFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        wait: true,
        flowName: 'my-flow',
      });
      expect(result.structuredContent.status).toBe('deployed');
    });

    it('defaults wait to true', async () => {
      mockDeployFlow.mockResolvedValue({ status: 'deployed' });

      const tool = server.getTool('deploy');
      await tool.handler({ action: 'deploy', flowId: 'flow_1' });

      expect(mockDeployFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        wait: true,
        flowName: undefined,
      });
    });

    it('respects wait: false', async () => {
      mockDeployFlow.mockResolvedValue({ status: 'pending' });

      const tool = server.getTool('deploy');
      await tool.handler({
        action: 'deploy',
        flowId: 'flow_1',
        wait: false,
      });

      expect(mockDeployFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        wait: false,
        flowName: undefined,
      });
    });
  });

  describe('list', () => {
    it('calls listDeployments with filters', async () => {
      const deployments = [
        { id: 'dep_1', type: 'web', status: 'active' },
        { id: 'dep_2', type: 'server', status: 'active' },
      ];
      mockListDeployments.mockResolvedValue(deployments);

      const tool = server.getTool('deploy');
      const result = await tool.handler({
        action: 'list',
        projectId: 'proj_1',
        type: 'web',
        status: 'active',
      });

      expect(mockListDeployments).toHaveBeenCalledWith({
        projectId: 'proj_1',
        type: 'web',
        status: 'active',
      });
      expect(result.structuredContent).toEqual(deployments);
    });

    it('calls listDeployments without filters', async () => {
      mockListDeployments.mockResolvedValue([]);

      const tool = server.getTool('deploy');
      await tool.handler({ action: 'list' });

      expect(mockListDeployments).toHaveBeenCalledWith({
        projectId: undefined,
        type: undefined,
        status: undefined,
      });
    });
  });

  describe('get', () => {
    it('requires id', async () => {
      const tool = server.getTool('deploy');
      const result = await tool.handler({ action: 'get' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('id is required');
    });

    it('tries slug first, falls back to id', async () => {
      mockGetDeploymentBySlug.mockRejectedValue(new Error('Not found'));
      const deployment = { id: 'flow_1', status: 'active' };
      mockGetDeployment.mockResolvedValue(deployment);

      const tool = server.getTool('deploy');
      const result = await tool.handler({ action: 'get', id: 'flow_1' });

      expect(mockGetDeploymentBySlug).toHaveBeenCalledWith({
        slug: 'flow_1',
        projectId: undefined,
      });
      expect(mockGetDeployment).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: undefined,
      });
      expect(result.structuredContent.id).toBe('flow_1');
    });

    it('returns slug result when slug lookup succeeds', async () => {
      const deployment = { slug: 'my-deploy', status: 'active' };
      mockGetDeploymentBySlug.mockResolvedValue(deployment);

      const tool = server.getTool('deploy');
      const result = await tool.handler({
        action: 'get',
        id: 'my-deploy',
        projectId: 'proj_1',
      });

      expect(mockGetDeploymentBySlug).toHaveBeenCalledWith({
        slug: 'my-deploy',
        projectId: 'proj_1',
      });
      expect(mockGetDeployment).not.toHaveBeenCalled();
      expect(result.structuredContent.slug).toBe('my-deploy');
    });
  });

  describe('delete', () => {
    it('requires id', async () => {
      const tool = server.getTool('deploy');
      const result = await tool.handler({ action: 'delete' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('id is required');
    });

    it('calls deleteDeployment', async () => {
      mockDeleteDeployment.mockResolvedValue({ success: true });

      const tool = server.getTool('deploy');
      const result = await tool.handler({
        action: 'delete',
        id: 'my-deploy',
        projectId: 'proj_1',
      });

      expect(mockDeleteDeployment).toHaveBeenCalledWith({
        slug: 'my-deploy',
        projectId: 'proj_1',
      });
      expect(result.structuredContent.deleted).toBe(true);
      expect(result.structuredContent.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('catches errors and returns mcpError with auth hint', async () => {
      mockListDeployments.mockRejectedValue(new Error('Unauthorized'));

      const tool = server.getTool('deploy');
      const result = await tool.handler({ action: 'list' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unauthorized');
      expect(parsed.hint).toContain('logged in');
    });
  });
});
