import { IElbwalker, Utils, Walker } from '../types';
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

  // Window positions
  let pointContainer;
  const windowHeight = w.innerHeight; // Height of the viewport

  // Element positions
  const elemRectRel = element.getBoundingClientRect(); // Get the elements relative to the viewport
  const elementHeight = elemRectRel.height; // Height of the element
  const elementTopRel = elemRectRel.y; // Relative distance from window top to element top
  const elementBottomRel = elementTopRel + elementHeight; // Relative distance from window to to element bottom
  const elemCenterRel = {
    // Relative position on viewport of the elements center
    x: elemRectRel.x + element.offsetWidth / 2,
    y: elemRectRel.y + element.offsetHeight / 2,
  };

  // Differentiate between small and large elements
  if (elementHeight <= windowHeight) {
    // Smaller than the viewport

    // Must have a width and height
    if (
      element.offsetWidth + elemRectRel.width === 0 ||
      element.offsetHeight + elemRectRel.height === 0
    )
      return false;

    if (elemCenterRel.x < 0) return false;
    if (elemCenterRel.x > (d.documentElement.clientWidth || w.innerWidth))
      return false;
    if (elemCenterRel.y < 0) return false;
    if (elemCenterRel.y > (d.documentElement.clientHeight || w.innerHeight))
      return false;

    // Select the element that is at the center of the target
    pointContainer = d.elementFromPoint(elemCenterRel.x, elemCenterRel.y);
  } else {
    // Bigger than the viewport

    // that are considered visible if they fill half of the screen
    const viewportCenter = windowHeight / 2;

    // Check if upper part is above the viewports center
    if (elementTopRel < 0 && elementBottomRel < viewportCenter) return false;

    // Check if lower part is below the viewports center
    if (elementBottomRel > windowHeight && elementTopRel > viewportCenter)
      return false;

    // Select the element that is in the middle of the screen
    pointContainer = d.elementFromPoint(elemCenterRel.x, windowHeight / 2);
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
  (w.elbLayer = w.elbLayer || []).push(arguments);
};

export function castValue(value: unknown): Walker.PropertyType {
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

export function debounce<P extends unknown[], R>(
  fn: (...args: P) => R,
  wait = 1000,
) {
  let timer: NodeJS.Timeout;

  return (...args: P): Promise<R> => {
    // abort previous invocation
    clearTimeout(timer);

    // Return value as promise
    return new Promise((resolve) => {
      // Schedule execution
      timer = setTimeout(() => {
        // Call the function
        resolve(fn(...args));
      }, wait);
    });
  };
}

export function setItem(
  key: string,
  value: Walker.PropertyType,
  maxAgeInMinutes = 30,
  storage: Utils.Storage.Type = Utils.Storage.Type.Session,
  domain?: string,
) {
  const e = Date.now() + 1000 * 60 * maxAgeInMinutes;
  const item: Utils.Storage.Value = { e, v: String(value) };
  const stringifiedItem = JSON.stringify(item);

  switch (storage) {
    case Utils.Storage.Type.Cookie:
      let cookie = `${key}=${encodeURIComponent(value)}; max-age=${
        maxAgeInMinutes * 60
      }; path=/; SameSite=Lax; secure`;

      if (domain) cookie += '; domain=' + domain;

      document.cookie = cookie;
      break;
    case Utils.Storage.Type.Local:
      w.localStorage.setItem(key, stringifiedItem);
      break;
    case Utils.Storage.Type.Session:
      w.sessionStorage.setItem(key, stringifiedItem);
      break;
  }
}

export function getItem(
  key: string,
  storage: Utils.Storage.Type = Utils.Storage.Type.Session,
): Walker.PropertyType {
  // Helper function for local and session storage to support expiration
  function parseItem(string: string | null): Utils.Storage.Value {
    try {
      return JSON.parse(string || '');
    } catch (err) {
      let e = 1,
        v = '';

      // Remove expiration date
      if (string) {
        e = 0;
        v = string;
      }

      return { e, v };
    }
  }
  let value, item;

  switch (storage) {
    case Utils.Storage.Type.Cookie:
      value = decodeURIComponent(
        document.cookie
          .split('; ')
          .find((row) => row.startsWith(key + '='))
          ?.split('=')[1] || '',
      );
      break;
    case Utils.Storage.Type.Local:
      item = parseItem(w.localStorage.getItem(key));
      break;
    case Utils.Storage.Type.Session:
      item = parseItem(w.sessionStorage.getItem(key));
      break;
  }

  // Check if item is expired
  if (item) {
    value = item.v;

    if (item.e != 0 && item.e < Date.now()) {
      removeItem(key, storage); // Remove item
      value = ''; // Conceal the outdated value
    }
  }

  return castValue(value || '');
}

export function removeItem(
  key: string,
  storage: Utils.Storage.Type = Utils.Storage.Type.Session,
) {
  switch (storage) {
    case Utils.Storage.Type.Cookie:
      setItem(key, '', 0, storage);
      break;
    case Utils.Storage.Type.Local:
      w.localStorage.removeItem(key);
      break;
    case Utils.Storage.Type.Session:
      w.sessionStorage.removeItem(key);
      break;
  }
}

export function isObject(obj: unknown) {
  return typeof obj === 'object' && !Array.isArray(obj) && obj !== null;
}

export function isElementOrDocument(elem: unknown) {
  return elem === document || elem instanceof HTMLElement;
}
