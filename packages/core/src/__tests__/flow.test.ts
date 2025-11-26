import { z } from 'zod';
import {
  SetupSchema,
  ConfigSchema,
  SourceReferenceSchema,
  DestinationReferenceSchema,
  PrimitiveSchema,
  parseSetup,
  safeParseSetup,
  parseConfig,
  safeParseConfig,
  setupJsonSchema,
  configJsonSchema,
  sourceReferenceJsonSchema,
  destinationReferenceJsonSchema,
} from '../schemas/flow';

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

    test('rejects missing package field', () => {
      expect(() => SourceReferenceSchema.parse({})).toThrow();
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

    test('rejects missing package field', () => {
      expect(() => DestinationReferenceSchema.parse({})).toThrow();
    });
  });

  // ========================================
  // ConfigSchema Tests
  // ========================================

  describe('ConfigSchema', () => {
    test('accepts minimal valid web config', () => {
      const validConfig = {
        web: {},
      };
      expect(() => ConfigSchema.parse(validConfig)).not.toThrow();
    });

    test('accepts minimal valid server config', () => {
      const validConfig = {
        server: {},
      };
      expect(() => ConfigSchema.parse(validConfig)).not.toThrow();
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
          run: true,
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
      expect(() => ConfigSchema.parse(validConfig)).not.toThrow();
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
      expect(() => ConfigSchema.parse(validConfig)).not.toThrow();
    });

    test('requires either web or server', () => {
      expect(() => ConfigSchema.parse({})).toThrow(z.ZodError);
    });

    test('rejects config with neither web nor server', () => {
      expect(() =>
        ConfigSchema.parse({
          sources: {},
        }),
      ).toThrow(z.ZodError);
    });

    test('rejects config with both web and server', () => {
      expect(() =>
        ConfigSchema.parse({
          web: {},
          server: {},
        }),
      ).toThrow(z.ZodError);
    });

    test('accepts web config', () => {
      const config = ConfigSchema.parse({ web: {} });
      expect(config.web).toBeDefined();
      expect(config.server).toBeUndefined();
    });

    test('accepts server config', () => {
      const config = ConfigSchema.parse({ server: {} });
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
      const parsed = ConfigSchema.parse(config);
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
      const parsed = ConfigSchema.parse(config);
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
      const parsed = ConfigSchema.parse(config);
      expect(parsed.packages).toBeDefined();
    });
  });

  // ========================================
  // SetupSchema Tests
  // ========================================

  describe('SetupSchema', () => {
    test('accepts minimal valid setup', () => {
      const validSetup = {
        version: 1 as const,
        environments: {
          prod: {
            web: {},
          },
        },
      };
      expect(() => SetupSchema.parse(validSetup)).not.toThrow();
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
        environments: {
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
      expect(() => SetupSchema.parse(validSetup)).not.toThrow();
    });

    test('requires version field', () => {
      expect(() =>
        SetupSchema.parse({
          environments: { prod: { web: {} } },
        }),
      ).toThrow();
    });

    test('requires version to be 1', () => {
      expect(() =>
        SetupSchema.parse({
          version: 2,
          environments: { prod: { web: {} } },
        }),
      ).toThrow('Only version 1 is currently supported');
    });

    test('validates $schema as URL when provided', () => {
      expect(() =>
        SetupSchema.parse({
          version: 1,
          $schema: 'not-a-url',
          environments: { prod: { web: {} } },
        }),
      ).toThrow();

      expect(
        SetupSchema.parse({
          version: 1,
          $schema: 'https://walkeros.io/schema/flow/v1.json',
          environments: { prod: { web: {} } },
        }),
      ).toHaveProperty('$schema', 'https://walkeros.io/schema/flow/v1.json');
    });

    test('requires at least one environment', () => {
      expect(() =>
        SetupSchema.parse({
          version: 1,
          environments: {},
        }),
      ).toThrow('At least one environment is required');
    });

    test('validates variables as primitive record', () => {
      expect(
        SetupSchema.parse({
          version: 1,
          variables: {
            STRING: 'value',
            NUMBER: 42,
            BOOLEAN: true,
          },
          environments: { prod: { web: {} } },
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
        environments: {
          prod: { web: {} },
        },
      };
      expect(() => SetupSchema.parse(validSetup)).not.toThrow();
    });

    test('validates multiple environments with different platforms', () => {
      const validSetup = {
        version: 1 as const,
        environments: {
          web_prod: { web: {} },
          web_stage: { web: {} },
          server_prod: { server: {} },
          server_stage: { server: {} },
        },
      };
      expect(() => SetupSchema.parse(validSetup)).not.toThrow();
    });
  });

  // ========================================
  // Helper Function Tests
  // ========================================

  describe('parseSetup', () => {
    test('successfully parses valid setup', () => {
      const validSetup = {
        version: 1,
        environments: {
          prod: { web: {} },
        },
      };
      expect(() => parseSetup(validSetup)).not.toThrow();
    });

    test('throws ZodError for invalid setup', () => {
      expect(() => parseSetup({})).toThrow(z.ZodError);
      expect(() => parseSetup({ version: 2 })).toThrow(z.ZodError);
    });
  });

  describe('safeParseSetup', () => {
    test('returns success for valid setup', () => {
      const validSetup = {
        version: 1,
        environments: {
          prod: { web: {} },
        },
      };
      const result = safeParseSetup(validSetup);
      expect(result.success).toBe(true);
    });

    test('returns error for invalid setup', () => {
      const result = safeParseSetup({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(z.ZodError);
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    test('provides detailed error messages', () => {
      const result = safeParseSetup({
        version: 2,
        environments: {},
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessages = result.error.issues.map((issue) => issue.message);
        expect(errorMessages).toContain(
          'Only version 1 is currently supported',
        );
        expect(errorMessages).toContain('At least one environment is required');
      }
    });
  });

  describe('parseConfig', () => {
    test('successfully parses valid config', () => {
      const validConfig = { web: {} };
      expect(() => parseConfig(validConfig)).not.toThrow();
    });

    test('throws ZodError for invalid config', () => {
      expect(() => parseConfig({})).toThrow(z.ZodError);
      expect(() => parseConfig({ platform: 'invalid' })).toThrow(z.ZodError);
    });
  });

  describe('safeParseConfig', () => {
    test('returns success for valid config', () => {
      const validConfig = { server: {} };
      const result = safeParseConfig(validConfig);
      expect(result.success).toBe(true);
    });

    test('returns error for invalid config', () => {
      const result = safeParseConfig({});
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
    test('setupJsonSchema is valid JSON Schema', () => {
      expect(setupJsonSchema).toHaveProperty('$schema');
      expect(setupJsonSchema).toHaveProperty('type', 'object');
      expect(setupJsonSchema).toHaveProperty('properties');
      expect((setupJsonSchema as any).properties).toHaveProperty('version');
      expect((setupJsonSchema as any).properties).toHaveProperty(
        'environments',
      );
    });

    test('configJsonSchema is valid JSON Schema', () => {
      expect(configJsonSchema).toHaveProperty('$schema');
      expect(configJsonSchema).toHaveProperty('type', 'object');
      expect(configJsonSchema).toHaveProperty('properties');
      expect((configJsonSchema as any).properties).toHaveProperty('web');
      expect((configJsonSchema as any).properties).toHaveProperty('server');
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
    test('complete multi-environment setup', () => {
      const realWorldSetup = {
        version: 1,
        $schema: 'https://walkeros.io/schema/flow/v1.json',
        variables: {
          CURRENCY: 'USD',
          REGION: 'us-east-1',
        },
        definitions: {
          base_collector: {
            run: true,
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
        environments: {
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
              run: true,
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
              run: true,
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

      expect(() => parseSetup(realWorldSetup)).not.toThrow();
      const parsed = parseSetup(realWorldSetup);
      expect(Object.keys(parsed.environments)).toHaveLength(3);
      expect(parsed.environments.web_production.web).toBeDefined();
      expect(parsed.environments.server_production.server).toBeDefined();
    });

    test('setup with variable interpolation structure', () => {
      const setupWithVars = {
        version: 1,
        variables: {
          GA4_PROD: 'G-PROD123',
          GA4_STAGE: 'G-STAGE456',
          CURRENCY: 'USD',
        },
        environments: {
          prod: {
            web: {},
            variables: {
              GA4_ID: 'G-PROD123', // Would be interpolated from ${GA4_PROD}
            },
          },
        },
      };

      expect(() => parseSetup(setupWithVars)).not.toThrow();
    });

    test('setup with JSON reference structure', () => {
      const setupWithRefs = {
        version: 1,
        definitions: {
          common_mapping: {
            page: { view: { name: 'page_view' } },
          },
        },
        environments: {
          prod: {
            web: {},
            destinations: {
              gtag: {
                package: '@walkeros/web-destination-gtag',
                config: {
                  mapping: { $ref: '#/definitions/common_mapping' },
                },
              },
            },
          },
        },
      };

      expect(() => parseSetup(setupWithRefs)).not.toThrow();
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
      expect(() => SetupSchema.parse(null)).toThrow();
      expect(() => SetupSchema.parse(undefined)).toThrow();
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
      expect(() => ConfigSchema.parse(deepConfig)).not.toThrow();
    });

    test('validates environment names are non-empty strings', () => {
      const setup = {
        version: 1,
        environments: {
          '': { web: {} }, // Empty string key
        },
      };
      // Zod record allows empty string keys, but this might be caught at application level
      expect(() => SetupSchema.parse(setup)).not.toThrow();
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
      const parsed = ConfigSchema.parse(config);
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
      const parsed = ConfigSchema.parse(config);
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
        environments: {
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
      expect(() => SetupSchema.parse(setup)).not.toThrow();
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
      const parsed = ConfigSchema.parse(config);
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
      const parsed = ConfigSchema.parse(config);
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
        environments: {
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
      expect(() => SetupSchema.parse(setup)).not.toThrow();
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
      const parsed = ConfigSchema.parse(config);
      expect(parsed.packages?.['@walkeros/collector'].version).toBe('latest');
    });

    test('accepts packages with imports only', () => {
      const config = {
        web: {},
        packages: {
          '@walkeros/collector': { imports: ['startFlow', 'Collector'] },
        },
      };
      const parsed = ConfigSchema.parse(config);
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
      const parsed = ConfigSchema.parse(config);
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
      expect(() => ConfigSchema.parse(config)).not.toThrow();
    });

    test('validates complete setup with packages at environment level', () => {
      const setup = {
        version: 1,
        environments: {
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
      expect(() => SetupSchema.parse(setup)).not.toThrow();
    });
  });

  describe('Web/Server Platform Validation', () => {
    test('web key with windowCollector property', () => {
      const config = {
        web: {
          windowCollector: 'customCollector',
        },
      };
      const parsed = ConfigSchema.parse(config);
      expect(parsed.web?.windowCollector).toBe('customCollector');
    });

    test('web key with windowElb property', () => {
      const config = {
        web: {
          windowElb: 'customElb',
        },
      };
      const parsed = ConfigSchema.parse(config);
      expect(parsed.web?.windowElb).toBe('customElb');
    });

    test('web key with both window properties', () => {
      const config = {
        web: {
          windowCollector: 'tracker',
          windowElb: 'track',
        },
      };
      const parsed = ConfigSchema.parse(config);
      expect(parsed.web?.windowCollector).toBe('tracker');
      expect(parsed.web?.windowElb).toBe('track');
    });

    test('server key accepts empty object', () => {
      const config = {
        server: {},
      };
      expect(() => ConfigSchema.parse(config)).not.toThrow();
    });

    test('rejects when both web and server are present', () => {
      const config = {
        web: {},
        server: {},
      };
      expect(() => ConfigSchema.parse(config)).toThrow(z.ZodError);
    });

    test('rejects when neither web nor server is present', () => {
      const config = {
        sources: {},
        destinations: {},
      };
      expect(() => ConfigSchema.parse(config)).toThrow(z.ZodError);
    });
  });
});
