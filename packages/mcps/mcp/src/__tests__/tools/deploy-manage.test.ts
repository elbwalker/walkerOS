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
  mcpError: jest.fn((error: unknown, hint?: unknown) => {
    const err: object =
      typeof error === 'object' && error !== null ? error : {};
    const structured: Record<string, unknown> = {
      error: ('message' in err ? err.message : undefined) ?? 'Unknown error',
    };
    if (hint) structured.hint = hint;
    if ('code' in err && err.code) structured.code = err.code;
    if ('details' in err && Array.isArray(err.details))
      structured.details = err.details;
    return {
      content: [{ type: 'text', text: JSON.stringify(structured) }],
      structuredContent: structured,
      isError: true,
    };
  }),
}));

import { createDeployManageToolSpec } from '../../tools/deploy-manage.js';
import { CodedError } from '../support/coded-error.js';
import { stubClient } from '../support/stub-client.js';
import {
  structured,
  record,
  isErrorResult,
  textOf,
} from '../support/tool-result.js';

function parse(text: string): unknown {
  return JSON.parse(text);
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers with name "deploy_manage" and correct annotations', () => {
    const tool = createDeployManageToolSpec(stubClient());
    expect(tool.name).toBe('deploy_manage');
    expect(tool.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it('describes the now-real hosted behavior honestly', () => {
    const tool = createDeployManageToolSpec(stubClient());
    const description = tool.description.toLowerCase();

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
      const tool = createDeployManageToolSpec(stubClient());
      const result = await tool.handler({ action: 'deploy' });

      expect(isErrorResult(result)).toBe(true);
      const parsed = record(parse(textOf(result)));
      expect(parsed.error).toContain('flowId is required for deploy action');
    });

    it('calls deploy with correct options', async () => {
      const deployed = { status: 'deployed', url: 'https://example.com' };
      const deploy = jest.fn().mockResolvedValue(deployed);
      const tool = createDeployManageToolSpec(stubClient({ deploy }));
      const result = await tool.handler({
        action: 'deploy',
        flowId: 'flow_1',
        flowName: 'my-flow',
      });

      expect(deploy).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: undefined,
        wait: true,
        flowName: 'my-flow',
      });
      expect(structured(result).status).toBe('deployed');
    });

    it('defaults wait to true', async () => {
      const deploy = jest.fn().mockResolvedValue({ status: 'deployed' });
      const tool = createDeployManageToolSpec(stubClient({ deploy }));
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
      const tool = createDeployManageToolSpec(stubClient({ deploy }));
      const result = await tool.handler({
        action: 'deploy',
        flowId: 'flow_1',
      });

      expect(structured(result).slug).toBe('abc123456789');
      expect(structured(result).status).toBe('deployed');
      expect(structured(result).name).toBe(
        '<user_data>Prod Deploy</user_data>',
      );
      expect(structured(result).flowName).toBe(
        '<user_data>My </user_data_>flow</user_data>',
      );
    });

    it('respects wait: false', async () => {
      const deploy = jest.fn().mockResolvedValue({ status: 'pending' });
      const tool = createDeployManageToolSpec(stubClient({ deploy }));
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
      const tool = createDeployManageToolSpec(stubClient({ listDeployments }));
      const result = await tool.handler({
        action: 'list',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });

      expect(listDeployments).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_abc',
        type: undefined,
        status: undefined,
        cursor: undefined,
        limit: undefined,
      });
      expect(structured(result).deployments).toEqual(deployments);
    });

    it('forwards cursor and limit to listDeployments', async () => {
      const listDeployments = jest.fn().mockResolvedValue({ deployments: [] });
      const tool = createDeployManageToolSpec(stubClient({ listDeployments }));
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
      const tool = createDeployManageToolSpec(stubClient({ listDeployments }));
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
      const tool = createDeployManageToolSpec(stubClient({ listDeployments }));
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

    it('refuses a status the contract does not declare, before any request', async () => {
      const listDeployments = jest.fn().mockResolvedValue({ deployments: [] });
      const tool = createDeployManageToolSpec(stubClient({ listDeployments }));
      const result = await tool.handler({ action: 'list', status: 'running' });

      expect(isErrorResult(result)).toBe(true);
      expect(textOf(result)).toContain('status');
      expect(listDeployments).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('requires flowId', async () => {
      const tool = createDeployManageToolSpec(stubClient());
      const result = await tool.handler({ action: 'get' });

      expect(isErrorResult(result)).toBe(true);
      const parsed = record(parse(textOf(result)));
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
      const tool = createDeployManageToolSpec(
        stubClient({ listDeployments, getDeploymentBySlug }),
      );
      const result = await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });

      expect(listDeployments).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });
      expect(getDeploymentBySlug).toHaveBeenCalledWith({
        slug: DEPLOYMENT_ONE.slug,
        projectId: 'proj_1',
      });
      expect(structured(result).slug).toBe(DEPLOYMENT_ONE.slug);
    });

    it('returns MULTIPLE_DEPLOYMENTS when two matches and no slug', async () => {
      const listDeployments = jest
        .fn()
        .mockResolvedValue({ deployments: [DEPLOYMENT_ONE, DEPLOYMENT_TWO] });
      const getDeploymentBySlug = jest.fn();
      const tool = createDeployManageToolSpec(
        stubClient({ listDeployments, getDeploymentBySlug }),
      );
      const result = await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });

      expect(isErrorResult(result)).toBe(true);
      expect(structured(result).code).toBe('MULTIPLE_DEPLOYMENTS');
      expect(structured(result).details).toHaveLength(2);
      expect(getDeploymentBySlug).not.toHaveBeenCalled();
    });

    it('returns NOT_FOUND when slug matches neither of two deployments', async () => {
      const listDeployments = jest
        .fn()
        .mockResolvedValue({ deployments: [DEPLOYMENT_ONE, DEPLOYMENT_TWO] });
      const getDeploymentBySlug = jest.fn();
      const tool = createDeployManageToolSpec(
        stubClient({ listDeployments, getDeploymentBySlug }),
      );
      const result = await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
        slug: 'ghi999',
      });

      expect(isErrorResult(result)).toBe(true);
      expect(structured(result).code).toBe('NOT_FOUND');
      expect(getDeploymentBySlug).not.toHaveBeenCalled();
    });

    it('uses provided slug when it matches one of multiple deployments', async () => {
      const listDeployments = jest
        .fn()
        .mockResolvedValue({ deployments: [DEPLOYMENT_ONE, DEPLOYMENT_TWO] });
      const getDeploymentBySlug = jest.fn().mockResolvedValue({
        slug: DEPLOYMENT_TWO.slug,
      });
      const tool = createDeployManageToolSpec(
        stubClient({ listDeployments, getDeploymentBySlug }),
      );
      const result = await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
        slug: DEPLOYMENT_TWO.slug,
      });

      expect(getDeploymentBySlug).toHaveBeenCalledWith({
        slug: DEPLOYMENT_TWO.slug,
        projectId: 'proj_1',
      });
      expect(structured(result).slug).toBe(DEPLOYMENT_TWO.slug);
    });
  });

  describe('delete', () => {
    it('requires flowId', async () => {
      const tool = createDeployManageToolSpec(stubClient());
      const result = await tool.handler({ action: 'delete' });

      expect(isErrorResult(result)).toBe(true);
      const parsed = record(parse(textOf(result)));
      expect(parsed.error).toContain('flowId is required for delete action');
    });

    it('resolves single active deployment and deletes it', async () => {
      const listDeployments = jest
        .fn()
        .mockResolvedValue({ deployments: [DEPLOYMENT_ONE] });
      const deleteDeployment = jest.fn().mockResolvedValue({ success: true });
      const tool = createDeployManageToolSpec(
        stubClient({ listDeployments, deleteDeployment }),
      );
      const result = await tool.handler({
        action: 'delete',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });

      expect(deleteDeployment).toHaveBeenCalledWith({
        slug: DEPLOYMENT_ONE.slug,
        projectId: 'proj_1',
      });
      expect(structured(result).deleted).toBe(true);
      expect(structured(result).success).toBe(true);
    });

    it('returns MULTIPLE_DEPLOYMENTS with details when two active and no slug', async () => {
      const listDeployments = jest
        .fn()
        .mockResolvedValue({ deployments: [DEPLOYMENT_ONE, DEPLOYMENT_TWO] });
      const deleteDeployment = jest.fn();
      const tool = createDeployManageToolSpec(
        stubClient({ listDeployments, deleteDeployment }),
      );
      const result = await tool.handler({
        action: 'delete',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });

      expect(isErrorResult(result)).toBe(true);
      expect(structured(result).code).toBe('MULTIPLE_DEPLOYMENTS');
      expect(structured(result).details).toHaveLength(2);
      expect(deleteDeployment).not.toHaveBeenCalled();
    });

    it('returns NOT_FOUND when slug matches neither of two deployments', async () => {
      const listDeployments = jest
        .fn()
        .mockResolvedValue({ deployments: [DEPLOYMENT_ONE, DEPLOYMENT_TWO] });
      const deleteDeployment = jest.fn();
      const tool = createDeployManageToolSpec(
        stubClient({ listDeployments, deleteDeployment }),
      );
      const result = await tool.handler({
        action: 'delete',
        projectId: 'proj_1',
        flowId: 'flow_abc',
        slug: 'ghi999',
      });

      expect(isErrorResult(result)).toBe(true);
      expect(structured(result).code).toBe('NOT_FOUND');
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
      const tool = createDeployManageToolSpec(stubClient({ deploy }));
      const result = await tool.handler({
        action: 'deploy',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });

      expect(structured(result).appUrl).toBe(
        'https://app.walkeros.io/projects/proj_1/deployments/dep_1',
      );
    });

    it('deploys in the project it links into', async () => {
      // The link resolves `explicit ?? default`. A deploy that resolved the
      // default instead would run in one project and link into another, and
      // the project-scoped deployment page would answer that link with a 404.
      const deploy = jest.fn().mockResolvedValue({ deploymentId: 'dep_1' });
      const tool = createDeployManageToolSpec(
        stubClient({ deploy, getDefaultProject: () => 'proj_default' }),
      );
      const result = await tool.handler({
        action: 'deploy',
        projectId: 'proj_explicit',
        flowId: 'flow_abc',
      });

      expect(deploy).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'proj_explicit' }),
      );
      expect(structured(result).appUrl).toBe(
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
      const tool = createDeployManageToolSpec(
        stubClient({ listDeployments, getDeploymentBySlug }),
      );
      const result = await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });

      expect(structured(result).appUrl).toBe(
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
      const tool = createDeployManageToolSpec(
        stubClient({ listDeployments, getDeploymentBySlug }),
      );
      const result = await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });

      expect(structured(result).url).toBe('https://collect.example.com');
      expect(structured(result).appUrl).toBe(
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
      const tool = createDeployManageToolSpec(stubClient({ deploy }));
      const result = await tool.handler({
        action: 'deploy',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });

      expect(structured(result).url).toBe('https://collect.example.com');
      expect(structured(result).appUrl).toBe(
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
      const tool = createDeployManageToolSpec(
        stubClient({ listDeployments, getDeploymentBySlug }),
      );
      const result = await tool.handler({
        action: 'get',
        projectId: 'proj_1',
        flowId: 'flow_abc',
      });

      expect(structured(result)).not.toHaveProperty('appUrl');
    });

    it('links nothing when no project can be named', async () => {
      // The stub door has no default project, and none was passed. A link
      // built on a guessed project would point into someone else's work.
      const deploy = jest.fn().mockResolvedValue({ deploymentId: 'dep_1' });
      const tool = createDeployManageToolSpec(stubClient({ deploy }));
      const result = await tool.handler({
        action: 'deploy',
        flowId: 'flow_abc',
      });

      expect(structured(result)).not.toHaveProperty('appUrl');
    });
  });

  describe('error handling', () => {
    it('catches errors and returns mcpError with auth hint', async () => {
      const listDeployments = jest
        .fn()
        .mockRejectedValue(new CodedError('Unauthorized', 'UNAUTHORIZED', 401));
      const tool = createDeployManageToolSpec(stubClient({ listDeployments }));
      const result = await tool.handler({ action: 'list' });

      expect(isErrorResult(result)).toBe(true);
      const parsed = record(parse(textOf(result)));
      expect(parsed.error).toBe('Unauthorized');
      expect(parsed.hint).toContain('logged in');
    });

    it('does not append auth hint for non-auth errors', async () => {
      const listDeployments = jest
        .fn()
        .mockRejectedValue(new Error('validation failed'));
      const tool = createDeployManageToolSpec(stubClient({ listDeployments }));
      const result = await tool.handler({ action: 'list' });

      expect(isErrorResult(result)).toBe(true);
      const parsed = record(parse(textOf(result)));
      expect(parsed.error).toBe('validation failed');
      expect(parsed.hint).toBeUndefined();
    });
  });
});
