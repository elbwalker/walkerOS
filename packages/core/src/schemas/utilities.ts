import { z, toJsonSchema } from './validation';

/**
 * Utility Schemas
 *
 * Mirrors: types/storage.ts, types/handler.ts, and other utility types
 * Purpose: Runtime validation and JSON Schema generation for utility types
 *
 * Small, standalone schemas for utility types used throughout walkerOS:
 * - Storage types
 * - Handler functions
 * - Error/log management
 */

// ========================================
// Storage Schemas
// ========================================

/**
 * StorageType - Storage mechanism identifier
 *
 * Standard storage types:
 * - local: localStorage (persistent)
 * - session: sessionStorage (session-scoped)
 * - cookie: document.cookie (configurable expiry)
 *
 * Used for session persistence and user tracking
 */
export const StorageTypeSchema = z
  .enum(['local', 'session', 'cookie'])
  .describe('Storage mechanism: local, session, or cookie');

/**
 * Storage - Storage type constants
 * Provides const values for type-safe storage type references
 */
export const StorageSchema = z
  .object({
    Local: z.literal('local'),
    Session: z.literal('session'),
    Cookie: z.literal('cookie'),
  })
  .describe('Storage type constants for type-safe references');

// ========================================
// Handler Schemas
// ========================================

/**
 * Error - Error handler function type
 *
 * Signature: (error: unknown, state?: unknown) => void
 *
 * Called when errors occur during:
 * - Event processing
 * - Destination push operations
 * - Source event handling
 * - Mapping transformations
 *
 * Parameters:
 * - error: The error that occurred
 * - state: Optional state information for debugging
 *
 * Note: Function schemas use z.unknown() as functions aren't serializable
 */
export const ErrorHandlerSchema = z
  .any()
  .describe('Error handler function: (error, state?) => void');

/**
 * Log - Log handler function type
 *
 * Signature: (message: string, verbose?: boolean) => void
 *
 * Called for logging during:
 * - Event processing
 * - Configuration updates
 * - Debugging (when verbose enabled)
 *
 * Parameters:
 * - message: Log message
 * - verbose: Whether this is a verbose-only log
 *
 * Note: Function schemas use z.unknown() as functions aren't serializable
 */
export const LogHandlerSchema = z
  .any()
  .describe('Log handler function: (message, verbose?) => void');

/**
 * Handler - Combined handler interface
 * Groups Error and Log handlers
 */
export const HandlerSchema = z
  .object({
    Error: ErrorHandlerSchema.describe('Error handler function'),
    Log: LogHandlerSchema.describe('Log handler function'),
  })
  .describe('Handler interface with error and log functions');

// ========================================
// JSON Schema Exports (for Explorer/RJSF/MCP)
// ========================================

export const storageTypeJsonSchema = toJsonSchema(
  StorageTypeSchema,
  'StorageType',
);

export const storageJsonSchema = toJsonSchema(StorageSchema, 'Storage');

export const errorHandlerJsonSchema = toJsonSchema(
  ErrorHandlerSchema,
  'ErrorHandler',
);

export const logHandlerJsonSchema = toJsonSchema(
  LogHandlerSchema,
  'LogHandler',
);

export const handlerJsonSchema = toJsonSchema(HandlerSchema, 'Handler');
