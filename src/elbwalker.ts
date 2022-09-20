import { IElbwalker, Walker, WebDestination } from './types';
import { destination } from '../destinations/google-gtm';
import { initTrigger, ready, triggerLoad } from './lib/trigger';
import {
  assign,
  getGlobalProperties,
  isArgument,
  randomString,
  trycatch,
} from './lib/utils';

const version = 1.4;
const w = window;

function Elbwalker(
  config: Partial<IElbwalker.Config> = {},
): IElbwalker.Function {
  const destinations: WebDestination.Functions = [];
  const runCommand = `${IElbwalker.Commands.Walker} ${IElbwalker.Commands.Run}`;
  const instance: IElbwalker.Function = {
    push,
    config: {
      elbLayer: config.elbLayer || w.elbLayer || [],
      prefix: config.prefix || IElbwalker.Commands.Prefix, // HTML prefix attribute
      version: config.version || 0,
    },
  };

  // Internal properties
  let _count = 0; // Event counter for each run
  let _group = ''; // random id to group events of a run
  let _globals: IElbwalker.AnyObject = {}; // init globals as some random var
  let _user: IElbwalker.User = {}; // handles the user ids
  let _firstRun = true; // The first run is a special one due to state changes
  let _allowRunning = false; // Wait for explicit run command to start

  // Setup pushes for elbwalker via elbLayer
  elbLayerInit(instance);

  // Switch between init modes
  if (config.projectId) {
    // managed: use project configuration service
    loadProject(config.projectId);
  } else if (!config.custom) {
    // default: add GTM destination and auto run
    addDestination(destination as WebDestination.Function);
    ready(run, instance);

    // @TODO TEST WALKER COMMANDS ON DEFAULT MODE TOO
  } else {
    // custom: use the elbLayer
  }

  initTrigger(instance);

  function push(
    event?: unknown,
    data?: IElbwalker.PushData,
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
    if (entity === IElbwalker.Commands.Walker) {
      handleCommand(action, data, instance);
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
          data: assign({}, data as IElbwalker.AnyObject),
          globals: assign({}, _globals),
          user: assign({}, _user as IElbwalker.AnyObject),
          nested: nested || [],
          id,
          trigger: trigger || '',
          entity,
          action,
          timestamp,
          timing,
          group: _group,
          count: _count,
          version: {
            config: instance.config.version,
            walker: version,
          },
        });
      })();
    });
  }

  function handleCommand(
    action: string,
    data: IElbwalker.PushData = {},
    elbwalker: IElbwalker.Function,
  ) {
    switch (action) {
      case IElbwalker.Commands.Destination:
        addDestination(data);
        break;
      case IElbwalker.Commands.Run:
        ready(run, elbwalker);
        break;
      case IElbwalker.Commands.User:
        setUserIds(data as IElbwalker.AnyObject);
        break;
      default:
        break;
    }
  }

  function elbLayerInit(elbwalker: IElbwalker.Function) {
    const elbLayer = elbwalker.config.elbLayer;

    elbLayer.push = function (
      event?: IArguments | unknown,
      data?: IElbwalker.PushData,
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
    const containsRun = elbLayer.find((element) => {
      // Differentiate between the two types of possible event pushes
      element = isArgument(element) ? (element as IArguments)[0] : element;
      return element == runCommand;
    });

    if (containsRun) ready(run, elbwalker); // Run walker run
  }

  function run(elbwalker: IElbwalker.Function) {
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

    trycatch(triggerLoad)(elbwalker);
  }

  // Handle existing events in the elbLayer on first run
  function callPredefined(elbwalker: IElbwalker.Function) {
    // there is a special execution order for all predefined events
    // walker events gets prioritized before others
    // this garantees a fully configuration before the first run
    const walkerCommand = `${IElbwalker.Commands.Walker} `; // Space on purpose
    const walkerEvents: Array<IElbwalker.ElbLayer> = [];
    const customEvents: Array<IElbwalker.ElbLayer> = [];
    let isFirstRunEvent = true;

    // At that time the dataLayer was not yet initialized
    elbwalker.config.elbLayer.map((pushedEvent) => {
      let [event, data, trigger, nested] = [
        ...Array.from(pushedEvent as IArguments),
      ] as IElbwalker.ElbLayer;

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

  function setUserIds(data: IElbwalker.User) {
    // user ids can't be set to undefined
    if (data.id) _user.id = data.id;
    if (data.device) _user.device = data.device;
    if (data.hash) _user.hash = data.hash;
  }

  function addDestination(data: IElbwalker.PushData) {
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

  return instance;
}

export default Elbwalker;
