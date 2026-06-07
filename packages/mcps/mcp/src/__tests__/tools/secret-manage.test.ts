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

import { registerSecretManageTool } from '../../tools/secret-manage.js';
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

type StructuredResult = {
  structuredContent: Record<string, unknown>;
  content: Array<{ text: string }>;
};

type ErrorResult = {
  isError: boolean;
  content: Array<{ text: string }>;
};

describe('secret_manage tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
  });

  it('registers with name "secret_manage" and correct annotations', () => {
    registerSecretManageTool(server as never, stubClient());
    const tool = server.getTool('secret_manage');
    expect(tool).toBeDefined();
    const config = tool!.config as { annotations: Record<string, boolean> };
    expect(config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  describe('list', () => {
    it('calls listSecrets with projectId and flowId and returns metadata', async () => {
      const payload = {
        secrets: [
          {
            id: 'sec_1',
            name: 'SLACK_WEBHOOK_URL',
            flowId: 'flow_1',
            createdAt: '2026-06-05T00:00:00.000Z',
            updatedAt: '2026-06-05T00:00:00.000Z',
          },
        ],
      };
      const listSecrets = jest.fn().mockResolvedValue(payload);
      registerSecretManageTool(server as never, stubClient({ listSecrets }));

      const tool = server.getTool('secret_manage')!;
      const result = (await tool.handler({
        action: 'list',
        projectId: 'proj_1',
        flowId: 'flow_1',
      })) as StructuredResult;

      expect(listSecrets).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
      });
      expect(result.structuredContent.secrets).toEqual(payload.secrets);
    });

    it('falls back to the default project when projectId omitted', async () => {
      const listSecrets = jest.fn().mockResolvedValue({ secrets: [] });
      registerSecretManageTool(
        server as never,
        stubClient({ listSecrets, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('secret_manage')!;
      await tool.handler({ action: 'list', flowId: 'flow_1' });

      expect(listSecrets).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'flow_1',
      });
    });

    it('errors with NO_DEFAULT_PROJECT message when no projectId and no default', async () => {
      const listSecrets = jest.fn();
      registerSecretManageTool(
        server as never,
        stubClient({ listSecrets, getDefaultProject: () => null }),
      );

      const tool = server.getTool('secret_manage')!;
      const result = (await tool.handler({
        action: 'list',
        flowId: 'flow_1',
      })) as ErrorResult;

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text) as { error: string };
      expect(parsed.error).toContain('No default project set');
      expect(listSecrets).not.toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('calls createSecret and never echoes the submitted value', async () => {
      const summary = {
        id: 'sec_1',
        name: 'SLACK_WEBHOOK_URL',
        flowId: 'flow_1',
        createdAt: '2026-06-05T00:00:00.000Z',
        updatedAt: '2026-06-05T00:00:00.000Z',
      };
      const createSecret = jest.fn().mockResolvedValue(summary);
      registerSecretManageTool(
        server as never,
        stubClient({ createSecret, getDefaultProject: () => 'proj_default' }),
      );

      const secretValue = 'https://hooks.example.test/super-secret';
      const tool = server.getTool('secret_manage')!;
      const result = (await tool.handler({
        action: 'set',
        flowId: 'flow_1',
        name: 'SLACK_WEBHOOK_URL',
        value: secretValue,
      })) as StructuredResult;

      expect(createSecret).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'flow_1',
        name: 'SLACK_WEBHOOK_URL',
        value: secretValue,
      });
      // Write-mostly invariant: the serialized result must not leak the value.
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(secretValue);
      expect(result.structuredContent.id).toBe('sec_1');
      expect(result.structuredContent.name).toBe('SLACK_WEBHOOK_URL');
    });

    it('errors when value omitted', async () => {
      registerSecretManageTool(
        server as never,
        stubClient({ getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('secret_manage')!;
      const result = (await tool.handler({
        action: 'set',
        flowId: 'flow_1',
        name: 'SLACK_WEBHOOK_URL',
      })) as ErrorResult;

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text) as { error: string };
      expect(parsed.error).toContain('value is required for set action');
    });

    it('errors when name omitted', async () => {
      registerSecretManageTool(
        server as never,
        stubClient({ getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('secret_manage')!;
      const result = (await tool.handler({
        action: 'set',
        flowId: 'flow_1',
        value: 'something',
      })) as ErrorResult;

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text) as { error: string };
      expect(parsed.error).toContain('name is required for set action');
    });
  });

  describe('update', () => {
    it('calls updateSecret and never echoes the submitted value', async () => {
      const summary = {
        id: 'sec_1',
        name: 'SLACK_WEBHOOK_URL',
        flowId: 'flow_1',
        createdAt: '2026-06-05T00:00:00.000Z',
        updatedAt: '2026-06-05T01:00:00.000Z',
      };
      const updateSecret = jest.fn().mockResolvedValue(summary);
      registerSecretManageTool(
        server as never,
        stubClient({ updateSecret, getDefaultProject: () => 'proj_default' }),
      );

      const rotatedValue = 'https://hooks.example.test/rotated-secret';
      const tool = server.getTool('secret_manage')!;
      const result = (await tool.handler({
        action: 'update',
        flowId: 'flow_1',
        secretId: 'sec_1',
        value: rotatedValue,
      })) as StructuredResult;

      expect(updateSecret).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'flow_1',
        secretId: 'sec_1',
        value: rotatedValue,
      });
      expect(JSON.stringify(result)).not.toContain(rotatedValue);
      expect(result.structuredContent.id).toBe('sec_1');
    });

    it('errors when secretId omitted', async () => {
      registerSecretManageTool(
        server as never,
        stubClient({ getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('secret_manage')!;
      const result = (await tool.handler({
        action: 'update',
        flowId: 'flow_1',
        value: 'something',
      })) as ErrorResult;

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text) as { error: string };
      expect(parsed.error).toContain('secretId is required for update action');
    });
  });

  describe('delete', () => {
    it('calls deleteSecret and returns a confirmation', async () => {
      const deleteSecret = jest.fn().mockResolvedValue({ success: true });
      registerSecretManageTool(
        server as never,
        stubClient({ deleteSecret, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('secret_manage')!;
      const result = (await tool.handler({
        action: 'delete',
        flowId: 'flow_1',
        secretId: 'sec_1',
      })) as StructuredResult;

      expect(deleteSecret).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'flow_1',
        secretId: 'sec_1',
      });
      expect(result.structuredContent.success).toBe(true);
    });

    it('synthesizes a confirmation when the client returns no object', async () => {
      const deleteSecret = jest.fn().mockResolvedValue(undefined);
      registerSecretManageTool(
        server as never,
        stubClient({ deleteSecret, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('secret_manage')!;
      const result = (await tool.handler({
        action: 'delete',
        flowId: 'flow_1',
        secretId: 'sec_1',
      })) as StructuredResult;

      expect(result.structuredContent).toEqual({
        deleted: true,
        secretId: 'sec_1',
      });
    });

    it('errors when secretId omitted', async () => {
      registerSecretManageTool(
        server as never,
        stubClient({ getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('secret_manage')!;
      const result = (await tool.handler({
        action: 'delete',
        flowId: 'flow_1',
      })) as ErrorResult;

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text) as { error: string };
      expect(parsed.error).toContain('secretId is required for delete action');
    });
  });
});
