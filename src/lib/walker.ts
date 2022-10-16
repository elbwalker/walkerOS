import { IElbwalker, Walker } from '../types';
import {
  assign,
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

    // Return a list of all full events
    entities.forEach((entity) => {
      events.push({
        entity: entity.type,
        action: triggerAction.action,
        data: entity.data,
        trigger,
        nested: entity.nested,
        context: entity.context,
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

function getTriggerActions(
  str: string,
  separator = ';',
): Walker.TriggersActions {
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

  let data: IElbwalker.AnyObject = {};
  let context: IElbwalker.AnyObject = {};
  const entitySelector = `[${getElbAttributeName(prefix, type)}]`;
  const contextSelector = `[${getElbAttributeName(
    prefix,
    IElbwalker.Commands.Context,
    false,
  )}]`;

  // Get all parent data properties with decreasing priority
  let parent = element as Node['parentElement'];
  while (parent) {
    if (parent.matches(entitySelector))
      data = assign(getElbValues(prefix, parent, type), data);

    if (parent.matches(contextSelector))
      context = assign(
        getElbValues(prefix, parent, IElbwalker.Commands.Context, false),
        context,
      );

    parent = parent.parentElement;
  }

  // Get nested child data properties with higher priority
  element.querySelectorAll<HTMLElement>(entitySelector).forEach((child) => {
    const properties = getElbValues(prefix, child, type);
    Object.entries(properties).forEach(([key, property]) => {
      if (property.charAt(0) === '#') {
        property = property.substring(1);
        try {
          let value = (child as any)[property];
          if (!value && property === 'selected') {
            value = (child as any).options[(child as any).selectedIndex].text;
          }
          if (value) properties[key] = value;
        } catch (error) {
          properties[key] = '';
        }
      }
    });
    data = assign(data, properties);
  });

  // Get nested entities
  const nested: Walker.Entities = [];
  element
    .querySelectorAll(`[${getElbAttributeName(prefix)}]`)
    .forEach((nestedEntityElement) => {
      const nestedEntity = getEntity(prefix, nestedEntityElement);
      if (nestedEntity) nested.push(nestedEntity);
    });

  return { type, data: data as Walker.EntityData, context, nested };
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
): Walker.Values {
  const values = splitAttribute(
    getAttribute(element, getElbAttributeName(prefix, name, isProperty)) || '',
  ).reduce((values, str) => {
    let [key, val] = splitKeyVal(str);

    // @TODO parse val format
    values[key] = val;

    return values;
  }, {} as Walker.Values);

  return values;
}
