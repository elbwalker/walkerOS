import type { Elbwalker } from '@elbwalker/types';
import type { NodeClient, NodeDestination } from './types';
import { assign } from '@elbwalker/utils';

function nodeClient(
  customConfig: Partial<NodeClient.Config>,
): NodeClient.Function {
  const staticGlobals = customConfig.globals || {};
  const config = getConfig(customConfig, staticGlobals);

  const addDestination: NodeClient.AddDestination = (id, destination) => {
    config.destinations[id] = destination;
  };

  // @TODO push partial events
  const push: NodeClient.Push = async (event) => {
    // @TODO enhance event with globals etc.

    const { successful, failed } = await pushToDestinations(
      config.destinations,
      event,
    );

    return { successful, failed };
  };

  // @TODO validate

  // @TODO enrich

  const instance: NodeClient.Function = {
    addDestination,
    push,
    config,
  };

  return instance;
}

function getConfig(
  values: Partial<NodeClient.Config>,
  current: Partial<NodeClient.Config> = {},
  staticGlobals: Elbwalker.Properties = {},
): NodeClient.Config {
  const defaultConfig: NodeClient.Config = {
    allowed: false, // Wait for explicit run command to start
    consent: {}, // Handle the consent states
    custom: {}, // Custom state support
    count: 0, // Event counter for each run
    destinations: {}, // Destination list
    globals: assign(staticGlobals), // Globals enhanced with the static globals from init and previous values
    group: '', // Random id to group events of a run
    hooks: {}, // Manage the hook functions
    queue: [], // Temporary event queue for all events of a run
    round: 0, // The first round is a special one due to state changes
    timing: 0, // Offset counter to calculate timing property
    user: {}, // Handles the user ids
    tagging: 0, // Helpful to differentiate the clients used setup version
  };

  const globals = assign(
    staticGlobals,
    assign(current.globals || {}, values.globals || {}),
  );

  // Value hierarchy: values > current > default
  return {
    ...defaultConfig,
    ...current,
    ...values,
    globals,
  };
}

async function pushToDestinations(
  destinations: NodeClient.Destinations,
  event: Elbwalker.Event,
): Promise<{
  successful: NodeDestination.PushSuccess;
  failed: NodeDestination.PushFailure;
}> {
  const results: {
    id: string;
    destination: NodeDestination.Function;
    error?: unknown;
  }[] = await Promise.all(
    Object.entries(destinations).map(async ([id, destination]) => {
      try {
        await destination.push([
          {
            event,
            config: destination.config,
            // @TODO mapping: destination.mapping
          },
        ]);
        return { id, destination };
      } catch (error) {
        return { id, destination, error };
      }
    }),
  );

  const successful: NodeDestination.PushSuccess = [];
  const failed: NodeDestination.PushFailure = [];

  for (const result of results) {
    if (!result.error) {
      successful.push({ id: result.id, destination: result.destination });
    } else {
      failed.push({
        id: result.id,
        destination: result.destination,
        error: result.error,
      });
    }
  }

  return { successful, failed };
}

export default nodeClient;
