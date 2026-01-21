/**
 * Log levels from most to least severe
 */
export enum Level {
  ERROR = 0,
  INFO = 1,
  DEBUG = 2,
}

/**
 * Normalized error context extracted from Error objects
 */
export interface ErrorContext {
  message: string;
  name: string;
  stack?: string;
  cause?: unknown;
}

/**
 * Context passed to log handlers
 * If an Error was passed, it's normalized into the error property
 */
export interface LogContext {
  [key: string]: unknown;
  error?: ErrorContext;
}

/**
 * Log message function signature
 * Accepts string or Error as message, with optional context
 */
export type LogFn = (
  message: string | Error,
  context?: unknown | Error,
) => void;

/**
 * Throw function signature - logs error then throws
 * Returns never as it always throws
 */
export type ThrowFn = (message: string | Error, context?: unknown) => never;

/**
 * Default handler function (passed to custom handlers for chaining)
 */
export type DefaultHandler = (
  level: Level,
  message: string,
  context: LogContext,
  scope: string[],
) => void;

/**
 * Custom log handler function
 * Receives originalHandler to allow middleware-style chaining
 */
export type Handler = (
  level: Level,
  message: string,
  context: LogContext,
  scope: string[],
  originalHandler: DefaultHandler,
) => void;

/**
 * Logger instance with scoping support
 * All logs automatically include trace path from scoping
 */
export interface Instance {
  /**
   * Log an error message (always visible unless silenced)
   */
  error: LogFn;

  /**
   * Log an informational message
   */
  info: LogFn;

  /**
   * Log a debug message
   */
  debug: LogFn;

  /**
   * Log an error message and throw an Error
   * Combines logging and throwing in one call
   */
  throw: ThrowFn;

  /**
   * Create a scoped child logger with automatic trace path
   * @param name - Scope name (e.g., destination type, destination key)
   * @returns A new logger instance with the scope applied
   */
  scope: (name: string) => Instance;
}

/**
 * Logger configuration options
 */
export interface Config {
  /**
   * Minimum log level to display
   * @default Level.ERROR
   */
  level?: Level | keyof typeof Level;

  /**
   * Custom log handler function
   * Receives originalHandler to preserve default behavior
   */
  handler?: Handler;
}

/**
 * Internal config with resolved values and scope
 */
export interface InternalConfig {
  level: Level;
  handler?: Handler;
  scope: string[];
}

/**
 * Logger factory function type
 */
export type Factory = (config?: Config) => Instance;
