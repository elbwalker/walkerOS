/**
 * Schema exports for documentation and tooling
 *
 * DO NOT import this in runtime code!
 *
 * This entry point is only for:
 * - Website documentation (PropertyTable components)
 * - Development tooling
 *
 * Importing schemas pulls in Zod (~270KB), which is not needed
 * in production runtime bundles.
 *
 * Usage:
 *   import { schemas } from '@walkeros/web-destination-api/schemas';
 */
export * from './schemas';
