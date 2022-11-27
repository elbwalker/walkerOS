import { IElbwalker, Walker } from '../types';
import { getElbAttributeName, getElbValues } from './walker';

const w = window;
const d = document;

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
  target: Walker.Properties,
  source: Walker.Properties = {},
): Walker.Properties {
  // Check for array properties to merge them before overriding
  Object.entries(source).forEach(([key, sourceProp]) => {
    const targetProp = target[key];

    // Only merge  arrays
    if (Array.isArray(targetProp) && Array.isArray(sourceProp)) {
      source[key] = sourceProp.reduce(
        (acc, item) => {
          // Remove duplicates
          return acc.includes(item) ? acc : [...acc, item];
        },
        [...targetProp],
      );
    }
  });

  return { ...target, ...source };
}

export function isArgument(event: unknown) {
  return {}.hasOwnProperty.call(event, 'callee');
}

export function isVisible(element: HTMLElement): boolean {
  // Check for hiding styles
  const style = getComputedStyle(element);
  if (style.display === 'none') return false;
  if (style.visibility !== 'visible') return false;
  if (style.opacity && Number(style.opacity) < 0.1) return false;

  // Element positions
  let pointContainer;
  const rect = element.getBoundingClientRect();
  const windowHeight = w.innerHeight;
  const windowTop = w.scrollY;
  const elementHeight = element.clientHeight;
  const elementTop = element.offsetTop;
  const elementBottom = elementTop + elementHeight;
  const elemCenter = {
    x: rect.left + element.offsetWidth / 2,
    y: rect.top + element.offsetHeight / 2,
  };

  // Check for elements that are smaller than the viewport
  if (elementHeight <= windowHeight) {
    // Must have a width
    if (element.offsetWidth + rect.width === 0) return false;
    // Must have a height
    if (element.offsetHeight + rect.height === 0) return false;

    if (elemCenter.x < 0) return false;
    if (elemCenter.x > (d.documentElement.clientWidth || w.innerWidth))
      return false;
    if (elemCenter.y < 0) return false;
    if (elemCenter.y > (d.documentElement.clientHeight || w.innerHeight))
      return false;

    // Select the element that is at the center of the target
    pointContainer = d.elementFromPoint(elemCenter.x, elemCenter.y);
  } else {
    // Check for elements that are higher than the viewport

    // that are considered visible if they fill half of the screen
    const viewportCenter = windowTop + windowHeight / 2;

    // Check if upper part is above than the viewports center
    if (elementTop > viewportCenter) return false;

    // Check if lower part is below than the viewports center
    if (elementBottom < viewportCenter) return false;

    // Select the element that is in the middle of the screen
    pointContainer = d.elementFromPoint(elemCenter.x, windowHeight / 2);
  }

  // Check for potential overlays
  if (pointContainer) {
    do {
      if (pointContainer === element) return true; // should be visible
    } while ((pointContainer = pointContainer.parentElement));
  }

  return false;
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

export function throttle<P extends unknown[], R>(
  fn: (...args: P) => R | undefined,
  delay = 1000,
): (...args: P) => R | undefined {
  let isBlocked: NodeJS.Timeout | 0;

  return function (...args: P): R | undefined {
    // Skip since function is still blocked by previous call
    if (isBlocked) return;

    // Set a blocking timeout
    isBlocked = setTimeout(() => {
      // Unblock function
      isBlocked = 0;
    }, delay);

    // Call the function
    return fn(...args);
  };
}
