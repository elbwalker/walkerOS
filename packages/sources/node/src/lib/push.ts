import type { WalkerOS } from '@elbwalker/types';
import type { SourceNode, DestinationNode } from '../types';
import {
  assign,
  getGrantedConsent,
  getMappingValue,
  isSameType,
  setByPath,
  tryCatchAsync,
} from '@elbwalker/utils';
import { isCommand } from './helper';
import { destinationInit, destinationPush } from './destination';

export function createPush(
  instance: SourceNode.Instance,
  handleCommand: SourceNode.HandleCommand,
  handleEvent: SourceNode.HandleEvent,
): SourceNode.Elb {
  const push: SourceNode.Elb = async (
    nameOrEvent: string | WalkerOS.DeepPartialEvent,
    data?: SourceNode.PushData,
    options?: SourceNode.PushOptions,
  ): Promise<SourceNode.PushResult> => {
    let result: SourceNode.PushResult = {
      status: { ok: false },
      successful: [],
      queued: [],
      failed: [],
    };

    return await tryCatchAsync(
      async (
        nameOrEvent: string | WalkerOS.DeepPartialEvent,
        data?: SourceNode.PushData,
        options?: SourceNode.PushOptions,
      ): Promise<SourceNode.PushResult> => {
        const { event, command } = createEventOrCommand(
          instance,
          nameOrEvent,
          data,
        );

        if (command) {
          // Command event
          const commandResult = await handleCommand(
            instance,
            command,
            data,
            options,
          );
          result = assign(result, commandResult);
        } else if (event) {
          // Regular event
          const eventResult = await handleEvent(instance, event);
          result = assign(result, eventResult);
          result.event = event;
        }

        return assign({ status: { ok: true } }, result);
      },
      (error) => {
        // Call custom error handling
        if (instance.config.onError) instance.config.onError(error, instance);

        result.status.error = String(error);
        return result;
      },
    )(nameOrEvent, data, options);
  };

  return push;
}

export async function pushToDestinations(
  instance: SourceNode.Instance,
  event?: WalkerOS.Event,
  destination?: SourceNode.Destinations,
): Promise<DestinationNode.PushResult> {
  const { consent, globals, user } = instance;

  // Push to all destinations if no destination was given
  const destinations = destination || instance.destinations;
  const config = instance.config;
  const results: Array<{
    id: string;
    destination: DestinationNode.Destination;
    skipped?: boolean;
    queue?: WalkerOS.Events;
    error?: unknown;
  }> = await Promise.all(
    // Process all destinations in parallel
    Object.entries(destinations).map(async ([id, destination]) => {
      // Setup queue of events to be processed
      let queue = ([] as WalkerOS.Events).concat(destination.queue || []);
      destination.queue = []; // Reset original queue while processing

      // Add event to queue stack
      if (event) {
        // Policy check
        Object.entries(destination.config.policy || []).forEach(
          ([key, mapping]) => {
            setByPath(event, key, getMappingValue(event, mapping, instance));
          },
        );

        queue.push(event);
      }

      // Nothing to do here if the queue is empty
      if (!queue.length) return { id, destination, skipped: true };

      const allowedEvents: WalkerOS.Events = [];
      queue = queue.filter((queuedEvent) => {
        const grantedConsent = getGrantedConsent(
          destination.config.consent, // Required
          consent, // Destination state
          queuedEvent.consent, // Individual event state
        );

        if (grantedConsent) {
          queuedEvent.consent = grantedConsent; // Save granted consent states only

          allowedEvents.push(queuedEvent); // Add to allowed queue
          return false; // Remove from destination queue
        }

        return true; // Keep denied events in the queue
      });

      // Execution shall not pass if no events are allowed
      if (!allowedEvents.length) {
        return { id, destination, queue }; // Don't push if not allowed
      }

      // Initialize the destination if needed
      const isInitialized = await tryCatchAsync(destinationInit)(
        instance,
        destination,
      );
      if (!isInitialized) return { id, destination, queue };

      // Process the destinations event queue
      let error: unknown;

      // Process allowed events and store failed ones in the dead letter queue (dlq)
      const dlq = await Promise.all(
        allowedEvents.filter(async (event) => {
          if (error) {
            // Skip if an error occurred
            destination.queue?.push(event); // Add back to queue
          }

          // Merge event with instance state, prioritizing event properties
          event = assign({}, event);
          event.globals = assign(globals, event.globals);
          event.user = assign(user, event.user);

          //Try to push and remove successful ones from queue
          return !(await tryCatchAsync(destinationPush, (err) => {
            // Call custom error handling
            if (config.onError) config.onError(err, instance);

            // Default error handling for failing destinations
            error = err; // Captured error from destination
          })(instance, destination, event));
        }),
      );

      // Concatenate failed events with unprocessed ones in the queue
      queue.concat(dlq);

      return { id, destination, queue, error };
    }),
  );

  const successful: DestinationNode.PushSuccess = [];
  const queued: DestinationNode.PushSuccess = [];
  const failed: DestinationNode.PushFailure = [];

  for (const result of results) {
    if (result.skipped) continue;

    const id = result.id;
    const destination = result.destination;

    if (result.error) {
      failed.push({
        id,
        destination,
        error: String(result.error),
      });
    } else if (result.queue && result.queue.length) {
      // Merge queue with existing queue
      destination.queue = (destination.queue || []).concat(result.queue);
      queued.push({ id, destination });
    } else {
      successful.push({ id, destination });
    }
  }

  // @TODO add status check here
  return { successful, queued, failed };
}

function createEventOrCommand(
  instance: SourceNode.Instance,
  nameOrEvent: string | WalkerOS.DeepPartialEvent,
  pushData: unknown,
): { event?: WalkerOS.Event; command?: string } {
  // Determine the partial event
  const partialEvent: WalkerOS.PartialEvent = isSameType(
    nameOrEvent,
    '' as string,
  )
    ? { event: nameOrEvent }
    : ((nameOrEvent || {}) as WalkerOS.PartialEvent);

  if (!partialEvent.event) throw new Error('Event name is required');

  // Check for valid entity and action event format
  const [entityValue, actionValue] = partialEvent.event.split(' ');
  if (!entityValue || !actionValue) throw new Error('Event name is invalid');

  // It's a walker command
  if (isCommand(entityValue)) return { command: actionValue };

  // Regular event

  // Increase event counter
  ++instance.count;

  // Values that are eventually used by other properties
  const {
    timestamp = Date.now(),
    group = instance.group,
    count = instance.count,
  } = partialEvent;

  // Extract properties with default fallbacks
  const {
    event = `${entityValue} ${actionValue}`,
    data = isSameType(pushData, {} as WalkerOS.Properties) ? pushData : {},
    context = {},
    globals = instance.globals,
    custom = {},
    user = instance.user,
    nested = [],
    consent = instance.consent,
    id = `${timestamp}-${group}-${count}`,
    trigger = '',
    entity = entityValue,
    action = actionValue,
    timing = Math.round((Date.now() - instance.timing) / 10) / 100,
    version = {
      source: instance.version,
      tagging: instance.config.tagging,
    },
    source = { type: 'node', id: '', previous_id: '' },
  } = partialEvent;

  const fullEvent: WalkerOS.Event = {
    event,
    data,
    context,
    globals,
    custom,
    user,
    nested,
    consent,
    id,
    trigger,
    entity,
    action,
    timestamp,
    timing,
    group,
    count,
    version,
    source,
  };

  return { event: fullEvent };
}
