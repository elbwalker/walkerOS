import type { WalkerOS } from '@elbwalker/types';
import type { NodeClient, NodeDestination } from './types';
import {
  Const,
  assign,
  getId,
  isSameType,
  tryCatchAsync,
} from '@elbwalker/utils';
import { pushToDestinations } from './push';
import { getConfig } from './config';

// Types
export * from './types';

export function createNodeClient(customConfig?: NodeClient.PartialConfig) {
  const instance = nodeClient(customConfig);
  const elb = instance.push;

  return { elb, instance };
}

export function nodeClient(
  customConfig: NodeClient.PartialConfig = {},
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

    return await tryCatchAsync(pushFn, (error) => {
      // Call custom error handling
      if (config.onError) config.onError(error, instance);

      defaultResult.status.error = String(error);
      return defaultResult;
    })(instance, ...args);
  };

  const instance: NodeClient.Function = {
    config,
    push,
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

  // Prefer explicit given config over default config
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
  const { event, action } = getEventOrAction(instance, nameOrEvent);

  // Walker command
  if (action) {
    const command = await handleCommand(instance, action, data, options);
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
  }

  // Regular event
  if (event) {
    // Add event to internal queue
    instance.config.queue.push(event);

    const { successful, queued, failed } = await pushToDestinations(
      instance,
      event,
    );

    result.event = event;
    result.status.ok = failed.length === 0;
    result.successful = successful;
    result.queued = queued;
    result.failed = failed;
  }

  return result;
};

function getEventOrAction(
  instance: NodeClient.Function,
  props: Partial<WalkerOS.Event> = {},
): { event?: WalkerOS.Event; action?: string } {
  if (!props.event) throw new Error('Event name is required');

  const [entity, action] = props.event.split(' ');
  if (!entity || !action) throw new Error('Event name is invalid');

  if (entity === Const.Commands.Walker) return { action };

  const config = instance.config;

  ++config.count;

  const timestamp = props.timestamp || Date.now();
  const timing =
    props.timing ||
    Math.round((timestamp - (props.timing || config.timing)) / 10) / 100;
  const group = props.group || config.group;
  const count = props.count || config.count;
  const source = props.source || config.source;
  if (props.source) {
    if (props.source.id) source.id = props.source.id;
    if (props.source.previous_id) source.previous_id = props.source.previous_id;
  }

  const event = {
    event: props.event,
    data: props.data || {},
    context: props.context || {},
    custom: props.custom || {},
    globals: props.globals || config.globals,
    user: props.user || config.user,
    nested: props.nested || [],
    consent: props.consent || config.consent,
    trigger: props.trigger || '',
    entity,
    action,
    timestamp,
    timing,
    group,
    count,
    id: `${timestamp}-${group}-${count}`,
    version: {
      client: config.client,
      tagging: config.tagging,
    },
    source,
  };

  return { event };
}

async function handleCommand(
  instance: NodeClient.Function,
  action: string,
  data?: NodeClient.PushData,
  options?: NodeClient.PushOptions,
): Promise<{ command: NodeClient.Command; result?: NodeClient.PushData }> {
  const command: NodeClient.Command = { name: action, data };
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

function setConfig(instance: NodeClient.Function, data: unknown = {}) {
  if (!isSameType(data, {} as WalkerOS.Config)) return;
  //@TODO strict type checking

  instance.config = getConfig(data, instance.config);
  return instance.config;
}

async function setConsent(instance: NodeClient.Function, data: unknown = {}) {
  if (!isSameType(data, {} as WalkerOS.Consent)) return;

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
  if (!isSameType(data, {} as WalkerOS.User)) return;

  const user: WalkerOS.User = {};

  if ('id' in data) user.id = data.id;
  if ('device' in data) user.device = data.device;
  if ('session' in data) user.session = data.session;

  instance.config.user = user;
  return user;
}

function run(instance: NodeClient.Function, data: unknown = {}) {
  if (!isSameType(data, {} as WalkerOS.Properties)) return;

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
