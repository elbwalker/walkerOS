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
 * Normalize an Error object into ErrorContext
 */
function normalizeError(err: Error): ErrorContext {
  return {
    message: err.message,
    name: err.name,
    stack: err.stack,
    cause: (err as Error & { cause?: unknown }).cause,
  };
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

  if (level === Level.ERROR) {
    if (hasContext) {
      console.error(prefix, message, context);
    } else {
      console.error(prefix, message);
    }
  } else {
    if (hasContext) {
      console.log(prefix, message, context);
    } else {
      console.log(prefix, message);
    }
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
  const scope: string[] = [];

  return createLoggerInternal({ level, handler: customHandler, scope });
}

/**
 * Internal logger creation with resolved config
 */
function createLoggerInternal(config: InternalConfig): Instance {
  const { level, handler, scope } = config;

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
   * Log and throw - combines logging and throwing
   */
  const logAndThrow = (message: string | Error, context?: unknown): never => {
    // Always log errors regardless of level
    const normalized = normalizeParams(message, context);

    if (handler) {
      handler(
        Level.ERROR,
        normalized.message,
        normalized.context,
        scope,
        defaultHandler,
      );
    } else {
      defaultHandler(
        Level.ERROR,
        normalized.message,
        normalized.context,
        scope,
      );
    }

    // Throw with the message
    throw new Error(normalized.message);
  };

  return {
    error: (message, context) => log(Level.ERROR, message, context),
    info: (message, context) => log(Level.INFO, message, context),
    debug: (message, context) => log(Level.DEBUG, message, context),
    throw: logAndThrow,
    scope: (name: string) =>
      createLoggerInternal({
        level,
        handler,
        scope: [...scope, name],
      }),
  };
}

// Re-export Level enum for convenience
export { Level };
