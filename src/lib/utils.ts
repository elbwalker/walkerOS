import { AnyObject } from '../types/globals';

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
  const globalsName = 'elbglobals';
  const globalSelector = `[${globalsName}]`; // @TODO use function with prefix concat

  document.querySelectorAll(globalSelector).forEach((element) => {
    // @TODO extract values
  });

  return {};
}
