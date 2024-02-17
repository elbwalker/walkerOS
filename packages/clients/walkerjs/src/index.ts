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
  tryCatch,
  useHooks,
} from '@elbwalker/utils';
import { getEntities, getGlobals } from './lib/walker';

// Export types and elb
export * from './types';
export { elb };

export function Walkerjs(
  customConfig: Partial<WebClient.Config> = {},
): WebClient.Instance {
  const client = '2.0.1';
  const runCommand = `${Const.Commands.Walker} ${Const.Commands.Run}`;
  const staticGlobals = customConfig.globals || {};
  const config = getConfig(customConfig);
  const instance: WebClient.Instance = {
    push: useHooks(push, 'Push', config.hooks),
    config,
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
  onApply(instance, 'consent', config.on.consent);

  // Use the default init mode for auto run and dataLayer destination
  if (customConfig.default) {
    // use dataLayer as default destination
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
      instance.config.queue.forEach((pushEvent) => {
        pushToDestination(instance, destination, pushEvent);
      });

    let id = config.id; // Use given id
    if (!id) {
      // Generate a new id if none was given
      do {
        id = getId(4);
      } while (instance.config.destinations[id]);
    }
    instance.config.destinations[id] = destination;
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
      const consentStates = instance.config.consent;

      // Search for a required and granted consent
      Object.keys(destinationConsent).forEach((consent) => {
        if (consentStates[consent]) granted = true;
      });
    }

    return granted;
  }

  // Handle existing events in the elbLayer on first run
  function callPredefined(instance: WebClient.Instance) {
    // there is a special execution order for all predefined events
    // walker events gets prioritized before others
    // this guarantees a fully configuration before the first run
    const walkerCommand = `${Const.Commands.Walker} `; // Space on purpose
    const walkerEvents: Array<WebClient.ElbLayer> = [];
    const customEvents: Array<WebClient.ElbLayer> = [];
    let isFirstRunEvent = true;

    // At that time the elbLayer was not yet initialized
    instance.config.elbLayer.map((pushedEvent) => {
      let [event, data, trigger, context, nested, custom] = [
        ...Array.from(pushedEvent as IArguments),
      ] as WebClient.ElbLayer;

      // Pushed as Arguments
      if (isArgument(event)) {
        [event, data, trigger, context, nested, custom] = [
          ...Array.from(event as IArguments),
        ];
      }

      if (!isSameType(event, '')) return;

      // Skip the first stacked run event since it's the reason we're here
      // and to prevent duplicate execution which we don't want
      if (isFirstRunEvent && event == runCommand) {
        isFirstRunEvent = false; // Next time it's on
        return;
      }

      // check if event is a walker commend
      event.startsWith(walkerCommand)
        ? walkerEvents.push([event, data, trigger, context]) // stack it to the walker Const.Commands
        : customEvents.push([event, data, trigger, context, nested, custom]); // stack it to the custom events
    });

    // Prefer all walker Const.Commands before events during processing the predefined ones
    walkerEvents.concat(customEvents).map((item) => {
      const [event, data, trigger, context, nested, custom] = item;
      instance.push(String(event), data, trigger, context, nested, custom);
    });
  }

  function elbLayerInit(instance: WebClient.Instance) {
    const elbLayer = instance.config.elbLayer;

    elbLayer.push = function (
      event?: IArguments | unknown,
      data?: WebClient.PushData,
      trigger?: string,
      context?: WalkerOS.OrderedProperties,
      nested?: WalkerOS.Entities,
      custom?: WalkerOS.Properties,
    ) {
      // Pushed as Arguments
      if (isArgument(event)) {
        [event, data, trigger, context, nested, custom] = [
          ...Array.from(event),
        ];
      }

      // eslint-disable-next-line prefer-rest-params
      const i = Array.prototype.push.apply(this, [arguments]);
      instance.push(String(event), data, trigger, context, nested, custom);

      return i;
    };

    // Look if the run command is stacked
    const containsRun = elbLayer.find((element) => {
      // Differentiate between the two types of possible event pushes
      element = isArgument(element) ? element[0] : element;
      return element == runCommand;
    });

    if (containsRun) ready(run, instance); // Run walker run
  }

  function getConfig(
    values: Partial<WebClient.Config>,
    current: Partial<WebClient.Config> = {},
  ): WebClient.Config {
    const defaultConfig: WebClient.Config = {
      allowed: false, // Wait for explicit run command to start
      client, // Client version
      consent: {}, // Handle the consent states
      custom: {}, // Custom state support
      count: 0, // Event counter for each run
      destinations: {}, // Destination list
      elbLayer: window.elbLayer || (window.elbLayer = []), // Async access api in window as array
      globals: assign(staticGlobals), // Globals enhanced with the static globals from init and previous values
      group: '', // Random id to group events of a run
      hooks: {}, // Manage the hook functions
      on: {}, // On events listener rules
      pageview: true, // Trigger a page view event by default
      prefix: Const.Commands.Prefix, // HTML prefix attribute
      queue: [], // Temporary event queue for all events of a run
      round: 0, // The first round is a special one due to state changes
      timing: 0, // Offset counter to calculate timing property
      user: {}, // Handles the user ids
      tagging: 0, // Helpful to differentiate the clients used setup version
    };

    // If 'pageview' is explicitly provided in values, use it; otherwise, use current or default
    const pageview =
      'pageview' in values
        ? !!values.pageview
        : current.pageview || defaultConfig.pageview;

    const globals = assign(
      staticGlobals,
      assign(current.globals || {}, values.globals || {}),
    );

    // Value hierarchy: values > current > default
    return {
      ...defaultConfig,
      ...current,
      ...values,
      pageview,
      globals,
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
          instance.config = getConfig(
            data as WebClient.Config,
            instance.config,
          );
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

  function isArgument(event: unknown): event is IArguments {
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

    (on[type] as typeof onType) = onType;

    // Run on events for default consent states
    onApply(instance, 'consent', options);
  }

  function onApply(
    instance: WebClient.Instance,
    type: On.Types,
    options?: Array<On.Options>,
  ) {
    const onConfig = options || instance.config.on[type];

    if (!onConfig) return; // No on-events registered, nothing to do

    // Consent events
    if (type === Const.Commands.Consent) {
      const consentState = instance.config.consent;

      (onConfig as On.ConsentConfig[]).forEach((consentConfig) => {
        // Collect functions whose consent keys match the rule keys directly
        // Directly execute functions whose consent keys match the rule keys
        Object.keys(consentState) // consent keys
          .filter((consent) => consent in consentConfig) // check for matching rule keys
          .forEach((consent) => {
            // Execute the function
            tryCatch(consentConfig[consent])(instance, consentState);
          });
      });
    }
  }

  function push(
    event?: unknown,
    data?: WebClient.PushData,
    options: WebClient.PushOptions = '',
    context: WebClient.PushContext = {},
    nested: WalkerOS.Entities = [],
    custom: WalkerOS.Properties = {},
  ): void {
    if (!event || !isSameType(event, '')) return;

    const config = instance.config;

    // Check if walker is allowed to run
    if (!config.allowed) {
      // If not yet allowed check if this is the time
      // If it's not that time do not process events yet
      if (event != runCommand) return;
    }

    // Check for valid entity and action event format
    const [entity, action] = event.split(' ');
    if (!entity || !action) return;

    // Handle internal walker command events
    if (entity === Const.Commands.Walker) {
      handleCommand(instance, action, data, options as WebDestination.Config);
      return;
    }

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
      globals: config.globals,
      user: config.user,
      nested,
      consent: config.consent,
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
    config.queue.push(pushEvent);

    Object.values(config.destinations).forEach((destination) => {
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
            config.hooks,
          )(destination.config) !== false; // Actively check for errors

        destination.config.init = init;

        // don't push if init is false
        if (!init) return false;
      }

      // It's time to go to the destination's side now
      useHooks(destination.push, 'DestinationPush', config.hooks)(
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
    instance.config = assign(instance.config, {
      allowed: true, // When run is called, the walker may start running
      count: 0, // Reset the run counter
      globals: assign(
        // Load globals properties
        // Use the default globals set by initialization
        // Due to site performance only once every run
        staticGlobals,
        getGlobals(instance.config.prefix),
      ),
      group: getId(), // Generate a new group id for each run
    });
    // Reset the queue for each run without merging
    instance.config.queue = [];

    // Reset all destination queues
    Object.values(instance.config.destinations).forEach((destination) => {
      destination.queue = [];
    });

    // Increase round counter and check if this is the first run
    if (++instance.config.round == 1) {
      // Run predefined elbLayer stack once
      callPredefined(instance);
    } else {
      // Reset timing with each new run
      instance.config.timing = performance.now();
    }

    tryCatch(load)(instance);
  }

  function setConsent(instance: WebClient.Instance, data: WalkerOS.Consent) {
    const config = instance.config;

    let runQueue = false;
    Object.entries(data).forEach(([consent, granted]) => {
      const state = !!granted;

      config.consent[consent] = state;

      // Only run queue if state was set to true
      runQueue = runQueue || state;
    });

    // Run on consent events
    onApply(instance, 'consent', config.on.consent);

    if (runQueue) {
      Object.values(config.destinations).forEach((destination) => {
        const queue = destination.queue || [];

        // Try to push and remove successful ones from queue
        destination.queue = queue.filter((event) => {
          // Update previous values with the current state
          event.consent = config.consent;
          event.globals = config.globals;
          event.user = config.user;

          return !pushToDestination(instance, destination, event, false);
        });
      });
    }
  }

  function setUserIds(instance: WebClient.Instance, data: WalkerOS.User) {
    const user = instance.config.user;
    // user ids can't be set to undefined
    if (data.id) user.id = data.id;
    if (data.device) user.device = data.device;
    if (data.session) user.session = data.session;
  }

  return instance;
}

export default Walkerjs;
