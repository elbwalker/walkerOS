/**
 * The shared secret redactor lives in `@walkeros/core/node` so the CLI logger,
 * the runtime logger and the runtime heartbeat share one set of patterns.
 */
export { scrubJson, scrubSecrets, redactLine } from '@walkeros/core/node';
