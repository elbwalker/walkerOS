import type { WalkerOS } from '@elbwalker/types';
import type { NodeClient, NodeDestination } from './types';
import { Const, assign, getId, isSameType } from '@elbwalker/utils';
import { createPush, pushToDestinations } from './push';
import { getState } from './state';
import { createResult } from './result';

// Types
export * from './types';

export function createNodeClient(customConfig?: NodeClient.InitConfig) {
  const instance = nodeClient(customConfig);
  const elb = instance.push;

  return { elb, instance };
}

export function nodeClient(
  customConfig: NodeClient.PartialConfig = {},
): NodeClient.Instance {
  const client = '2.0.0'; // Client version
  const state = getState(customConfig);
  const instance: NodeClient.Instance = {
    push: getPushFn(), // @TODO useHooks
    client,
    ...state,
  };

  function getPushFn(): NodeClient.Elb {
    return createPush(instance, handleCommand, handleEvent);
  }

  // That's when the party starts
  run(instance);

  return instance;
}

async function addDestination(
  instance: NodeClient.Instance,
  data: unknown = {},
  options: unknown = {},
) {
  if (!isSameType(data, {} as NodeDestination.Destination)) return;
  if (!isSameType(options, {} as NodeDestination.Config)) return;

  // Prefer explicit given config over default config
  const config = options || data.config || { init: false };

  const destination: NodeDestination.Destination = {
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
    } while (instance.destinations[id]);
  }

  instance.destinations[id] = destination;

  // Process previous events if not disabled
  if (config.queue !== false) destination.queue = [...instance.queue];
  return await pushToDestinations(instance, undefined, { [id]: destination });
}

const handleCommand: NodeClient.HandleCommand = async (
  instance,
  action,
  data?,
  options?,
) => {
  const command: NodeClient.Command = { name: action, data };

  switch (action) {
    case Const.Commands.Config:
      command.data = setConfig(instance, data) || {};
      break;
    case Const.Commands.Consent:
      await setConsent(instance, data);
      break;
    case Const.Commands.Destination:
      await addDestination(instance, data, options);
      break;
    case Const.Commands.Run:
      run(instance, data);
      break;
    case Const.Commands.User:
      command.data = setUser(instance, data);
      break;
  }

  return createResult({ command });
};

const handleEvent: NodeClient.HandleEvent = async (instance, event) => {
  // Check if walker is allowed to run
  if (!instance.allowed) return createResult({ status: { ok: false } });

  // Add event to internal queue
  instance.queue.push(event);

  return createResult(await pushToDestinations(instance, event));
};

function setConfig(instance: NodeClient.Instance, data: unknown = {}) {
  if (!isSameType(data, {} as WalkerOS.Config)) return;
  //@TODO strict type checking

  instance.config = getState(data, instance).config;
  return instance.config;
}

async function setConsent(instance: NodeClient.Instance, data: unknown = {}) {
  if (!isSameType(data, {} as WalkerOS.Consent)) return;

  let runQueue = false;
  Object.entries(data).forEach(([consent, granted]) => {
    const state = !!granted;

    instance.consent[consent] = state;

    // Only run queue if state was set to true
    runQueue = runQueue || state;
  });

  if (runQueue) return await pushToDestinations(instance);
}

function setUser(instance: NodeClient.Instance, data: unknown = {}) {
  if (!isSameType(data, {} as WalkerOS.User)) return;

  const user: WalkerOS.User = {};

  if ('id' in data) user.id = data.id;
  if ('device' in data) user.device = data.device;
  if ('session' in data) user.session = data.session;

  instance.user = user;
  return user;
}

function run(instance: NodeClient.Instance, data: unknown = {}) {
  if (!isSameType(data, {} as WalkerOS.Properties)) return;

  instance.config = assign(instance.config, {
    allowed: true, // Free the client
    count: 0, // Reset the run counter
    globals: assign(data, instance.config.globalsStatic),
    timing: Date.now(), // Set the timing offset
    group: getId(), // Generate a new group id for each run
  });

  // Reset the queue for each run without merging
  instance.queue = [];

  // Reset all destination queues
  Object.values(instance.destinations).forEach((destination) => {
    destination.queue = [];
  });

  return instance.config;
}

export default createNodeClient;
