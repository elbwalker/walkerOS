import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchPackageSchema } from '@walkeros/core';
import { fetchCatalog } from '../catalog.js';

export function registerPackageSchemaResources(server: McpServer) {
  const template = new ResourceTemplate('walkeros://schema/{packageName}', {
    list: async () => {
      const catalog = await fetchCatalog();
      return {
        resources: catalog.map((pkg) => ({
          uri: `walkeros://schema/${encodeURIComponent(pkg.name)}`,
          name: pkg.name,
          description: `Schema and examples for ${pkg.name}`,
          mimeType: 'application/json' as const,
        })),
      };
    },
  });

  server.registerResource(
    'package-schema',
    template,
    {
      title: 'walkerOS Package Schema',
      description:
        'JSON Schema and configuration examples for walkerOS packages',
      mimeType: 'application/json',
    },
    async (uri, { packageName }) => {
      const info = await fetchPackageSchema(
        decodeURIComponent(packageName as string),
      );
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json' as const,
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    },
  );
}
