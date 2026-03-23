import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  fetchPackage,
  mergeConfigSchema,
  mcpResult,
  mcpError,
} from '@walkeros/core';
import { fetchCatalog, normalizePlatform } from '../catalog.js';

export function registerPackageSearchTool(server: McpServer) {
  server.registerTool(
    'package_search',
    {
      title: 'Search Package',
      description:
        'Start here for package discovery. Never guess package names — use this tool first to find exact names. ' +
        'Without package name: returns catalog filtered by type/platform. ' +
        'With package name: returns metadata, hint keys, and example summaries.',
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
        const catalog = await fetchCatalog({ type, platform });
        const result = { catalog, count: catalog.length };
        return mcpResult(result, {
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
          platform: normalizePlatform(info.platform),
          hintKeys: info.hintKeys,
          exampleSummaries: info.exampleSummaries,
        };

        return mcpResult(result, {
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
        'Requires exact package name — do not guess names, use package_search first to find them. ' +
        'Returns schemas + hint texts + example summaries by default (lightweight). ' +
        'Use section parameter for full content: "hints" (with code blocks), "examples" (full in/out data), or "all".',
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
      // No outputSchema — removed to avoid SDK -32602 crashes on unexpected field values
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
          platform: normalizePlatform(info.platform),
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

        return mcpResult(result);
      } catch (error) {
        return mcpError(
          error,
          'Use package_search to browse available package names.',
        );
      }
    },
  );
}
