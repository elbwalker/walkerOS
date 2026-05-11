/**
 * Reference resources — pure schema and structural data only.
 *
 * Design principle: resources are loaded into context and should contain
 * only schemas, type definitions, and structural references. Behavioral
 * guidance, tutorials, and step-by-step instructions belong in prompts.
 * Vendor-specific examples belong in packages (fetched via package_get).
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { schemas } from '@walkeros/core/dev';
import { fetchCatalog } from '../catalog.js';

export function registerReferenceResources(server: McpServer) {
  // Flow Schema reference (generated from Zod)
  server.resource(
    'flow-schema',
    'walkeros://reference/flow-schema',
    {
      description:
        'JSON Schema for Flow.Json — the complete flow configuration structure',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'walkeros://reference/flow-schema',
          text: JSON.stringify(schemas.configJsonSchema, null, 2),
          mimeType: 'application/json',
        },
      ],
    }),
  );

  // Event Model reference (generated from Zod)
  server.resource(
    'event-model',
    'walkeros://reference/event-model',
    {
      description:
        'JSON Schema for walkerOS events: entity-action naming, data, context, globals, user, consent',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'walkeros://reference/event-model',
          text: JSON.stringify(schemas.eventJsonSchema, null, 2),
          mimeType: 'application/json',
        },
      ],
    }),
  );

  // Mapping reference (generated from Zod — composite of related schemas)
  server.resource(
    'mapping',
    'walkeros://reference/mapping',
    {
      description:
        'JSON Schemas for walkerOS mapping: rules, valueConfig, rule, policy',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'walkeros://reference/mapping',
          text: JSON.stringify(
            {
              rules: schemas.rulesJsonSchema,
              valueConfig: schemas.valueConfigJsonSchema,
              rule: schemas.ruleJsonSchema,
              policy: schemas.policyJsonSchema,
            },
            null,
            2,
          ),
          mimeType: 'application/json',
        },
      ],
    }),
  );

  // Consent reference (generated from Zod)
  server.resource(
    'consent',
    'walkeros://reference/consent',
    {
      description:
        'JSON Schema for walkerOS consent: destination-level, rule-level, and field-level consent gating',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'walkeros://reference/consent',
          text: JSON.stringify(schemas.consentJsonSchema, null, 2),
          mimeType: 'application/json',
        },
      ],
    }),
  );

  // Variables reference (hand-maintained — runtime interpolation patterns not captured in Zod schemas)
  server.resource(
    'variables',
    'walkeros://reference/variables',
    {
      description:
        'walkerOS variable patterns: $var, $env, $contract, $code, $store, $secret substitution',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'walkeros://reference/variables',
          text: JSON.stringify(
            {
              separatorRule:
                '`.` for names and paths; `:` for literal values or raw-code payloads.',
              patterns: {
                '$var.name':
                  'Variable reference. Whole-string preserves native type (object, array, scalar). Inline interpolation requires a scalar. Reusable fragments (mapping templates, matcher lists, consent objects) live in the variables block and are referenced by name.',
                '$var.name.deep.path':
                  'Deep-path access into a structured variable. Walks nested keys/indices. Whole-string preserves type at the leaf; inline still requires a scalar leaf.',
                '$env.NAME':
                  'Environment variable. $env.GA_ID reads process.env.GA_ID.',
                '$env.NAME:default':
                  'Environment variable with fallback. $env.GA_ID:G-DEFAULT (the `:` is the literal default separator).',
                '$contract.name':
                  'Contract reference. Links to a named contract for validation.',
                '$contract.name.path':
                  'Nested contract access. $contract.ecommerce.product.',
                '$code:(expr)':
                  'Inline JavaScript. $code:(event) => event.data.price * 100 (the `:` carries the raw-code payload).',
                '$store.storeId':
                  'Store injection in env values. Wires runtime store access.',
                '$secret.NAME':
                  'Secret injection. Resolved server-side at deploy/runtime.',
              },
              cascade: {
                priority: [
                  '1. Step-level variables (highest)',
                  '2. Flow-level variables',
                  '3. Config-level variables (lowest)',
                ],
                example: {
                  variables: {
                    apiUrl: 'https://x.io',
                    mapping: { id: 'data.id' },
                  },
                  flows: {
                    production: {
                      destinations: {
                        api: {
                          config: {
                            url: '$var.apiUrl',
                            idPath: '$var.mapping.id',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            null,
            2,
          ),
          mimeType: 'application/json',
        },
      ],
    }),
  );

  // Contract reference (generated from Zod)
  server.resource(
    'contract',
    'walkeros://reference/contract',
    {
      description:
        'JSON Schema for walkerOS contracts: event schema validation with entity-action keying',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'walkeros://reference/contract',
          text: JSON.stringify(schemas.contractJsonSchema, null, 2),
          mimeType: 'application/json',
        },
      ],
    }),
  );

  // Examples reference (loaded from @walkeros/cli at runtime)
  server.resource(
    'examples',
    'walkeros://reference/examples',
    {
      description:
        'Complete flow config example: web + server flows, mapping, contracts, step examples',
      mimeType: 'application/json',
    },
    async () => {
      let example: string;
      try {
        const { readFileSync } = await import('fs');
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const examplePath =
          require.resolve('@walkeros/cli/examples/flow-complete.json');
        example = readFileSync(examplePath, 'utf-8');
      } catch {
        example = JSON.stringify({ error: 'Example not found' });
      }
      return {
        contents: [
          {
            uri: 'walkeros://reference/examples',
            text: example,
            mimeType: 'application/json',
          },
        ],
      };
    },
  );

  // OpenAPI 3.1 specification for the walkerOS cloud HTTP API
  server.resource(
    'openapi',
    'walkeros://reference/openapi',
    {
      description: 'walkerOS cloud API — OpenAPI 3.1 specification',
      mimeType: 'application/json',
    },
    async () => {
      let openApiSpec: string;
      try {
        const { readFileSync } = await import('fs');
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const specPath = require.resolve('@walkeros/cli/openapi/spec.json');
        openApiSpec = readFileSync(specPath, 'utf-8');
      } catch {
        openApiSpec = JSON.stringify({ error: 'OpenAPI spec not found' });
      }
      return {
        contents: [
          {
            uri: 'walkeros://reference/openapi',
            text: openApiSpec,
            mimeType: 'application/json',
          },
        ],
      };
    },
  );

  // Packages catalog resource
  server.resource(
    'packages',
    'walkeros://reference/packages',
    {
      description:
        'Complete walkerOS package catalog — all sources, destinations, transformers, and stores',
      mimeType: 'application/json',
    },
    async () => {
      const catalog = await fetchCatalog();
      return {
        contents: [
          {
            uri: 'walkeros://reference/packages',
            text: JSON.stringify(catalog, null, 2),
            mimeType: 'application/json',
          },
        ],
      };
    },
  );
}
