import { IElbwalker, Walker } from '../types';
import { getElbAttributeName, getElbValues } from './walker';

export function trycatch<P extends unknown[], R>(
  fn: (...args: P) => R | undefined,
): (...args: P) => R | undefined {
  return function (...args: P): R | undefined {
    try {
      return fn(...args);
    } catch (err) {
      console.error(IElbwalker.Commands.Walker, err);
      return;
    }
  };
}

export function randomString(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function getGlobalProperties(prefix: string): Walker.Properties {
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

export function splitAttribute(
  str: string,
  separator = ';',
): Walker.Attributes {
  const values: Walker.Attributes = [];

  if (!str) return values;

  const reg = new RegExp(`(?:[^${separator}']+|'[^']*')+`, 'ig');
  return str.match(reg) || [];
}

export function splitKeyVal(str: string): Walker.KeyVal {
  const [key, value] = str.split(/:(.+)/, 2);
  return [trim(key), trim(value)];
}

export function parseAttribute(str: string): Walker.KeyVal {
  // action(a, b, c)
  const [key, value] = str.split('(', 2);
  const param = value ? value.slice(0, -1) : ''; // Remove the )
  // key = 'action'
  // param = 'a, b, c'
  return [key, param];
}

function trim(str: string): string {
  // Remove quotes and whitespaces
  return str ? str.trim().replace(/^'|'$/g, '').trim() : '';
}

export function getAttribute(element: Element, name: string): string {
  return element.getAttribute(name) || '';
}

export function assign(
  base: Walker.Properties,
  props: Walker.Properties = {},
): Walker.Properties {
  // Check for array properties to merge them before overriding
  Object.entries(props).forEach(([key, val]) => {
    const baseArray = base[key];

    // Only merge  arrays
    if (Array.isArray(baseArray) && Array.isArray(val)) {
      props[key] = val.reduce(
        (acc, item) => {
          // Remove duplicates
          return acc.includes(item) ? acc : [...acc, item];
        },
        [...baseArray],
      );
    }
  });

  return { ...base, ...props };
}

export function isArgument(event: unknown) {
  return {}.hasOwnProperty.call(event, 'callee');
}

export const elb: IElbwalker.Elb = function () {
  (window.elbLayer = window.elbLayer || []).push(arguments);
};

export function castValue(value: unknown): Walker.Property {
  if (value === 'true') return true;
  if (value === 'false') return false;

  const number = Number(value); // Converts "" to 0
  if (value == number && value !== '') return number;

  return String(value);
}
