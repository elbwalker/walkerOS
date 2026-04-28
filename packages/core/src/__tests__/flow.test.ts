import { z } from 'zod';
import {
  JsonSchema,
  FlowSchema,
  ConfigSchema,
  SourceSchema,
  DestinationSchema,
  PrimitiveSchema,
  parseConfig,
  safeParseConfig,
  parseFlow,
  safeParseFlow,
  configJsonSchema,
  flowJsonSchema,
  sourceJsonSchema,
  destinationJsonSchema,
} from '../schemas/flow';
import { getFlowSettings, getPlatform, packageNameToVariable } from '../flow';
import type { Flow } from '../types';

describe('Flow Schemas', () => {
  // ========================================
  // v4 Schema Shape Tests
  // ========================================

  describe('v4 schema', () => {
    test('rejects v3 shape', () => {
      const v3 = { version: 3, flows: { web: { web: {} } } };
      const ok = JsonSchema.safeParse(v3).success;
      expect(ok).toBe(false);
    });

    test('accepts new config shape', () => {
      const v4 = {
        version: 4,
        flows: {
          server: {
            config: {
              platform: 'server',
              url: 'https://api.example.com/collect',
              bundle: { packages: { '@walkeros/server-source-express': {} } },
            },
          },
        },
      };
      expect(JsonSchema.safeParse(v4).success).toBe(true);
    });

    test('rejects unknown platform value', () => {
      const bad = {
        version: 4,
        flows: { x: { config: { platform: 'edge' } } },
      };
      expect(JsonSchema.safeParse(bad).success).toBe(false);
    });
  });

  // ========================================
  // PrimitiveSchema Tests
  // ========================================

  describe('PrimitiveSchema', () => {
    test('accepts string values', () => {
      expect(PrimitiveSchema.parse('test')).toBe('test');
      expect(PrimitiveSchema.parse('')).toBe('');
      expect(PrimitiveSchema.parse('USD')).toBe('USD');
    });

    test('accepts number values', () => {
      expect(PrimitiveSchema.parse(42)).toBe(42);
      expect(PrimitiveSchema.parse(0)).toBe(0);
      expect(PrimitiveSchema.parse(-1)).toBe(-1);
      expect(PrimitiveSchema.parse(3.14)).toBe(3.14);
    });

    test('accepts boolean values', () => {
      expect(PrimitiveSchema.parse(true)).toBe(true);
      expect(PrimitiveSchema.parse(false)).toBe(false);
    });

    test('rejects other types', () => {
      expect(() => PrimitiveSchema.parse(null)).toThrow();
      expect(() => PrimitiveSchema.parse(undefined)).toThrow();
      expect(() => PrimitiveSchema.parse({})).toThrow();
      expect(() => PrimitiveSchema.parse([])).toThrow();
    });
  });

  // ========================================
  // SourceSchema Tests
  // ========================================

  describe('SourceSchema', () => {
    test('accepts valid source reference with minimal fields', () => {
      const validSource = {
        package: '@walkeros/web-source-browser',
      };
      expect(SourceSchema.parse(validSource)).toEqual(validSource);
    });

    test('accepts source reference with all fields', () => {
      const validSource = {
        package: '@walkeros/web-source-browser@2.0.0',
        config: {
          settings: {
            pageview: true,
            session: true,
          },
        },
        env: {
          debug: true,
        },
        primary: true,
      };
      expect(SourceSchema.parse(validSource)).toEqual(validSource);
    });

    test('accepts package with version specifiers', () => {
      expect(
        SourceSchema.parse({
          package: '@walkeros/web-source-browser@2.0.0',
        }),
      ).toHaveProperty('package', '@walkeros/web-source-browser@2.0.0');

      expect(
        SourceSchema.parse({
          package: '@walkeros/web-source-browser@^2.0.0',
        }),
      ).toHaveProperty('package', '@walkeros/web-source-browser@^2.0.0');

      expect(
        SourceSchema.parse({
          package: '@walkeros/web-source-browser@latest',
        }),
      ).toHaveProperty('package', '@walkeros/web-source-browser@latest');
    });

    test('rejects empty package name', () => {
      expect(() => SourceSchema.parse({ package: '' })).toThrow(
        'Package name cannot be empty',
      );
    });

    test('accepts empty object (runtime validation requires package or code)', () => {
      // Schema allows empty object; bundler validates that package or code is present
      expect(() => SourceSchema.parse({})).not.toThrow();
    });

    test('accepts inline code object', () => {
      const validSource = {
        code: {
          type: 'logger',
          push: '$code:(event) => console.log(event)',
        },
        config: {},
      };
      expect(() => SourceSchema.parse(validSource)).not.toThrow();
    });

    test('allows unknown config structure', () => {
      const validSource = {
        package: '@walkeros/web-source-browser',
        config: {
          anything: 'goes',
          nested: { deeply: { structured: true } },
        },
      };
      expect(SourceSchema.parse(validSource)).toEqual(validSource);
    });
  });

  // ========================================
  // DestinationSchema Tests
  // ========================================

  describe('DestinationSchema', () => {
    test('accepts valid destination reference with minimal fields', () => {
      const validDest = {
        package: '@walkeros/web-destination-gtag',
      };
      expect(DestinationSchema.parse(validDest)).toEqual(validDest);
    });

    test('accepts destination reference with all fields', () => {
      const validDest = {
        package: '@walkeros/web-destination-gtag@2.0.0',
        config: {
          settings: {
            ga4: {
              measurementId: 'G-XXXXXXXXXX',
            },
          },
          mapping: {
            page: {
              view: {
                name: 'page_view',
              },
            },
          },
        },
        env: {
          production: true,
        },
      };
      expect(DestinationSchema.parse(validDest)).toEqual(validDest);
    });

    test('rejects empty package name', () => {
      expect(() => DestinationSchema.parse({ package: '' })).toThrow(
        'Package name cannot be empty',
      );
    });

    test('accepts empty object (runtime validation requires package or code)', () => {
      // Schema allows empty object; bundler validates that package or code is present
      expect(() => DestinationSchema.parse({})).not.toThrow();
    });

    test('accepts inline code object', () => {
      const validDest = {
        code: {
          type: 'logger',
          push: '$code:(event) => console.log(event)',
        },
        config: {},
      };
      expect(() => DestinationSchema.parse(validDest)).not.toThrow();
    });
  });

  // ========================================
  // FlowSchema Tests (single flow)
  // ========================================

  describe('FlowSchema', () => {
    test('accepts minimal valid web flow', () => {
      const validFlow = {
        config: { platform: 'web' },
      };
      expect(() => FlowSchema.parse(validFlow)).not.toThrow();
    });

    test('accepts minimal valid server flow', () => {
      const validFlow = {
        config: { platform: 'server' },
      };
      expect(() => FlowSchema.parse(validFlow)).not.toThrow();
    });

    test('accepts complete valid server flow', () => {
      const validFlow = {
        config: {
          platform: 'server',
          bundle: {
            packages: {
              '@walkeros/collector': { version: 'latest' },
            },
          },
        },
        sources: {
          gcp: {
            package: '@walkeros/server-source-gcp',
            config: { port: 8080 },
          },
        },
        destinations: {
          api: {
            package: '@walkeros/server-destination-api',
            config: { endpoint: 'https://api.example.com' },
          },
        },
        collector: {
          globals: {
            currency: 'USD',
          },
        },
        variables: {
          API_KEY: 'secret',
          DEBUG: 'false',
        },
      };
      expect(() => FlowSchema.parse(validFlow)).not.toThrow();
    });

    test('accepts complete valid web flow', () => {
      const validFlow = {
        config: {
          platform: 'web',
          settings: {
            windowCollector: 'collector',
            windowElb: 'elb',
          },
          bundle: {
            packages: {
              '@walkeros/collector': { imports: ['startFlow'] },
            },
          },
        },
        sources: {
          browser: {
            package: '@walkeros/web-source-browser',
            config: { pageview: true },
          },
        },
        destinations: {
          gtag: {
            package: '@walkeros/web-destination-gtag',
            config: { measurementId: 'G-123' },
          },
        },
        variables: { GA_ID: 'G-123' },
        definitions: { mapping: {} },
      };
      expect(() => FlowSchema.parse(validFlow)).not.toThrow();
    });

    test('accepts empty flow (config is optional)', () => {
      expect(() => FlowSchema.parse({})).not.toThrow();
    });

    test('rejects flow with invalid platform value', () => {
      expect(() => FlowSchema.parse({ config: { platform: 'edge' } })).toThrow(
        z.ZodError,
      );
    });

    test('accepts variables at flow level', () => {
      const flow = {
        config: { platform: 'web' },
        variables: {
          STRING: 'value',
          NUMBER: 42,
          BOOLEAN: true,
        },
      };
      const parsed = FlowSchema.parse(flow);
      expect(parsed.variables).toEqual({
        STRING: 'value',
        NUMBER: 42,
        BOOLEAN: true,
      });
    });

    test('accepts definitions at flow level', () => {
      const flow = {
        config: { platform: 'web' },
        definitions: {
          mapping1: { page: { view: { name: 'page_view' } } },
          mapping2: ['array', 'values'],
        },
      };
      const parsed = FlowSchema.parse(flow);
      expect(parsed.definitions).toEqual({
        mapping1: { page: { view: { name: 'page_view' } } },
        mapping2: ['array', 'values'],
      });
    });

    test('accepts bundle.packages inside config', () => {
      const flow = {
        config: {
          platform: 'web',
          bundle: {
            packages: {
              '@walkeros/collector': {
                version: 'latest',
                imports: ['startFlow'],
              },
              '@walkeros/web-source-browser': { version: '^2.0.0' },
            },
          },
        },
      };
      const parsed = FlowSchema.parse(flow);
      expect(parsed.config?.bundle?.packages).toBeDefined();
    });
  });

  // ========================================
  // JsonSchema Tests (root walkeros.config.json)
  // ========================================

  describe('JsonSchema', () => {
    test('accepts minimal valid setup', () => {
      const validSetup = {
        version: 4 as const,
        flows: {
          prod: {
            config: { platform: 'web' },
          },
        },
      };
      expect(() => JsonSchema.parse(validSetup)).not.toThrow();
    });

    test('accepts complete valid setup', () => {
      const validSetup = {
        version: 4 as const,
        $schema: 'https://walkeros.io/schema/flow/v4.json',
        variables: {
          CURRENCY: 'USD',
          GA4_ID: 'G-XXXXXXXXXX',
        },
        definitions: {
          gtag_base_mapping: {
            page: {
              view: { name: 'page_view' },
            },
          },
        },
        flows: {
          web_prod: {
            config: { platform: 'web' },
            sources: {
              browser: {
                package: '@walkeros/web-source-browser',
              },
            },
            destinations: {
              gtag: {
                package: '@walkeros/web-destination-gtag',
              },
            },
          },
          server_prod: {
            config: { platform: 'server' },
            destinations: {
              api: {
                package: '@walkeros/server-destination-api',
              },
            },
          },
        },
      };
      expect(() => JsonSchema.parse(validSetup)).not.toThrow();
    });

    test('requires version field', () => {
      expect(() =>
        JsonSchema.parse({
          flows: { prod: { config: { platform: 'web' } } },
        }),
      ).toThrow();
    });

    test('requires version to be 4', () => {
      expect(() =>
        JsonSchema.parse({
          version: 1,
          flows: { prod: { config: { platform: 'web' } } },
        }),
      ).toThrow();

      expect(() =>
        JsonSchema.parse({
          version: 3,
          flows: { prod: { config: { platform: 'web' } } },
        }),
      ).toThrow();

      expect(
        JsonSchema.parse({
          version: 4,
          flows: { prod: { config: { platform: 'web' } } },
        }),
      ).toBeDefined();
    });

    test('validates $schema as URL when provided', () => {
      expect(() =>
        JsonSchema.parse({
          version: 4,
          $schema: 'not-a-url',
          flows: { prod: { config: { platform: 'web' } } },
        }),
      ).toThrow();

      expect(
        JsonSchema.parse({
          version: 4,
          $schema: 'https://walkeros.io/schema/flow/v4.json',
          flows: { prod: { config: { platform: 'web' } } },
        }),
      ).toHaveProperty('$schema', 'https://walkeros.io/schema/flow/v4.json');
    });

    test('requires at least one flow', () => {
      expect(() =>
        JsonSchema.parse({
          version: 4,
          flows: {},
        }),
      ).toThrow('At least one flow is required');
    });

    test('validates variables as primitive record', () => {
      expect(
        JsonSchema.parse({
          version: 4,
          variables: {
            STRING: 'value',
            NUMBER: 42,
            BOOLEAN: true,
          },
          flows: { prod: { config: { platform: 'web' } } },
        }),
      ).toHaveProperty('variables', {
        STRING: 'value',
        NUMBER: 42,
        BOOLEAN: true,
      });
    });

    test('allows unknown definitions structure', () => {
      const validSetup = {
        version: 4 as const,
        definitions: {
          mapping1: { complex: { nested: { structure: true } } },
          mapping2: ['array', 'values'],
          mapping3: 'simple string',
        },
        flows: {
          prod: { config: { platform: 'web' } },
        },
      };
      expect(() => JsonSchema.parse(validSetup)).not.toThrow();
    });

    test('validates multiple flows with different platforms', () => {
      const validSetup = {
        version: 4 as const,
        flows: {
          web_prod: { config: { platform: 'web' } },
          web_stage: { config: { platform: 'web' } },
          server_prod: { config: { platform: 'server' } },
          server_stage: { config: { platform: 'server' } },
        },
      };
      expect(() => JsonSchema.parse(validSetup)).not.toThrow();
    });

    test('accepts optional contract property', () => {
      const setup = {
        version: 4 as const,
        contract: {
          default: {
            events: {
              product: {
                add: { properties: { data: { type: 'object' } } },
              },
            },
          },
        },
        flows: { default: { config: { platform: 'web' } } },
      };
      const result = JsonSchema.parse(setup);
      expect(result.contract).toBeDefined();
    });
  });

  // ========================================
  // Helper Function Tests
  // ========================================

  describe('parseConfig', () => {
    test('successfully parses valid setup', () => {
      const validSetup = {
        version: 4,
        flows: {
          prod: { config: { platform: 'web' } },
        },
      };
      expect(() => parseConfig(validSetup)).not.toThrow();
    });

    test('throws ZodError for invalid setup', () => {
      expect(() => parseConfig({})).toThrow(z.ZodError);
      expect(() => parseConfig({ version: 4 })).toThrow(z.ZodError);
    });
  });

  describe('safeParseConfig', () => {
    test('returns success for valid setup', () => {
      const validSetup = {
        version: 4,
        flows: {
          prod: { config: { platform: 'web' } },
        },
      };
      const result = safeParseConfig(validSetup);
      expect(result.success).toBe(true);
    });

    test('returns error for invalid setup', () => {
      const result = safeParseConfig({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(z.ZodError);
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    test('provides detailed error messages', () => {
      const result = safeParseConfig({
        version: 4,
        flows: {},
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessages = result.error.issues.map((issue) => issue.message);
        expect(errorMessages).toContain('At least one flow is required');
      }
    });
  });

  describe('parseFlow', () => {
    test('successfully parses valid flow', () => {
      const validFlow = { config: { platform: 'web' } };
      expect(() => parseFlow(validFlow)).not.toThrow();
    });

    test('parses empty flow (config optional)', () => {
      expect(() => parseFlow({})).not.toThrow();
    });

    test('throws ZodError for invalid flow', () => {
      expect(() => parseFlow({ config: { platform: 'invalid' } })).toThrow(
        z.ZodError,
      );
    });
  });

  describe('safeParseFlow', () => {
    test('returns success for valid flow', () => {
      const validFlow = { config: { platform: 'server' } };
      const result = safeParseFlow(validFlow);
      expect(result.success).toBe(true);
    });

    test('returns error for invalid flow', () => {
      const result = safeParseFlow({ config: { platform: 'invalid' } });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(z.ZodError);
      }
    });
  });

  // ========================================
  // JSON Schema Generation Tests
  // ========================================

  describe('JSON Schema Generation', () => {
    /**
     * Since adding `.meta({id,title})` to schemas, Zod 4 emits top-level
     * schemas as `{ $schema, allOf: [{ $ref: '#/definitions/X' }], definitions: {X: {...}} }`
     * instead of inline `{ type: 'object', properties: {...} }`. Helper walks the
     * definitions container to validate the inner shape.
     */
    interface SchemaWithDefinitions {
      allOf?: Array<{ $ref?: string }>;
      definitions?: Record<string, Record<string, unknown>>;
    }
    const getRootDefinition = (
      schema: SchemaWithDefinitions,
    ): Record<string, unknown> => {
      const ref = schema.allOf?.[0]?.$ref;
      const definitions = schema.definitions;
      if (!ref || !definitions) {
        throw new Error('Schema missing allOf/definitions structure');
      }
      const match = ref.match(/^#\/definitions\/(.+)$/);
      if (!match) throw new Error(`Unexpected $ref: ${ref}`);
      return definitions[match[1]];
    };

    test('configJsonSchema is valid JSON Schema', () => {
      expect(configJsonSchema).toHaveProperty('$schema');
      const root = getRootDefinition(configJsonSchema);
      expect(root).toHaveProperty('type', 'object');
      expect(root.properties).toHaveProperty('version');
      expect(root.properties).toHaveProperty('flows');
    });

    test('flowJsonSchema is valid JSON Schema', () => {
      expect(flowJsonSchema).toHaveProperty('$schema');
      const root = getRootDefinition(flowJsonSchema);
      expect(root).toHaveProperty('properties');
      expect(root.properties).toHaveProperty('config');
      expect(root.properties).toHaveProperty('sources');
      expect(root.properties).toHaveProperty('destinations');
    });

    test('sourceJsonSchema is valid JSON Schema', () => {
      expect(sourceJsonSchema).toHaveProperty('$schema');
      const root = getRootDefinition(sourceJsonSchema);
      expect(root).toHaveProperty('properties');
      expect(root.properties).toHaveProperty('package');
    });

    test('destinationJsonSchema is valid JSON Schema', () => {
      expect(destinationJsonSchema).toHaveProperty('$schema');
      const root = getRootDefinition(destinationJsonSchema);
      expect(root).toHaveProperty('properties');
      expect(root.properties).toHaveProperty('package');
    });
  });

  // ========================================
  // Real-world Scenario Tests
  // ========================================

  describe('Real-world Scenarios', () => {
    test('complete multi-flow setup', () => {
      const realWorldSetup = {
        version: 4,
        $schema: 'https://walkeros.io/schema/flow/v4.json',
        variables: {
          CURRENCY: 'USD',
          REGION: 'us-east-1',
        },
        definitions: {
          base_collector: {},
          gtag_mapping: {
            page: {
              view: { name: 'page_view' },
            },
            product: {
              view: { name: 'view_item' },
              add: { name: 'add_to_cart' },
            },
          },
        },
        flows: {
          web_production: {
            config: { platform: 'web' },
            sources: {
              browser: {
                package: '@walkeros/web-source-browser@2.0.0',
                config: {
                  settings: {
                    pageview: true,
                    session: true,
                  },
                },
                primary: true,
              },
            },
            destinations: {
              gtag: {
                package: '@walkeros/web-destination-gtag@2.0.0',
                config: {
                  settings: {
                    ga4: {
                      measurementId: 'G-PROD123',
                    },
                  },
                },
              },
            },
            collector: {
              globals: {
                currency: 'USD',
                environment: 'production',
              },
            },
            variables: {
              DEBUG: 'false',
            },
          },
          web_staging: {
            config: { platform: 'web' },
            sources: {
              browser: {
                package: '@walkeros/web-source-browser@2.0.0',
                config: {
                  settings: {
                    pageview: true,
                    session: true,
                  },
                },
                primary: true,
              },
            },
            destinations: {
              gtag: {
                package: '@walkeros/web-destination-gtag@2.0.0',
                config: {
                  settings: {
                    ga4: {
                      measurementId: 'G-STAGE456',
                    },
                  },
                },
              },
            },
            collector: {
              globals: {
                currency: 'USD',
                environment: 'staging',
              },
            },
            variables: {
              DEBUG: 'true',
            },
          },
          server_production: {
            config: { platform: 'server' },
            sources: {
              gcp: {
                package: '@walkeros/server-source-gcp@1.0.0',
                config: {
                  port: 8080,
                },
              },
            },
            destinations: {
              api: {
                package: '@walkeros/server-destination-api@1.0.0',
                config: {
                  endpoint: 'https://api.example.com',
                },
              },
            },
          },
        },
      };

      expect(() => parseConfig(realWorldSetup)).not.toThrow();
      const parsed = parseConfig(realWorldSetup);
      expect(Object.keys(parsed.flows)).toHaveLength(3);
      expect(parsed.flows.web_production.config?.platform).toBe('web');
      expect(parsed.flows.server_production.config?.platform).toBe('server');
    });

    test('setup with variable interpolation structure', () => {
      const setupWithVars = {
        version: 4,
        variables: {
          GA4_PROD: 'G-PROD123',
          GA4_STAGE: 'G-STAGE456',
          CURRENCY: 'USD',
        },
        flows: {
          prod: {
            config: { platform: 'web' },
            variables: {
              GA4_ID: 'G-PROD123', // Would be interpolated from $var.GA4_PROD
            },
          },
        },
      };

      expect(() => parseConfig(setupWithVars)).not.toThrow();
    });

    test('setup with definition reference structure', () => {
      const setupWithRefs = {
        version: 4,
        definitions: {
          common_mapping: {
            page: { view: { name: 'page_view' } },
          },
        },
        flows: {
          prod: {
            config: { platform: 'web' },
            destinations: {
              gtag: {
                package: '@walkeros/web-destination-gtag',
                config: {
                  mapping: '$def.common_mapping',
                },
              },
            },
          },
        },
      };

      expect(() => parseConfig(setupWithRefs)).not.toThrow();
    });
  });

  // ========================================
  // Edge Cases and Error Handling
  // ========================================

  describe('Edge Cases', () => {
    test('handles empty strings in package names correctly', () => {
      expect(() => SourceSchema.parse({ package: '' })).toThrow(
        'Package name cannot be empty',
      );
    });

    test('handles null and undefined appropriately', () => {
      expect(() => JsonSchema.parse(null)).toThrow();
      expect(() => JsonSchema.parse(undefined)).toThrow();
    });

    test('handles deeply nested flow structures', () => {
      const deepFlow = {
        config: { platform: 'web' },
        destinations: {
          dest1: {
            package: '@scope/package',
            config: {
              level1: {
                level2: {
                  level3: {
                    level4: {
                      deepValue: 'found',
                    },
                  },
                },
              },
            },
          },
        },
      };
      expect(() => FlowSchema.parse(deepFlow)).not.toThrow();
    });

    test('validates flow names are non-empty strings', () => {
      const setup = {
        version: 4,
        flows: {
          '': { config: { platform: 'web' } }, // Empty string key
        },
      };
      // Zod record allows empty string keys, but this might be caught at application level
      expect(() => JsonSchema.parse(setup)).not.toThrow();
    });
  });

  // ========================================
  // New Features Tests
  // ========================================

  describe('Variables at Source/Destination Level', () => {
    test('accepts variables at source level', () => {
      const flow = {
        config: { platform: 'web' },
        sources: {
          browser: {
            package: '@walkeros/web-source-browser',
            variables: {
              SOURCE_VAR: 'source-specific',
              DEBUG: true,
            },
          },
        },
      };
      const parsed = FlowSchema.parse(flow);
      expect(parsed.sources?.browser.variables).toEqual({
        SOURCE_VAR: 'source-specific',
        DEBUG: true,
      });
    });

    test('accepts variables at destination level', () => {
      const flow = {
        config: { platform: 'web' },
        destinations: {
          gtag: {
            package: '@walkeros/web-destination-gtag',
            variables: {
              GA_ID: 'G-DEST-123',
              MEASUREMENT_ID: 'G-XYZ',
            },
          },
        },
      };
      const parsed = FlowSchema.parse(flow);
      expect(parsed.destinations?.gtag.variables).toEqual({
        GA_ID: 'G-DEST-123',
        MEASUREMENT_ID: 'G-XYZ',
      });
    });

    test('validates variables cascade from root to flow to source/destination', () => {
      const setup = {
        version: 4,
        variables: {
          GLOBAL: 'setup-level',
          OVERRIDE_TEST: 'setup',
        },
        flows: {
          prod: {
            config: { platform: 'web' },
            variables: {
              OVERRIDE_TEST: 'config',
              CONFIG_VAR: 'config-level',
            },
            destinations: {
              gtag: {
                package: '@walkeros/web-destination-gtag',
                variables: {
                  OVERRIDE_TEST: 'destination',
                  DEST_VAR: 'dest-level',
                },
              },
            },
          },
        },
      };
      expect(() => JsonSchema.parse(setup)).not.toThrow();
    });
  });

  describe('Definitions at Source/Destination Level', () => {
    test('accepts definitions at source level', () => {
      const flow = {
        config: { platform: 'web' },
        sources: {
          browser: {
            package: '@walkeros/web-source-browser',
            definitions: {
              sourceMapping: {
                page: { view: { name: 'source_page_view' } },
              },
            },
          },
        },
      };
      const parsed = FlowSchema.parse(flow);
      expect(parsed.sources?.browser.definitions).toBeDefined();
    });

    test('accepts definitions at destination level', () => {
      const flow = {
        config: { platform: 'web' },
        destinations: {
          gtag: {
            package: '@walkeros/web-destination-gtag',
            definitions: {
              destMapping: {
                product: { view: { name: 'view_item' } },
              },
            },
          },
        },
      };
      const parsed = FlowSchema.parse(flow);
      expect(parsed.destinations?.gtag.definitions).toBeDefined();
    });

    test('validates definitions cascade structure', () => {
      const setup = {
        version: 4,
        definitions: {
          commonMapping: {
            page: { view: { name: 'page_view' } },
          },
        },
        flows: {
          prod: {
            config: { platform: 'web' },
            definitions: {
              envMapping: {
                product: { view: { name: 'view_item' } },
              },
            },
            destinations: {
              gtag: {
                package: '@walkeros/web-destination-gtag',
                definitions: {
                  destMapping: {
                    order: { complete: { name: 'purchase' } },
                  },
                },
              },
            },
          },
        },
      };
      expect(() => JsonSchema.parse(setup)).not.toThrow();
    });
  });

  describe('Packages Schema (inside config.bundle)', () => {
    test('accepts packages with version only', () => {
      const flow = {
        config: {
          platform: 'web',
          bundle: {
            packages: {
              '@walkeros/collector': { version: 'latest' },
              '@walkeros/web-source-browser': { version: '^2.0.0' },
            },
          },
        },
      };
      const parsed = FlowSchema.parse(flow);
      expect(
        parsed.config?.bundle?.packages?.['@walkeros/collector'].version,
      ).toBe('latest');
    });

    test('accepts packages with imports only', () => {
      const flow = {
        config: {
          platform: 'web',
          bundle: {
            packages: {
              '@walkeros/collector': { imports: ['startFlow', 'Collector'] },
            },
          },
        },
      };
      const parsed = FlowSchema.parse(flow);
      expect(
        parsed.config?.bundle?.packages?.['@walkeros/collector'].imports,
      ).toEqual(['startFlow', 'Collector']);
    });

    test('accepts packages with both version and imports', () => {
      const flow = {
        config: {
          platform: 'web',
          bundle: {
            packages: {
              '@walkeros/collector': {
                version: '2.0.0',
                imports: ['startFlow'],
              },
              '@walkeros/web-destination-gtag': {
                version: 'latest',
                imports: ['destinationGtag'],
              },
            },
          },
        },
      };
      const parsed = FlowSchema.parse(flow);
      expect(parsed.config?.bundle?.packages?.['@walkeros/collector']).toEqual({
        version: '2.0.0',
        imports: ['startFlow'],
      });
    });

    test('accepts packages with no properties (empty object)', () => {
      const flow = {
        config: {
          platform: 'web',
          bundle: {
            packages: {
              '@walkeros/collector': {},
            },
          },
        },
      };
      expect(() => FlowSchema.parse(flow)).not.toThrow();
    });

    test('accepts bundle.overrides for transitive deps', () => {
      const flow = {
        config: {
          platform: 'web',
          bundle: {
            overrides: {
              '@amplitude/analytics-types': '2.11.1',
            },
          },
        },
      };
      const parsed = FlowSchema.parse(flow);
      expect(
        parsed.config?.bundle?.overrides?.['@amplitude/analytics-types'],
      ).toBe('2.11.1');
    });

    test('validates complete setup with packages at flow.config level', () => {
      const setup = {
        version: 4,
        flows: {
          prod: {
            config: {
              platform: 'web',
              settings: { windowCollector: 'tracker' },
              bundle: {
                packages: {
                  '@walkeros/collector': {
                    version: '2.0.0',
                    imports: ['startFlow'],
                  },
                  '@walkeros/web-source-browser': {
                    version: '^2.0.0',
                    imports: ['sourceBrowser'],
                  },
                  '@walkeros/web-destination-gtag': {
                    imports: ['destinationGtag'],
                  },
                },
              },
            },
          },
        },
      };
      expect(() => JsonSchema.parse(setup)).not.toThrow();
    });
  });

  describe('Platform Validation', () => {
    test('config with web platform accepts free-form settings', () => {
      const flow = {
        config: {
          platform: 'web',
          settings: { windowCollector: 'customCollector' },
        },
      };
      const parsed = FlowSchema.parse(flow);
      expect(parsed.config?.settings?.windowCollector).toBe('customCollector');
    });

    test('config with server platform accepts free-form settings', () => {
      const flow = {
        config: { platform: 'server', settings: { extra: 'value' } },
      };
      expect(() => FlowSchema.parse(flow)).not.toThrow();
    });

    test('config requires platform to be web or server', () => {
      expect(() => FlowSchema.parse({ config: { platform: 'edge' } })).toThrow(
        z.ZodError,
      );
    });

    test('config.url is optional but must be non-empty when present', () => {
      expect(() =>
        FlowSchema.parse({
          config: { platform: 'web', url: 'https://example.com/collect' },
        }),
      ).not.toThrow();
      expect(() =>
        FlowSchema.parse({ config: { platform: 'web', url: '' } }),
      ).toThrow(z.ZodError);
    });
  });
});

// ========================================
// getFlowSettings Tests
// ========================================

describe('getFlowSettings', () => {
  describe('code resolution from package', () => {
    test('does not set code if package not in packages config', () => {
      const setup: Flow.Json = {
        version: 4,
        flows: {
          default: {
            config: {
              platform: 'server',
              bundle: { packages: {} }, // Empty packages
            },
            sources: {
              http: {
                package: '@walkeros/server-source-express',
                config: {},
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.sources?.http.code).toBeUndefined();
    });

    test('auto-generates code when not provided', () => {
      const setup: Flow.Json = {
        version: 4,
        flows: {
          default: {
            config: {
              platform: 'server',
              bundle: {
                packages: {
                  '@walkeros/server-source-express': {
                    version: 'latest',
                  },
                },
              },
            },
            sources: {
              http: {
                package: '@walkeros/server-source-express',
                config: {},
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.sources?.http.code).toBe('_walkerosServerSourceExpress');
    });

    test('auto-generates code for multiple sources and destinations when not provided', () => {
      const setup: Flow.Json = {
        version: 4,
        flows: {
          default: {
            config: {
              platform: 'server',
              bundle: {
                packages: {
                  '@walkeros/server-source-express': {},
                  '@walkeros/destination-demo': {},
                  '@walkeros/server-destination-gcp': {},
                },
              },
            },
            sources: {
              http: {
                package: '@walkeros/server-source-express',
                config: {},
              },
            },
            destinations: {
              demo: {
                package: '@walkeros/destination-demo',
                config: {},
              },
              bigquery: {
                package: '@walkeros/server-destination-gcp',
                config: {},
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.sources?.http.code).toBe('_walkerosServerSourceExpress');
      expect(config.destinations?.demo.code).toBe('_walkerosDestinationDemo');
      expect(config.destinations?.bigquery.code).toBe(
        '_walkerosServerDestinationGcp',
      );
    });
  });

  describe('flow selection', () => {
    test('auto-selects single flow', () => {
      const setup: Flow.Json = {
        version: 4,
        flows: {
          default: { config: { platform: 'web' } },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.config?.platform).toBe('web');
    });

    test('throws for multiple flows without name', () => {
      const setup: Flow.Json = {
        version: 4,
        flows: {
          prod: { config: { platform: 'web' } },
          stage: { config: { platform: 'web' } },
        },
      };
      expect(() => getFlowSettings(setup)).toThrow('Multiple flows found');
    });

    test('selects named flow', () => {
      const setup: Flow.Json = {
        version: 4,
        flows: {
          prod: { config: { platform: 'web' } },
          stage: { config: { platform: 'server' } },
        },
      };
      const config = getFlowSettings(setup, 'stage');
      expect(config.config?.platform).toBe('server');
    });
  });
});

// ========================================
// Pattern Resolution Tests ($def, $var, $env)
// ========================================

describe('Pattern Resolution', () => {
  describe('$def.name - Definition References', () => {
    test('resolves $def.name to definition content', () => {
      const setup: Flow.Json = {
        version: 4,
        definitions: {
          commonMapping: {
            page: { view: { name: 'page_view' } },
          },
        },
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              gtag: {
                package: '@walkeros/web-destination-gtag',
                config: {
                  mapping: '$def.commonMapping',
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.destinations?.gtag.config).toEqual({
        mapping: { page: { view: { name: 'page_view' } } },
      });
    });

    test('resolves nested $def references', () => {
      const setup: Flow.Json = {
        version: 4,
        definitions: {
          inner: { key: 'value' },
          outer: { nested: '$def.inner' },
        },
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              test: {
                package: '@walkeros/test',
                config: {
                  data: '$def.outer',
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.destinations?.test.config).toEqual({
        data: { nested: { key: 'value' } },
      });
    });

    test('throws for missing definition', () => {
      const setup: Flow.Json = {
        version: 4,
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              test: {
                package: '@walkeros/test',
                config: {
                  data: '$def.nonExistent',
                },
              },
            },
          },
        },
      };
      expect(() => getFlowSettings(setup)).toThrow(
        'Definition "nonExistent" not found',
      );
    });

    test('definition cascade: destination level overrides setup level', () => {
      const setup: Flow.Json = {
        version: 4,
        definitions: {
          mapping: { setup: true },
        },
        flows: {
          default: {
            config: { platform: 'web' },
            definitions: {
              mapping: { config: true },
            },
            destinations: {
              test: {
                package: '@walkeros/test',
                definitions: {
                  mapping: { destination: true },
                },
                config: {
                  data: '$def.mapping',
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.destinations?.test.config).toEqual({
        data: { destination: true },
      });
    });
  });

  describe('$var.name - Variable References', () => {
    test('resolves $var.name to variable value', () => {
      const setup: Flow.Json = {
        version: 4,
        variables: {
          measurementId: 'G-TEST123',
        },
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              gtag: {
                package: '@walkeros/web-destination-gtag',
                config: {
                  id: '$var.measurementId',
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.destinations?.gtag.config).toEqual({
        id: 'G-TEST123',
      });
    });

    test('resolves multiple $var references in same string', () => {
      const setup: Flow.Json = {
        version: 4,
        variables: {
          host: 'api.example.com',
          version: 'v2',
        },
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              api: {
                package: '@walkeros/api',
                config: {
                  endpoint: 'https://$var.host/$var.version/collect',
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.destinations?.api.config).toEqual({
        endpoint: 'https://api.example.com/v2/collect',
      });
    });

    test('throws for missing variable', () => {
      const setup: Flow.Json = {
        version: 4,
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              test: {
                package: '@walkeros/test',
                config: {
                  value: '$var.nonExistent',
                },
              },
            },
          },
        },
      };
      expect(() => getFlowSettings(setup)).toThrow(
        'Variable "nonExistent" not found',
      );
    });

    test('variable cascade: destination level overrides setup level', () => {
      const setup: Flow.Json = {
        version: 4,
        variables: {
          id: 'setup-id',
        },
        flows: {
          default: {
            config: { platform: 'web' },
            variables: {
              id: 'config-id',
            },
            destinations: {
              test: {
                package: '@walkeros/test',
                variables: {
                  id: 'destination-id',
                },
                config: {
                  value: '$var.id',
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.destinations?.test.config).toEqual({
        value: 'destination-id',
      });
    });

    test('converts number variables to strings', () => {
      const setup: Flow.Json = {
        version: 4,
        variables: {
          port: 8080,
        },
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              test: {
                package: '@walkeros/test',
                config: {
                  url: 'http://localhost:$var.port',
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.destinations?.test.config).toEqual({
        url: 'http://localhost:8080',
      });
    });
  });

  describe('$env.NAME - Environment Variable References', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('resolves $env.NAME from process.env', () => {
      process.env.GA4_ID = 'G-ENV123';
      const setup: Flow.Json = {
        version: 4,
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              gtag: {
                package: '@walkeros/web-destination-gtag',
                config: {
                  id: '$env.GA4_ID',
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.destinations?.gtag.config).toEqual({
        id: 'G-ENV123',
      });
    });

    test('uses default value when env var not set', () => {
      delete process.env.MISSING_VAR;
      const setup: Flow.Json = {
        version: 4,
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              test: {
                package: '@walkeros/test',
                config: {
                  value: '$env.MISSING_VAR:default-value',
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.destinations?.test.config).toEqual({
        value: 'default-value',
      });
    });

    test('throws when env var missing and no default', () => {
      delete process.env.REQUIRED_VAR;
      const setup: Flow.Json = {
        version: 4,
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              test: {
                package: '@walkeros/test',
                config: {
                  value: '$env.REQUIRED_VAR',
                },
              },
            },
          },
        },
      };
      expect(() => getFlowSettings(setup)).toThrow(
        'Environment variable "REQUIRED_VAR" not found and no default provided',
      );
    });

    test('env var takes precedence over default when set', () => {
      process.env.MY_VAR = 'from-env';
      const setup: Flow.Json = {
        version: 4,
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              test: {
                package: '@walkeros/test',
                config: {
                  value: '$env.MY_VAR:default-value',
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.destinations?.test.config).toEqual({
        value: 'from-env',
      });
    });
  });

  describe('Combined Patterns', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('resolves $var inside $def content', () => {
      const setup: Flow.Json = {
        version: 4,
        variables: {
          currency: 'USD',
        },
        definitions: {
          mapping: {
            currency: '$var.currency',
          },
        },
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              test: {
                package: '@walkeros/test',
                config: {
                  data: '$def.mapping',
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.destinations?.test.config).toEqual({
        data: { currency: 'USD' },
      });
    });

    test('resolves $env inside $def content', () => {
      process.env.API_KEY = 'secret-key';
      const setup: Flow.Json = {
        version: 4,
        definitions: {
          apiConfig: {
            key: '$env.API_KEY',
          },
        },
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              test: {
                package: '@walkeros/test',
                config: {
                  api: '$def.apiConfig',
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.destinations?.test.config).toEqual({
        api: { key: 'secret-key' },
      });
    });

    test('handles complex nested structure with all pattern types', () => {
      process.env.ENV_VALUE = 'from-env';
      const setup: Flow.Json = {
        version: 4,
        variables: {
          varValue: 'from-var',
        },
        definitions: {
          inner: {
            env: '$env.ENV_VALUE',
            var: '$var.varValue',
          },
          outer: {
            nested: '$def.inner',
            static: 'unchanged',
          },
        },
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              test: {
                package: '@walkeros/test',
                config: {
                  data: '$def.outer',
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.destinations?.test.config).toEqual({
        data: {
          nested: {
            env: 'from-env',
            var: 'from-var',
          },
          static: 'unchanged',
        },
      });
    });

    test('uses $var as default value for $env when env not set', () => {
      delete process.env.GA4_ID;
      const setup: Flow.Json = {
        version: 4,
        variables: {
          ga4Default: 'G-FALLBACK123',
        },
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              gtag: {
                package: '@walkeros/web-destination-gtag',
                config: {
                  measurementId: '$env.GA4_ID:$var.ga4Default',
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.destinations?.gtag.config).toEqual({
        measurementId: 'G-FALLBACK123',
      });
    });

    test('env value takes precedence over $var default', () => {
      process.env.GA4_ID = 'G-FROM-ENV';
      const setup: Flow.Json = {
        version: 4,
        variables: {
          ga4Default: 'G-FALLBACK123',
        },
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              gtag: {
                package: '@walkeros/web-destination-gtag',
                config: {
                  measurementId: '$env.GA4_ID:$var.ga4Default',
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.destinations?.gtag.config).toEqual({
        measurementId: 'G-FROM-ENV',
      });
    });
  });

  describe('transformer pattern resolution', () => {
    test('resolves $var in transformer config', () => {
      const setup: Flow.Json = {
        version: 4,
        variables: { apiUrl: 'https://api.example.com' },
        flows: {
          default: {
            config: { platform: 'web' },
            transformers: {
              enricher: {
                package: '@walkeros/transformer-enricher',
                config: {
                  settings: { url: '$var.apiUrl' },
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.transformers?.enricher?.config).toEqual({
        settings: { url: 'https://api.example.com' },
      });
    });

    test('resolves $def in transformer config', () => {
      const setup: Flow.Json = {
        version: 4,
        definitions: {
          fpRule: {
            match: { key: 'method', operator: 'eq', value: 'GET' },
            ttl: 300,
          },
        },
        flows: {
          default: {
            config: { platform: 'server' },
            transformers: {
              fp: {
                package: '@walkeros/server-transformer-fingerprint',
                config: {
                  settings: { rules: ['$def.fpRule'] },
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.transformers?.fp?.config).toEqual({
        settings: {
          rules: [
            {
              match: { key: 'method', operator: 'eq', value: 'GET' },
              ttl: 300,
            },
          ],
        },
      });
    });

    test('resolves $env in transformer config (deferred)', () => {
      const setup: Flow.Json = {
        version: 4,
        flows: {
          default: {
            config: { platform: 'server' },
            transformers: {
              fp: {
                package: '@walkeros/server-transformer-fingerprint',
                config: {
                  settings: { secret: '$env.API_SECRET:default_secret' },
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup, undefined, {
        deferred: true,
      });
      expect(config.transformers?.fp?.config).toEqual({
        settings: { secret: '__WALKEROS_ENV:API_SECRET:default_secret' },
      });
    });

    test('transformer-level variables override flow variables', () => {
      const setup: Flow.Json = {
        version: 4,
        variables: { ttl: '300' },
        flows: {
          default: {
            config: { platform: 'server' },
            transformers: {
              fp: {
                package: '@walkeros/server-transformer-fingerprint',
                variables: { ttl: '600' },
                config: {
                  settings: { ttl: '$var.ttl' },
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.transformers?.fp?.config).toEqual({
        settings: { ttl: '600' },
      });
    });
  });

  describe('env pattern resolution', () => {
    test('resolves $var in source env', () => {
      const setup: Flow.Json = {
        version: 4,
        variables: { storeRef: 'myStore' },
        flows: {
          default: {
            config: { platform: 'web' },
            sources: {
              browser: {
                package: '@walkeros/web-source-browser',
                config: {},
                env: { custom: '$var.storeRef' },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.sources?.browser?.env).toEqual({ custom: 'myStore' });
    });

    test('resolves $var in transformer env', () => {
      const setup: Flow.Json = {
        version: 4,
        variables: { storeRef: 'myStore' },
        flows: {
          default: {
            config: { platform: 'web' },
            transformers: {
              fp: {
                package: '@walkeros/server-transformer-fingerprint',
                config: {},
                env: { custom: '$var.storeRef' },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.transformers?.fp?.env).toEqual({ custom: 'myStore' });
    });

    test('resolves $var in destination env', () => {
      const setup: Flow.Json = {
        version: 4,
        variables: { storeRef: 'myStore' },
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              api: {
                package: '@walkeros/web-destination-api',
                config: {},
                env: { custom: '$var.storeRef' },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.destinations?.api?.env).toEqual({ custom: 'myStore' });
    });

    test('resolves $var in store env', () => {
      const setup: Flow.Json = {
        version: 4,
        variables: { region: 'eu-west-1' },
        flows: {
          default: {
            config: { platform: 'server' },
            stores: {
              cache: {
                package: '@walkeros/store-memory',
                config: {},
                env: { region: '$var.region' },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup);
      expect(config.stores?.cache?.env).toEqual({ region: 'eu-west-1' });
    });
  });
});

// ========================================
// Deferred Env Resolution Tests
// ========================================

describe('deferred env resolution', () => {
  const makeSetup = (collector: Record<string, unknown>) => ({
    version: 4 as const,
    flows: {
      test: {
        config: { platform: 'server' as const },
        collector,
        destinations: {},
      },
    },
  });

  it('returns __WALKEROS_ENV: marker instead of resolving $env when deferred', () => {
    const setup = makeSetup({ url: 'https://api.example.com/$env.API_KEY' });
    const config = getFlowSettings(setup, 'test', { deferred: true });
    expect(config.collector).toEqual({
      url: 'https://api.example.com/__WALKEROS_ENV:API_KEY',
    });
  });

  it('returns marker with default value notation', () => {
    const setup = makeSetup({ host: '$env.HOST:localhost' });
    const config = getFlowSettings(setup, 'test', { deferred: true });
    expect(config.collector).toEqual({
      host: '__WALKEROS_ENV:HOST:localhost',
    });
  });

  it('preserves colon in default values (e.g. URLs)', () => {
    const setup = makeSetup({
      url: '$env.REDIS_URL:redis://localhost:6379',
    });
    const config = getFlowSettings(setup, 'test', { deferred: true });
    expect(config.collector).toEqual({
      url: '__WALKEROS_ENV:REDIS_URL:redis://localhost:6379',
    });
  });

  it('resolves $env normally when deferred is false', () => {
    process.env.TEST_SECRET = 'hunter2';
    const setup = makeSetup({ key: '$env.TEST_SECRET' });
    const config = getFlowSettings(setup, 'test', { deferred: false });
    expect(config.collector).toEqual({ key: 'hunter2' });
    delete process.env.TEST_SECRET;
  });

  it('resolves $env normally when no options passed', () => {
    process.env.TEST_SECRET = 'hunter2';
    const setup = makeSetup({ key: '$env.TEST_SECRET' });
    const config = getFlowSettings(setup, 'test');
    expect(config.collector).toEqual({ key: 'hunter2' });
    delete process.env.TEST_SECRET;
  });
});

// ========================================
// getPlatform Tests
// ========================================

describe('getPlatform', () => {
  test('returns web for web config', () => {
    expect(getPlatform({ config: { platform: 'web' } })).toBe('web');
  });

  test('returns server for server config', () => {
    expect(getPlatform({ config: { platform: 'server' } })).toBe('server');
  });

  test('throws for config without platform', () => {
    expect(() => getPlatform({})).toThrow(
      'Flow must have config.platform set to "web" or "server"',
    );
  });
});

// ========================================
// packageNameToVariable Tests
// ========================================

describe('packageNameToVariable', () => {
  test('converts scoped package names to valid variable names', () => {
    expect(packageNameToVariable('@walkeros/server-destination-api')).toBe(
      '_walkerosServerDestinationApi',
    );
  });

  test('converts unscoped package names', () => {
    expect(packageNameToVariable('lodash')).toBe('lodash');
  });

  test('handles multiple hyphens and slashes', () => {
    expect(packageNameToVariable('@custom/my-helper')).toBe('_customMyHelper');
    expect(packageNameToVariable('@scope/package-name-test')).toBe(
      '_scopePackageNameTest',
    );
  });

  test('handles package names with numbers', () => {
    expect(packageNameToVariable('@walkeros/web-destination-gtag')).toBe(
      '_walkerosWebDestinationGtag',
    );
  });
});

// ========================================
// resolveCodeFromPackage with default exports
// ========================================

describe('resolveCodeFromPackage - default export fallback', () => {
  test('auto-generates code when not provided', () => {
    const setup: Flow.Json = {
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'server',
            bundle: {
              packages: {
                '@walkeros/server-destination-api': {}, // No imports specified
              },
            },
          },
          destinations: {
            api: {
              package: '@walkeros/server-destination-api',
              config: {},
            },
          },
        },
      },
    };
    const config = getFlowSettings(setup);
    expect(config.destinations?.api.code).toBe('_walkerosServerDestinationApi');
  });

  test('uses explicit code when provided', () => {
    const setup: Flow.Json = {
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'server',
            bundle: {
              packages: {
                '@walkeros/server-destination-api': {},
              },
            },
          },
          destinations: {
            api: {
              package: '@walkeros/server-destination-api',
              code: 'myCustomCode', // Explicit code should be preserved
              config: {},
            },
          },
        },
      },
    };
    const config = getFlowSettings(setup);
    expect(config.destinations?.api.code).toBe('myCustomCode');
  });

  test('uses explicit code for named exports', () => {
    const setup: Flow.Json = {
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'server',
            bundle: {
              packages: {
                '@walkeros/server-destination-gcp': {},
              },
            },
          },
          destinations: {
            bq: {
              package: '@walkeros/server-destination-gcp',
              code: 'destinationBigQuery',
              config: {},
            },
          },
        },
      },
    };
    const config = getFlowSettings(setup);
    expect(config.destinations?.bq.code).toBe('destinationBigQuery');
  });

  test('auto-generates code for multiple destinations with same package', () => {
    const setup: Flow.Json = {
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'web',
            bundle: {
              packages: {
                '@walkeros/web-destination-api': {},
              },
            },
          },
          destinations: {
            api1: {
              package: '@walkeros/web-destination-api',
              config: { endpoint: 'https://api1.example.com' },
            },
            api2: {
              package: '@walkeros/web-destination-api',
              config: { endpoint: 'https://api2.example.com' },
            },
          },
        },
      },
    };
    const config = getFlowSettings(setup);
    expect(config.destinations?.api1.code).toBe('_walkerosWebDestinationApi');
    expect(config.destinations?.api2.code).toBe('_walkerosWebDestinationApi');
  });
});

describe('$contract edge cases', () => {
  test('$def aliasing works with $contract', () => {
    const setup: Flow.Json = {
      version: 4,
      contract: {
        web: {
          globals: { required: ['country'] },
          consent: { required: ['analytics'] },
          events: {
            product: { view: { properties: { data: { required: ['id'] } } } },
          },
        },
      },
      definitions: {
        c: '$contract.web',
      },
      flows: {
        default: {
          config: { platform: 'web' },
          sources: {
            test: {
              config: {
                globals: '$def.c.globals',
                consent: '$def.c.consent',
              },
            },
          },
        },
      },
    };
    const config = getFlowSettings(setup);
    expect(config.sources?.test?.config).toEqual({
      globals: { required: ['country'] },
      consent: { required: ['analytics'] },
    });
  });

  test('$contract works in destinations', () => {
    const setup: Flow.Json = {
      version: 4,
      contract: {
        web: { consent: { required: ['analytics'] } },
      },
      flows: {
        default: {
          config: { platform: 'web' },
          destinations: {
            api: {
              config: { consent: '$contract.web.consent' },
            },
          },
        },
      },
    };
    const config = getFlowSettings(setup);
    expect(config.destinations?.api?.config).toEqual({
      consent: { required: ['analytics'] },
    });
  });

  test('$contract works in transformers', () => {
    const setup: Flow.Json = {
      version: 4,
      contract: {
        web: {
          events: {
            product: { view: { properties: { data: { required: ['id'] } } } },
          },
        },
      },
      flows: {
        default: {
          config: { platform: 'web' },
          transformers: {
            validator: {
              config: { events: '$contract.web.events' },
            },
          },
        },
      },
    };
    const config = getFlowSettings(setup);
    expect(config.transformers?.validator?.config).toEqual({
      events: {
        product: { view: { properties: { data: { required: ['id'] } } } },
      },
    });
  });
});

describe('Deep dot-path resolution for $def', () => {
  test('resolves $def.name.nested.path', () => {
    const setup: Flow.Json = {
      version: 4,
      definitions: {
        apiConfig: {
          host: 'api.example.com',
          version: 'v2',
          nested: { deep: 'value' },
        },
      },
      flows: {
        default: {
          config: { platform: 'web' },
          sources: {
            test: {
              config: {
                host: '$def.apiConfig.host',
                deep: '$def.apiConfig.nested.deep',
              },
            },
          },
        },
      },
    };
    const config = getFlowSettings(setup);
    expect(config.sources?.test?.config).toEqual({
      host: 'api.example.com',
      deep: 'value',
    });
  });

  test('resolves $def.name (single level) still works', () => {
    const setup: Flow.Json = {
      version: 4,
      definitions: {
        endpoint: { url: 'https://example.com' },
      },
      flows: {
        default: {
          config: { platform: 'web' },
          sources: {
            test: { config: { endpoint: '$def.endpoint' } },
          },
        },
      },
    };
    const config = getFlowSettings(setup);
    expect(config.sources?.test?.config).toEqual({
      endpoint: { url: 'https://example.com' },
    });
  });

  test('throws for missing intermediate path segment', () => {
    const setup: Flow.Json = {
      version: 4,
      definitions: {
        config: { host: 'example.com' },
      },
      flows: {
        default: {
          config: { platform: 'web' },
          sources: {
            test: { config: { val: '$def.config.missing.path' } },
          },
        },
      },
    };
    expect(() => getFlowSettings(setup)).toThrow(/missing.*not found/i);
  });

  test('throws for missing top-level definition', () => {
    const setup: Flow.Json = {
      version: 4,
      definitions: {},
      flows: {
        default: {
          config: { platform: 'web' },
          sources: {
            test: { config: { val: '$def.nonExistent.path' } },
          },
        },
      },
    };
    expect(() => getFlowSettings(setup)).toThrow(/nonExistent/);
  });

  test('resolves $def with array leaf', () => {
    const setup: Flow.Json = {
      version: 4,
      definitions: {
        schema: { required: ['id', 'name'] },
      },
      flows: {
        default: {
          config: { platform: 'web' },
          sources: {
            test: { config: { req: '$def.schema.required' } },
          },
        },
      },
    };
    const config = getFlowSettings(setup);
    expect(config.sources?.test?.config).toEqual({ req: ['id', 'name'] });
  });
});

describe('$contract reference resolution', () => {
  test('resolves $contract.name.section', () => {
    const setup: Flow.Json = {
      version: 4,
      contract: {
        web: {
          globals: { required: ['country'] },
          consent: { required: ['analytics'] },
        },
      },
      flows: {
        default: {
          config: { platform: 'web' },
          sources: {
            cmp: {
              config: { consent: '$contract.web.consent' },
            },
          },
        },
      },
    };
    const config = getFlowSettings(setup);
    expect(config.sources?.cmp?.config).toEqual({
      consent: { required: ['analytics'] },
    });
  });

  test('resolves $contract.name for whole contract', () => {
    const setup: Flow.Json = {
      version: 4,
      contract: {
        web: {
          globals: { required: ['country'] },
        },
      },
      flows: {
        default: {
          config: { platform: 'web' },
          sources: {
            test: { config: { c: '$contract.web' } },
          },
        },
      },
    };
    const config = getFlowSettings(setup);
    expect(config.sources?.test?.config).toEqual({
      c: { globals: { required: ['country'] } },
    });
  });

  test('resolves $contract.name.events.entity.action', () => {
    const setup: Flow.Json = {
      version: 4,
      contract: {
        web: {
          events: {
            product: {
              '*': { properties: { data: { required: ['id'] } } },
              add: { properties: { data: { required: ['qty'] } } },
            },
          },
        },
      },
      flows: {
        default: {
          config: { platform: 'web' },
          sources: {
            test: { config: { schema: '$contract.web.events.product.add' } },
          },
        },
      },
    };
    const config = getFlowSettings(setup);
    // Wildcards should be expanded: add has both id and qty
    expect(config.sources?.test?.config).toEqual({
      schema: { properties: { data: { required: ['id', 'qty'] } } },
    });
  });

  test('resolves extends before path resolution', () => {
    const setup: Flow.Json = {
      version: 4,
      contract: {
        default: { consent: { required: ['analytics'] } },
        web: { extends: 'default', events: { product: { view: {} } } },
      },
      flows: {
        default: {
          config: { platform: 'web' },
          sources: {
            cmp: { config: { consent: '$contract.web.consent' } },
          },
        },
      },
    };
    const config = getFlowSettings(setup);
    // web inherits consent from default
    expect(config.sources?.cmp?.config).toEqual({
      consent: { required: ['analytics'] },
    });
  });

  test('throws for missing contract name', () => {
    const setup: Flow.Json = {
      version: 4,
      contract: { web: { events: {} } },
      flows: {
        default: {
          config: { platform: 'web' },
          sources: {
            test: { config: { c: '$contract.server.events' } },
          },
        },
      },
    };
    expect(() => getFlowSettings(setup)).toThrow(/server/);
  });

  test('$contract stays as string when no contract exists', () => {
    const setup: Flow.Json = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' },
          sources: {
            test: { config: { c: '$contract.web.events' } },
          },
        },
      },
    };
    const config = getFlowSettings(setup);
    expect(config.sources?.test?.config).toEqual({
      c: '$contract.web.events',
    });
  });

  test('supports $def inside contracts', () => {
    const setup: Flow.Json = {
      version: 4,
      definitions: {
        idSchema: { required: ['id'], properties: { id: { type: 'string' } } },
      },
      contract: {
        web: {
          events: {
            product: {
              '*': { properties: { data: '$def.idSchema' } },
            },
          },
        },
      },
      flows: {
        default: {
          config: { platform: 'web' },
          sources: {
            test: {
              config: { schema: '$contract.web.events.product.*' },
            },
          },
        },
      },
    };
    const config = getFlowSettings(setup);
    expect(config.sources?.test?.config).toEqual({
      schema: {
        properties: {
          data: {
            required: ['id'],
            properties: { id: { type: 'string' } },
          },
        },
      },
    });
  });
});

describe('$flow references', () => {
  test('resolves $flow.X.url to sibling config.url', () => {
    const config: Flow.Json = {
      version: 4,
      flows: {
        server: {
          config: {
            platform: 'server',
            url: 'https://api.example.com/collect',
          },
        },
        web: {
          config: { platform: 'web' },
          destinations: {
            api: {
              package: '@walkeros/web-destination-api',
              config: { settings: { url: '$flow.server.url' } },
            },
          },
        },
      },
    };
    const web = getFlowSettings(config, 'web');
    expect(web.destinations?.api.config).toEqual({
      settings: { url: 'https://api.example.com/collect' },
    });
  });

  test('resolves $flow.X.settings.Y deep path', () => {
    const config: Flow.Json = {
      version: 4,
      flows: {
        server: {
          config: { platform: 'server', settings: { region: 'eu-central-1' } },
        },
        web: {
          config: { platform: 'web' },
          destinations: {
            api: {
              config: { settings: { region: '$flow.server.settings.region' } },
            },
          },
        },
      },
    };
    const web = getFlowSettings(config, 'web');
    expect(web.destinations?.api.config).toEqual({
      settings: { region: 'eu-central-1' },
    });
  });

  test('resolves $env inside referenced flow before $flow resolves', () => {
    process.env.SERVER_URL = 'https://prod.example.com/collect';
    const config: Flow.Json = {
      version: 4,
      flows: {
        server: { config: { platform: 'server', url: '$env.SERVER_URL' } },
        web: {
          config: { platform: 'web' },
          destinations: {
            api: { config: { settings: { url: '$flow.server.url' } } },
          },
        },
      },
    };
    try {
      const web = getFlowSettings(config, 'web');
      expect(web.destinations?.api.config).toEqual({
        settings: { url: 'https://prod.example.com/collect' },
      });
    } finally {
      delete process.env.SERVER_URL;
    }
  });

  test('throws on unknown flow name', () => {
    const config: Flow.Json = {
      version: 4,
      flows: {
        web: {
          config: { platform: 'web' },
          destinations: {
            api: { config: { settings: { url: '$flow.nope.url' } } },
          },
        },
      },
    };
    expect(() => getFlowSettings(config, 'web')).toThrow(
      /Flow "nope" not found/,
    );
  });

  test('throws on missing key in referenced config', () => {
    const config: Flow.Json = {
      version: 4,
      flows: {
        server: { config: { platform: 'server' } },
        web: {
          config: { platform: 'web' },
          destinations: {
            api: { config: { settings: { url: '$flow.server.url' } } },
          },
        },
      },
    };
    expect(() => getFlowSettings(config, 'web')).toThrow(/url/);
  });

  test('detects cycles', () => {
    const config: Flow.Json = {
      version: 4,
      flows: {
        a: {
          config: { platform: 'web', settings: { x: '$flow.b.settings.y' } },
        },
        b: {
          config: { platform: 'server', settings: { y: '$flow.a.settings.x' } },
        },
      },
    };
    expect(() => getFlowSettings(config, 'a')).toThrow(
      /Cyclic \$flow reference/,
    );
  });

  test('soft mode collects warnings instead of throwing for missing key', () => {
    const config: Flow.Json = {
      version: 4,
      flows: {
        server: { config: { platform: 'server' } }, // no url
        web: {
          config: { platform: 'web' },
          destinations: {
            api: { config: { settings: { url: '$flow.server.url' } } },
          },
        },
      },
    };
    const warnings: string[] = [];
    const web = getFlowSettings(config, 'web', {
      strictFlowRefs: false,
      onWarning: (msg) => warnings.push(msg),
    });
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/\$flow\.server\.url/);
    // Resolved value remains the original $flow string in soft mode
    expect(web.destinations?.api.config).toEqual({
      settings: { url: '$flow.server.url' },
    });
  });

  test('soft mode still throws on cycles (cycles are author bugs)', () => {
    const config: Flow.Json = {
      version: 4,
      flows: {
        a: {
          config: { platform: 'web', settings: { x: '$flow.b.settings.y' } },
        },
        b: {
          config: { platform: 'server', settings: { y: '$flow.a.settings.x' } },
        },
      },
    };
    expect(() =>
      getFlowSettings(config, 'a', {
        strictFlowRefs: false,
        onWarning: () => {},
      }),
    ).toThrow(/Cyclic \$flow reference/);
  });
});
