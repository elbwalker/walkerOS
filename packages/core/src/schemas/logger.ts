import { z } from './validation';

/**
 * Logger schemas
 *
 * Mirrors: types/handler.ts (Logger namespace)
 * Purpose: Canonical schemas for logger configuration used across
 * destination / source / transformer / store / collector configs.
 *
 * Extracted from five duplicated inline `logger: z.object({...})` blocks
 * to satisfy the DRY principle and provide a single canonical `Logger.Config`
 * title in the generated JSON Schema output.
 */

/**
 * LoggerHandlerSchema - Custom log handler function
 *
 * Kept as `z.any()` because function-signature enforcement belongs in the
 * TypeScript layer; the Zod schema only needs to be nameable in JSON Schema.
 */
export const LoggerHandlerSchema = z.any().meta({
  id: 'LoggerHandler',
  title: 'Logger.Handler',
  description: 'Custom log handler function (level, ...args) => void',
});

/**
 * LoggerConfigSchema - Logger configuration
 *
 * Allows components to override the collector-default logger by providing a
 * minimum log level and / or a custom handler.
 */
export const LoggerConfigSchema = z
  .object({
    level: z
      .union([z.number(), z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG'])])
      .optional()
      .describe('Minimum log level (default: ERROR)'),
    handler: LoggerHandlerSchema.optional().describe(
      'Custom log handler function',
    ),
  })
  .meta({
    id: 'LoggerConfig',
    title: 'Logger.Config',
    description:
      'Logger configuration (level, handler) to override the collector defaults',
  });
