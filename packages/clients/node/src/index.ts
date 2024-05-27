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
    client,
    ...state,
    push: (() => {}) as unknown as NodeClient.Elb, // Placeholder for the actual push function
  };

  // Overwrite the push function with the instance-reference
  instance.push = createPush(instance, handleCommand, handleEvent);

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
  let result: NodeClient.PushResult | NodeDestination.PushResult | undefined;

  switch (action) {
    case Const.Commands.Config:
      command.data = setConfig(instance, data) || {};
      break;
    case Const.Commands.Consent:
      result = await setConsent(instance, data);
      break;
    case Const.Commands.Custom:
      if (isSameType(data, {} as WalkerOS.Properties))
        instance.custom = assign(instance.custom, data);
      break;
    case Const.Commands.Destination:
      result = await addDestination(instance, data, options);
      break;
    case Const.Commands.Globals:
      if (isSameType(data, {} as WalkerOS.Properties))
        instance.globals = assign(instance.globals, data);
      break;
    case Const.Commands.Run:
      run(instance, data as Partial<NodeClient.State>);
      break;
    case Const.Commands.User:
      command.data = setUser(instance, data);
      break;
  }

  return createResult({ command, ...result });
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

function run(
  instance: NodeClient.Instance,
  state: Partial<NodeClient.State> = {},
) {
  const { config, destinations } = instance;

  const newState = assign(
    {
      allowed: true, // When run is called, the walker may start running
      count: 0, // Reset the run counter
      queue: [], // Reset the queue for each run without merging
      group: getId(), // Generate a new group id for each run
      timing: Date.now(), // Set the timing offset
    },
    { ...state },
  );

  newState.globals = assign(config.globalsStatic, state.globals);

  // Update the instance reference with the updated state
  assign(instance, newState, { merge: false, shallow: false, extend: false });

  ++instance.round; // Increase the round counter

  // Reset all destination queues
  Object.values(destinations).forEach((destination) => {
    destination.queue = [];
  });
}

export default createNodeClient;
