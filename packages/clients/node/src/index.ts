import type { Elbwalker } from '@elbwalker/types';
import type { NodeClient, NodeDestination } from './types';
import { assign, isSameType, trycatch } from '@elbwalker/utils';

export function createNodeClient(customConfig: Partial<NodeClient.Config>) {
  const instance = nodeClient(customConfig);
  const elb = instance.push;

  return { elb, instance };
}

export function nodeClient(
  customConfig: Partial<NodeClient.Config>,
): NodeClient.Function {
  const staticGlobals = customConfig.globals || {};
  const config = getConfig(customConfig, staticGlobals);

  const addDestination: NodeClient.AddDestination = (id, destination) => {
    addDestinationFn(instance, id, destination);
  };

  const push: NodeClient.Push = async (...args) => {
    return (
      trycatch(pushFn)(instance, ...args) || { successful: [], failed: [] }
    );
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

const addDestinationFn: NodeClient.PrependInstance<
  NodeClient.AddDestination
> = (instance, id, destination) => {
  instance.config.destinations[id] = destination;
};

const pushFn: NodeClient.PrependInstance<NodeClient.Push> = async (
  instance,
  nameOrEvent,
  data,
) => {
  let event: Elbwalker.Event | undefined;

  // Parameter handling
  if (isSameType(nameOrEvent, '' as string))
    nameOrEvent = { event: nameOrEvent };

  // Create the event
  event = getEvent(instance, nameOrEvent);

  const { successful, failed } = await pushToDestinations(
    instance.config.destinations,
    event,
  );

  return { successful, failed };
};

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

function getEvent(
  instance: NodeClient.Function,
  props: Partial<Elbwalker.Event>,
): Elbwalker.Event {
  if (!props.event) throw new Error('Event name is required');

  const [entity, action] = props.event.split(' ');
  if (!entity || !action) throw new Error('Event name is invalid');

  const data = props.data || {};

  // @TODO enhance event with globals etc.
  return {
    event: props.event,
    data,
    context: {},
    custom: {},
    globals: {},
    user: {},
    nested: [],
    consent: {},
    id: '',
    trigger: '',
    entity,
    action,
    timestamp: Date.now(),
    timing: 0,
    group: '',
    count: 0,
    version: { client: '', tagging: 0 },
    source: {
      type: 'node',
      id: '',
      previous_id: '',
    },
  };
}

async function pushToDestinations(
  destinations: NodeClient.Destinations,
  event: Elbwalker.Event,
): Promise<NodeDestination.PushResult> {
  const results: {
    id: string;
    destination: NodeDestination.Function;
    error?: unknown;
  }[] = await Promise.all(
    Object.entries(destinations).map(async ([id, destination]) => {
      // @TODO use trycatch
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

export default createNodeClient;
