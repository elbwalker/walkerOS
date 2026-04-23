import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';

declare const __VERSION__: string;

const TITLE = 'Send Feedback';
const DESCRIPTION = 'Send feedback about walkerOS';

const inputSchema = {
  text: z.string().describe('Your feedback text'),
  anonymous: z
    .boolean()
    .optional()
    .describe(
      'Include user/project info? false = include, true = anonymous. Only needed on first call if not yet configured.',
    ),
};

const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export function createFeedbackToolSpec(client: ToolClient): ToolSpec {
  return {
    name: 'feedback',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => feedbackHandlerBody(client, input),
  };
}

async function feedbackHandlerBody(client: ToolClient, input: unknown) {
  const { text, anonymous: explicitAnonymous } = (input ?? {}) as {
    text: string;
    anonymous?: boolean;
  };
  try {
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
}

export function registerFeedbackTool(server: McpServer, client: ToolClient) {
  const spec = createFeedbackToolSpec(client);
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      annotations: spec.annotations,
    },
    // SDK infers handler type from inputSchema shape; ToolSpec.handler is the
    // type-erased (input: unknown) => Promise<unknown> form by design.
    spec.handler as Parameters<typeof server.registerTool>[2],
  );
}
