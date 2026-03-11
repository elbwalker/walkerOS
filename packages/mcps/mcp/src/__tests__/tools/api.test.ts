import { registerApiTool } from '../../tools/api.js';

jest.mock('@walkeros/cli', () => ({
  whoami: jest.fn(),
  listProjects: jest.fn(),
  getProject: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  listFlows: jest.fn(),
  getFlow: jest.fn(),
  createFlow: jest.fn(),
  updateFlow: jest.fn(),
  deleteFlow: jest.fn(),
  duplicateFlow: jest.fn(),
  deploy: jest.fn(),
  getDeployment: jest.fn(),
  listDeployments: jest.fn(),
  getDeploymentBySlug: jest.fn(),
  createDeployment: jest.fn(),
  deleteDeployment: jest.fn(),
}));

jest.mock('@walkeros/core', () => ({
  mcpResult: jest.fn((result, summary) => ({
    content: [
      { type: 'text', text: summary ?? JSON.stringify(result, null, 2) },
    ],
    structuredContent: result,
  })),
  mcpError: jest.fn((error) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
    ],
    isError: true,
  })),
}));

import {
  whoami,
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  duplicateFlow,
  deploy,
  getDeployment,
  listDeployments,
  getDeploymentBySlug,
  createDeployment,
  deleteDeployment,
} from '@walkeros/cli';

const mockExtra = {
  _meta: {},
  sendNotification: jest.fn(),
  signal: undefined,
};

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

describe('api tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerApiTool(server as any);
  });

  it('registers with correct name and annotations', () => {
    const tool = server.getTool('api');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.title).toBe('walkerOS Cloud API');
    expect(config.annotations.openWorldHint).toBe(true);
    expect(config.annotations.destructiveHint).toBe(true);
  });

  describe('auth', () => {
    it('whoami routes correctly', async () => {
      (whoami as jest.Mock).mockResolvedValue({ email: 'test@example.com' });

      const tool = server.getTool('api');
      const result = await tool.handler({ action: 'whoami' }, mockExtra);

      expect(whoami).toHaveBeenCalled();
      expect(result.structuredContent.ok).toBe(true);
      expect(result.structuredContent.action).toBe('whoami');
    });
  });

  describe('projects', () => {
    it('project.list routes correctly', async () => {
      (listProjects as jest.Mock).mockResolvedValue({
        projects: [{ id: '1' }],
      });

      const tool = server.getTool('api');
      const result = await tool.handler({ action: 'project.list' }, mockExtra);

      expect(listProjects).toHaveBeenCalled();
      expect(result.structuredContent.ok).toBe(true);
    });

    it('project.create requires name', async () => {
      const tool = server.getTool('api');
      const result = await tool.handler(
        { action: 'project.create' },
        mockExtra,
      );

      expect(result.isError).toBe(true);
    });

    it('project.create with name', async () => {
      (createProject as jest.Mock).mockResolvedValue({ id: '1', name: 'Test' });

      const tool = server.getTool('api');
      const result = await tool.handler(
        { action: 'project.create', name: 'Test' },
        mockExtra,
      );

      expect(createProject).toHaveBeenCalledWith({ name: 'Test' });
      expect(result.structuredContent.ok).toBe(true);
    });
  });

  describe('flows', () => {
    it('flow.get requires id', async () => {
      const tool = server.getTool('api');
      const result = await tool.handler({ action: 'flow.get' }, mockExtra);

      expect(result.isError).toBe(true);
    });

    it('flow.get routes correctly', async () => {
      (getFlow as jest.Mock).mockResolvedValue({
        id: 'cfg_1',
        name: 'My Flow',
      });

      const tool = server.getTool('api');
      const result = await tool.handler(
        { action: 'flow.get', id: 'cfg_1' },
        mockExtra,
      );

      expect(getFlow).toHaveBeenCalledWith({
        flowId: 'cfg_1',
        fields: undefined,
      });
      expect(result.structuredContent.ok).toBe(true);
    });

    it('flow.create requires name and content', async () => {
      const tool = server.getTool('api');

      const r1 = await tool.handler({ action: 'flow.create' }, mockExtra);
      expect(r1.isError).toBe(true);

      const r2 = await tool.handler(
        { action: 'flow.create', name: 'Test' },
        mockExtra,
      );
      expect(r2.isError).toBe(true);
    });

    it('flow.update uses merge-patch by default', async () => {
      (updateFlow as jest.Mock).mockResolvedValue({ id: 'cfg_1' });

      const tool = server.getTool('api');
      await tool.handler(
        { action: 'flow.update', id: 'cfg_1', content: { version: 1 } },
        mockExtra,
      );

      expect(updateFlow).toHaveBeenCalledWith({
        flowId: 'cfg_1',
        name: undefined,
        content: { version: 1 },
        mergePatch: true,
      });
    });

    it('flow.delete requires id', async () => {
      const tool = server.getTool('api');
      const result = await tool.handler({ action: 'flow.delete' }, mockExtra);

      expect(result.isError).toBe(true);
    });
  });

  describe('deploy', () => {
    it('deploy requires id', async () => {
      const tool = server.getTool('api');
      const result = await tool.handler({ action: 'deploy' }, mockExtra);

      expect(result.isError).toBe(true);
    });

    it('deploy routes correctly', async () => {
      (deploy as jest.Mock).mockResolvedValue({ status: 'active' });

      const tool = server.getTool('api');
      const result = await tool.handler(
        { action: 'deploy', id: 'cfg_1' },
        mockExtra,
      );

      expect(deploy).toHaveBeenCalledWith(
        expect.objectContaining({ flowId: 'cfg_1', wait: true }),
      );
      expect(result.structuredContent.ok).toBe(true);
    });
  });

  describe('deployments', () => {
    it('deployment.create requires type', async () => {
      const tool = server.getTool('api');
      const result = await tool.handler(
        { action: 'deployment.create' },
        mockExtra,
      );

      expect(result.isError).toBe(true);
    });

    it('deployment.create routes correctly', async () => {
      (createDeployment as jest.Mock).mockResolvedValue({ slug: 'abc-123' });

      const tool = server.getTool('api');
      const result = await tool.handler(
        { action: 'deployment.create', type: 'web', name: 'My Deploy' },
        mockExtra,
      );

      expect(createDeployment).toHaveBeenCalledWith({
        type: 'web',
        label: 'My Deploy',
        projectId: undefined,
      });
      expect(result.structuredContent.ok).toBe(true);
    });

    it('deployment.get falls back to slug', async () => {
      (getDeployment as jest.Mock).mockRejectedValue(new Error('Not found'));
      (getDeploymentBySlug as jest.Mock).mockResolvedValue({
        slug: 'abc-123',
        status: 'active',
      });

      const tool = server.getTool('api');
      const result = await tool.handler(
        { action: 'deployment.get', id: 'abc-123' },
        mockExtra,
      );

      expect(getDeployment).toHaveBeenCalled();
      expect(getDeploymentBySlug).toHaveBeenCalledWith({ slug: 'abc-123' });
      expect(result.structuredContent.ok).toBe(true);
    });
  });
});
