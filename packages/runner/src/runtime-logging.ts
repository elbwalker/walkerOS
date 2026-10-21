/**
 * The runner's loggers and the flow logger contract it offers a bundle.
 *
 * The runner's own lines and the flow's collector lines go through one
 * handler setup (masking, the ring tap) and one output format. The format is
 * the flow's own `logger.format`: the bundle entry reports the flow's logger
 * settings through `onLogger` before its collector starts, and every line
 * from then on, the runner's own included, uses it. No environment variable
 * sets it.
 */

import { Level, type Logger } from '@walkeros/core';
import {
  createCLILogger,
  createCLILoggerConfig,
  type CLILoggerColors,
  type CLILoggerOptions,
} from '@walkeros/core/node';

/** The flow's own logger settings, as the bundle entry reports them. */
export type FlowLoggerSettings = Pick<Logger.Config, 'level' | 'format'>;

/**
 * What the runner hands a bundle beside `context.logger` (see the CLI's
 * generated server entry): a level it forces over the flow's own, and the
 * hook that receives the flow's settings.
 */
export interface FlowLogger {
  /** Forced over the flow's level: DEBUG with `--verbose`. */
  logLevel?: Logger.Config['level'];
  /** Receives the flow's own settings before its collector starts. */
  onLogger: (settings: FlowLoggerSettings) => void;
}

export interface RuntimeLogging {
  /** The runner's own lines. */
  logger: Logger.Instance;
  /** Handed to the bundle as `context.logger`: the same masking and tap. */
  collectorConfig: Logger.Config;
  /** Handed to the bundle beside `context.logger`. */
  flowLogger: FlowLogger;
  /** The output format in effect: the flow's, once the bundle reported it. */
  format: () => Logger.Format;
}

/**
 * Build the runner's logger, the collector's logger config and the flow
 * logger hook around one shared format. `options` are the terminal options
 * (`verbose`, `silent`, `json`), `onLine` and `knownSecrets`.
 */
export function createRuntimeLogging(
  options: Omit<CLILoggerOptions, 'format'>,
  colors: CLILoggerColors = {},
): RuntimeLogging {
  let format: Logger.Format = 'text';
  const shared: CLILoggerOptions = { ...options, format: () => format };
  return {
    logger: createCLILogger(shared, colors),
    collectorConfig: createCLILoggerConfig(shared, colors),
    flowLogger: {
      ...(options.verbose ? { logLevel: Level.DEBUG } : {}),
      onLogger: (settings) => {
        if (settings.format) format = settings.format;
      },
    },
    format: () => format,
  };
}
