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

import { createSecretManageToolSpec } from '../../tools/secret-manage.js';
import { stubClient } from '../support/stub-client.js';
import {
  structured,
  record,
  textOf,
  isErrorResult,
} from '../support/tool-result.js';

function parse(text: string): unknown {
  return JSON.parse(text);
}

describe('secret_manage tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers with name "secret_manage" and correct annotations', () => {
    const spec = createSecretManageToolSpec(stubClient());
    expect(spec.name).toBe('secret_manage');
    expect(spec.annotations).toEqual({
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
      const tool = createSecretManageToolSpec(stubClient({ listSecrets }));
      const result = await tool.handler({
        action: 'list',
        projectId: 'proj_1',
        flowId: 'flow_1',
      });

      expect(listSecrets).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
      });
      expect(structured(result).secrets).toEqual(payload.secrets);
    });

    it('falls back to the default project when projectId omitted', async () => {
      const listSecrets = jest.fn().mockResolvedValue({ secrets: [] });
      const tool = createSecretManageToolSpec(
        stubClient({ listSecrets, getDefaultProject: () => 'proj_default' }),
      );
      await tool.handler({ action: 'list', flowId: 'flow_1' });

      expect(listSecrets).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'flow_1',
      });
    });

    it('errors with NO_DEFAULT_PROJECT message when no projectId and no default', async () => {
      const listSecrets = jest.fn();
      const tool = createSecretManageToolSpec(
        stubClient({ listSecrets, getDefaultProject: () => null }),
      );
      const result = await tool.handler({
        action: 'list',
        flowId: 'flow_1',
      });

      expect(isErrorResult(result)).toBe(true);
      const parsed = record(parse(textOf(result)));
      expect(parsed.error).toContain('No project selected');
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
      const tool = createSecretManageToolSpec(
        stubClient({ createSecret, getDefaultProject: () => 'proj_default' }),
      );

      const secretValue = 'https://hooks.example.test/super-secret';
      const result = await tool.handler({
        action: 'set',
        flowId: 'flow_1',
        name: 'SLACK_WEBHOOK_URL',
        value: secretValue,
      });

      expect(createSecret).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'flow_1',
        name: 'SLACK_WEBHOOK_URL',
        value: secretValue,
      });
      // Write-mostly invariant: the serialized result must not leak the value.
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(secretValue);
      expect(structured(result).id).toBe('sec_1');
      expect(structured(result).name).toBe('SLACK_WEBHOOK_URL');
    });

    it('errors when value omitted', async () => {
      const tool = createSecretManageToolSpec(
        stubClient({ getDefaultProject: () => 'proj_default' }),
      );
      const result = await tool.handler({
        action: 'set',
        flowId: 'flow_1',
        name: 'SLACK_WEBHOOK_URL',
      });

      expect(isErrorResult(result)).toBe(true);
      const parsed = record(parse(textOf(result)));
      expect(parsed.error).toContain('value is required for set action');
    });

    it('errors when name omitted', async () => {
      const tool = createSecretManageToolSpec(
        stubClient({ getDefaultProject: () => 'proj_default' }),
      );
      const result = await tool.handler({
        action: 'set',
        flowId: 'flow_1',
        value: 'something',
      });

      expect(isErrorResult(result)).toBe(true);
      const parsed = record(parse(textOf(result)));
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
      const tool = createSecretManageToolSpec(
        stubClient({ updateSecret, getDefaultProject: () => 'proj_default' }),
      );

      const rotatedValue = 'https://hooks.example.test/rotated-secret';
      const result = await tool.handler({
        action: 'update',
        flowId: 'flow_1',
        secretId: 'sec_1',
        value: rotatedValue,
      });

      expect(updateSecret).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'flow_1',
        secretId: 'sec_1',
        value: rotatedValue,
      });
      expect(JSON.stringify(result)).not.toContain(rotatedValue);
      expect(structured(result).id).toBe('sec_1');
    });

    it('errors when secretId omitted', async () => {
      const tool = createSecretManageToolSpec(
        stubClient({ getDefaultProject: () => 'proj_default' }),
      );
      const result = await tool.handler({
        action: 'update',
        flowId: 'flow_1',
        value: 'something',
      });

      expect(isErrorResult(result)).toBe(true);
      const parsed = record(parse(textOf(result)));
      expect(parsed.error).toContain('secretId is required for update action');
    });
  });

  describe('delete', () => {
    it('calls deleteSecret and returns a confirmation', async () => {
      const deleteSecret = jest.fn().mockResolvedValue({ success: true });
      const tool = createSecretManageToolSpec(
        stubClient({ deleteSecret, getDefaultProject: () => 'proj_default' }),
      );
      const result = await tool.handler({
        action: 'delete',
        flowId: 'flow_1',
        secretId: 'sec_1',
      });

      expect(deleteSecret).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'flow_1',
        secretId: 'sec_1',
      });
      expect(structured(result).success).toBe(true);
    });

    it('synthesizes a confirmation when the client returns no object', async () => {
      const deleteSecret = jest.fn().mockResolvedValue(undefined);
      const tool = createSecretManageToolSpec(
        stubClient({ deleteSecret, getDefaultProject: () => 'proj_default' }),
      );
      const result = await tool.handler({
        action: 'delete',
        flowId: 'flow_1',
        secretId: 'sec_1',
      });

      expect(structured(result)).toEqual({
        deleted: true,
        secretId: 'sec_1',
      });
    });

    it('errors when secretId omitted', async () => {
      const tool = createSecretManageToolSpec(
        stubClient({ getDefaultProject: () => 'proj_default' }),
      );
      const result = await tool.handler({
        action: 'delete',
        flowId: 'flow_1',
      });

      expect(isErrorResult(result)).toBe(true);
      const parsed = record(parse(textOf(result)));
      expect(parsed.error).toContain('secretId is required for delete action');
    });
  });
});
