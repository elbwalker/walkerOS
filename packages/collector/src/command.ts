import type { Collector, Elb } from '@walkeros/core';
import type { HandleCommandFn } from './types/collector';
import { FatalError, useHooks, tryCatchAsync } from '@walkeros/core';
import { createPushResult } from './destination';

/**
 * Creates the command function for the collector.
 * Handles walker commands (config, consent, destination, etc.)
 *
 * @param collector - The walkerOS collector instance
 * @param handleCommand - Command handler function
 * @returns The command function
 */
export function createCommand<T extends Collector.Instance>(
  collector: T,
  handleCommand: HandleCommandFn<T>,
): Collector.CommandFn {
  return useHooks(
    async (
      command: string,
      data?: unknown,
      options?: unknown,
    ): Promise<Elb.PushResult> => {
      return await tryCatchAsync(
        async (): Promise<Elb.PushResult> => {
          return await handleCommand(collector, command, data, options);
        },
        (err: unknown) => {
          if (err instanceof FatalError) throw err;
          collector.status.failed++;
          collector.logger.error('command failed', {
            command,
            data,
            error: err,
          });
          return createPushResult({ ok: false });
        },
      )();
    },
    'Command',
    collector.hooks,
    collector.logger,
  ) as Collector.CommandFn;
}
