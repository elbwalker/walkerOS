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

  it('describes the now-real hosted behavior honestly', () => {
    registerDeployTool(server as never, stubClient());
    const tool = server.getTool('deploy_manage')!;
    const config = tool.config as { description: string };
    const description = config.description.toLowerCase();

    // wait is honored, including the budget
    expect(description).toContain('wait');
    expect(description).toContain('12-minute');

    // delete works; no always-throws disclaimer
    expect(description).toContain('delete');
    expect(description).not.toContain('throw');
    expect(description).not.toContain('not yet');
    expect(description).not.toContain('not implemented');
    expect(description).not.toContain('always');

    // pagination args are passed through
    expect(description).toContain('cursor');
    expect(description).toContain('limit');

    // failure detail is reported by get/status
    expect(description).toContain('errormessage');
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
      expect(parsed.error).toContain('flowId is required for deploy action');
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
        projectId: undefined,
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
        projectId: undefined,
        wait: true,
        flowName: undefined,
      });
    });

    it('wraps echoed name/flowName like flow_manage, leaves ids/status literal', async () => {
      const deploy = jest.fn().mockResolvedValue({
        slug: 'abc123456789',
        status: 'deployed',
        flowName: 'My </user_data>flow',
        name: 'Prod Deploy',
      });
      registerDeployTool(server as never, stubClient({ deploy }));

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({
        action: 'deploy',
        flowId: 'flow_1',
      })) as {
        structuredContent: {
          slug: string;
          status: string;
          flowName: string;
          name: string;
        };
      };

      expect(result.structuredContent.slug).toBe('abc123456789');
      expect(result.structuredContent.status).toBe('deployed');
      expect(result.structuredContent.name).toBe(
        '<user_data>Prod Deploy</user_data>',
      );
      expect(result.structuredContent.flowName).toBe(
        '<user_data>My </user_data_>flow</user_data>',
      );
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
        projectId: undefined,
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
        cursor: undefined,
        limit: undefined,
      });
      expect(result.structuredContent.deployments).toEqual(deployments);
    });

    it('forwards cursor and limit to listDeployments', async () => {
      const listDeployments = jest.fn().mockResolvedValue({ deployments: [] });
      registerDeployTool(server as never, stubClient({ listDeployments }));

      const tool = server.getTool('deploy_manage')!;
      await tool.handler({
        action: 'list',
        projectId: 'proj_1',
        cursor: 'abc',
        limit: 10,
      });

      expect(listDeployments).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: undefined,
        type: undefined,
        status: undefined,
        cursor: 'abc',
        limit: 10,
      });
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
        cursor: undefined,
        limit: undefined,
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
        cursor: undefined,
        limit: undefined,
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
      expect(parsed.error).toContain('flowId is required for get action');
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
      expect(parsed.error).toContain('flowId is required for delete action');
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

  // A link belongs in the structured result, not only in prose: an agent reads
  // it as data and hands it on without retyping it out of a sentence.
  describe('links into the app', () => {
    it('links the deployment page a deploy just started', async () => {
      const deploy = jest
        .fn()
        .mockResolvedValue({ deploymentId: 'dep_1', slug: 'abc123456789' });
      registerDeployTool(server as never, stubClient({ deploy }));

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({
        action: 'deploy',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      })) as { structuredContent: { appUrl?: string } };

      expect(result.structuredContent.appUrl).toBe(
        'https://app.walkeros.io/projects/proj_1/deployments/dep_1',
      );
    });

    it('deploys in the project it links into', async () => {
      // The link resolves `explicit ?? default`. A deploy that resolved the
      // default instead would run in one project and link into another, and
      // the project-scoped deployment page would answer that link with a 404.
      const deploy = jest.fn().mockResolvedValue({ deploymentId: 'dep_1' });
      registerDeployTool(
        server as never,
        stubClient({ deploy, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({
        action: 'deploy',
        projectId: 'proj_explicit',
        flowId: 'flow_abc',
      })) as { structuredContent: { appUrl?: string } };

      expect(deploy).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'proj_explicit' }),
      );
      expect(result.structuredContent.appUrl).toBe(
        'https://app.walkeros.io/projects/proj_explicit/deployments/dep_1',
      );
    });

    it('links the deployment page a get read', async () => {
      const listDeployments = jest
        .fn()
        .mockResolvedValue({ deployments: [DEPLOYMENT_ONE] });
      const getDeploymentBySlug = jest
        .fn()
        .mockResolvedValue({ id: 'dep_1', slug: DEPLOYMENT_ONE.slug });
      registerDeployTool(
        server as never,
        stubClient({ listDeployments, getDeploymentBySlug }),
      );

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      })) as { structuredContent: { appUrl?: string } };

      expect(result.structuredContent.appUrl).toBe(
        'https://app.walkeros.io/projects/proj_1/deployments/dep_1',
      );
    });

    // The API's own `url` is where the deployment SERVES. Overwriting it with
    // the app page would swap a live endpoint for a UI link with nothing to
    // say the meaning had changed, so the link travels under its own key.
    it('leaves the serving url a get returned untouched', async () => {
      const listDeployments = jest
        .fn()
        .mockResolvedValue({ deployments: [DEPLOYMENT_ONE] });
      const getDeploymentBySlug = jest.fn().mockResolvedValue({
        id: 'dep_1',
        slug: DEPLOYMENT_ONE.slug,
        status: 'active',
        url: 'https://collect.example.com',
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
      })) as { structuredContent: { url?: string; appUrl?: string } };

      expect(result.structuredContent.url).toBe('https://collect.example.com');
      expect(result.structuredContent.appUrl).toBe(
        'https://app.walkeros.io/projects/proj_1/deployments/dep_1',
      );
    });

    it('leaves the serving url a finished deploy returned untouched', async () => {
      // The hosted shape: `wait: true` merges the terminal status onto the
      // start body, so the deploy response carries `url` as well.
      const deploy = jest.fn().mockResolvedValue({
        deploymentId: 'dep_1',
        slug: 'abc123456789',
        status: 'active',
        url: 'https://collect.example.com',
      });
      registerDeployTool(server as never, stubClient({ deploy }));

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({
        action: 'deploy',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      })) as { structuredContent: { url?: string; appUrl?: string } };

      expect(result.structuredContent.url).toBe('https://collect.example.com');
      expect(result.structuredContent.appUrl).toBe(
        'https://app.walkeros.io/projects/proj_1/deployments/dep_1',
      );
    });

    it('links nothing for a response carrying only a slug', async () => {
      // The detail route resolves a slug, but the page's live-status stream
      // matches on the id alone, so a slug link opens a page whose stream
      // fails mid-deploy.
      const listDeployments = jest
        .fn()
        .mockResolvedValue({ deployments: [DEPLOYMENT_ONE] });
      const getDeploymentBySlug = jest
        .fn()
        .mockResolvedValue({ slug: DEPLOYMENT_ONE.slug, status: 'active' });
      registerDeployTool(
        server as never,
        stubClient({ listDeployments, getDeploymentBySlug }),
      );

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      })) as { structuredContent: Record<string, unknown> };

      expect(result.structuredContent).not.toHaveProperty('appUrl');
    });

    it('links nothing when no project can be named', async () => {
      // The stub door has no default project, and none was passed. A link
      // built on a guessed project would point into someone else's work.
      const deploy = jest.fn().mockResolvedValue({ deploymentId: 'dep_1' });
      registerDeployTool(server as never, stubClient({ deploy }));

      const tool = server.getTool('deploy_manage')!;
      const result = (await tool.handler({
        action: 'deploy',
        flowId: 'flow_abc',
      })) as { structuredContent: Record<string, unknown> };

      expect(result.structuredContent).not.toHaveProperty('appUrl');
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
