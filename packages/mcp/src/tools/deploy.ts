import { z } from 'zod';
import { deploy, getDeployment } from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import { apiResult, apiError } from './helpers.js';

function statusToProgress(
  status: string,
  substatus?: string | null,
): { value: number; total: number; message: string } {
  const stages: Record<string, { value: number; message: string }> = {
    bundling: { value: 15, message: 'Bundling...' },
    'bundling:building': { value: 20, message: 'Building bundle...' },
    'bundling:publishing': { value: 80, message: 'Publishing...' },
    deploying: { value: 55, message: 'Deploying...' },
    'deploying:provisioning': {
      value: 50,
      message: 'Provisioning container...',
    },
    'deploying:starting': { value: 65, message: 'Starting container...' },
    published: { value: 100, message: 'Published' },
    active: { value: 100, message: 'Active' },
    failed: { value: 100, message: 'Failed' },
  };

  const key = substatus ? `${status}:${substatus}` : status;
  const stage = stages[key] ?? stages[status] ?? { value: 0, message: status };
  return { value: stage.value, total: 100, message: stage.message };
}

export function registerDeployTools(server: McpServer) {
  server.registerTool(
    'deploy-flow',
    {
      title: 'Deploy Flow',
      description:
        'Deploy a flow to walkerOS cloud. Auto-detects web (script hosting) or server (container) from the flow content. Returns deployment status and public URL.',
      inputSchema: {
        flowId: z.string().describe('Flow ID to deploy'),
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
        wait: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            'Wait for deployment to complete (default: true). Set to false to return immediately after triggering.',
          ),
        flowName: z
          .string()
          .optional()
          .describe(
            'Flow name for multi-config flows. Required when a flow has multiple configs.',
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ flowId, projectId, wait, flowName }, extra) => {
      try {
        const progressToken = extra._meta?.progressToken;

        const result = await deploy({
          flowId,
          projectId,
          wait,
          flowName,
          onStatus: (status, substatus) => {
            if (!progressToken) return;

            const { value, total, message } = statusToProgress(
              status,
              substatus,
            );
            extra.sendNotification({
              method: 'notifications/progress',
              params: { progressToken, progress: value, total, message },
            } as ServerNotification);
          },
          signal: extra.signal,
        });

        return apiResult(result);
      } catch (error) {
        return apiError(error);
      }
    },
  );

  server.registerTool(
    'get-deployment',
    {
      title: 'Get Deployment',
      description:
        'Get the latest deployment status for a flow. Returns deployment type, status, URLs, and error details.',
      inputSchema: {
        flowId: z.string().describe('Flow ID to check'),
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
        flowName: z
          .string()
          .optional()
          .describe(
            'Flow name for multi-config flows. Required when a flow has multiple configs.',
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ flowId, projectId, flowName }) => {
      try {
        return apiResult(await getDeployment({ flowId, projectId, flowName }));
      } catch (error) {
        return apiError(error);
      }
    },
  );
}
