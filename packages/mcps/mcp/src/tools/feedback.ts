import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';

import type { ToolClient } from '../tool-client.js';

declare const __VERSION__: string;

export function registerFeedbackTool(server: McpServer, client: ToolClient) {
  server.registerTool(
    'feedback',
    {
      title: 'Send Feedback',
      description: 'Send feedback about walkerOS',
      inputSchema: {
        text: z.string().describe('Your feedback text'),
        anonymous: z
          .boolean()
          .optional()
          .describe(
            'Include user/project info? false = include, true = anonymous. Only needed on first call if not yet configured.',
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const { text, anonymous: explicitAnonymous } = params;

        let anonymous = client.getFeedbackPreference();

        if (anonymous === undefined && explicitAnonymous === undefined) {
          return mcpResult(
            { needsConsent: true },
            {
              next: [
                'Ask the user if they want to include their info',
                'Call feedback again with anonymous: true or false',
              ],
            },
          );
        }

        if (anonymous === undefined && explicitAnonymous !== undefined) {
          anonymous = explicitAnonymous;
          client.setFeedbackPreference(anonymous);
        }

        const isAnonymous = explicitAnonymous ?? anonymous ?? true;

        await client.submitFeedback(text, {
          anonymous: isAnonymous,
          version: __VERSION__,
        });

        return mcpResult({ ok: true });
      } catch (error) {
        return mcpError(error);
      }
    },
  );
}
