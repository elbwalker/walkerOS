import { z } from 'zod';
import {
  ConfigSchema,
  ConfigV2Schema,
  SettingsSchema,
  SourceReferenceSchema,
  DestinationReferenceSchema,
  PrimitiveSchema,
  parseConfig,
  safeParseConfig,
  parseSettings,
  safeParseSettings,
  configJsonSchema,
  settingsJsonSchema,
  sourceReferenceJsonSchema,
  destinationReferenceJsonSchema,
} from '../schemas/flow';
import { getFlowSettings, getPlatform, packageNameToVariable } from '../flow';

describe('Flow Schemas', () => {
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
  // SourceReferenceSchema Tests
  // ========================================

  describe('SourceReferenceSchema', () => {
    test('accepts valid source reference with minimal fields', () => {
      const validSource = {
        package: '@walkeros/web-source-browser',
      };
      expect(SourceReferenceSchema.parse(validSource)).toEqual(validSource);
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
      expect(SourceReferenceSchema.parse(validSource)).toEqual(validSource);
    });

    test('accepts package with version specifiers', () => {
      expect(
        SourceReferenceSchema.parse({
          package: '@walkeros/web-source-browser@2.0.0',
        }),
      ).toHaveProperty('package', '@walkeros/web-source-browser@2.0.0');

      expect(
        SourceReferenceSchema.parse({
          package: '@walkeros/web-source-browser@^2.0.0',
        }),
      ).toHaveProperty('package', '@walkeros/web-source-browser@^2.0.0');

      expect(
        SourceReferenceSchema.parse({
          package: '@walkeros/web-source-browser@latest',
        }),
      ).toHaveProperty('package', '@walkeros/web-source-browser@latest');
    });

    test('rejects empty package name', () => {
      expect(() => SourceReferenceSchema.parse({ package: '' })).toThrow(
        'Package name cannot be empty',
      );
    });

    test('accepts empty object (runtime validation requires package or code)', () => {
      // Schema allows empty object; bundler validates that package or code is present
      expect(() => SourceReferenceSchema.parse({})).not.toThrow();
    });

    test('accepts inline code object', () => {
      const validSource = {
        code: {
          type: 'logger',
          push: '$code:(event) => console.log(event)',
        },
        config: {},
      };
      expect(() => SourceReferenceSchema.parse(validSource)).not.toThrow();
    });

    test('allows unknown config structure', () => {
      const validSource = {
        package: '@walkeros/web-source-browser',
        config: {
          anything: 'goes',
          nested: { deeply: { structured: true } },
        },
      };
      expect(SourceReferenceSchema.parse(validSource)).toEqual(validSource);
    });
  });

  // ========================================
  // DestinationReferenceSchema Tests
  // ========================================

  describe('DestinationReferenceSchema', () => {
    test('accepts valid destination reference with minimal fields', () => {
      const validDest = {
        package: '@walkeros/web-destination-gtag',
      };
      expect(DestinationReferenceSchema.parse(validDest)).toEqual(validDest);
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
      expect(DestinationReferenceSchema.parse(validDest)).toEqual(validDest);
    });

    test('rejects empty package name', () => {
      expect(() => DestinationReferenceSchema.parse({ package: '' })).toThrow(
        'Package name cannot be empty',
      );
    });

    test('accepts empty object (runtime validation requires package or code)', () => {
      // Schema allows empty object; bundler validates that package or code is present
      expect(() => DestinationReferenceSchema.parse({})).not.toThrow();
    });

    test('accepts inline code object', () => {
      const validDest = {
        code: {
          type: 'logger',
          push: '$code:(event) => console.log(event)',
        },
        config: {},
      };
      expect(() => DestinationReferenceSchema.parse(validDest)).not.toThrow();
    });
  });

  // ========================================
  // SettingsSchema Tests
  // ========================================

  describe('SettingsSchema', () => {
    test('accepts minimal valid web config', () => {
      const validConfig = {
        web: {},
      };
      expect(() => SettingsSchema.parse(validConfig)).not.toThrow();
    });

    test('accepts minimal valid server config', () => {
      const validConfig = {
        server: {},
      };
      expect(() => SettingsSchema.parse(validConfig)).not.toThrow();
    });

    test('accepts complete valid server config', () => {
      const validConfig = {
        server: {},
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
          tagging: 1,
          globals: {
            currency: 'USD',
          },
        },
        packages: {
          '@walkeros/collector': { version: 'latest' },
        },
        variables: {
          API_KEY: 'secret',
          DEBUG: 'false',
        },
      };
      expect(() => SettingsSchema.parse(validConfig)).not.toThrow();
    });

    test('accepts complete valid web config', () => {
      const validConfig = {
        web: {
          windowCollector: 'collector',
          windowElb: 'elb',
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
        packages: {
          '@walkeros/collector': { imports: ['startFlow'] },
        },
        variables: { GA_ID: 'G-123' },
        definitions: { mapping: {} },
      };
      expect(() => SettingsSchema.parse(validConfig)).not.toThrow();
    });

    test('requires either web or server', () => {
      expect(() => SettingsSchema.parse({})).toThrow(z.ZodError);
    });

    test('rejects config with neither web nor server', () => {
      expect(() =>
        SettingsSchema.parse({
          sources: {},
        }),
      ).toThrow(z.ZodError);
    });

    test('rejects config with both web and server', () => {
      expect(() =>
        SettingsSchema.parse({
          web: {},
          server: {},
        }),
      ).toThrow(z.ZodError);
    });

    test('accepts web config', () => {
      const config = SettingsSchema.parse({ web: {} });
      expect(config.web).toBeDefined();
      expect(config.server).toBeUndefined();
    });

    test('accepts server config', () => {
      const config = SettingsSchema.parse({ server: {} });
      expect(config.server).toBeDefined();
      expect(config.web).toBeUndefined();
    });

    test('accepts variables at config level', () => {
      const config = {
        web: {},
        variables: {
          STRING: 'value',
          NUMBER: 42,
          BOOLEAN: true,
        },
      };
      const parsed = SettingsSchema.parse(config);
      expect(parsed.variables).toEqual({
        STRING: 'value',
        NUMBER: 42,
        BOOLEAN: true,
      });
    });

    test('accepts definitions at config level', () => {
      const config = {
        web: {},
        definitions: {
          mapping1: { page: { view: { name: 'page_view' } } },
          mapping2: ['array', 'values'],
        },
      };
      const parsed = SettingsSchema.parse(config);
      expect(parsed.definitions).toEqual({
        mapping1: { page: { view: { name: 'page_view' } } },
        mapping2: ['array', 'values'],
      });
    });

    test('accepts packages at config level', () => {
      const config = {
        web: {},
        packages: {
          '@walkeros/collector': { version: 'latest', imports: ['startFlow'] },
          '@walkeros/web-source-browser': { version: '^2.0.0' },
        },
      };
      const parsed = SettingsSchema.parse(config);
      expect(parsed.packages).toBeDefined();
    });
  });

  // ========================================
  // ConfigSchema Tests
  // ========================================

  describe('ConfigSchema', () => {
    test('accepts minimal valid setup', () => {
      const validSetup = {
        version: 1 as const,
        flows: {
          prod: {
            web: {},
          },
        },
      };
      expect(() => ConfigSchema.parse(validSetup)).not.toThrow();
    });

    test('accepts complete valid setup', () => {
      const validSetup = {
        version: 1 as const,
        $schema: 'https://walkeros.io/schema/flow/v1.json',
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
            web: {},
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
            server: {},
            destinations: {
              api: {
                package: '@walkeros/server-destination-api',
              },
            },
          },
        },
      };
      expect(() => ConfigSchema.parse(validSetup)).not.toThrow();
    });

    test('requires version field', () => {
      expect(() =>
        ConfigSchema.parse({
          flows: { prod: { web: {} } },
        }),
      ).toThrow();
    });

    test('requires version to be 1 or 2', () => {
      expect(() =>
        ConfigSchema.parse({
          version: 3,
          flows: { prod: { web: {} } },
        }),
      ).toThrow();

      expect(
        ConfigSchema.parse({
          version: 2,
          flows: { prod: { web: {} } },
        }),
      ).toBeDefined();
    });

    test('validates $schema as URL when provided', () => {
      expect(() =>
        ConfigSchema.parse({
          version: 1,
          $schema: 'not-a-url',
          flows: { prod: { web: {} } },
        }),
      ).toThrow();

      expect(
        ConfigSchema.parse({
          version: 1,
          $schema: 'https://walkeros.io/schema/flow/v1.json',
          flows: { prod: { web: {} } },
        }),
      ).toHaveProperty('$schema', 'https://walkeros.io/schema/flow/v1.json');
    });

    test('requires at least one flow', () => {
      expect(() =>
        ConfigSchema.parse({
          version: 1,
          flows: {},
        }),
      ).toThrow('At least one flow is required');
    });

    test('validates variables as primitive record', () => {
      expect(
        ConfigSchema.parse({
          version: 1,
          variables: {
            STRING: 'value',
            NUMBER: 42,
            BOOLEAN: true,
          },
          flows: { prod: { web: {} } },
        }),
      ).toHaveProperty('variables', {
        STRING: 'value',
        NUMBER: 42,
        BOOLEAN: true,
      });
    });

    test('allows unknown definitions structure', () => {
      const validSetup = {
        version: 1 as const,
        definitions: {
          mapping1: { complex: { nested: { structure: true } } },
          mapping2: ['array', 'values'],
          mapping3: 'simple string',
        },
        flows: {
          prod: { web: {} },
        },
      };
      expect(() => ConfigSchema.parse(validSetup)).not.toThrow();
    });

    test('validates multiple flows with different platforms', () => {
      const validSetup = {
        version: 1 as const,
        flows: {
          web_prod: { web: {} },
          web_stage: { web: {} },
          server_prod: { server: {} },
          server_stage: { server: {} },
        },
      };
      expect(() => ConfigSchema.parse(validSetup)).not.toThrow();
    });

    test('accepts optional contract property', () => {
      const setup = {
        version: 2 as const,
        contract: {
          default: {
            tagging: 1,
            events: {
              product: {
                add: { properties: { data: { type: 'object' } } },
              },
            },
          },
        },
        flows: { default: { web: {} } },
      };
      const result = ConfigV2Schema.parse(setup);
      expect(result.contract).toBeDefined();
    });
  });

  // ========================================
  // Helper Function Tests
  // ========================================

  describe('parseConfig', () => {
    test('successfully parses valid setup', () => {
      const validSetup = {
        version: 1,
        flows: {
          prod: { web: {} },
        },
      };
      expect(() => parseConfig(validSetup)).not.toThrow();
    });

    test('throws ZodError for invalid setup', () => {
      expect(() => parseConfig({})).toThrow(z.ZodError);
      expect(() => parseConfig({ version: 2 })).toThrow(z.ZodError);
    });
  });

  describe('safeParseConfig', () => {
    test('returns success for valid setup', () => {
      const validSetup = {
        version: 1,
        flows: {
          prod: { web: {} },
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
        version: 1,
        flows: {},
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessages = result.error.issues.map((issue) => issue.message);
        expect(errorMessages).toContain('At least one flow is required');
      }
    });
  });

  describe('parseSettings', () => {
    test('successfully parses valid config', () => {
      const validConfig = { web: {} };
      expect(() => parseSettings(validConfig)).not.toThrow();
    });

    test('throws ZodError for invalid config', () => {
      expect(() => parseSettings({})).toThrow(z.ZodError);
      expect(() => parseSettings({ platform: 'invalid' })).toThrow(z.ZodError);
    });
  });

  describe('safeParseSettings', () => {
    test('returns success for valid config', () => {
      const validConfig = { server: {} };
      const result = safeParseSettings(validConfig);
      expect(result.success).toBe(true);
    });

    test('returns error for invalid config', () => {
      const result = safeParseSettings({});
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
    test('configJsonSchema is valid JSON Schema', () => {
      expect(configJsonSchema).toHaveProperty('$schema');
      // ConfigSchema is now a union (v1 | v2), so it uses anyOf
      expect(configJsonSchema).toHaveProperty('anyOf');
      const variants = (configJsonSchema as any).anyOf;
      expect(variants.length).toBe(2);
      // Both variants should have version and flows
      for (const variant of variants) {
        expect(variant).toHaveProperty('type', 'object');
        expect(variant.properties).toHaveProperty('version');
        expect(variant.properties).toHaveProperty('flows');
      }
    });

    test('settingsJsonSchema is valid JSON Schema', () => {
      expect(settingsJsonSchema).toHaveProperty('$schema');
      expect(settingsJsonSchema).toHaveProperty('type', 'object');
      expect(settingsJsonSchema).toHaveProperty('properties');
      expect((settingsJsonSchema as any).properties).toHaveProperty('web');
      expect((settingsJsonSchema as any).properties).toHaveProperty('server');
    });

    test('sourceReferenceJsonSchema is valid JSON Schema', () => {
      expect(sourceReferenceJsonSchema).toHaveProperty('$schema');
      expect(sourceReferenceJsonSchema).toHaveProperty('type', 'object');
      expect(sourceReferenceJsonSchema).toHaveProperty('properties');
      expect((sourceReferenceJsonSchema as any).properties).toHaveProperty(
        'package',
      );
    });

    test('destinationReferenceJsonSchema is valid JSON Schema', () => {
      expect(destinationReferenceJsonSchema).toHaveProperty('$schema');
      expect(destinationReferenceJsonSchema).toHaveProperty('type', 'object');
      expect(destinationReferenceJsonSchema).toHaveProperty('properties');
      expect((destinationReferenceJsonSchema as any).properties).toHaveProperty(
        'package',
      );
    });
  });

  // ========================================
  // Real-world Scenario Tests
  // ========================================

  describe('Real-world Scenarios', () => {
    test('complete multi-flow setup', () => {
      const realWorldSetup = {
        version: 1,
        $schema: 'https://walkeros.io/schema/flow/v1.json',
        variables: {
          CURRENCY: 'USD',
          REGION: 'us-east-1',
        },
        definitions: {
          base_collector: {
            tagging: 1,
          },
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
            web: {},
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
              tagging: 1,
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
            web: {},
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
              tagging: 1,
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
            server: {},
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
      expect(parsed.flows.web_production.web).toBeDefined();
      expect(parsed.flows.server_production.server).toBeDefined();
    });

    test('setup with variable interpolation structure', () => {
      const setupWithVars = {
        version: 1,
        variables: {
          GA4_PROD: 'G-PROD123',
          GA4_STAGE: 'G-STAGE456',
          CURRENCY: 'USD',
        },
        flows: {
          prod: {
            web: {},
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
        version: 1,
        definitions: {
          common_mapping: {
            page: { view: { name: 'page_view' } },
          },
        },
        flows: {
          prod: {
            web: {},
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
      expect(() => SourceReferenceSchema.parse({ package: '' })).toThrow(
        'Package name cannot be empty',
      );
    });

    test('handles null and undefined appropriately', () => {
      expect(() => ConfigSchema.parse(null)).toThrow();
      expect(() => ConfigSchema.parse(undefined)).toThrow();
    });

    test('handles deeply nested config structures', () => {
      const deepConfig = {
        web: {},
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
      expect(() => SettingsSchema.parse(deepConfig)).not.toThrow();
    });

    test('validates flow names are non-empty strings', () => {
      const setup = {
        version: 1,
        flows: {
          '': { web: {} }, // Empty string key
        },
      };
      // Zod record allows empty string keys, but this might be caught at application level
      expect(() => ConfigSchema.parse(setup)).not.toThrow();
    });
  });

  // ========================================
  // New Features Tests
  // ========================================

  describe('Variables at Source/Destination Level', () => {
    test('accepts variables at source level', () => {
      const config = {
        web: {},
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
      const parsed = SettingsSchema.parse(config);
      expect(parsed.sources?.browser.variables).toEqual({
        SOURCE_VAR: 'source-specific',
        DEBUG: true,
      });
    });

    test('accepts variables at destination level', () => {
      const config = {
        web: {},
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
      const parsed = SettingsSchema.parse(config);
      expect(parsed.destinations?.gtag.variables).toEqual({
        GA_ID: 'G-DEST-123',
        MEASUREMENT_ID: 'G-XYZ',
      });
    });

    test('validates variables cascade from setup to config to source/destination', () => {
      const setup = {
        version: 1,
        variables: {
          GLOBAL: 'setup-level',
          OVERRIDE_TEST: 'setup',
        },
        flows: {
          prod: {
            web: {},
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
      expect(() => ConfigSchema.parse(setup)).not.toThrow();
    });
  });

  describe('Definitions at Source/Destination Level', () => {
    test('accepts definitions at source level', () => {
      const config = {
        web: {},
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
      const parsed = SettingsSchema.parse(config);
      expect(parsed.sources?.browser.definitions).toBeDefined();
    });

    test('accepts definitions at destination level', () => {
      const config = {
        web: {},
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
      const parsed = SettingsSchema.parse(config);
      expect(parsed.destinations?.gtag.definitions).toBeDefined();
    });

    test('validates definitions cascade structure', () => {
      const setup = {
        version: 1,
        definitions: {
          commonMapping: {
            page: { view: { name: 'page_view' } },
          },
        },
        flows: {
          prod: {
            web: {},
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
      expect(() => ConfigSchema.parse(setup)).not.toThrow();
    });
  });

  describe('Packages Schema', () => {
    test('accepts packages with version only', () => {
      const config = {
        web: {},
        packages: {
          '@walkeros/collector': { version: 'latest' },
          '@walkeros/web-source-browser': { version: '^2.0.0' },
        },
      };
      const parsed = SettingsSchema.parse(config);
      expect(parsed.packages?.['@walkeros/collector'].version).toBe('latest');
    });

    test('accepts packages with imports only', () => {
      const config = {
        web: {},
        packages: {
          '@walkeros/collector': { imports: ['startFlow', 'Collector'] },
        },
      };
      const parsed = SettingsSchema.parse(config);
      expect(parsed.packages?.['@walkeros/collector'].imports).toEqual([
        'startFlow',
        'Collector',
      ]);
    });

    test('accepts packages with both version and imports', () => {
      const config = {
        web: {},
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
      };
      const parsed = SettingsSchema.parse(config);
      expect(parsed.packages?.['@walkeros/collector']).toEqual({
        version: '2.0.0',
        imports: ['startFlow'],
      });
    });

    test('accepts packages with no properties (empty object)', () => {
      const config = {
        web: {},
        packages: {
          '@walkeros/collector': {},
        },
      };
      expect(() => SettingsSchema.parse(config)).not.toThrow();
    });

    test('validates complete setup with packages at flow level', () => {
      const setup = {
        version: 1,
        flows: {
          prod: {
            web: { windowCollector: 'tracker' },
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
      };
      expect(() => ConfigSchema.parse(setup)).not.toThrow();
    });
  });

  describe('Web/Server Platform Validation', () => {
    test('web key with windowCollector property', () => {
      const config = {
        web: {
          windowCollector: 'customCollector',
        },
      };
      const parsed = SettingsSchema.parse(config);
      expect(parsed.web?.windowCollector).toBe('customCollector');
    });

    test('web key with windowElb property', () => {
      const config = {
        web: {
          windowElb: 'customElb',
        },
      };
      const parsed = SettingsSchema.parse(config);
      expect(parsed.web?.windowElb).toBe('customElb');
    });

    test('web key with both window properties', () => {
      const config = {
        web: {
          windowCollector: 'tracker',
          windowElb: 'track',
        },
      };
      const parsed = SettingsSchema.parse(config);
      expect(parsed.web?.windowCollector).toBe('tracker');
      expect(parsed.web?.windowElb).toBe('track');
    });

    test('server key accepts empty object', () => {
      const config = {
        server: {},
      };
      expect(() => SettingsSchema.parse(config)).not.toThrow();
    });

    test('rejects when both web and server are present', () => {
      const config = {
        web: {},
        server: {},
      };
      expect(() => SettingsSchema.parse(config)).toThrow(z.ZodError);
    });

    test('rejects when neither web nor server is present', () => {
      const config = {
        sources: {},
        destinations: {},
      };
      expect(() => SettingsSchema.parse(config)).toThrow(z.ZodError);
    });
  });
});

// ========================================
// getFlowSettings Tests
// ========================================

describe('getFlowSettings', () => {
  describe('code resolution from package', () => {
    test('does not set code if package not in packages config', () => {
      const setup = {
        version: 1 as const,
        flows: {
          default: {
            server: {},
            packages: {}, // Empty packages
            sources: {
              http: {
                package: '@walkeros/server-source-express',
                config: {},
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup as any);
      expect(config.sources?.http.code).toBeUndefined();
    });

    test('auto-generates code when not provided', () => {
      const setup = {
        version: 1 as const,
        flows: {
          default: {
            server: {},
            packages: {
              '@walkeros/server-source-express': {
                version: 'latest',
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
      const config = getFlowSettings(setup as any);
      expect(config.sources?.http.code).toBe('_walkerosServerSourceExpress');
    });

    test('auto-generates code for multiple sources and destinations when not provided', () => {
      const setup = {
        version: 1 as const,
        flows: {
          default: {
            server: {},
            packages: {
              '@walkeros/server-source-express': {},
              '@walkeros/destination-demo': {},
              '@walkeros/server-destination-gcp': {},
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
      const config = getFlowSettings(setup as any);
      expect(config.sources?.http.code).toBe('_walkerosServerSourceExpress');
      expect(config.destinations?.demo.code).toBe('_walkerosDestinationDemo');
      expect(config.destinations?.bigquery.code).toBe(
        '_walkerosServerDestinationGcp',
      );
    });
  });

  describe('flow selection', () => {
    test('auto-selects single flow', () => {
      const setup = {
        version: 1 as const,
        flows: {
          default: { web: {} },
        },
      };
      const config = getFlowSettings(setup as any);
      expect(config.web).toBeDefined();
    });

    test('throws for multiple flows without name', () => {
      const setup = {
        version: 1 as const,
        flows: {
          prod: { web: {} },
          stage: { web: {} },
        },
      };
      expect(() => getFlowSettings(setup as any)).toThrow(
        'Multiple flows found',
      );
    });

    test('selects named flow', () => {
      const setup = {
        version: 1 as const,
        flows: {
          prod: { web: {} },
          stage: { server: {} },
        },
      };
      const config = getFlowSettings(setup as any, 'stage');
      expect(config.server).toBeDefined();
    });
  });
});

// ========================================
// Pattern Resolution Tests ($def, $var, $env)
// ========================================

describe('Pattern Resolution', () => {
  describe('$def.name - Definition References', () => {
    test('resolves $def.name to definition content', () => {
      const setup = {
        version: 1 as const,
        definitions: {
          commonMapping: {
            page: { view: { name: 'page_view' } },
          },
        },
        flows: {
          default: {
            web: {},
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
      const config = getFlowSettings(setup as any);
      expect(config.destinations?.gtag.config).toEqual({
        mapping: { page: { view: { name: 'page_view' } } },
      });
    });

    test('resolves nested $def references', () => {
      const setup = {
        version: 1 as const,
        definitions: {
          inner: { key: 'value' },
          outer: { nested: '$def.inner' },
        },
        flows: {
          default: {
            web: {},
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
      const config = getFlowSettings(setup as any);
      expect(config.destinations?.test.config).toEqual({
        data: { nested: { key: 'value' } },
      });
    });

    test('throws for missing definition', () => {
      const setup = {
        version: 1 as const,
        flows: {
          default: {
            web: {},
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
      expect(() => getFlowSettings(setup as any)).toThrow(
        'Definition "nonExistent" not found',
      );
    });

    test('definition cascade: destination level overrides setup level', () => {
      const setup = {
        version: 1 as const,
        definitions: {
          mapping: { setup: true },
        },
        flows: {
          default: {
            web: {},
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
      const config = getFlowSettings(setup as any);
      expect(config.destinations?.test.config).toEqual({
        data: { destination: true },
      });
    });
  });

  describe('$var.name - Variable References', () => {
    test('resolves $var.name to variable value', () => {
      const setup = {
        version: 1 as const,
        variables: {
          measurementId: 'G-TEST123',
        },
        flows: {
          default: {
            web: {},
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
      const config = getFlowSettings(setup as any);
      expect(config.destinations?.gtag.config).toEqual({
        id: 'G-TEST123',
      });
    });

    test('resolves multiple $var references in same string', () => {
      const setup = {
        version: 1 as const,
        variables: {
          host: 'api.example.com',
          version: 'v2',
        },
        flows: {
          default: {
            web: {},
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
      const config = getFlowSettings(setup as any);
      expect(config.destinations?.api.config).toEqual({
        endpoint: 'https://api.example.com/v2/collect',
      });
    });

    test('throws for missing variable', () => {
      const setup = {
        version: 1 as const,
        flows: {
          default: {
            web: {},
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
      expect(() => getFlowSettings(setup as any)).toThrow(
        'Variable "nonExistent" not found',
      );
    });

    test('variable cascade: destination level overrides setup level', () => {
      const setup = {
        version: 1 as const,
        variables: {
          id: 'setup-id',
        },
        flows: {
          default: {
            web: {},
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
      const config = getFlowSettings(setup as any);
      expect(config.destinations?.test.config).toEqual({
        value: 'destination-id',
      });
    });

    test('converts number variables to strings', () => {
      const setup = {
        version: 1 as const,
        variables: {
          port: 8080,
        },
        flows: {
          default: {
            web: {},
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
      const config = getFlowSettings(setup as any);
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
      const setup = {
        version: 1 as const,
        flows: {
          default: {
            web: {},
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
      const config = getFlowSettings(setup as any);
      expect(config.destinations?.gtag.config).toEqual({
        id: 'G-ENV123',
      });
    });

    test('uses default value when env var not set', () => {
      delete process.env.MISSING_VAR;
      const setup = {
        version: 1 as const,
        flows: {
          default: {
            web: {},
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
      const config = getFlowSettings(setup as any);
      expect(config.destinations?.test.config).toEqual({
        value: 'default-value',
      });
    });

    test('throws when env var missing and no default', () => {
      delete process.env.REQUIRED_VAR;
      const setup = {
        version: 1 as const,
        flows: {
          default: {
            web: {},
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
      expect(() => getFlowSettings(setup as any)).toThrow(
        'Environment variable "REQUIRED_VAR" not found and no default provided',
      );
    });

    test('env var takes precedence over default when set', () => {
      process.env.MY_VAR = 'from-env';
      const setup = {
        version: 1 as const,
        flows: {
          default: {
            web: {},
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
      const config = getFlowSettings(setup as any);
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
      const setup = {
        version: 1 as const,
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
            web: {},
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
      const config = getFlowSettings(setup as any);
      expect(config.destinations?.test.config).toEqual({
        data: { currency: 'USD' },
      });
    });

    test('resolves $env inside $def content', () => {
      process.env.API_KEY = 'secret-key';
      const setup = {
        version: 1 as const,
        definitions: {
          apiConfig: {
            key: '$env.API_KEY',
          },
        },
        flows: {
          default: {
            web: {},
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
      const config = getFlowSettings(setup as any);
      expect(config.destinations?.test.config).toEqual({
        api: { key: 'secret-key' },
      });
    });

    test('handles complex nested structure with all pattern types', () => {
      process.env.ENV_VALUE = 'from-env';
      const setup = {
        version: 1 as const,
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
            web: {},
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
      const config = getFlowSettings(setup as any);
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
      const setup = {
        version: 1 as const,
        variables: {
          ga4Default: 'G-FALLBACK123',
        },
        flows: {
          default: {
            web: {},
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
      const config = getFlowSettings(setup as any);
      expect(config.destinations?.gtag.config).toEqual({
        measurementId: 'G-FALLBACK123',
      });
    });

    test('env value takes precedence over $var default', () => {
      process.env.GA4_ID = 'G-FROM-ENV';
      const setup = {
        version: 1 as const,
        variables: {
          ga4Default: 'G-FALLBACK123',
        },
        flows: {
          default: {
            web: {},
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
      const config = getFlowSettings(setup as any);
      expect(config.destinations?.gtag.config).toEqual({
        measurementId: 'G-FROM-ENV',
      });
    });
  });

  describe('transformer pattern resolution', () => {
    test('resolves $var in transformer config', () => {
      const setup = {
        version: 2,
        variables: { apiUrl: 'https://api.example.com' },
        flows: {
          default: {
            web: {},
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
      const config = getFlowSettings(setup as any);
      expect(
        (config.transformers?.enricher?.config as any)?.settings?.url,
      ).toBe('https://api.example.com');
    });

    test('resolves $def in transformer config', () => {
      const setup = {
        version: 2,
        definitions: {
          cacheRule: {
            match: { key: 'method', operator: 'eq', value: 'GET' },
            ttl: 300,
          },
        },
        flows: {
          default: {
            server: {},
            transformers: {
              cache: {
                package: '@walkeros/server-transformer-cache',
                config: {
                  settings: { rules: ['$def.cacheRule'] },
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup as any);
      const rules = (config.transformers?.cache?.config as any)?.settings
        ?.rules;
      expect(rules[0]).toEqual({
        match: { key: 'method', operator: 'eq', value: 'GET' },
        ttl: 300,
      });
    });

    test('resolves $env in transformer config (deferred)', () => {
      const setup = {
        version: 2,
        flows: {
          default: {
            server: {},
            transformers: {
              cache: {
                package: '@walkeros/server-transformer-cache',
                config: {
                  settings: { secret: '$env.API_SECRET:default_secret' },
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup as any, undefined, {
        deferred: true,
      });
      expect(
        (config.transformers?.cache?.config as any)?.settings?.secret,
      ).toBe('__WALKEROS_ENV:API_SECRET:default_secret');
    });

    test('transformer-level variables override flow variables', () => {
      const setup = {
        version: 2,
        variables: { ttl: '300' },
        flows: {
          default: {
            server: {},
            transformers: {
              cache: {
                package: '@walkeros/server-transformer-cache',
                variables: { ttl: '600' },
                config: {
                  settings: { ttl: '$var.ttl' },
                },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup as any);
      expect((config.transformers?.cache?.config as any)?.settings?.ttl).toBe(
        '600',
      );
    });
  });

  describe('env pattern resolution', () => {
    test('resolves $var in source env', () => {
      const setup = {
        version: 2,
        variables: { storeRef: 'myStore' },
        flows: {
          default: {
            web: {},
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
      const config = getFlowSettings(setup as any);
      expect((config.sources?.browser as any)?.env?.custom).toBe('myStore');
    });

    test('resolves $var in transformer env', () => {
      const setup = {
        version: 2,
        variables: { storeRef: 'myStore' },
        flows: {
          default: {
            web: {},
            transformers: {
              cache: {
                package: '@walkeros/server-transformer-cache',
                config: {},
                env: { custom: '$var.storeRef' },
              },
            },
          },
        },
      };
      const config = getFlowSettings(setup as any);
      expect((config.transformers?.cache as any)?.env?.custom).toBe('myStore');
    });

    test('resolves $var in destination env', () => {
      const setup = {
        version: 2,
        variables: { storeRef: 'myStore' },
        flows: {
          default: {
            web: {},
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
      const config = getFlowSettings(setup as any);
      expect((config.destinations?.api as any)?.env?.custom).toBe('myStore');
    });

    test('resolves $var in store env', () => {
      const setup = {
        version: 2,
        variables: { region: 'eu-west-1' },
        flows: {
          default: {
            server: {},
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
      const config = getFlowSettings(setup as any);
      expect((config.stores?.cache as any)?.env?.region).toBe('eu-west-1');
    });
  });
});

// ========================================
// Deferred Env Resolution Tests
// ========================================

describe('deferred env resolution', () => {
  const makeSetup = (collector: Record<string, unknown>) => ({
    version: 1 as const,
    flows: {
      test: { server: {}, collector, destinations: {} },
    },
  });

  it('returns __WALKEROS_ENV: marker instead of resolving $env when deferred', () => {
    const setup = makeSetup({ url: 'https://api.example.com/$env.API_KEY' });
    const config = getFlowSettings(setup, 'test', { deferred: true });
    const collector = config.collector as Record<string, unknown>;
    expect(collector.url).toBe(
      'https://api.example.com/__WALKEROS_ENV:API_KEY',
    );
  });

  it('returns marker with default value notation', () => {
    const setup = makeSetup({ host: '$env.HOST:localhost' });
    const config = getFlowSettings(setup, 'test', { deferred: true });
    const collector = config.collector as Record<string, unknown>;
    expect(collector.host).toBe('__WALKEROS_ENV:HOST:localhost');
  });

  it('preserves colon in default values (e.g. URLs)', () => {
    const setup = makeSetup({
      url: '$env.REDIS_URL:redis://localhost:6379',
    });
    const config = getFlowSettings(setup, 'test', { deferred: true });
    const collector = config.collector as Record<string, unknown>;
    expect(collector.url).toBe(
      '__WALKEROS_ENV:REDIS_URL:redis://localhost:6379',
    );
  });

  it('resolves $env normally when deferred is false', () => {
    process.env.TEST_SECRET = 'hunter2';
    const setup = makeSetup({ key: '$env.TEST_SECRET' });
    const config = getFlowSettings(setup, 'test', { deferred: false });
    const collector = config.collector as Record<string, unknown>;
    expect(collector.key).toBe('hunter2');
    delete process.env.TEST_SECRET;
  });

  it('resolves $env normally when no options passed', () => {
    process.env.TEST_SECRET = 'hunter2';
    const setup = makeSetup({ key: '$env.TEST_SECRET' });
    const config = getFlowSettings(setup, 'test');
    const collector = config.collector as Record<string, unknown>;
    expect(collector.key).toBe('hunter2');
    delete process.env.TEST_SECRET;
  });
});

// ========================================
// getPlatform Tests
// ========================================

describe('getPlatform', () => {
  test('returns web for web config', () => {
    expect(getPlatform({ web: {} } as any)).toBe('web');
  });

  test('returns server for server config', () => {
    expect(getPlatform({ server: {} } as any)).toBe('server');
  });

  test('throws for config without platform', () => {
    expect(() => getPlatform({} as any)).toThrow(
      'Settings must have web or server key',
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
    const setup = {
      version: 1 as const,
      flows: {
        default: {
          server: {},
          packages: {
            '@walkeros/server-destination-api': {}, // No imports specified
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
    const config = getFlowSettings(setup as any);
    expect(config.destinations?.api.code).toBe('_walkerosServerDestinationApi');
  });

  test('uses explicit code when provided', () => {
    const setup = {
      version: 1 as const,
      flows: {
        default: {
          server: {},
          packages: {
            '@walkeros/server-destination-api': {},
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
    const config = getFlowSettings(setup as any);
    expect(config.destinations?.api.code).toBe('myCustomCode');
  });

  test('uses explicit code for named exports', () => {
    const setup = {
      version: 1 as const,
      flows: {
        default: {
          server: {},
          packages: {
            '@walkeros/server-destination-gcp': {},
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
    const config = getFlowSettings(setup as any);
    expect(config.destinations?.bq.code).toBe('destinationBigQuery');
  });

  test('auto-generates code for multiple destinations with same package', () => {
    const setup = {
      version: 1 as const,
      flows: {
        default: {
          web: {},
          packages: {
            '@walkeros/web-destination-api': {},
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
    const config = getFlowSettings(setup as any);
    expect(config.destinations?.api1.code).toBe('_walkerosWebDestinationApi');
    expect(config.destinations?.api2.code).toBe('_walkerosWebDestinationApi');
  });
});

describe('$contract edge cases', () => {
  test('$def aliasing works with $contract', () => {
    const setup = {
      version: 2,
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
          web: {},
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
    const config = getFlowSettings(setup as any);
    const source = config.sources?.test?.config as any;
    expect(source.globals).toEqual({ required: ['country'] });
    expect(source.consent).toEqual({ required: ['analytics'] });
  });

  test('$contract works in destinations', () => {
    const setup = {
      version: 2,
      contract: {
        web: { consent: { required: ['analytics'] } },
      },
      flows: {
        default: {
          web: {},
          destinations: {
            api: {
              config: { consent: '$contract.web.consent' },
            },
          },
        },
      },
    };
    const config = getFlowSettings(setup as any);
    expect((config.destinations?.api?.config as any).consent).toEqual({
      required: ['analytics'],
    });
  });

  test('$contract works in transformers', () => {
    const setup = {
      version: 2,
      contract: {
        web: {
          events: {
            product: { view: { properties: { data: { required: ['id'] } } } },
          },
        },
      },
      flows: {
        default: {
          web: {},
          transformers: {
            validator: {
              config: { events: '$contract.web.events' },
            },
          },
        },
      },
    };
    const config = getFlowSettings(setup as any);
    expect(
      (config.transformers?.validator?.config as any).events.product.view,
    ).toBeDefined();
  });
});

describe('Deep dot-path resolution for $def', () => {
  test('resolves $def.name.nested.path', () => {
    const setup = {
      version: 2,
      definitions: {
        apiConfig: {
          host: 'api.example.com',
          version: 'v2',
          nested: { deep: 'value' },
        },
      },
      flows: {
        default: {
          web: {},
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
    const config = getFlowSettings(setup as any);
    const source = config.sources?.test;
    expect((source?.config as any).host).toBe('api.example.com');
    expect((source?.config as any).deep).toBe('value');
  });

  test('resolves $def.name (single level) still works', () => {
    const setup = {
      version: 2,
      definitions: {
        endpoint: { url: 'https://example.com' },
      },
      flows: {
        default: {
          web: {},
          sources: {
            test: { config: { endpoint: '$def.endpoint' } },
          },
        },
      },
    };
    const config = getFlowSettings(setup as any);
    expect((config.sources?.test?.config as any).endpoint).toEqual({
      url: 'https://example.com',
    });
  });

  test('throws for missing intermediate path segment', () => {
    const setup = {
      version: 2,
      definitions: {
        config: { host: 'example.com' },
      },
      flows: {
        default: {
          web: {},
          sources: {
            test: { config: { val: '$def.config.missing.path' } },
          },
        },
      },
    };
    expect(() => getFlowSettings(setup as any)).toThrow(/missing.*not found/i);
  });

  test('throws for missing top-level definition', () => {
    const setup = {
      version: 2,
      definitions: {},
      flows: {
        default: {
          web: {},
          sources: {
            test: { config: { val: '$def.nonExistent.path' } },
          },
        },
      },
    };
    expect(() => getFlowSettings(setup as any)).toThrow(/nonExistent/);
  });

  test('resolves $def with array leaf', () => {
    const setup = {
      version: 2,
      definitions: {
        schema: { required: ['id', 'name'] },
      },
      flows: {
        default: {
          web: {},
          sources: {
            test: { config: { req: '$def.schema.required' } },
          },
        },
      },
    };
    const config = getFlowSettings(setup as any);
    expect((config.sources?.test?.config as any).req).toEqual(['id', 'name']);
  });
});

describe('$contract reference resolution', () => {
  test('resolves $contract.name.section', () => {
    const setup = {
      version: 2,
      contract: {
        web: {
          globals: { required: ['country'] },
          consent: { required: ['analytics'] },
        },
      },
      flows: {
        default: {
          web: {},
          sources: {
            cmp: {
              config: { consent: '$contract.web.consent' },
            },
          },
        },
      },
    };
    const config = getFlowSettings(setup as any);
    expect((config.sources?.cmp?.config as any).consent).toEqual({
      required: ['analytics'],
    });
  });

  test('resolves $contract.name for whole contract', () => {
    const setup = {
      version: 2,
      contract: {
        web: {
          globals: { required: ['country'] },
        },
      },
      flows: {
        default: {
          web: {},
          sources: {
            test: { config: { c: '$contract.web' } },
          },
        },
      },
    };
    const config = getFlowSettings(setup as any);
    expect((config.sources?.test?.config as any).c.globals).toEqual({
      required: ['country'],
    });
  });

  test('resolves $contract.name.events.entity.action', () => {
    const setup = {
      version: 2,
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
          web: {},
          sources: {
            test: { config: { schema: '$contract.web.events.product.add' } },
          },
        },
      },
    };
    const config = getFlowSettings(setup as any);
    const schema = (config.sources?.test?.config as any).schema;
    // Wildcards should be expanded: add has both id and qty
    expect(schema.properties.data.required).toEqual(['id', 'qty']);
  });

  test('resolves $contract.name.tagging', () => {
    const setup = {
      version: 2,
      contract: {
        web: { tagging: 5 },
      },
      flows: {
        default: {
          web: {},
          collector: { tagging: '$contract.web.tagging' },
        },
      },
    };
    const config = getFlowSettings(setup as any);
    expect((config.collector as any).tagging).toBe(5);
  });

  test('resolves extends before path resolution', () => {
    const setup = {
      version: 2,
      contract: {
        default: { consent: { required: ['analytics'] } },
        web: { extends: 'default', events: { product: { view: {} } } },
      },
      flows: {
        default: {
          web: {},
          sources: {
            cmp: { config: { consent: '$contract.web.consent' } },
          },
        },
      },
    };
    const config = getFlowSettings(setup as any);
    // web inherits consent from default
    expect((config.sources?.cmp?.config as any).consent).toEqual({
      required: ['analytics'],
    });
  });

  test('throws for missing contract name', () => {
    const setup = {
      version: 2,
      contract: { web: { events: {} } },
      flows: {
        default: {
          web: {},
          sources: {
            test: { config: { c: '$contract.server.events' } },
          },
        },
      },
    };
    expect(() => getFlowSettings(setup as any)).toThrow(/server/);
  });

  test('$contract stays as string when no contract exists', () => {
    const setup = {
      version: 1,
      flows: {
        default: {
          web: {},
          sources: {
            test: { config: { c: '$contract.web.events' } },
          },
        },
      },
    };
    const config = getFlowSettings(setup as any);
    expect((config.sources?.test?.config as any).c).toBe(
      '$contract.web.events',
    );
  });

  test('supports $def inside contracts', () => {
    const setup = {
      version: 2,
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
          web: {},
          sources: {
            test: {
              config: { schema: '$contract.web.events.product.*' },
            },
          },
        },
      },
    };
    const config = getFlowSettings(setup as any);
    const schema = (config.sources?.test?.config as any).schema;
    expect(schema.properties.data.required).toEqual(['id']);
  });
});
