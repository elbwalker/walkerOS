import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchPackageSchema } from '@walkeros/core';

export function registerGetPackageSchemaTool(server: McpServer) {
  server.registerTool(
    'get-package-schema',
    {
      title: 'Get Package Schema',
      description:
        'Fetch walkerOS package schemas and examples from npm via jsdelivr CDN. ' +
        'Returns JSON Schemas for settings and mapping configuration, plus examples. ' +
        'Use this to understand how to configure a destination, source, or transformer ' +
        'when building a flow.json.',
      inputSchema: {
        package: z
          .string()
          .min(1)
          .describe(
            'Exact npm package name (e.g., @walkeros/web-destination-snowplow)',
          ),
        version: z
          .string()
          .optional()
          .describe('Package version (default: latest)'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ package: packageName, version }) => {
      try {
        const info = await fetchPackageSchema(packageName, { version });

        const result = {
          package: info.packageName,
          version: info.version,
          type: info.type,
          platform: info.platform,
          schemas: info.schemas,
          examples: info.examples,
        };

        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
          structuredContent: result as unknown as Record<string, unknown>,
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
