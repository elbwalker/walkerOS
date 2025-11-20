/**
 * Schema exports for documentation and tooling
 *
 * DO NOT import this in runtime code!
 *
 * This entry point is only for:
 * - Website documentation (PropertyTable components)
 * - CLI config validation
 * - Development tooling
 *
 * Importing schemas pulls in Zod (~270KB), which is not needed
 * in production runtime bundles.
 *
 * Usage:
 *   import { schemas } from '@walkeros/collector/schemas';
 */
export * from './schemas';
