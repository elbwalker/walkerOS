import { AnyObject } from '../types/globals';
import { Walker } from '../types/walker';
import { assign, getAttribute, parseAttribute, splitAttribute } from './utils';

const _prefix = 'elb';

export function walker(
  target: Element,
  trigger: Walker.Trigger,
): Walker.Events {
  const [action, filter] = getActionAndFilter(target, trigger);
  if (!action) return [];

  const entities = getEntities(target, filter);
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
): [string?, Walker.Filter?] {
  let element = target as Node['parentElement'];

  while (element) {
    const attr =
      getAttribute(element, getElbAttributeName('action', false)) ||
      getAttribute(element, getElbAttributeName('action')); // legacy elb-action

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

function getEntities(target: Element, filter: Walker.Filter): Walker.Entities {
  const entities: Walker.Entities = [];
  let element = target as Node['parentElement'];
  while (element) {
    const entity = getEntity(element);

    if (entity && (!filter || filter[entity.type])) entities.push(entity);

    element = element.parentElement;
  }

  return entities;
}

function getEntity(element: Element): Walker.Entity | null {
  const type = getAttribute(element, getElbAttributeName());

  if (!type) return null; // It's not a (valid) entity element

  let data: AnyObject = {};
  const entitySelector = `[${getElbAttributeName(type)}]`;

  // Get all parent data properties with decreasing priority
  let parent = element as Node['parentElement'];
  while (parent) {
    if (parent.matches(entitySelector))
      data = assign(getElbValues(parent, type), data);

    parent = parent.parentElement;
  }

  // Get nested child data properties with higher priority
  element.querySelectorAll<HTMLElement>(entitySelector).forEach((child) => {
    const properties = getElbValues(child, type);
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
    .querySelectorAll(`[${getElbAttributeName()}]`)
    .forEach((nestedEntityElement) => {
      const nestedEntity = getEntity(nestedEntityElement);
      if (nestedEntity) nested.push(nestedEntity);
    });

  return { type, data: data as Walker.EntityData, nested };
}

export function getElbAttributeName(name?: string, isProperty = true): string {
  // separate dynamic properties from walker commands
  const separator = isProperty ? '-' : '';
  name = name ? separator + name : '';
  return _prefix + name;
}

function getElbValues(element: Element, name: string): Walker.Values {
  return splitAttribute(getAttribute(element, getElbAttributeName(name)) || '');
}
