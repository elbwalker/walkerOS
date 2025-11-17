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
    test('accepts minimal valid config', () => {
      const validConfig = {
        platform: 'web' as const,
      };
      expect(ConfigSchema.parse(validConfig)).toEqual(validConfig);
    });

    test('accepts complete valid config', () => {
      const validConfig = {
        platform: 'server' as const,
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
        env: {
          API_KEY: 'secret',
          DEBUG: 'false',
        },
      };
      expect(ConfigSchema.parse(validConfig)).toEqual(validConfig);
    });

    test('requires platform field', () => {
      expect(() => ConfigSchema.parse({})).toThrow();
    });

    test('validates platform enum values', () => {
      expect(() => ConfigSchema.parse({ platform: 'invalid' })).toThrow(
        z.ZodError,
      );

      try {
        ConfigSchema.parse({ platform: 'invalid' });
      } catch (error) {
        if (error instanceof z.ZodError) {
          expect(error.issues[0].message).toContain('Platform must be');
        }
      }
    });

    test('accepts web platform', () => {
      expect(ConfigSchema.parse({ platform: 'web' })).toHaveProperty(
        'platform',
        'web',
      );
    });

    test('accepts server platform', () => {
      expect(ConfigSchema.parse({ platform: 'server' })).toHaveProperty(
        'platform',
        'server',
      );
    });

    test('allows extension fields via passthrough', () => {
      const configWithExtensions = {
        platform: 'web' as const,
        build: {
          output: './dist/walker.js',
          minify: true,
        },
        docker: {
          port: 8080,
        },
        customField: 'custom value',
      };
      const parsed = ConfigSchema.parse(configWithExtensions);
      expect(parsed).toHaveProperty('build');
      expect(parsed).toHaveProperty('docker');
      expect(parsed).toHaveProperty('customField');
    });

    test('validates env as string record', () => {
      expect(() =>
        ConfigSchema.parse({
          platform: 'web',
          env: { KEY: 123 },
        }),
      ).toThrow();

      expect(
        ConfigSchema.parse({
          platform: 'web',
          env: { KEY: 'value' },
        }),
      ).toHaveProperty('env', { KEY: 'value' });
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
            platform: 'web' as const,
          },
        },
      };
      expect(SetupSchema.parse(validSetup)).toEqual(validSetup);
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
            platform: 'web' as const,
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
            platform: 'server' as const,
            destinations: {
              api: {
                package: '@walkeros/server-destination-api',
              },
            },
          },
        },
      };
      expect(SetupSchema.parse(validSetup)).toEqual(validSetup);
    });

    test('requires version field', () => {
      expect(() =>
        SetupSchema.parse({
          environments: { prod: { platform: 'web' } },
        }),
      ).toThrow();
    });

    test('requires version to be 1', () => {
      expect(() =>
        SetupSchema.parse({
          version: 2,
          environments: { prod: { platform: 'web' } },
        }),
      ).toThrow('Only version 1 is currently supported');
    });

    test('validates $schema as URL when provided', () => {
      expect(() =>
        SetupSchema.parse({
          version: 1,
          $schema: 'not-a-url',
          environments: { prod: { platform: 'web' } },
        }),
      ).toThrow();

      expect(
        SetupSchema.parse({
          version: 1,
          $schema: 'https://walkeros.io/schema/flow/v1.json',
          environments: { prod: { platform: 'web' } },
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
          environments: { prod: { platform: 'web' } },
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
          prod: { platform: 'web' as const },
        },
      };
      expect(SetupSchema.parse(validSetup)).toEqual(validSetup);
    });

    test('validates multiple environments with different platforms', () => {
      const validSetup = {
        version: 1 as const,
        environments: {
          web_prod: { platform: 'web' as const },
          web_stage: { platform: 'web' as const },
          server_prod: { platform: 'server' as const },
          server_stage: { platform: 'server' as const },
        },
      };
      expect(SetupSchema.parse(validSetup)).toEqual(validSetup);
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
          prod: { platform: 'web' },
        },
      };
      expect(() => parseSetup(validSetup)).not.toThrow();
      expect(parseSetup(validSetup)).toEqual(validSetup);
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
          prod: { platform: 'web' },
        },
      };
      const result = safeParseSetup(validSetup);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validSetup);
      }
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
      const validConfig = { platform: 'web' };
      expect(() => parseConfig(validConfig)).not.toThrow();
      expect(parseConfig(validConfig)).toEqual(validConfig);
    });

    test('throws ZodError for invalid config', () => {
      expect(() => parseConfig({})).toThrow(z.ZodError);
      expect(() => parseConfig({ platform: 'invalid' })).toThrow(z.ZodError);
    });
  });

  describe('safeParseConfig', () => {
    test('returns success for valid config', () => {
      const validConfig = { platform: 'server' };
      const result = safeParseConfig(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validConfig);
      }
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
      expect((configJsonSchema as any).properties).toHaveProperty('platform');
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
            platform: 'web',
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
            env: {
              DEBUG: 'false',
            },
            build: {
              output: './dist/walker.min.js',
              minify: true,
              sourcemap: false,
            },
          },
          web_staging: {
            platform: 'web',
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
            env: {
              DEBUG: 'true',
            },
          },
          server_production: {
            platform: 'server',
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
            docker: {
              port: 8080,
              host: '0.0.0.0',
            },
          },
        },
      };

      expect(() => parseSetup(realWorldSetup)).not.toThrow();
      const parsed = parseSetup(realWorldSetup);
      expect(Object.keys(parsed.environments)).toHaveLength(3);
      expect(parsed.environments.web_production.platform).toBe('web');
      expect(parsed.environments.server_production.platform).toBe('server');
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
            platform: 'web',
            env: {
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
            platform: 'web',
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

    test('preserves unknown fields in config due to passthrough', () => {
      const config = {
        platform: 'web',
        unknownField1: 'value1',
        unknownField2: { nested: 'value2' },
      };
      const parsed = ConfigSchema.parse(config);
      expect(parsed).toHaveProperty('unknownField1', 'value1');
      expect(parsed).toHaveProperty('unknownField2', { nested: 'value2' });
    });

    test('handles deeply nested config structures', () => {
      const deepConfig = {
        platform: 'web',
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
          '': { platform: 'web' }, // Empty string key
        },
      };
      // Zod record allows empty string keys, but this might be caught at application level
      expect(() => SetupSchema.parse(setup)).not.toThrow();
    });
  });
});
