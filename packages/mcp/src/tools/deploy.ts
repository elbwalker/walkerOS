import { z } from 'zod';
import { deploy, getDeployment } from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiResult, apiError } from './helpers.js';

export function registerDeployTools(server: McpServer) {
  server.registerTool(
    'deploy-flow',
    {
      title: 'Deploy Flow',
      description:
        'Deploy a flow to walkerOS cloud. Auto-detects web (script hosting) or server (container) from the flow content. Returns deployment status, and for web deploys the public URL and script tag.',
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
    async ({ flowId, projectId, wait, flowName }) => {
      try {
        return apiResult(await deploy({ flowId, projectId, wait, flowName }));
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
