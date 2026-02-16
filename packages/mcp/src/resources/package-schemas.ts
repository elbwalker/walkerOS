import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchPackageSchema } from '@walkeros/core';

const KNOWN_PACKAGES = [
  '@walkeros/web-destination-google-ga4',
  '@walkeros/web-destination-meta-pixel',
  '@walkeros/web-destination-plausible',
  '@walkeros/web-destination-snowplow',
  '@walkeros/web-destination-piwikpro',
  '@walkeros/web-destination-etag',
  '@walkeros/web-destination-bigquery',
  '@walkeros/web-source-walker',
  '@walkeros/web-source-datalayer',
];

export function registerPackageSchemaResources(server: McpServer) {
  const template = new ResourceTemplate('walkeros://schema/{packageName}', {
    list: async () => ({
      resources: KNOWN_PACKAGES.map((pkg) => ({
        uri: `walkeros://schema/${encodeURIComponent(pkg)}`,
        name: pkg,
        description: `Schema and examples for ${pkg}`,
        mimeType: 'application/json' as const,
      })),
    }),
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
