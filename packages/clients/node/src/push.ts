import { WalkerOS } from '@elbwalker/types';
import { NodeClient, NodeDestination } from './types';
import { assign, isSameType, tryCatchAsync } from '@elbwalker/utils';

export function allowedToPush(
  instance: NodeClient.Function,
  destination: NodeDestination.Function,
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
    destination: NodeDestination.Function;
    skipped?: boolean;
    queue?: WalkerOS.Events;
    error?: unknown;
  }> = await Promise.all(
    // Process all destinations in parallel
    Object.entries(destinations).map(async ([id, destination]) => {
      let error: unknown;

      destination.queue = destination.queue || [];
      if (event) destination.queue.push(event); // Add event to queue

      if (!destination.queue.length)
        // Nothing to do here
        return { id, destination, skipped: true };

      // Always check for required consent states before pushing
      if (allowedToPush(instance, destination)) {
        // Update previous values with the current state
        let events: NodeDestination.PushEvents = destination.queue.map(
          (event) => {
            // @TODO check if this is correct, as a client might keeps running as a thread
            event.consent = assign(config.consent, event.consent);
            event.globals = assign(config.globals, event.globals);
            event.user = assign(config.user, event.user);
            return { event }; // @TODO mapping
          },
        );

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
          if (!init) return { id, destination, queue: destination.queue };
        }

        const result =
          (await tryCatchAsync(destination.push, (error) => {
            // Call custom error handling
            if (config.onError) config.onError(error, instance);

            // Default error handling for failing destinations
            return { error, queue: undefined };
          })(events, destination.config)) || {}; // everything is fine

        // Destinations can decide how to handle errors and queue
        destination.queue = result.queue; // Events that should be queued again
        error = result.error; // Captured error from destination
      }

      return { id, destination, queue: destination.queue, error };
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
      queued.push({ id, destination });
    } else {
      successful.push({ id, destination });
    }
  }

  // @TODO add status check here
  return { successful, queued, failed };
}
