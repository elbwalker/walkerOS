import { AnyObject, Elbwalker, Walker, WebDestination } from '@elbwalker/types';
import { initHandler } from './lib/handler';
import { destination } from './destinations/google-tag-manager';
import {
  assign,
  getGlobalProperties,
  randomString,
  trycatch,
} from './lib/utils';

const w = window;
const elbwalker = {} as Elbwalker.Function;
const destinations: WebDestination.Functions = [];
const runCommand = `${Elbwalker.Commands.Walker} ${Elbwalker.Commands.Run}`;

let count = 0; // Event counter for each run
let group = randomString(); // random id to group events of a run
let globals: AnyObject = {}; // init globals as some random var
let user: Elbwalker.User = {}; // handles the user ids
let allowRunning = false; // Wait for explicit run command to start
let calledPredefined = false; // Status of basic initialisation

elbwalker.go = function (config: Elbwalker.Config = {}) {
  // Setup pushes for elbwalker via elbLayer
  elbLayerInit(this);

  // Switch between init modes
  if (config.projectId) {
    // managed: use project configuration service
    loadProject(config.projectId);
  } else if (!config.custom) {
    // default: add GTM destination and auto run
    addDestination(destination);
    run(this);
  } else {
    // custom: use the elbLayer
  }
};

elbwalker.push = function (
  event?: string,
  data?: Elbwalker.PushData,
  trigger?: string,
  nested?: Walker.Entities,
): void {
  if (!event) return;

  // Check if walker is allowed to run
  if (!allowRunning) {
    // If not yet allowed check if this is the time
    if (event == runCommand) {
      allowRunning = true;
    } else {
      // Do not process events yet
      return;
    }
  }

  // Check for valid entity and action event format
  const [entity, action] = event.split(' ');
  if (!entity || !action) return;

  // Handle internal walker command events
  if (entity === Elbwalker.Commands.Walker) {
    handleCommand(action, data, this);
    return;
  }

  ++count;
  const timestamp = Date.now();
  const timing = Math.round(performance.now() / 10) / 100;
  const id = `${timestamp}-${group}-${count}`;

  destinations.map((destination) => {
    trycatch(() => {
      // Destination initialization
      // Check if the destination was initialized properly or try to do so
      if (destination.init && !destination.config.init)
        destination.config.init = destination.init();

      destination.push({
        event,
        // Create a new objects for each destination
        // to prevent data manipulation
        data: assign({}, data as AnyObject),
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
    })();
  });
};

function handleCommand(
  action: string,
  data: Elbwalker.PushData = {},
  elbwalker: Elbwalker.Function,
) {
  switch (action) {
    case Elbwalker.Commands.Destination:
      addDestination(data);
      break;
    case Elbwalker.Commands.Run:
      run(elbwalker);
      break;
    case Elbwalker.Commands.User:
      setUserIds(data as AnyObject);
      break;
    default:
      break;
  }
}

function elbLayerInit(elbwalker: Elbwalker.Function) {
  w.elbLayer = w.elbLayer || [];

  w.elbLayer.push = function (
    event?: string,
    data?: Elbwalker.PushData,
    trigger?: string,
    nested?: Walker.Entities,
  ) {
    elbwalker.push(event, data, trigger, nested);
    return Array.prototype.push.apply(this, [arguments]);
  };

  // Look if the run command is stacked
  const containsRun = (w.elbLayer as Array<unknown>).find(
    (element) => element == runCommand,
  );

  if (containsRun) run(elbwalker); // Run walker run
}

function run(elbwalker: Elbwalker.Function) {
  // Reset the run counter
  count = 0;

  // Generate a new group id for each run
  group = randomString();

  // Load globals properties
  // Due to site performance only once every run
  globals = getGlobalProperties();

  // Run predefined elbLayer stack once
  if (!calledPredefined) {
    calledPredefined = true;
    callPredefined(elbwalker);
  }

  // Register all handlers
  initHandler();
}

// Trigger events in the elbLayer
function callPredefined(elbwalker: Elbwalker.Function) {
  // there is a special execution order for all predefined events
  // prioritize all walker commands before others
  // this gurantees a fully configuration before the first run
  w.elbLayer.map((event) => {
    elbwalker.push(...event);
    // @TODO check for walker event
    // elbLayerPush(event);
  });
}

function setUserIds(data: Elbwalker.User) {
  // user ids can't be set to undefined
  if (data.id) user.id = data.id;
  if (data.device) user.device = data.device;
  if (data.hash) user.hash = data.hash;
}

function addDestination(data: Elbwalker.PushData) {
  // Skip validation due to trycatch calls on push
  const destination = {
    init: data.init,
    push: data.push,
    config: data.config || { init: false },
  } as WebDestination.Function;

  destinations.push(destination);
}

function loadProject(projectId: string) {
  const script = document.createElement('script');
  script.src = `${process.env.PROJECT_FILE}${projectId}.js`;
  document.head.appendChild(script);
}

w.elbwalker = elbwalker;

export default elbwalker;
