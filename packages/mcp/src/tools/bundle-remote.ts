import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getApiConfig } from '../api/client.js';

export function registerBundleRemoteTool(server: McpServer) {
  server.registerTool(
    'bundle-remote',
    {
      title: 'Bundle Remote',
      description:
        'Bundle a flow configuration into deployable JavaScript using the walkerOS cloud service. ' +
        'Sends config JSON and receives a compiled .mjs bundle. No local build tools needed.',
      inputSchema: {
        content: z
          .record(z.unknown())
          .describe('Flow.Setup JSON content (must have version: 1)'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ content }) => {
      try {
        const { token, baseUrl } = getApiConfig();
        const response = await fetch(`${baseUrl}/api/bundle`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(content),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            (body as { error?: { message?: string } })?.error?.message ||
              `HTTP ${response.status}`,
          );
        }

        const js = await response.text();
        const statsHeader = response.headers.get('X-Bundle-Stats');
        const result: Record<string, unknown> = {
          success: true,
          bundle: js,
          size: js.length,
        };
        if (statsHeader) {
          try {
            result.stats = JSON.parse(statsHeader);
          } catch {}
        }

        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
