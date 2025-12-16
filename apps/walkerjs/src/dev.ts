import {
  schemas as coreSchemas,
  z,
  zodToSchema,
  type JSONSchema,
} from '@walkeros/core/dev';
import { schemas as browserSchemas } from '@walkeros/web-source-browser/dev';
import { schemas as dataLayerSchemas } from '@walkeros/web-source-datalayer/dev';

/**
 * Walker.js Config schema
 *
 * Matches the Config interface in types/index.ts
 */
const ConfigSchema = z.object({
  collector: z
    .any()
    .optional()
    .describe('Collector configuration (Collector.InitConfig)'),
  browser: z
    .any()
    .optional()
    .describe('Browser source configuration (Partial<SourceBrowser.Settings>)'),
  dataLayer: z
    .union([z.boolean(), z.any()])
    .optional()
    .describe(
      'DataLayer configuration (boolean | Partial<SourceDataLayer.Settings>)',
    ),
  elb: z
    .string()
    .optional()
    .describe('Name for the global elb function (default: "elb")'),
  name: z.string().optional().describe('Name for the global instance'),
  run: z
    .boolean()
    .optional()
    .describe('Auto-run on initialization (default: true)'),
});

// Named exports for MDX PropertyTable usage
export const settings: JSONSchema = zodToSchema(ConfigSchema);
export const browserConfig: JSONSchema = browserSchemas.settings;
export const dataLayerConfig: JSONSchema = dataLayerSchemas.settings;
export const collectorConfig: JSONSchema =
  coreSchemas.CollectorSchemas.initConfigJsonSchema;
