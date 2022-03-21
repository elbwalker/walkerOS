import { Elbwalker } from './types/elbwalker';
import { initHandler, loadHandler } from './lib/handler';
import { Walker } from './types/walker';
import { destination } from './lib/destination';
import { loadProject } from './lib/project';
import { assign, getGlobalProperties, randomString } from './lib/utils';
import { AnyObject } from './types/globals';
import { Destination } from './types/destination';

const w = window;
const elbwalker = {} as Elbwalker.Function;

let count = 0; // Event counter for each run
let group = randomString(); // random id to group events of a run
let globals: AnyObject = {}; // init globals as some random var
let user: Elbwalker.User = {}; // handles the user ids

elbwalker.destinations = [];

elbwalker.go = function (projectId?: string) {
  if (projectId) {
    // load individual project configuration
    loadProject(projectId);
  } else {
    // load custom destination and auto run
    this.destination(destination);
    this.run();
  }
};

elbwalker.run = function () {
  // Reset the run counter
  count = 0;

  // Generate a new group id for each run
  group = randomString();

  // Load globals properties
  // Due to site performance only once every run
  globals = getGlobalProperties();

  // Pushes for elbwalker
  elbLayerInit();

  // Register all handlers
  initHandler();
};

elbwalker.load = function () {
  loadHandler();
};

elbwalker.push = function (
  event: string,
  data?: AnyObject,
  trigger?: string,
  nested?: Walker.Entities,
): void {
  if (!event) return;

  const [entity, action] = event.split(' ');
  if (!entity || !action) return;

  if (entity === Elbwalker.Commands.Walker) {
    handleCommand(action, data);

    return;
  }

  ++count;
  const timestamp = Date.now();
  const timing = Math.round(performance.now() / 10) / 100;
  const id = `${timestamp}-${group}-${count}`;

  this.destinations.map((destination) => {
    destination.push({
      event,
      // Create a new objects for each destination
      // to prevent data manipulation
      data: assign({}, data),
      globals: assign({}, globals),
      user: assign({}, user as AnyObject),
      nested: nested || [],
      id,
      trigger: trigger || '',
      entity,
      action,
      timestamp,
      timing,
      group,
      count,
    });
  });
};

function elbLayerInit() {
  // @TODO support to push predefined stack
  // @TODO pass elbwalker object as paramter to detach from window workaround

  const elbLayer = w.elbLayer || [];

  elbLayer.push = function (...args: unknown[]) {
    const [event, data, trigger] = args;

    // @TODO push nested
    w.elbwalker.push(event as string, data as AnyObject, trigger as string);

    return Array.prototype.push.apply(this, [args]);
  };

  w.elbLayer = elbLayer;
}

function handleCommand(action: string, data: AnyObject = {}) {
  switch (action) {
    case Elbwalker.Commands.User:
      setUserIds(data);
      break;
    default:
      break;
  }
}

function setUserIds(data: Elbwalker.User) {
  // user ids can't be set to undefined
  if (data.id) user.id = data.id;
  if (data.device) user.device = data.device;
  if (data.hash) user.hash = data.hash;
}

// @TODO rename to addDestination or use elb command push
// Is that possible? What if there are events before the init
// maybe loop for elb entitiy first
elbwalker.destination = function (
  destination: Destination.Function,
  config: AnyObject = {}, // @TODO better type
) {
  if (config) {
    destination.init(config);
    destination.mapping = (config.mapping as Destination.Mapping) || false;
  }

  this.destinations.push(destination);
};

w.elbwalker = elbwalker;

export default elbwalker;
