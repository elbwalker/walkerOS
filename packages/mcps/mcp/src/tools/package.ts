import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  fetchPackage,
  mergeConfigSchema,
  mcpResult,
  mcpError,
} from '@walkeros/core';
import { PackageSchemaOutputShape } from '../schemas/output.js';
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
      // No outputSchema: browse mode returns {catalog, count}, lookup returns metadata — incompatible shapes
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
        const result = { catalog, count: catalog.length };
        const summary = `${catalog.length} packages found`;
        return mcpResult(result, summary, {
          next: ['Use package_get for schemas and examples'],
        });
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

        const summary = `${info.packageName} v${info.version}`;
        return mcpResult(result, summary, {
          next: ['Use package_get for schemas and examples'],
        });
      } catch (error) {
        return mcpError(
          error,
          'Package not found. Use package_search without parameters to browse available packages.',
        );
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

        // Build merged schemas: base config + package settings → schemas.config
        const mergedSchemas: Record<string, unknown> = {};

        if (info.type) {
          mergedSchemas.config = mergeConfigSchema(
            info.type as 'source' | 'destination' | 'transformer' | 'store',
            info.schemas as Record<string, Record<string, unknown>>,
          );
        }

        // Keep non-settings schemas as siblings (mapping, ga4, tagger, etc.)
        for (const [key, value] of Object.entries(info.schemas)) {
          if (key !== 'settings') {
            mergedSchemas[key] = value;
          }
        }

        const result: Record<string, unknown> = {
          package: info.packageName,
          version: info.version,
          type: info.type,
          platform: info.platform,
          schemas: mergedSchemas,
        };

        // Hints
        if (info.hints) {
          if (section === 'hints' || section === 'all') {
            result.hints = info.hints;
          } else {
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
          result.exampleSummaries = info.exampleSummaries;
        }

        const schemaCount = Object.keys(info.schemas).length;
        const exampleCount = info.exampleSummaries.length;
        const summary = `${info.packageName} — ${schemaCount} schemas, ${exampleCount} examples`;

        return mcpResult(result, summary);
      } catch (error) {
        return mcpError(
          error,
          'Use package_search to browse available package names.',
        );
      }
    },
  );
}
