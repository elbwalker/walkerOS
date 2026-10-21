/**
 * Reference resources: pure schema and structural data only.
 *
 * Design principle: resources are loaded into context and should contain
 * only schemas, type definitions, and structural references. Behavioral
 * guidance, tutorials, and step-by-step instructions belong in prompts.
 * Vendor-specific examples belong in packages (fetched via package_get).
 */
import { schemas } from '@walkeros/core/dev';
import flowComplete from '@walkeros/cli/examples/flow-complete.json';
import { fetchCatalog } from '../catalog.js';
import type { ResourceContent, StaticResourceSpec } from '../knowledge-spec.js';

const JSON_MIME = 'application/json';

/** A JSON document as resource content. */
function json(value: unknown): ResourceContent {
  return { text: JSON.stringify(value, null, 2), mimeType: JSON_MIME };
}

export const REFERENCE_RESOURCES: readonly StaticResourceSpec[] = [
  // Flow Schema reference (generated from Zod)
  {
    kind: 'static',
    name: 'flow-schema',
    uri: 'walkeros://reference/flow-schema',
    description:
      'JSON Schema for Flow.Json: the complete flow configuration structure',
    mimeType: JSON_MIME,
    read: async () => json(schemas.configJsonSchema),
  },

  // Event Model reference (generated from Zod)
  {
    kind: 'static',
    name: 'event-model',
    uri: 'walkeros://reference/event-model',
    description:
      'JSON Schema for walkerOS events: entity-action naming, data, context, globals, user, consent',
    mimeType: JSON_MIME,
    read: async () => json(schemas.eventJsonSchema),
  },

  // Mapping reference (generated from Zod, composite of related schemas)
  {
    kind: 'static',
    name: 'mapping',
    uri: 'walkeros://reference/mapping',
    description:
      'JSON Schemas for walkerOS mapping: rules, valueConfig, rule, policy',
    mimeType: JSON_MIME,
    read: async () =>
      json({
        rules: schemas.rulesJsonSchema,
        valueConfig: schemas.valueConfigJsonSchema,
        rule: schemas.ruleJsonSchema,
        policy: schemas.policyJsonSchema,
      }),
  },

  // Consent reference (generated from Zod)
  {
    kind: 'static',
    name: 'consent',
    uri: 'walkeros://reference/consent',
    description:
      'JSON Schema for walkerOS consent: destination-level and field-level consent gating',
    mimeType: JSON_MIME,
    read: async () => json(schemas.consentJsonSchema),
  },

  // Variables reference (hand-maintained: runtime interpolation patterns not
  // captured in Zod schemas)
  {
    kind: 'static',
    name: 'variables',
    uri: 'walkeros://reference/variables',
    description:
      'walkerOS variable patterns: $var, $env, $contract, $code, $store, $secret substitution',
    mimeType: JSON_MIME,
    read: async () =>
      json({
        separatorRule:
          '`.` for names and paths; `:` for literal values or raw-code payloads.',
        patterns: {
          '$var.name':
            'Variable reference. Whole-string preserves native type (object, array, scalar). Inline interpolation requires a scalar. Reusable fragments (mapping templates, matcher lists, consent objects) live in the variables block and are referenced by name.',
          '$var.name.deep.path':
            'Deep-path access into a structured variable. Walks nested keys/indices. Whole-string preserves type at the leaf; inline still requires a scalar leaf.',
          '$env.NAME':
            'Environment variable, resolved at bundle/deploy time. $env.GA_ID reads process.env.GA_ID. Use for non-secret config (IDs, hostnames, regions), never for credentials.',
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
            'Managed secret injection (created via the secret manager). The deploy pipeline detects $secret.NAME references and injects the secret value into the server runner’s environment at runtime. Use for credentials, tokens, and private keys. Server flows only; $env does NOT inject managed secrets.',
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
      }),
  },

  // Contract reference (generated from Zod)
  {
    kind: 'static',
    name: 'contract',
    uri: 'walkeros://reference/contract',
    description:
      'JSON Schema for walkerOS contracts: event schema validation with entity-action keying',
    mimeType: JSON_MIME,
    read: async () => json(schemas.contractJsonSchema),
  },

  // Examples reference (inlined from @walkeros/cli at build time, so a host
  // that bundles the server needs no file lookup)
  {
    kind: 'static',
    name: 'examples',
    uri: 'walkeros://reference/examples',
    description:
      'Complete, tested flow config (flow-complete.json): web, server and warehouse flows with mapping, consent, contracts, routes, state, stores and step examples. Its guide is examples/flow-complete.md in @walkeros/cli.',
    mimeType: JSON_MIME,
    read: async () => json(flowComplete),
  },

  // Packages catalog resource
  {
    kind: 'static',
    name: 'packages',
    uri: 'walkeros://reference/packages',
    description:
      'Complete walkerOS package catalog: all sources, destinations, transformers, and stores, as { catalog, count, warnings? }. A failed npm search answers an empty catalog with a warning that says so.',
    mimeType: JSON_MIME,
    read: async () => {
      // The same fields package_search's browse mode answers: a failed npm
      // search is a warning next to an empty catalog, never a silent [].
      const { entries, warnings } = await fetchCatalog();
      return json({
        catalog: entries,
        count: entries.length,
        ...(warnings.length > 0 ? { warnings } : {}),
      });
    },
  },
];
