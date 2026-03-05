import { Level, type Logger } from '@walkeros/core';

export function createCollectorLoggerConfig(
  logger: Logger.Instance,
  verbose?: boolean,
): Logger.Config {
  return {
    level: verbose ? Level.DEBUG : Level.ERROR,
    handler: (level, message, context, scope) => {
      const scopePath = scope.length > 0 ? `[${scope.join(':')}] ` : '';
      const hasContext = Object.keys(context).length > 0;
      const contextStr = hasContext ? ` ${JSON.stringify(context)}` : '';
      if (level === Level.ERROR) {
        logger.error(`${scopePath}${message}${contextStr}`);
      } else {
        logger.debug(`${scopePath}${message}${contextStr}`);
      }
    },
  };
}
