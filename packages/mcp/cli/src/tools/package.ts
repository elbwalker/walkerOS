import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchPackageSchema, fetchPackageMeta } from '@walkeros/core';
import {
  PackageSchemaOutputShape,
  PackageSearchOutputShape,
} from '../schemas/output.js';

export function registerPackageSearchTool(server: McpServer) {
  server.registerTool(
    'package_search',
    {
      title: 'Search Package',
      description:
        'Look up a walkerOS package to see its metadata (type, platform, version, description) ' +
        'without fetching full schemas and examples. Use this to browse packages before ' +
        'calling package_get for full configuration details.',
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
      outputSchema: PackageSearchOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ package: packageName, version }) => {
      try {
        const info = await fetchPackageMeta(packageName, { version });

        const result = {
          package: info.packageName,
          version: info.version,
          description: info.description,
          type: info.type,
          platform: info.platform,
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

export function registerGetPackageSchemaTool(server: McpServer) {
  server.registerTool(
    'package_get',
    {
      title: 'Get Package',
      description:
        'Fetch full walkerOS package details including JSON Schemas and examples from npm via jsdelivr CDN. ' +
        'Returns settings and mapping configuration schemas, plus configuration examples. ' +
        'Use package_search first to browse, then this tool for full details.',
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
      outputSchema: PackageSchemaOutputShape,
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

        const result: Record<string, unknown> = {
          package: info.packageName,
          version: info.version,
          type: info.type,
          platform: info.platform,
          schemas: info.schemas,
          examples: info.examples,
        };

        if (info.hints) {
          result.hints = info.hints;
        }

        const schemaCount = Object.keys(info.schemas).length;
        const exampleCount = Object.keys(info.examples).length;
        const hintCount = info.hints ? Object.keys(info.hints).length : 0;
        const parts = [
          `Package ${info.packageName} v${info.version}`,
          info.type ? `(${info.type}/${info.platform})` : '',
          `— ${schemaCount} schemas, ${exampleCount} examples`,
          hintCount > 0 ? `, ${hintCount} hints` : '',
        ];
        const summary = parts.filter(Boolean).join(' ');

        return {
          content: [{ type: 'text' as const, text: summary }],
          structuredContent: result,
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
