import type { Collector, Elb } from '@walkeros/core';
import { useHooks, tryCatchAsync } from '@walkeros/core';
import { createPushResult } from './destination';

export type HandleCommandFn<T extends Collector.Instance> = (
  collector: T,
  action: string,
  data?: unknown,
  options?: unknown,
) => Promise<Elb.PushResult>;

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
        () => {
          return createPushResult({ ok: false });
        },
      )();
    },
    'Command',
    collector.hooks,
  ) as Collector.CommandFn;
}
