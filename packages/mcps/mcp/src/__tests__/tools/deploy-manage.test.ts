import { registerDeployTool } from '../../tools/deploy-manage.js';

jest.mock('@walkeros/cli', () => ({
  deploy: jest.fn(),
  listDeployments: jest.fn(),
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
  mcpError: jest.fn((error, hint) => {
    const err = error as Error & { code?: string; details?: unknown[] };
    const structured: Record<string, unknown> = {
      error: err?.message ?? 'Unknown error',
    };
    if (hint) structured.hint = hint;
    if (err?.code) structured.code = err.code;
    if (Array.isArray(err?.details)) structured.details = err.details;
    return {
      content: [{ type: 'text', text: JSON.stringify(structured) }],
      structuredContent: structured,
      isError: true,
    };
  }),
}));

import {
  deploy as deployFlow,
  listDeployments,
  getDeploymentBySlug,
  deleteDeployment,
} from '@walkeros/cli';

const mockDeployFlow = jest.mocked(deployFlow);
const mockListDeployments = jest.mocked(listDeployments);
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

const DEPLOYMENT_ONE = {
  slug: 'abc123456789',
  type: 'web',
  status: 'active',
  updatedAt: '2026-04-20T00:00:00.000Z',
};

const DEPLOYMENT_TWO = {
  slug: 'def987654321',
  type: 'web',
  status: 'active',
  updatedAt: '2026-04-21T00:00:00.000Z',
};

describe('deploy_manage tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerDeployTool(server as any);
  });

  it('registers with name "deploy_manage" and correct annotations', () => {
    const tool = server.getTool('deploy_manage');
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
      const tool = server.getTool('deploy_manage');
      const result = await tool.handler({ action: 'deploy' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('flowId is required');
    });

    it('calls deployFlow with correct options', async () => {
      const deployed = { status: 'deployed', url: 'https://example.com' };
      mockDeployFlow.mockResolvedValue(deployed);

      const tool = server.getTool('deploy_manage');
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

      const tool = server.getTool('deploy_manage');
      await tool.handler({ action: 'deploy', flowId: 'flow_1' });

      expect(mockDeployFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        wait: true,
        flowName: undefined,
      });
    });

    it('respects wait: false', async () => {
      mockDeployFlow.mockResolvedValue({ status: 'pending' });

      const tool = server.getTool('deploy_manage');
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
    it('passes flowId filter through to listDeployments', async () => {
      const deployments = [DEPLOYMENT_ONE, DEPLOYMENT_TWO];
      mockListDeployments.mockResolvedValue({ deployments });

      const tool = server.getTool('deploy_manage');
      const result = await tool.handler({
        action: 'list',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });

      expect(mockListDeployments).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_abc',
        type: undefined,
        status: undefined,
      });
      expect(result.structuredContent.deployments).toEqual(deployments);
    });

    it('calls listDeployments without flowId', async () => {
      mockListDeployments.mockResolvedValue({ deployments: [] });

      const tool = server.getTool('deploy_manage');
      await tool.handler({ action: 'list' });

      expect(mockListDeployments).toHaveBeenCalledWith({
        projectId: undefined,
        flowId: undefined,
        type: undefined,
        status: undefined,
      });
    });

    it('accepts type and status filters', async () => {
      mockListDeployments.mockResolvedValue({ deployments: [] });

      const tool = server.getTool('deploy_manage');
      await tool.handler({
        action: 'list',
        projectId: 'proj_1',
        type: 'web',
        status: 'active',
      });

      expect(mockListDeployments).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: undefined,
        type: 'web',
        status: 'active',
      });
    });
  });

  describe('get', () => {
    it('requires flowId', async () => {
      const tool = server.getTool('deploy_manage');
      const result = await tool.handler({ action: 'get' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('flowId is required');
    });

    it('resolves single active deployment and fetches it by slug', async () => {
      mockListDeployments.mockResolvedValue({ deployments: [DEPLOYMENT_ONE] });
      mockGetDeploymentBySlug.mockResolvedValue({
        slug: DEPLOYMENT_ONE.slug,
        status: 'active',
      });

      const tool = server.getTool('deploy_manage');
      const result = await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });

      expect(mockListDeployments).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });
      expect(mockGetDeploymentBySlug).toHaveBeenCalledWith({
        slug: DEPLOYMENT_ONE.slug,
        projectId: 'proj_1',
      });
      expect(result.structuredContent.slug).toBe(DEPLOYMENT_ONE.slug);
    });

    it('returns MULTIPLE_DEPLOYMENTS when two matches and no slug', async () => {
      mockListDeployments.mockResolvedValue({
        deployments: [DEPLOYMENT_ONE, DEPLOYMENT_TWO],
      });

      const tool = server.getTool('deploy_manage');
      const result = await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });

      expect(result.isError).toBe(true);
      expect(result.structuredContent.code).toBe('MULTIPLE_DEPLOYMENTS');
      expect(result.structuredContent.details).toHaveLength(2);
      expect(mockGetDeploymentBySlug).not.toHaveBeenCalled();
    });

    it('returns NOT_FOUND when slug matches neither of two deployments', async () => {
      mockListDeployments.mockResolvedValue({
        deployments: [DEPLOYMENT_ONE, DEPLOYMENT_TWO],
      });

      const tool = server.getTool('deploy_manage');
      const result = await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
        slug: 'ghi999',
      });

      expect(result.isError).toBe(true);
      expect(result.structuredContent.code).toBe('NOT_FOUND');
      expect(mockGetDeploymentBySlug).not.toHaveBeenCalled();
    });

    it('uses provided slug when it matches one of multiple deployments', async () => {
      mockListDeployments.mockResolvedValue({
        deployments: [DEPLOYMENT_ONE, DEPLOYMENT_TWO],
      });
      mockGetDeploymentBySlug.mockResolvedValue({
        slug: DEPLOYMENT_TWO.slug,
      });

      const tool = server.getTool('deploy_manage');
      const result = await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
        slug: DEPLOYMENT_TWO.slug,
      });

      expect(mockGetDeploymentBySlug).toHaveBeenCalledWith({
        slug: DEPLOYMENT_TWO.slug,
        projectId: 'proj_1',
      });
      expect(result.structuredContent.slug).toBe(DEPLOYMENT_TWO.slug);
    });
  });

  describe('delete', () => {
    it('requires flowId', async () => {
      const tool = server.getTool('deploy_manage');
      const result = await tool.handler({ action: 'delete' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('flowId is required');
    });

    it('resolves single active deployment and deletes it', async () => {
      mockListDeployments.mockResolvedValue({ deployments: [DEPLOYMENT_ONE] });
      mockDeleteDeployment.mockResolvedValue({ success: true });

      const tool = server.getTool('deploy_manage');
      const result = await tool.handler({
        action: 'delete',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });

      expect(mockDeleteDeployment).toHaveBeenCalledWith({
        slug: DEPLOYMENT_ONE.slug,
        projectId: 'proj_1',
      });
      expect(result.structuredContent.deleted).toBe(true);
      expect(result.structuredContent.success).toBe(true);
    });

    it('returns MULTIPLE_DEPLOYMENTS with details when two active and no slug', async () => {
      mockListDeployments.mockResolvedValue({
        deployments: [DEPLOYMENT_ONE, DEPLOYMENT_TWO],
      });

      const tool = server.getTool('deploy_manage');
      const result = await tool.handler({
        action: 'delete',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });

      expect(result.isError).toBe(true);
      expect(result.structuredContent.code).toBe('MULTIPLE_DEPLOYMENTS');
      expect(result.structuredContent.details).toHaveLength(2);
      expect(mockDeleteDeployment).not.toHaveBeenCalled();
    });

    it('returns NOT_FOUND when slug matches neither of two deployments', async () => {
      mockListDeployments.mockResolvedValue({
        deployments: [DEPLOYMENT_ONE, DEPLOYMENT_TWO],
      });

      const tool = server.getTool('deploy_manage');
      const result = await tool.handler({
        action: 'delete',
        projectId: 'proj_1',
        flowId: 'flow_abc',
        slug: 'ghi999',
      });

      expect(result.isError).toBe(true);
      expect(result.structuredContent.code).toBe('NOT_FOUND');
      expect(mockDeleteDeployment).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('catches errors and returns mcpError with auth hint', async () => {
      mockListDeployments.mockRejectedValue(new Error('Unauthorized'));

      const tool = server.getTool('deploy_manage');
      const result = await tool.handler({ action: 'list' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unauthorized');
      expect(parsed.hint).toContain('logged in');
    });

    it('does not append auth hint for non-auth errors', async () => {
      mockListDeployments.mockRejectedValue(new Error('validation failed'));

      const tool = server.getTool('deploy_manage');
      const result = await tool.handler({ action: 'list' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('validation failed');
      expect(parsed.hint).toBeUndefined();
    });
  });
});
