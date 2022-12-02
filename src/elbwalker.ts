import { IElbwalker, Walker, WebDestination } from './types';
import { initTrigger, ready, triggerLoad } from './lib/trigger';
import {
  assign,
  getGlobalProperties,
  isArgument,
  randomString,
  trycatch,
} from './lib/utils';

const version = 1.5;
const w = window;

function Elbwalker(
  config: Partial<IElbwalker.Config> = {},
): IElbwalker.Function {
  const destinations: WebDestination.Functions = [];
  const runCommand = `${IElbwalker.Commands.Walker} ${IElbwalker.Commands.Run}`;
  const instance: IElbwalker.Function = {
    push,
    config: getConfig(config),
  };

  // Internal properties
  let _count = 0; // Event counter for each run
  let _group = ''; // random id to group events of a run
  let _globals: Walker.Properties = {}; // init globals as some random var
  // @TODO move _user to config for better init and transparency
  let _user: IElbwalker.User = {}; // handles the user ids
  let _firstRun = true; // The first run is a special one due to state changes
  let _allowRunning = false; // Wait for explicit run command to start

  // Setup pushes for elbwalker via elbLayer
  elbLayerInit(instance);

  // Switch between init modes
  if (config.default) {
    // use dataLayer as default destination
    w.dataLayer = w.dataLayer || [];
    const destination: WebDestination.Function = {
      config: {},
      push: (event) => {
        w.dataLayer.push({
          ...event,
          walker: true,
        });
      },
    };
    addDestination(destination);
    ready(run, instance);
  }

  initTrigger(instance);

  function push(
    event?: unknown,
    data: IElbwalker.PushData = {},
    trigger?: string,
    context?: Walker.Properties, // œTODO Ordered?
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
      handleCommand(instance, action, data);
      return;
    }

    // Special case for page entity to add the id by default
    if (entity === 'page') {
      (data as Walker.Properties).id =
        (data as Walker.Properties).id || window.location.pathname;
    }

    ++_count;
    const timestamp = Date.now();
    const timing = Math.round(performance.now() / 10) / 100;
    const id = `${timestamp}-${_group}-${_count}`;

    destinations.forEach((destination) => {
      // Individual event per destination to prevent a pointer mess
      const pushEvent: IElbwalker.Event = {
        event,
        // Create a new objects for each destination
        // to prevent data manipulation
        // @TODO check for potential issue due to casting (OrderedProperties)
        data: assign({}, data as Walker.Properties),
        context: assign({}, context as Walker.Properties),
        globals: assign({}, _globals as Walker.Properties),
        user: assign({}, _user as Walker.Properties),
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
      };

      pushToDestination(instance, destination, pushEvent);
    });
  }

  function allowedToPush(
    instance: IElbwalker.Function,
    destination: WebDestination.Function,
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

  function pushToDestination(
    instance: IElbwalker.Function,
    destination: WebDestination.Function,
    event: IElbwalker.Event,
    useQueue = true,
  ): boolean {
    // Always check for required consent states before pushing
    if (!allowedToPush(instance, destination)) {
      if (useQueue) {
        destination.queue = destination.queue || [];
        destination.queue.push(event);
      }

      // Stop processing the event on this destination
      return false;
    }

    // Check for an active mapping for proper event handling
    let mappingEvent: WebDestination.EventConfig;
    const mapping = destination.config.mapping;
    if (mapping) {
      const mappingEntity = mapping[event.entity] || mapping['*'] || {};
      mappingEvent = mappingEntity[event.action] || mappingEntity['*'];

      // Handle individual event settings
      if (mappingEvent) {
        // Check if event should be processed or ignored
        if (mappingEvent.ignore) return false;

        // Check to use specific event names
        if (mappingEvent.name) event.event = mappingEvent.name;
      }

      // don't push if there's no matching mapping
      if (!mappingEvent) return false;
    }

    const pushed = !!trycatch(() => {
      // Destination initialization
      // Check if the destination was initialized properly or try to do so
      if (destination.init && !destination.config.init) {
        const init = destination.init();
        destination.config.init = init;

        // don't push if init is false
        if (!init) return false;
      }

      destination.push(event, mappingEvent);

      return true;
    })();

    return pushed;
  }

  function handleCommand(
    instance: IElbwalker.Function,
    action: string,
    data: IElbwalker.PushData = {},
  ) {
    switch (action) {
      case IElbwalker.Commands.Config:
        instance.config = getConfig(
          data as IElbwalker.Consent,
          instance.config,
        );
        break;
      case IElbwalker.Commands.Consent:
        setConsent(instance, data as IElbwalker.Consent);
        break;
      case IElbwalker.Commands.Destination:
        addDestination(data as WebDestination.Function);
        break;
      case IElbwalker.Commands.Run:
        ready(run, instance);
        break;
      case IElbwalker.Commands.User:
        setUserIds(data as IElbwalker.User);
        break;
      default:
        break;
    }
  }

  function elbLayerInit(instance: IElbwalker.Function) {
    const elbLayer = instance.config.elbLayer;

    elbLayer.push = function (
      event?: IArguments | unknown,
      data?: IElbwalker.PushData,
      trigger?: string,
      context?: Walker.Properties,
      nested?: Walker.Entities,
    ) {
      // Pushed as Arguments
      if (isArgument(event)) {
        [event, data, trigger, context, nested] = [
          ...Array.from(event as IArguments),
        ];
      }

      instance.push(String(event), data, String(trigger), context, nested);

      return Array.prototype.push.apply(this, [arguments]);
    };

    // Look if the run command is stacked
    const containsRun = elbLayer.find((element) => {
      // Differentiate between the two types of possible event pushes
      element = isArgument(element) ? (element as IArguments)[0] : element;
      return element == runCommand;
    });

    if (containsRun) ready(run, instance); // Run walker run
  }

  function run(instance: IElbwalker.Function) {
    // When run is called, the walker may start running
    _allowRunning = true;

    // Reset the run counter
    _count = 0;

    // Generate a new group id for each run
    _group = randomString();

    // Load globals properties
    // Due to site performance only once every run
    _globals = getGlobalProperties(instance.config.prefix);

    // Reset all destination queues
    destinations.forEach((destination) => {
      destination.queue = [];
    });

    // Run predefined elbLayer stack once
    if (_firstRun) {
      _firstRun = false;
      callPredefined(instance);
    }

    trycatch(triggerLoad)(instance);
  }

  // Handle existing events in the elbLayer on first run
  function callPredefined(instance: IElbwalker.Function) {
    // there is a special execution order for all predefined events
    // walker events gets prioritized before others
    // this garantees a fully configuration before the first run
    const walkerCommand = `${IElbwalker.Commands.Walker} `; // Space on purpose
    const walkerEvents: Array<IElbwalker.ElbLayer> = [];
    const customEvents: Array<IElbwalker.ElbLayer> = [];
    let isFirstRunEvent = true;

    // At that time the elbLayer was not yet initialized
    instance.config.elbLayer.map((pushedEvent) => {
      let [event, data, trigger, context, nested] = [
        ...Array.from(pushedEvent as IArguments),
      ] as IElbwalker.ElbLayer;

      // Pushed as Arguments
      if ({}.hasOwnProperty.call(event, 'callee')) {
        [event, data, trigger, context, nested] = [
          ...Array.from(event as IArguments),
        ];
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
        ? walkerEvents.push([event, data, trigger, context, nested]) // stack it to the walker commands
        : customEvents.push([event, data, trigger, context, nested]); // stack it to the custom events
    });

    // Prefere all walker commands before events during processing the predefined ones
    walkerEvents.concat(customEvents).map((item) => {
      const [event, data, trigger, context, nested] = item;
      instance.push(String(event), data, trigger, context, nested);
    });
  }

  function setConsent(instance: IElbwalker.Function, data: IElbwalker.Consent) {
    let runQueue = false;
    Object.entries(data).forEach(([consent, granted]) => {
      const state = !!granted;

      instance.config.consent[consent] = state;

      // Only run queue if state was set to true
      runQueue = runQueue || state;
    });

    if (runQueue) {
      destinations.forEach((destination) => {
        let queue = destination.queue || [];

        // Try to push and remove successful ones from queue
        queue = queue.filter(
          (event) => !pushToDestination(instance, destination, event, false),
        );
      });
    }
  }

  function setUserIds(data: IElbwalker.User) {
    // user ids can't be set to undefined
    if (data.id) _user.id = data.id;
    if (data.device) _user.device = data.device;
    if (data.hash) _user.hash = data.hash;
  }

  function addDestination(data: WebDestination.Function) {
    // Skip validation due to trycatch calls on push
    const destination = {
      init: data.init,
      push: data.push,
      config: data.config || { init: false },
    } as WebDestination.Function;

    destinations.push(destination);
  }

  function getConfig(
    values: Partial<IElbwalker.Config>,
    current: Partial<IElbwalker.Config> = {},
  ): IElbwalker.Config {
    return {
      // Value hierarchy: values > current > default

      // Handle the consent states
      consent: values.consent || current.consent || {},
      // Async access api in window as array
      elbLayer:
        values.elbLayer || current.elbLayer || (w.elbLayer = w.elbLayer || []),
      // Trigger a page view event by default
      pageview:
        'pageview' in values ? !!values.pageview : current.pageview || true,
      // HTML prefix attribute
      prefix: values.prefix || current.prefix || IElbwalker.Commands.Prefix,
      // Helpful to differentiate the clients used setup version
      version: values.version || current.version || 0,
      // @TODO move _globals here
    };
  }

  return instance;
}

export default Elbwalker;
