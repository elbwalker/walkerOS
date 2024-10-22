import type { Destination, WalkerOS } from '@elbwalker/types';
import type { NodeClient, NodeDestination } from '../types';
import {
  assign,
  getGrantedConsent,
  isSameType,
  tryCatchAsync,
} from '@elbwalker/utils';
import { isCommand } from './helper';
import { destinationInit, destinationPush } from './destination';

export function createPush(
  instance: NodeClient.Instance,
  handleCommand: NodeClient.HandleCommand,
  handleEvent: NodeClient.HandleEvent,
): NodeClient.Elb {
  const push: NodeClient.Elb = async (
    nameOrEvent: string | WalkerOS.PartialEvent,
    data?: NodeClient.PushData,
    options?: NodeClient.PushOptions,
  ): Promise<NodeClient.PushResult> => {
    let result: NodeClient.PushResult = {
      status: { ok: false },
      successful: [],
      queued: [],
      failed: [],
    };

    return await tryCatchAsync(
      async (
        nameOrEvent: string | WalkerOS.PartialEvent,
        data?: NodeClient.PushData,
        options?: NodeClient.PushOptions,
      ): Promise<NodeClient.PushResult> => {
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
  instance: NodeClient.Instance,
  event?: WalkerOS.Event,
  destination?: NodeClient.Destinations,
): Promise<NodeDestination.PushResult> {
  const { consent, globals, user } = instance;

  // Push to all destinations if no destination was given
  const destinations = destination || instance.destinations;
  const config = instance.config;
  const results: Array<{
    id: string;
    destination: NodeDestination.Destination;
    skipped?: boolean;
    queue?: WalkerOS.Events;
    error?: unknown;
  }> = await Promise.all(
    // Process all destinations in parallel
    Object.entries(destinations).map(async ([id, destination]) => {
      // Setup queue of events to be processed
      let queue = ([] as Destination.Queue).concat(destination.queue || []);
      destination.queue = []; // Reset original queue while processing

      // Add event to queue stack
      if (event) queue.push(event);

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

          //Try to push and remove successful ones from queue
          return !(await tryCatchAsync(destinationPush, (err) => {
            // Call custom error handling
            if (config.onError) config.onError(err, instance);

            // Default error handling for failing destinations
            error = err; // Captured error from destination
          })(
            instance,
            destination,
            assign(event, {
              // Update previous values with the current state
              globals,
              user,
            }),
          ));
        }),
      );

      // Concatenate failed events with unprocessed ones in the queue
      queue.concat(dlq);

      return { id, destination, queue, error };
    }),
  );

  const successful: NodeDestination.PushSuccess = [];
  const queued: NodeDestination.PushSuccess = [];
  const failed: NodeDestination.PushFailure = [];

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
      destination.queue = assign(destination.queue || [], result.queue);
      queued.push({ id, destination });
    } else {
      successful.push({ id, destination });
    }
  }

  // @TODO add status check here
  return { successful, queued, failed };
}

function createEventOrCommand(
  instance: NodeClient.Instance,
  nameOrEvent: string | WalkerOS.PartialEvent,
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
  const [entity, action] = partialEvent.event.split(' ');
  if (!entity || !action) throw new Error('Event name is invalid');

  // It's a walker command
  if (isCommand(entity)) return { command: action };

  // Regular event

  // Increase event counter
  ++instance.count;

  // Extract properties with default fallbacks
  const {
    timestamp = Date.now(),
    group = instance.group,
    count = instance.count,
    source = { type: 'node', id: '', previous_id: '' },
    context = {},
    custom = {},
    globals = instance.globals,
    user = instance.user,
    nested = [],
    consent = instance.consent,
    trigger = '',
    version = {
      client: instance.client,
      tagging: instance.config.tagging,
    },
  } = partialEvent;

  const data: WalkerOS.Properties =
    partialEvent.data ||
    (isSameType(pushData, {} as WalkerOS.Properties) ? pushData : {});

  const timing =
    partialEvent.timing ||
    Math.round((Date.now() - instance.timing) / 10) / 100;

  const event: WalkerOS.Event = {
    event: `${entity} ${action}`,
    data,
    context,
    custom,
    globals,
    user,
    nested,
    consent,
    trigger,
    entity,
    action,
    timestamp,
    timing,
    group,
    count,
    id: `${timestamp}-${group}-${count}`,
    version,
    source,
  };

  return { event };
}
