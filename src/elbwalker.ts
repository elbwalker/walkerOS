import { AnyObject, Elbwalker, Walker, WebDestination } from '@elbwalker/types';
import { initHandler, ready, triggerLoad } from './lib/handler';
import { destination } from './destinations/google-tag-manager';
import {
  assign,
  getGlobalProperties,
  isArgument,
  randomString,
  trycatch,
} from './lib/utils';

const w = window;
const elbwalker = {} as Elbwalker.Function;
const destinations: WebDestination.Functions = [];
const runCommand = `${Elbwalker.Commands.Walker} ${Elbwalker.Commands.Run}`;
const version: Elbwalker.Version = {
  walker: 1.4,
  config: 0,
};

let _count = 0; // Event counter for each run
let _group = ''; // random id to group events of a run
let _globals: AnyObject = {}; // init globals as some random var
let _user: Elbwalker.User = {}; // handles the user ids
let _firstRun = true; // The first run is a special one due to state changes
let _allowRunning = false; // Wait for explicit run command to start

elbwalker.config = {
  prefix: Elbwalker.Commands.Prefix,
};

elbwalker.go = function (config = {}) {
  // Set config version to differentiate between setups
  if (config.version) version.config = config.version;

  // Change the default HTML prefix attribute
  if (config.prefix) this.config.prefix = config.prefix;

  // Setup pushes for elbwalker via elbLayer
  elbLayerInit(elbwalker);

  // Switch between init modes
  if (config.projectId) {
    // managed: use project configuration service
    loadProject(config.projectId);
  } else if (!config.custom) {
    // default: add GTM destination and auto run
    addDestination(destination);
    ready(run, elbwalker);

    // @TODO TEST WALKER COMMANDS ON DEFAULT MODE TOO
  } else {
    // custom: use the elbLayer
  }

  initHandler(this.config.prefix);
};

elbwalker.push = function (
  event?: unknown,
  data?: Elbwalker.PushData,
  trigger?: string,
  nested?: Walker.Entities,
): void {
  if (!event || typeof event !== 'string') return;

  // Check if walker is allowed to run
  if (!_allowRunning) {
    // If not yet allowed check if this is the time
    // If it's not that time do not process events yet
    if (event != runCommand) return;
  }

  // Check for valid entity and action event format
  const [entity, action] = event.split(' ');
  if (!entity || !action) return;

  // Handle internal walker command events
  if (entity === Elbwalker.Commands.Walker) {
    handleCommand(action, data, this);
    return;
  }

  ++_count;
  const timestamp = Date.now();
  const timing = Math.round(performance.now() / 10) / 100;
  const id = `${timestamp}-${_group}-${_count}`;

  destinations.map((destination) => {
    trycatch(() => {
      // Destination initialization
      // Check if the destination was initialized properly or try to do so
      if (destination.init && !destination.config.init) {
        const init = destination.init();
        destination.config.init = init;

        // don't push if init is false
        if (!init) return;
      }

      destination.push({
        event,
        // Create a new objects for each destination
        // to prevent data manipulation
        data: assign({}, data as AnyObject),
        globals: assign({}, _globals),
        user: assign({}, _user as AnyObject),
        nested: nested || [],
        id,
        trigger: trigger || '',
        entity,
        action,
        timestamp,
        timing,
        group: _group,
        count: _count,
        version,
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
      ready(run, elbwalker);
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
    event?: IArguments | unknown,
    data?: Elbwalker.PushData,
    trigger?: string,
    nested?: Walker.Entities,
  ) {
    // Pushed as Arguments
    if (isArgument(event)) {
      [event, data, trigger, nested] = [...Array.from(event as IArguments)];
    }

    elbwalker.push(event, data, trigger, nested);

    return Array.prototype.push.apply(this, [arguments]);
  };

  // Look if the run command is stacked
  const containsRun = w.elbLayer.find((element) => {
    // Differentiate between the two types of possible event pushes
    element = isArgument(element) ? (element as IArguments)[0] : element;
    return element == runCommand;
  });

  if (containsRun) ready(run, elbwalker); // Run walker run
}

function run(elbwalker: Elbwalker.Function) {
  // When run is called, the walker may start running
  _allowRunning = true;

  // Reset the run counter
  _count = 0;

  // Generate a new group id for each run
  _group = randomString();

  // Load globals properties
  // Due to site performance only once every run

  _globals = getGlobalProperties(elbwalker.config.prefix);

  // Run predefined elbLayer stack once
  if (_firstRun) {
    _firstRun = false;
    callPredefined(elbwalker);
  }

  trycatch(triggerLoad)(elbwalker.config.prefix);
}

// Handle existing events in the elbLayer on first run
function callPredefined(elbwalker: Elbwalker.Function) {
  // there is a special execution order for all predefined events
  // walker events gets prioritized before others
  // this garantees a fully configuration before the first run
  const walkerCommand = `${Elbwalker.Commands.Walker} `; // Space on purpose
  const walkerEvents: Array<Elbwalker.ElbLayer> = [];
  const customEvents: Array<Elbwalker.ElbLayer> = [];
  let isFirstRunEvent = true;

  // At that time the dataLayer was not yet initialized
  w.elbLayer.map((pushedEvent) => {
    let [event, data, trigger, nested] = [
      ...Array.from(pushedEvent as IArguments),
    ] as Elbwalker.ElbLayer;

    // Pushed as Arguments
    if ({}.hasOwnProperty.call(event, 'callee')) {
      [event, data, trigger, nested] = [...Array.from(event as IArguments)];
    }

    if (typeof event !== 'string') return;

    // Skip the first stacked run event since it's the reason we're here
    // and to prevent duplicate execution which we don't want
    if (isFirstRunEvent && event == runCommand) {
      isFirstRunEvent = false; // Next time it's on
      return;
    }

    // check if event is a walker commend
    event.startsWith(walkerCommand)
      ? walkerEvents.push([event, data, trigger, nested]) // stack it to the walker commands
      : customEvents.push([event, data, trigger, nested]); // stack it to the custom events
  });

  // Prefere all walker commands before events during processing the predefined ones
  walkerEvents.concat(customEvents).map((item) => {
    const [event, data, trigger, nested] = item;
    elbwalker.push(event, data, trigger, nested);
  });
}

function setUserIds(data: Elbwalker.User) {
  // user ids can't be set to undefined
  if (data.id) _user.id = data.id;
  if (data.device) _user.device = data.device;
  if (data.hash) _user.hash = data.hash;
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

export default elbwalker;
