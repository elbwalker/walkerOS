import type { WalkerOS } from '@walkeros/core';
import type { Walker } from '@walkeros/web-core';
import type { Scope } from './types';
import { assign, castValue, isArray, trim } from '@walkeros/core';
import { Const } from '@walkeros/collector';
import { getAttribute } from '@walkeros/web-core';

export function getElbAttributeName(
  prefix: string,
  name?: string,
  isProperty = true,
): string {
  // separate dynamic properties from walker Const.Commands
  const separator = isProperty ? '-' : '';
  name = name != undefined ? separator + name : '';
  return prefix + name;
}

export function getElbValues(
  prefix: string,
  element: Element,
  name: string,
  isProperty = true,
): WalkerOS.Properties {
  const attributeValue =
    getAttribute(element, getElbAttributeName(prefix, name, isProperty)) || '';

  const elbValues = splitAttribute(attributeValue).reduce((values, str) => {
    let [key, val]: Walker.KeyVal = splitKeyVal(str);

    if (!key) return values;

    // Handle keys without value
    if (!val) {
      // Manually remove the : from key on empty values
      if (key.endsWith(':')) key = key.slice(0, -1);
      val = '';
    }

    // Dynamic values
    if (val.startsWith('#')) {
      val = val.slice(1); // Remove # symbol
      try {
        // Read property value from element
        let dynamicValue = (element as Element)[val as keyof Element];
        if (!dynamicValue && val === 'selected') {
          // Try to read selected value with chance of error
          dynamicValue = (element as HTMLSelectElement).options[
            (element as HTMLSelectElement).selectedIndex
          ].text;
        }

        val = String(dynamicValue);
      } catch (error) {
        val = '';
      }
    }

    if (key.endsWith('[]')) {
      key = key.slice(0, -2); // Remove [] symbol
      if (!isArray(values[key])) values[key] = [];
      (values[key] as WalkerOS.PropertyType[]).push(castValue(val));
    } else {
      values[key] = castValue(val);
    }

    return values;
  }, {} as WalkerOS.Properties);

  return elbValues;
}

export function getAllEvents(
  scope: Scope = document.body,
  prefix: string = Const.Commands.Prefix,
): Walker.Events {
  let events: Walker.Events = [];
  const action = Const.Commands.Action;
  const actionSelector = `[${getElbAttributeName(prefix, action, false)}]`;

  const processElementEvents = (elem: Element) => {
    Object.keys(getElbValues(prefix, elem, action, false)).forEach(
      (trigger) => {
        events = events.concat(getEvents(elem, trigger, prefix));
      },
    );
  };

  // Check if the scope element itself has action attributes
  if (scope !== document && (scope as Element).matches(actionSelector)) {
    processElementEvents(scope as Element);
  }

  queryAll(scope, actionSelector, processElementEvents);

  return events;
}

export function getEvents(
  target: Element,
  trigger: string,
  prefix: string = Const.Commands.Prefix,
): Walker.Events {
  const events: Walker.Events = [];

  // Check for an action (data-elbaction) attribute and resolve it
  const actions = resolveAttributes(prefix, target, trigger);

  // Stop if there's no valid action combo
  if (!actions) return events;

  actions.forEach((triggerAction) => {
    const filter = splitAttribute(triggerAction.actionParams || '', ',').reduce(
      (filter, param) => {
        filter[trim(param)] = true;
        return filter;
      },
      {} as Walker.Filter,
    );

    // Get the entities with their properties
    const entities = getEntities(prefix, target, filter);

    // Use page as default entity if no one was set
    if (!entities.length) {
      const type = 'page';
      // Only use explicit page properties and ignore generic properties
      const entitySelector = `[${getElbAttributeName(prefix, type)}]`;

      // Get matching properties from the element and its parents
      const [data, context] = getThisAndParentProperties(
        target,
        entitySelector,
        prefix,
        type,
      );

      entities.push({
        type, // page
        data, // Consider only upper data
        nested: [], // Skip nested in this faked page case
        context,
      });
    }

    // Return a list of all full events
    entities.forEach((entity) => {
      events.push({
        entity: entity.type,
        action: triggerAction.action,
        data: entity.data,
        trigger,
        context: entity.context,
        nested: entity.nested,
      });
    });
  });

  return events;
}

export function getGlobals(
  prefix: string = Const.Commands.Prefix,
  scope: Scope = document,
): WalkerOS.Properties {
  const globalsName = getElbAttributeName(
    prefix,
    Const.Commands.Globals,
    false,
  );
  const globalSelector = `[${globalsName}]`;
  let values = {};

  queryAll(scope, globalSelector, (element) => {
    values = assign(
      values,
      getElbValues(prefix, element, Const.Commands.Globals, false),
    );
  });

  return values;
}

export function getPageViewData(
  prefix: string,
  scope: Scope,
): [WalkerOS.Properties, WalkerOS.OrderedProperties] {
  // static page view
  const loc = window.location;
  const page = 'page';
  const scopeElement = scope === document ? document.body : (scope as Element);
  const [data, context] = getThisAndParentProperties(
    scopeElement,
    `[${getElbAttributeName(prefix, page)}]`,
    prefix,
    page,
  );
  data.domain = loc.hostname;
  data.title = document.title;
  data.referrer = document.referrer;

  if (loc.search) data.search = loc.search;
  if (loc.hash) data.hash = loc.hash;

  // @TODO get all nested entities
  return [data, context];
}

export function getTriggerActions(str: string): Walker.TriggersActionGroups {
  const values: Walker.TriggersActionGroups = {};

  const attributes = splitAttribute(str);

  attributes.forEach((str) => {
    const [triggerAttr, actionAttr] = splitKeyVal(str);
    const [trigger, triggerParams] = parseAttribute(triggerAttr);

    if (!trigger) return;

    let [action, actionParams] = parseAttribute(actionAttr || '');

    // Shortcut if trigger and action are the same (click:click)
    action = action || trigger;

    if (!values[trigger]) values[trigger] = [];

    values[trigger].push({ trigger, triggerParams, action, actionParams });
  });

  return values;
}

export function getEntities(
  prefix: string,
  target: Element,
  filter?: Walker.Filter,
): WalkerOS.Entities {
  const entities: WalkerOS.Entities = [];
  let element = target as Node['parentElement'];

  // Unset empty filter object
  filter = Object.keys(filter || {}).length !== 0 ? filter : undefined;

  while (element) {
    const entity = getEntity(prefix, element, target, filter);
    if (entity) entities.push(entity);

    element = getParent(prefix, element);
  }

  return entities;
}

function getEntity(
  prefix: string,
  element: Element,
  origin?: Element,
  filter?: Walker.Filter,
): WalkerOS.Entity | null {
  const type = getAttribute(element, getElbAttributeName(prefix));

  // It's not a (valid) entity element or should be filtered
  if (!type || (filter && !filter[type])) return null;

  const scopeElems = [element]; // All related elements
  const dataSelector = `[${getElbAttributeName(
    prefix,
    type,
  )}],[${getElbAttributeName(prefix, '')}]`; // [data-elb-entity,data-elb-]
  const linkName = getElbAttributeName(prefix, Const.Commands.Link, false); // data-elblink

  let data: WalkerOS.Properties = {};
  const nested: WalkerOS.Entities = [];
  const [parentData, context] = getThisAndParentProperties(
    origin || element,
    dataSelector,
    prefix,
    type,
  );

  // Add linked elements (data-elblink)
  queryAll(element, `[${linkName}]`, (link) => {
    const [linkId, linkState]: Walker.KeyVal = splitKeyVal(
      getAttribute(link, linkName),
    );

    // Get all linked child elements if link is a parent
    // Note: This searches the entire document - for scoped operation, we would need
    // to pass scope context down to this function or redesign the linking mechanism
    if (linkState === 'parent')
      queryAll(document.body, `[${linkName}="${linkId}:child"]`, (wormhole) => {
        scopeElems.push(wormhole);

        // A linked child can also be an entity
        const nestedEntity = getEntity(prefix, wormhole);
        if (nestedEntity) nested.push(nestedEntity);
      });
  });

  // Get all property elements including linked elements
  const propertyElems: Array<Element> = [];
  scopeElems.forEach((elem) => {
    // Also check for property on same level
    if (elem.matches(dataSelector)) propertyElems.push(elem);

    queryAll(elem, dataSelector, (elem) => propertyElems.push(elem));
  });

  // Get properties
  let genericData: WalkerOS.Properties = {};
  propertyElems.forEach((child) => {
    // Eventually override closer properties
    genericData = assign(genericData, getElbValues(prefix, child, ''));
    data = assign(data, getElbValues(prefix, child, type));
  });

  // Merge properties with the hierarchy generic > data > parent
  data = assign(assign(genericData, data), parentData);

  // Get nested entities
  scopeElems.forEach((elem) => {
    queryAll(
      elem,
      `[${getElbAttributeName(prefix)}]`,
      (nestedEntityElement) => {
        const nestedEntity = getEntity(prefix, nestedEntityElement);
        if (nestedEntity) nested.push(nestedEntity);
      },
    );
  });

  return { type, data, context, nested };
}

function getParent(prefix: string, elem: HTMLElement): HTMLElement | null {
  const linkName = getElbAttributeName(prefix, Const.Commands.Link, false); // data-elblink

  // Link
  if (elem.matches(`[${linkName}]`)) {
    const [linkId, linkState]: Walker.KeyVal = splitKeyVal(
      getAttribute(elem, linkName),
    );
    if (linkState === 'child') {
      // If current element is a child-link jump to the parent
      // Note: This searches the entire document - for scoped operation, we would need
      // to pass scope context down to this function or redesign the linking mechanism
      return document.querySelector(`[${linkName}="${linkId}:parent"]`);
    }
  }

  // Shadow DOM traversal
  if (
    !elem.parentElement &&
    elem.getRootNode &&
    elem.getRootNode() instanceof ShadowRoot
  ) {
    return (elem.getRootNode() as ShadowRoot).host as HTMLElement;
  }

  return elem.parentElement;
}

function getThisAndParentProperties(
  element: Element,
  entitySelector: string,
  prefix: string,
  type: string,
): [data: WalkerOS.Properties, context: WalkerOS.OrderedProperties] {
  let data: WalkerOS.Properties = {};
  const context: WalkerOS.OrderedProperties = {};
  let parent = element as Node['parentElement'];
  const contextSelector = `[${getElbAttributeName(
    prefix,
    Const.Commands.Context,
    false,
  )}]`;

  // Get all bubbling-up properties with decreasing priority
  let contextI = 0; // Context counter
  while (parent) {
    // Properties
    if (parent.matches(entitySelector)) {
      // Get higher properties first
      data = assign(getElbValues(prefix, parent, ''), data); // Generic
      data = assign(getElbValues(prefix, parent, type), data); // Explicit
    }

    // Context
    if (parent.matches(contextSelector)) {
      Object.entries(
        getElbValues(prefix, parent, Const.Commands.Context, false),
      ).forEach(([key, val]) => {
        // Don't override context with same but higher key
        if (val && !context[key]) context[key] = [val, contextI];
      });

      // Increase context counter with each parent level
      ++contextI;
    }

    parent = getParent(prefix, parent);
  }

  return [data, context];
}

function queryAll(
  scope: Document | Element,
  selector: string,
  fn: (element: Element) => void,
): void {
  const elements = scope.querySelectorAll(selector);
  elements.forEach(fn);
}

function resolveAttributes(
  prefix: string,
  target: Element,
  trigger: string,
): Walker.TriggerActions {
  let element = target as Node['parentElement'];

  while (element) {
    const attribute = getAttribute(
      element,
      getElbAttributeName(prefix, Const.Commands.Action, false),
    );

    // Get action string related to trigger
    const triggerActions = getTriggerActions(attribute);

    // Action found on element or is not a click trigger
    // @TODO aggregate all click triggers, too
    if (triggerActions[trigger] || trigger !== 'click')
      return triggerActions[trigger];

    element = getParent(prefix, element);
  }

  return [];
}

function splitAttribute(str: string, separator = ';'): Walker.Attributes {
  const values: Walker.Attributes = [];

  if (!str) return values;

  const reg = new RegExp(`(?:[^${separator}']+|'[^']*')+`, 'ig');
  return str.match(reg) || [];
}

function splitKeyVal(str: string): Walker.KeyVal {
  const [key, value] = str.split(/:(.+)/, 2);
  return [trim(key), trim(value)];
}

function parseAttribute(str: string): Walker.KeyVal {
  // action(a, b, c)
  const [key, value] = str.split('(', 2);
  const param = value ? value.slice(0, -1) : ''; // Remove the )
  // key = 'action'
  // param = 'a, b, c'
  return [key, param];
}
