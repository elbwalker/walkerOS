import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchPackage, mcpResult, mcpError } from '@walkeros/core';
import { mergeConfigSchema } from '@walkeros/core/dev';
import { fetchCatalog, normalizePlatform } from '../catalog.js';

import type { ToolSpec } from '../tool-spec.js';

// ---------- package_search ----------

const SEARCH_TITLE = 'Search Package';
const SEARCH_DESCRIPTION =
  'Start here for package discovery. Never guess package names: use this tool first to find exact names. ' +
  'Without package name: returns catalog filtered by type/platform. ' +
  'With package name: returns metadata, hint keys, and example summaries.';

const searchInputSchema = {
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
    .describe('Filter by platform (browse mode, includes universal packages)'),
  version: z
    .string()
    .optional()
    .describe('Package version for detailed lookup (default: latest)'),
};

const searchAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function createPackageSearchToolSpec(): ToolSpec {
  return {
    name: 'package_search',
    title: SEARCH_TITLE,
    description: SEARCH_DESCRIPTION,
    inputSchema: searchInputSchema,
    annotations: searchAnnotations,
    handler: (input) => packageSearchHandlerBody(input),
  };
}

async function packageSearchHandlerBody(input: unknown) {
  const {
    package: packageName,
    type,
    platform,
    version,
  } = (input ?? {}) as {
    package?: string;
    type?: 'source' | 'destination' | 'transformer' | 'store';
    platform?: 'web' | 'server';
    version?: string;
  };
  const baseUrl = process.env.APP_URL || undefined;

  // Browse mode: no package specified → return catalog
  if (!packageName) {
    const catalog = await fetchCatalog({ type, platform, baseUrl });
    const result = { catalog, count: catalog.length };
    return mcpResult(result, {
      next: ['Use package_get for schemas and examples'],
    });
  }

  // Lookup mode: fetch specific package details
  try {
    const info = await fetchPackage(packageName, { version, baseUrl });

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
}

export function registerPackageSearchTool(server: McpServer) {
  const spec = createPackageSearchToolSpec();
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      // No outputSchema: browse mode returns {catalog, count}, lookup returns metadata — incompatible shapes
      annotations: spec.annotations,
    },
    // SDK infers handler type from inputSchema shape; ToolSpec.handler is the
    // type-erased (input: unknown) => Promise<unknown> form by design.
    spec.handler as Parameters<typeof server.registerTool>[2],
  );
}

// ---------- package_get ----------

const GET_TITLE = 'Get Package';
const GET_DESCRIPTION =
  'Requires exact package name: do not guess names, use package_search first to find them. ' +
  'Returns schemas + hint texts + example summaries by default (lightweight). ' +
  'Use section parameter for full content: "hints" (with code blocks), "examples" (full in/out data), or "all".';

const getInputSchema = {
  package: z
    .string()
    .min(1)
    .describe(
      'Exact npm package name (e.g., @walkeros/web-destination-snowplow)',
    ),
  version: z.string().optional().describe('Package version (default: latest)'),
  section: z
    .enum(['hints', 'examples', 'all'])
    .optional()
    .describe(
      'Section to expand with full content. Default: summary view with schemas + hint texts + example descriptions',
    ),
};

const getAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function createPackageGetToolSpec(): ToolSpec {
  return {
    name: 'package_get',
    title: GET_TITLE,
    description: GET_DESCRIPTION,
    inputSchema: getInputSchema,
    annotations: getAnnotations,
    handler: (input) => packageGetHandlerBody(input),
  };
}

async function packageGetHandlerBody(input: unknown) {
  const {
    package: packageName,
    version,
    section,
  } = (input ?? {}) as {
    package: string;
    version?: string;
    section?: 'hints' | 'examples' | 'all';
  };
  const baseUrl = process.env.APP_URL || undefined;

  try {
    const info = await fetchPackage(packageName, { version, baseUrl });

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
}

export function registerGetPackageSchemaTool(server: McpServer) {
  const spec = createPackageGetToolSpec();
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      // No outputSchema: removed to avoid SDK -32602 crashes on unexpected field values
      annotations: spec.annotations,
    },
    // SDK infers handler type from inputSchema shape; ToolSpec.handler is the
    // type-erased (input: unknown) => Promise<unknown> form by design.
    spec.handler as Parameters<typeof server.registerTool>[2],
  );
}
