import type { Elbwalker } from '@elbwalker/types';
import type { NodeClient, NodeDestination } from './types';
import {
  Const,
  assign,
  getId,
  isSameType,
  tryCatchAsync,
} from '@elbwalker/utils';

export function createNodeClient(
  customConfig: Partial<NodeClient.Config> = {},
) {
  const instance = nodeClient(customConfig);
  const elb = instance.push;

  return { elb, instance };
}

export function nodeClient(
  customConfig: Partial<NodeClient.Config> = {},
): NodeClient.Function {
  const client = '2.0.0';
  const config = getConfig(customConfig, {
    client,
    globalsStatic: customConfig.globals, // Initial globals are static values
  });

  const addDestination: NodeClient.AddDestination = (id, destination) => {
    addDestinationFn(instance, id, destination);
  };

  const push: NodeClient.Push = async (...args) => {
    const defaultResult: NodeClient.PushResult = {
      status: { ok: false },
      successful: [],
      failed: [],
    };

    return (
      (await tryCatchAsync(pushFn, (error) => {
        defaultResult.status.error = error;
        return defaultResult;
      })(instance, ...args)) || defaultResult
    );
  };

  const instance: NodeClient.Function = {
    addDestination,
    push,
    config,
  };

  // That's when the party starts
  run(instance); // @TODO check for allowed?

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
  const result: NodeClient.PushResult = {
    status: { ok: false },
    successful: [],
    failed: [],
  };

  // Parameter handling
  if (isSameType(nameOrEvent, '' as string))
    nameOrEvent = { event: nameOrEvent };

  // Create the event
  const eventOrAction = getEventOrAction(instance, nameOrEvent);

  if (isSameType(eventOrAction, '' as string)) {
    // Walker command
    data = handleCommand(instance, eventOrAction, data);
    result.command = { name: eventOrAction, data };
    result.status.ok = true;
  } else {
    // Regular event
    const { successful, failed } = await pushToDestinations(
      instance.config.destinations,
      eventOrAction,
    );

    result.event = eventOrAction;
    result.status.ok = failed.length === 0;
    result.successful = successful;
    result.failed = failed;
  }

  return result;
};

function getConfig(
  values: Partial<NodeClient.Config> = {},
  current: Partial<NodeClient.Config> = {},
): NodeClient.Config {
  const globalsStatic = current.globalsStatic || {};
  const defaultConfig: NodeClient.Config = {
    allowed: false, // Wait for explicit run command to start
    client: '0.0.0', // Client version
    consent: {}, // Handle the consent states
    custom: {}, // Custom state support
    count: 0, // Event counter for each run
    destinations: {}, // Destination list
    globals: {}, // To be overwritten
    globalsStatic, // Basic values from initial config
    group: '', // Random id to group events of a run
    hooks: {}, // Manage the hook functions
    queue: [], // Temporary event queue for all events of a run
    round: 0, // The first round is a special one due to state changes
    timing: 0, // Offset counter to calculate timing property
    user: {}, // Handles the user ids
    tagging: 0, // Helpful to differentiate the clients used setup version
  };

  const globals = assign(
    globalsStatic,
    assign(current.globals || {}, values.globals || {}),
  );

  // Value hierarchy: values > current > default
  return {
    ...defaultConfig,
    ...current,
    ...values,
    globals,
    globalsStatic,
  };
}

function getEventOrAction(
  instance: NodeClient.Function,
  props: Partial<Elbwalker.Event> = {},
): Elbwalker.Event | string {
  if (!props.event) throw new Error('Event name is required');

  const [entity, action] = props.event.split(' ');
  if (!entity || !action) throw new Error('Event name is invalid');

  if (entity === Const.Commands.Walker) return action;

  const config = instance.config;

  ++config.count;
  const event = props.event;
  const data = props.data || {};
  const context = props.context || {};
  const custom = props.custom || {};
  const globals = props.globals || config.globals;
  const user = props.user || config.user;
  const nested = props.nested || [];
  const consent = props.consent || config.consent;
  const trigger = props.trigger || '';
  const timestamp = Date.now();
  const timing = Math.round((timestamp - config.timing) / 10) / 100;
  const group = config.group;
  const count = config.count;
  const id = `${timestamp}-${group}-${count}`;
  const version = {
    client: config.client,
    tagging: config.tagging,
  };
  const source = {
    type: 'node',
    id: '@TODO',
    previous_id: '@TODO',
  };

  return {
    event,
    data,
    context,
    custom,
    globals,
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
}

function handleCommand(
  instance: NodeClient.Function,
  action: string,
  data?: Elbwalker.PushData,
): Elbwalker.PushData | undefined {
  switch (action) {
    case Const.Commands.Config:
      return setConfig(instance, data);
    case Const.Commands.User:
      return setUser(instance, data);
  }

  return;
}

async function pushToDestinations(
  destinations: NodeClient.Destinations,
  event: Elbwalker.Event,
): Promise<NodeDestination.PushResult> {
  const results: Array<{
    id: string;
    destination: NodeDestination.Function;
    error?: unknown;
  }> = await Promise.all(
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

function setConfig(instance: NodeClient.Function, data: unknown = {}) {
  if (!isSameType(data, {} as Elbwalker.Config)) return;
  //@TODO strict type checking

  instance.config = getConfig(data, instance.config);
  return instance.config;
}

function setUser(instance: NodeClient.Function, data: unknown = {}) {
  if (!isSameType(data, {} as Elbwalker.User)) return;

  const user: Elbwalker.User = {};

  if ('id' in data) user.id = data.id;
  if ('device' in data) user.device = data.device;
  if ('session' in data) user.session = data.session;

  instance.config.user = user;
  return user;
}

function run(instance: NodeClient.Function): Elbwalker.Config {
  instance.config = assign(instance.config, {
    allowed: true, // Free the client
    count: 0, // Reset the run counter
    globals: assign(
      // @TODO add a globals parameter
      instance.config.globalsStatic,
    ),
    timing: Date.now(), // Set the timing offset
    group: getId(), // Generate a new group id for each run
  });

  // Reset the queue for each run without merging
  instance.config.queue = [];

  // Reset all destination queues
  Object.values(instance.config.destinations).forEach((destination) => {
    destination.queue = [];
  });

  return instance.config;
}

export default createNodeClient;
