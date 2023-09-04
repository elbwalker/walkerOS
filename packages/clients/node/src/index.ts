import type { Elbwalker } from '@elbwalker/types';
import type { NodeClient, NodeDestination } from './types';
import {
  Const,
  assign,
  getId,
  isSameType,
  tryCatchAsync,
} from '@elbwalker/utils';

// Types
export * from './types';

export function createNodeClient(customConfig?: Partial<NodeClient.Config>) {
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

  const push: NodeClient.Push = async (...args) => {
    const defaultResult: NodeClient.PushResult = {
      status: { ok: false },
      successful: [],
      queued: [],
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
    push,
    config,
  };

  // That's when the party starts
  run(instance); // @TODO check for allowed?

  return instance;
}

async function addDestination(
  instance: NodeClient.Function,
  data: unknown = {},
  options: unknown = {},
) {
  if (!isSameType(data, {} as NodeDestination.Function)) return;
  if (!isSameType(options, {} as NodeDestination.Config)) return;

  // Prefere explicit given config over default config
  const config = options || data.config || { init: false };

  const destination: NodeDestination.Function = {
    init: data.init,
    push: data.push,
    config,
    type: data.type,
  };

  let id = config.id; // Use given id
  if (!id) {
    // Generate a new id if none was given
    do {
      id = getId(4);
    } while (instance.config.destinations[id]);
  }

  instance.config.destinations[id] = destination;

  // Process previous events if not disabled
  if (config.queue !== false) destination.queue = [...instance.config.queue];
  return await pushToDestinations(instance, undefined, { [id]: destination });
}

function allowedToPush(
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

const pushFn: NodeClient.PrependInstance<NodeClient.Push> = async (
  instance,
  nameOrEvent,
  data,
  options,
) => {
  const result: NodeClient.PushResult = {
    status: { ok: false },
    successful: [],
    queued: [],
    failed: [],
  };

  // Parameter handling
  if (isSameType(nameOrEvent, '' as string))
    nameOrEvent = { event: nameOrEvent };

  // Create the event
  const eventOrAction = getEventOrAction(instance, nameOrEvent);

  if (isSameType(eventOrAction, '' as string)) {
    // Walker command
    const command = await handleCommand(instance, eventOrAction, data, options);
    if (command.result) {
      if (isSameType(command.result, {} as NodeDestination.PushResult)) {
        if (command.result.successful)
          result.successful = command.result.successful;
        if (command.result.queued) result.queued = command.result.queued;
        if (command.result.failed) result.failed = command.result.failed;
      }
    }

    result.command = command.command;
    result.status.ok = true;
  } else {
    // Regular event

    // Add event to internal queue
    instance.config.queue.push(eventOrAction);

    const { successful, queued, failed } = await pushToDestinations(
      instance,
      eventOrAction,
    );

    result.event = eventOrAction;
    result.status.ok = failed.length === 0;
    result.successful = successful;
    result.queued = queued;
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
    source: {
      type: 'node',
      id: '',
      previous_id: '',
    },
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
  const source = config.source;
  if (props.source) {
    if (props.source.id) source.id = props.source.id;
    if (props.source.previous_id) source.previous_id = props.source.previous_id;
  }

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

async function handleCommand(
  instance: NodeClient.Function,
  action: string,
  data?: NodeClient.PushData,
  options?: NodeClient.PushOptions,
): Promise<{ command: NodeClient.Command; result?: NodeClient.PushData }> {
  let command: NodeClient.Command = { name: action, data };
  let result: NodeClient.PushData | undefined;

  switch (action) {
    case Const.Commands.Config:
      command.data = setConfig(instance, data) || {};
      break;
    case Const.Commands.Consent:
      result = await setConsent(instance, data);
      break;
    case Const.Commands.Destination:
      result = await addDestination(instance, data, options);
      break;
    case Const.Commands.Run:
      result = run(instance, data);
      break;
    case Const.Commands.User:
      command.data = setUser(instance, data);
      break;
  }

  return { command, result };
}

async function pushToDestinations(
  instance: NodeClient.Function,
  event?: Elbwalker.Event,
  destination?: NodeClient.Destinations,
): Promise<NodeDestination.PushResult> {
  // Push to all destinations if no destination was given
  const destinations = destination || instance.config.destinations;
  const config = instance.config;
  const results: Array<{
    id: string;
    destination: NodeDestination.Function;
    skipped?: boolean;
    queue?: Elbwalker.Events;
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
            event.consent = config.consent;
            event.globals = config.globals;
            event.user = config.user;
            return { event, config: destination.config }; // @TODO mapping
          },
        );

        // Destination initialization
        // Check if the destination was initialized properly or try to do so
        if (destination.init && !destination.config.init) {
          const init = await destination.init(destination.config);

          destination.config.init = init;

          // don't push if init is false
          if (!init) return { id, destination, skipped: true };
        }

        const result =
          (await tryCatchAsync(destination.push, (error) => {
            // Default error handling for failing destinations
            return { error, queue: undefined };
          })(events)) || {};

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
        error: result.error,
      });
    } else if (result.queue && result.queue.length) {
      queued.push({ id, destination });
    } else {
      successful.push({ id: id, destination });
    }
  }

  // @TODO add status check here
  return { successful, queued, failed };
}

function setConfig(instance: NodeClient.Function, data: unknown = {}) {
  if (!isSameType(data, {} as Elbwalker.Config)) return;
  //@TODO strict type checking

  instance.config = getConfig(data, instance.config);
  return instance.config;
}

async function setConsent(instance: NodeClient.Function, data: unknown = {}) {
  if (!isSameType(data, {} as Elbwalker.Consent)) return;

  let runQueue = false;
  Object.entries(data).forEach(([consent, granted]) => {
    const state = !!granted;

    instance.config.consent[consent] = state;

    // Only run queue if state was set to true
    runQueue = runQueue || state;
  });

  if (runQueue) return await pushToDestinations(instance);
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

function run(instance: NodeClient.Function, data: unknown = {}) {
  if (!isSameType(data, {} as Elbwalker.Properties)) return;

  instance.config = assign(instance.config, {
    allowed: true, // Free the client
    count: 0, // Reset the run counter
    globals: assign(data, instance.config.globalsStatic),
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
