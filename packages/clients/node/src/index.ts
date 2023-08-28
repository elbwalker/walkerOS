import { Elbwalker } from '@elbwalker/types';
import type { NodeClient, NodeDestination } from './types';

function nodeClient(config: Partial<NodeClient.Config>): NodeClient.Function {
  const destinations: NodeClient.Destinations = {};

  const addDestination: NodeClient.AddDestination = (id, destination) => {
    destinations[id] = destination;
  };

  // @TODO push partial events
  const push: NodeClient.Push = async (event) => {
    // @TODO enhance event with globals etc.

    const { successful, failed } = await pushToDestinations(
      destinations,
      event,
    );

    return { successful, failed };
  };

  // @TODO validate

  // @TODO enrich

  const instance: NodeClient.Function = {
    addDestination,
    push,
    destinations,
    config: getConfig(config),
  };

  return instance;
}

function getConfig(config: Partial<NodeClient.Config>): NodeClient.Config {
  return {
    version: config.version || '0.0.0',
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
