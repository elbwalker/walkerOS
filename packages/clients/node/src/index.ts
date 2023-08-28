import { Elbwalker } from '@elbwalker/types';
import type { NodeClient, NodeDestination } from './types';

function nodeClient(
  config: Partial<NodeClient.Config>,
): NodeClient.Function {
  const destinations: NodeClient.Destinations = {};

  const addDestination: NodeClient.AddDestination = (id, destination) => {
    destinations[id] = destination;
  };

  const push: NodeClient.Push = async (event) => {
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
    done: boolean;
    error?: unknown;
  }[] = await Promise.all(
    Object.entries(destinations).map(async ([id, destination]) => {
      try {
        await destination.push(event, destination.config);
        return { id, destination, done: true };
      } catch (error) {
        return { id, destination, done: false, error };
      }
    }),
  );

  const successful: NodeDestination.PushSuccess = [];
  const failed: NodeDestination.PushFailure = [];

  for (const result of results) {
    if (result.done) {
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
