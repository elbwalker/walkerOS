import { IElbwalker, Walker } from '../types';
import {
  assign,
  castValue,
  getAttribute,
  parseAttribute,
  splitAttribute,
  splitKeyVal,
} from './utils';

export function walker(
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

export function resolveAttributes(
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

function getTriggerActions(str: string): Walker.TriggersActions {
  const values: Walker.TriggersActions = {};

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

function getEntities(
  prefix: string,
  target: Element,
  filter?: Walker.Filter,
): Walker.Entities {
  const entities: Walker.Entities = [];
  let element = target as Node['parentElement'];

  // Unset empty filter object
  filter = Object.keys(filter || {}).length !== 0 ? filter : undefined;

  while (element) {
    const entity = getEntity(prefix, element);

    if (entity && (!filter || filter[entity.type])) entities.push(entity);

    element = element.parentElement;
  }

  return entities;
}

function getEntity(prefix: string, element: Element): Walker.Entity | null {
  const type = getAttribute(element, getElbAttributeName(prefix));

  if (!type) return null; // It's not a (valid) entity element

  const entitySelector = `[${getElbAttributeName(prefix, type)}]`;

  // Get matching properties from the element and its parents
  let [data, context] = getThisAndParentProperties(
    element,
    entitySelector,
    prefix,
    type,
  );

  // Get properties
  element.querySelectorAll<HTMLElement>(entitySelector).forEach((child) => {
    // Eventually override closer peroperties
    data = assign(data, getElbValues(prefix, child, type));
  });

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
): [data: Walker.Properties, context: Walker.Properties] {
  let data: Walker.Properties = {};
  let context: Walker.Properties = {};
  let parent = element as Node['parentElement'];
  const contextSelector = `[${getElbAttributeName(
    prefix,
    IElbwalker.Commands.Context,
    false,
  )}]`;

  // Get all bubbling-up properties with decreasing priority
  while (parent) {
    if (parent.matches(entitySelector))
      // Get higher properties first
      data = assign(getElbValues(prefix, parent, type), data);

    if (parent.matches(contextSelector))
      context = assign(
        getElbValues(prefix, parent, IElbwalker.Commands.Context, false),
        context,
      );

    parent = parent.parentElement;
  }

  return [data, context];
}

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
      (values[key] as Walker.Property[]).push(castValue(val));
    } else {
      values[key] = castValue(val);
    }

    return values;
  }, {} as Walker.Properties);

  return values;
}
