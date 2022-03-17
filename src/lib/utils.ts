import { AnyObject } from '../types/globals';
import { Walker } from '../types/walker';

export function trycatch<P extends unknown[], R>(
  fn: (...args: P) => R | undefined,
): (...args: P) => R | undefined {
  return function (...args: P): R | undefined {
    try {
      return fn(...args);
    } catch (err) {
      console.error(err);
      return;
    }
  };
}

export function randomString(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function getGlobalProperties(): AnyObject {
  const globalsName = 'elbglobals'; // @TODO use const enum here
  const globalSelector = `[${globalsName}]`; // @TODO use function with prefix concat
  let values = {};

  document.querySelectorAll(globalSelector).forEach((element) => {
    values = assign(
      values,
      splitAttribute(element.getAttribute(globalsName) || ''),
    );
  });

  return values;
}

export function splitAttribute(
  str: Walker.Attribute,
  separator = ';',
): Walker.Values {
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

export function parseAttribute(str: string): Walker.Attribute[] {
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

export function assign(base: AnyObject, props: AnyObject = {}): AnyObject {
  return { ...base, ...props };
}
