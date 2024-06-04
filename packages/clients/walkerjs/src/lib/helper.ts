import type { WalkerOS } from '@elbwalker/types';
import type { WebClient, WebDestination } from '../types';
import { Const, isSameType } from '@elbwalker/utils';
import { getEntities } from './walker';

export function allowedToPush(
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

export function createEventOrCommand(
  instance: WebClient.Instance,
  nameOrEvent: unknown,
  pushData: WebClient.PushData,
  pushContext: WebClient.PushContext,
  initialNested: WalkerOS.Entities,
  initialCustom: WalkerOS.Properties,
  initialTrigger: WebClient.PushOptions = '',
): { event?: WalkerOS.Event; command?: string } {
  // Determine the partial event
  const partialEvent: WalkerOS.PartialEvent = isSameType(
    nameOrEvent,
    '' as string,
  )
    ? { event: nameOrEvent }
    : ((nameOrEvent || {}) as WalkerOS.PartialEvent);

  if (!partialEvent.event) return {};

  // Check for valid entity and action event format
  const [entity, action] = partialEvent.event.split(' ');
  if (!entity || !action) return {};

  // It's a walker command
  if (isCommand(entity)) return { command: action };

  // Regular event
  // Increase event counter
  ++instance.count;

  // Extract properties with default fallbacks
  const {
    timestamp = Date.now(),
    group = instance.group,
    count = instance.count,
    source = {
      type: 'web',
      id: window.location.href,
      previous_id: document.referrer,
    },
    context = partialEvent.context || {},
    globals = instance.globals,
    user = instance.user,
    nested = partialEvent.nested || initialNested || [],
    consent = instance.consent,
    trigger = isSameType(initialTrigger, '') ? initialTrigger : '',
    version = { tagging: instance.config.tagging },
  } = partialEvent;

  // Get data and context either from elements or parameters
  let data: WalkerOS.Properties =
    partialEvent.data ||
    (isSameType(pushData, {} as WalkerOS.Properties) ? pushData : {});

  let eventContext: WalkerOS.OrderedProperties = context;

  let elemParameter: undefined | Element;
  let dataIsElem = false;
  if (isElementOrDocument(pushData)) {
    elemParameter = pushData;
    dataIsElem = true;
  }

  if (isElementOrDocument(pushContext)) {
    elemParameter = pushContext;
  } else if (isSameType(pushContext, {} as WalkerOS.OrderedProperties)) {
    eventContext = pushContext;
  }

  if (elemParameter) {
    const entityObj = getEntities(instance.config.prefix, elemParameter).find(
      (obj) => obj.type == entity,
    );
    if (entityObj) {
      if (dataIsElem) data = entityObj.data;
      eventContext = entityObj.context;
    }
  }

  if (entity === 'page') {
    data.id = data.id || window.location.pathname;
  }

  const event: WalkerOS.Event = {
    event: `${entity} ${action}`,
    data,
    context: eventContext,
    custom: partialEvent.custom || initialCustom || {},
    globals,
    user,
    nested,
    consent,
    trigger,
    entity,
    action,
    timestamp,
    timing:
      partialEvent.timing ||
      Math.round((performance.now() - instance.timing) / 10) / 100,
    group,
    count,
    id: `${timestamp}-${group}-${count}`,
    version: {
      client: instance.client,
      tagging: version.tagging,
    },
    source,
  };

  return { event };
}

export function isArgument(event?: unknown): event is IArguments {
  if (!event) return false;
  return {}.hasOwnProperty.call(event, 'callee');
}

export function isCommand(entity: string) {
  return entity === Const.Commands.Walker;
}

export function isElementOrDocument(elem: unknown): elem is HTMLElement {
  return elem === document || elem instanceof HTMLElement;
}

export function isObject(obj: unknown): obj is WalkerOS.AnyObject {
  return isSameType(obj, {}) && !Array.isArray(obj) && obj !== null;
}
