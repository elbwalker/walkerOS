import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchPackage } from '@walkeros/core';

const DEFAULT_SOURCES: Record<string, { package: string; config: unknown }> = {
  web: {
    package: '@walkeros/web-source-browser',
    config: {},
  },
  server: {
    package: '@walkeros/server-source-express',
    config: { port: 8080, status: true },
  },
};

function defaultSourceName(platform: string): string {
  return platform === 'web' ? 'browser' : 'express';
}

async function extractRequiredConfig(
  packageName: string,
): Promise<Record<string, string>> {
  try {
    const info = await fetchPackage(packageName);
    const settingsSchema = info.schemas?.settings as
      | { required?: string[]; properties?: Record<string, unknown> }
      | undefined;

    if (!settingsSchema?.required || !settingsSchema.properties) return {};

    const config: Record<string, string> = {};
    for (const key of settingsSchema.required) {
      const prop = settingsSchema.properties[key] as
        | { description?: string }
        | undefined;
      config[key] = `YOUR_${key.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
      if (prop?.description) {
        config[key] = `YOUR_${key.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
      }
    }
    return config;
  } catch {
    return {};
  }
}

function shortName(packageName: string): string {
  // @walkeros/web-destination-gtag → gtag
  // @walkeros/server-source-express → express
  const parts = packageName.split('-');
  return parts[parts.length - 1];
}

export function registerFlowInitTool(server: McpServer) {
  server.registerTool(
    'flow_init',
    {
      title: 'Initialize Flow',
      description:
        'Scaffold a starter flow.json from selected packages. Generates a valid flow config ' +
        'with placeholder values for required settings. Use validate to check the result.',
      inputSchema: {
        platform: z.enum(['web', 'server']).describe('Target platform'),
        destinations: z
          .array(z.string())
          .min(1)
          .describe(
            'Destination package names (e.g., ["@walkeros/web-destination-gtag"])',
          ),
        sources: z
          .array(z.string())
          .optional()
          .describe('Source package names (default: platform default source)'),
        flowName: z
          .string()
          .optional()
          .describe('Flow name (default: "default")'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ platform, destinations, sources, flowName }) => {
      const name = flowName || 'default';

      // Collect all packages
      const packages: Record<string, Record<string, never>> = {};

      // Sources
      const sourceEntries: Record<string, unknown> = {};
      if (sources && sources.length > 0) {
        for (const src of sources) {
          packages[src] = {};
          sourceEntries[shortName(src)] = { package: src, config: {} };
        }
      } else {
        const defaultSrc = DEFAULT_SOURCES[platform];
        packages[defaultSrc.package] = {};
        sourceEntries[defaultSourceName(platform)] = {
          package: defaultSrc.package,
          config: defaultSrc.config,
        };
      }

      // Destinations
      const destinationEntries: Record<string, unknown> = {};
      const configPromises = destinations.map(async (dest) => {
        packages[dest] = {};
        const config = await extractRequiredConfig(dest);
        destinationEntries[shortName(dest)] = {
          package: dest,
          config: Object.keys(config).length > 0 ? config : {},
        };
      });
      await Promise.all(configPromises);

      // Build flow config
      const flowConfig = {
        version: 1,
        flows: {
          [name]: {
            [platform]: {},
            packages,
            sources: sourceEntries,
            destinations: destinationEntries,
          },
        },
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: `Generated flow "${name}" for ${platform} with ${destinations.length} destination(s). Replace YOUR_* placeholders with real values, then use validate to check.`,
          },
          {
            type: 'text' as const,
            text: JSON.stringify(flowConfig, null, 2),
          },
        ],
      };
    },
  );
}
