import type { Collector, WalkerOS, Elb } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { createPushResult } from './destination';

/**
 * The ERROR an `elb` call reports for an argument its call form does not take.
 * Shared with the browser source, which reports its own calls the same way.
 */
export const ELB_IGNORED_ARGUMENTS =
  'elb ignored an argument it does not take: pass data as an object and put trigger, context, nested, custom inside the event object, elb({ name, data, trigger, context, nested, custom })';

/**
 * Creates the default ELB adapter.
 * Routes between collector.push and collector.command based on input:
 * `elb(partialEvent)`, `elb('walker <command>', data)` and the string form
 * `elb('entity action', data)`, which is exactly `{ name, data }`.
 *
 * An argument none of these forms takes is ignored; the call still runs and
 * is reported at ERROR, once per event or command name.
 *
 * @param collector - The walkerOS collector instance
 * @returns ELB adapter function
 */
export function createElb(collector: Collector.Instance): Elb.Fn {
  // Per name, so one event's report never hides another's.
  const reported = new Set<string>();
  const reportIgnored = (name: string) => {
    if (reported.has(name)) return;
    reported.add(name);
    collector.logger.error(ELB_IGNORED_ARGUMENTS, { event: name });
  };
  const hasExtra = (rest: unknown[]) => rest.some((arg) => arg !== undefined);

  return async (
    eventOrCommand?: unknown,
    data?: unknown,
    ...rest: unknown[]
  ): Promise<Elb.PushResult> => {
    // Detect walker commands
    if (
      typeof eventOrCommand === 'string' &&
      eventOrCommand.startsWith('walker ')
    ) {
      if (hasExtra(rest)) reportIgnored(eventOrCommand);
      const command = eventOrCommand.replace('walker ', '');
      return collector.command(command, data);
    }

    // Build event object
    let event: WalkerOS.DeepPartialEvent;

    if (typeof eventOrCommand === 'string') {
      // Convert string to object: elb('page view', { title: 'Home' })
      event = { name: eventOrCommand };
      if (isObject(data)) event.data = data as WalkerOS.Properties;
      else if (data !== undefined) reportIgnored(eventOrCommand);
    } else if (
      eventOrCommand &&
      typeof eventOrCommand === 'object' &&
      // Exclude arrays passed by untyped runtime callers; Elb.Fn already forbids them
      !Array.isArray(eventOrCommand)
    ) {
      // Use object directly: elb({ name: 'page view', data: {...} })
      // Shallow-clone so adapter writes never leak onto the caller's object
      event = { ...(eventOrCommand as WalkerOS.DeepPartialEvent) };
      if (data !== undefined) reportIgnored(String(event.name));
    } else {
      // Invalid input
      return createPushResult({ ok: false });
    }

    if (hasExtra(rest)) reportIgnored(String(event.name));

    // Call collector.push with event object
    return collector.push(event);
  };
}
