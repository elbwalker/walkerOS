import {
  Elbwalker,
  AnyObject,
  Destination,
  DestinationMapping,
} from './types/elbwalker';
import { initHandler, loadHandler } from './lib/handler';
import { Entities } from './types/walker';
import { destination } from './lib/destination';
import { loadProject } from './lib/project';

const w = window;
const d = document;
const elbwalker = {} as Elbwalker;

w.elbwalker = elbwalker;

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

elbwalker.load = function () {
  loadHandler();
};

elbwalker.run = function () {
  // Pushes for elbwalker
  elbLayerInit();

  // Register all handlers
  initHandler();
};

elbwalker.push = function (
  event: string,
  data?: AnyObject,
  trigger?: string,
  nested?: Entities,
): void {
  if (!event) return;

  const [entity, action] = event.split(' ');
  if (!entity || !action) return;

  this.destinations.map((destination) => {
    destination.push({
      entity,
      action,
      data: Object.assign({}, data), // Create a new object for each destination
      trigger,
      nested: nested || [],
    });
  });
};

// @TODO rename to addDestination or use elb command push
// Is that possible? What if there are events before the init
// maybe loop for elb entitiy first
elbwalker.destination = function (
  destination: Destination,
  config: AnyObject = {}, // @TODO better type
) {
  if (config) {
    destination.init(config);
    destination.mapping = (config.mapping as DestinationMapping) || false;
  }

  this.destinations.push(destination);
};

function elbLayerInit() {
  // @TODO support to push predefined stack

  const elbLayer = w.elbLayer || [];

  elbLayer.push = function (...args: unknown[]) {
    const [event, data, trigger] = args;

    // @TODO push nested
    w.elbwalker.push(event as string, data as AnyObject, trigger as string);

    return Array.prototype.push.apply(this, [args]);
  };

  w.elbLayer = elbLayer;
}

export default elbwalker;
