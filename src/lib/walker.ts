import { IElbwalker, Walker } from '../types';
import { assign, getAttribute, parseAttribute, splitAttribute } from './utils';

export function walker(
  target: Element,
  trigger: Walker.Trigger,
  prefix: string = IElbwalker.Commands.Prefix,
): Walker.Events {
  const [action, filter] = getActionAndFilter(target, trigger, prefix);
  if (!action) return [];

  const entities = getEntities(target, filter, prefix);
  return entities.map((entity) => {
    return {
      entity: entity.type,
      action,
      data: entity.data,
      trigger,
      nested: entity.nested,
    };
  });
}

function getActionAndFilter(
  target: Element,
  triggerType: Walker.Trigger,
  prefix: string,
): [string?, Walker.Filter?] {
  let element = target as Node['parentElement'];

  while (element) {
    const attr = getAttribute(
      element,
      getElbAttributeName(prefix, IElbwalker.Commands.Action, false),
    );

    const [action, filterAttr] = parseAttribute(
      splitAttribute(attr)[triggerType] || '',
    );

    // Action found directly on element
    // or check parent elements for click trigger
    // @TODO always checking parent elements?!
    if (action || triggerType !== 'click') {
      const filter = filterAttr ? splitAttribute(filterAttr, ',') : undefined;
      return [action, filter];
    }

    element = element.parentElement;
  }

  return [];
}

function getEntities(
  target: Element,
  filter: Walker.Filter,
  prefix: string,
): Walker.Entities {
  const entities: Walker.Entities = [];
  let element = target as Node['parentElement'];
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
  const entitySelector = `[${getElbAttributeName(prefix, type)}]`;

  // Get all parent data properties with decreasing priority
  let parent = element as Node['parentElement'];
  while (parent) {
    if (parent.matches(entitySelector))
      data = assign(getElbValues(prefix, parent, type), data);

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

  return { type, data: data as Walker.EntityData, nested };
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

function getElbValues(
  prefix: string,
  element: Element,
  name: string,
): Walker.Values {
  return splitAttribute(
    getAttribute(element, getElbAttributeName(prefix, name)) || '',
  );
}
