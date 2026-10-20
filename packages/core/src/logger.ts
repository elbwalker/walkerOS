import type {
  Config,
  DefaultHandler,
  ErrorContext,
  Handler,
  Instance,
  InternalConfig,
  LogContext,
} from './types/logger';
import { Level } from './types/logger';

/**
 * An error's `cause` reduced to its name and code: a cause can carry a
 * request, a response body or settings, none of which belong in a log line.
 */
function normalizeCause(
  cause: unknown,
): { name?: string; code?: string | number } | undefined {
  if (typeof cause !== 'object' || cause === null) return undefined;
  const reduced: { name?: string; code?: string | number } = {};
  if ('name' in cause && typeof cause.name === 'string')
    reduced.name = cause.name;
  if (
    'code' in cause &&
    (typeof cause.code === 'string' || typeof cause.code === 'number')
  )
    reduced.code = cause.code;
  return reduced;
}

/**
 * Normalize an Error object into ErrorContext. Never copies a response body
 * (`StepError.body`) and keeps only the cause's name and code.
 */
function normalizeError(err: Error): ErrorContext {
  const context: ErrorContext = {
    message: err.message,
    name: err.name,
    stack: err.stack,
  };
  const cause = normalizeCause(err.cause);
  if (cause) context.cause = cause;
  return context;
}

/**
 * Normalize message and context parameters
 * Handles Error objects passed as message or context
 */
function normalizeParams(
  message: string | Error,
  context?: unknown | Error,
): { message: string; context: LogContext } {
  let normalizedMessage: string;
  let normalizedContext: LogContext = {};

  // Handle message
  if (message instanceof Error) {
    normalizedMessage = message.message;
    normalizedContext.error = normalizeError(message);
  } else {
    normalizedMessage = message;
  }

  // Handle context
  if (context !== undefined) {
    if (context instanceof Error) {
      normalizedContext.error = normalizeError(context);
    } else if (typeof context === 'object' && context !== null) {
      normalizedContext = { ...normalizedContext, ...(context as object) };
      // If context has an error property that's an Error, normalize it
      if (
        'error' in normalizedContext &&
        normalizedContext.error instanceof Error
      ) {
        normalizedContext.error = normalizeError(
          normalizedContext.error as unknown as Error,
        );
      }
    } else {
      normalizedContext.value = context;
    }
  }

  return { message: normalizedMessage, context: normalizedContext };
}

/**
 * Default console-based log handler
 */
const defaultHandler: DefaultHandler = (level, message, context, scope) => {
  const levelName = Level[level];
  const scopePath = scope.length > 0 ? ` [${scope.join(':')}]` : '';
  const prefix = `${levelName}${scopePath}`;

  const hasContext = Object.keys(context).length > 0;

  const consoleFn =
    level === Level.ERROR
      ? console.error
      : level === Level.WARN
        ? console.warn
        : console.log;

  if (hasContext) {
    consoleFn(prefix, message, context);
  } else {
    consoleFn(prefix, message);
  }
};

/**
 * Normalize log level from string or enum to enum value
 */
function normalizeLevel(level: Level | keyof typeof Level): Level {
  if (typeof level === 'string') {
    return Level[level as keyof typeof Level];
  }
  return level;
}

/**
 * Create a logger instance
 *
 * @param config - Logger configuration
 * @returns Logger instance with all log methods and scoping support
 *
 * @example
 * ```typescript
 * // Basic usage
 * const logger = createLogger({ level: 'DEBUG' });
 * logger.info('Hello world');
 *
 * // With scoping
 * const destLogger = logger.scope('gtag').scope('myInstance');
 * destLogger.debug('Processing event'); // DEBUG [gtag:myInstance] Processing event
 *
 * // With custom handler
 * const logger = createLogger({
 *   handler: (level, message, context, scope, originalHandler) => {
 *     // Custom logic (e.g., send to Sentry)
 *     originalHandler(level, message, context, scope);
 *   }
 * });
 * ```
 *
 * // TODO: Consider compile-time stripping of debug logs in production builds
 * // e.g., if (__DEV__) { logger.debug(...) }
 */
export function createLogger(config: Config = {}): Instance {
  const level =
    config.level !== undefined ? normalizeLevel(config.level) : Level.ERROR;
  const customHandler = config.handler;
  const jsonHandler = config.jsonHandler;
  const scope: string[] = [];

  return createLoggerInternal({
    level,
    handler: customHandler,
    jsonHandler,
    scope,
  });
}

/**
 * Internal logger creation with resolved config
 */
function createLoggerInternal(config: InternalConfig): Instance {
  const { level, handler, jsonHandler, scope } = config;

  /**
   * Internal log function that checks level and delegates to handler
   */
  const log = (
    logLevel: Level,
    message: string | Error,
    context?: unknown | Error,
  ): void => {
    if (logLevel <= level) {
      const normalized = normalizeParams(message, context);

      if (handler) {
        // Custom handler with access to default handler
        handler(
          logLevel,
          normalized.message,
          normalized.context,
          scope,
          defaultHandler,
        );
      } else {
        defaultHandler(logLevel, normalized.message, normalized.context, scope);
      }
    }
  };

  /**
   * Throw only: the collector's catch writes the one line for the failure,
   * so logging here as well would print every failure twice.
   */
  const throwOnly = (message: string | Error, context?: unknown): never => {
    throw new Error(normalizeParams(message, context).message);
  };

  return {
    error: (message, context) => log(Level.ERROR, message, context),
    warn: (message, context) => log(Level.WARN, message, context),
    info: (message, context) => log(Level.INFO, message, context),
    debug: (message, context) => log(Level.DEBUG, message, context),
    throw: throwOnly,
    json: (data: unknown) => {
      if (jsonHandler) {
        jsonHandler(data);
      } else {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(data, null, 2));
      }
    },
    scope: (name: string) =>
      createLoggerInternal({
        level,
        handler,
        jsonHandler,
        scope: [...scope, name],
      }),
  };
}

// Re-export Level enum for convenience
export { Level };
