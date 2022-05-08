import { AnyObject, Elbwalker, Walker } from '@elbwalker/types';
import { getElbAttributeName } from './walker';

export function trycatch<P extends unknown[], R>(
  fn: (...args: P) => R | undefined,
): (...args: P) => R | undefined {
  return function (...args: P): R | undefined {
    try {
      return fn(...args);
    } catch (err) {
      console.error(Elbwalker.Commands.Walker, err);
      return;
    }
  };
}

export function randomString(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function getGlobalProperties(): AnyObject {
  const globalsName = getElbAttributeName(Elbwalker.Commands.Globals, false);
  const globalSelector = `[${globalsName}]`;
  let values = {};

  document.querySelectorAll(globalSelector).forEach((element) => {
    values = assign(values, splitAttribute(getAttribute(element, globalsName)));
  });

  return values;
}

export function splitAttribute(str: string, separator = ';'): Walker.Values {
  const values: Walker.Values = {};

  if (!str) return values;

  const reg = new RegExp(`(?:[^${separator}']+|'[^']*')+`, 'ig');
  const arr = str.match(reg) || [];

  arr.forEach((str) => {
    let [keyAttr, valueAttr] = splitKeyVal(str);
    const [key] = parseAttribute(keyAttr);

    if (key) values[key] = valueAttr || key;
  });

  return values;
}

function splitKeyVal(str: string): Walker.KeyVal {
  const [key, value] = str.split(/:(.+)/, 2);
  return [trim(key), trim(value)];
}

export function parseAttribute(str: string): string[] {
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

export function assign(base: AnyObject, props: AnyObject = {}): AnyObject {
  return { ...base, ...props };
}

export function isArgument(event: unknown) {
  return {}.hasOwnProperty.call(event, 'callee');
}
