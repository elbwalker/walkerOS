import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchPackage } from '@walkeros/core';
import {
  PackageSchemaOutputShape,
  PackageSearchOutputShape,
} from '../schemas/output.js';
import { filterRegistry } from '../registry.js';

export function registerPackageSearchTool(server: McpServer) {
  server.registerTool(
    'package_search',
    {
      title: 'Search Package',
      description:
        'Browse walkerOS packages or look up a specific one. Without package name: returns catalog ' +
        'filtered by type/platform. With package name: returns metadata, hint keys, and example summaries.',
      inputSchema: {
        package: z
          .string()
          .min(1)
          .optional()
          .describe(
            'Exact npm package name for detailed lookup (e.g., @walkeros/web-destination-snowplow)',
          ),
        type: z
          .enum(['source', 'destination', 'transformer', 'store'])
          .optional()
          .describe('Filter by package type (browse mode)'),
        platform: z
          .enum(['web', 'server'])
          .optional()
          .describe(
            'Filter by platform (browse mode, includes universal packages)',
          ),
        version: z
          .string()
          .optional()
          .describe('Package version for detailed lookup (default: latest)'),
      },
      outputSchema: PackageSearchOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ package: packageName, type, platform, version }) => {
      // Browse mode: no package specified → return catalog
      if (!packageName) {
        const catalog = filterRegistry({ type, platform });
        const text =
          `Found ${catalog.length} packages` +
          (type ? ` of type "${type}"` : '') +
          (platform ? ` for platform "${platform}"` : '') +
          '.';

        return {
          content: [
            { type: 'text' as const, text },
            {
              type: 'text' as const,
              text: JSON.stringify(catalog, null, 2),
            },
          ],
        };
      }

      // Lookup mode: fetch specific package details
      try {
        const info = await fetchPackage(packageName, { version });

        const result = {
          package: info.packageName,
          version: info.version,
          description: info.description,
          type: info.type,
          platform: info.platform,
          hintKeys: info.hintKeys,
          exampleSummaries: info.exampleSummaries,
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
        'Fetch walkerOS package details from npm. By default returns schemas + hint texts + example summaries (lightweight). ' +
        'Use section parameter to get full content: "hints" (with code blocks), "examples" (full in/out data), ' +
        'or "all" (everything). Use package_search first to browse available packages.',
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
        section: z
          .enum(['hints', 'examples', 'all'])
          .optional()
          .describe(
            'Section to expand with full content. Default: summary view with schemas + hint texts + example descriptions',
          ),
      },
      outputSchema: PackageSchemaOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ package: packageName, version, section }) => {
      try {
        const info = await fetchPackage(packageName, { version });

        const result: Record<string, unknown> = {
          package: info.packageName,
          version: info.version,
          type: info.type,
          platform: info.platform,
          schemas: info.schemas,
        };

        // Hints
        if (info.hints) {
          if (section === 'hints' || section === 'all') {
            // Full hints with code blocks
            result.hints = info.hints;
          } else {
            // Summary: text only, no code blocks
            const hintSummary: Record<string, { text: string }> = {};
            for (const [key, hint] of Object.entries(info.hints)) {
              const h = hint as { text: string };
              hintSummary[key] = { text: h.text };
            }
            result.hints = hintSummary;
          }
        }

        // Examples
        if (section === 'examples' || section === 'all') {
          result.examples = info.examples;
        } else {
          // Summary: names + descriptions only
          result.exampleSummaries = info.exampleSummaries;
        }

        // Text summary
        const schemaCount = Object.keys(info.schemas).length;
        const hintCount = info.hintKeys.length;
        const exampleCount = info.exampleSummaries.length;
        const sectionLabel = section ? ` [section=${section}]` : '';
        const parts = [
          `Package ${info.packageName} v${info.version}`,
          info.type ? `(${info.type}/${info.platform})` : '',
          `- ${schemaCount} schemas, ${exampleCount} examples`,
          hintCount > 0 ? `, ${hintCount} hints` : '',
          sectionLabel,
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
