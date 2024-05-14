import type { WebClient, WebDestination } from './types';
import type { Hooks, On, WalkerOS } from '@elbwalker/types';
import {
  elb,
  initScopeTrigger,
  initGlobalTrigger,
  ready,
  load,
} from './lib/trigger';
import {
  Const,
  assign,
  getId,
  isSameType,
  sessionStart,
  tryCatch,
  useHooks,
} from '@elbwalker/utils';
import { getEntities, getGlobals } from './lib/walker';
import { onApply } from './lib/on';

// Export types and elb
export * from './types';
export { elb };

export function Walkerjs(
  customConfig: WebClient.CustomConfig = {},
): WebClient.Instance {
  const client = '2.1.3';
  const state = getState(customConfig);
  const instance: WebClient.Instance = {
    push: useHooks(push, 'Push', state.config.hooks),
    client, // Client version
    queue: [], // Temporary event queue for all events of a run
    session: undefined, // Session data
    ...state,
  };

  // Setup pushes via elbLayer
  elbLayerInit(instance);

  // Assign instance and/or elb to the window object
  if (customConfig.elb)
    (window as unknown as Record<string, unknown>)[customConfig.elb] = elb;
  if (customConfig.instance)
    (window as unknown as Record<string, unknown>)[customConfig.instance] =
      instance;

  // Run on events for default consent states
  onApply(instance, 'consent');

  if (customConfig.dataLayer) {
    // Add a dataLayer destination
    window.dataLayer = window.dataLayer || [];
    const destination: WebDestination.Destination = {
      config: {},
      push: (event) => {
        (window.dataLayer as unknown[]).push({
          ...event,
          walker: true,
        });
      },
      type: 'dataLayer',
    };
    addDestination(instance, destination);
  }

  // Automatically start running
  if (customConfig.run) {
    ready(run, instance);
  }

  initGlobalTrigger(instance);

  function addDestination(
    instance: WebClient.Instance,
    data: WebDestination.Destination,
    options?: WebDestination.Config,
  ) {
    // Basic validation
    if (!data.push) return;

    // Prefer explicit given config over default config
    const config = options || data.config || { init: false };

    const destination: WebDestination.Destination = {
      init: data.init,
      push: data.push,
      config,
      type: data.type,
    };

    // Process previous events if not disabled
    if (config.queue !== false)
      instance.queue.forEach((pushEvent) => {
        pushToDestination(instance, destination, pushEvent);
      });

    let id = config.id; // Use given id
    if (!id) {
      // Generate a new id if none was given
      do {
        id = getId(4);
      } while (instance.destinations[id]);
    }
    instance.destinations[id] = destination;
  }

  function addHook<Hook extends keyof Hooks.Functions>(
    config: WebClient.Config,
    name: Hook,
    hookFn: Hooks.Functions[Hook],
  ) {
    config.hooks[name] = hookFn;
  }

  function allowedToPush(
    instance: WebClient.Instance,
    destination: WebDestination.Destination,
  ): boolean {
    // Default without consent handling
    let granted = true;

    // Check for consent
    const destinationConsent = destination.config.consent;

    if (destinationConsent) {
      // Let's be strict here
      granted = false;

      // Set the current consent states
      const consentStates = instance.consent;

      // Search for a required and granted consent
      Object.keys(destinationConsent).forEach((consent) => {
        if (consentStates[consent]) granted = true;
      });
    }

    return granted;
  }

  // Handle existing events in the elbLayer on first run
  function callPredefined(instance: WebClient.Instance, commandsOnly: boolean) {
    // there is a special execution order for all predefined events
    // walker events gets prioritized before others
    // this guarantees a fully configuration before the first run
    const walkerCommand = `${Const.Commands.Walker} `; // Space on purpose
    const events: Array<WebClient.ElbLayer> = [];
    let isFirstRunEvent = true;

    // At that time the elbLayer was not yet initialized
    instance.config.elbLayer.map((pushedEvent) => {
      const event = [
        ...Array.from(pushedEvent as IArguments),
      ] as WebClient.ElbLayer;

      if (!isSameType(event[0], '')) return;

      // Skip the first stacked run event since it's the reason we're here
      // and to prevent duplicate execution which we don't want
      const runCommand = `${Const.Commands.Walker} ${Const.Commands.Run}`;
      if (isFirstRunEvent && event[0] == runCommand) {
        isFirstRunEvent = false; // Next time it's on
        return;
      }

      // Handle commands and events separately
      if (
        (commandsOnly && event[0].startsWith(walkerCommand)) || // Only commands
        (!commandsOnly && !event[0].startsWith(walkerCommand)) // Only events
      )
        events.push(event);
    });

    events.map((item) => {
      instance.push(...item);
    });
  }

  function elbLayerInit(instance: WebClient.Instance) {
    const elbLayer = instance.config.elbLayer;

    elbLayer.push = function (...args: WebClient.ElbLayer) {
      // Pushed as Arguments
      if (isArgument(args[0])) {
        args = args[0] as unknown as WebClient.ElbLayer;
      }

      const i = Array.prototype.push.apply(this, [args]);
      instance.push(...args);

      return i;
    };

    // Call all predefined commands
    callPredefined(instance, true);
  }

  function getState(
    values: WebClient.CustomConfig,
    instance: Partial<WebClient.Instance> = {},
  ): WebClient.State {
    const currentConfig: Partial<WebClient.Config> = instance.config || {};

    const defaultConfig: WebClient.Config = {
      allowed: false, // Wait for explicit run command to start
      custom: {}, // Custom state support
      count: 0, // Event counter for each run
      dataLayer: false, // Do not use dataLayer by default
      elbLayer: window.elbLayer || (window.elbLayer = []), // Async access api in window as array
      group: '', // Random id to group events of a run
      hooks: {}, // Manage the hook functions
      on: {}, // On events listener rules
      pageview: true, // Trigger a page view event by default
      prefix: Const.Commands.Prefix, // HTML prefix attribute
      run: false, // Run the walker by default
      round: 0, // The first round is a special one due to state changes
      session: {
        // Configuration for session handling
        storage: false, // Do not use storage by default
      },
      globalsStatic: assign(values.globalsStatic || {}), // Static global properties
      timing: 0, // Offset counter to calculate timing property
      tagging: 0, // Helpful to differentiate the clients used setup version
    };

    // If 'pageview' is explicitly provided in values, use it; otherwise, use current or default
    const pageview =
      'pageview' in values
        ? !!values.pageview
        : currentConfig.pageview || defaultConfig.pageview;

    // Default mode enables both, auto run and dataLayer destination
    if (values.default) {
      values.run = true;
      values.dataLayer = true;
    }

    // Value hierarchy: values > current > default
    const config = { ...defaultConfig, ...currentConfig, ...values, pageview };

    const consent = values.consent || {}; // Handle the consent states

    const destinations = values.destinations || {}; // Destination list

    // Globals enhanced with the static globals from init and previous values
    const globals = assign(values.globals || {}, config.globalsStatic);

    const user = values.user || {}; // Handles the user ids

    return {
      config,
      consent,
      destinations,
      globals,
      user,
    };
  }

  function handleCommand(
    instance: WebClient.Instance,
    action: string,
    data?: WebClient.PushData,
    options?: WebClient.PushOptions,
  ) {
    switch (action) {
      case Const.Commands.Config:
        if (isObject(data))
          instance.config = getState(data as WebClient.Config, instance).config;
        break;
      case Const.Commands.Consent:
        isObject(data) && setConsent(instance, data as WalkerOS.Consent);
        break;
      case Const.Commands.Destination:
        isObject(data) &&
          addDestination(
            instance,
            data as WebDestination.Destination,
            options as WebDestination.Config,
          );
        break;
      case Const.Commands.Globals:
        if (isObject(data))
          instance.globals = assign(
            instance.globals,
            data as WalkerOS.Properties,
          );
        break;
      case Const.Commands.Hook:
        if (isSameType(data, '') && isSameType(options, isSameType))
          addHook(instance.config, data as keyof Hooks.Functions, options);
        break;
      case Const.Commands.Init: {
        const elems: unknown[] = Array.isArray(data)
          ? data
          : [data || document];
        elems.forEach((elem) => {
          isElementOrDocument(elem) &&
            initScopeTrigger(instance, elem as WebClient.Scope);
        });
        break;
      }
      case Const.Commands.On:
        on(instance, data as On.Types, options as On.Options);
        break;
      case Const.Commands.Run:
        ready(run, instance);
        break;
      case Const.Commands.User:
        isObject(data) && setUserIds(instance, data as WalkerOS.User);
        break;
      default:
        break;
    }
  }

  function isArgument(event?: unknown): event is IArguments {
    if (!event) return false;
    return {}.hasOwnProperty.call(event, 'callee');
  }

  function isElementOrDocument(elem: unknown) {
    return elem === document || elem instanceof HTMLElement;
  }

  function isObject(obj: unknown) {
    return isSameType(obj, {}) && !Array.isArray(obj) && obj !== null;
  }

  function on(
    instance: WebClient.Instance,
    type: On.Types,
    option: WalkerOS.SingleOrArray<On.Options>,
  ) {
    const on = instance.config.on;
    const onType: Array<On.Options> = on[type] || [];
    const options = Array.isArray(option) ? option : [option];

    options.forEach((option) => {
      onType.push(option);
    });

    // Update instance on state
    (on[type] as typeof onType) = onType;

    // Execute the on function directly
    onApply(instance, type, options);
  }

  function push(
    event?: unknown,
    data?: WebClient.PushData,
    options: WebClient.PushOptions = '',
    context: WebClient.PushContext = {},
    nested: WalkerOS.Entities = [],
    custom: WalkerOS.Properties = {},
  ): void {
    if (!event || !isSameType(event, '' as string)) return;

    // Check for valid entity and action event format
    const [entity, action] = event.split(' ');
    if (!entity || !action) return;

    // Handle internal walker command events
    if (entity === Const.Commands.Walker) {
      handleCommand(instance, action, data, options);
      return;
    }

    const { config, consent, destinations, globals, queue, user } = instance;

    // Check if walker is allowed to run
    if (!config.allowed) return;

    // Get data and context from element parameter
    let elemParameter: undefined | Element;
    let dataIsElem = false;
    if (isElementOrDocument(data)) {
      elemParameter = data as Element;
      dataIsElem = true;
    } else if (isElementOrDocument(context)) {
      elemParameter = context as Element;
    }

    if (elemParameter) {
      // Filter for the entity type from the events name
      const entityObj = getEntities(config.prefix, elemParameter).find(
        (obj) => obj.type == entity,
      );

      if (entityObj) {
        data = dataIsElem ? entityObj.data : data;
        context = entityObj.context;
      }
    }

    // Set default value if undefined
    data = data || {};

    // Special case for page entity to add the id by default
    if (entity === 'page') {
      (data as WalkerOS.Properties).id =
        (data as WalkerOS.Properties).id || window.location.pathname;
    }

    ++config.count;
    const timestamp = Date.now();
    const timing = Math.round((performance.now() - config.timing) / 10) / 100;
    const id = `${timestamp}-${config.group}-${config.count}`;
    const source = {
      type: 'web',
      id: window.location.href,
      previous_id: document.referrer,
    };

    const pushEvent: WalkerOS.Event = {
      event,
      data: data as WalkerOS.Properties,
      context: context as WalkerOS.OrderedProperties,
      custom,
      globals,
      user,
      nested,
      consent,
      id,
      trigger: options as string,
      entity,
      action,
      timestamp,
      timing,
      group: config.group,
      count: config.count,
      version: {
        client,
        tagging: config.tagging,
      },
      source,
    };

    // Add event to internal queue
    queue.push(pushEvent);

    Object.values(destinations).forEach((destination) => {
      pushToDestination(instance, destination, pushEvent);
    });
  }

  function pushToDestination(
    instance: WebClient.Instance,
    destination: WebDestination.Destination,
    event: WalkerOS.Event,
    useQueue = true,
  ): boolean {
    // Deep copy event to prevent a pointer mess
    // Update to structuredClone if support > 95%
    event = JSON.parse(JSON.stringify(event));

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

    const pushed = !!tryCatch(() => {
      // Destination initialization
      // Check if the destination was initialized properly or try to do so
      if (destination.init && !destination.config.init) {
        const init =
          useHooks(
            destination.init,
            'DestinationInit',
            instance.config.hooks,
          )(destination.config) !== false; // Actively check for errors

        destination.config.init = init;

        // don't push if init is false
        if (!init) return false;
      }

      // It's time to go to the destination's side now
      useHooks(destination.push, 'DestinationPush', instance.config.hooks)(
        event,
        destination.config,
        mappingEvent,
        instance.config,
      );

      return true;
    })();

    return pushed;
  }

  function run(instance: WebClient.Instance) {
    const { config, destinations } = instance;
    instance.config = assign(config, {
      allowed: true, // When run is called, the walker may start running
      count: 0, // Reset the run counter
      group: getId(), // Generate a new group id for each run
    });

    (instance.globals = assign(
      // Load globals properties
      // Use the default globals set by initialization
      // Due to site performance only once every run
      config.globalsStatic,
      getGlobals(config.prefix),
    )),
      // Reset the queue for each run without merging
      (instance.queue = []);

    // Reset all destination queues
    Object.values(destinations).forEach((destination) => {
      destination.queue = [];
    });

    // Call the predefined run events
    onApply(instance, 'run');

    // Increase round counter
    if (++instance.config.round == 1) {
      // Run predefined elbLayer stack once for all non-command events
      callPredefined(instance, false);
    } else {
      // Reset timing with each new run
      instance.config.timing = performance.now();
    }

    // Session handling
    if (config.session) {
      const session = sessionStart({ ...config.session, instance });
      if (session) {
        instance.session = session;
      }

      // @TODO on-event for session
    }

    tryCatch(load)(instance);
  }

  function setConsent(instance: WebClient.Instance, data: WalkerOS.Consent) {
    const { consent, destinations, globals, user } = instance;

    let runQueue = false;
    const update: WalkerOS.Consent = {};
    Object.entries(data).forEach(([name, granted]) => {
      const state = !!granted;

      update[name] = state;

      // Only run queue if state was set to true
      runQueue = runQueue || state;
    });

    // Update consent state
    instance.consent = assign(consent, update);

    // Run on consent events
    onApply(instance, 'consent', undefined, update);

    if (runQueue) {
      Object.values(destinations).forEach((destination) => {
        const queue = destination.queue || [];

        // Try to push and remove successful ones from queue
        destination.queue = queue.filter((event) => {
          // Update previous values with the current state
          event.consent = instance.consent;
          event.globals = globals;
          event.user = user;

          return !pushToDestination(instance, destination, event, false);
        });
      });
    }
  }

  function setUserIds(instance: WebClient.Instance, data: WalkerOS.User) {
    const user = instance.user;
    // user ids can't be set to undefined
    if (data.id) user.id = data.id;
    if (data.device) user.device = data.device;
    if (data.session) user.session = data.session;
  }

  return instance;
}

export default Walkerjs;
