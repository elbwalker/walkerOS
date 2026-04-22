import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  feedback,
  getFeedbackPreference,
  setFeedbackPreference,
} from '@walkeros/cli';
import { mcpResult, mcpError } from '@walkeros/core';

declare const __VERSION__: string;

export function registerFeedbackTool(server: McpServer) {
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

        let anonymous = getFeedbackPreference();

        // First time: need user's consent choice
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

        // Store preference if this is the first time
        if (anonymous === undefined && explicitAnonymous !== undefined) {
          anonymous = explicitAnonymous;
          setFeedbackPreference(anonymous);
        }

        // Use explicit override if provided, otherwise use stored value
        const isAnonymous = explicitAnonymous ?? anonymous ?? true;

        await feedback(text, { anonymous: isAnonymous, version: __VERSION__ });

        return mcpResult({ ok: true });
      } catch (error) {
        return mcpError(error);
      }
    },
  );
}
