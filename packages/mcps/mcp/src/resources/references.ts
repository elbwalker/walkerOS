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
import { PACKAGE_REGISTRY } from '../registry.js';

export function registerReferenceResources(server: McpServer) {
  // Flow Schema reference (generated from Zod)
  server.resource(
    'flow-schema',
    'walkeros://reference/flow-schema',
    {
      description:
        'JSON Schema for Flow.Config — the complete flow configuration structure',
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
        'walkerOS variable patterns: $var, $env, $def, $contract, $code, $store substitution',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'walkeros://reference/variables',
          text: JSON.stringify(
            {
              patterns: {
                '$var.name':
                  'Variable substitution — cascade: step settings > flow settings > config variables',
                '$env.NAME':
                  'Environment variable — $env.GA_ID reads process.env.GA_ID',
                '$env.NAME:default':
                  'Environment variable with fallback — $env.GA_ID:G-DEFAULT',
                '$def.name':
                  'Definition reference — reusable config blocks from definitions section',
                '$def.name.path.deep':
                  'Nested definition access — $def.ga4Events.purchase',
                '$contract.name':
                  'Contract reference — links to named contract for validation',
                '$contract.name.path':
                  'Nested contract access — $contract.ecommerce.product',
                '$code:(expr)':
                  'Inline JavaScript — $code:(event) => event.data.price * 100',
                '$store:storeId':
                  'Store injection in env values — wires runtime store access',
              },
              cascade: {
                priority: [
                  '1. Step-level settings (highest)',
                  '2. Flow-level settings',
                  '3. Config-level variables (lowest)',
                ],
                example: {
                  variables: { apiKey: 'default-key' },
                  flows: {
                    production: {
                      destinations: {
                        api: {
                          config: { key: '$var.apiKey' },
                          settings: { apiKey: 'prod-key' },
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

  // API reference (OpenAPI spec)
  server.resource(
    'api',
    'walkeros://reference/api',
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
            uri: 'walkeros://reference/api',
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
    async () => ({
      contents: [
        {
          uri: 'walkeros://reference/packages',
          text: JSON.stringify(PACKAGE_REGISTRY, null, 2),
          mimeType: 'application/json',
        },
      ],
    }),
  );
}
