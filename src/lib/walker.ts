import { IElbwalker, Walker } from '../types';
import { assign, castValue, getAttribute, trim } from './utils';

export function getElbAttributeName(
  prefix: string,
  name?: string,
  isProperty = true,
): string {
  // separate dynamic properties from walker commands
  const separator = isProperty ? '-' : '';
  name = name ? separator + name : '';
  return prefix + name;
}

export function getElbValues(
  prefix: string,
  element: Element,
  name: string,
  isProperty = true,
): Walker.Properties {
  const values = splitAttribute(
    getAttribute(element, getElbAttributeName(prefix, name, isProperty)) || '',
  ).reduce((values, str) => {
    let [key, val] = splitKeyVal(str);

    if (!key) return values;

    // Handle keys without value
    if (!val) {
      // Manually remove the : from key on empty values
      if (key.charAt(key.length - 1) === ':') key = key.slice(0, -1);
      val = '';
    }

    // Dynamic values
    if (val.charAt(0) === '#') {
      val = val.substring(1); // Remove # symbol
      try {
        // Read property value from element
        let dynamicValue = (element as any)[val];
        if (!dynamicValue && val === 'selected') {
          // Try to read selected value with chance of error
          dynamicValue = (element as HTMLSelectElement).options[
            (element as HTMLSelectElement).selectedIndex
          ].text;
        }
        if (dynamicValue) val = dynamicValue;
      } catch (error) {
        val = '';
      }
    }

    // Array property
    if (key.slice(-2) === '[]') {
      key = key.slice(0, -2); // Remove [] symbol

      if (!Array.isArray(values[key])) values[key] = [];
      (values[key] as Walker.PropertyType[]).push(castValue(val));
    } else {
      values[key] = castValue(val);
    }

    return values;
  }, {} as Walker.Properties);

  return values;
}

export function getEvents(
  target: Element,
  trigger: Walker.Trigger,
  prefix: string = IElbwalker.Commands.Prefix,
): Walker.Events {
  const events: Walker.Events = [];

  // Check for an action (data-elbaction) attribute and resolve it
  const actions = resolveAttributes(prefix, target, trigger);

  // Stop if there's no valid action combo
  if (!actions) return events;

  actions.forEach((triggerAction) => {
    const filter = splitAttribute(triggerAction.actionParams || '', ',').reduce(
      (filter, param) => {
        filter[param] = true;
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
      let [data, context] = getThisAndParentProperties(
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

export function getGlobals(prefix: string): Walker.Properties {
  const globalsName = getElbAttributeName(
    prefix,
    IElbwalker.Commands.Globals,
    false,
  );
  const globalSelector = `[${globalsName}]`;
  let values = {};

  document.querySelectorAll(globalSelector).forEach((element) => {
    values = assign(
      values,
      getElbValues(prefix, element, IElbwalker.Commands.Globals, false),
    );
  });

  return values;
}

export function getTriggerActions(str: string): Walker.TriggersActionGroups {
  const values: Walker.TriggersActionGroups = {};

  const attributes = splitAttribute(str);

  attributes.forEach((str) => {
    let [triggerAttr, actionAttr] = splitKeyVal(str);
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
): Walker.Entities {
  const entities: Walker.Entities = [];
  let element = target as Node['parentElement'];

  // Unset empty filter object
  filter = Object.keys(filter || {}).length !== 0 ? filter : undefined;

  while (element) {
    const entity = getEntity(prefix, element, target);

    if (entity && (!filter || filter[entity.type])) entities.push(entity);

    // @TODO link

    element = element.parentElement;
  }

  return entities;
}

function getEntity(
  prefix: string,
  element: Element,
  origin?: Element,
): Walker.Entity | null {
  const type = getAttribute(element, getElbAttributeName(prefix));

  if (!type) return null; // It's not a (valid) entity element

  const scopeElems = [element]; // Alle related elements
  const entitySelector = `[${getElbAttributeName(
    prefix,
    type,
  )}],[${getElbAttributeName(prefix, '\\*')}]`; // [data-elb-entity,data-elb-*]
  const linkName = getElbAttributeName(prefix, IElbwalker.Commands.Link, false); // data-elblink

  let [parentProps, context] = getThisAndParentProperties(
    origin || element,
    entitySelector,
    prefix,
    type,
  );

  // Add linked elements (data-elblink)
  element.querySelectorAll(`[${linkName}]`).forEach((link) => {
    let [linkId, linkState] = splitKeyVal(getAttribute(link, linkName));

    // Get all linked child elements if link is a parent
    if (linkState === 'parent')
      document
        .querySelectorAll(`[${linkName}="${linkId}:child"]`)
        .forEach((wormhole) => {
          // Skip original elblink element and add only new ones
          if (wormhole !== link) scopeElems.push(wormhole);
        });
  });

  // Get all property elements including linked elements
  let propertyElems: Array<Element> = [];
  scopeElems.forEach((elem) => {
    // Also check for property on same level
    if (elem.matches(entitySelector)) propertyElems.push(elem);
    elem.querySelectorAll(entitySelector).forEach((elem) => {
      propertyElems.push(elem);
    });
  });

  // Get properties
  let data: Walker.Properties = {};
  let genericProps: Walker.Properties = {};
  propertyElems.forEach((child) => {
    // Eventually override closer peroperties
    genericProps = assign(genericProps, getElbValues(prefix, child, '*'));
    data = assign(data, getElbValues(prefix, child, type));
  });

  // Merge properties with the hirarchy data > generic > parent
  data = assign(parentProps, assign(genericProps, data));

  // Get nested entities
  const nested: Walker.Entities = [];
  element
    .querySelectorAll(`[${getElbAttributeName(prefix)}]`)
    .forEach((nestedEntityElement) => {
      const nestedEntity = getEntity(prefix, nestedEntityElement);
      if (nestedEntity) nested.push(nestedEntity);
    });

  return { type, data, context, nested };
}

function getThisAndParentProperties(
  element: Element,
  entitySelector: string,
  prefix: string,
  type: string,
): [data: Walker.Properties, context: Walker.OrderedProperties] {
  let data: Walker.Properties = {};
  let context: Walker.OrderedProperties = {};
  let parent = element as Node['parentElement'];
  const contextSelector = `[${getElbAttributeName(
    prefix,
    IElbwalker.Commands.Context,
    false,
  )}]`;

  // Get all bubbling-up properties with decreasing priority
  let contextI = 0; // Context counter
  while (parent) {
    // Get higher properties first
    if (parent.matches(entitySelector)) {
      data = assign(getElbValues(prefix, parent, '*'), data); // Generic
      data = assign(getElbValues(prefix, parent, type), data); // Explicit
    }

    if (parent.matches(contextSelector)) {
      Object.entries(
        getElbValues(prefix, parent, IElbwalker.Commands.Context, false),
      ).forEach(([key, val]) => {
        // Don't override context with same but higher key
        if (!context[key]) context[key] = [val, contextI];
      });

      // Increase context counter with each parent level
      ++contextI;
    }

    parent = parent.parentElement;
  }

  return [data, context];
}

function resolveAttributes(
  prefix: string,
  target: Element,
  trigger: Walker.Trigger,
): Walker.TriggerActions {
  let element = target as Node['parentElement'];

  while (element) {
    const attribute = getAttribute(
      element,
      getElbAttributeName(prefix, IElbwalker.Commands.Action, false),
    );

    // Get action string related to trigger
    const triggerActions = getTriggerActions(attribute);

    // Action found on element or is not a click trigger
    // @TODO aggregate all click triggers, too
    if (triggerActions[trigger] || trigger !== 'click')
      return triggerActions[trigger];

    element = element.parentElement;
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
