import { Destination, WalkerOS } from '@elbwalker/types';
import { NodeClient, NodeDestination } from './types';
import { assign, isSameType, tryCatchAsync } from '@elbwalker/utils';

export function allowedToPush(
  instance: NodeClient.Function,
  destination: NodeDestination.Destination,
): boolean {
  // Default without consent handling
  let granted = true;

  // Check for consent
  const destinationConsent = destination.config.consent;

  if (destinationConsent) {
    // Let's be strict here
    granted = false;

    // Set the current consent states
    const consentStates = instance.config.consent;

    // Search for a required and granted consent
    Object.keys(destinationConsent).forEach((consent) => {
      if (consentStates[consent]) granted = true;
    });
  }

  return granted;
}

export async function pushToDestinations(
  instance: NodeClient.Function,
  event?: WalkerOS.Event,
  destination?: NodeClient.Destinations,
): Promise<NodeDestination.PushResult> {
  // Push to all destinations if no destination was given
  const destinations = destination || instance.config.destinations;
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
      const queue = ([] as Destination.Queue).concat(destination.queue || []);
      destination.queue = []; // Reset original queue while processing

      if (event)
        // Add event to queue
        queue.push(event);

      if (!queue.length)
        // Nothing to do here
        return { id, destination, skipped: true };

      // Always check for required consent states before pushing
      if (!allowedToPush(instance, destination))
        // Not allowed to continue
        return { id, destination, queue };

      // Update previous values with the current state
      const events: NodeDestination.PushEvents = queue.map((event) => {
        // @TODO check if this is correct, as a client might keeps running as a thread
        event.consent = assign(config.consent, event.consent);
        event.globals = assign(config.globals, event.globals);
        event.user = assign(config.user, event.user);
        return { event }; // @TODO mapping
      });

      // Destination initialization
      // Check if the destination was initialized properly or try to do so
      if (destination.init && !destination.config.init) {
        const init =
          (await tryCatchAsync(destination.init, (error) => {
            // Call custom error handling
            if (config.onError) config.onError(error, instance);
          })(destination.config)) || false;

        if (isSameType(init, {} as NodeDestination.Config)) {
          destination.config = init;
        } else {
          destination.config.init = init;
        }

        // don't push if init is false
        if (!init) return { id, destination, queue };
      }

      const result =
        (await tryCatchAsync(destination.push, (error) => {
          // Call custom error handling
          if (config.onError) config.onError(error, instance);

          // Default error handling for failing destinations
          return { error, queue: undefined };
        })(events, destination.config)) || {}; // everything is fine

      const error = result.error; // Captured error from destination

      return { id, destination, queue: [], error };
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
      destination.queue = assign(destination.queue, result.queue);
      queued.push({ id, destination });
    } else {
      successful.push({ id, destination });
    }
  }

  // @TODO add status check here
  return { successful, queued, failed };
}
