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

import { registerDeployTool } from '../../tools/deploy-manage.js';
import { stubClient } from '../support/stub-client.js';

type HandlerFn = (input: Record<string, unknown>) => Promise<unknown>;

function createMockServer() {
  const tools: Record<string, { config: unknown; handler: HandlerFn }> = {};
  return {
    registerTool(name: string, config: unknown, handler: HandlerFn) {
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
  });

  it('registers with name "deploy_manage" and correct annotations', () => {
    registerDeployTool(server as never, stubClient());
    const tool = server.getTool('deploy_manage');
    expect(tool).toBeDefined();
    const config = tool!.config as { annotations: Record<string, boolean> };
    expect(config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  describe('deploy', () => {
    it('requires flowId', async () => {
      registerDeployTool(server as never, stubClient());
      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({ action: 'deploy' })) as {
        isError: boolean;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('flowId is required');
    });

    it('calls deploy with correct options', async () => {
      const deployed = { status: 'deployed', url: 'https://example.com' };
      const deploy = jest.fn().mockResolvedValue(deployed);
      registerDeployTool(server as never, stubClient({ deploy }));

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({
        action: 'deploy',
        flowId: 'flow_1',
        flowName: 'my-flow',
      })) as { structuredContent: { status: string } };

      expect(deploy).toHaveBeenCalledWith({
        flowId: 'flow_1',
        wait: true,
        flowName: 'my-flow',
      });
      expect(result.structuredContent.status).toBe('deployed');
    });

    it('defaults wait to true', async () => {
      const deploy = jest.fn().mockResolvedValue({ status: 'deployed' });
      registerDeployTool(server as never, stubClient({ deploy }));

      const tool = server.getTool('deploy_manage')!;
      await tool.handler({ action: 'deploy', flowId: 'flow_1' });

      expect(deploy).toHaveBeenCalledWith({
        flowId: 'flow_1',
        wait: true,
        flowName: undefined,
      });
    });

    it('respects wait: false', async () => {
      const deploy = jest.fn().mockResolvedValue({ status: 'pending' });
      registerDeployTool(server as never, stubClient({ deploy }));

      const tool = server.getTool('deploy_manage')!;
      await tool.handler({
        action: 'deploy',
        flowId: 'flow_1',
        wait: false,
      });

      expect(deploy).toHaveBeenCalledWith({
        flowId: 'flow_1',
        wait: false,
        flowName: undefined,
      });
    });
  });

  describe('list', () => {
    it('passes flowId filter through to listDeployments', async () => {
      const deployments = [DEPLOYMENT_ONE, DEPLOYMENT_TWO];
      const listDeployments = jest.fn().mockResolvedValue({ deployments });
      registerDeployTool(server as never, stubClient({ listDeployments }));

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({
        action: 'list',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      })) as { structuredContent: { deployments: unknown[] } };

      expect(listDeployments).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_abc',
        type: undefined,
        status: undefined,
      });
      expect(result.structuredContent.deployments).toEqual(deployments);
    });

    it('calls listDeployments without flowId', async () => {
      const listDeployments = jest.fn().mockResolvedValue({ deployments: [] });
      registerDeployTool(server as never, stubClient({ listDeployments }));

      const tool = server.getTool('deploy_manage')!;
      await tool.handler({ action: 'list' });

      expect(listDeployments).toHaveBeenCalledWith({
        projectId: undefined,
        flowId: undefined,
        type: undefined,
        status: undefined,
      });
    });

    it('accepts type and status filters', async () => {
      const listDeployments = jest.fn().mockResolvedValue({ deployments: [] });
      registerDeployTool(server as never, stubClient({ listDeployments }));

      const tool = server.getTool('deploy_manage')!;
      await tool.handler({
        action: 'list',
        projectId: 'proj_1',
        type: 'web',
        status: 'active',
      });

      expect(listDeployments).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: undefined,
        type: 'web',
        status: 'active',
      });
    });
  });

  describe('get', () => {
    it('requires flowId', async () => {
      registerDeployTool(server as never, stubClient());
      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({ action: 'get' })) as {
        isError: boolean;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('flowId is required');
    });

    it('resolves single active deployment and fetches it by slug', async () => {
      const listDeployments = jest
        .fn()
        .mockResolvedValue({ deployments: [DEPLOYMENT_ONE] });
      const getDeploymentBySlug = jest.fn().mockResolvedValue({
        slug: DEPLOYMENT_ONE.slug,
        status: 'active',
      });
      registerDeployTool(
        server as never,
        stubClient({ listDeployments, getDeploymentBySlug }),
      );

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      })) as { structuredContent: { slug: string } };

      expect(listDeployments).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });
      expect(getDeploymentBySlug).toHaveBeenCalledWith({
        slug: DEPLOYMENT_ONE.slug,
        projectId: 'proj_1',
      });
      expect(result.structuredContent.slug).toBe(DEPLOYMENT_ONE.slug);
    });

    it('returns MULTIPLE_DEPLOYMENTS when two matches and no slug', async () => {
      const listDeployments = jest
        .fn()
        .mockResolvedValue({ deployments: [DEPLOYMENT_ONE, DEPLOYMENT_TWO] });
      const getDeploymentBySlug = jest.fn();
      registerDeployTool(
        server as never,
        stubClient({ listDeployments, getDeploymentBySlug }),
      );

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      })) as {
        isError: boolean;
        structuredContent: { code: string; details: unknown[] };
      };

      expect(result.isError).toBe(true);
      expect(result.structuredContent.code).toBe('MULTIPLE_DEPLOYMENTS');
      expect(result.structuredContent.details).toHaveLength(2);
      expect(getDeploymentBySlug).not.toHaveBeenCalled();
    });

    it('returns NOT_FOUND when slug matches neither of two deployments', async () => {
      const listDeployments = jest
        .fn()
        .mockResolvedValue({ deployments: [DEPLOYMENT_ONE, DEPLOYMENT_TWO] });
      const getDeploymentBySlug = jest.fn();
      registerDeployTool(
        server as never,
        stubClient({ listDeployments, getDeploymentBySlug }),
      );

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
        slug: 'ghi999',
      })) as { isError: boolean; structuredContent: { code: string } };

      expect(result.isError).toBe(true);
      expect(result.structuredContent.code).toBe('NOT_FOUND');
      expect(getDeploymentBySlug).not.toHaveBeenCalled();
    });

    it('uses provided slug when it matches one of multiple deployments', async () => {
      const listDeployments = jest
        .fn()
        .mockResolvedValue({ deployments: [DEPLOYMENT_ONE, DEPLOYMENT_TWO] });
      const getDeploymentBySlug = jest.fn().mockResolvedValue({
        slug: DEPLOYMENT_TWO.slug,
      });
      registerDeployTool(
        server as never,
        stubClient({ listDeployments, getDeploymentBySlug }),
      );

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
        slug: DEPLOYMENT_TWO.slug,
      })) as { structuredContent: { slug: string } };

      expect(getDeploymentBySlug).toHaveBeenCalledWith({
        slug: DEPLOYMENT_TWO.slug,
        projectId: 'proj_1',
      });
      expect(result.structuredContent.slug).toBe(DEPLOYMENT_TWO.slug);
    });
  });

  describe('delete', () => {
    it('requires flowId', async () => {
      registerDeployTool(server as never, stubClient());
      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({ action: 'delete' })) as {
        isError: boolean;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('flowId is required');
    });

    it('resolves single active deployment and deletes it', async () => {
      const listDeployments = jest
        .fn()
        .mockResolvedValue({ deployments: [DEPLOYMENT_ONE] });
      const deleteDeployment = jest.fn().mockResolvedValue({ success: true });
      registerDeployTool(
        server as never,
        stubClient({ listDeployments, deleteDeployment }),
      );

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({
        action: 'delete',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      })) as { structuredContent: { deleted: boolean; success: boolean } };

      expect(deleteDeployment).toHaveBeenCalledWith({
        slug: DEPLOYMENT_ONE.slug,
        projectId: 'proj_1',
      });
      expect(result.structuredContent.deleted).toBe(true);
      expect(result.structuredContent.success).toBe(true);
    });

    it('returns MULTIPLE_DEPLOYMENTS with details when two active and no slug', async () => {
      const listDeployments = jest
        .fn()
        .mockResolvedValue({ deployments: [DEPLOYMENT_ONE, DEPLOYMENT_TWO] });
      const deleteDeployment = jest.fn();
      registerDeployTool(
        server as never,
        stubClient({ listDeployments, deleteDeployment }),
      );

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({
        action: 'delete',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      })) as {
        isError: boolean;
        structuredContent: { code: string; details: unknown[] };
      };

      expect(result.isError).toBe(true);
      expect(result.structuredContent.code).toBe('MULTIPLE_DEPLOYMENTS');
      expect(result.structuredContent.details).toHaveLength(2);
      expect(deleteDeployment).not.toHaveBeenCalled();
    });

    it('returns NOT_FOUND when slug matches neither of two deployments', async () => {
      const listDeployments = jest
        .fn()
        .mockResolvedValue({ deployments: [DEPLOYMENT_ONE, DEPLOYMENT_TWO] });
      const deleteDeployment = jest.fn();
      registerDeployTool(
        server as never,
        stubClient({ listDeployments, deleteDeployment }),
      );

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({
        action: 'delete',
        projectId: 'proj_1',
        flowId: 'flow_abc',
        slug: 'ghi999',
      })) as { isError: boolean; structuredContent: { code: string } };

      expect(result.isError).toBe(true);
      expect(result.structuredContent.code).toBe('NOT_FOUND');
      expect(deleteDeployment).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('catches errors and returns mcpError with auth hint', async () => {
      const listDeployments = jest
        .fn()
        .mockRejectedValue(new Error('Unauthorized'));
      registerDeployTool(server as never, stubClient({ listDeployments }));

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({ action: 'list' })) as {
        isError: boolean;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unauthorized');
      expect(parsed.hint).toContain('logged in');
    });

    it('does not append auth hint for non-auth errors', async () => {
      const listDeployments = jest
        .fn()
        .mockRejectedValue(new Error('validation failed'));
      registerDeployTool(server as never, stubClient({ listDeployments }));

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({ action: 'list' })) as {
        isError: boolean;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('validation failed');
      expect(parsed.hint).toBeUndefined();
    });
  });
});
